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
import { readBudgetLedger } from '../../../contracts/scripts/sepolia-policy.js';
import { verifyPlayerSigner } from './player.js';
import { diagnosticErrorTypes, isAclDenial } from './support.js';
import { SCORING_ADDRESS, scoringAbi } from './reviewed-deployment.js';
import {
  assertDiagnosticPermit,
  assertReadOnlyRpc,
  DIAGNOSTIC_PLAYER,
  onceOnly,
  PERMIT_SECONDS,
} from './player-diagnostic-guards.js';

// Standalone, one-shot command. Never imported by tests or the three-write runner.
const emit = (data: Record<string, unknown>) =>
  process.stdout.write(`CIPHERQUIZ_DIAGNOSTIC ${JSON.stringify(data)}\n`);
let stage = 'offline guards';
const checkpoint = (next: string) => {
  stage = next;
  emit({ status: 'checkpoint', stage });
};
let signatures = 0;
let decryptAttempts = 0;
let kmsRequests = 0;
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
  assert.ok(process.argv.includes('--approved-player-round-1-offchain-once'));
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
  assert.equal(budget.entries.length, 3);
  assert.equal(budget.remainingWei, 18295003600000000n);

  // No retry may reach the network after a failed request. No signing/write RPC
  // is allowed, including inside SDK-created providers. Never log URLs or bodies.
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
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
          /\/v[23]\/user-decrypt\/?$/.test(new URL(request.url).pathname),
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
      const response = await originalFetch(request);
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
  assert.equal(
    keccak256((await client.getCode({ address: SCORING_ADDRESS }))!),
    '0x98e53c2f853afaedee48a173730a1730d0c71f2cbd9cf61aafd3c8cb980daccc',
  );
  const round = await client.readContract({
    address: SCORING_ADDRESS,
    abi: scoringAbi,
    functionName: 'getRound',
    args: [1n],
  });
  assert.equal(round[0], DIAGNOSTIC_PLAYER);
  assert.equal(round[3], 2);
  assert.notEqual(BigInt(round[4]), 0n);
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
  assert.equal(contractAllowed, true);
  assert.equal(playerAllowed, false);
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
    roundState: 'Submitted',
    scorePresent: true,
    contractAllowed,
    playerAllowed,
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
    relayers: { [fheSepolia.id]: node({ timeout: 60000, debug: false }) },
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
  await sdk.permits.grantPermit([SCORING_ADDRESS]);
  assert.equal(signatures, 1);
  emit({ status: 'scoped-permit-ready', lifetimeSeconds: PERMIT_SECONDS });
  checkpoint('player pre-finalization SDK decryption');
  try {
    await sdk.decryption.decryptValues(
      [{ encryptedValue: round[4], contractAddress: SCORING_ADDRESS }],
      { timeout: 60000, signal: AbortSignal.timeout(90000) },
    );
    emit({
      status: 'unexpected-decryption-success',
      plaintextSuppressed: true,
    });
    process.exitCode = 1;
  } catch (error) {
    emit({
      status: 'player-decryption-rejected',
      errorTypes: diagnosticErrorTypes(error),
      strictAclEvidence: isAclDenial(error),
      remoteKmsRequests: kmsRequests,
      remoteKmsDenialVerified: false,
    });
    // Preserve the original strict assertion. A wrapper or HTTP denial alone is insufficient.
    assert.ok(
      isAclDenial(error),
      'Expected strict SDK ACL evidence was not observed',
    );
  }
  checkpoint('read-only postconditions');
  const after = await client.readContract({
    address: SCORING_ADDRESS,
    abi: scoringAbi,
    functionName: 'getRound',
    args: [1n],
  });
  assert.deepEqual(after, round);
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
    status: 'diagnostic-completed',
    roundUnchanged: true,
    authorizedDecryptionVerified: false,
    finalizationRequiredForPlayerAccess: true,
  });
}

void main()
  .catch((error) => {
    emit({
      status: 'diagnostic-stopped',
      stage,
      errorTypes: diagnosticErrorTypes(error),
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
      blockedRetries,
      blockedRpcMethods,
      httpStatuses,
      protectedFilesUnchanged,
      remainingWei: readBudgetLedger().remainingWei.toString(),
      onchainWrites: 0,
    });
    if (!protectedFilesUnchanged) process.exitCode = 1;
  });
