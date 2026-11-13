# Verification record

## Single authorized integration stopped after two successful writes (2026-11-13)

The owner explicitly authorized one invocation, three named zero-value writes at **0.0015 ETH each / 0.0045 ETH combined**, under the unchanged **0.02 ETH** aggregate cap, plus reviewed contract-scoped permits of at most 30 days. Fresh offline signer/config checks and read-only chain/deployment/ABI/runtime/infrastructure/finalized-funding/nonce/journal checks passed. Operator/player matched the supplied identities, pre-send nonces **1/1** and **0/0**. Approval existed only in the one child process; no persistent flag was activated.

**`createRound` succeeded**: `0x07ff7fd4acff4e89e457469c7f576ccefc9aecdf278998eb290c60792d0b08e6`, block **12127160**, gas **2137805**, effective price **19 wei/gas**, actual cost **40618295 wei**. **`submitAnswers` succeeded**: `0x767f42afac9cb0f73c7afe69566740fbf94c6d398c3fb23e8d058cb6997ab1b6`, block **12127163**, gas **1432656**, effective price **19 wei/gas**, actual cost **27220464 wei**. Both real SDK-generated nonempty proofs/four ciphertexts were accepted. Independent receipt reconciliation confirms total **67838759 wei = 0.000000000067838759 ETH**. No finalization hash or receipt exists.

The live test reported failure after **85547.865 ms**, following successful duplicate-submission simulation and before finalization. The original sanitized diagnostics did not identify the precise remaining score/ACL/permit/SDK-denial substep. A lingering failed worker was interrupted; process inspection confirmed no matching workers remained. No invocation/transaction/decryption retry or recovery write occurred. No SDK denial success was recorded, and no authorized decryption/expected **2/4** result or independent remote KMS denial is claimed. Player permit issuance remains uncertain; operator/stranger post-finalization permit paths were not reached. This is a failed live test with partial onchain success, not a completed encrypted-scoring verification.

Readback at block **12127182** independently verified round **1**, **Submitted (state 2)**, four questions, nonzero encrypted score, next round ID **2**, contract score access, player/operator denial and no public score decryption. All four keys retained contract access and denied player/public access. Nonces are now operator **2/2**, player **1/1**; balances **0.049999999801547805 / 0.049999999972779536 ETH**. The encrypted computation/storage executed successfully, but plaintext correctness remains unverified. Detailed results and observed limitations are in the [execution report](sepolia-integration-execution.md).

The durable journal has exactly three entries: prior deployment plus **0.0002587127 ETH** create reservation and **0.0001734233 ETH** submit reservation, totaling **0.0017049964 ETH** reserved. Remaining aggregate allowance **0.0182950036 ETH**; lock absent. No reservation/savings was released and no finalize reservation exists. Env file was not edited; persistent/parent flags remain unset. Readback checked env/journal unchanged during reconciliation. No secrets were logged/committed, no spend limit changed and no merge occurred.

Public hash output was made immediate before execution. After the stop, diagnostic stage labels and a scoped-permit-ready marker were added for future diagnosis; no assertion was weakened and no live replay followed. Post-edit blockchain typecheck, targeted ESLint/formatting and **15 local guard/policy tests passed**, without local failures/skips. The **one live test failed** and remains failed. Final bounded configured-secret scan: **144 source files / 45 build/artifact files**, zero matches; journal count/remaining allowance, absent lock and unset flags rechecked. Documentation formatting and diff checks passed. The source edits are test diagnostics only. SDK-local revoke/clear operations do not establish remote permit invalidation; possible issued permits must be treated as potentially valid until expiry under their ACL rights. No extra invalidation action was performed. The original one-invocation authorization is consumed; any future write/signature requires separate approval.

## Final integration readiness; allocation prepared without approval (2026-11-13)

The player's **0.05 Sepolia ETH** is now finalized at block **12126671**, after an initial refresh at finalized block 12126639 still showed zero. Latest player block **12126746** also shows **0.05 ETH**, ordinary account code, confirmed/provider-pending nonce **0/0**, and **player-readonly-ready**. Operator latest block **12126745** and finalized block **12126671** both show **0.0499999998421661 ETH**, nonces **1/1**. Chain **11155111**, pinned scoring deployment **0x4b4c204d28D5ee37896278C5fc56d61086f92b53**, receipt/ABI/runtime/operator/infrastructure and next round ID **1** all passed read-only checks. Offline configuration validation independently derived the supplied operator/player identities without signing.

Under the owner's explicit preparation scope, exactly two public fields in the existing ignored **contracts/.env** were prepared: `CIPHERQUIZ_SEPOLIA_ADDRESS` set to the deployed target and `CIPHERQUIZ_MAX_TOTAL_GAS_COST_WEI` set to **4500000000000000 (0.0045 ETH)**. The latter replaces the deployment-specific allocation and supersedes the earlier 0.005 ETH proposal. All other bytes, including private signer/RPC fields and approval flags, were preserved. The fee ceiling **0.1 gwei**, gas ceiling **15000000** and aggregate cap **0.02 ETH** are unchanged. No secret was copied/printed. The env file is excluded from Git.

The canonical journal was verified unchanged byte-for-byte, still one deployment reservation of **0.0012728604 ETH**, no lock, and **0.0187271396 ETH** remaining. No active integration reservation was created. Three proposed zero-value writes have individual maxima **0.0015 ETH** and complete maximum **0.0045 ETH**, leaving **0.0142271396 ETH** if all reserve their ceilings. Full role-specific funding requirements (**0.003 ETH operator / 0.0015 ETH player**) are satisfied. Fresh per-transaction estimates remain deferred until a separately authorized invocation has real ciphertext/proofs and intermediate round state.

Added offline `validate:sepolia-integration`: it validates configuration and identities without activating the live-test gate, constructing SDKs or reserving spending. `readSettings` still requires explicit approval before using shared validation. Tests confirm exact-allocation success without a flag, live-gate rejection and one-wei-short failure. The runner now explicitly requests permits only for this scoring contract. Installed SDK source review confirms EIP-712 **UserDecryptRequestVerification**, domain **Decryption/1**, host chain **11155111**, verifying contract **0x5D8BD78e2ea6bbE41f26dFe9fdaEAa349e077478**, one allowed scoring contract, default **30-day** lifetime, normally one initial permit per player/operator/ephemeral stranger. Player reuse is expected. Transport key generation uses the cryptographic runtime without an Ethereum signature. No delegation, wildcard, token approval, personal-message signature or funding is proposed. Exact V1/V2 message fields and capability limitations are in the [readiness approval report](sepolia-integration-readiness.md). SDK ACL rejection remains distinct from unverified remote KMS denial.

