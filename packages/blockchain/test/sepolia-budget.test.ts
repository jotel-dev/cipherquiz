import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  AGGREGATE_CAP_WEI,
  REVIEWED_OPERATOR,
  assertReviewedOperator,
  readBudgetLedger,
  reserveGasBudget,
} from '../../../contracts/scripts/sepolia-policy.js';

function journal() {
  return join(
    mkdtempSync(join(tmpdir(), 'cipherquiz-budget-')),
    'ledger.jsonl',
  );
}

test('public policy pins the supplied operator address independently of the environment', () => {
  assert.doesNotThrow(() =>
    assertReviewedOperator(REVIEWED_OPERATOR.toLowerCase()),
  );
  assert.throws(() =>
    assertReviewedOperator('0x0000000000000000000000000000000000000001'),
  );
});

test('deployment, integration and retries share a durable worst-case aggregate cap', () => {
  const path = journal();
  assert.equal(readBudgetLedger(path).reservedWei, 0n);
  for (let index = 0; index < 13; index++)
    reserveGasBudget(
      index === 0 ? 'deployment' : 'integration-or-retry',
      15_000_000n,
      100_000_000n,
      path,
    );
  // A new invocation sees the previous maximum liability, even without receipts.
  assert.equal(readBudgetLedger(path).remainingWei, 500_000_000_000_000n);
  reserveGasBudget('submitAnswers', 5_000_000n, 100_000_000n, path);
  const before = readFileSync(path, 'utf8');
  assert.throws(() => reserveGasBudget('retry', 1n, 1n, path), /aggregate/);
  assert.equal(readFileSync(path, 'utf8'), before);
  assert.equal(readBudgetLedger(path).reservedWei, AGGREGATE_CAP_WEI);
});

test('a locked or damaged budget ledger stops further reservations', () => {
  const path = journal();
  writeFileSync(`${path}.lock`, '');
  assert.throws(() => reserveGasBudget('deployment', 1n, 1n, path));
  unlinkSync(`${path}.lock`);
  for (const value of ['', '{"partial":true}', 'invalid\n']) {
    writeFileSync(path, value);
    assert.throws(() => reserveGasBudget('deployment', 1n, 1n, path));
  }
});

test('transaction fee and gas ceilings cannot be raised through environment limits', () => {
  const path = journal();
  assert.throws(
    () => reserveGasBudget('deployment', 15_000_001n, 1n, path),
    /gas ceiling/,
  );
  assert.throws(
    () => reserveGasBudget('deployment', 1n, 100_000_001n, path),
    /fee ceiling/,
  );
  assert.equal(readBudgetLedger(path).reservedWei, 0n);
});
