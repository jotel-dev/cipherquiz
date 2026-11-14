import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { Interface, AbiCoder, keccak256 as ethersHash, id } from 'ethers';
import {
  arenaAbi,
  arenaContentHash,
  arenaEncryptionRequest,
  arenaKeyCommitment,
  arenaRulesHash,
  arenaTermsHash,
  hashArenaQuestion,
  maxArenaRoundId,
  packArenaAnswers,
} from '../src/arena.js';
import type { Address, Hex } from 'viem';

const address = (digit: string) => `0x${digit.repeat(40)}` as Address;
const hash = (digit: string) => `0x${digit.repeat(64)}` as Hex;
const questions = Array.from({ length: 10 }, (_, i) =>
  hash((i + 1).toString(16)),
);
const config = {
  players: [address('1'), address('2')] as const,
  questions,
  bankRoot: hash('b'),
  joinDeadline: 123456n,
  duration: 120,
};

test('Arena client encoding bounds all ten contextual words and returns the installed SDK input shape', () => {
  const values = packArenaAnswers(
    maxArenaRoundId,
    1,
    Array<number>(10).fill(3),
  );
  assert.equal(values.length, 10);
  assert.equal(
    values[9],
    (maxArenaRoundId << 17n) | (1n << 16n) | (9n << 8n) | 3n,
  );
  assert.ok(values.every((value) => value < 1n << 64n));
  for (const round of [0n, -1n, maxArenaRoundId + 1n])
    assert.throws(() => packArenaAnswers(round, 0, Array<number>(10).fill(0)));
  for (const seat of [-1, 2, 0.5, NaN])
    assert.throws(() => packArenaAnswers(1n, seat, Array<number>(10).fill(0)));
  for (const choice of [-1, 4, 0.1, NaN])
    assert.throws(() =>
      packArenaAnswers(1n, 0, Array<number>(10).fill(choice)),
    );
  assert.throws(() => packArenaAnswers(1n, 0, [0, 1, 2, 3]));
  const request = arenaEncryptionRequest({
    engine: address('3'),
    player: address('1'),
    roundId: 1n,
    seat: 0,
    choices: Array<number>(10).fill(0),
  });
  assert.equal(request.contractAddress, address('3'));
  assert.equal(request.userAddress, address('1'));
  assert.deepEqual(
    request.values,
    packArenaAnswers(1n, 0, Array<number>(10).fill(0)).map((value) => ({
      type: 'euint64',
      value,
    })),
  );
});

test('Arena commitments match independent ethers ABI encoding and bind every domain/config field', () => {
  const params = {
    chainId: 31337n,
    engine: address('3'),
    operator: address('4'),
    consumer: address('5'),
    roundId: 1n,
    config,
    keyHandles: Array<Hex>(10).fill(hash('c')),
  };
  const coder = AbiCoder.defaultAbiCoder();
  assert.equal(arenaRulesHash, id('CipherQuiz.Arena.TokenFree.v1'));
  assert.equal(
    arenaContentHash(questions),
    ethersHash(coder.encode(['bytes32[10]'], [questions])),
  );
  assert.equal(
    arenaKeyCommitment(params.keyHandles),
    ethersHash(coder.encode(['bytes32[]'], [params.keyHandles])),
  );
  const expected = ethersHash(
    coder.encode(
      [
        'bytes32',
        'uint256',
        'address',
        'address',
        'address',
        'uint64',
        'tuple(address[2] players,bytes32[10] questions,bytes32 bankRoot,uint64 joinDeadline,uint32 duration)',
        'bytes32',
      ],
      [
        arenaRulesHash,
        params.chainId,
        params.engine,
        params.operator,
        params.consumer,
        params.roundId,
        config,
        arenaKeyCommitment(params.keyHandles),
      ],
    ),
  );
  assert.equal(arenaTermsHash(params), expected);
  for (const change of [
    { chainId: 11155111n },
    { engine: address('6') },
    { operator: address('6') },
    { consumer: address('6') },
    { roundId: 2n },
    { config: { ...config, questions: [...questions].reverse() } },
    { config: { ...config, bankRoot: hash('d') } },
    { config: { ...config, duration: 121 } },
    { config: { ...config, joinDeadline: 123457n } },
    { config: { ...config, players: [address('2'), address('1')] as const } },
    { keyHandles: Array<Hex>(10).fill(hash('d')) },
  ])
    assert.notEqual(arenaTermsHash({ ...params, ...change }), expected);
  assert.throws(() =>
    arenaTermsHash({
      ...params,
      config: { ...config, questions: questions.slice(1) },
    }),
  );
});

test('question hashing commits exact ordered UTF-8 content and version without answer material', () => {
  const question = {
    id: 'demo-1',
    revision: 1,
    prompt: 'Dummy prompt?',
    choices: ['A', 'B', 'C', 'D'] as const,
  };
  const original = hashArenaQuestion(question);
  for (const change of [
    { id: 'demo-2' },
    { revision: 2 },
    { prompt: 'Dummy prompt? ' },
    { choices: ['B', 'A', 'C', 'D'] as const },
  ])
    assert.notEqual(hashArenaQuestion({ ...question, ...change }), original);
});

test('Arena frontend ABI exactly matches compiler function inputs/outputs and event indexing', () => {
  const artifact = JSON.parse(
    readFileSync(
      new URL(
        '../../../contracts/artifacts/src/HiddenScoreArena.sol/HiddenScoreArena.json',
        import.meta.url,
      ),
      'utf8',
    ),
  ) as { abi: readonly object[] };
  const compiled = new Interface(artifact.abi);
  const client = new Interface(arenaAbi);
  const signatures = (iface: Interface) =>
    iface.fragments
      .filter(
        (fragment) => fragment.type === 'function' || fragment.type === 'event',
      )
      .map((fragment) => fragment.format('full'))
      .sort();
  assert.deepEqual(signatures(client), signatures(compiled));
});