**`npm run check` passed** all builds, workspace typechecks, ESLint/Solhint, formatting and **36 local tests** (3 API, 4 frontend, 15 blockchain, 14 Hardhat), no failures/skips. Tests use isolated mock/disposable signers; no authorized-wallet signature or Sepolia transaction occurred. Final bounded configured-secret scan: **143 source files / 45 build/artifact files**, zero matches, allocation/ledger/flags rechecked. Final documentation formatting and diff checks passed. No current advisory audit or clean-install reproduction was attempted. Deployed Solidity, dependencies and spending policy are unchanged.

**Stop pending explicit authorization** for one invocation of the three named writes plus the reviewed contract-scoped 30-day permits. Both execution flags remain unset; the live command, SDK encryption/decryption, permits, active reservations, rounds, retries, funding and merges were not executed. No unverified live cryptographic result is claimed. See the [final readiness report](sepolia-integration-readiness.md); earlier pending-funding/target/allocation sections below are historical.

## Saved player verified offline; funding awaiting finalization (2026-11-13)

The requested `packages/blockchain/.env` offline command initially could not run because that file does not exist on disk. A names-only inventory located both player variables in the owner's ignored **contracts/.env**, with both approval flags unset. The existing offline verifier was then run securely against those values in place: **player-signer-matched**, public player **0xc0a50A4E032b19c905509E8f5EFD35fC7EA82D49**, matching independently configured `CIPHERQUIZ_PLAYER_ADDRESS` and differing from the pinned operator. No secret was printed, copied or rewritten. No signature or provider was used by offline verification.

The public-address-only funding checker independently confirmed Ethereum Sepolia **11155111**, latest mined block **12126667**, balance **50000000000000000 wei = 0.05 ETH**, finalized block **12126576**, finalized balance **0 wei**. Latest funds cover the **0.0015 ETH** maximum player fee with no shortfall. Confirmed/provider-pending nonce **0/0**, ordinary account with no code. Result: **player-readonly-not-ready**, specifically awaiting funding finalization, not more funding. These are block-specific observations, not a provenance attestation or a guarantee of future balance.

The persistent ledger still contains one **0.0012728604 ETH** deployment reservation, leaving **0.0187271396 ETH** within the unchanged **0.02 ETH** cap. Lock absent. The wrapper verified env files and ledger byte-for-byte unchanged. No RPC credential/private key was logged; the RPC child received only public address and RPC configuration, never a signer key. No transaction, round, SDK permit, integration write, funding claim or reservation was executed. Both approval flags remain unset.

Other integration blockers remain: the current environment has no matching `CIPHERQUIZ_SEPOLIA_ADDRESS` configured and its invocation allocation does not cover the **0.0045 ETH** complete-run ceiling. No target/allocation/limit was changed. Separate approval of the three proposed writes and required offchain signatures remains mandatory. Source and dependencies are unchanged; this documentation-only result requires formatting/diff checks rather than a broad test rerun. The [player guide](sepolia-player-setup.md) now records the verified public identity and actual configuration location.

## Separate player setup tooling and owner instructions (2026-11-13)

Prepared the [test-only player setup guide](sepolia-player-setup.md), offline `verify:sepolia-player` and public-address-only `check:sepolia-player` commands. The existing `CIPHERQUIZ_PLAYER_PRIVATE_KEY` now pairs with an independent public `CIPHERQUIZ_PLAYER_ADDRESS` pin, checked by offline verification and the integration runner. Missing/malformed/out-of-range/mismatched keys fail with sanitized errors; the approved operator and zero address cannot be players. No secret values are printed, and neither command needs or sets an approval flag. The funding checker never reads a private-key variable or constructs a signer/SDK, and never reserves or sends funds. It requires Sepolia 11155111 and reports mined/finalized balances, nonce, ordinary account code and retained aggregate headroom. Exact **0.0015 ETH** funding and pending finalization are distinguished.

Local inventory found **no configured player public address or signer**. Player identity/balance/funding readiness are **pending**, not verified or assumed zero. Owner action is required: create a new wallet with its own phrase in a separate profile, privately save the player key and independently copied public address, and obtain/check incoming faucet funding. The agent generated no real player wallet or secret, and requested no secret in chat. A wallet's origin/nonuse as a regular account cannot be proved by address/nonce checks; the owner must create it independently as instructed.

The persistent ledger remains one deployment reservation, **0.0012728604 ETH**, leaving **0.0187271396 ETH** under the unchanged **0.02 ETH** cap. Initial setup inventory verified populated env files and journal unchanged byte-for-byte, with both approval flags unset. No Sepolia signature, transaction, faucet claim, funding transfer, deployed contract change, spending-limit edit or integration command occurred. The existing **0.002 ETH** deployment invocation allocation is untouched; complete integration configuration/allocation and approval of its three writes/offchain signatures remain separate blockers.

Validation: player/integration code typechecked; **15 targeted blockchain tests passed**, including new independent address matching, role isolation, scalar/format errors and funding-boundary tests. Targeted ESLint, formatting and diff checks passed. A final bounded exact-configured-secret scan of **141 source files** found zero matches and rechecked the missing player configuration, retained budget, unset flags and byte-for-byte unchanged env files/journal. Tests use disposable local accounts and do not sign or contact Sepolia. The existing full-check baseline from integration preparation remains historical; no broad rerun was needed for this focused player tooling. Live signer/balance commands await local provisioning. No success status or balance is fabricated for a missing player.

## Read-only integration preparation after deployment (2026-11-13)

Added `npm run prepare:sepolia -w @cipherquiz/blockchain`, a read-only command that constructs no signer or SDK and performs no reservation, signature, proof/KMS request or broadcast. Against Sepolia it independently confirmed receipt success at block **12126360**, cost **8768550 gas × 18 wei/gas = 157833900 wei = 0.0000000001578339 ETH**, exact constructor calldata/operator, reviewed creation hash, current application source/compiler ABI and deployed runtime. The shared function ABI matches the compiler selectors/output types. Current block **12126424** gave **65** confirmations; finalized block **12126355** preceded deployment, so finalized deployment was not claimed. Operator nonces **1/1**, latest/finalized balances **0.0499999998421661/0.05 ETH**, protocol **10001**, next round ID **1**. Infrastructure slot/address/code checks passed.

