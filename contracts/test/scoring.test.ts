import assert from 'node:assert/strict';
import { ethers, fhevm } from 'hardhat';
import { FhevmType, type FhevmTypeEuint } from '@fhevm/hardhat-plugin';
import type { BaseContract } from 'ethers';

type Signer = Awaited<ReturnType<typeof ethers.getSigners>>[number];

describe('encrypted scoring (official FHEVM local environment)', function () {
  this.timeout(120_000);
  let contract: BaseContract;
  let operator: Signer;
  let player: Signer;
  let stranger: Signer;
  let address: string;
  let deadline: number;
  const contentHash = ethers.id('dummy public question set v1');

  // Hardhat can omit custom-error names from messages after recompilation.
  // Assert the ABI selector in revert data instead of its formatted message.
  function customError(name: string) {
    return (error: unknown) => {
      assert.equal(
        (error as { data: string }).data,
        contract.interface.getError(name)!.selector,
      );
      return true;
    };
  }

  async function encrypt(values: bigint[], signer = player, target = address) {
    const input = fhevm.createEncryptedInput(target, signer.address);
    for (const value of values) input.add64(value);
    return input.encrypt();
  }

  async function send(signer: Signer, method: string, ...args: unknown[]) {
    const tx = await contract.connect(signer).getFunction(method)(...args);
    return tx.wait();
  }

  async function open(keys = [0n, 1n, 2n, 3n], who = player) {
    const id: bigint = await contract.getFunction('nextRoundId')();
    const encrypted = await encrypt(keys, operator);
    await send(
      operator,
      'createRound',
      who.address,
      deadline,
      contentHash,
      encrypted.handles,
      encrypted.inputProof,
    );
    return id;
  }

  function encode(id: bigint, choices: bigint[]) {
    return choices.map((choice, i) => (id << 16n) | (BigInt(i) << 8n) | choice);
  }

  async function submit(id: bigint, choices: bigint[]) {
    const input = await encrypt(encode(id, choices));
    await send(player, 'submitAnswers', id, input.handles, input.inputProof);
    return input;
  }

  async function round(id: bigint) {
    return contract.getFunction('getRound')(id);
  }

  async function decrypt(id: bigint, signer = player) {
    return fhevm.userDecryptEuint(
      FhevmType.euint8,
      (await round(id)).score,
      address,
      signer,
    );
  }

  async function denied(
    handle: string,
    type: FhevmTypeEuint = FhevmType.euint8,
    signer = stranger,
  ) {
    await assert.rejects(
      fhevm.userDecryptEuint(type, handle, address, signer),
      /not authorized|not allowed/i,
    );
  }

  beforeEach(async function () {
    assert.equal(
      fhevm.isMock,
      true,
      'This suite requires the local FHEVM plugin',
    );
    const signers = await ethers.getSigners();
    operator = signers[0]!;
    player = signers[1]!;
    stranger = signers[2]!;
    contract = await (
      await ethers.getContractFactory('CipherQuizScoring')
    ).deploy(operator.address);
    await contract.waitForDeployment();
    address = await contract.getAddress();
    deadline = (await ethers.provider.getBlock('latest'))!.timestamp + 3600;
  });

  it('authorizes only the immutable operator and validates public setup', async function () {
    await assert.rejects(
      (await ethers.getContractFactory('CipherQuizScoring')).deploy(
        ethers.ZeroAddress,
      ),
      customError('InvalidSetup'),
    );
    const input = await encrypt([0n], operator);
    await assert.rejects(
      send(
        stranger,
        'createRound',
        player.address,
        deadline,
        contentHash,
        input.handles,
        input.inputProof,
      ),
      customError('Unauthorized'),
    );
    for (const [who, time, hash, handles] of [
      [ethers.ZeroAddress, deadline, contentHash, input.handles],
      [player.address, 1, contentHash, input.handles],
      [player.address, deadline, ethers.ZeroHash, input.handles],
      [player.address, deadline, contentHash, []],
      [player.address, deadline, contentHash, Array(11).fill(input.handles[0])],
    ]) {
      await assert.rejects(
        send(
          operator,
          'createRound',
          who,
          time,
          hash,
          handles,
          input.inputProof,
        ),
        customError('InvalidSetup'),
      );
    }
    const id = await open();
    const data = await round(id);
    assert.equal(data.player, player.address);
    assert.equal(data.deadline, BigInt(deadline));
    assert.equal(data.contentHash, contentHash);
    assert.equal(data.state, 1n);
    assert.equal(data.questionCount, 4n);
    assert.equal(await contract.getFunction('OPERATOR')(), operator.address);
    await assert.rejects(round(999n), customError('InvalidRound'));
  });

  for (const [name, choices, expected] of [
    ['correct answers', [0n, 1n, 2n, 3n], 4n],
    ['incorrect answers', [1n, 2n, 3n, 0n], 0n],
    ['multiple contributions', [0n, 2n, 2n, 0n], 2n],
    ['out-of-range choices', [4n, 255n, 2n, 3n], 2n],
  ] as const) {
    it(`computes ${name} using FHE comparisons and encrypted addition`, async function () {
      const id = await open();
      await submit(id, [...choices]);
      assert.equal((await round(id)).state, 2n);
      await send(player, 'finalizeRound', id);
      assert.equal(await decrypt(id), expected);
      assert.equal((await round(id)).state, 3n);
    });
  }

  it('rejects duplicate submissions, partial batches, and unauthorized operations', async function () {
    const id = await open();
    const input = await encrypt(encode(id, [0n, 1n, 2n, 3n]));
    await assert.rejects(
      send(stranger, 'submitAnswers', id, input.handles, input.inputProof),
      customError('Unauthorized'),
    );
    await assert.rejects(
      send(stranger, 'finalizeRound', id),
      customError('Unauthorized'),
    );
    await assert.rejects(
      send(
        player,
        'submitAnswers',
        id,
        input.handles.slice(1),
        input.inputProof,
      ),
      customError('InvalidSetup'),
    );
    await send(player, 'submitAnswers', id, input.handles, input.inputProof);
    await assert.rejects(
      send(player, 'submitAnswers', id, input.handles, input.inputProof),
      customError('InvalidState'),
    );
    await send(operator, 'finalizeRound', id);
    await assert.rejects(
      send(player, 'finalizeRound', id),
      customError('InvalidState'),
    );
    await assert.rejects(
      send(player, 'submitAnswers', id, input.handles, input.inputProof),
      customError('InvalidState'),
    );
  });

  it('validates proof integrity, handle membership, sender and contract binding', async function () {
    const id = await open([0n]);
    const valid = await encrypt(encode(id, [0n]));
    const foreign = await encrypt(encode(id, [0n]));
    const wrongSender = await encrypt(encode(id, [0n]), stranger);
    const wrongContract = await encrypt(
      encode(id, [0n]),
      player,
      stranger.address,
    );
    for (const [handles, proof] of [
      [valid.handles, '0x'],
      [valid.handles, '0x1234'],
      [foreign.handles, valid.inputProof],
      [wrongSender.handles, wrongSender.inputProof],
      [wrongContract.handles, wrongContract.inputProof],
    ]) {
      await assert.rejects(send(player, 'submitAnswers', id, handles, proof));
      assert.equal(
        (await round(id)).state,
        1n,
        'failed proofs must roll back state',
      );
    }
    await send(player, 'submitAnswers', id, valid.handles, valid.inputProof);
    await send(player, 'finalizeRound', id);
    assert.equal(await decrypt(id), 1n);
    await assert.rejects(
      send(
        operator,
        'createRound',
        player.address,
        deadline,
        contentHash,
        foreign.handles,
        '0x1234',
      ),
    );
  });

  it('rejects consumed handles across rounds and rolls back replay failures', async function () {
    const first = await open([0n]);
    const second = await open([0n]);
    const input = await submit(first, [0n]);
    await assert.rejects(
      send(player, 'submitAnswers', second, input.handles, input.inputProof),
      customError('InputAlreadyUsed'),
    );
    assert.equal((await round(second)).state, 1n);
    await submit(second, [0n]);
    await send(player, 'finalizeRound', second);
    assert.equal(await decrypt(second), 1n);
  });

  it('binds fresh ciphertexts to round and question position without leaking validity', async function () {
    const first = await open([0n, 0n]);
    const second = await open([0n, 0n]);
    const wrongRound = await encrypt(encode(first, [0n, 0n]));
    await send(
      player,
      'submitAnswers',
      second,
      wrongRound.handles,
      wrongRound.inputProof,
    );
    await send(player, 'finalizeRound', second);
    assert.equal(await decrypt(second), 0n);
    const swapped = await encrypt(encode(first, [0n, 0n]).reverse());
    await send(
      player,
      'submitAnswers',
      first,
      swapped.handles,
      swapped.inputProof,
    );
    await send(player, 'finalizeRound', first);
    assert.equal(await decrypt(first), 0n);
  });

  it('enforces the exact deadline and finalizes expired unsubmitted rounds as zero', async function () {
    const id = await open([0n]);
    await assert.rejects(
      send(player, 'finalizeRound', id),
      customError('NotCompleted'),
    );
    const input = await encrypt(encode(id, [0n]));
    await ethers.provider.send('evm_setNextBlockTimestamp', [deadline]);
    await ethers.provider.send('evm_mine', []);
    await assert.rejects(
      send(player, 'submitAnswers', id, input.handles, input.inputProof),
      customError('DeadlinePassed'),
    );
    await send(player, 'finalizeRound', id);
    assert.equal(await decrypt(id), 0n);
    await assert.rejects(
      send(operator, 'finalizeRound', id),
      customError('InvalidState'),
    );
  });

  it('keeps scores private before finalization and denies other users afterwards', async function () {
    const id = await open([0n]);
    const input = await submit(id, [0n]);
    const score: string = (await round(id)).score;
    await denied(score, FhevmType.euint8, player);
    await denied(score, FhevmType.euint8, operator);
    await denied(score);
    const key: string = await contract.getFunction('getKeyHandle')(id, 0);
    const { ACLAddress } = await fhevm.getCoprocessorConfig(address);
    const acl = new ethers.Contract(
      ACLAddress,
      [
        'function persistAllowed(bytes32 handle, address account) view returns (bool)',
      ],
      ethers.provider,
    );
    assert.equal(await acl.getFunction('persistAllowed')(key, address), true);
    assert.equal(await acl.getFunction('persistAllowed')(score, address), true);
    assert.equal(
      await acl.getFunction('persistAllowed')(score, player.address),
      false,
    );
    await denied(key, FhevmType.euint64, player);
    await denied(key, FhevmType.euint64, stranger);
    // The submitter already knows their answer. No permanent ACL is granted to it.
    await denied(
      ethers.hexlify(input.handles[0]!),
      FhevmType.euint64,
      stranger,
    );
    await send(operator, 'finalizeRound', id);
    assert.equal(await decrypt(id), 1n);
    assert.equal(
      await acl.getFunction('persistAllowed')(score, player.address),
      true,
    );
    await denied(score);
    await denied(score, FhevmType.euint8, operator);
    await denied(key, FhevmType.euint64, player);
    await assert.rejects(
      fhevm.publicDecryptEuint(FhevmType.euint8, score),
      /not authorized|not allowed/i,
    );
  });

  it('rejects duplicate handles within a batch without consuming the valid input', async function () {
    const id = await open([0n, 0n]);
    const input = await encrypt(encode(id, [0n, 0n]));
    await assert.rejects(
      send(
        player,
        'submitAnswers',
        id,
        [input.handles[0], input.handles[0]],
        input.inputProof,
      ),
      customError('InputAlreadyUsed'),
    );
    assert.equal(
      await contract.getFunction('usedInputs')(input.handles[0]),
      false,
    );
    await send(player, 'submitAnswers', id, input.handles, input.inputProof);
    await ethers.provider.send('evm_setNextBlockTimestamp', [deadline + 1]);
    await ethers.provider.send('evm_mine', []);
    await send(operator, 'finalizeRound', id);
    assert.equal(
      await decrypt(id),
      2n,
      'late finalization preserves a timely submission',
    );
  });

  it('scores invalid operator keys as zero and caps a ten-question score at ten', async function () {
    const invalid = await open([4n, (1n << 64n) - 1n]);
    await submit(invalid, [4n, 3n]);
    await send(player, 'finalizeRound', invalid);
    assert.equal(await decrypt(invalid), 0n);
    const keys = Array<bigint>(10).fill(2n);
    const id = await open(keys);
    const input = await encrypt(encode(id, keys));
    const receipt = await send(
      player,
      'submitAnswers',
      id,
      input.handles,
      input.inputProof,
    );
    assert.ok(receipt);
    const hcu = fhevm.computeTransactionHCU(receipt);
    console.info('Ten-question mock scoring:', {
      gas: receipt.gasUsed.toString(),
      globalHCU: hcu.globalHCU,
      maxHCUDepth: hcu.maxHCUDepth,
    });
    await send(player, 'finalizeRound', id);
    assert.equal(await decrypt(id), 10n);
  });
});
