import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  assertFinalizationTransaction,
  FINALIZE_DATA,
} from '../integration/finalize-round-1-guards.js';
import { SCORING_ADDRESS } from '../integration/reviewed-deployment.js';

test('round 1 recovery rejects different calldata, target, chain, nonce, value and fee limits', () => {
  const tx = {
    chainId: 11155111,
    to: SCORING_ADDRESS,
    data: FINALIZE_DATA,
    value: 0n,
    nonce: 2,
    gas: 100000n,
    maxFeePerGas: 100000000n,
    maxPriorityFeePerGas: 2n,
  };
  assert.doesNotThrow(() => assertFinalizationTransaction(tx));
  for (const change of [
    { chainId: 1 },
    { to: '0xbE4a3DAABCd4406e75314aC7324411249E0C36a2' },
    { data: '0x' as const },
    { data: `${FINALIZE_DATA.slice(0, -1)}2` as `0x${string}` },
    { value: 1n },
    { nonce: 3 },
    { gas: 15000001n },
    { maxFeePerGas: 100000001n },
    { maxPriorityFeePerGas: 100000001n },
  ])
    assert.throws(() => assertFinalizationTransaction({ ...tx, ...change }));
});