The unchanged journal has one chain/operator-bound deployment reservation of **0.0012728604 ETH**, equal to the transaction's gas-limit liability. Receipt savings were not released. Remaining aggregate allowance is **0.0187271396 ETH**; the proposed three-write ceiling **0.0045 ETH** leaves **0.0142271396 ETH**. Ledger/lock/approval flags and populated env files were not changed; the temporary launcher verified input files and ledger byte-for-byte unchanged. No Sepolia transaction or permit was signed and no live integration command was invoked.

The existing runner is now pinned to **0x4b4c204d28D5ee37896278C5fc56d61086f92b53** and the reviewed creation hash; it checks full invocation/aggregate/funding headroom before SDK/round creation and checks key public-decryption denial plus operator/outsider score permissions. Added guard regression for exact deployment, role-specific maximum liability, unchanged fee ceiling and insufficient complete-run allocation. Spending ceilings/policy, deployed Solidity and dependencies are unchanged. The public example supplies the deployed address only.

Local readiness remains blocked: no separate player signer or verified funding, no populated integration env/target, and existing deployment allocation **0.002 ETH** cannot cover the full **0.0045 ETH** integration ceiling. Proposed integration allocation remains **0.005 ETH** subject to explicit configuration/approval; none was changed. Current official Zama documentation says the shared Sepolia relayer needs no API key. Installed V1/V2 SDK sources confirm ACL preflight precedes relayer KMS calls; independent remote KMS denial is still unverified. Real proofs, scoring/decryption and live latency/cost remain untested.

Targeted blockchain tests passed **12/12**. A new inferred-address typing error was corrected before full validation. **`npm run check` passed** all builds, workspace typechecks (including SDK compatibility and integration), ESLint/Solhint, formatting and **33 local tests** (3 API, 4 frontend, 12 blockchain, 14 Hardhat), no failures/skips. The full check used the established external execution permission for Vite's directory restriction; it supplied no Sepolia signing environment. Additional final documentation formatting/diff checks passed. A final exact-configured-secret scan of **136 source files and 45 build/artifact files** found zero matches and independently rechecked the single ledger reservation, unchanged remaining allowance, absent lock and unset approval flags. This bounded scan is not a guarantee against every secret format. No new advisory audit or clean dependency installation was attempted. See the [complete approval report](sepolia-integration-preparation.md) for the exact proposed transactions, maxima, missing configuration and signature/KMS limitations. Stop pending secure player setup and separate integration/signature authorization.

## Successful separately approved Sepolia deployment (2026-11-13)

After the owner saved the corrected key prefix, the existing offline verifier passed with **reviewed-signer-matched** and public address **0xbE4a3DAABCd4406e75314aC7324411249E0C36a2**. The owner separately authorized one new deployment attempt, maximum **0.0015 Sepolia ETH** under the unchanged **0.02 ETH** aggregate cap. One `CipherQuizScoring` transaction was submitted and succeeded; no automatic retry or other onchain operation followed.

Contract **0x4b4c204d28D5ee37896278C5fc56d61086f92b53**, transaction **0x9993ceddc07934d098e3b7458b278e2bf90fc8de79f4e2ce4dfedce4cc2429d1**, receipt status **1**, block **12126360**, chain **11155111**, nonce **0**, value **0**. Deployment awaited two confirmations; independent read-only verification observed **7**. Final deployment-path estimate **10607170 gas**, gas limit **12728604**, maximum fee **100000000 wei/gas**, priority **2 wei/gas**. Fresh suggested maximum fee was **34 wei/gas**. Maximum liability **0.0012728604 ETH**, below the approved transaction limit. Actual gas **8768550**, effective price **18 wei/gas**, actual cost **157833900 wei = 0.0000000001578339 ETH**. No attempt errors occurred.

Before broadcast, signer/chain/infrastructure/artifact/funding/nonce/fee/gas/ledger checks all passed. Latest/finalized balance **0.05 ETH**, confirmed/provider-pending nonce **0/0** and zero previous reservations were verified. The durable ledger now has one deployment entry, ID **bbba8b28-7817-4902-bbff-0f62552552b7**, for **1272860400000000 wei**, associated with the approved chain/operator. Conservative remaining budget is **18727139600000000 wei = 0.0187271396 ETH**. No cheaper-receipt difference was released; retain the canonical ignored journal. Lock absent. Post-send balance **0.0499999998421661 ETH**, confirmed/provider-pending nonce **1/1**.

Read-only verification independently checked exact constructor calldata, the reviewed creation-bytecode hash, full runtime against compiler output with only declared immutables masked, immutable operator, protocol ID **10001**, and **nextRoundId 1**. No round/integration transaction was executed. The env file remained unchanged during this attempt; deployment approval existed only in the completed child process and both persistent/parent approval flags remain unset. No secret values were printed. Source/dependencies/limits were unchanged; deployed guard source is **03870d7**. No broad retest was necessary for this documentation-only update; prior guard/security validation remains recorded below. Final formatting and diff checks accompany the Git checkpoint.

The one-attempt authorization is consumed. Stop pending separate owner approval for any further onchain transaction or merge. Live encrypted scoring and KMS claims remain unverified. See the [deployment execution record](sepolia-deployment.md) for complete results. Earlier failed-format and predeployment observations below are historical.

## Requested read-only signer and deployment recheck (2026-11-13)

The owner reported correcting the private-key prefix and requested verification only, explicitly withholding deployment authorization. The existing offline verifier was run with `contracts/.env`; it exited **1** with its sanitized failure message and did **not** report `reviewed-signer-matched`. Local format checks found the saved value still unprefixed. The on-disk env file was byte-for-byte identical to the previous stopped attempt, with no inherited operator-key override. An unsaved editor change is a possible explanation, not an established fact. Separate offline derivation with no provider confirmed the public address remains **0xbE4a3DAABCd4406e75314aC7324411249E0C36a2**; identity matching does not satisfy the required deployment format.

