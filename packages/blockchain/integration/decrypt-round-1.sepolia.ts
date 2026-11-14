import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  createPublicClient,
  createWalletClient,
  custom,
  getAddress,
  keccak256,
  parseAbi,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { MemoryStorage, ZamaSDK } from '@zama-fhe/sdk';
import { createConfig } from '@zama-fhe/sdk/viem';
import { node } from '@zama-fhe/sdk/node';
import { sepolia as fheSepolia } from '@zama-fhe/sdk/chains';
import {
  readBudgetLedger,
  REVIEWED_OPERATOR,
} from '../../../contracts/scripts/sepolia-policy.js';
import { verifyPlayerSigner } from './player.js';
import { diagnosticErrorTypes } from './support.js';
import { SCORING_ADDRESS, scoringAbi } from './reviewed-deployment.js';
import {
  assertDiagnosticPermit,
  assertReadOnlyRpc,
  DIAGNOSTIC_PLAYER,
  onceOnly,
  PERMIT_SECONDS,
} from './player-diagnostic-guards.js';
import {
  assertFinality,
  assertRemoteDecryption,
  DECRYPTION_REMAINING_WEI,
  FINALIZATION_HASH,
  kmsShareCount,
} from './round-1-decryption-evidence.js';

// Standalone, one-shot command. Never imported by tests or the three-write runner.
const emit = (data: Record<string, unknown>) =>
  process.stdout.write(`CIPHERQUIZ_DECRYPT ${JSON.stringify(data)}\n`);
let stage = 'offline guards';
const verificationStarted = Date.now();
let stageStarted = verificationStarted;
const checkpoint = (next: string) => {
  stage = next;
  stageStarted = Date.now();
  emit({ status: 'checkpoint', stage });
};
let signatures = 0;
let decryptAttempts = 0;
let kmsRequests = 0;
let kmsResponses = 0;
let returnedShares = 0;
let jobPolls = 0;
const remoteStatuses: number[] = [];
let blockedRetries = 0;
let blockedRpcMethods = 0;
const httpStatuses: number[] = [];
let sdk: ZamaSDK | undefined;
const digest = (data: string | Buffer) =>
  createHash('sha256').update(data).digest('hex');
const protectedPaths = ['contracts/.env', 'contracts/.sepolia-budget.jsonl'];
const snapshots = protectedPaths.map((p) => digest(readFileSync(resolve(p))));
const originalFetch = globalThis.fetch;
const failedRequests = new Set<string>();

