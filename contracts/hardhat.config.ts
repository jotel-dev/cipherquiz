import '@fhevm/hardhat-plugin';
import '@nomicfoundation/hardhat-ethers';
import type { HardhatUserConfig } from 'hardhat/config';

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  solidity: {
    version: '0.8.27',
    settings: {
      evmVersion: 'cancun',
      optimizer: { enabled: true, runs: 800 },
    },
  },
  paths: {
    sources: './src',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
  networks: {
    hardhat: { chainId: 31337 },
    // No automatic account loading; the separate deployment script requires approval.
    sepolia: {
      chainId: 11155111,
      url: process.env.SEPOLIA_RPC_URL ?? '',
      accounts: [],
    },
  },
};
export default config;