The public-only preflight nevertheless passed: chain **11155111**, mined block **12126229** (`0xa2a970c2575ab1978147927f04930b58eadc0ad0e7b0890267721d19012356b0`), finalized block **12126164** (`0xc6e73f780a6fb1b1cd46afb270f61b81ea0c23066b896b29e24c02943eda5eef`), balance **0.05 Sepolia ETH** at both exact blocks, and confirmed/provider-pending nonce **0/0**. Infrastructure parity/code checks passed; creation-bytecode hash remains the reviewed `0x4b033120899ac98fde5d0e1f8eded615afd01a48d825fdcc06766f3bd877cbcf`.

Fresh unsigned gas estimate **8839309**, rounded-up 20% gas limit **10607171**. Configured fee ceiling **100000000 wei/gas (0.1 gwei)**; current suggested maximum/priority **29/2 wei/gas**, both below it. Maximum deployment gas liability **0.0010607171 ETH**, below the **0.0015 ETH** transaction limit and existing **0.002 ETH** invocation allocation. Deployment plus three integration ceilings remains **0.0055607171 ETH**, below the retained **0.02 ETH** cap. These are planning bounds, not authorization for integration or deployment.

Ledger/lock remain absent: **0 wei reserved**, **0.02 ETH remaining**. Both approval flags were unset. The env file was unchanged during verification. No deployment script, signing, broadcast, integration write or reservation operation was invoked. No secret values were printed. Temporary verification tooling was removed. Source/policy/limits are unchanged. **Deployment remains blocked on saved key-format correction, successful strict offline verification and fresh explicit authorization for another attempt.**

## Approved deployment attempt stopped before broadcast (2026-11-13)

The owner approved one Sepolia `CipherQuizScoring` deployment at **0.0015 ETH** maximum transaction cost under the retained **0.02 ETH** aggregate cap. Final guard update **03870d7** was committed/pushed and passed typechecking, lint and **25 targeted local tests** before the single attempt. Spending limits, Solidity and dependencies were unchanged.

The signer identity matched, but the deployment script stopped at configuration because the private local key representation lacks its required `0x` prefix. The earlier offline verifier accepted that representation through Ethers; it now enforces the same prefix requirement as deployment. No secret value was exposed or rewritten. This corrects the earlier implication that signer matching alone established configuration readiness.

No reservation, signing or broadcast occurred, and there was no retry. Gas estimation/fee checks were not reached; previous estimates remain historical. Post-stop read-only RPC at block **12126167**, chain **11155111**, confirmed **0.05 ETH** balance and **0/0** confirmed/provider-pending nonce. Ledger/lock remain absent; cost/reserved liability **0 ETH**, aggregate allowance **0.02 ETH**. Env file unchanged; both persistent/parent approval flags unset. The deployment approval was scoped only to the terminated child process. See the [execution record](sepolia-deployment.md) for the complete outcome and required next action.

## Final read-only predeployment review (2026-11-13)

The owner reported offline `reviewed-signer-matched` for `0xbE4a3DAABCd4406e75314aC7324411249E0C36a2`. The [final report](sepolia-final-review.md) supersedes historical pending-signer and deployment-estimate statements. No transaction was signed/broadcast, no production reservation was made and neither approval flag changed. The ignored `contracts/.env` remained byte-for-byte unchanged.

The enhanced public-only preflight passed against the configured HTTPS RPC: Ethereum Sepolia chain **11155111**, latest block **12125994** and finalized block **12125909**, both with operator balance **0.05 ETH**. New operator confirmed/provider-pending nonce was **0/0**; the retired operator also returned **0/0** at block **12126002**. Ledger/lock were absent. Infrastructure parity/code checks passed; creation-bytecode hash remained `0x4b033120899ac98fde5d0e1f8eded615afd01a48d825fdcc06766f3bd877cbcf`. No CipherQuiz deployment was created or discovered.

Fresh unsigned deployment estimate: **8839309 gas**; with 20% margin **10607171 gas**. Maximum fee at **0.1 gwei** is **0.0010607171 ETH**; deployment plus three absolute-ceiling integration writes is **0.0055607171 ETH**. Initial four-write attempt plus two full retries at all absolute limits costs at most **0.018 ETH**, within the unchanged **0.02 ETH** aggregate cap. These are bounds, not retry authorization. The scripts' absolute deployment ceiling remains **0.0015 ETH** if a fresh estimate rises.

`npm run check` passed all builds, typechecks, lint, formatting and **32 local tests** (3 API, 4 frontend, 11 blockchain guards/policy, 14 Hardhat), with zero failures/skips. A new ledger regression rejects wrong chain, empty metadata, duplicate IDs, non-positive/fractional amounts and over-cap totals without changing the journal. Existing operator-rotation and cumulative-cap assertions remain intact. Local Hardhat tests use FHE mocks, not real KMS. The first sandboxed check failed at the established Vite/esbuild parent-directory restriction; authorized external execution passed. The first sandboxed RPC request failed; external read-only preflight passed. No live integration/deployment command was run.

Secret scan: **131 tracked/untracked files and 231 reachable Git blob/commit objects**, no configured-secret literals or selected credential patterns; no populated env path in reachable history. Final exact-secret scan: **132 source files and 45 build/artifact files**, zero matches; env file unchanged, both flags unset, ledger/lock absent. Exact values were never printed. These are bounded scans, not absolute absence guarantees. Final formatting and `git diff --check` passed.

The sandboxed npm advisory request failed. Automatic approval review rejected the external retry because it would send private-repository dependency metadata to npm's registry. No bypass was attempted; current advisory status remains unverified pending separate approval. Earlier advisory numbers are historical. Dependencies, lockfile, Solidity and frontend behavior are unchanged; no clean-install reproduction was run.

Deployment awaits explicit approval and fresh execution-time guards. Integration additionally awaits a different funded player, a deployed address and separate authorization. Live proof/circuit/KMS behavior and independent remote KMS denial remain unverified. Local accounting cannot constrain manual sends, ledger deletion or another checkout; any contrary history requires reconciliation under the same project cap.

## Test-only operator rotation (2026-11-12)

The owner replaced the previous wallet with test-only operator `0xbE4a3DAABCd4406e75314aC7324411249E0C36a2`. Deployment, integration, read-only preflight and the offline signer check share this pinned public policy. Both environment examples and the local ignored `contracts/.env` public address were updated. The local edit changed only the fixed-width public address; all other bytes were preserved. No signer secret was parsed or printed. Solidity, frontend logic, dependencies and the **0.02 ETH project-wide aggregate cap** are unchanged.

