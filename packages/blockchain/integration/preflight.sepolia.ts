import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import {
  createPublicClient,
  encodeDeployData,
  formatEther,
  getAddress,
  http,
  keccak256,
  parseAbi,
  type Abi,
  type Hex,
} from 'viem';
import { sepolia } from 'viem/chains';
import { sepolia as fheSepolia } from '@zama-fhe/sdk/chains';
import { required } from './support.js';
import {
  AGGREGATE_CAP_WEI,
  MAX_FEE_PER_GAS_WEI,
  MAX_GAS_PER_TX,
  REVIEWED_OPERATOR,
  assertReviewedOperator,
  readBudgetLedger,
} from '../../../contracts/scripts/sepolia-policy.js';

// Read-only by construction: no wallet, signer, private key, SDK instance or write API.
// Approval flags are neither read nor set. RPC credentials are never printed.
async function main() {
  let stage = 'configuration';
  try {
    const rpc = required(process.env, 'SEPOLIA_RPC_URL');
    assert.equal(new URL(rpc).protocol, 'https:');
    const operator = getAddress(
      process.env.CIPHERQUIZ_OPERATOR_ADDRESS ?? REVIEWED_OPERATOR,
    );
    assertReviewedOperator(operator);
    const feeValue =
      process.env.CIPHERQUIZ_MAX_FEE_PER_GAS_WEI ??
      MAX_FEE_PER_GAS_WEI.toString();
    assert.match(feeValue, /^[1-9][0-9]*$/);
    const feeCap = BigInt(feeValue);
    assert.ok(feeCap <= MAX_FEE_PER_GAS_WEI, 'Reviewed fee ceiling exceeded');
    const budget = readBudgetLedger();
    const client = createPublicClient({
      chain: sepolia,
      transport: http(rpc, { timeout: 30_000, retryCount: 0 }),
    });
    stage = 'network identity';
    assert.equal(await client.getChainId(), 11155111);
    assert.equal(fheSepolia.id, 11155111);
    const acl = getAddress('0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D');
    const executor = getAddress('0x92C920834Ec8941d2C77D188936E1f7A6f49c127');
    const kms = getAddress('0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A');
    // Confirm these pinned addresses are actually present in the installed Solidity config.
    const require = createRequire(import.meta.url);
    const source = await readFile(
      require.resolve('@fhevm/solidity/config/ZamaConfig.sol'),
      'utf8',
    );
    const config = source
      .split('function _getSepoliaConfig()')[1]
      ?.split('function _getLocalProtocolId()')[0];
    assert.ok(config);
    for (const address of [acl, executor, kms])
      assert.ok(config.includes(address));
    assert.equal(acl, getAddress(fheSepolia.aclContractAddress));
    assert.equal(kms, getAddress(fheSepolia.kmsContractAddress));
    stage = 'live protocol configuration';
    const inputVerifier = getAddress(
      await client.readContract({
        address: executor,
        abi: parseAbi([
          'function getInputVerifierAddress() view returns (address)',
        ]),
        functionName: 'getInputVerifierAddress',
      }),
    );
    assert.equal(
      inputVerifier,
      getAddress(fheSepolia.inputVerifierContractAddress),
    );
    const codeHashes: Record<string, Hex> = {};
    for (const address of [acl, executor, kms, inputVerifier]) {
      const code = await client.getCode({ address });
      assert.ok(code && code !== '0x');
      codeHashes[address] = keccak256(code);
    }
    const block = await client.getBlock({ blockTag: 'latest' });
    const finalizedBlock = await client.getBlock({ blockTag: 'finalized' });
    const balance = await client.getBalance({
      address: operator,
      blockNumber: block.number,
    });
    const finalizedBalance = await client.getBalance({
      address: operator,
      blockNumber: finalizedBlock.number,
    });
    const confirmedNonce = await client.getTransactionCount({
      address: operator,
      blockNumber: block.number,
    });
    const pendingNonce = await client.getTransactionCount({
      address: operator,
      blockTag: 'pending',
    });
    const fees = await client.estimateFeesPerGas();
    const artifact = JSON.parse(
      await readFile(
        new URL(
          '../../../contracts/artifacts/src/CipherQuizScoring.sol/CipherQuizScoring.json',
          import.meta.url,
        ),
        'utf8',
      ),
    ) as { abi: Abi; bytecode: Hex };
    let deployment;
    if (operator) {
      stage = 'unsigned deployment estimate';
      assert.notEqual(operator, '0x0000000000000000000000000000000000000000');
      const data = encodeDeployData({
        abi: artifact.abi,
        bytecode: artifact.bytecode,
        args: [operator],
      });
      const estimatedGas = await client.estimateGas({
        account: operator,
        data,
      });
      const gasLimit = (estimatedGas * 120n + 99n) / 100n;
      assert.ok(gasLimit <= MAX_GAS_PER_TX, 'Deployment gas ceiling exceeded');
      assert.ok(
        (gasLimit + 3n * MAX_GAS_PER_TX) * feeCap <= budget.remainingWei,
        'Deployment plus integration ceilings exceed remaining aggregate budget',
      );
      assert.ok(
        fees.maxFeePerGas <= feeCap,
        'Suggested fee exceeds planning cap',
      );
      deployment = {
        operator,
        constructorArguments: [operator],
        valueWei: '0',
        estimatedGas: estimatedGas.toString(),
        gasLimit: gasLimit.toString(),
        estimatedCostEth: formatEther(estimatedGas * fees.maxFeePerGas),
        balanceEth: formatEther(balance),
        finalizedBalanceEth: formatEther(finalizedBalance),
        planningFeeCapWei: feeCap.toString(),
        maximumGasLiabilityEth: formatEther(gasLimit * feeCap),
        deploymentPlusIntegrationCeilingEth: formatEther(
          (gasLimit + 3n * MAX_GAS_PER_TX) * feeCap,
        ),
        sufficientBalanceAtPlanningCap: balance >= gasLimit * feeCap,
        sufficientFinalizedBalanceAtPlanningCap:
          finalizedBalance >= gasLimit * feeCap,
        sufficientBalanceAtSuggestedFee:
          balance >= gasLimit * fees.maxFeePerGas,
      };
    }
    console.info(
      JSON.stringify(
        {
          status: 'read-only-preflight-passed',
          chainId: 11155111,
          protocolId: 10001,
          observedBlock: block.number.toString(),
          observedBlockHash: block.hash,
          observedTimestamp: block.timestamp.toString(),
          finalizedBlock: finalizedBlock.number.toString(),
          finalizedBlockHash: finalizedBlock.hash,
          finalizedTimestamp: finalizedBlock.timestamp.toString(),
          confirmedOperatorNonce: confirmedNonce,
          pendingOperatorNonce: pendingNonce,
          acl,
          executor,
          kms,
          inputVerifier,
          codeHashes,
          artifactCreationHash: keccak256(artifact.bytecode),
          suggestedMaxFeePerGasWei: fees.maxFeePerGas.toString(),
          suggestedPriorityFeeWei: fees.maxPriorityFeePerGas.toString(),
          aggregateCapWei: AGGREGATE_CAP_WEI.toString(),
          aggregateReservedWei: budget.reservedWei.toString(),
          aggregateRemainingWei: budget.remainingWei.toString(),
          maxGasPerTransaction: MAX_GAS_PER_TX.toString(),
          integrationThreeWriteCeilingEth: formatEther(
            3n * MAX_GAS_PER_TX * feeCap,
          ),
          deployment:
            deployment ??
            'blocked: public CIPHERQUIZ_OPERATOR_ADDRESS unavailable',
          evidenceBoundary:
            'Read-only deployment estimate only. Integration gas remains provisional until a scoring contract exists. No signer configured/verified by this command; FHE and KMS not tested.',
        },
        null,
        2,
      ),
    );
  } catch {
    throw new Error(
      `Read-only Sepolia preflight failed at ${stage}; sensitive RPC details suppressed.`,
    );
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Read-only preflight failed',
  );
  process.exitCode = 1;
});
