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
  assert.equal(REVIEWED_OPERATOR, '0xbE4a3DAABCd4406e75314aC7324411249E0C36a2');
  assert.equal(AGGREGATE_CAP_WEI, 20_000_000_000_000_000n);
  assert.doesNotThrow(() =>
    assertReviewedOperator(REVIEWED_OPERATOR.toLowerCase()),
  );
  assert.throws(() =>
    assertReviewedOperator('0x0000000000000000000000000000000000000001'),
  );
  assert.throws(() =>
    assertReviewedOperator('0x3184FDC5E288619Eb17127D32e373239EE8d7Bb7'),
  );
});

test('retired-operator reservations block reads and new reservations without changing the ledger', () => {
  const path = journal();
  const entry = {
    id: 'retired-operator-reservation',
    chainId: 11155111,
    operator: '0x3184FDC5E288619Eb17127D32e373239EE8d7Bb7',
    operation: 'deployment',
    reservedWei: '1500000000000000',
  };
  // A mixed journal must also fail, even when the current operator has valid entries.
  for (const operators of [
    [entry.operator],
    [REVIEWED_OPERATOR, entry.operator],
  ]) {
    const before =
      operators
        .map((operator, index) =>
          JSON.stringify({ ...entry, id: `${entry.id}-${index}`, operator }),
        )
        .join('\n') + '\n';
    writeFileSync(path, before);
    assert.throws(() => readBudgetLedger(path), /operator mismatch/);
    assert.throws(
      () => reserveGasBudget('new-operator-deployment', 1n, 1n, path),
      /operator mismatch/,
    );
    assert.equal(readFileSync(path, 'utf8'), before);
  }
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

test('invalid reservation metadata or amounts cannot free aggregate capacity', () => {
  const path = journal();
  const entry = {
    id: 'existing-reservation',
    chainId: 11155111,
    operator: REVIEWED_OPERATOR,
    operation: 'deployment',
    reservedWei: '1500000000000000',
  };
  const invalidEntries = [
    { ...entry, chainId: 1 },
    { ...entry, id: '' },
    { ...entry, operation: '' },
    ...['0', '-1', '1.5', (AGGREGATE_CAP_WEI + 1n).toString()].map(
      (reservedWei) => ({ ...entry, reservedWei }),
    ),
  ];
  const journals = [
    ...invalidEntries.map((invalid) => [invalid]),
    [entry, entry],
  ];
  for (const entries of journals) {
    const before =
      entries.map((value) => JSON.stringify(value)).join('\n') + '\n';
    writeFileSync(path, before);
    assert.throws(() => readBudgetLedger(path));
    assert.throws(() => reserveGasBudget('retry', 1n, 1n, path));
    assert.equal(readFileSync(path, 'utf8'), before);
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
