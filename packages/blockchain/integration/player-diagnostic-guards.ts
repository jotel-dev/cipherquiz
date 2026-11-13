import assert from 'node:assert/strict';
import { getAddress } from 'viem';
import { SCORING_ADDRESS } from './reviewed-deployment.js';

export const DIAGNOSTIC_PLAYER = '0xc0a50A4E032b19c905509E8f5EFD35fC7EA82D49';
export const PERMIT_SECONDS = 86400;
export const DECRYPTION_VERIFIER = '0x5D8BD78e2ea6bbE41f26dFe9fdaEAa349e077478';

export function onceOnly() {
  let consumed = false;
  return () => {
    assert.ok(!consumed, 'Diagnostic operation already attempted');
    consumed = true; // A failed attempt also consumes authorization.
  };
}

export function assertReadOnlyRpc(method: string) {
  assert.ok(
    new Set([
      'eth_chainId',
      'eth_blockNumber',
      'eth_call',
      'eth_getCode',
      'eth_getStorageAt',
      'eth_getBlockByNumber',
      'eth_getBalance',
      'eth_getTransactionCount',
      'eth_getTransactionReceipt',
      'eth_getLogs',
    ]).has(method),
    'Diagnostic RPC method prohibited',
  );
}

// Validate the complete signing schema, not just a message's contract field.
// Never include rejected data in an error message.
export function assertDiagnosticPermit(value: unknown, now: number) {
  const data = value as {
    domain: Record<string, unknown>;
    primaryType: string;
    types: Record<string, { name: string; type: string }[]>;
    message: Record<string, unknown>;
  };
  assert.equal(data.primaryType, 'UserDecryptRequestVerification');
  assert.equal(data.domain.name, 'Decryption');
  assert.equal(data.domain.version, '1');
  assert.deepEqual(Object.keys(data.domain).sort(), [
    'chainId',
    'name',
    'verifyingContract',
    'version',
  ]);
  assert.equal(BigInt(data.domain.chainId as number), 11155111n);
  assert.equal(
    getAddress(data.domain.verifyingContract as string),
    DECRYPTION_VERIFIER,
  );
  const m = data.message;
  const v2 = 'durationSeconds' in m;
  const fields = v2
    ? [
        ['userAddress', 'address'],
        ['publicKey', 'bytes'],
        ['allowedContracts', 'address[]'],
        ['startTimestamp', 'uint256'],
        ['durationSeconds', 'uint256'],
        ['extraData', 'bytes'],
      ]
    : [
        ['publicKey', 'bytes'],
        ['contractAddresses', 'address[]'],
        ['startTimestamp', 'uint256'],
        ['durationDays', 'uint256'],
        ['extraData', 'bytes'],
      ];
  assert.deepEqual(
    data.types[data.primaryType],
    fields.map(([name, type]) => ({ name, type })),
  );
  assert.ok(
    Object.keys(data.types).every(
      (k) => k === data.primaryType || k === 'EIP712Domain',
    ),
  );
  if (data.types.EIP712Domain)
    assert.deepEqual(data.types.EIP712Domain, [
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' },
    ]);
  assert.deepEqual(Object.keys(m).sort(), fields.map(([n]) => n).sort());
  const addresses = m[v2 ? 'allowedContracts' : 'contractAddresses'];
  assert.ok(Array.isArray(addresses));
  assert.deepEqual(
    addresses.map((a: string) => getAddress(a)),
    [SCORING_ADDRESS],
  );
  if (v2) assert.equal(getAddress(m.userAddress as string), DIAGNOSTIC_PLAYER);
  assert.equal(
    BigInt(m[v2 ? 'durationSeconds' : 'durationDays'] as bigint),
    v2 ? BigInt(PERMIT_SECONDS) : 1n,
  );
  const start = Number(m.startTimestamp);
  assert.ok(Number.isSafeInteger(start) && Math.abs(start - now) <= 120);
  assert.match(m.publicKey as string, /^0x[0-9a-fA-F]+$/);
  assert.match(m.extraData as string, /^0x[0-9a-fA-F]*$/);
}
