import assert from 'node:assert/strict';
import { ethers, network } from 'hardhat';
import {
  AGGREGATE_CAP_WEI,
  MAX_FEE_PER_GAS_WEI,
  MAX_GAS_PER_TX,
  assertReviewedOperator,
  readBudgetLedger,
  reserveGasBudget,
} from './sepolia-policy';

// Set the approval flag solely after explicit owner authorization.
// No default key, mnemonic, public RPC, or local deployment fallback.
async function main() {
  assert.equal(
    process.env.CIPHERQUIZ_SEPOLIA_DEPLOY,
    'approved',
    'Deployment disabled. Explicit owner approval is required before setting CIPHERQUIZ_SEPOLIA_DEPLOY=approved.',
  );
  assert.equal(network.name, 'sepolia', 'Sepolia network required');
  let stage = 'configuration';
  try {
    assert.equal(new URL(process.env.SEPOLIA_RPC_URL ?? '').protocol, 'https:');
    const key = process.env.CIPHERQUIZ_OPERATOR_PRIVATE_KEY;
    assert.ok(
      key && /^0x[0-9a-fA-F]{64}$/.test(key),
      'Operator signer unavailable',
    );
    const budgetValue = process.env.CIPHERQUIZ_MAX_TOTAL_GAS_COST_WEI;
    const feeValue = process.env.CIPHERQUIZ_MAX_FEE_PER_GAS_WEI;
    assert.ok(budgetValue && /^[1-9][0-9]*$/.test(budgetValue));
    assert.ok(feeValue && /^[1-9][0-9]*$/.test(feeValue));
    const budget = BigInt(budgetValue);
    assert.ok(
      budget <= AGGREGATE_CAP_WEI,
      'Invocation budget exceeds aggregate cap',
    );
    const maxFeePerGas = BigInt(feeValue);
    assert.ok(
      maxFeePerGas <= MAX_FEE_PER_GAS_WEI,
      'Reviewed fee ceiling exceeded',
    );
    const signer = new ethers.Wallet(key, ethers.provider);
    assertReviewedOperator(signer.address);
    assertReviewedOperator(process.env.CIPHERQUIZ_OPERATOR_ADDRESS ?? '');
    stage = 'Sepolia and FHEVM infrastructure preflight';
    assert.equal((await ethers.provider.getNetwork()).chainId, 11155111n);
    // These addresses are pinned by the installed Solidity 0.11.1 configuration.
    // Verify all have code before broadcasting. Integration additionally checks SDK parity.
    for (const address of [
      '0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D',
      '0x92C920834Ec8941d2C77D188936E1f7A6f49c127',
      '0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A',
    ])
      assert.notEqual(await ethers.provider.getCode(address), '0x');
    assert.equal(
      signer.address,
      ethers.getAddress(process.env.CIPHERQUIZ_OPERATOR_ADDRESS ?? ''),
      'Signer must match the public address reviewed for approval',
    );
    const executor = new ethers.Contract(
      '0x92C920834Ec8941d2C77D188936E1f7A6f49c127',
      ['function getInputVerifierAddress() view returns (address)'],
      ethers.provider,
    );
    const inputVerifier: string = await executor.getFunction(
      'getInputVerifierAddress',
    )();
    assert.equal(
      ethers.getAddress(inputVerifier),
      '0xBBC1fFCdc7C316aAAd72E807D9b0272BE8F84DA0',
    );
    assert.notEqual(await ethers.provider.getCode(inputVerifier), '0x');
    const factory = await ethers.getContractFactory(
      'CipherQuizScoring',
      signer,
    );
    assert.equal(
      ethers.keccak256(factory.bytecode),
      '0x4b033120899ac98fde5d0e1f8eded615afd01a48d825fdcc06766f3bd877cbcf',
      'Creation bytecode differs from reviewed deployment',
    );
    const deployment = await factory.getDeployTransaction(signer.address);
    const estimatedGas = await ethers.provider.estimateGas({
      ...deployment,
      from: signer.address,
    });
    const gasLimit = (estimatedGas * 120n + 99n) / 100n;
    assert.ok(gasLimit <= MAX_GAS_PER_TX, 'Transaction gas ceiling exceeded');
    assert.ok(
      (gasLimit + 3n * MAX_GAS_PER_TX) * maxFeePerGas <=
        readBudgetLedger().remainingWei,
      'Deployment plus integration ceilings exceed remaining aggregate budget',
    );
    const fees = await ethers.provider.getFeeData();
    assert.ok(fees.maxFeePerGas && fees.maxPriorityFeePerGas);
    assert.ok(fees.maxFeePerGas <= maxFeePerGas, 'Fee cap exceeded');
    assert.ok(
      fees.maxPriorityFeePerGas <= maxFeePerGas,
      'Priority fee cap exceeded',
    );
    assert.ok(gasLimit * maxFeePerGas <= budget, 'Deployment budget exceeded');
    stage = 'final pre-broadcast checks';
    const balance = await ethers.provider.getBalance(signer.address);
    const finalizedBalance = await ethers.provider.getBalance(
      signer.address,
      'finalized',
    );
    assert.ok(balance >= gasLimit * maxFeePerGas);
    assert.ok(finalizedBalance >= gasLimit * maxFeePerGas);
    const nonce = await ethers.provider.getTransactionCount(
      signer.address,
      'latest',
    );
    const pendingNonce = await ethers.provider.getTransactionCount(
      signer.address,
      'pending',
    );
    assert.equal(nonce, 0, 'Reviewed first deployment requires nonce zero');
    assert.equal(pendingNonce, nonce, 'Pending operator transaction detected');
    assert.equal((await ethers.provider.getNetwork()).chainId, 11155111n);
    console.info(
      JSON.stringify({
        status: 'approved-deployment-preflight-passed',
        chainId: 11155111,
        operator: signer.address,
        confirmedBalanceWei: balance.toString(),
        finalizedBalanceWei: finalizedBalance.toString(),
        nonce,
        pendingNonce,
        gasEstimate: estimatedGas.toString(),
        gasLimit: gasLimit.toString(),
        maxFeePerGasWei: maxFeePerGas.toString(),
        suggestedMaxFeePerGasWei: fees.maxFeePerGas.toString(),
        maxPriorityFeePerGasWei: fees.maxPriorityFeePerGas.toString(),
        maximumCostWei: (gasLimit * maxFeePerGas).toString(),
      }),
    );
    stage = 'approved deployment broadcast';
    const reservation = reserveGasBudget('deployment', gasLimit, maxFeePerGas);
    console.info(
      JSON.stringify({
        budgetReservationId: reservation.id,
        reservedWei: reservation.reservedWei.toString(),
        aggregateRemainingWei: reservation.remainingWei.toString(),
      }),
    );
    const started = Date.now();
    const contract = await factory.deploy(signer.address, {
      nonce,
      gasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
    });
    const transaction = contract.deploymentTransaction();
    assert.ok(transaction);
    console.info(
      JSON.stringify({
        chainId: 11155111,
        transactionHash: transaction.hash,
        status: 'broadcast',
      }),
    );
    stage = 'deployment confirmation';
    const receipt = await transaction.wait(2, 180_000);
    assert.ok(receipt && receipt.status === 1);
    console.info(
      JSON.stringify({
        chainId: 11155111,
        address: await contract.getAddress(),
        operator: signer.address,
        transactionHash: transaction.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        gasEstimate: estimatedGas.toString(),
        gasLimit: gasLimit.toString(),
        receiptStatus: receipt.status,
        nonce: transaction.nonce,
        effectiveGasPriceWei: receipt.gasPrice.toString(),
        reservedWei: reservation.reservedWei.toString(),
        aggregateRemainingWei: readBudgetLedger().remainingWei.toString(),
        elapsedMs: Date.now() - started,
        feeWei: (receipt.gasUsed * receipt.gasPrice).toString(),
      }),
    );
  } catch {
    throw new Error(
      `Deployment failed at ${stage}; sensitive RPC/signing details suppressed.`,
    );
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Deployment failed');
  process.exitCode = 1;
});
