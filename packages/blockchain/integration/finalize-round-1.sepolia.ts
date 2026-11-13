import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  createPublicClient,
  custom,
  decodeEventLog,
  getAddress,
  keccak256,
  parseAbi,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import {
  AGGREGATE_CAP_WEI,
  BUDGET_LEDGER,
  MAX_FEE_PER_GAS_WEI,
  REVIEWED_OPERATOR,
  assertReviewedOperator,
  readBudgetLedger,
  reserveGasBudget,
} from '../../../contracts/scripts/sepolia-policy.js';
import { SCORING_ADDRESS, scoringAbi } from './reviewed-deployment.js';
import { DIAGNOSTIC_PLAYER, onceOnly } from './player-diagnostic-guards.js';
import {
  assertFinalizationTransaction,
  FINALIZE_DATA,
  PRE_FINALIZE_REMAINING,
} from './finalize-round-1-guards.js';

// Explicitly approved recovery only. No Zama SDK, permit or decryption imports.
const emit = (value: Record<string, unknown>) =>
  process.stdout.write(`CIPHERQUIZ_FINALIZE ${JSON.stringify(value)}\n`);
let stage = 'offline authorization and policy';
let transactionHash: Hex | undefined;
let broadcasts = 0;
const envDigest = () =>
  createHash('sha256')
    .update(readFileSync(resolve('contracts/.env')))
    .digest('hex');
const initialEnvDigest = envDigest();
const consumeBroadcast = onceOnly();

