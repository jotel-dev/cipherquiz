import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  assertFinality,
  assertRemoteDecryption,
  FINALIZATION_HASH,
  FINALIZATION_BLOCK,
  kmsShareCount,
} from '../integration/round-1-decryption-evidence.js';

test('authorized score decryption requires successful canonical receipt and finalized inclusion', () => {
  const evidence = {
    receiptStatus: 'success',
    transactionHash: FINALIZATION_HASH,
    receiptBlock: FINALIZATION_BLOCK,
    receiptBlockHash: '0x1234',
    canonicalBlockHash: '0x1234',
    finalizedBlock: FINALIZATION_BLOCK,
    latestBlock: FINALIZATION_BLOCK + 1n,
  };
  assert.doesNotThrow(() => assertFinality(evidence));
  for (const change of [
    { receiptStatus: 'reverted' },
    { transactionHash: '0x00' },
    { canonicalBlockHash: '0x4321' },
    { finalizedBlock: FINALIZATION_BLOCK - 1n },
    { receiptBlock: FINALIZATION_BLOCK + 1n },
    { latestBlock: FINALIZATION_BLOCK },
  ])
    assert.throws(() => assertFinality({ ...evidence, ...change }));
});

test('a score of two or HTTP success alone cannot establish remote KMS success', () => {
  const shares = {
    result: {
      result: [
        { payload: 'aabb', signature: 'ab'.repeat(65), extraData: '0x00' },
      ],
    },
  };
  assert.equal(kmsShareCount(shares), 1);
  for (const body of [
    null,
    { result: { jobId: 'queued' } },
    { result: { result: [] } },
    {
      result: {
        result: [
          { payload: 'aa', signature: 'not-a-signature', extraData: '0x' },
        ],
      },
    },
  ])
    assert.equal(kmsShareCount(body), 0);
  const evidence = {
    score: 2n,
    backendAttempts: 1,
    remotePosts: 1,
    successfulResults: 1,
    shares: 1,
  };
  assert.doesNotThrow(() => assertRemoteDecryption(evidence));
  for (const change of [
    { score: 3n },
    { backendAttempts: 0 },
    { backendAttempts: 2 },
    { remotePosts: 0 },
    { remotePosts: 2 },
    { successfulResults: 0 },
    { shares: 0 },
  ])
    assert.throws(() => assertRemoteDecryption({ ...evidence, ...change }));
});