Read-only requests through the owner's configured HTTPS RPC verified Ethereum Sepolia chain `11155111` and a balance of **0.05 Sepolia ETH (50000000000000000 wei)** at mined block `12118235`. The provider's finalized balance was initially **0 ETH**; a subsequent read-only `eth_getBalance` with the `finalized` block tag confirmed **0.05 ETH**, establishing finalized funding. RPC credentials were used only in memory and were not logged or persisted elsewhere. This verifies the balance, not the provenance of a particular faucet transfer. No deployment estimate for the new operator was requested in this rotation.

Neither `contracts/.sepolia-budget.jsonl` nor its lock exists in this checkout. No production ledger was created, reset or migrated. The existing reader rejects non-current-operator entries; its error now explicitly requires reconciliation without resetting the aggregate cap. A regression test covers both retired-only and mixed-operator journals and checks that a rejected reservation leaves the journal unchanged. The public policy test explicitly rejects the retired wallet and pins the replacement address and unchanged cap.

**Ledger ambiguity:** absence means zero reservations to the local reader, but cannot prove there are no previous liabilities in another checkout or a lost ledger. Earlier records report no transactions. Any contrary history must be reconciled across wallets before deployment; a wallet change does not authorize a fresh 0.02 ETH budget. No historical reservations may be dropped or relabelled to bypass the mismatch guard.

The deployment and integration flags were verified unset. Actual new-signer matching remains pending the owner's confirmation that the test-only signer has been configured locally. The existing offline verifier will not be run before that confirmation. It derives only the public address and signs nothing. Deployment and live integration require separate explicit authorization after signer matching, fresh estimates and ledger-history reconciliation. No Sepolia transaction was signed or broadcast.

Validation: the targeted blockchain suite passed all **10 tests**. The first `npm run check` passed builds, typechecks, lint, formatting and all other tests, but one unchanged Hardhat ciphertext-binding test timed out. That test then passed in isolation without code or timeout changes. A complete rerun of `npm run check` passed all builds, workspace typechecks, ESLint/Solhint, formatting and **31 local tests** (3 API, 4 frontend, 10 blockchain policy/guards, 14 Hardhat), with no failures or skips. `git diff --check` passed. These local mocks do not verify live encrypted scoring or KMS behavior. The earlier sections below retain historical snapshots for the previous operator and do not establish signer matching, balance or gas estimates for the replacement.

## Stage A update: supplied operator and aggregate budget (2026-11-11)

The owner supplied the previous public operator (retired on 2026-11-12), Ethereum Sepolia chain `11155111` and a strict **0.02 ETH aggregate spending cap** (`20000000000000000` wei). These replaced the earlier unknown-address/illustrative-budget state below. This historical configuration was not deployment approval. Both execution flags remained unset; no Sepolia transaction was submitted.

The [current report](sepolia-predeployment.md) and [secure local runbook](sepolia-integration.md) contain the exact constructor, future commands, environment variables and conditional approval checkpoint. Deployment/integration now pin the derived operator independently of environment changes. An offline signer command logs only the public address on success and suppresses signing errors. It currently fails closed because no signer is configured; actual signer ownership/matching is **not yet verified**.

| Check                                                    | Result                                                                                                        |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `npm run check`                                          | Pass: all builds, typechecks, lint/format checks and **30 local tests**, no failures/skips                    |
| Local suite totals                                       | 3 API, 4 existing frontend, 9 orchestration/policy, 14 Hardhat                                                |
| Read-only operator-specific Sepolia preflight            | Pass at block `12112842`, timestamp `1794413724`; protocol address/code checks still pass                     |
| Public operator balance                                  | **0 Sepolia ETH**; funding is required before deployment                                                      |
| Unsigned Sepolia deployment estimate                     | 8839309 gas; 10607171 with 20% margin; no broadcast                                                           |
| Proposed transaction ceilings                            | 0.1 gwei and 15000000 gas; maximum 0.0015 ETH per write                                                       |
| Deployment gas liability at proposed ceiling             | 0.0010607171 ETH using the current estimate/margin                                                            |
| Three integration writes                                 | Provisional mock estimates in the report; enforceable combined ceiling 0.0045 ETH, not a live gas measurement |
| Deployment estimate plus integration ceiling             | 0.0055607171 ETH; below 0.02 ETH aggregate cap                                                                |
| Four writes at absolute ceilings                         | At most 0.006 ETH; retries still consume the same aggregate ledger                                            |
| Offline signer verification                              | Expected failure with no credentials; not counted as a successful signer match                                |
| Production budget ledger                                 | No file/reservation created; 0 wei reserved, 0.02 ETH remaining                                               |
| Frontend, Solidity sources, dependency versions/lockfile | Unchanged                                                                                                     |
| Real scoring, KMS, live negative checks                  | Still unverified; remote KMS denial is not established by SDK preflight                                       |

The shared ignored `contracts/.sepolia-budget.jsonl` reserves maximum gas liabilities before broadcasts, with an exclusive lock and fsync. Successful/failed/uncertain sends all retain their reservation across restarts and retries. Fee/gas ceilings and aggregate exhaustion stop further writes. Unit tests exercise public pinning, persistence across attempts, cap exhaustion without extra writes, stale locks, malformed/truncated journals and above-ceiling gas/fee requests. They use temporary journals, not the production ledger. Keep one canonical checkout; deleting records or bypassing the scripts would invalidate local accounting and requires stopping for reconciliation rather than silently resetting a cap.

The existing four-question mock test reports create/submit/finalize gas for provisional planning; no scoring assertion was removed. Its first measured snapshot was 596872 / 649183 / 69493 gas. Final full-check values were 596860 / 649135 / 69493 as randomized encrypted calldata changed. These are not substituted for live protocol costs: notably the public-address deployment RPC estimate is materially higher than the earlier local estimate. Exact integration estimation remains blocked on an approved scoring deployment and real encrypted inputs, so the report provides an enforced ceiling separately from provisional mock costs.

The full check used the established external execution permission for Vite's parent-directory restriction. Read-only RPC also used external execution permission. No signer, private RPC credential, approval flag, production budget reservation, transaction, staking or payout was introduced. The earlier unchanged-lockfile production advisory check remains zero known production findings; it was not rerun because this update changed no dependencies. Final formatting and diff checks passed.