async function main() {
  assert.ok(process.argv.includes('--approved-one-finalize-round-1'));
  assert.ok(
    !process.env.CIPHERQUIZ_SEPOLIA_TEST &&
      !process.env.CIPHERQUIZ_SEPOLIA_DEPLOY,
  );
  assert.equal(process.env.CIPHERQUIZ_PLAYER_PRIVATE_KEY, undefined);
  assert.equal(AGGREGATE_CAP_WEI, 20000000000000000n);
  const key = process.env.CIPHERQUIZ_OPERATOR_PRIVATE_KEY ?? '';
  assert.match(key, /^0x[0-9a-fA-F]{64}$/);
  const account = privateKeyToAccount(key as Hex);
  assertReviewedOperator(account.address);
  assertReviewedOperator(process.env.CIPHERQUIZ_OPERATOR_ADDRESS ?? '');
  assert.equal(
    getAddress(process.env.CIPHERQUIZ_SEPOLIA_ADDRESS ?? ''),
    SCORING_ADDRESS,
  );
  const rpc = process.env.SEPOLIA_RPC_URL!;
  assert.equal(new URL(rpc).protocol, 'https:');
  const maxFeePerGas = BigInt(
    process.env.CIPHERQUIZ_MAX_FEE_PER_GAS_WEI ?? '0',
  );
  assert.ok(maxFeePerGas > 0n && maxFeePerGas <= MAX_FEE_PER_GAS_WEI);
  const before = readBudgetLedger();
  assert.equal(before.remainingWei, PRE_FINALIZE_REMAINING);
  assert.deepEqual(
    before.entries.map((e) => [e.id, e.operation, e.reservedWei]),
    [
      [
        'bbba8b28-7817-4902-bbff-0f62552552b7',
        'deployment',
        '1272860400000000',
      ],
      [
        '1b3e15fe-ffe4-4c41-820a-6d1b65704dbd',
        'createRound',
        '258712700000000',
      ],
      [
        '83218b2a-8719-42ff-8200-ca32c697fadf',
        'submitAnswers',
        '173423300000000',
      ],
    ],
  );
  assert.ok(!existsSync(`${BUDGET_LEDGER}.lock`));
  const reads = new Set([
    'eth_chainId',
    'eth_getCode',
    'eth_call',
    'eth_getBlockByNumber',
    'eth_blockNumber',
    'eth_getBalance',
    'eth_getTransactionCount',
    'eth_estimateGas',
    'eth_gasPrice',
    'eth_maxPriorityFeePerGas',
    'eth_getTransactionReceipt',
    'eth_getTransactionByHash',
  ]);
  const client = createPublicClient({
    chain: sepolia,
    transport: custom(
      {
        async request({ method, params }) {
          if (method === 'eth_sendRawTransaction') {
            consumeBroadcast();
            const raw = (params as [Hex])[0];
            assert.ok(transactionHash && keccak256(raw) === transactionHash);
            broadcasts++;
          } else assert.ok(reads.has(method), 'Unapproved RPC method');
          const response = await fetch(rpc, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
            signal: AbortSignal.timeout(30000),
          });
          assert.ok(response.ok, 'RPC HTTP failure');
          const data = (await response.json()) as {
            error?: unknown;
            result: unknown;
          };
          assert.ok(!data.error, 'RPC request failed');
          return data.result;
        },
      },
      { retryCount: 0 },
    ),
  });
  stage = 'chain, deployment, submitted round and ACL';
  assert.equal(await client.getChainId(), 11155111);
  assert.equal(
    keccak256((await client.getCode({ address: SCORING_ADDRESS }))!),
    '0x98e53c2f853afaedee48a173730a1730d0c71f2cbd9cf61aafd3c8cb980daccc',
  );
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
  const readRound = (blockNumber?: bigint) =>
    client.readContract({
      address: SCORING_ADDRESS,
      abi: scoringAbi,
      functionName: 'getRound',
      args: [1n],
      blockNumber,
    });
  const round = await readRound();
  assert.equal(round[0], DIAGNOSTIC_PLAYER);
  assert.equal(round[3], 2);
  assert.equal(round[5], 4n);
  assert.notEqual(BigInt(round[4]), 0n);
  assert.deepEqual(round, await readRound(12127163n));
  const acl = '0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D';
  const aclAbi = parseAbi([
    'function persistAllowed(bytes32,address) view returns(bool)',
    'function isAllowedForDecryption(bytes32) view returns(bool)',
  ]);
  const allowed = (address: `0x${string}`) =>
    client.readContract({
      address: acl,
      abi: aclAbi,
      functionName: 'persistAllowed',
      args: [round[4], address],
    });
  const publicAllowed = () =>
    client.readContract({
      address: acl,
      abi: aclAbi,
      functionName: 'isAllowedForDecryption',
      args: [round[4]],
    });
  assert.equal(await allowed(SCORING_ADDRESS), true);
  assert.equal(await allowed(DIAGNOSTIC_PLAYER), false);
  assert.equal(await allowed(REVIEWED_OPERATOR), false);
  assert.equal(await publicAllowed(), false);
  stage = 'simulation, gas, funding, nonce and fee preflight';
  const call = {
    address: SCORING_ADDRESS,
    abi: scoringAbi,
    functionName: 'finalizeRound',
    args: [1n],
    account,
  } as const;
  await client.simulateContract(call);
  const estimatedGas = await client.estimateContractGas(call);
  const gas = (estimatedGas * 120n + 99n) / 100n;
  const fees = await client.estimateFeesPerGas();
  assert.ok(fees.maxFeePerGas <= maxFeePerGas);
  const nonce = await client.getTransactionCount({ address: account.address });
  const pendingNonce = await client.getTransactionCount({
    address: account.address,
    blockTag: 'pending',
  });
  assert.equal(nonce, 2);
  assert.equal(pendingNonce, nonce);
  const balance = await client.getBalance({ address: account.address });
  const finalizedBalance = await client.getBalance({
    address: account.address,
    blockTag: 'finalized',
  });
  const maximumCost = gas * maxFeePerGas;
  assert.ok(balance >= maximumCost && finalizedBalance >= maximumCost);
  assert.ok(maximumCost <= before.remainingWei);
  const tx = {
    chainId: 11155111,
    to: SCORING_ADDRESS,
    data: FINALIZE_DATA,
    value: 0n,
    nonce,
    gas,
    maxFeePerGas,
    maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
    type: 'eip1559',
  } as const;
  assertFinalizationTransaction(tx);
  // Last state/network/journal check before a durable reservation and one sign/send.
  assert.equal(await client.getChainId(), 11155111);
  assert.deepEqual(await readRound(), round);
  assert.equal(
    await client.getTransactionCount({
      address: account.address,
      blockTag: 'pending',
    }),
    nonce,
  );
  assert.deepEqual(readBudgetLedger().entries, before.entries);
  assert.equal(envDigest(), initialEnvDigest);
  const block = await client.getBlock();
  emit({
    status: 'finalization-preflight-passed',
    chainId: 11155111,
    operator: account.address,
    contract: SCORING_ADDRESS,
    roundId: 1,
    roundState: 'Submitted',
    blockNumber: block.number.toString(),
    blockTimestamp: block.timestamp.toString(),
    deadline: round[1].toString(),
    deadlineExpired: block.timestamp >= round[1],
    nonce,
    pendingNonce,
    balanceWei: balance.toString(),
    finalizedBalanceWei: finalizedBalance.toString(),
    gasEstimate: estimatedGas.toString(),
    gasLimit: gas.toString(),
    maxFeePerGasWei: maxFeePerGas.toString(),
    suggestedMaxFeePerGasWei: fees.maxFeePerGas.toString(),
    maxPriorityFeePerGasWei: fees.maxPriorityFeePerGas.toString(),
    maximumCostWei: maximumCost.toString(),
    aggregateRemainingBeforeWei: before.remainingWei.toString(),
  });
  stage = 'durable finalization reservation';
  const reservation = reserveGasBudget('finalizeRound(1)', gas, maxFeePerGas);
  const reservedBudget = readBudgetLedger();
  assert.equal(reservedBudget.entries.length, 4);
  assert.deepEqual(reservedBudget.entries.slice(0, 3), before.entries);
  assert.equal(reservedBudget.entries[3]?.id, reservation.id);
  emit({
    status: 'reserved',
    reservationId: reservation.id,
    reservedWei: reservation.reservedWei.toString(),
    aggregateRemainingWei: reservation.remainingWei.toString(),
  });
  stage = 'one operator transaction signature and broadcast';
  const serialized = await account.signTransaction(tx);
  transactionHash = keccak256(serialized);
  emit({ status: 'signed-awaiting-broadcast', transactionHash });
  const returned = await client.request({
    method: 'eth_sendRawTransaction',
    params: [serialized],
  });
  assert.equal(returned, transactionHash);
  emit({ status: 'broadcast', transactionHash });
  stage = 'receipt confirmation';
  const receipt = await client.waitForTransactionReceipt({
    hash: transactionHash,
    confirmations: 2,
    timeout: 180000,
  });
  const actualFee = receipt.gasUsed * receipt.effectiveGasPrice;
  emit({
    status: 'receipt',
    transactionHash: receipt.transactionHash,
    receiptStatus: receipt.status,
    blockNumber: receipt.blockNumber.toString(),
    gasUsed: receipt.gasUsed.toString(),
    effectiveGasPriceWei: receipt.effectiveGasPrice.toString(),
    actualFeeWei: actualFee.toString(),
  });
  assert.equal(receipt.transactionHash, transactionHash);
  assert.equal(receipt.status, 'success');
  assert.equal(getAddress(receipt.from), REVIEWED_OPERATOR);
  assert.equal(getAddress(receipt.to!), SCORING_ADDRESS);
  assert.ok(actualFee <= maximumCost);
  const events = parseAbi(['event RoundFinalized(uint64 indexed roundId)']);
  assert.ok(
    receipt.logs.some((log) => {
      if (getAddress(log.address) !== SCORING_ADDRESS) return false;
      try {
        return (
          decodeEventLog({ abi: events, data: log.data, topics: log.topics })
            .args.roundId === 1n
        );
      } catch {
        return false;
      }
    }),
  );
  stage = 'finalized state and player score access';
  const after = await readRound();
  assert.deepEqual(after, [
    round[0],
    round[1],
    round[2],
    3,
    round[4],
    round[5],
  ]);
  assert.equal(await allowed(DIAGNOSTIC_PLAYER), true);
  assert.equal(await allowed(SCORING_ADDRESS), true);
  assert.equal(await allowed(REVIEWED_OPERATOR), false);
  assert.equal(await publicAllowed(), false);
  assert.equal(
    await client.readContract({
      address: SCORING_ADDRESS,
      abi: scoringAbi,
      functionName: 'nextRoundId',
    }),
    2n,
  );
  const budget = readBudgetLedger();
  assert.equal(budget.entries.length, 4);
  assert.deepEqual(budget.entries.slice(0, 3), before.entries);
  assert.equal(budget.entries[3]?.id, reservation.id);
  assert.equal(envDigest(), initialEnvDigest);
  emit({
    status: 'finalization-verified',
    transactionHash,
    roundId: 1,
    roundState: 'Finalized',
    scoreUnchanged: true,
    playerScoreAllowed: true,
    operatorScoreAllowed: false,
    publicDecryption: false,
    broadcasts,
    actualFeeWei: actualFee.toString(),
    reservedWei: reservation.reservedWei.toString(),
    aggregateRemainingWei: budget.remainingWei.toString(),
    previousReservationsRetained: true,
    envUnchanged: true,
    decryptionPerformed: false,
  });
}

void main().catch(() => {
  emit({
    status: 'finalization-stopped',
    stage,
    transactionHash,
    broadcasts,
    sensitiveDetailsSuppressed: true,
    automaticRetry: false,
  });
  process.exitCode = 1;
});
