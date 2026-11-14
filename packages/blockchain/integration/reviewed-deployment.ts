import assert from 'node:assert/strict';
import { getAddress, parseAbi } from 'viem';
import {
  MAX_FEE_PER_GAS_WEI,
  MAX_GAS_PER_TX,
} from '../../../contracts/scripts/sepolia-policy.js';

export const SCORING_ADDRESS = '0x4b4c204d28D5ee37896278C5fc56d61086f92b53';
export const DEPLOYMENT_TRANSACTION =
  '0x9993ceddc07934d098e3b7458b278e2bf90fc8de79f4e2ce4dfedce4cc2429d1';
export const CREATION_HASH =
  '0x4b033120899ac98fde5d0e1f8eded615afd01a48d825fdcc06766f3bd877cbcf';

export function assertReviewedDeployment(address: string) {
  assert.equal(
    getAddress(address),
    SCORING_ADDRESS,
    'Integration must target the reviewed deployment',
  );
}

export function integrationCeilings(maxFeePerGas: bigint) {
  assert.ok(maxFeePerGas > 0n && maxFeePerGas <= MAX_FEE_PER_GAS_WEI);
  const perTransaction = MAX_GAS_PER_TX * maxFeePerGas;
  return {
    perTransaction,
    operator: 2n * perTransaction,
    player: perTransaction,
    total: 3n * perTransaction,
  };
}

// Shared typed view/event ABI; writes and decoded errors use the compiled full ABI.
export const scoringAbi = parseAbi([
  'function OPERATOR() view returns (address)',
  'function confidentialProtocolId() view returns (uint256)',
  'function nextRoundId() view returns (uint64)',
  'function createRound(address player, uint64 deadline, bytes32 contentHash, bytes32[] keys, bytes proof) returns (uint64 roundId)',
  'function submitAnswers(uint64 roundId, bytes32[] answers, bytes proof)',
  'function finalizeRound(uint64 roundId)',
  'function getRound(uint64 roundId) view returns (address player, uint64 deadline, bytes32 contentHash, uint8 state, bytes32 score, uint256 questionCount)',
  'function getKeyHandle(uint64 roundId, uint256 index) view returns (bytes32)',
  'event RoundOpened(uint64 indexed roundId, address indexed player)',
]);
