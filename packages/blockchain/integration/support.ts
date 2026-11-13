import assert from 'node:assert/strict';
import { getAddress, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  AGGREGATE_CAP_WEI,
  MAX_FEE_PER_GAS_WEI,
  assertReviewedOperator,
} from '../../../contracts/scripts/sepolia-policy.js';
import {
  assertReviewedDeployment,
  integrationCeilings,
} from './reviewed-deployment.js';
import { verifyPlayerSigner } from './player.js';

export function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (!value)
    throw new Error(`Missing ${name}; see docs/sepolia-integration.md`);
  return value;
}

export function readSettings(env: NodeJS.ProcessEnv) {
  assert.equal(
    env.CIPHERQUIZ_SEPOLIA_TEST,
    'approved',
    'Set CIPHERQUIZ_SEPOLIA_TEST=approved only for an authorized live test',
  );
  return readIntegrationConfig(env);
}

// Shared offline validation. This does not grant approval or invoke a wallet/SDK.
export function readIntegrationConfig(env: NodeJS.ProcessEnv) {
  const rpc = required(env, 'SEPOLIA_RPC_URL');
  assert.equal(new URL(rpc).protocol, 'https:', 'Sepolia RPC must use HTTPS');
  const address = getAddress(required(env, 'CIPHERQUIZ_SEPOLIA_ADDRESS'));
  assertReviewedDeployment(address);
  function key(name: string): Hex {
    const value = required(env, name);
    assert.match(value, /^0x[0-9a-fA-F]{64}$/, `Invalid ${name} format`);
    return value as Hex;
  }
  function positive(name: string) {
    const value = required(env, name);
    assert.match(
      value,
      /^[1-9][0-9]*$/,
      `${name} must be positive integer wei`,
    );
    return BigInt(value);
  }
  const operatorKey = key('CIPHERQUIZ_OPERATOR_PRIVATE_KEY');
  const playerKey = key('CIPHERQUIZ_PLAYER_PRIVATE_KEY');
  assertReviewedOperator(required(env, 'CIPHERQUIZ_OPERATOR_ADDRESS'));
  // Validate scalar range and role separation before any network requests.
  assert.notEqual(
    privateKeyToAccount(operatorKey).address,
    privateKeyToAccount(playerKey).address,
    'Operator and player must differ',
  );
  verifyPlayerSigner(playerKey, required(env, 'CIPHERQUIZ_PLAYER_ADDRESS'));
  const totalGasBudget = positive('CIPHERQUIZ_MAX_TOTAL_GAS_COST_WEI');
  const maxFeePerGas = positive('CIPHERQUIZ_MAX_FEE_PER_GAS_WEI');
  assert.ok(
    maxFeePerGas <= MAX_FEE_PER_GAS_WEI,
    'Reviewed fee ceiling exceeded',
  );
  assert.ok(
    totalGasBudget <= AGGREGATE_CAP_WEI,
    'Invocation budget exceeds aggregate cap',
  );
  assert.ok(
    totalGasBudget >= integrationCeilings(maxFeePerGas).total,
    'Invocation budget cannot cover the complete three-write ceiling',
  );
  return {
    rpc,
    address,
    operatorKey,
    playerKey,
    maxFeePerGas,
    totalGasBudget,
  };
}

export function packAnswer(roundId: bigint, index: number, choice: bigint) {
  assert.ok(
    roundId > 0n && roundId <= (1n << 48n) - 1n,
    'Round context out of range',
  );
  assert.ok(
    Number.isInteger(index) && index >= 0 && index < 10,
    'Question index out of range',
  );
  assert.ok(choice >= 0n && choice < 4n, 'Choice out of range');
  return (roundId << 16n) | (BigInt(index) << 8n) | choice;
}

export function isAclDenial(error: unknown): boolean {
  // Require the specific SDK ACL error, including through documented cause chains.
  // A timeout, failed signature, generic DECRYPTION_FAILED or HTTP 403 is insufficient.
  const seen = new Set<unknown>();
  let current = error;
  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current);
    if ('name' in current && current.name === 'AclUserDecryptionError')
      return true;
    current = 'cause' in current ? current.cause : undefined;
  }
  return false;
}

export function maskImmutables(
  code: Hex,
  references: Record<string, { start: number; length: number }[]>,
) {
  const bytes = Buffer.from(code.slice(2), 'hex');
  for (const ranges of Object.values(references)) {
    for (const { start, length } of ranges) {
      assert.ok(
        start >= 0 && length > 0 && start + length <= bytes.length,
        'Invalid immutable range',
      );
      bytes.fill(0, start, start + length);
    }
  }
  return bytes.toString('hex');
}
