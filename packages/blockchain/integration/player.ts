import assert from 'node:assert/strict';
import { getAddress, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { REVIEWED_OPERATOR } from '../../../contracts/scripts/sepolia-policy.js';

export function assertPlayerAddress(value: string): Address {
  const address = getAddress(value);
  assert.notEqual(address, '0x0000000000000000000000000000000000000000');
  assert.notEqual(
    address,
    REVIEWED_OPERATOR,
    'Player must differ from operator',
  );
  return address;
}

// Derives an address offline; never connects a signer or signs a message.
export function verifyPlayerSigner(
  key: string,
  expectedAddress: string,
): Address {
  try {
    assert.ok(/^0x[0-9a-fA-F]{64}$/.test(key));
    const expected = assertPlayerAddress(expectedAddress);
    const actual = privateKeyToAccount(key as `0x${string}`).address;
    assert.equal(actual, expected);
    return actual;
  } catch {
    // Do not retain lower-level errors that might contain signing material.
    throw new Error('Player signer/public address verification failed');
  }
}

export function playerFundingReadiness(
  latestBalance: bigint,
  finalizedBalance: bigint,
  requiredFee: bigint,
) {
  assert.ok(latestBalance >= 0n && finalizedBalance >= 0n && requiredFee > 0n);
  return {
    sufficientLatestBalance: latestBalance >= requiredFee,
    sufficientFinalizedBalance: finalizedBalance >= requiredFee,
    shortfallWei:
      latestBalance < requiredFee ? requiredFee - latestBalance : 0n,
  };
}