async function main() {
  assert.ok(process.argv.includes('--approved-player-round-1-decryption-once'));
  for (const name of ['CIPHERQUIZ_SEPOLIA_TEST', 'CIPHERQUIZ_SEPOLIA_DEPLOY'])
    assert.ok(!process.env[name]);
  assert.equal(process.env.CIPHERQUIZ_OPERATOR_PRIVATE_KEY, undefined);
  assert.equal(
    verifyPlayerSigner(
      process.env.CIPHERQUIZ_PLAYER_PRIVATE_KEY ?? '',
      process.env.CIPHERQUIZ_PLAYER_ADDRESS ?? '',
    ),
    DIAGNOSTIC_PLAYER,
  );
  assert.equal(
    getAddress(process.env.CIPHERQUIZ_SEPOLIA_ADDRESS ?? ''),
    SCORING_ADDRESS,
  );
  const rpc = process.env.SEPOLIA_RPC_URL!;
  assert.equal(new URL(rpc).protocol, 'https:');
  const budget = readBudgetLedger();
  assert.ok(!existsSync(resolve('contracts/.sepolia-budget.jsonl.lock')));
  assert.equal(budget.entries.length, 4);
  assert.equal(budget.remainingWei, DECRYPTION_REMAINING_WEI);
  assert.deepEqual(
    budget.entries.map((e) => [e.id, e.reservedWei]),
    [
      ['bbba8b28-7817-4902-bbff-0f62552552b7', '1272860400000000'],
      ['1b3e15fe-ffe4-4c41-820a-6d1b65704dbd', '258712700000000'],
      ['83218b2a-8719-42ff-8200-ca32c697fadf', '173423300000000'],
      ['90083e9f-0bf6-41f8-8eae-65564794ecaa', '20326200000000'],
    ],
  );

  // No retry may reach the network after a failed request. No signing/write RPC
  // is allowed, including inside SDK-created providers. Never log URLs or bodies.
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    const isRemoteJob = /\/v[23]\/user-decrypt(?:\/[^/]+)?\/?$/.test(
      new URL(request.url).pathname,
    );
    const body = request.method === 'POST' ? await request.clone().text() : '';
    let payload: unknown;
    try {
      payload = JSON.parse(body);
    } catch {
      payload = undefined;
    }
    const calls = Array.isArray(payload) ? payload : [payload];
    const isRpc = calls.some(
      (c) => c && typeof c === 'object' && 'jsonrpc' in c,
    );
    if (isRpc) {
      for (const call of calls) {
        try {
          assertReadOnlyRpc((call as { method: string }).method);
        } catch {
          blockedRpcMethods++;
          throw new Error('Diagnostic RPC guard');
        }
      }
    } else if (request.method !== 'GET') {
      assert.ok(
        request.method === 'POST' &&
          /\/v[23]\/user-decrypt\/?$/.test(new URL(request.url).pathname) &&
          new URL(request.url).protocol === 'https:',
        'Unapproved diagnostic network operation',
      );
      assert.equal(kmsRequests, 0, 'Second remote decryption prohibited');
      kmsRequests++;
    }
    const identityBody = isRpc
      ? JSON.stringify(
          calls.map((c: { method: string; params: unknown }) => ({
            method: c.method,
            params: c.params,
          })),
        )
      : body;
    const identity = digest(`${request.method}:${request.url}:${identityBody}`);
    if (failedRequests.has(identity)) {
      blockedRetries++;
      throw new Error('Diagnostic network retry prohibited');
    }
    try {
      const networkStarted = Date.now();
      const response = await originalFetch(request);
      if (isRemoteJob && !isRpc) {
        remoteStatuses.push(response.status);
        if (request.method === 'GET') jobPolls++;
        if (response.status === 200) {
          const count = kmsShareCount(await response.clone().json());
          if (count > 0) {
            kmsResponses++;
            returnedShares += count;
          }
        }
        emit({
          status: 'remote-user-decrypt-http',
          method: request.method,
          httpStatus: response.status,
          successfulKmsResults: kmsResponses,
          kmsShareCount: returnedShares,
          elapsedMs: Date.now() - networkStarted,
        });
      }
      if (!response.ok) {
        failedRequests.add(identity);
        httpStatuses.push(response.status);
      }
      if (isRpc) {
        const answer = await response.clone().json();
        if ((Array.isArray(answer) ? answer : [answer]).some((a) => a?.error))
          failedRequests.add(identity);
      }
      return response;
    } catch (error) {
      failedRequests.add(identity);
      throw error;
    }
  };

  const transport = custom(
    {
      async request({ method, params }) {
        assertReadOnlyRpc(method);
        const response = await fetch(rpc, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
          signal: AbortSignal.timeout(30000),
        });
        assert.ok(response.ok);
        const result = (await response.json()) as {
          error?: unknown;
          result: unknown;
        };
        assert.ok(!result.error, 'Public RPC read failed');
        return result.result;
      },
    },
    { retryCount: 0 },
  );
  const client = createPublicClient({ chain: sepolia, transport });
  checkpoint('chain and existing round ACL');
  assert.equal(await client.getChainId(), 11155111);
  const receipt = await client.getTransactionReceipt({
    hash: FINALIZATION_HASH,
  });
  const canonical = await client.getBlock({ blockNumber: receipt.blockNumber });
  const finalized = await client.getBlock({ blockTag: 'finalized' });
  const head = await client.getBlock();
  assertFinality({
    receiptStatus: receipt.status,
    transactionHash: receipt.transactionHash,
    receiptBlock: receipt.blockNumber,
    receiptBlockHash: receipt.blockHash,
    canonicalBlockHash: canonical.hash,
    finalizedBlock: finalized.number,
    latestBlock: head.number,
  });
  assert.equal(getAddress(receipt.from), REVIEWED_OPERATOR);
  assert.equal(getAddress(receipt.to!), SCORING_ADDRESS);
  assert.equal(
    keccak256((await client.getCode({ address: SCORING_ADDRESS }))!),
    '0x98e53c2f853afaedee48a173730a1730d0c71f2cbd9cf61aafd3c8cb980daccc',
  );
  const round = await client.readContract({
    address: SCORING_ADDRESS,
    abi: scoringAbi,
    functionName: 'getRound',
    args: [1n],
    blockNumber: finalized.number,
  });
  assert.equal(round[0], DIAGNOSTIC_PLAYER);
  assert.equal(round[3], 3);
  assert.equal(round[5], 4n);
  assert.notEqual(BigInt(round[4]), 0n);
  const submitted = await client.readContract({
    address: SCORING_ADDRESS,
    abi: scoringAbi,
    functionName: 'getRound',
    args: [1n],
    blockNumber: 12127163n,
  });
  assert.deepEqual(round, [
    submitted[0],
    submitted[1],
    submitted[2],
    3,
    submitted[4],
    submitted[5],
  ]);
  assert.equal(
    await client.readContract({
      address: SCORING_ADDRESS,
      abi: scoringAbi,
      functionName: 'OPERATOR',
    }),
    REVIEWED_OPERATOR,
  );
  assert.equal(
    await client.readContract({
      address: SCORING_ADDRESS,
      abi: scoringAbi,
      functionName: 'nextRoundId',
    }),
    2n,
  );
  const acl = '0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D';
  const aclAbi = parseAbi([
    'function persistAllowed(bytes32,address) view returns(bool)',
    'function isAllowedForDecryption(bytes32) view returns(bool)',
  ]);
  const contractAllowed = await client.readContract({
    address: acl,
    abi: aclAbi,
    functionName: 'persistAllowed',
    args: [round[4], SCORING_ADDRESS],
  });
  const playerAllowed = await client.readContract({
    address: acl,
    abi: aclAbi,
    functionName: 'persistAllowed',
    args: [round[4], DIAGNOSTIC_PLAYER],
  });
  const publicAllowed = await client.readContract({
    address: acl,
    abi: aclAbi,
    functionName: 'isAllowedForDecryption',
    args: [round[4]],
  });
  const operatorAllowed = await client.readContract({
    address: acl,
    abi: aclAbi,
    functionName: 'persistAllowed',
    args: [round[4], REVIEWED_OPERATOR],
  });
  assert.equal(contractAllowed, true);
  assert.equal(playerAllowed, true);
  assert.equal(operatorAllowed, false);
  assert.equal(publicAllowed, false);
  const block = await client.getBlock();
  const nonceBefore = await client.getTransactionCount({
    address: DIAGNOSTIC_PLAYER,
  });
  const pendingNonceBefore = await client.getTransactionCount({
    address: DIAGNOSTIC_PLAYER,
    blockTag: 'pending',
  });
  emit({
    status: 'prechecks-verified',
    chainId: 11155111,
    contract: SCORING_ADDRESS,
    roundId: 1,
    player: DIAGNOSTIC_PLAYER,
    roundState: 'Finalized',
    finalizationTransaction: FINALIZATION_HASH,
    receiptIncludedInFinalizedCheckpoint: true,
    finalizationBlock: receipt.blockNumber.toString(),
    finalizedBlock: finalized.number.toString(),
    confirmations: (head.number - receipt.blockNumber + 1n).toString(),
    scoreUnchangedFromSubmission: true,
    scorePresent: true,
    contractAllowed,
    playerAllowed,
    operatorAllowed,
    publicAllowed,
    blockNumber: block.number.toString(),
    blockTimestamp: block.timestamp.toString(),
    deadline: round[1].toString(),
    deadlineExpired: block.timestamp >= round[1],
    remainingWei: budget.remainingWei.toString(),
    playerNonce: nonceBefore,
    playerPendingNonce: pendingNonceBefore,
  });

  const account = privateKeyToAccount(
    process.env.CIPHERQUIZ_PLAYER_PRIVATE_KEY as Hex,
  );
  const consumeSignature = onceOnly();
  const prohibited = async (): Promise<never> => {
    throw new Error('Diagnostic signing method prohibited');
  };
  const walletTransport = custom(
    {
      async request({ method, params }) {
        if (method === 'eth_chainId')
          return client.request({ method: 'eth_chainId' });
        if (method !== 'eth_signTypedData_v4') return prohibited();
        const [signer, encoded] = params as [string, string];
        assert.equal(getAddress(signer), DIAGNOSTIC_PLAYER);
        const data = JSON.parse(encoded);
        consumeSignature();
        assertDiagnosticPermit(data, Math.floor(Date.now() / 1000));
        checkpoint('approved player EIP-712 signature');
        // JSON-RPC wallets receive the domain chain ID as hex; the local viem
        // signer expects a numeric domain value. Preserve the checked value.
        const signature = await account.signTypedData({
          ...data,
          domain: {
            ...data.domain,
            chainId: Number(BigInt(data.domain.chainId)),
          },
        });
        signatures++;
        emit({
          status: 'player-permit-signed',
          signatures,
          lifetimeSeconds: PERMIT_SECONDS,
          scope: 'reviewed-contract-only',
        });
        return signature;
      },
    },
    { retryCount: 0 },
  );
  const config = createConfig({
    chains: [{ ...fheSepolia, network: rpc }],
    publicClient: client,
    walletClient: createWalletClient({
      account: DIAGNOSTIC_PLAYER,
      chain: sepolia,
      transport: walletTransport,
    }),
    storage: new MemoryStorage(),
    permitStorage: new MemoryStorage(),
    permitTTL: 1,
    transportKeyPairTTL: PERMIT_SECONDS,
    telemetry: false,
    relayers: { [fheSepolia.id]: node({ timeout: 180000, debug: false }) },
    logger: { info() {}, debug() {}, warn() {}, error() {} },
  });
  // SDK 3.7.2's resolved router is internal (present in installed source, omitted
  // from the public config type). Fail closed if that pinned shape changes.
  // The wrapper only caps attempts and disables HTTP retries; ACL behavior stays intact.
  const router = Reflect.get(config, 'router') as {
    relayer: {
      decryptValues: (parameters: {
        options?: Record<string, unknown>;
        [name: string]: unknown;
      }) => Promise<unknown>;
    };
  };
  assert.ok(router && typeof router.relayer?.decryptValues === 'function');
  const backend = router.relayer;
  const decryptOnce = onceOnly();
  const decrypt = backend.decryptValues.bind(backend);
  backend.decryptValues = async (parameters) => {
    decryptOnce();
    decryptAttempts++;
    return decrypt({
      ...parameters,
      options: { ...parameters.options, fetchRetries: 0, debug: false },
    });
  };
  sdk = new ZamaSDK(config);
  checkpoint('one-day player scoped permit setup');
  const permitStarted = Date.now();
  const reused = await sdk.permits.hasPermit([SCORING_ADDRESS]);
  if (!reused) await sdk.permits.grantPermit([SCORING_ADDRESS]);
  assert.equal(signatures, reused ? 0 : 1);
  emit({
    status: 'permit-flow-completed',
    permitReused: reused,
    signatures,
    elapsedMs: Date.now() - permitStarted,
  });
  emit({ status: 'scoped-permit-ready', lifetimeSeconds: PERMIT_SECONDS });
  checkpoint('authorized player remote SDK KMS decryption');
  const decryptStarted = Date.now();
  const result = await sdk.decryption.decryptValues(
    [{ encryptedValue: round[4], contractAddress: SCORING_ADDRESS }],
    { timeout: 180000, signal: AbortSignal.timeout(240000) },
  );
  const score = BigInt(result[round[4]] as bigint);
  emit({
    status: 'sdk-score-returned',
    score: score.toString(),
    questionCount: 4,
    elapsedMs: Date.now() - decryptStarted,
    backendAttempts: decryptAttempts,
    remotePosts: kmsRequests,
    successfulResults: kmsResponses,
    kmsShareCount: returnedShares,
  });
  assertRemoteDecryption({
    score,
    backendAttempts: decryptAttempts,
    remotePosts: kmsRequests,
    successfulResults: kmsResponses,
    shares: returnedShares,
  });
  checkpoint('read-only postconditions');
  const after = await client.readContract({
    address: SCORING_ADDRESS,
    abi: scoringAbi,
    functionName: 'getRound',
    args: [1n],
  });
  assert.deepEqual(after, round);
  for (const [address, expected] of [
    [DIAGNOSTIC_PLAYER, true],
    [REVIEWED_OPERATOR, false],
    [SCORING_ADDRESS, true],
  ] as const)
    assert.equal(
      await client.readContract({
        address: acl,
        abi: aclAbi,
        functionName: 'persistAllowed',
        args: [round[4], address],
      }),
      expected,
    );
  assert.equal(
    await client.readContract({
      address: acl,
      abi: aclAbi,
      functionName: 'isAllowedForDecryption',
      args: [round[4]],
    }),
    false,
  );
  assert.equal(
    await client.getTransactionCount({ address: DIAGNOSTIC_PLAYER }),
    nonceBefore,
  );
  assert.equal(
    await client.getTransactionCount({
      address: DIAGNOSTIC_PLAYER,
      blockTag: 'pending',
    }),
    pendingNonceBefore,
  );
  emit({
    status: 'authorized-decryption-verified',
    roundUnchanged: true,
    authorizedDecryptionVerified: true,
    score: 2,
    questionCount: 4,
    remoteKmsEvidenceVerified: true,
  });
}

