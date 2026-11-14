import assert from 'node:assert/strict';
import { ethers, fhevm, network, artifacts } from 'hardhat';
import { FhevmType } from '@fhevm/hardhat-plugin';
import type { BaseContract, ContractTransactionReceipt } from 'ethers';

type Signer = Awaited<ReturnType<typeof ethers.getSigners>>[number];
type Config = {
  players: string[];
  questions: string[];
  bankRoot: string;
  joinDeadline: number | bigint;
  duration: number;
};

describe('Hidden Score Arena complete token-free engine', function () {
  this.timeout(180000);
  let arena: BaseContract, consumer: BaseContract;
  let operator: Signer, a: Signer, b: Signer, stranger: Signer;
  let address: string, consumerAddress: string, config: Config;
  const coder = ethers.AbiCoder.defaultAbiCoder();
  const configType =
    'tuple(address[2] players,bytes32[10] questions,bytes32 bankRoot,uint64 joinDeadline,uint32 duration)';
  const keys = Array.from({ length: 10 }, (_, i) => BigInt(i % 4));
  const receipts: Record<string, ContractTransactionReceipt[]> = {};

  async function send(
    c: BaseContract,
    who: Signer,
    method: string,
    ...args: unknown[]
  ) {
    const receipt = await (
      await c.connect(who).getFunction(method)(...args)
    ).wait();
    assert.ok(receipt);
    (receipts[method] ??= []).push(receipt);
    return receipt;
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
  async function encrypted(values: bigint[], who: Signer, target = address) {
    const input = fhevm.createEncryptedInput(target, who.address);
    for (const value of values) input.add64(value);
    return input.encrypt();
  }
  async function meta(id: bigint) {
    return arena.getFunction('getPublicRound')(id);
  }
  async function result(id: bigint) {
    return arena.getFunction('getResults')(id);
  }
  async function open(custom = config, values = keys) {
    const id: bigint = await arena.getFunction('nextRoundId')();
    const input = await encrypted(values, operator);
    await send(
      arena,
      operator,
      'createRound',
      id,
      custom,
      input.handles,
      input.inputProof,
    );
    return { id, input };
  }
  async function join(id: bigint, who: Signer) {
    return send(arena, who, 'joinRound', id, (await meta(id)).termsHash);
  }
  async function active() {
    const { id } = await open();
    await join(id, a);
    await join(id, b);
    return id;
  }
  function words(id: bigint, seat: number, correct: number, choices = keys) {
    return choices.map(
      (key, i) =>
        (id << 17n) |
        (BigInt(seat) << 16n) |
        (BigInt(i) << 8n) |
        (i < correct ? key : (key + 1n) % 4n),
    );
  }
  async function submit(
    id: bigint,
    seat: number,
    correct: number,
    values = words(id, seat, correct),
  ) {
    const who = seat === 0 ? a : b;
    const input = await encrypted(values, who);
    await send(
      arena,
      who,
      'submitAnswers',
      id,
      input.handles,
      input.inputProof,
    );
    return input;
  }
  async function decrypt(
    handle: string,
    who: Signer,
    wide = false,
    target = address,
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
    wide = false,
    target = address,
  ) {
    await assert.rejects(
      decrypt(handle, who, wide, target),
      /not authorized|not allowed/i,
    );
  }
  async function jump(timestamp: number | bigint) {
    await ethers.provider.send('evm_setNextBlockTimestamp', [
      Number(timestamp),
    ]);
    await ethers.provider.send('evm_mine', []);
  }
  async function shares(id: bigint, expected: readonly bigint[]) {
    const data = await result(id);
    for (const [seat, who] of [a, b].entries())
      assert.equal(await decrypt(data.shares[seat], who, true), expected[seat]);
  }

  beforeEach(async function () {
    assert.equal(network.name, 'hardhat');
    assert.equal((await ethers.provider.getNetwork()).chainId, 31337n);
    assert.equal(fhevm.isMock, true);
    [operator, a, b, stranger] = (await ethers.getSigners()) as [
      Signer,
      Signer,
      Signer,
      Signer,
    ];
    for (const key of Object.keys(receipts)) delete receipts[key];
    consumer = await (
      await ethers.getContractFactory('ArenaEngineConsumerLab')
    ).deploy();
    await consumer.waitForDeployment();
    consumerAddress = await consumer.getAddress();
    arena = await (
      await ethers.getContractFactory('HiddenScoreArena')
    ).deploy(operator.address, consumerAddress);
    await arena.waitForDeployment();
    address = await arena.getAddress();
    await send(consumer, operator, 'configure', address);
    config = {
      players: [a.address, b.address],
      questions: Array.from({ length: 10 }, (_, i) =>
        ethers.id(`dummy question ${i}`),
      ),
      bankRoot: ethers.id('dummy bank v1'),
      joinDeadline: (await ethers.provider.getBlock('latest'))!.timestamp + 600,
      duration: 120,
    };
  });

  for (const [scoreA, scoreB] of [
    ...Array.from({ length: 11 }, (_, n) => [n, 10 - n]),
    [0, 0],
    [10, 10],
  ]) {
    it(`computes score bounds and entitlements for ${scoreA}/10 vs ${scoreB}/10`, async function () {
      const id = await active();
      await submit(id, 0, scoreA!);
      await submit(id, 1, scoreB!);
      await send(arena, stranger, 'finalizeRound', id);
      const data = await result(id);
      assert.equal(await decrypt(data.scores[0], a), BigInt(scoreA!));
      assert.equal(await decrypt(data.scores[1], b), BigInt(scoreB!));
      const expected = scoreA! > scoreB! ? 1n : scoreB! > scoreA! ? 2n : 3n;
      assert.equal(await decrypt(data.outcome, a), expected);
      assert.equal(await decrypt(data.outcome, b), expected);
      await shares(
        id,
        expected === 1n ? [2n, 0n] : expected === 2n ? [0n, 2n] : [1n, 1n],
      );
      assert.equal((await meta(id)).closure, 1n);
    });
  }

  it('binds exact question/key/rule/domain commitments and requires matching player consent', async function () {
    const { id, input } = await open();
    const before = await meta(id);
    const handles = input.handles.map((h) => ethers.hexlify(h));
    const keyHash = ethers.keccak256(coder.encode(['bytes32[]'], [handles]));
    const terms = ethers.keccak256(
      coder.encode(
        [
          'bytes32',
          'uint256',
          'address',
          'address',
          'address',
          'uint64',
          configType,
          'bytes32',
        ],
        [
          ethers.id('CipherQuiz.Arena.TokenFree.v1'),
          31337,
          address,
          operator.address,
          consumerAddress,
          id,
          config,
          keyHash,
        ],
      ),
    );
    assert.equal(before.termsHash, terms);
    assert.equal(before.keyCommitment, keyHash);
    assert.equal(
      before.contentHash,
      ethers.keccak256(coder.encode(['bytes32[10]'], [config.questions])),
    );
    assert.deepEqual(
      [...(await arena.getFunction('getQuestions')(id))],
      config.questions,
    );
    assert.deepEqual(
      [...(await arena.getFunction('getKeyHandles')(id))],
      handles,
    );
    await assert.rejects(
      send(arena, a, 'joinRound', id, ethers.ZeroHash),
      error('CommitmentMismatch'),
    );
    assert.equal((await meta(id)).joined, 0n);
    await join(id, b);
    assert.equal((await meta(id)).deadline, 0n);
    await join(id, a);
    const after = await meta(id);
    assert.equal(
      after.deadline,
      BigInt(
        (await ethers.provider.getBlock('latest'))!.timestamp + config.duration,
      ),
    );
    assert.equal(after.termsHash, terms);
    assert.equal(after.joined, 3n);
  });

  it('validates immutable setup, nonce, unique ten-question leaves, roles and constructor', async function () {
    const input = await encrypted(keys, operator);
    const create = (
      c: Config,
      who = operator,
      id = 1n,
      handles = input.handles,
      proof: Uint8Array | string = input.inputProof,
    ) => send(arena, who, 'createRound', id, c, handles, proof);
    await assert.rejects(
      (await ethers.getContractFactory('HiddenScoreArena')).deploy(
        ethers.ZeroAddress,
        consumerAddress,
      ),
      error('InvalidSetup'),
    );
    await assert.rejects(
      (await ethers.getContractFactory('HiddenScoreArena')).deploy(
        operator.address,
        stranger.address,
      ),
      error('InvalidSetup'),
    );
    await assert.rejects(create(config, stranger), error('Unauthorized'));
    await assert.rejects(create(config, operator, 2n), error('InvalidSetup'));
    for (const change of [
      { players: [a.address, a.address] },
      { players: [ethers.ZeroAddress, b.address] },
      { players: [operator.address, b.address] },
      { players: [consumerAddress, b.address] },
      { joinDeadline: 1 },
      { joinDeadline: (1n << 64n) - 1n },
      { duration: 59 },
      { duration: 3601 },
      { bankRoot: ethers.ZeroHash },
      { questions: Array<string>(10).fill(config.questions[0]!) },
      { questions: [ethers.ZeroHash, ...config.questions.slice(1)] },
    ])
      await assert.rejects(
        create({ ...config, ...change }),
        error('InvalidSetup'),
      );
    await assert.rejects(
      create(config, operator, 1n, input.handles.slice(0, 4)),
      error('InvalidSetup'),
    );
    await assert.rejects(create(config, operator, 1n, input.handles, '0x'));
    assert.equal(await arena.getFunction('nextRoundId')(), 1n);
    await create(config);
    await assert.rejects(
      create(config, operator, 2n),
      error('InputAlreadyUsed'),
    );
    assert.equal(await arena.getFunction('nextRoundId')(), 2n);
    await assert.rejects(meta(999n), error('InvalidRound'));
  });

  it('prevents publisher/opponent cancellation abuse after consent and after activation', async function () {
    const first = (await open()).id;
    await assert.rejects(
      send(arena, a, 'cancelRound', first),
      error('Unauthorized'),
    );
    await send(arena, operator, 'cancelRound', first);
    assert.equal((await meta(first)).closure, 4n);
    await shares(first, [0n, 0n]);
    for (const [who, seat] of [
      [a, 0],
      [b, 1],
    ] as const) {
      const id = (await open()).id;
      await join(id, who);
      for (const other of [operator, stranger, seat === 0 ? b : a])
        await assert.rejects(
          send(arena, other, 'cancelRound', id),
          error('Unauthorized'),
        );
      await send(arena, who, 'cancelRound', id);
      assert.equal((await meta(id)).closure, 5n);
      await shares(id, seat === 0 ? [1n, 0n] : [0n, 1n]);
      await assert.rejects(join(id, seat === 0 ? b : a), error('InvalidState'));
    }
    const id = await active();
    for (const who of [operator, a, b, stranger])
      await assert.rejects(
        send(arena, who, 'cancelRound', id),
        error('InvalidState'),
      );
    await submit(id, 0, 2);
    await assert.rejects(
      send(arena, operator, 'cancelRound', id),
      error('InvalidState'),
    );
    await submit(id, 1, 4);
    await send(arena, stranger, 'finalizeRound', id);
    await assert.rejects(
      send(arena, operator, 'cancelRound', id),
      error('InvalidState'),
    );
    assert.equal(await decrypt((await result(id)).outcome, a), 2n);
    assert.equal(arena.interface.hasFunction('setKeys'), false);
    assert.equal(arena.interface.hasFunction('setWinner'), false);
  });

  for (const joined of [0, 1, 2]) {
    it(`expires an unmatched round with consent mask ${joined} and no phantom entitlement`, async function () {
      const { id } = await open();
      if (joined) await join(id, joined === 1 ? a : b);
      await assert.rejects(
        send(arena, stranger, 'finalizeRound', id),
        error('NotCompleted'),
      );
      await jump(config.joinDeadline);
      await assert.rejects(
        arena
          .connect(joined === 1 ? b : a)
          .getFunction('joinRound')
          .staticCall(id, (await meta(id)).termsHash),
        error('DeadlinePassed'),
      );
      await assert.rejects(
        send(arena, operator, 'cancelRound', id),
        error('DeadlinePassed'),
      );
      await send(arena, stranger, 'finalizeRound', id);
      assert.equal((await meta(id)).state, 4n);
      assert.equal((await meta(id)).closure, 3n);
      await shares(id, [joined === 1 ? 1n : 0n, joined === 2 ? 1n : 0n]);
    });
  }

  for (const seat of [0, 1]) {
    it(`awards a zero-score forfeit to seat ${seat} only at expiry`, async function () {
      const id = await active();
      await submit(id, seat, 0);
      await assert.rejects(
        send(arena, operator, 'finalizeRound', id),
        error('NotCompleted'),
      );
      await jump((await meta(id)).deadline);
      await send(arena, stranger, 'finalizeRound', id);
      assert.equal(
        await decrypt((await result(id)).outcome, a),
        BigInt(seat + 1),
      );
      await shares(id, seat === 0 ? [2n, 0n] : [0n, 2n]);
    });
  }

  it('enforces actual last-second joins/submissions and exact deadline rejection', async function () {
    const { id: waiting } = await open();
    await ethers.provider.send('evm_setNextBlockTimestamp', [
      Number(config.joinDeadline) - 1,
    ]);
    await join(waiting, a);
    assert.equal(
      (await ethers.provider.getBlock('latest'))!.timestamp,
      Number(config.joinDeadline) - 1,
    );
    await jump(config.joinDeadline);
    await assert.rejects(
      arena
        .connect(b)
        .getFunction('joinRound')
        .staticCall(waiting, (await meta(waiting)).termsHash),
      error('DeadlinePassed'),
    );
    config.joinDeadline =
      (await ethers.provider.getBlock('latest'))!.timestamp + 600;
    const id = await active();
    const input = await encrypted(words(id, 0, 10), a);
    const deadline = Number((await meta(id)).deadline);
    await ethers.provider.send('evm_setNextBlockTimestamp', [deadline - 1]);
    await send(arena, a, 'submitAnswers', id, input.handles, input.inputProof);
    assert.equal(
      (await ethers.provider.getBlock('latest'))!.timestamp,
      deadline - 1,
    );
    const second = await encrypted(words(id, 1, 10), b);
    await jump(deadline);
    await assert.rejects(
      arena
        .connect(b)
        .getFunction('submitAnswers')
        .staticCall(id, second.handles, second.inputProof),
      error('DeadlinePassed'),
    );
    await send(arena, stranger, 'finalizeRound', id);
    assert.equal(await decrypt((await result(id)).scores[0], a), 10n);
    await shares(id, [2n, 0n]);
  });

  it('refunds both no-shows and rejects duplicate and terminal transitions', async function () {
    const { id: waiting } = await open();
    await assert.rejects(submit(waiting, 0, 10), error('InvalidState'));
    await assert.rejects(join(waiting, stranger), error('Unauthorized'));
    await join(waiting, a);
    await assert.rejects(join(waiting, a), error('InvalidState'));
    const id = await active();
    await jump((await meta(id)).deadline);
    await send(arena, stranger, 'finalizeRound', id);
    await shares(id, [1n, 1n]);
    assert.equal(await decrypt((await result(id)).outcome, b), 4n);
    await assert.rejects(submit(id, 0, 10), error('InvalidState'));
    await assert.rejects(join(id, b), error('InvalidState'));
    await assert.rejects(
      send(arena, stranger, 'finalizeRound', id),
      error('InvalidState'),
    );
  });

  it('rolls back wrong proofs/sender/target and duplicate handles; rejects partial/foreign batches', async function () {
    const id = await active();
    const valid = await encrypted(words(id, 0, 10), a);
    const wrongSender = await encrypted(words(id, 0, 10), b);
    const wrongTarget = await encrypted(words(id, 0, 10), a, consumerAddress);
    const other = await encrypted(words(id, 0, 10), a);
    for (const [handles, proof] of [
      [valid.handles, '0x'],
      [wrongSender.handles, wrongSender.inputProof],
      [wrongTarget.handles, wrongTarget.inputProof],
      [other.handles, valid.inputProof],
    ] as const) {
      await assert.rejects(send(arena, a, 'submitAnswers', id, handles, proof));
      assert.equal((await meta(id)).submitted, 0n);
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
    await assert.rejects(
      send(
        arena,
        a,
        'submitAnswers',
        id,
        valid.handles.slice(1),
        valid.inputProof,
      ),
      error('InvalidSetup'),
    );
    await assert.rejects(
      send(
        arena,
        stranger,
        'submitAnswers',
        id,
        valid.handles,
        valid.inputProof,
      ),
      error('Unauthorized'),
    );
    await send(arena, a, 'submitAnswers', id, valid.handles, valid.inputProof);
    await assert.rejects(
      send(arena, a, 'submitAnswers', id, valid.handles, valid.inputProof),
      error('InvalidState'),
    );
  });

  it('rejects even pre-authorized ciphertexts without a fresh input proof', async function () {
    const issuer = await (
      await ethers.getContractFactory('ArenaInputReuseLab')
    ).deploy();
    await issuer.waitForDeployment();
    const id = await active();
    await send(issuer, a, 'authorize', a.address, address, words(id, 0, 10));
    const handles = await Promise.all(
      Array.from({ length: 10 }, (_, i) => issuer.getFunction('handles')(i)),
    );
    const { ACLAddress } = await fhevm.getCoprocessorConfig(address);
    const acl = new ethers.Contract(
      ACLAddress,
      ['function persistAllowed(bytes32,address) view returns (bool)'],
      ethers.provider,
    );
    assert.equal(
      await acl.getFunction('persistAllowed')(handles[0], a.address),
      true,
    );
    assert.equal(
      await acl.getFunction('persistAllowed')(handles[0], address),
      true,
    );
    await assert.rejects(
      send(arena, a, 'submitAnswers', id, handles, '0x'),
      error('InvalidSetup'),
    );
    assert.equal((await meta(id)).submitted, 0n);
    assert.equal(await arena.getFunction('usedInputs')(handles[0]), false);
    await assert.rejects(
      send(arena, operator, 'createRound', 2n, config, handles, '0x'),
      error('InvalidSetup'),
    );
    assert.equal(await arena.getFunction('nextRoundId')(), 2n);
  });

  it('rejects reused handles and masks fresh wrong round, seat and position words', async function () {
    const first = await active(),
      second = await active();
    const original = await submit(first, 0, 10);
    await assert.rejects(
      send(
        arena,
        a,
        'submitAnswers',
        second,
        original.handles,
        original.inputProof,
      ),
      error('InputAlreadyUsed'),
    );
    await submit(second, 0, 10, words(first, 0, 10));
    await submit(second, 1, 10, words(second, 0, 10));
    await send(arena, stranger, 'finalizeRound', second);
    for (const [seat, who] of [a, b].entries())
      assert.equal(await decrypt((await result(second)).scores[seat], who), 0n);
    await submit(first, 1, 10, words(first, 1, 10).reverse());
    await jump((await meta(first)).deadline + 1n);
    await send(arena, stranger, 'finalizeRound', first);
    assert.equal(await decrypt((await result(first)).scores[0], a), 10n);
    assert.equal(await decrypt((await result(first)).scores[1], b), 0n);
  });

  it('masks uint64-max keys and invalid player choices without score overflow', async function () {
    const { id } = await open(config, [(1n << 64n) - 1n, ...keys.slice(1)]);
    await join(id, a);
    await join(id, b);
    await submit(id, 0, 10);
    const values = words(id, 1, 10);
    values[1] = (values[1]! & ~255n) | 255n;
    await submit(id, 1, 10, values);
    await send(arena, stranger, 'finalizeRound', id);
    assert.equal(await decrypt((await result(id)).scores[0], a), 9n);
    assert.equal(await decrypt((await result(id)).scores[1], b), 8n);
  });

  it('preserves ACL before/after closure and proves transient original settlement composition', async function () {
    const id = await active();
    await submit(id, 0, 2);
    const key = (await arena.getFunction('getKeyHandles')(id))[0];
    for (const who of [operator, a, b, stranger]) {
      await denied((await result(id)).scores[0], who);
      await denied(key, who, true);
    }
    await assert.rejects(
      send(arena, a, 'shareSettlement', id),
      error('Unauthorized'),
    );
    await assert.rejects(
      send(consumer, stranger, 'record', id),
      error('InvalidState'),
    );
    assert.equal(
      await consumer.getFunction('recordedTerms')(id),
      ethers.ZeroHash,
    );
    await submit(id, 1, 4);
    await send(arena, stranger, 'finalizeRound', id);
    const data = await result(id);
    await denied(data.scores[0], b);
    await denied(data.scores[1], a);
    await denied(data.shares[0], b, true);
    await denied(data.shares[1], a, true);
    for (const who of [operator, stranger]) {
      await denied(data.scores[0], who);
      await denied(data.scores[1], who);
      await denied(data.outcome, who);
      await denied(data.shares[0], who, true);
    }
    for (const handle of [...data.scores, data.outcome])
      await assert.rejects(
        fhevm.publicDecryptEuint(FhevmType.euint8, handle),
        /not authorized|not allowed/i,
      );
    for (const handle of data.shares)
      await assert.rejects(
        fhevm.publicDecryptEuint(FhevmType.euint64, handle),
        /not authorized|not allowed/i,
      );
    await send(consumer, stranger, 'record', id);
    assert.equal(
      await consumer.getFunction('recordedTerms')(id),
      (await meta(id)).termsHash,
    );
    for (const [seat, who] of [a, b].entries()) {
      const handle = await consumer.getFunction('units')(id, seat);
      assert.equal(
        await decrypt(handle, who, true, consumerAddress),
        seat === 0 ? 0n : 2n,
      );
      await denied(handle, seat === 0 ? b : a, true, consumerAddress);
    }
    const { ACLAddress } = await fhevm.getCoprocessorConfig(address);
    const acl = new ethers.Contract(
      ACLAddress,
      ['function persistAllowed(bytes32,address) view returns (bool)'],
      ethers.provider,
    );
    for (const handle of [...data.scores, ...data.shares, data.outcome])
      assert.equal(
        await acl.getFunction('persistAllowed')(handle, consumerAddress),
        false,
      );
    await assert.rejects(
      send(consumer, stranger, 'record', id),
      error('AlreadyRecorded', consumer),
    );
    await assert.rejects(
      send(consumer, operator, 'configure', address),
      error('InvalidSetup', consumer),
    );
  });

  it('supports the maximum context ID and refuses creation beyond the packing bound', async function () {
    const max = (1n << 47n) - 1n;
    // Local storage override reaches an otherwise infeasible nonce boundary; never used on a live chain.
    await network.provider.send('hardhat_setStorageAt', [
      address,
      '0x0',
      ethers.zeroPadValue(ethers.toBeHex(max), 32),
    ]);
    assert.equal(await arena.getFunction('nextRoundId')(), max);
    const { id } = await open();
    await join(id, a);
    await join(id, b);
    await submit(id, 0, 10);
    await submit(id, 1, 9);
    await send(arena, stranger, 'finalizeRound', id);
    assert.equal(await decrypt((await result(id)).scores[0], a), 10n);
    await assert.rejects(open(), error('InvalidSetup'));
  });

  it('records bounded public event schemas and local gas/HCU/code-size planning metrics', async function () {
    const id = await active();
    await submit(id, 0, 10);
    await submit(id, 1, 0);
    await send(arena, stranger, 'finalizeRound', id);
    await send(consumer, stranger, 'record', id);
    const allowed = new Set([
      'roundId',
      'termsHash',
      'seat',
      'deadline',
      'reason',
    ]);
    for (const fragment of arena.interface.fragments)
      if (fragment.type === 'event')
        for (const input of fragment.inputs) assert.ok(allowed.has(input.name));
    const artifact = await artifacts.readArtifact('HiddenScoreArena');
    const bytes = (artifact.deployedBytecode.length - 2) / 2;
    assert.ok(bytes < 24576, 'EIP-170 code size');
    const measured = Object.fromEntries(
      [
        'createRound',
        'joinRound',
        'submitAnswers',
        'finalizeRound',
        'record',
      ].map((name) => {
        const receipt = receipts[name]!.at(-1)!;
        const hcu = fhevm.computeTransactionHCU(receipt);
        return [
          name,
          {
            gas: receipt.gasUsed.toString(),
            globalHCU: hcu.globalHCU,
            depth: hcu.maxHCUDepth,
          },
        ];
      }),
    );
    console.info('ARENA_ENGINE_LOCAL_MOCK_ONLY', {
      deployedBytes: bytes,
      measured,
    });
  });
});
