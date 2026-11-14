import assert from 'node:assert/strict';

export const FINALIZATION_HASH =
  '0x5ed8fc94f071c2d69479e400547dac139673e84e914e18092fe986063ae897dd';
export const FINALIZATION_BLOCK = 12127968n;
export const DECRYPTION_REMAINING_WEI = 18274677400000000n;

export function assertFinality(evidence: {
  receiptStatus: string;
  transactionHash: string;
  receiptBlock: bigint;
  receiptBlockHash: string;
  canonicalBlockHash: string;
  finalizedBlock: bigint;
  latestBlock: bigint;
}) {
  assert.equal(evidence.receiptStatus, 'success');
  assert.equal(evidence.transactionHash, FINALIZATION_HASH);
  assert.equal(evidence.receiptBlock, FINALIZATION_BLOCK);
  assert.equal(evidence.receiptBlockHash, evidence.canonicalBlockHash);
  assert.ok(evidence.finalizedBlock >= evidence.receiptBlock);
  assert.ok(evidence.latestBlock >= evidence.receiptBlock + 1n);
}

// Count only the documented user-decrypt result envelope, never metadata/key fetches.
// No share, response signature, transport key or raw response is returned/logged.
export function kmsShareCount(body: unknown): number {
  if (!body || typeof body !== 'object' || !('result' in body)) return 0;
  const inner = body.result;
  if (!inner || typeof inner !== 'object' || !('result' in inner)) return 0;
  const shares = inner.result;
  if (!Array.isArray(shares) || shares.length === 0) return 0;
  return shares.every(
    (s: unknown) =>
      s &&
      typeof s === 'object' &&
      'payload' in s &&
      typeof s.payload === 'string' &&
      /^(0x)?[0-9a-fA-F]+$/.test(s.payload) &&
      'signature' in s &&
      typeof s.signature === 'string' &&
      /^(0x)?[0-9a-fA-F]{130}$/.test(s.signature) &&
      'extraData' in s &&
      typeof s.extraData === 'string' &&
      /^0x[0-9a-fA-F]*$/.test(s.extraData),
  )
    ? shares.length
    : 0;
}

export function assertRemoteDecryption(evidence: {
  score: bigint;
  backendAttempts: number;
  remotePosts: number;
  successfulResults: number;
  shares: number;
}) {
  assert.equal(evidence.score, 2n);
  assert.equal(evidence.backendAttempts, 1);
  assert.equal(evidence.remotePosts, 1);
  assert.equal(evidence.successfulResults, 1);
  assert.ok(evidence.shares > 0);
}
