import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generatePrivateKey } from 'viem/accounts';
import { REVIEWED_OPERATOR } from '../../../contracts/scripts/sepolia-policy.js';
import {
  SCORING_ADDRESS,
  assertReviewedDeployment,
  integrationCeilings,
} from '../integration/reviewed-deployment.js';
import {
  isAclDenial,
  maskImmutables,
  packAnswer,
  readSettings,
} from '../integration/support.js';

test('live integration fails closed without approval and an existing deployment', () => {
  assert.throws(() => readSettings({}), /authorized live test/);
  assert.throws(
    () => readSettings({ CIPHERQUIZ_SEPOLIA_TEST: 'approved' }),
    /Missing SEPOLIA_RPC_URL/,
  );
  assert.throws(
    () =>
      readSettings({
        CIPHERQUIZ_SEPOLIA_TEST: 'approved',
        SEPOLIA_RPC_URL: 'http://example.invalid',
      }),
    /HTTPS/,
  );
  assert.throws(
    () =>
      readSettings({
        CIPHERQUIZ_SEPOLIA_TEST: 'approved',
        SEPOLIA_RPC_URL: 'https://example.invalid',
      }),
    /Missing CIPHERQUIZ_SEPOLIA_ADDRESS/,
  );
});

test('live settings isolate signer roles and require explicit positive fee budgets', () => {
  // Disposable local-only values; no signer is funded, persisted or printed.
  const operatorKey = generatePrivateKey();
  const env = {
    CIPHERQUIZ_SEPOLIA_TEST: 'approved',
    SEPOLIA_RPC_URL: 'https://example.invalid',
    CIPHERQUIZ_SEPOLIA_ADDRESS: SCORING_ADDRESS,
    CIPHERQUIZ_OPERATOR_PRIVATE_KEY: operatorKey,
    CIPHERQUIZ_OPERATOR_ADDRESS: REVIEWED_OPERATOR,
    CIPHERQUIZ_PLAYER_PRIVATE_KEY: operatorKey,
    CIPHERQUIZ_MAX_FEE_PER_GAS_WEI: '100000000',
    CIPHERQUIZ_MAX_TOTAL_GAS_COST_WEI: '7000000000000000',
  };
  assert.throws(() => readSettings(env), /Operator and player must differ/);
  env.CIPHERQUIZ_PLAYER_PRIVATE_KEY = generatePrivateKey();
  assert.equal(readSettings(env).maxFeePerGas, 100_000_000n);
  for (const name of [
    'CIPHERQUIZ_MAX_FEE_PER_GAS_WEI',
    'CIPHERQUIZ_MAX_TOTAL_GAS_COST_WEI',
  ]) {
    for (const value of ['', '0', '-1', '1.5']) {
      assert.throws(() => readSettings({ ...env, [name]: value }));
    }
  }
  assert.throws(
    () =>
      readSettings({
        ...env,
        CIPHERQUIZ_MAX_TOTAL_GAS_COST_WEI: '2000000000000000',
      }),
    /complete three-write ceiling/,
  );
  assert.throws(
    () =>
      readSettings({
        ...env,
        CIPHERQUIZ_SEPOLIA_ADDRESS:
          '0x0000000000000000000000000000000000000001',
      }),
    /reviewed deployment/,
  );
  assert.throws(
    () =>
      readSettings({
        ...env,
        CIPHERQUIZ_MAX_TOTAL_GAS_COST_WEI: '20000000000000001',
      }),
    /aggregate cap/,
  );
  assert.throws(
    () =>
      readSettings({
        ...env,
        CIPHERQUIZ_OPERATOR_ADDRESS:
          '0x0000000000000000000000000000000000000001',
      }),
    /reviewed public address/,
  );
  assert.throws(() =>
    readSettings({
      ...env,
      CIPHERQUIZ_PLAYER_PRIVATE_KEY: `0x${'0'.repeat(64)}`,
    }),
  );
});

test('integration pins the deployed contract and funds both signer roles under unchanged ceilings', () => {
  assert.equal(SCORING_ADDRESS, '0x4b4c204d28D5ee37896278C5fc56d61086f92b53');
  assert.doesNotThrow(() =>
    assertReviewedDeployment(SCORING_ADDRESS.toLowerCase()),
  );
  assert.throws(() => assertReviewedDeployment(REVIEWED_OPERATOR));
  assert.deepEqual(integrationCeilings(100000000n), {
    perTransaction: 1500000000000000n,
    operator: 3000000000000000n,
    player: 1500000000000000n,
    total: 4500000000000000n,
  });
  for (const fee of [0n, -1n, 100000001n])
    assert.throws(() => integrationCeilings(fee));
});

test('packed inputs enforce bounds and preserve maximum round identity', () => {
  const maximum = (1n << 48n) - 1n;
  assert.equal(packAnswer(maximum, 9, 3n) >> 16n, maximum);
  for (const id of [0n, maximum + 1n])
    assert.throws(() => packAnswer(id, 0, 0n));
  for (const index of [-1, 10, 1.5])
    assert.throws(() => packAnswer(1n, index, 0n));
  for (const choice of [-1n, 4n])
    assert.throws(() => packAnswer(1n, 0, choice));
});

test('denial evidence excludes network errors and unrelated SDK failures', () => {
  assert.equal(isAclDenial(new Error('timeout')), false);
  assert.equal(isAclDenial({ code: 'DECRYPTION_FAILED' }), false);
  assert.equal(isAclDenial({ status: 403 }), false);
  assert.equal(
    isAclDenial({ cause: { name: 'AclUserDecryptionError' } }),
    true,
  );
  const cyclic: { cause?: unknown } = {};
  cyclic.cause = cyclic;
  assert.equal(isAclDenial(cyclic), false);
});

test('runtime identity masks only compiler-declared immutable bytes', () => {
  const refs = { operator: [{ start: 1, length: 1 }] };
  assert.equal(
    maskImmutables('0x010203', refs),
    maskImmutables('0x01ff03', refs),
  );
  assert.notEqual(
    maskImmutables('0x010203', refs),
    maskImmutables('0x090203', refs),
  );
  assert.throws(() => maskImmutables('0x01', refs));
});