Remaining: secure local RPC/signer setup, offline verification of the exact operator, funding, a separate player signer, refreshed unsigned estimates and **explicit deployment approval**. Integration writes require separately authorized scope. No transaction-capable script was executed in this update. The records below retain earlier historical evidence.

## Stage A: Sepolia predeployment review (2026-11-11)

Implementation checkpoint `accb8f671466a5ab7a224c9af19e97f3214f35d6` was committed and pushed on `feat/sepolia-fhe-verification`; `git ls-remote` returned the identical remote hash. The branch starts from frontend commit `8ccbcb9`, preserves the existing scoring/frontend work and all pending Sepolia preparation, and changes no Solidity or frontend sources. No main-branch commit, merge, force-push, deployment or other Sepolia transaction occurred.

The current [predeployment report](sepolia-predeployment.md) records the contract review, installed/current official Zama tooling comparison, exact future deployment command, constructor, public-address requirement, fee/budget proposal, secrets boundary and unresolved remote-KMS denial test. The [integration runbook](sepolia-integration.md) describes secure configuration and the separately gated commands. No deployment or live-test approval flag was set during this review.

| Check                                                                  | Stage A result                                                                                                                                                                                           |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check`                                                        | Pass: all five builds, workspace typechecks, ESLint/Solhint, formatting and 26 local tests                                                                                                               |
| Local tests                                                            | 3 API, 4 existing frontend, 5 orchestration guards, 14 Hardhat; zero failures/skips                                                                                                                      |
| `npm audit --omit=dev --json`                                          | Pass: zero known production dependency vulnerabilities                                                                                                                                                   |
| Read-only Sepolia preflight                                            | Pass at block `12112749`: chain `11155111`, SDK/Solidity address parity, executor-resolved input verifier and code presence                                                                              |
| Unsigned local deployment estimate                                     | 1,545,261 gas; margin limit 1,854,314; chain 31337 only, no transaction submitted                                                                                                                        |
| Targeted literal-secret scan                                           | 128 tracked/untracked source files scanned; zero findings for private-key literals, private-key blocks and credential-bearing HTTP authority patterns; limited pattern check, not a general secret audit |
| `git diff --check` and final formatting                                | Pass                                                                                                                                                                                                     |
| Signer-specific Sepolia estimate/balance                               | Blocked: public operator address and secure signer setup unavailable                                                                                                                                     |
| Real encrypted scoring, player KMS decryption and live negative checks | Not run; require explicit Stage B approval and credentials                                                                                                                                               |
| Independent remote KMS denial                                          | Unverified; SDK V1/V2 user-decryption paths check ACL before relayer submission                                                                                                                          |

Changes add read-only preflight, public deployment-address pinning, live duplicate/unauthorized-action simulations requiring exact decoded custom errors, receipt/block/gas/timing diagnostics, and pre-network signer-isolation/scalar/budget checks. Deployment plus a complete integration run would make four writes total: deployment, create round, submit answers, finalize. Negative action checks use read-only calls; they do not spend gas on deliberately reverting transactions. Budget allocations are separate per invocation and must be agreed in aggregate.

The initial sandboxed build failed at the existing Vite/esbuild parent-directory restriction. The full check passed with authorized external execution. Fetch, public-RPC and npm-advisory calls also needed external execution after sandbox network failures. An explicit formatter invocation on `.env.example` had no parser; supported files were formatted successfully, followed by passing repository-wide formatting. These failures were not application/security test passes, and none authorized a blockchain write. No clean-install reproduction was performed.

Stop condition: obtain real public operator details and selected caps, refresh the read-only signer-specific estimate, then request explicit deployment approval for the reviewed signer/artifact/constructor/network/budget. Integration transactions require explicit authorization of their scope too. Never infer remote KMS denial from the local/mock tests or SDK ACL rejection. The earlier records below are historical evidence from their stated scopes.

## Sepolia integration preparation (2026-11-11)

Started on clean `feat/encrypted-scoring` at `1ba8282`. Reviewed the existing scoring contract, tests, compatibility layer, pinned SDK sources and current official Zama documentation. Prepared an explicit current-SDK live integration test and a separately approval-gated deployment script. The contract, existing FHE tests, application code, dependency versions and lockfile remain unchanged. No deployment, transaction broadcast, push or merge occurred. The complete [runbook, secure environment setup and evidence boundaries](sepolia-integration.md) are recorded separately from local mock results.

The new local guard suite has four passing tests for live-run configuration, packed-input bounds, precise ACL-denial classification and immutable-aware runtime identity checks. These tests exercise ordinary orchestration logic, not encrypted computation. Existing FHEVM tests still run in the official local mock environment. Integration files and deployment scripts are included in normal workspace typechecking.

The explicit `npm run test:sepolia -w @cipherquiz/blockchain` invocation failed closed at the unset approval/configuration guard with zero network requests or broadcasts. This is an expected blocked live run, **not** a successful Sepolia integration test. No contract address exists and no signer credentials were supplied. Deployment was not invoked. Real proof generation/acceptance, live scoring, authorized KMS decryption, live unauthorized access and network gas costs remain unverified.

Installed SDK 3.7.2 exposes the required generic encryption/decryption APIs. Its internal SDK 0.13.2 checks `persistAllowed` before forwarding user decryption to the relayer. The harness therefore distinguishes an SDK ACL rejection against onchain permissions from independent remote KMS denial; it cannot establish the latter through this supported API. A remote-denial test route remains required before staking. No cleartext backend, mock successful integration or undocumented SDK bypass is used.

During preparation, a Viem transaction-union typing error and one lint warning in the new runner were corrected; targeted typechecking and linting then passed. Final `npm run check` passed: all five workspace builds, all workspace typechecks (including integration and deployment code), ESLint/Solhint, formatting and **21 local tests** (3 API, 4 orchestration guards, 14 Hardhat including the original smoke test). There were zero local failures or skips. `npm run format` and `git diff --check` also passed. The complete check ran with external execution permission for the known Windows Vite/esbuild parent-directory restriction; it did not run deployment or live integration. `npm audit --omit=dev` passed with zero vulnerabilities. A new clean dependency installation was not performed.

| Verification class                   | Result                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| Build, typecheck, lint, format check | Pass through `npm run check`                                                   |
| `npm run format`                     | Pass                                                                           |
| Local tests                          | 21 passing, zero skips                                                         |
| Production dependency audit          | Zero vulnerabilities                                                           |
| Explicit Sepolia test                | Blocked/failing at approval guard; not counted as a local pass or live success |
| Deployment script                    | Type-checked only; not executed                                                |
| Proofs, KMS and gas on Sepolia       | Unverified; no deployment exists                                               |

Before a real run: obtain explicit deployment approval, configure dedicated Sepolia-only operator/player environment signers and trusted HTTPS RPC securely, set fee budgets, fund test accounts, deploy the reviewed artifact, and provide its actual address. Only then authorize and run the separate live test. Retain redacted receipts/results and resolve SDK/protocol or KMS evidence gaps before confidential staking.

## Phase 2: encrypted scoring (2026-11-11)

Environment: Windows PowerShell, Node.js 24.15.0, npm 11.12.1. Work started on `feat/encrypted-scoring` with a clean working tree at `adbe85c`. Fetched `origin`; HEAD and `origin/main` initially had zero divergent commits. All application sources, workspace manifests, the lockfile and installed Zama/plugin declarations were reviewed before implementation. No dependency versions or lockfile entries changed.

The [Phase 2 architecture and security record](encrypted-scoring.md) describes the implemented workflow and links the official sources consulted. Contract tests use actual official FHEVM plugin input/decryption utilities with simulated local cryptography; they do not substitute an application plaintext scorer. Current application SDK API shapes and adapter configurations are checked separately at compile time. Current-SDK wire compatibility, live input proofs and real threshold-KMS ACL enforcement are unverified.

| Requested command      | Final result                                                  |
| ---------------------- | ------------------------------------------------------------- |
| `npm run build`        | Pass: all five workspaces; external execution needed for Vite |
| `npm run typecheck`    | Pass: all five workspaces                                     |
| `npm run lint`         | Pass: ESLint and Solhint, zero warnings                       |
| `npm run format`       | Pass: repository formatting applied                           |
| `npm test`             | Pass: 17 tests, zero failures or skips                        |
| `npm run check`        | Pass: build, typecheck, lint, format check and all tests      |
| `npm audit --omit=dev` | Pass: zero vulnerabilities                                    |

Initial test typechecking found strict TypeScript errors in signer indexing, enum narrowing and handle indexing; those were corrected. Initial Solhint warnings were resolved with NatSpec and naming fixes; narrow inline suppressions preserve direct deadline comparisons and valid modern constructor syntax. A subsequent test run failed five assertions because Hardhat omitted custom-error names after recompilation. Assertions now verify ABI revert selectors, and the full test suite passes.

The sandboxed build failed because Vite/esbuild could not read a parent directory. The sandboxed production audit also failed to reach npm's advisory endpoint. Both were retried with external execution permission; no source changes or dependency overrides were used to bypass those environment failures. The audit retry returned zero vulnerabilities. No failed command was silently skipped.

### Tests and preserved checks

- Existing API tests: liveness without PostgreSQL, readiness success/error behavior without database error disclosure, invalid port rejection (3 passing).
- Existing local chain smoke test (1 passing).
- New scoring tests (13 passing): authorized immutable setup and invalid public configuration; correct, incorrect and mixed encrypted scores; invalid choices; duplicate/partial batches and unauthorized operations; malformed proofs, proof membership, sender/contract binding and rollback; handle replay across rounds; encrypted round/question context; exact expiry and timeout finalization; score ACL before/after finalization, key/answer denial and public-decryption denial; duplicate handles within a batch, replay-state rollback and late finalization; invalid encrypted operator keys and a complete ten-question circuit.
- Stored key and score handles have persistent contract ACL permission; the score gains player permission only at finalization. Unauthorized decrypt requests fail with authorization-specific errors. No negative local ACL case is skipped. Live KMS denial is not tested.
- Ten-question submission: approximately 1.422 million mock gas (observed 1,421,907–1,421,931 as ciphertext calldata changes), global HCU 4,840,352, maximum HCU depth 1,158,032, final decrypted score 10. These are local instrumentation results, not live latency or cost claims.

Frontend/API implementation, responsive CSS, PostgreSQL readiness behavior, shared disclaimer and all existing scripts are unchanged. API readiness paths remain injection-tested; no live PostgreSQL server or browser wallet workflow was verified in this phase. No servers, deployment, wallet funding, secret material or financial functionality were introduced. `npm ci` remains the reproduction command; a new clean installation was not performed during this phase.

### Remaining boundary

Before testnet integration, run a separately authorized dummy-data current-SDK round trip against the supported network, including real proof rejection and unauthorized decryption denial. Review protocol/module versions, network resource limits, content integrity, timing/finality fairness, operator trust, question/score inference and metadata leakage before adding UI/API scoring. See the Phase 2 record for the smallest safe dependency strategy if incompatibility is found. No breaking dependency change is proposed without that evidence.

## Phase 1 verification and handoff

Verified on 2026-11-10 on Windows with Node.js 24.15.0 and npm 11.12.1. The project directory was initially empty, with no package manifest, source files, Git repository or applicable AGENTS.md found. No Quiza source was accessed or copied.

## Complete source structure

Generated dependencies, compiler artifacts and build output are excluded from this source tree.

```text
cipherquiz/
├── .editorconfig
├── .env.example
├── .gitattributes
├── .gitignore
├── .npmrc
├── .nvmrc
├── .prettierignore
├── .prettierrc.json
├── eslint.config.mjs
├── package.json
├── package-lock.json
├── README.md
├── tsconfig.base.json
├── apps/
│   ├── api/
│   │   ├── .env.example
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── app.ts
│   │   │   ├── config.ts
│   │   │   └── server.ts
│   │   └── test/
│   │       └── health.test.ts
│   └── web/
│       ├── .env.example
│       ├── index.html
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       └── src/
│           ├── App.tsx
│           ├── main.tsx
│           ├── styles.css
│           └── wallet.ts
├── contracts/
│   ├── .env.example
│   ├── .solhint.json
│   ├── hardhat.config.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   └── CipherQuizFoundation.sol
│   └── test/
│       └── foundation.test.ts
├── packages/
│   ├── blockchain/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       └── index.ts
│   └── shared/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           └── index.ts
├── docs/
│   ├── architecture.md
│   ├── dependencies.md
│   └── verification.md
└── scripts/
    └── dev.mjs
