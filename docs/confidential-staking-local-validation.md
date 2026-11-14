# Confidential staking local validation

Reviewed **2026-11-14 (Africa/Lagos)** on branch **`feat/erc7984-staking-architecture`**, base **`74b43e0`**. See the [implementable architecture and staged gates](confidential-staking-architecture.md). These are local-only experiments, **not an audited or deployed staking implementation**.

## What actually ran

The official FHEVM Hardhat environment on **31337**, with `fhevm.isMock === true`, executed the actual pinned **OZ Confidential Contracts 0.5.3** token implementation and custom local fixtures. No external Ethereum RPC, live wallet, SDK/KMS session, Sepolia transfer/deployment, wrap/mint/faucet request or permit occurred in this phase. Local mock ciphertexts/proofs and disposable Hardhat accounts are not real cryptographic/network validation.

- [ConfidentialTokenLab](../contracts/src/lab/ConfidentialTokenLab.sol): inherits the pinned ERC7984; unrestricted public test mint and a local-only blocked-recipient zero-transfer switch. Neither control is an upstream API or suitable for production.
- [ScoringForVaultLab](../contracts/src/lab/ScoringForVaultLab.sol): new local derived deployment of the unchanged V1 scoring logic; adds a fixed vault-only transient score handoff for finalized ten-question rounds. It does not upgrade the deployed Sepolia contract or implement production activation/funding gates.
- [ConfidentialStakeVaultLab](../contracts/src/lab/ConfidentialStakeVaultLab.sol): actual-token callback credit, encrypted menu/balance/liquidity admission, one principal plus one house-stake reservation, encrypted tier computation, single settlement and actual-transfer withdrawal reconciliation. Refunds, production factory binding, admission-masked scoring, house exits, incident policy and pause controls are **not implemented**.

All three lab constructors reject chains other than 31337. The test suite also requires the named Hardhat network and mock mode before constructing any fixtures. No live runner, automatic deployment or application address configuration was added. The test-only unrestricted token, one-time configurer and reduced lifecycle must never be promoted as a production vault.

## Executed assertions

The [13-case staking suite](../contracts/test/staking-lab.test.ts) checks:

1. For **0, 6, 7, 8, 9 and 10 correct out of ten**, real local encrypted scoring plus the score handoff yields the exact 0x/1.2x/1.5x/2x **total return**. On 25 tokens the returns are **0, 0, 30, 37.5, 37.5, 50**. Each checks player/house books and asset/liability conservation before/after settlement, plus duplicate-claim rejection.
2. Insufficient token deposits credit the actual encrypted zero, not the request. Spoofed direct receiver calls and unauthorized house-deposit labels revert atomically without taking tokens.
3. Oversized/foreign-account withdrawals cannot consume another user's credit. A fixture-induced zero outgoing transfer restores the selected credit, and a successful withdrawal debits exactly the actual token movement. The fixture does not claim arbitrary fee/rebase/hook-token compatibility.
4. The token's operator flow rejects unauthorized spending, permits the authorized operator to spend from the holder after approval, and rejects after expiry. Vault push deposits themselves require no standing operator approval.
5. Maximum-uint64/invalid menu amounts are masked before economic arithmetic; inadequate player credit and exhausted house liquidity create encrypted zero stake, preserving balances. Two tickets cannot allocate the same one-stake house reserve.
6. Four-question, already-submitted/finalized and expired rounds cannot acquire a paid ticket. Wrong target input proof, premature settlement and scorer reconfiguration fail.
7. Only the player can user-decrypt its payout; stranger, publisher, house and public decryption fail. The vault retains no persistent access to the original score after transient settlement, while the payout remains player-readable.
8. The unchanged V1 scorer cannot complete the new settlement handshake, and a failed settlement rolls back its closed marker. This is migration evidence, not an attempt against the live contract.

Aggregate conservation assertions use the official **local debugger**, deliberately bypassing ACL to inspect local fixture assets/books. Separate user-decryption tests enforce ACL. No debugger call was made against a live network. The suite covers both successful and encrypted-zero transfers; partial-transfer, malicious hook/reentrancy fuzzing, refunds and production lifecycle races remain future work.

## Dependency and API validation

Exact additions to `contracts/package.json` and `package-lock.json` are **@openzeppelin/confidential-contracts 0.5.3**, **@openzeppelin/contracts 5.6.1**, **@openzeppelin/contracts-upgradeable 5.6.1**. Npm official package metadata and the tagged upstream source confirmed their FHEVM peer **0.11.1** and Solidity compatibility. Installation used `--save-exact --ignore-scripts --no-audit --no-fund`. No existing dependency version was upgraded; no advisory audit was run.

[staking-api-compatibility.ts](../packages/blockchain/src/staking-api-compatibility.ts) compiles against the installed public SDK's callback transfer, timed operator approval, exact underlying approval option and wrapper factory. No SDK object or wallet call is constructed by those assertions. These checks do not prove wire compatibility with a particular official wrapper deployment; that is a later gate.

## Local planning metrics and limits

One local mock 10/10 settlement measured **450007 gas**, **3071032 global HCU**, **1569000 maximum HCU depth**, excluding deposit, admission, answer submission and withdrawal. The existing ten-answer scoring suite separately reports **4840352 global HCU** and **1158032 depth**. Values are local toolchain/cost-model measurements, not a Sepolia gas estimate, fee quote, proof-generation/decryption benchmark or production capacity assertion. Target network limits, complete-ten-question costs and actual token-wrapper behavior must be measured before any future live approval.

An initial test failure came from passing a transaction hash to `computeTransactionHCU`; the installed API requires the receipt. This was corrected without weakening any financial assertion. Solhint's required documentation/name warnings were fixed. **`npm run check` passed** all builds, workspace typechecks, ESLint/Solhint, formatting and **56 tests**: **3 API, 4 frontend, 22 blockchain and 27 Hardhat** (14 prior scoring/toolchain plus 13 new staking cases). This includes the expanded exact-deadline/insufficient-credit assertions. No failures or skips remain. See [verification](verification.md).

## Unchanged live evidence and stop

The [existing 2/4 Sepolia/KMS result](sepolia-round-1-decryption.md) remains valid evidence for its four-question token-free fixture. It is not relabelled as a paid ten-question result. Offline recompilation retained original V1 creation hash **0x4b033120899ac98fde5d0e1f8eded615afd01a48d825fdcc06766f3bd877cbcf** and ABI hash **0x5d23326a0b9c4968960381e6694d1662e19320c83f1bcdb946e478d789f23a18**. V1/foundation/spending-policy source diffs are empty. Existing package versions, resolved URLs and integrity hashes match the base lockfile; only the three expected exact OZ packages were added.

The canonical journal matches the previous reviewed four-line snapshot **byte-for-byte**, both approval flags are unset and no lock exists. Remaining aggregate allowance is still **0.0182746774 ETH** under the **0.02 ETH** cap; no local test reservation is written there. A bounded configured-secret scan of **12 changed source/documentation/manifest files and 72 generated files** found zero matches (including configured private keys without their prefix). This is not a guarantee covering every possible secret format or all Git history. The temporary local audit was removed. Final formatting/diff and feature-branch synchronization are checked before stopping.

No claim is made that the protocol, dependencies, vault or test fixtures have been audited. **Stop after design/local validation. No live execution or merge is authorized.**
