import { Wallet } from 'ethers';
import { assertReviewedOperator } from './sepolia-policy';

// Offline check: no provider, RPC, approval flag or transaction API.
try {
  assertReviewedOperator(process.env.CIPHERQUIZ_OPERATOR_ADDRESS ?? '');
  const wallet = new Wallet(process.env.CIPHERQUIZ_OPERATOR_PRIVATE_KEY ?? '');
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
