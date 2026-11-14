import assert from 'node:assert/strict';
import { getAddress, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { NotEntitledError } from '@zama-fhe/sdk';
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

export function isAclDenial(
  error: unknown,
  expected?: {
    account: string;
    contractAddress: string;
    encryptedValue: string;
  },
): boolean {
  // SDK 3.7.2 wraps actor ACL rejection in this public typed error. The lower
  // SDK's .name is FhevmErrorBase even for its ACL subclass; never rely on it.
  // Generic errors, a bare code, HTTP denial and transport failures are insufficient.
  const seen = new Set<unknown>();
  let current = error;
  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current);
    if (
      current instanceof NotEntitledError &&
      current.code === 'NOT_ENTITLED'
    ) {
      if (!expected) return true;
      try {
        return (
          getAddress(current.account) === getAddress(expected.account) &&
          getAddress(current.contractAddress) ===
            getAddress(expected.contractAddress) &&
          current.encryptedValue.toLowerCase() ===
            expected.encryptedValue.toLowerCase()
        );
      } catch {
        return false;
      }
    }
    current = 'cause' in current ? current.cause : undefined;
  }
  return false;
}

// Emit only fixed identifiers: SDK messages, metadata and request bodies can be sensitive.
// This is diagnostic evidence only; it does not decide whether denial tests pass.
export function diagnosticErrorTypes(error: unknown): string[] {
  const permitted = new Set([
    'AssertionError',
    'ERR_ASSERTION',
    'AbortError',
    'TimeoutError',
    'AclUserDecryptionError',
    'NotEntitledError',
    'NOT_ENTITLED',
    'DecryptionFailedError',
    'DECRYPTION_FAILED',
    'NoCiphertextError',
    'RelayerRequestFailedError',
    'RpcRateLimitError',
    'SigningFailedError',
    'SigningRejectedError',
    'RevokedKmsContextError',
    'InvalidTransportKeyPairError',
  ]);
  const result = new Set<string>();
  const seen = new Set<unknown>();
  let current = error;
  while (
    current &&
    typeof current === 'object' &&
    !seen.has(current) &&
    seen.size < 12
  ) {
    seen.add(current);
    const fields = current as Record<string, unknown>;
    for (const field of ['name', 'code'] as const) {
      const value = fields[field];
      if (typeof value === 'string' && permitted.has(value)) result.add(value);
    }
    current = 'cause' in current ? current.cause : undefined;
  }
  return [...result];
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
