import { sepolia } from 'viem/chains';
export type { ZamaSDK } from '@zama-fhe/sdk';

// No deployed addresses or contract ABIs exist in Phase 1.
export const targetChain: typeof sepolia = sepolia;
export const deploymentStatus = 'not-deployed' as const;

export {
  arenaAbi,
  arenaContentHash,
  arenaEncryptionRequest,
  arenaKeyCommitment,
  arenaRulesHash,
  arenaTermsHash,
  hashArenaQuestion,
  maxArenaRoundId,
  packArenaAnswers,
  type ArenaConfig,
} from './arena.js';
