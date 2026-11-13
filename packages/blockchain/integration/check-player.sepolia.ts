import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createPublicClient, formatEther, http } from 'viem';
import { sepolia } from 'viem/chains';
import {
  AGGREGATE_CAP_WEI,
  BUDGET_LEDGER,
  MAX_FEE_PER_GAS_WEI,
  readBudgetLedger,
} from '../../../contracts/scripts/sepolia-policy.js';
import { integrationCeilings } from './reviewed-deployment.js';
import { assertPlayerAddress, playerFundingReadiness } from './player.js';

// Public address + RPC only. No key access, signer/SDK construction or write API.
async function main() {
  let stage = 'public configuration';
  try {
    const address = assertPlayerAddress(
      process.env.CIPHERQUIZ_PLAYER_ADDRESS ?? '',
    );
    const rpc = process.env.SEPOLIA_RPC_URL ?? '';
    assert.equal(new URL(rpc).protocol, 'https:');
    assert.ok(
      existsSync(BUDGET_LEDGER) && !existsSync(`${BUDGET_LEDGER}.lock`),
    );
    const journal = await readFile(BUDGET_LEDGER);
    const budget = readBudgetLedger();
    const ceilings = integrationCeilings(MAX_FEE_PER_GAS_WEI);
    assert.ok(budget.remainingWei >= ceilings.total);
    const client = createPublicClient({
      chain: sepolia,
      transport: http(rpc, { timeout: 30000, retryCount: 0 }),
    });
    stage = 'Sepolia identity and funding';
    assert.equal(await client.getChainId(), 11155111);
    const block = await client.getBlock({ blockTag: 'latest' });
    const finalized = await client.getBlock({ blockTag: 'finalized' });
    const balance = await client.getBalance({
      address,
      blockNumber: block.number,
    });
    const finalizedBalance = await client.getBalance({
      address,
      blockNumber: finalized.number,
    });
    const nonce = await client.getTransactionCount({
      address,
      blockNumber: block.number,
    });
    const pendingNonce = await client.getTransactionCount({
      address,
      blockTag: 'pending',
    });
    const code = await client.getCode({ address, blockNumber: block.number });
    const noOutgoingActivity = nonce === 0 && pendingNonce === 0;
    const ordinaryAccount = !code || code === '0x';
    const funding = playerFundingReadiness(
      balance,
      finalizedBalance,
      ceilings.player,
    );
    const ready =
      funding.sufficientLatestBalance &&
      funding.sufficientFinalizedBalance &&
      noOutgoingActivity &&
      ordinaryAccount;
    assert.ok(journal.equals(await readFile(BUDGET_LEDGER)));
    assert.ok(!existsSync(`${BUDGET_LEDGER}.lock`));
    console.info(
      JSON.stringify(
        {
          status: ready ? 'player-readonly-ready' : 'player-readonly-not-ready',
          address,
          chainId: 11155111,
          observedBlock: block.number.toString(),
          finalizedBlock: finalized.number.toString(),
          balanceWei: balance.toString(),
          balanceEth: formatEther(balance),
          finalizedBalanceWei: finalizedBalance.toString(),
          finalizedBalanceEth: formatEther(finalizedBalance),
          confirmedNonce: nonce,
          pendingNonce,
          noOutgoingActivity,
          ordinaryAccount,
          maximumPlayerTransactionFeeEth: formatEther(ceilings.player),
          ...funding,
          shortfallWei: funding.shortfallWei.toString(),
          aggregateCapEth: formatEther(AGGREGATE_CAP_WEI),
          aggregateReservedEth: formatEther(budget.reservedWei),
          aggregateRemainingEth: formatEther(budget.remainingWei),
          ledgerUnchanged: true,
          evidenceBoundary:
            'Funding/account checks only; run offline signer verification separately. Fresh nonces cannot prove the wallet has never been used elsewhere. No signature or transaction.',
        },
        null,
        2,
      ),
    );
    if (!ready) process.exitCode = 1;
  } catch {
    throw new Error(
      `Read-only player check failed at ${stage}; sensitive RPC details suppressed.`,
    );
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Read-only player check failed',
  );
  process.exitCode = 1;
});
