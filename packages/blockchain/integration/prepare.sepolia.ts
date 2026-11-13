import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import {
  createPublicClient,
  encodeDeployData,
  formatEther,
  getAddress,
  http,
  keccak256,
  parseAbi,
  toFunctionSelector,
  toHex,
  type Abi,
  type Hex,
} from 'viem';
import { sepolia } from 'viem/chains';
import { sepolia as fheSepolia } from '@zama-fhe/sdk/chains';
import {
  AGGREGATE_CAP_WEI,
  BUDGET_LEDGER,
  MAX_FEE_PER_GAS_WEI,
  REVIEWED_OPERATOR,
  readBudgetLedger,
} from '../../../contracts/scripts/sepolia-policy.js';
import { maskImmutables, required } from './support.js';
import {
  CREATION_HASH,
  DEPLOYMENT_TRANSACTION,
  SCORING_ADDRESS,
  assertReviewedDeployment,
  integrationCeilings,
  scoringAbi,
} from './reviewed-deployment.js';

// Read-only: no wallet/SDK construction, key access, signing, writes or reservations.
// Approval flags are neither read nor set. Never dump raw RPC errors.
async function main() {
  let stage = 'configuration';
  try {
    const rpc = required(process.env, 'SEPOLIA_RPC_URL');
    assert.equal(new URL(rpc).protocol, 'https:');
    assertReviewedDeployment(
      process.env.CIPHERQUIZ_SEPOLIA_ADDRESS ?? SCORING_ADDRESS,
    );
    assert.ok(!existsSync(`${BUDGET_LEDGER}.lock`), 'Budget ledger is locked');
    const before = await readFile(BUDGET_LEDGER);
    const budget = readBudgetLedger();
    const ceilings = integrationCeilings(MAX_FEE_PER_GAS_WEI);
    assert.equal(budget.entries.length, 1, 'Reconcile unexpected reservations');
    assert.equal(budget.entries[0]?.operation, 'deployment');
    assert.equal(budget.remainingWei, 18727139600000000n);
    assert.ok(ceilings.total <= budget.remainingWei);
    const client = createPublicClient({
      chain: sepolia,
      transport: http(rpc, { timeout: 30000, retryCount: 0 }),
    });
    stage = 'chain and receipt';
    assert.equal(await client.getChainId(), 11155111);
    const receipt = await client.getTransactionReceipt({
      hash: DEPLOYMENT_TRANSACTION,
    });
    const transaction = await client.getTransaction({
      hash: DEPLOYMENT_TRANSACTION,
    });
    assert.equal(receipt.status, 'success');
    assert.ok(receipt.contractAddress);
    assert.equal(getAddress(receipt.contractAddress), SCORING_ADDRESS);
    assert.equal(getAddress(transaction.from), REVIEWED_OPERATOR);
    assert.equal(transaction.to, null);
    assert.equal(transaction.chainId, 11155111);
    assert.equal(transaction.nonce, 0);
    assert.equal(transaction.value, 0n);
    assert.equal(transaction.maxFeePerGas, MAX_FEE_PER_GAS_WEI);
    assert.equal(
      budget.reservedWei,
      transaction.gas * transaction.maxFeePerGas,
    );
    const actualFee = receipt.gasUsed * receipt.effectiveGasPrice;
    assert.ok(actualFee <= budget.reservedWei);

    stage = 'source, compiler ABI and deployment calldata';
    const directory = new URL(
      '../../../contracts/artifacts/src/CipherQuizScoring.sol/',
      import.meta.url,
    );
    const artifact = JSON.parse(
      await readFile(new URL('CipherQuizScoring.json', directory), 'utf8'),
    ) as {
      abi: Abi;
      bytecode: Hex;
      deployedBytecode: Hex;
    };
    const dbg = JSON.parse(
      await readFile(new URL('CipherQuizScoring.dbg.json', directory), 'utf8'),
    ) as { buildInfo: string };
    const build = JSON.parse(
      await readFile(
        new URL(dbg.buildInfo.replaceAll('\\', '/'), directory),
        'utf8',
      ),
    ) as {
      solcVersion: string;
      input: {
        sources: Record<string, { content: string }>;
        settings: {
          optimizer: { enabled: boolean; runs: number };
          evmVersion: string;
        };
      };
      output: {
        contracts: Record<
          string,
          Record<
            string,
            {
              abi: Abi;
              evm: {
                deployedBytecode: {
                  immutableReferences: Record<
                    string,
                    { start: number; length: number }[]
                  >;
                };
              };
            }
          >
        >;
      };
    };
    assert.equal(build.solcVersion, '0.8.27');
    assert.deepEqual(build.input.settings.optimizer, {
      enabled: true,
      runs: 800,
    });
    assert.equal(build.input.settings.evmVersion, 'cancun');
    for (const source of [
      'src/CipherQuizScoring.sol',
      'src/CipherQuizFoundation.sol',
    ]) {
      assert.equal(
        build.input.sources[source]?.content,
        await readFile(
          new URL(`../../../contracts/${source}`, import.meta.url),
          'utf8',
        ),
      );
    }
    const compiled =
      build.output.contracts['src/CipherQuizScoring.sol']?.CipherQuizScoring;
    assert.ok(compiled);
    assert.deepEqual(artifact.abi, compiled.abi);
    for (const item of scoringAbi) {
      if (item.type !== 'function') continue;
      const match = artifact.abi.find(
        (candidate) =>
          candidate.type === 'function' && candidate.name === item.name,
      );
      assert.ok(match && match.type === 'function');
      assert.equal(toFunctionSelector(item), toFunctionSelector(match));
      assert.deepEqual(
        item.outputs.map((output) => output.type),
        match.outputs.map((output) => output.type),
      );
    }
    assert.equal(keccak256(artifact.bytecode), CREATION_HASH);
    assert.equal(
      transaction.input,
      encodeDeployData({
        abi: artifact.abi,
        bytecode: artifact.bytecode,
        args: [REVIEWED_OPERATOR],
      }),
    );

    stage = 'runtime, operator and untouched round state';
    const block = await client.getBlock({ blockTag: 'latest' });
    const finalized = await client.getBlock({ blockTag: 'finalized' });
    const code = await client.getCode({
      address: SCORING_ADDRESS,
      blockNumber: block.number,
    });
    assert.ok(code && code !== '0x');
    assert.equal(
      maskImmutables(code, compiled.evm.deployedBytecode.immutableReferences),
      maskImmutables(
        artifact.deployedBytecode,
        compiled.evm.deployedBytecode.immutableReferences,
      ),
    );
    const view = {
      address: SCORING_ADDRESS,
      abi: scoringAbi,
      blockNumber: block.number,
    } as const;
    assert.equal(
      getAddress(
        await client.readContract({ ...view, functionName: 'OPERATOR' }),
      ),
      REVIEWED_OPERATOR,
    );
    assert.equal(
      await client.readContract({
        ...view,
        functionName: 'confidentialProtocolId',
      }),
      10001n,
    );
    const nextRoundId = await client.readContract({
      ...view,
      functionName: 'nextRoundId',
    });
    assert.equal(
      nextRoundId,
      1n,
      'Reconcile pre-existing rounds before first integration',
    );
    const confirmations = block.number - receipt.blockNumber + 1n;
    assert.ok(confirmations >= 2n);

    stage = 'FHE infrastructure configuration';
    const addresses: `0x${string}`[] = [];
    const slot =
      0x9e7b61f58c47dc699ac88507c4f5bb9f121c03808c5676a8078fe583e4649700n;
    for (let index = 0; index < 3; index++) {
      const word = await client.getStorageAt({
        address: SCORING_ADDRESS,
        slot: toHex(slot + BigInt(index), { size: 32 }),
        blockNumber: block.number,
      });
      assert.ok(word);
      addresses.push(getAddress(`0x${word.slice(-40)}`));
    }
    const [acl, executor, kms] = addresses;
    assert.equal(acl, getAddress(fheSepolia.aclContractAddress));
    assert.equal(
      executor,
      getAddress('0x92C920834Ec8941d2C77D188936E1f7A6f49c127'),
    );
    assert.equal(kms, getAddress(fheSepolia.kmsContractAddress));
    const inputVerifier = await client.readContract({
      address: executor,
      abi: parseAbi([
        'function getInputVerifierAddress() view returns (address)',
      ]),
      functionName: 'getInputVerifierAddress',
      blockNumber: block.number,
    });
    assert.equal(
      getAddress(inputVerifier),
      getAddress(fheSepolia.inputVerifierContractAddress),
    );
    for (const address of [...addresses, inputVerifier]) {
      const infrastructureCode = await client.getCode({
        address,
        blockNumber: block.number,
      });
      assert.ok(infrastructureCode && infrastructureCode !== '0x');
    }

    const balance = await client.getBalance({
      address: REVIEWED_OPERATOR,
      blockNumber: block.number,
    });
    const finalizedBalance = await client.getBalance({
      address: REVIEWED_OPERATOR,
      blockNumber: finalized.number,
    });
    const nonce = await client.getTransactionCount({
      address: REVIEWED_OPERATOR,
      blockNumber: block.number,
    });
    const pendingNonce = await client.getTransactionCount({
      address: REVIEWED_OPERATOR,
      blockTag: 'pending',
    });
    assert.equal(nonce, 1);
    assert.equal(pendingNonce, nonce);
    assert.ok(
      balance >= ceilings.operator && finalizedBalance >= ceilings.operator,
    );
    const fees = await client.estimateFeesPerGas();
    assert.ok(
      fees.maxFeePerGas <= MAX_FEE_PER_GAS_WEI &&
        fees.maxPriorityFeePerGas <= MAX_FEE_PER_GAS_WEI,
    );
    assert.ok(before.equals(await readFile(BUDGET_LEDGER)));
    assert.ok(!existsSync(`${BUDGET_LEDGER}.lock`));
    console.info(
      JSON.stringify(
        {
          status: 'read-only-integration-preparation-passed',
          chainId: 11155111,
          contract: SCORING_ADDRESS,
          operator: REVIEWED_OPERATOR,
          deploymentTransaction: DEPLOYMENT_TRANSACTION,
          receiptStatus: receipt.status,
          receiptBlock: receipt.blockNumber.toString(),
          receiptBlockHash: receipt.blockHash,
          gasUsed: receipt.gasUsed.toString(),
          effectiveGasPriceWei: receipt.effectiveGasPrice.toString(),
          actualDeploymentFeeWei: actualFee.toString(),
          actualDeploymentFeeEth: formatEther(actualFee),
          creationHash: CREATION_HASH,
          abiHash: keccak256(toHex(JSON.stringify(artifact.abi))),
          runtimeHash: keccak256(code),
          sourceCompilerAbiAndConstructorVerified: true,
          observedBlock: block.number.toString(),
          finalizedBlock: finalized.number.toString(),
          confirmations: confirmations.toString(),
          nextRoundId: nextRoundId.toString(),
          operatorBalanceEth: formatEther(balance),
          finalizedOperatorBalanceEth: formatEther(finalizedBalance),
          confirmedNonce: nonce,
          pendingNonce,
          acl,
          executor,
          kms,
          inputVerifier,
          suggestedMaxFeePerGasWei: fees.maxFeePerGas.toString(),
          suggestedPriorityFeeWei: fees.maxPriorityFeePerGas.toString(),
          feeCeilingWei: MAX_FEE_PER_GAS_WEI.toString(),
          aggregateCapWei: AGGREGATE_CAP_WEI.toString(),
          aggregateReservedWei: budget.reservedWei.toString(),
          aggregateRemainingWei: budget.remainingWei.toString(),
          aggregateRemainingEth: formatEther(budget.remainingWei),
          perIntegrationWriteCeilingEth: formatEther(ceilings.perTransaction),
          completeIntegrationCeilingEth: formatEther(ceilings.total),
          operatorFundingCeilingEth: formatEther(ceilings.operator),
          playerFundingCeilingEth: formatEther(ceilings.player),
          remainingAfterIntegrationCeilingEth: formatEther(
            budget.remainingWei - ceilings.total,
          ),
          ledgerUnchanged: true,
          evidenceBoundary:
            'No signer, SDK, signature, encryption, KMS request, reservation or broadcast. Player configuration/funding and live cryptographic compatibility remain unverified.',
        },
        null,
        2,
      ),
    );
  } catch {
    throw new Error(
      `Read-only integration preparation failed at ${stage}; sensitive RPC details suppressed.`,
    );
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error
      ? error.message
      : 'Read-only integration preparation failed',
  );
  process.exitCode = 1;
});
