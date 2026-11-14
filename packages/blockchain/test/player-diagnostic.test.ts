import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { NotEntitledError } from '@zama-fhe/sdk';
import {
  assertDiagnosticPermit,
  assertReadOnlyRpc,
  DECRYPTION_VERIFIER,
  DIAGNOSTIC_PLAYER,
  onceOnly,
} from '../integration/player-diagnostic-guards.js';
import { SCORING_ADDRESS } from '../integration/reviewed-deployment.js';
import { isAclDenial } from '../integration/support.js';

function permit(v2 = false) {
  const message = v2
    ? {
        userAddress: DIAGNOSTIC_PLAYER,
        publicKey: '0x1234',
        allowedContracts: [SCORING_ADDRESS],
        startTimestamp: 1000n,
        durationSeconds: 86400n,
        extraData: '0x',
      }
    : {
        publicKey: '0x1234',
        contractAddresses: [SCORING_ADDRESS],
        startTimestamp: 1000n,
        durationDays: 1n,
        extraData: '0x',
      };
  return {
    domain: {
      name: 'Decryption',
      version: '1',
      chainId: 11155111,
      verifyingContract: DECRYPTION_VERIFIER,
    },
    primaryType: 'UserDecryptRequestVerification',
    types: {
      UserDecryptRequestVerification: Object.keys(message).map((name) => ({
        name,
        type:
          name === 'userAddress'
            ? 'address'
            : name === 'publicKey' || name === 'extraData'
              ? 'bytes'
              : name.endsWith('Contracts') || name === 'contractAddresses'
                ? 'address[]'
                : 'uint256',
      })),
    },
    message,
  };
}

test('player diagnostic accepts only the exact contract, chain, actor and one-day permit schemas', () => {
  for (const v2 of [false, true]) {
    assert.doesNotThrow(() => assertDiagnosticPermit(permit(v2), 1000));
    for (const alter of [
      (p: ReturnType<typeof permit>) => (p.domain.chainId = 1),
      (p: ReturnType<typeof permit>) => (p.domain.name = 'Permit'),
      (p: ReturnType<typeof permit>) => (p.primaryType = 'Permit'),
      (p: ReturnType<typeof permit>) =>
        (p.types.UserDecryptRequestVerification[0]!.type = 'uint256'),
      (p: ReturnType<typeof permit>) => (p.message.startTimestamp = 0n),
    ]) {
      const p = permit(v2);
      alter(p);
      assert.throws(() => assertDiagnosticPermit(p, 1000));
    }
  }
  for (const message of [
    { ...permit(true).message, allowedContracts: [] },
    {
      ...permit(true).message,
      allowedContracts: [SCORING_ADDRESS, DIAGNOSTIC_PLAYER],
    },
    { ...permit(true).message, userAddress: SCORING_ADDRESS },
    { ...permit(true).message, durationSeconds: 2592000n },
    { ...permit(false).message, durationDays: 0n },
  ])
    assert.throws(() =>
      assertDiagnosticPermit(
        { ...permit('durationSeconds' in message), message },
        1000,
      ),
    );
});

test('diagnostic guards consume failed attempts and exclude all signing/write RPC methods', () => {
  const consume = onceOnly();
  consume();
  assert.throws(consume);
  for (const method of ['eth_call', 'eth_chainId', 'eth_getCode'])
    assert.doesNotThrow(() => assertReadOnlyRpc(method));
  for (const method of [
    'eth_sendRawTransaction',
    'eth_sendTransaction',
    'eth_sign',
    'eth_signTypedData_v4',
    'personal_sign',
    'wallet_sendCalls',
  ])
    assert.throws(() => assertReadOnlyRpc(method));
});

test('installed SDK actor denial is recognized despite the underlying base name and is bound to the requested ciphertext', () => {
  // Pure error constructors only: no SDK instance, provider, permit or signature.
  // This pinned internal import verifies the installed implementation, rather
  // than inventing a synthetic .name that the real SDK never exposes.
  const require = createRequire(import.meta.url);
  const root = dirname(require.resolve('@fhevm/sdk/package.json'));
  const { AclUserDecryptionError } = require(
    join(root, '_cjs/core/errors/AclError.js'),
  ) as {
    AclUserDecryptionError: new (args: {
      contractAddress: string;
      message: string;
    }) => Error;
  };
  const aclError = new AclUserDecryptionError({
    contractAddress: '0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D',
    message: 'Offline actor ACL denial fixture',
  });
  assert.equal(aclError.name, 'FhevmErrorBase');
  assert.ok(aclError instanceof AclUserDecryptionError);
  const error = new NotEntitledError(
    {
      encryptedValue: `0x${'01'.repeat(32)}`,
      contractAddress: SCORING_ADDRESS,
      account: DIAGNOSTIC_PLAYER,
    },
    { cause: aclError },
  );
  assert.equal(error.code, 'NOT_ENTITLED');
  const expected = {
    account: DIAGNOSTIC_PLAYER,
    contractAddress: SCORING_ADDRESS,
    encryptedValue: `0x${'01'.repeat(32)}`,
  };
  assert.equal(isAclDenial(error, expected), true);
  assert.equal(
    isAclDenial(new Error('wrapper', { cause: error }), expected),
    true,
  );
  error.name = 'SomeOtherRuntimeName';
  assert.equal(isAclDenial(error, expected), true);
  for (const mismatch of [
    { account: SCORING_ADDRESS },
    { contractAddress: DIAGNOSTIC_PLAYER },
    { encryptedValue: `0x${'02'.repeat(32)}` },
    { account: 'invalid' },
  ])
    assert.equal(isAclDenial(error, { ...expected, ...mismatch }), false);
  assert.equal(isAclDenial(aclError, expected), false);
  assert.equal(
    isAclDenial({ ...error, code: 'NOT_ENTITLED' }, expected),
    false,
  );
});
