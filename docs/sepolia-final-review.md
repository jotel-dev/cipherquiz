# Final read-only Sepolia predeployment review

**Subsequent execution checkpoint:** after the earlier format stop, the owner saved the prefix, passed strict offline verification and separately approved one new attempt. `CipherQuizScoring` deployed successfully at **0x4b4c204d28D5ee37896278C5fc56d61086f92b53** on Sepolia. Actual fee **0.0000000001578339 ETH**; conservative remaining aggregate allowance **0.0187271396 ETH**. No integration or automatic retry occurred. See the [deployment execution record](sepolia-deployment.md). The review below records the earlier preapproval snapshot.

Reviewed **2026-11-13 (Africa/Lagos)**. **STOP: explicit deployment approval remains pending. No Sepolia transaction was signed or broadcast, no production reservation was created, and neither approval flag was changed.** This report supersedes the estimates and pending-signer statements in the historical [Stage A report](sepolia-predeployment.md). See [verification history](verification.md) and the [execution runbook](sepolia-integration.md).

The checks support requesting approval for one token-free `CipherQuizScoring` deployment, subject to fresh execution-time guards. This focused source review and local testing do not establish production readiness or live FHE/KMS behavior.

## Network, signer and confirmed funding

The owner reported offline status `reviewed-signer-matched` for **0xbE4a3DAABCd4406e75314aC7324411249E0C36a2**. This review accepts that result; the network preflight instantiated no wallet and loaded only the RPC URL and public operator/fee settings into its environment. RPC credentials were not printed.

| Observation                                         | Verified result                                                         |
| --------------------------------------------------- | ----------------------------------------------------------------------- |
| RPC and installed SDK chain ID                      | **11155111**, Ethereum Sepolia                                          |
| Zama protocol ID                                    | **10001**, distinct from Ethereum chain ID                              |
| Latest observed mined block                         | **12125994**, 2026-11-13 **13:34:24 Africa/Lagos**                      |
| Latest block hash                                   | `0x75c595655ce1f4dcbd1ce01c9a7530286fe60f967b4f62cf8bffaf97b5751044`    |
| Balance at that exact mined block                   | **50000000000000000 wei = 0.05 Sepolia ETH**                            |
| Finalized block                                     | **12125909**, 2026-11-13 **13:17:24 Africa/Lagos**                      |
| Finalized block hash                                | `0x50f42bb0f301ef5ceba748d205c13c78d451c7569d9451e7312f7a25abb2d95a`    |
| Balance at that exact finalized block               | **50000000000000000 wei = 0.05 Sepolia ETH**                            |
| New operator confirmed / provider-pending nonce     | **0 / 0**                                                               |
| Retired operator confirmed / provider-pending nonce | **0 / 0**, queried at block **12126002**                                |
| Canonical ledger / lock                             | Both absent; **0 wei locally reserved**, **0.02 ETH locally remaining** |

The retired operator is `0x3184FDC5E288619Eb17127D32e373239EE8d7Bb7`. Nonce zero supports no mined outgoing EOA transactions from either address on this chain. Provider-pending state is not a global mempool guarantee. Absent local records cannot prove no spending through another wallet/checkout; existing records report no deployment/integration writes. Any contrary history or pending signed transaction requires reconciliation before execution. Operator rotation never resets the project cap.

Infrastructure checks passed against installed Solidity/SDK configuration: ACL `0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D`, executor `0x92C920834Ec8941d2C77D188936E1f7A6f49c127`, KMS verifier `0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A`, and executor-resolved input verifier `0xBBC1fFCdc7C316aAAd72E807D9b0272BE8F84DA0`. All have code, each returning runtime hash `0x864cc9ad53b338b82da1f7cab85ab0b3d5c8861acb422b6fec63cf36234f36a6`. Configuration parity/code presence do not attest to proxy implementations, governance, relayer health or protocol semantics.

## Deployment parameters and recalculated cost

| Parameter                                           | Reviewed value                                                       |
| --------------------------------------------------- | -------------------------------------------------------------------- |
| Contract                                            | `contracts/src/CipherQuizScoring.sol:CipherQuizScoring`              |
| Deployer / immutable constructor operator           | **0xbE4a3DAABCd4406e75314aC7324411249E0C36a2**                       |
| Hardhat target                                      | `sepolia`, chain **11155111**                                        |
| Creation-bytecode Keccak-256, excluding constructor | `0x4b033120899ac98fde5d0e1f8eded615afd01a48d825fdcc06766f3bd877cbcf` |
| Compiler                                            | Solidity **0.8.27**, Cancun EVM, optimizer **800** runs              |
| Transaction value                                   | **0 wei**, no staking, payout, token transfer or funding             |
| Fresh unsigned RPC gas estimate                     | **8839309 gas**                                                      |
| Gas limit, rounded-up 20% margin                    | **10607171 gas**                                                     |
| Maximum fee per gas                                 | **100000000 wei = 0.1 gwei**                                         |
| Maximum fee at reviewed gas limit                   | **1060717100000000 wei = 0.0010607171 ETH**                          |
| Configured deployment invocation allocation         | **2000000000000000 wei = 0.002 ETH**                                 |
| Absolute script gas/fee limits                      | **15000000 gas / 0.1 gwei**, maximum **0.0015 ETH** per transaction  |
| Suggested maximum / priority fee at snapshot        | **22 / 2 wei per gas**, volatile suggestions                         |
| Illustrative estimate at suggested maximum fee      | **0.000000000194464798 ETH**, no guarantee of final fee              |
| Confirmation policy                                 | Two confirmations, 180-second wait; no automatic write retry         |