void main()
  .catch((error) => {
    emit({
      status: 'decryption-verification-stopped',
      stage,
      errorTypes: diagnosticErrorTypes(error),
      stageElapsedMs: Date.now() - stageStarted,
      totalElapsedMs: Date.now() - verificationStarted,
      sensitiveDetailsSuppressed: true,
    });
    process.exitCode = 1;
  })
  .finally(() => {
    try {
      sdk?.terminate();
    } catch {
      emit({ status: 'sdk-cleanup-failed' });
      process.exitCode = 1;
    }
    globalThis.fetch = originalFetch;
    const protectedFilesUnchanged = protectedPaths.every(
      (p, i) => snapshots[i] === digest(readFileSync(resolve(p))),
    );
    emit({
      status: 'final-safety-summary',
      signatures,
      decryptAttempts,
      remoteKmsRequests: kmsRequests,
      successfulKmsResults: kmsResponses,
      kmsShareCount: returnedShares,
      jobPolls,
      remoteHttpStatuses: remoteStatuses,
      blockedRetries,
      blockedRpcMethods,
      httpStatuses,
      protectedFilesUnchanged,
      remainingWei: readBudgetLedger().remainingWei.toString(),
      onchainWrites: 0,
      totalElapsedMs: Date.now() - verificationStarted,
    });
    if (!protectedFilesUnchanged) process.exitCode = 1;
  });
