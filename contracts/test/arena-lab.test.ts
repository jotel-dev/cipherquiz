import assert from 'node:assert/strict';
import { ethers, fhevm, network } from 'hardhat';
import { FhevmType } from '@fhevm/hardhat-plugin';
import type { BaseContract } from 'ethers';

type Signer = Awaited<ReturnType<typeof ethers.getSigners>>[number];

describe('Hidden Score Arena local FHE lifecycle and comparison', function () {
  this.timeout(180000);
  let arena: BaseContract, consumer: BaseContract;
  let operator: Signer, a: Signer, b: Signer, stranger: Signer;
  let address: string, consumerAddress: string;
  let joinDeadline: number;
  const contentHash = ethers.id(
    'ten ordered dummy questions / arena policy v1',
  );

  async function send(
    c: BaseContract,
    signer: Signer,
    method: string,
    ...args: unknown[]
  ) {
    return (await c.connect(signer).getFunction(method)(...args)).wait();
  }
  function error(name: string, c = arena) {
    return (value: unknown) => {
      assert.equal(
        (value as { data: string }).data,
        c.interface.getError(name)!.selector,
      );
      return true;
    };
  }
  async function encrypt(values: bigint[], signer: Signer, target = address) {
    const input = fhevm.createEncryptedInput(target, signer.address);
    for (const value of values) input.add64(value);
    return input.encrypt();
  }
  async function open(keys = Array<bigint>(10).fill(0n)) {
    const id: bigint = await arena.getFunction('nextRoundId')();
    const input = await encrypt(keys, operator);
    await send(
      arena,
      operator,
      'createRound',
      [a.address, b.address],
      joinDeadline,
      120,
      contentHash,
      input.handles,
      input.inputProof,
    );
    return id;
  }
  async function active() {
    const id = await open();
    await send(arena, a, 'joinRound', id);
    await send(arena, b, 'joinRound', id);
    return id;
  }
  async function round(id: bigint) {
    return arena.getFunction('getRound')(id);
  }
  function encode(id: bigint, seat: number, correct: number) {
    return Array.from(
      { length: 10 },
      (_, i) =>
        (id << 17n) |
        (BigInt(seat) << 16n) |
        (BigInt(i) << 8n) |
        (i < correct ? 0n : 1n),
    );
  }
  async function submit(
    id: bigint,
    seat: number,
    correct: number,
    values = encode(id, seat, correct),
  ) {
    const who = seat === 0 ? a : b;
    const input = await encrypt(values, who);
    const receipt = await send(
      arena,
      who,
      'submitAnswers',
      id,
      input.handles,
      input.inputProof,
    );
    return { input, receipt };
  }
  async function decrypt(
    handle: string,
    who: Signer,
    target = address,
    wide = false,
  ) {
    return fhevm.userDecryptEuint(
      wide ? FhevmType.euint64 : FhevmType.euint8,
      handle,
      target,
      who,
    );
  }
  async function denied(
    handle: string,
    who: Signer,
    target = address,
    wide = false,
  ) {
    await assert.rejects(
      decrypt(handle, who, target, wide),
      /not authorized|not allowed/i,
    );
  }
  async function jump(timestamp: bigint | number) {
    await ethers.provider.send('evm_setNextBlockTimestamp', [
      Number(timestamp),
    ]);
    await ethers.provider.send('evm_mine', []);
  }
  async function entitlement(id: bigint, expected: readonly bigint[]) {
    await send(consumer, stranger, 'record', id);
    for (const [seat, who] of [a, b].entries()) {
      const handle = await consumer.getFunction('units')(id, seat);
      assert.equal(
        await decrypt(handle, who, consumerAddress, true),
        expected[seat],
      );
      await denied(handle, operator, consumerAddress, true);
      await denied(handle, seat === 0 ? b : a, consumerAddress, true);
    }
    assert.equal(
      expected[0]! + expected[1]!,
      2n,
      'symbolic equal-stake pot is conserved',
    );
    await assert.rejects(
      send(consumer, a, 'record', id),
      error('AlreadyRecorded', consumer),
    );
  }

  beforeEach(async function () {
    assert.equal(network.name, 'hardhat');
    assert.equal((await ethers.provider.getNetwork()).chainId, 31337n);
    assert.equal(
      fhevm.isMock,
      true,
      'Never run these fixtures on a live chain',
    );
    [operator, a, b, stranger] = (await ethers.getSigners()) as [
      Signer,
      Signer,
      Signer,
      Signer,
    ];
    consumer = await (
      await ethers.getContractFactory('ArenaEntitlementLab')
    ).deploy();
    await consumer.waitForDeployment();
    consumerAddress = await consumer.getAddress();
    arena = await (
      await ethers.getContractFactory('HiddenScoreArenaLab')
    ).deploy(operator.address, consumerAddress);
    await arena.waitForDeployment();
    address = await arena.getAddress();
    await send(consumer, operator, 'configureArena', address);
    joinDeadline = (await ethers.provider.getBlock('latest'))!.timestamp + 600;
  });

  for (const [scoreA, scoreB, outcome, shares] of [
    [10, 0, 1n, [2n, 0n]],
    [0, 10, 2n, [0n, 2n]],
    [2, 4, 2n, [0n, 2n]],
    [0, 0, 3n, [1n, 1n]],
    [10, 10, 3n, [1n, 1n]],
  ] as const) {
    it(`computes ${scoreA}/10 vs ${scoreB}/10 and encrypted outcome ${outcome} without a backend winner`, async function () {
      const id = await active();
      const first = await submit(id, 0, scoreA);
      await submit(id, 1, scoreB);
      const receipt = await send(arena, stranger, 'finalizeRound', id);
      const value = await round(id);
      assert.equal(value.state, 3n);
      assert.equal(await decrypt(value.scores[0], a), BigInt(scoreA));
      assert.equal(await decrypt(value.scores[1], b), BigInt(scoreB));
      assert.equal(await decrypt(value.outcome, a), outcome);
      assert.equal(await decrypt(value.outcome, b), outcome);
      await entitlement(id, shares);
      if (scoreA === 10 && scoreB === 0) {
        console.info('Arena local mock planning only:', {
          submitGas: first.receipt!.gasUsed.toString(),
          submitGlobalHCU: fhevm.computeTransactionHCU(first.receipt!)
            .globalHCU,
          submitDepth: fhevm.computeTransactionHCU(first.receipt!).maxHCUDepth,
          finalizeGas: receipt!.gasUsed.toString(),
          finalizeGlobalHCU: fhevm.computeTransactionHCU(receipt!).globalHCU,
          finalizeDepth: fhevm.computeTransactionHCU(receipt!).maxHCUDepth,
        });
      }
    });
  }

  it('restricts keys, scores, outcome and consumer ACL before and after finalization', async function () {
    const id = await active();
    await submit(id, 0, 7);
    let value = await round(id);
    for (const who of [a, b, operator, stranger]) {
      await denied(value.scores[0], who);
      await denied(value.answerKeys[0], who, address, true);
    }
    await assert.rejects(
      send(arena, a, 'shareFinalizedOutcome', id),
      error('Unauthorized'),
    );
    await assert.rejects(
      send(consumer, stranger, 'record', id),
      error('InvalidState'),
    );
    assert.equal(await consumer.getFunction('recorded')(id), false);
    await submit(id, 1, 8);
    await send(arena, stranger, 'finalizeRound', id);
    value = await round(id);
    await denied(value.scores[0], b);
    await denied(value.scores[1], a);
    for (const who of [operator, stranger]) {
      await denied(value.scores[0], who);
      await denied(value.scores[1], who);
      await denied(value.outcome, who);
    }
    for (const handle of [...value.scores, value.outcome]) {
      await assert.rejects(
        fhevm.publicDecryptEuint(FhevmType.euint8, handle),
        /not authorized|not allowed/i,
      );
    }
    await entitlement(id, [0n, 2n]);
    const { ACLAddress } = await fhevm.getCoprocessorConfig(address);
    const acl = new ethers.Contract(
      ACLAddress,
      ['function persistAllowed(bytes32,address) view returns (bool)'],
      ethers.provider,
    );
    assert.equal(
      await acl.getFunction('persistAllowed')(value.outcome, consumerAddress),
      false,
      'consumer receives transient outcome access only',
    );
    assert.equal(
      await acl.getFunction('persistAllowed')(value.scores[0], consumerAddress),
      false,
    );
    await denied(value.answerKeys[0], a, address, true);
  });

  it('freezes exactly ten keys/content and starts a common clock only when both seats join', async function () {
    const id = await open();
    const before = await round(id);
    assert.equal(before.state, 1n);
    assert.equal(before.deadline, 0n);
    assert.equal(before.answerKeys.length, 10);
    assert.equal(before.contentHash, contentHash);
    await assert.rejects(submit(id, 0, 10), error('InvalidState'));
    await assert.rejects(
      send(arena, stranger, 'joinRound', id),
      error('Unauthorized'),
    );
    await send(arena, a, 'joinRound', id);
    await assert.rejects(
      send(arena, a, 'joinRound', id),
      error('InvalidState'),
    );
    await send(arena, b, 'joinRound', id);
    const after = await round(id);
    assert.equal(after.state, 2n);
    assert.equal(
      after.deadline,
      BigInt((await ethers.provider.getBlock('latest'))!.timestamp + 120),
    );
    assert.deepEqual([...after.answerKeys], [...before.answerKeys]);
    assert.equal(after.contentHash, before.contentHash);
    await assert.rejects(
      send(consumer, operator, 'configureArena', address),
      error('InvalidSetup', consumer),
    );
    await assert.rejects(round(999n), error('InvalidRound'));
  });

  it('rejects invalid setup, unauthorized publishing and four-question challenges', async function () {
    const input = await encrypt(Array<bigint>(10).fill(0n), operator);
    const create = (
      who: Signer,
      players: string[],
      time = joinDeadline,
      duration = 120,
      hash = contentHash,
      handles = input.handles,
    ) =>
      send(
        arena,
        who,
        'createRound',
        players,
        time,
        duration,
        hash,
        handles,
        input.inputProof,
      );
    await assert.rejects(
      create(stranger, [a.address, b.address]),
      error('Unauthorized'),
    );
    for (const players of [
      [a.address, a.address],
      [ethers.ZeroAddress, b.address],
      [operator.address, b.address],
    ])
      await assert.rejects(create(operator, players), error('InvalidSetup'));
    await assert.rejects(
      create(operator, [a.address, b.address], 1),
      error('InvalidSetup'),
    );
    await assert.rejects(
      create(operator, [a.address, b.address], joinDeadline, 59),
      error('InvalidSetup'),
    );
    await assert.rejects(
      create(operator, [a.address, b.address], joinDeadline, 3601),
      error('InvalidSetup'),
    );
    await assert.rejects(
      create(
        operator,
        [a.address, b.address],
        joinDeadline,
        120,
        ethers.ZeroHash,
      ),
      error('InvalidSetup'),
    );
    await assert.rejects(
      create(
        operator,
        [a.address, b.address],
        joinDeadline,
        120,
        contentHash,
        input.handles.slice(0, 4),
      ),
      error('InvalidSetup'),
    );
    await assert.rejects(
      send(consumer, stranger, 'configureArena', address),
      error('InvalidSetup', consumer),
    );
  });

  it('rejects duplicate/partial/unauthorized submissions and repeated terminal actions', async function () {
    const id = await active();
    const { input } = await submit(id, 0, 4);
    await assert.rejects(
      send(arena, a, 'submitAnswers', id, input.handles, input.inputProof),
      error('InvalidState'),
    );
    const other = await encrypt(encode(id, 1, 4), b);
    await assert.rejects(
      send(
        arena,
        stranger,
        'submitAnswers',
        id,
        other.handles,
        other.inputProof,
      ),
      error('Unauthorized'),
    );
    await assert.rejects(
      send(
        arena,
        b,
        'submitAnswers',
        id,
        other.handles.slice(1),
        other.inputProof,
      ),
      error('InvalidSetup'),
    );
    await assert.rejects(
      send(arena, stranger, 'finalizeRound', id),
      error('NotCompleted'),
    );
    await send(arena, b, 'submitAnswers', id, other.handles, other.inputProof);
    await send(arena, stranger, 'finalizeRound', id);
    await assert.rejects(
      send(arena, stranger, 'finalizeRound', id),
      error('InvalidState'),
    );
    await assert.rejects(submit(id, 1, 10), error('InvalidState'));
    await assert.rejects(
      send(arena, b, 'joinRound', id),
      error('InvalidState'),
    );
  });

  for (const seat of [0, 1]) {
    it(`awards a forfeit to the sole timely submitter in seat ${seat}, even for score zero`, async function () {
      const id = await active();
      await submit(id, seat, 0);
      await assert.rejects(
        send(arena, stranger, 'finalizeRound', id),
        error('NotCompleted'),
      );
      await jump((await round(id)).deadline);
      await send(arena, stranger, 'finalizeRound', id);
      const value = await round(id);
      assert.equal(await decrypt(value.outcome, a), BigInt(seat + 1));
      assert.equal(await decrypt(value.scores[seat], seat === 0 ? a : b), 0n);
      await entitlement(id, seat === 0 ? [2n, 0n] : [0n, 2n]);
    });
  }

  it('rejects submissions at the exact deadline and refunds when neither submits', async function () {
    const id = await active();
    const input = await encrypt(encode(id, 0, 10), a);
    await jump((await round(id)).deadline);
    await assert.rejects(
      arena
        .connect(a)
        .getFunction('submitAnswers')
        .staticCall(id, input.handles, input.inputProof),
      error('DeadlinePassed'),
    );
    await assert.rejects(submit(id, 0, 10), error('DeadlinePassed'));
    await send(arena, stranger, 'finalizeRound', id);
    assert.equal(await decrypt((await round(id)).outcome, b), 4n);
    await entitlement(id, [1n, 1n]);
  });

  for (const joined of [false, true]) {
    it(`cancels an expired unmatched round (${joined ? 'one join' : 'no joins'}) with symbolic refund entitlement`, async function () {
      const id = await open();
      if (joined) await send(arena, a, 'joinRound', id);
      await assert.rejects(
        send(arena, stranger, 'finalizeRound', id),
        error('NotCompleted'),
      );
      await jump(joinDeadline);
      await assert.rejects(
        send(arena, b, 'joinRound', id),
        error('DeadlinePassed'),
      );
      await send(arena, stranger, 'finalizeRound', id);
      assert.equal((await round(id)).state, 4n);
      await entitlement(id, [1n, 1n]);
      // Symbolic units are not deposits: production must refund only actually funded seats.
      await assert.rejects(
        send(arena, a, 'finalizeRound', id),
        error('InvalidState'),
      );
    });
  }

  it('rejects bad proofs, wrong sender/contract and duplicate handles atomically', async function () {
    const id = await active();
    const valid = await encrypt(encode(id, 0, 10), a);
    const wrongSender = await encrypt(encode(id, 0, 10), b);
    const wrongContract = await encrypt(encode(id, 0, 10), a, consumerAddress);
    const foreign = await encrypt(encode(id, 0, 10), a);
    for (const [handles, proof] of [
      [valid.handles, '0x'],
      [wrongSender.handles, wrongSender.inputProof],
      [wrongContract.handles, wrongContract.inputProof],
      [foreign.handles, valid.inputProof],
    ] as const) {
      await assert.rejects(send(arena, a, 'submitAnswers', id, handles, proof));
      assert.equal((await round(id)).submitted[0], false);
      assert.equal(await arena.getFunction('usedInputs')(handles[0]), false);
    }
    await assert.rejects(
      send(
        arena,
        a,
        'submitAnswers',
        id,
        [valid.handles[0], valid.handles[0], ...valid.handles.slice(2)],
        valid.inputProof,
      ),
      error('InputAlreadyUsed'),
    );
    assert.equal(
      await arena.getFunction('usedInputs')(valid.handles[0]),
      false,
    );
    await send(arena, a, 'submitAnswers', id, valid.handles, valid.inputProof);
  });

  it('blocks handle reuse across rounds and masks fresh wrong-round/seat/question contexts', async function () {
    const first = await active();
    const second = await active();
    const { input } = await submit(first, 0, 10);
    await assert.rejects(
      send(arena, a, 'submitAnswers', second, input.handles, input.inputProof),
      error('InputAlreadyUsed'),
    );
    await submit(second, 0, 10, encode(first, 0, 10));
    await submit(second, 1, 10, encode(second, 0, 10));
    await send(arena, stranger, 'finalizeRound', second);
    assert.equal(await decrypt((await round(second)).scores[0], a), 0n);
    assert.equal(await decrypt((await round(second)).scores[1], b), 0n);
    await submit(first, 1, 10, encode(first, 1, 10).reverse());
    await send(arena, stranger, 'finalizeRound', first);
    assert.equal(await decrypt((await round(first)).scores[1], b), 0n);
    assert.equal(await decrypt((await round(first)).outcome, a), 1n);
  });

  it('masks invalid keys/choices and preserves timely scores when finalization is late', async function () {
    const id = await open([4n, ...Array<bigint>(9).fill(0n)]);
    await send(arena, a, 'joinRound', id);
    await send(arena, b, 'joinRound', id);
    await submit(id, 0, 10);
    const invalid = encode(id, 1, 10);
    invalid[1] = invalid[1]! | 4n;
    await submit(id, 1, 10, invalid);
    await jump((await round(id)).deadline + 100n);
    await send(arena, stranger, 'finalizeRound', id);
    const value = await round(id);
    assert.equal(await decrypt(value.scores[0], a), 9n);
    assert.equal(await decrypt(value.scores[1], b), 8n);
    assert.equal(await decrypt(value.outcome, a), 1n);
  });

  it('uses the same ordered nonzero keys for both seats', async function () {
    const keys = Array.from({ length: 10 }, (_, i) => BigInt(i % 4));
    const id = await open(keys);
    await send(arena, a, 'joinRound', id);
    await send(arena, b, 'joinRound', id);
    for (const seat of [0, 1]) {
      const values = keys.map(
        (choice, i) =>
          (id << 17n) |
          (BigInt(seat) << 16n) |
          (BigInt(i) << 8n) |
          (seat === 1 && i === 9 ? 0n : choice),
      );
      await submit(id, seat, 10, values);
    }
    await send(arena, stranger, 'finalizeRound', id);
    const value = await round(id);
    assert.equal(await decrypt(value.scores[0], a), 10n);
    assert.equal(await decrypt(value.scores[1], b), 9n);
    assert.equal(await decrypt(value.outcome, a), 1n);
  });
});
