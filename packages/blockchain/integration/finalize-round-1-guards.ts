import assert from 'node:assert/strict';
import { encodeFunctionData, getAddress, type Hex } from 'viem';
import { SCORING_ADDRESS, scoringAbi } from './reviewed-deployment.js';

export const FINALIZE_DATA = encodeFunctionData({
  abi: scoringAbi,
  functionName: 'finalizeRound',
  args: [1n],
});
export const FINALIZE_MAX_COST = 1500000000000000n;
export const PRE_FINALIZE_REMAINING = 18295003600000000n;

export function assertFinalizationTransaction(tx: {
  chainId: number;
  to: string;
  data: Hex;
  value: bigint;
  nonce: number;
  gas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
}) {
  assert.equal(tx.chainId, 11155111);
  assert.equal(getAddress(tx.to), SCORING_ADDRESS);
  assert.equal(tx.data, FINALIZE_DATA);
  assert.equal(tx.value, 0n);
  assert.equal(tx.nonce, 2);
  assert.ok(tx.gas > 0n && tx.gas <= 15000000n);
  assert.ok(tx.maxFeePerGas > 0n && tx.maxFeePerGas <= 100000000n);
  assert.ok(
    tx.maxPriorityFeePerGas >= 0n && tx.maxPriorityFeePerGas <= tx.maxFeePerGas,
  );
  assert.ok(tx.gas * tx.maxFeePerGas <= FINALIZE_MAX_COST);
}
