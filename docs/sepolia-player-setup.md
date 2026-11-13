# Separate Sepolia player setup

**Current verified snapshot (2026-11-13, Africa/Lagos):** offline verification passed with **player-signer-matched** for **0xc0a50A4E032b19c905509E8f5EFD35fC7EA82D49**, matching `CIPHERQUIZ_PLAYER_ADDRESS` and differing from the operator. The owner saved these settings in **contracts/.env**; **packages/blockchain/.env is absent**. They were verified securely in place without copying secrets. Ethereum Sepolia chain **11155111** reported **0.05 ETH** at mined block **12126667**, but **0 ETH** at finalized block **12126576**. Latest funding covers the **0.0015 ETH** player ceiling; complete setup readiness is **pending funding finalization** (`player-readonly-not-ready`). Confirmed/pending nonce is **0/0**, and the account has no code. No additional funding is indicated by the mined balance. The strict project cap remains **0.02 ETH** and the unchanged ledger leaves **0.0187271396 ETH**. Both approval flags remain unset. No message or transaction was signed, and no funding, round or integration write was submitted. See [verification](verification.md) for remaining integration configuration blockers.

## Create an independent test wallet privately

1. Create a separate browser profile for CipherQuiz tests. In that profile, install your wallet only through its official website. For MetaMask, follow the [official new-wallet guide](https://support.metamask.io/start/creating-a-new-wallet), choose a completely new wallet and a new recovery phrase, and keep the phrase securely offline. Do not import your regular wallet or the operator wallet, reuse their phrase, or merely add another account under your regular wallet's phrase. Name the new account `CipherQuiz Player — Sepolia Only`.
2. Select Ethereum **Sepolia**, chain **11155111**, in that wallet. Keep this account ordinary (no smart-account upgrade/delegation) for the prepared private-key integration harness. The project cannot programmatically prove a wallet's origin or that it has never been used on another chain: creating it independently is an owner-controlled step. Ethereum's [network guidance](https://ethereum.org/developers/docs/networks/) also discourages account reuse across mainnet and testnets.
3. Copy its **public account address** from the wallet UI. It must differ from operator **0xbE4a3DAABCd4406e75314aC7324411249E0C36a2** and from your regular cryptocurrency wallet. The scoring contract address **0x4b4c204d28D5ee37896278C5fc56d61086f92b53** is a different configuration field, never the player's address.
4. Configure the new account's private key only in your local secret manager or the ignored local environment file below. If using MetaMask's [account key export](https://support.metamask.io/configure/accounts/how-to-export-an-accounts-private-key), perform that step privately in the new test profile. Never send the value or recovery phrase in chat, logs, screenshots or terminal commands. Do not enable screen sharing or recording during private setup. Use the account key, not the recovery phrase. The required representation is `0x` followed by exactly 64 hexadecimal characters.

Creating a wallet is offline account generation; no transaction signature or broadcast is required. The agent does not generate, display or retain a new secret for you. Wallet software and local provisioning necessarily handle the secret privately; this does not require disclosing it in this conversation.

## Configure the existing harness

Prefer a secret manager that injects values directly into the process. For the established ignored-file workflow, privately create/open **packages/blockchain/.env** in your editor, restrict its OS access to your user account, and save the following settings. Do not modify **contracts/.env**, spending allocations or either approval flag as part of player setup. The ignored env file is plaintext at rest, so Git ignore rules are not encryption.

| Variable                        | Value / handling                                                                                                                                                  |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CIPHERQUIZ_PLAYER_ADDRESS`     | The new player's public address, independently copied from its wallet UI. This new public pin is now checked by both the offline verifier and integration runner. |
| `CIPHERQUIZ_PLAYER_PRIVATE_KEY` | The matching new test-only account key, provisioned privately with its required `0x` prefix. This is the harness's existing signer variable name.                 |
| `CIPHERQUIZ_SEPOLIA_ADDRESS`    | Public scoring contract **0x4b4c204d28D5ee37896278C5fc56d61086f92b53**.                                                                                           |

For player setup alone those are sufficient in the new file. Reuse the existing trusted `SEPOLIA_RPC_URL` through secure environment injection or the existing contracts env file for read-only funding checks; do not print or send the URL. The player-only commands do not require copying the operator key. Keep `CIPHERQUIZ_SEPOLIA_TEST` and `CIPHERQUIZ_SEPOLIA_DEPLOY` exactly as they are, unset. Leave fee and total-allocation settings untouched for now.

The file is already ignored by Git. This command checks that rule without exposing contents:

```powershell
git check-ignore packages/blockchain/.env
```

Never display populated env files with `Get-Content`, `type`, `cat`, environment dumps or screenshots. Save the editor buffer before verifying. Tell the agent only **"player setup saved"**, optionally including the public address; never include a secret.

## Offline signer verification first

From the repository root, with securely injected player variables:

```powershell
npm.cmd run verify:sepolia-player -w @cipherquiz/blockchain
```

For explicit local env-file loading:

```powershell
node --env-file=packages/blockchain/.env --import tsx packages/blockchain/integration/verify-player.ts
```

For the owner's current verified configuration, use `--env-file=contracts/.env` instead; no secret needs to be moved or copied.

Expected result: `player-signer-matched`, the wallet's public address, `differentFromOperator: true`, and `mode: offline`. The check validates key format/scalar, independently supplied public address, nonzero address and operator separation. It constructs no provider, accesses no RPC and signs nothing. Failure is sanitized and must be resolved before any transaction. A successful address match does not prove the owner's new-wallet provenance; that remains the manual step above.

## Fund and check the public account without project writes

Use a Sepolia faucet from Ethereum's [official testnet resource list](https://ethereum.org/developers/docs/networks/#sepolia), supplying only the new public address. Request enough Sepolia test ETH to reach at least **0.0015 ETH**. Do not connect your regular cryptocurrency wallet, disclose a recovery phrase/key, buy mainnet ETH for this step, or authorize a signature/transfer. If a faucet requires one, use another address-only route from the official list. The agent will not claim funds or broadcast a funding transaction. No operator-funded transfer is authorized by player setup; any proposed project-funded transfer requires separate approval and budget reconciliation.

Once an incoming faucet transfer has mined, the funding check uses **only the public address and trusted HTTPS RPC**:

```powershell
npm.cmd run check:sepolia-player -w @cipherquiz/blockchain
```

For the current two-file configuration, this explicit loading command reuses existing RPC configuration without editing or copying it:

```powershell
node --env-file=contracts/.env --env-file=packages/blockchain/.env --import tsx packages/blockchain/integration/check-player.sepolia.ts
```

Because the current player configuration is entirely in `contracts/.env`, omit the second `--env-file` argument until that file actually exists. The agent used a sanitized launcher that passed only the public address/RPC to this balance checker.

The check never reads a signer variable, constructs a wallet/SDK, signs or sends anything. It verifies chain **11155111**, latest/finalized block balances, confirmed/provider-pending nonce, ordinary account code and retained project budget. It reports **player-readonly-ready** only when both balances cover **0.0015 ETH**, there is no outgoing activity/pending transaction, and the account has no code. A freshly mined faucet transfer can give sufficient latest balance while finalized balance remains zero; that is **pending finalization**, not fully ready. Repeat only this read-only check later. Reported balances always identify their blocks. Nonce zero cannot prove nonuse on other networks.

Player balance is not the project spending allowance. The unchanged per-player transaction ceiling is **15000000 gas × 0.1 gwei = 0.0015 ETH**; the three proposed integration writes total at most **0.0045 ETH**. The existing deployment reservation remains **0.0012728604 ETH**, leaving **0.0187271396 ETH** aggregate allowance before integration. No reservation is added or released by either player command. Preserve the canonical ignored ledger.

## Final readiness and remaining approval

After the owner saves the new wallet configuration and funding becomes visible, the agent can report only the verified **public address, offline match status, mined/finalized balances, nonce, funding sufficiency and ledger headroom**. Until those values exist, they remain pending. Current test-only provenance also requires the owner's confirmation that an entirely new wallet was used.

Successful player setup still does **not** authorize the live integration command. The complete integration environment and its invocation allocation must be reviewed separately; the existing **0.002 ETH deployment allocation** does not cover the **0.0045 ETH** three-write ceiling. The previously proposed **0.005 ETH** integration allocation remains unconfigured/unapproved. Do not change it during this step. Owner authorization must explicitly cover operator `createRound`, player `submitAnswers`, operator `finalizeRound` and SDK-required offchain signatures. Other [integration/KMS limitations](sepolia-integration-preparation.md) remain unchanged. No deployment, integration write, approval change or automatic retry is implied by this guide.

## Local validation

The targeted blockchain suite passes **15 tests**, including independent player-address matching, operator reuse/mismatched-address rejection, missing/malformed/out-of-range key rejection with sanitized errors, exact fee-threshold arithmetic and pending finalized funding. Player tooling and integration code typecheck. Live player signer/funding verification awaits the local setup; these tests use disposable in-memory accounts and do not sign or contact Sepolia.