The deployment script re-estimates immediately before sending. **0.0010607171 ETH is the maximum for the reviewed gas limit; the unchanged absolute script bound is 0.0015 ETH if the fresh estimate increases.** Both are below the configured 0.002 ETH invocation allocation. These are Sepolia test-ETH amounts, with no fiat-cost claim. Any change to approved operator, artifact, constructor or cost scope requires renewed review. Excess gas/fee suggestions, insufficient balance or inadequate budget stop execution; limits are never raised automatically.

Exact deployment command from the repository root, **only after explicit deployment approval**, with secure environment injection:

```sh
npm run deploy:sepolia -w @cipherquiz/contracts
```

Use `npm.cmd` on Windows if PowerShell blocks `npm.ps1`. The npm command does not automatically load `contracts/.env`; the [runbook](sepolia-integration.md) also provides an explicit env-file command. Never put secret values in command arguments/history. Neither approval flag is currently set. Deployment-only approval does not authorize integration, retries, funding or service payments.

## Aggregate cap, testing and retries

| Maximum liability                                                                       |      Sepolia ETH |
| --------------------------------------------------------------------------------------- | ---------------: |
| Deployment with refreshed estimate and margin                                           | **0.0010607171** |
| Three integration writes at absolute transaction ceilings                               |       **0.0045** |
| Deployment plus planned integration                                                     | **0.0055607171** |
| Remaining aggregate headroom after that plan                                            | **0.0144392829** |
| Four writes all at absolute ceilings                                                    |        **0.006** |
| Initial complete four-write attempt plus two complete retries, all at absolute ceilings |        **0.018** |
| Remaining headroom after those twelve writes                                            |        **0.002** |

The strict **0.02 ETH project-wide aggregate cap** covers deployment, the planned three-write integration, and two entire retry cycles under these bounds. This establishes bounded retry capacity, not permission for retries or unlimited attempts. Failed/uncertain sends remain reserved; future writes stop when their maximum liability no longer fits.

Integration normally broadcasts operator `createRound`, player `submitAnswers`, and operator `finalizeRound`. Negative-action tests use read-only simulation and incur no deliberately reverted transaction fees. Proposed integration invocation allocation is **0.005 ETH**, also subject to the shared cap. Exact network integration estimates await an approved contract and real encrypted proofs; local mock costs are not substituted.

Both operator and player gas costs use the same project allowance. A separate player signer is absent from the reviewed deployment environment and its funding is unverified. The operator's 0.05 ETH alone does not fund that player. No funding/relayer-payment transaction is authorized; any later project-paid funding or service liability must be included before execution.

## Spending reservation enforcement

Both write commands import the same policy module and canonical ignored `contracts/.sepolia-budget.jsonl`, resolved relative to the module rather than the working directory. Every reservation is associated with **chain 11155111 and the pinned new operator as project identity**, including player-submitted writes. This is one project budget, not separate allowances per signer. Both actual operator signers are independently checked against the pin before network access, and chain identity is checked before writes.

Before broadcast, the policy acquires an exclusive create-only lock, re-reads the ledger, enforces immutable fee/gas ceilings and aggregate remaining capacity, appends `gasLimit * maxFeePerGas`, and fsyncs. The wallet sends only after reservation succeeds. Concurrent reservations serialize. Failed, uncertain, reverted and cheaper confirmed sends never automatically release capacity. Restarts/retries retain cumulative charges.

Wrong operator/chain, duplicate IDs, non-positive amounts, damaged/truncated records, stale locks and over-cap totals fail closed. Retired-only and mixed-operator journals are rejected unchanged; they cannot silently acquire a new allowance. Regression tests check these failures and preservation of rejected journals. No production ledger was created, reserved, reset, migrated or relabelled in this review.

**This is local script enforcement, not an onchain wallet spending limit.** Manual sends, another clone, deleted/edited accounting, unrelated wallet activity or modified scripts can bypass it. Retain this canonical checkout and its ledger/lock; any contrary activity requires stopping and reconciling liabilities. An unconditional claim that the wallet cannot bypass the cap would be incorrect.

## Constructor, encrypted initialization and ACL