```

Ignored generated directories include root node_modules, workspace dist directories, contracts/artifacts and contracts/cache. Git ignore and attributes are provided; no Git repository or commits were created.

## Installed versions

These are resolved versions, not just manifest ranges. package-lock.json records the complete transitive graph. `npm ls --depth=0` completed successfully.

| Technology or package                     | Installed version                                      |
| ----------------------------------------- | ------------------------------------------------------ |
| Node.js / npm                             | 24.15.0 / 11.12.1                                      |
| React / React DOM                         | 19.3.1 / 19.3.1                                        |
| Vite / React plugin                       | 7.3.8 / 5.2.0                                          |
| TypeScript                                | 5.9.3                                                  |
| Fastify / pg                              | 5.12.8 / 8.23.1                                        |
| Wagmi / Viem                              | 3.7.11 / 2.57.17                                       |
| TanStack React Query                      | 5.107.1                                                |
| Zama application SDK                      | 3.7.2                                                  |
| Hardhat                                   | 2.28.6                                                 |
| Solidity compiler                         | 0.8.27, Cancun target                                  |
| FHEVM Solidity                            | 0.11.1                                                 |
| FHEVM Hardhat plugin / mock utilities     | 0.4.2 / 0.4.2                                          |
| encrypted-types                           | 0.0.4                                                  |
| Legacy relayer SDK, contract tooling only | 0.4.1                                                  |
| Hardhat ethers plugin / ethers            | 3.1.3 / 6.17.0                                         |
| ESLint / @eslint/js                       | 9.39.5 / 9.39.5                                        |
| typescript-eslint                         | 8.72.2                                                 |
| eslint-config-prettier                    | 10.1.8                                                 |
| Prettier / Solidity formatter plugin      | 3.9.10 / 2.4.1                                         |
| Solhint                                   | 6.2.5                                                  |
| tsx / ts-node                             | 4.23.15 / 10.9.2                                       |
| globals                                   | 17.14.0                                                |
| @types/node                               | 24.19.2                                                |
| @types/react / @types/react-dom           | 19.3.0 / 19.3.0                                        |
| @types/pg / @types/mocha                  | 8.23.1 / 10.0.10                                       |
| PostgreSQL server                         | Not installed or verified; proposed local baseline 16+ |
| ERC-7984 token library                    | Not selected or installed                              |

## Commands

Run at the monorepo root. In PowerShell, use npm.cmd if npm.ps1 is blocked by execution policy.

```sh
npm ci
npm run dev                 # frontend and API together
npm run dev:web             # frontend only: http://127.0.0.1:5173
npm run dev:api             # backend only: http://127.0.0.1:3001
npm run build
npm run typecheck
npm run lint
npm run format:check
npm test
npm run check               # build, typecheck, lint, formatting, tests
npm run start -w @cipherquiz/api
npm run preview -w @cipherquiz/web
```

## Successful checks

- Dependency installation completed with a lockfile and a valid workspace dependency tree. The initial registry timeout was resolved by retrying with lower download concurrency. Wagmi 3 avoids installing unused third-party wallet SDKs.
- All five workspace builds completed. The frontend emitted production HTML, CSS and JavaScript. Hardhat compiled seven Solidity source files, including dependencies, using compiler 0.8.27. The only project contract is abstract and contains no gameplay.
- All five workspace TypeScript checks completed.
- ESLint and Solhint passed with zero Solidity warnings; Prettier's repository check passed.
- Three API tests passed: liveness without PostgreSQL, readiness availability/error behavior without leaking database details, and invalid port rejection.
- One Hardhat smoke test passed against local chain ID 31337. It verifies local toolchain operation, not encrypted gameplay.
- The combined development launcher started both services. Frontend HTTP 200, API liveness HTTP 200 and Vite health proxy HTTP 200 were verified.
- API readiness without a configured database returned HTTP 503 as designed.
- The compiled API start command returned HTTP 200 on a separate test port. The compiled frontend preview returned HTTP 200. The exact disclaimer was present in its JavaScript bundle and is rendered by the footer component; it is also in README.md.
- All servers launched for verification were stopped. No deployment or real token interaction occurred.

Vite/esbuild parent-directory resolution was blocked by the Windows sandbox. The frontend build and server commands succeeded with the required external execution approval. Hardhat's initial compiler download also required network access. These are execution-environment restrictions, not unresolved build errors.

## Dependency advisory results and limits

`npm audit --omit=dev --json` reported **zero known production dependency advisories** at verification time. This is not an application security audit.

The full `npm audit --json` reported **29 development-tool dependency findings: 10 low, 11 moderate, eight high, zero critical**. Affected chains include Hardhat's HTTP/archive/legacy ethers dependencies and lint tooling. The scanner includes parent packages affected through transitive dependencies; 29 is not a count of distinct application exploits.

The pinned Hardhat plugin requires the deprecated relayer SDK. npm also marks ESLint 9 unsupported. These constraints and advisories need a coordinated maintenance review before a production release; no forced major upgrades or blanket dependency overrides were applied. See [dependency decisions](dependencies.md) for the reviewed official sources and exact toolchain boundary.

## Unverified integrations and assumptions

- No PostgreSQL server or Docker executable was available. The readiness success/failure paths are unit tested with an injected dependency; no live database query was verified. No application schema or migrations exist yet.
- No browser visual automation, wallet connection, RPC calls, Sepolia deployment, real FHE encryption/decryption, ciphertext ACL enforcement or token settlement was exercised.
- SDK 3.7.2's exported type resolves in the blockchain package, but generic answer encryption and player-authorized decryption remain unimplemented and must be verified against the selected protocol versions.
- ERC-7984 implementation/version, deployed token identity and confidential transfer failure semantics remain open. No token addresses or contract APIs were invented.
- Tier multipliers are assumed to mean total return including principal. Question duration, per-question versus batch submission, timeout/refund rules, question randomness, reserve funding and administration remain design decisions.
- Local mocks and successful compilation do not establish cryptographic confidentiality, anti-cheating properties or production readiness.
- `npm ci` is the documented lockfile installation command; the completed installation used `npm install`. A separate clean-install reproduction was not run.

## Next recommended milestone

Build a local, token-free encrypted-scoring proof of concept using dummy questions, an explicit round state machine and negative ACL tests. Validate the real SDK input/decryption flow, replay protection, deadlines, score bounds and ten-question execution cost before designing ERC-7984 staking or deploying to Sepolia.
