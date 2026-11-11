import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  closeSync,
  existsSync,
  fsyncSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { getAddress } from 'ethers';

// Public owner-supplied policy. Changing these values requires a new approval review.
export const REVIEWED_OPERATOR = '0x3184FDC5E288619Eb17127D32e373239EE8d7Bb7';
export const AGGREGATE_CAP_WEI = 20_000_000_000_000_000n;
// Proposed conservative transaction limits, subject to the deployment approval.
export const MAX_FEE_PER_GAS_WEI = 100_000_000n; // 0.1 gwei
export const MAX_GAS_PER_TX = 15_000_000n;
export const BUDGET_LEDGER = resolve(__dirname, '../.sepolia-budget.jsonl');

export function assertReviewedOperator(address: string) {
  assert.equal(
    getAddress(address),
    REVIEWED_OPERATOR,
    'Operator differs from reviewed public address',
  );
}

type Reservation = {
  id: string;
  chainId: number;
  operator: string;
  operation: string;
  reservedWei: string;
};

// Maximum gas liability stays reserved permanently, including failed/uncertain sends.
// No refund/reconciliation path can accidentally free the budget of a pending write.
export function readBudgetLedger(path = BUDGET_LEDGER) {
  const entries: Reservation[] = [];
  if (existsSync(path)) {
    const data = readFileSync(path, 'utf8');
    assert.ok(
      data.endsWith('\n'),
      'Incomplete budget ledger; reconcile before any write',
    );
    const ids = new Set<string>();
    for (const line of data.trimEnd().split('\n')) {
      const entry = JSON.parse(line) as Reservation;
      assert.equal(entry.chainId, 11155111);
      assert.equal(entry.operator, REVIEWED_OPERATOR);
      assert.ok(
        typeof entry.id === 'string' &&
          entry.id.length > 0 &&
          !ids.has(entry.id),
      );
      assert.ok(
        typeof entry.operation === 'string' && entry.operation.length > 0,
      );
      assert.match(entry.reservedWei, /^[1-9][0-9]*$/);
      ids.add(entry.id);
      entries.push(entry);
    }
  }
  const reservedWei = entries.reduce(
    (sum, entry) => sum + BigInt(entry.reservedWei),
    0n,
  );
  assert.ok(
    reservedWei <= AGGREGATE_CAP_WEI,
    'Aggregate budget already exceeded',
  );
  return {
    entries,
    reservedWei,
    remainingWei: AGGREGATE_CAP_WEI - reservedWei,
  };
}

export function reserveGasBudget(
  operation: string,
  gasLimit: bigint,
  maxFeePerGas: bigint,
  path = BUDGET_LEDGER,
) {
  assert.ok(gasLimit > 0n && maxFeePerGas > 0n);
  assert.ok(gasLimit <= MAX_GAS_PER_TX, 'Transaction gas ceiling exceeded');
  assert.ok(
    maxFeePerGas <= MAX_FEE_PER_GAS_WEI,
    'Reviewed fee ceiling exceeded',
  );
  // Exclusive lock prevents simultaneous deployment/test processes overspending.
  // A crash can leave the lock behind: stop and reconcile manually; never auto-unlock.
  const lockPath = `${path}.lock`;
  const lock = openSync(lockPath, 'wx');
  try {
    const budget = readBudgetLedger(path);
    const reservedWei = gasLimit * maxFeePerGas;
    assert.ok(
      reservedWei <= budget.remainingWei,
      'Strict aggregate 0.02 ETH cap exceeded',
    );
    const entry: Reservation = {
      id: randomUUID(),
      chainId: 11155111,
      operator: REVIEWED_OPERATOR,
      operation,
      reservedWei: reservedWei.toString(),
    };
    const descriptor = openSync(path, 'a');
    try {
      const data = Buffer.from(`${JSON.stringify(entry)}\n`);
      assert.equal(
        writeSync(descriptor, data),
        data.length,
        'Incomplete budget reservation',
      );
      fsyncSync(descriptor);
    } finally {
      closeSync(descriptor);
    }
    return {
      id: entry.id,
      reservedWei,
      remainingWei: budget.remainingWei - reservedWei,
    };
  } finally {
    closeSync(lock);
    unlinkSync(lockPath);
  }
}