- The only constructor argument is the nonzero public operator, stored immutably. Inherited `ZamaEthereumConfig` initializes FHEVM during construction. There is no application proxy, external initializer, mutable operator or upgrade entry point. Operator-key loss has no recovery path.
- **No answer keys enter deployment calldata.** A later operator-only `createRound` atomically imports one to ten encrypted handles through sender/contract-bound proofs, grants `FHE.allowThis`, and fixes round keys. Malformed proofs cannot initialize a round.
- Only the designated player submits one complete batch before the exclusive deadline. Global handle consumption prevents reuse and batch duplicates, with rollback on revert. Encrypted answers bind 48-bit round and 8-bit position context. Invalid encrypted keys contribute zero; scores are bounded by ten.
- Keys retain contract ACL access; application code grants no player/outsider key access. The authoring operator already knows its keys. Scores retain contract access and gain only the designated player's application-level permission on finalization. No public decryption or decryption delegation is enabled. Expired unsubmitted rounds finalize to encrypted zero; timely submissions survive late finalization.
- The reviewed use agrees with the [official ACL guide](https://docs.zama.org/protocol/solidity-guides/smart-contract/acl). Contract permission persists for computation; final score allowance is scoped to the player. Local ACL tests cover player/operator/outsider permissions and public-decryption denial, without establishing live KMS security.

Remaining trust: the operator selects content, keys, player and deadline; the public content hash does not prove fairness/correctness. Reused questions, collusion and score inference can expose information. Participation, identities, timing, counts and ciphertext handles remain public. Confidentiality depends on upstream protocol/KMS security, governance and SDK correctness.

## Plaintext and secret exposure

Deployment calldata contains creation code plus the ABI-encoded public operator, with zero value. Key/answer calls carry encrypted handles/proofs. Events contain public round/player metadata. The integration fixture generates four disposable random keys in memory, excludes them from the content commitment, disables SDK logging/debugging, separates actor memory stores and suppresses raw SDK/RPC/signing errors. No private answer bank is loaded. Public frontend practice answers are demo fixtures.

The ignored `contracts/.env` remained byte-for-byte unchanged; both approval flags remain unset. Populated env files, build output, artifacts/cache and the budget ledger/lock are ignored. Only explicit reviewed source/document files are staged. Signing keys and RPC credentials must never enter constructor arguments, events, public `VITE_*` configuration, logs or Git. Solidity `private` storage is not a secrecy boundary.

Scanning **131 tracked/untracked source files** and **231 reachable Git blob/commit objects** found no exact configured-secret values or selected private-key/PEM/credential-URL/token patterns; no populated env path was found in reachable history. A final exact-secret scan of **132 source files and 45 build/artifact files** also found zero matches and confirmed the env file unchanged, both approval flags unset, and ledger/lock absent. Values were never printed. These bounded scans and code review found no intended leak path; they cannot guarantee every secret format, dangling Git object, host log or external leak is absent.

## Validation, risks and approval checkpoint

`npm run check` passed all five builds, workspace typechecks, ESLint/Solhint, formatting and **32 local tests**: 3 API, 4 frontend, 11 blockchain guards/policy, 14 Hardhat. Security coverage includes cap persistence/exhaustion, fee/gas limits, operator isolation, journal corruption, proof integrity/binding, ACLs, replay, deadlines and score bounds. No tests failed or skipped. Final documentation formatting and `git diff --check` passed. The first sandboxed check stopped at Vite/esbuild's parent-directory restriction; authorized external execution passed. Read-only RPC likewise passed externally after sandbox networking failed. No transaction-capable Sepolia command was invoked.

A fresh npm advisory audit was unavailable in the sandbox. Automatic approval review rejected external execution because it would export private-repository dependency metadata to the npm registry. No workaround/retry was used. Earlier results of zero known production vulnerabilities and **29 development-tool findings (8 high, 11 moderate, 10 low)** are historical; current advisory status is unverified pending separate approval for the metadata transfer. Dependencies and lockfile are unchanged. No clean `npm ci` reproduction was performed.

Deployment blocker: **explicit owner approval is absent**. Deployment funding and the owner's reported offline signer match are satisfied at the recorded snapshot. Runtime identity/gas/fee/balance/budget checks still apply, and any contrary prior spending must be reconciled. The owner should consider the unrefreshed advisory audit in the approval decision.

Integration blockers: an existing approved deployment, a different securely configured/funded player, separate authorization, and real proof/circuit/decryption verification. Independent remote KMS denial remains unresolved: installed SDK V1/V2 decryption calls `checkPersistAllowed` before relayer submission, so `AclUserDecryptionError` proves SDK ACL rejection, not a remote KMS negative response. Ten-question network costs, recovery and throughput remain unverified. Stronger live-security, production and staking claims remain blocked.

Request approval for **one deployment only**, with the reviewed artifact/operator/constructor on Sepolia, zero value, fee ceiling **0.1 gwei**, absolute gas ceiling **15000000**, absolute deployment maximum **0.0015 ETH**, and retained project aggregate cap **0.02 ETH**. The current estimated-limit maximum is **0.0010607171 ETH**. Leave approval flags unchanged and stop before signing/broadcasting until the owner approves.
