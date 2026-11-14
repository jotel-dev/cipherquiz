// Compile-only assertions against installed public APIs. No SDK is initialized;
// these assertions do not establish wire compatibility with the Hardhat plugin.
import type { EncryptParams, ZamaSDK } from '@zama-fhe/sdk';
import type { createConfig as viemConfig } from '@zama-fhe/sdk/viem';
import type { createConfig as ethersConfig } from '@zama-fhe/sdk/ethers';
import type { Address, Hex } from 'viem';

type Assert<T extends true> = T;
type ScoringInput = {
  values: { type: 'euint64'; value: bigint }[];
  contractAddress: Address;
  userAddress: Address;
};

export type EncryptedInputAPI = Assert<
  ScoringInput extends EncryptParams ? true : false
>;
export type EncryptedOutputAPI = Assert<
  Awaited<ReturnType<ZamaSDK['encrypt']>> extends {
    encryptedValues: readonly Hex[];
    inputProof: Hex;
  }
    ? true
    : false
>;
export type UserDecryptionAPI = Assert<
  { encryptedValue: Hex; contractAddress: Address }[] extends Parameters<
    ZamaSDK['decryption']['decryptValues']
  >[0]
    ? true
    : false
>;
export type ViemAdapterAPI = Assert<
  ReturnType<typeof viemConfig> extends ConstructorParameters<typeof ZamaSDK>[0]
    ? true
    : false
>;
export type EthersAdapterAPI = Assert<
  ReturnType<typeof ethersConfig> extends ConstructorParameters<
    typeof ZamaSDK
  >[0]
    ? true
    : false
>;
