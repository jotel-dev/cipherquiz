import assert from 'node:assert/strict';
import { Wallet } from 'ethers';
import { assertReviewedOperator } from './sepolia-policy';

// Offline check: no provider, RPC, approval flag or transaction API.
try {
  assertReviewedOperator(process.env.CIPHERQUIZ_OPERATOR_ADDRESS ?? '');
  const key = process.env.CIPHERQUIZ_OPERATOR_PRIVATE_KEY ?? '';
  assert.match(key, /^0x[0-9a-fA-F]{64}$/);
  const wallet = new Wallet(key);
  assertReviewedOperator(wallet.address);
  console.info(
    JSON.stringify({
      status: 'reviewed-signer-matched',
      address: wallet.address,
    }),
  );
} catch {
  console.error(
    'Signer verification failed: configure the reviewed operator locally; signing details suppressed.',
  );
  process.exitCode = 1;
}
