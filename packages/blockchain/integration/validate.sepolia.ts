import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { privateKeyToAccount } from 'viem/accounts';
import { formatEther } from 'viem';
import { sepolia as fheSepolia } from '@zama-fhe/sdk/chains';
import {
  AGGREGATE_CAP_WEI,
  BUDGET_LEDGER,
  assertReviewedOperator,
  readBudgetLedger,
} from '../../../contracts/scripts/sepolia-policy.js';
import { readIntegrationConfig } from './support.js';
import { integrationCeilings } from './reviewed-deployment.js';

// Offline configuration validation only; never import the live test or create SDKs.
try {
  assert.ok(
    !process.env.CIPHERQUIZ_SEPOLIA_TEST &&
      !process.env.CIPHERQUIZ_SEPOLIA_DEPLOY,
  );
  const settings = readIntegrationConfig(process.env);
  const operator = privateKeyToAccount(settings.operatorKey).address;
  const player = privateKeyToAccount(settings.playerKey).address;
  assertReviewedOperator(operator);
  const ceilings = integrationCeilings(settings.maxFeePerGas);
  assert.equal(
    settings.totalGasBudget,
    ceilings.total,
    'Prepared allocation must equal the three-write maximum',
  );
  assert.ok(!existsSync(`${BUDGET_LEDGER}.lock`));
  const before = readFileSync(BUDGET_LEDGER);
  const budget = readBudgetLedger();
  assert.equal(budget.remainingWei, 18727139600000000n);
  assert.ok(settings.totalGasBudget <= budget.remainingWei);
  assert.ok(before.equals(readFileSync(BUDGET_LEDGER)));
  console.info(
    JSON.stringify(
      {
        status: 'integration-config-validated-no-approval',
        operator,
        player,
        contract: settings.address,
        chainId: 11155111,
        invocationAllocationWei: settings.totalGasBudget.toString(),
        invocationAllocationEth: formatEther(settings.totalGasBudget),
        feeCeilingWei: settings.maxFeePerGas.toString(),
        perTransactionCeilingEth: formatEther(ceilings.perTransaction),
        maximumOperatorFeesEth: formatEther(ceilings.operator),
        maximumPlayerFeeEth: formatEther(ceilings.player),
        aggregateCapEth: formatEther(AGGREGATE_CAP_WEI),
        aggregateRemainingEth: formatEther(budget.remainingWei),
        approvalFlagsUnset: true,
        ledgerUnchanged: true,
        reservationCreated: false,
        mode: 'offline-no-signature',
        proposedDecryptionPermit: {
          primaryType: 'UserDecryptRequestVerification',
          domainName: 'Decryption',
          domainVersion: '1',
          chainId: 11155111,
          verifyingContract: fheSepolia.verifyingContractAddressDecryption,
          allowedContracts: [settings.address],
          defaultLifetimeDays: 30,
          expectedSignerRoles: ['player', 'operator', 'ephemeral-stranger'],
          delegation: false,
          transportKeyGenerationRequiresEthereumSignature: false,
        },
      },
      null,
      2,
    ),
  );
} catch {
  console.error(
    'Offline integration configuration validation failed; sensitive details suppressed. No approval, signature or reservation was created.',
  );
  process.exitCode = 1;
}
