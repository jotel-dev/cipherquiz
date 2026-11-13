import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { REVIEWED_OPERATOR } from '../../../contracts/scripts/sepolia-policy.js';
import {
  assertPlayerAddress,
  playerFundingReadiness,
  verifyPlayerSigner,
} from '../integration/player.js';

test('offline player validation matches an independently supplied address and rejects operator reuse', () => {
  const key = generatePrivateKey();
  const address = privateKeyToAccount(key).address;
  assert.equal(verifyPlayerSigner(key, address.toLowerCase()), address);
  assert.throws(() => assertPlayerAddress(REVIEWED_OPERATOR));
  assert.throws(() =>
    assertPlayerAddress('0x0000000000000000000000000000000000000000'),
  );
  assert.throws(() =>
    verifyPlayerSigner(key, privateKeyToAccount(generatePrivateKey()).address),
  );
  assert.throws(() => verifyPlayerSigner(key, REVIEWED_OPERATOR));
});

test('malformed, missing and out-of-range player keys fail with a sanitized error', () => {
  const key = generatePrivateKey();
  const address = privateKeyToAccount(key).address;
  for (const bad of [
    '',
    key.slice(2),
    '0x1234',
    `0x${'0'.repeat(64)}`,
    `0x${'f'.repeat(64)}`,
  ]) {
    assert.throws(
      () => verifyPlayerSigner(bad, address),
      (error) =>
        error instanceof Error &&
        error.message === 'Player signer/public address verification failed',
    );
  }
  assert.throws(() => verifyPlayerSigner(key, ''));
});

test('funding checks enforce the exact player ceiling and distinguish finalized funding', () => {
  const ceiling = 1500000000000000n;
  assert.deepEqual(playerFundingReadiness(ceiling, ceiling, ceiling), {
    sufficientLatestBalance: true,
    sufficientFinalizedBalance: true,
    shortfallWei: 0n,
  });
  assert.deepEqual(
    playerFundingReadiness(ceiling - 1n, ceiling - 1n, ceiling),
    {
      sufficientLatestBalance: false,
      sufficientFinalizedBalance: false,
      shortfallWei: 1n,
    },
  );
  assert.deepEqual(playerFundingReadiness(ceiling, 0n, ceiling), {
    sufficientLatestBalance: true,
    sufficientFinalizedBalance: false,
    shortfallWei: 0n,
  });
});
