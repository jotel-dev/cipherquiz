import { createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { targetChain } from '@cipherquiz/blockchain';

export const walletConfig = createConfig({
  chains: [targetChain],
  connectors: [injected()],
  transports: {
    [targetChain.id]: http(import.meta.env.VITE_SEPOLIA_RPC_URL || undefined),
  },
});
