import { verifyPlayerSigner } from './player.js';

// Offline only. No provider, SDK, approval flag or transaction API.
try {
  const address = verifyPlayerSigner(
    process.env.CIPHERQUIZ_PLAYER_PRIVATE_KEY ?? '',
    process.env.CIPHERQUIZ_PLAYER_ADDRESS ?? '',
  );
  console.info(
    JSON.stringify({
      status: 'player-signer-matched',
      address,
      differentFromOperator: true,
      mode: 'offline',
    }),
  );
} catch {
  console.error(
    'Player verification failed: save the player public address and matching test-only signer locally; sensitive details suppressed.',
  );
  process.exitCode = 1;
}
