// Pure client utilities. No wallet, RPC, SDK instance, signing or persistence.
import {
  encodeAbiParameters,
  keccak256,
  parseAbi,
  type Address,
  type Hex,
} from 'viem';
import type { EncryptParams } from '@zama-fhe/sdk';

export const arenaRulesHash = keccak256(
  new TextEncoder().encode('CipherQuiz.Arena.TokenFree.v1'),
);
export const maxArenaRoundId = (1n << 47n) - 1n;

export type ArenaConfig = {
  players: readonly [Address, Address];
  questions: readonly Hex[];
  bankRoot: Hex;
  joinDeadline: bigint;
  duration: number;
};

const configParameter = {
  type: 'tuple',
  components: [
    { name: 'players', type: 'address[2]' },
    { name: 'questions', type: 'bytes32[10]' },
    { name: 'bankRoot', type: 'bytes32' },
    { name: 'joinDeadline', type: 'uint64' },
    { name: 'duration', type: 'uint32' },
  ],
} as const;

/** Hash exact UTF-8 strings without implicit Unicode/whitespace normalization. */
export function hashArenaQuestion(question: {
  id: string;
  revision: number;
  prompt: string;
  choices: readonly [string, string, string, string];
}): Hex {
  return keccak256(
    encodeAbiParameters(
      [
        { type: 'string' },
        { type: 'uint32' },
        { type: 'string' },
        { type: 'string[4]' },
      ],
      [question.id, question.revision, question.prompt, question.choices],
    ),
  );
}

function ten<T>(values: readonly T[]): readonly [T, T, T, T, T, T, T, T, T, T] {
  if (values.length !== 10) throw new Error('Arena requires exactly ten items');
  return [...values] as [T, T, T, T, T, T, T, T, T, T];
}

export function arenaContentHash(questions: readonly Hex[]): Hex {
  return keccak256(
    encodeAbiParameters([{ type: 'bytes32[10]' }], [ten(questions)]),
  );
}

export function arenaKeyCommitment(handles: readonly Hex[]): Hex {
  ten(handles);
  return keccak256(encodeAbiParameters([{ type: 'bytes32[]' }], [handles]));
}

/** Matches the engine's domain-bound ABI commitment. Hashing does not validate content truth. */
export function arenaTermsHash(params: {
  chainId: bigint;
  engine: Address;
  operator: Address;
  consumer: Address;
  roundId: bigint;
  config: ArenaConfig;
  keyHandles: readonly Hex[];
}): Hex {
  checkRound(params.roundId);
  return keccak256(
    encodeAbiParameters(
      [
        { type: 'bytes32' },
        { type: 'uint256' },
        { type: 'address' },
        { type: 'address' },
        { type: 'address' },
        { type: 'uint64' },
        configParameter,
        { type: 'bytes32' },
      ],
      [
        arenaRulesHash,
        params.chainId,
        params.engine,
        params.operator,
        params.consumer,
        params.roundId,
        { ...params.config, questions: ten(params.config.questions) },
        arenaKeyCommitment(params.keyHandles),
      ],
    ),
  );
}

function checkRound(id: bigint): void {
  if (id < 1n || id > maxArenaRoundId)
    throw new Error('Invalid Arena round ID');
}

/** Strict legitimate-client encoder; invalid onchain ciphertext contexts still score zero. */
export function packArenaAnswers(
  roundId: bigint,
  seat: number,
  choices: readonly number[],
): bigint[] {
  checkRound(roundId);
  if (seat !== 0 && seat !== 1) throw new Error('Invalid Arena seat');
  return ten(choices).map((choice, i) => {
    if (!Number.isInteger(choice) || choice < 0 || choice > 3)
      throw new Error('Invalid Arena choice');
    return (
      (roundId << 17n) |
      (BigInt(seat) << 16n) |
      (BigInt(i) << 8n) |
      BigInt(choice)
    );
  });
}

/** Returns only the installed SDK's input shape; performs no encryption or network request. */
export function arenaEncryptionRequest(params: {
  engine: Address;
  player: Address;
  roundId: bigint;
  seat: number;
  choices: readonly number[];
}): EncryptParams {
  return {
    contractAddress: params.engine,
    userAddress: params.player,
    values: packArenaAnswers(params.roundId, params.seat, params.choices).map(
      (value) => ({ type: 'euint64', value }),
    ),
  };
}

// Deliberately explicit ABI, tested against the Solidity compiler artifact to prevent drift.
export const arenaAbi = parseAbi([
  'function confidentialProtocolId() view returns (uint256)',
  'function OPERATOR() view returns (address)',
  'function CONSUMER() view returns (address)',
  'function RULES_HASH() view returns (bytes32)',
  'function MAX_ROUND_ID() view returns (uint64)',
  'function nextRoundId() view returns (uint64)',
  'function usedInputs(bytes32) view returns (bool)',
  'function createRound(uint64 expectedId, (address[2] players,bytes32[10] questions,bytes32 bankRoot,uint64 joinDeadline,uint32 duration) config, bytes32[] keys, bytes proof) returns (uint64 roundId)',
  'function joinRound(uint64 roundId, bytes32 expectedTermsHash)',
  'function cancelRound(uint64 roundId)',
  'function submitAnswers(uint64 roundId, bytes32[] answers, bytes proof)',
  'function finalizeRound(uint64 roundId)',
  'function getPublicRound(uint64 roundId) view returns ((address[2] players,uint8 state,uint8 closure,uint8 joined,uint8 submitted,uint64 joinDeadline,uint64 deadline,uint32 duration,bytes32 bankRoot,bytes32 contentHash,bytes32 keyCommitment,bytes32 termsHash) result)',
  'function getQuestions(uint64 roundId) view returns (bytes32[10] questions)',
  'function getKeyHandles(uint64 roundId) view returns (bytes32[10] keys)',
  'function getResults(uint64 roundId) view returns (bytes32[2] scores,bytes32 outcome,bytes32[2] shares)',
  'function shareSettlement(uint64 roundId) returns (bytes32 termsHash,address[2] players,uint8 joined,bytes32 outcome,bytes32[2] shares)',
  'event RoundCreated(uint64 indexed roundId,bytes32 indexed termsHash)',
  'event PlayerJoined(uint64 indexed roundId,uint8 indexed seat)',
  'event RoundActivated(uint64 indexed roundId,uint64 indexed deadline)',
  'event AnswersSubmitted(uint64 indexed roundId,uint8 indexed seat)',
  'event RoundClosed(uint64 indexed roundId,uint8 indexed reason)',
  'error Unauthorized()',
  'error InvalidSetup()',
  'error InvalidRound()',
  'error InvalidState()',
  'error DeadlinePassed()',
  'error NotCompleted()',
  'error InputAlreadyUsed()',
  'error CommitmentMismatch()',
]);
