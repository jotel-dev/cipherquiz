# CipherQuizScoring Stage A predeployment report

Date: 2026-11-11 (Africa/Lagos). **STOP: Stage A only; no deployment or other Sepolia transaction is authorized or submitted.** The owner supplied operator `0x3184FDC5E288619Eb17127D32e373239EE8d7Bb7` and a strict aggregate cap of **0.02 Sepolia ETH** (`20000000000000000` wei). The earlier placeholder and 0.01 ETH proposal are superseded. The current signer-specific unsigned estimate is recorded below. Signer/RPC credentials remain unconfigured; the operator has zero ETH in the observed snapshot. This report does not claim real encrypted scoring or KMS verification.

## Repository and preserved work

Remote: `https://github.com/jotel-dev/cipherquiz`. Fetched and inspected all remote branches. `main` is `adbe85c`; encrypted scoring is `1ba8282`; frontend is `8ccbcb9`. Created `feat/sepolia-fhe-verification` from `8ccbcb9`, which contains the scoring implementation and both frontend commits. Preserved all nine modified tracked files and all untracked Sepolia preparation found at entry. No reset, stash, branch deletion, merge or force-push was used. Frontend and Solidity sources remain unchanged.

The initial sandboxed branch creation could not write `.git`; authorized external execution created the branch. Sandbox network restrictions also required external execution for fetching and read-only RPC. These were environment restrictions, not deployment approvals.

## Contract security review

| Area                   | Finding and limits                                                                                                                                                                                                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Initialization         | Inherited `ZamaEthereumConfig` initializes the coprocessor in the constructor. `authorizedOperator` must be nonzero and is immutable. There is no external initializer, upgrade entry point or mutable operator. No proxy deployment is proposed.                                                             |
| Operator authorization | Only `OPERATOR` may create a round. The deployment script uses its signer as the sole constructor argument and now requires it to match independently supplied public `CIPHERQUIZ_OPERATOR_ADDRESS`. It deploys only `CipherQuizScoring`.                                                                     |
| Key ACL                | Each `FHE.fromExternal` key receives `FHE.allowThis` for later computation. The application grants no player/outsider key access. The authoring operator already knows its keys; encryption cannot hide them from their author.                                                                               |
| Score ACL              | Submitted/expired scores receive contract permission. Finalization grants only the designated player application-level score access. No score is made publicly decryptable; the operator gains no score permission through this code. Public handles are metadata, not plaintext or decryption authorization. |
| Input proofs           | Every key and answer uses `FHE.fromExternal` with the supplied proof; no application bypass or plaintext fallback exists. Local tests cover malformed proofs, membership and sender/contract binding. Real network acceptance is deferred to Stage B.                                                         |
| Replay                 | `usedInputs` consumes external handles globally, including within a batch. Reverts roll state back. Fresh answer plaintexts include 48-bit round and 8-bit question context; matching a different round/position scores zero. Round state also blocks repeat submissions/finalization.                        |
| Deadlines              | Setup requires a future deadline; submission requires `block.timestamp < deadline`. Expired open rounds finalize to encrypted zero; timely submitted scores survive late finalization. Exact-boundary behavior is locally tested, not yet tested on Sepolia.                                                  |
| Bounds                 | One to ten keys, exact answer count, nonzero player/content hash and 48-bit round limit. Invalid encrypted keys are masked to zero score; encrypted scores cannot exceed ten. No secret-dependent application revert is introduced.                                                                           |
| Remaining trust        | Operator chooses content, keys, player and deadline. Content hash does not prove fair/correct questions. Repeated questions and colluding players can reveal information through scores. Public identities, timing, question counts, handles and participation remain visible.                                |

No contract source change was needed for the reviewed token-free workflow. This is a focused code review and mock-test result, not a security audit or threshold-cryptography proof.

## Official documentation and installed compatibility

Consulted the [protocol documentation](https://docs.zama.org/protocol), [ACL guide](https://docs.zama.org/protocol/solidity-guides/smart-contract/acl), [configuration guide](https://docs.zama.org/protocol/solidity-guides/smart-contract/configure), [input guide](https://docs.zama.org/protocol/solidity-guides/smart-contract/inputs), and [official template](https://github.com/zama-ai/fhevm-hardhat-template). The installed Solidity `0.11.1`, Hardhat plugin/mock utilities `0.4.2`, legacy relayer SDK `0.4.1`, Hardhat `2.28.6` and Solidity compiler `0.8.27` match the template manifest's current baseline. Cancun EVM and optimizer 800 are configured. No dependency version or lockfile changes were made.

The application runner uses installed `@zama-fhe/sdk 3.7.2`, its Viem adapter, `node()` transport, and separate `MemoryStorage` instances. Actual installed declarations and [SDK configuration](https://docs.zama.org/protocol/sdk/guides/configuration), [generic SDK APIs](https://docs.zama.org/protocol/sdk/api-references/sdk/zamasdk) and [permit model](https://docs.zama.org/protocol/sdk/concepts/permit-model) were reviewed. Keys use `sdk.encrypt` with `euint64`, target contract and operator address; packed answers use the player address. Handles and `inputProof` feed the contract. User decryption calls `sdk.decryption.decryptValues` with a nonzero score/contract pair and a player-signed, chain/contract-scoped permit. The shared Sepolia relayer requires no API key according to current documentation. No undocumented bypass is used.

Installed transitive `@fhevm/sdk 0.13.2` performs `checkPersistAllowed` before sending direct user decryption to the relayer in both V1 and V2 paths. Therefore `AclUserDecryptionError` establishes SDK ACL preflight denial, **not independent remote KMS denial**. A separate supported adversarial remote test route remains unresolved. The Stage B runner explicitly reports this limitation even when its other assertions pass.

## Read-only Sepolia evidence

Ran the new `npm run preflight:sepolia -w @cipherquiz/blockchain` using the public RPC in the installed Zama Sepolia preset, explicitly supplied for this read-only invocation. It creates no wallet, reads no signing key, sets no approval flag and calls no write API.

Refreshed for the supplied operator at block `12112842`, timestamp `1794413724`, chain ID `11155111`. Installed protocol ID is `10001` (distinct from the Ethereum chain ID). This invocation used only public configuration and Zama's SDK-preset public RPC; it did not configure persistent RPC credentials or a signer. The aggregate ledger remains absent/unspent, with 0 wei reserved and 0.02 ETH available.

| Component                        | Address                                      |
| -------------------------------- | -------------------------------------------- |
| ACL                              | `0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D` |
| Executor                         | `0x92C920834Ec8941d2C77D188936E1f7A6f49c127` |
| KMS verifier                     | `0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A` |
| Executor-resolved input verifier | `0xBBC1fFCdc7C316aAAd72E807D9b0272BE8F84DA0` |

Solidity's installed Sepolia configuration contains the first three addresses. SDK ACL/KMS/input-verifier addresses match; the live executor returned the expected input verifier; all four addresses have code. All returned runtime code hashes were `0x864cc9ad53b338b82da1f7cab85ab0b3d5c8861acb422b6fec63cf36234f36a6`. These are code-presence/configuration observations, not implementation attestation, proxy implementation verification, relayer health or protocol semantic verification. No CipherQuiz deployment was queried or discovered by this check; no address was provided.

Reviewed artifact creation-bytecode Keccak-256, excluding constructor arguments: `0x4b033120899ac98fde5d0e1f8eded615afd01a48d825fdcc06766f3bd877cbcf`. The live runner checks full deployed runtime against the compiled artifact, masking only compiler-declared immutables, then separately verifies operator/protocol identity and configured storage.

## Secrets and answer-key exposure

No `CIPHERQUIZ_*`, `SEPOLIA_*` or `ZAMA_*` environment variables were present at entry. Only empty `.env.example` files were found in the relevant configuration locations; no private signer, funded balance or RPC credential was available. Private keys are never requested in chat. Use dedicated Sepolia-only operator/player accounts and a trusted HTTPS RPC, supplied through a secret-manager-injected process environment. The harness validates key scalar range and distinct signer addresses before network calls. SDK storage is separate per actor; the stranger wallet exists only in memory and needs no funding.

Reviewed application calldata contains encrypted handles/proofs, not plaintext keys/answers. Events contain round/player metadata only. The fixture uses four random disposable keys in memory; content commitments omit keys. The operator constructor argument is public and contains no answer bank. No private bank, plaintext SDK-event logging, permit/signature logging or secret-bearing deployment artifact is introduced. Build artifacts/cache and populated `.env` files are ignored; examples remain empty. Public frontend practice fixtures are separate from the encrypted test fixture. Solidity `private` storage is not a secrecy boundary; ciphertext confidentiality still depends on the real protocol and ACL.

## Deployment parameters and strict aggregate cap

The supplied public operator address has valid EIP-55 casing. Both deployment and integration independently pin their actual operator signer to **0x3184FDC5E288619Eb17127D32e373239EE8d7Bb7**, before network access. Changing only an environment address cannot authorize a different signer. The offline signer command cannot verify a match until the owner securely configures a signer locally; its current invocation correctly failed closed with a sanitized message.

| Parameter                  | Current configuration                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| Network                    | Ethereum Sepolia, chain ID 11155111 only                                                         |
| Operator/deployer          | 0x3184FDC5E288619Eb17127D32e373239EE8d7Bb7                                                       |
| Contract                   | contracts/src/CipherQuizScoring.sol:CipherQuizScoring                                            |
| Constructor                | authorizedOperator = 0x3184FDC5E288619Eb17127D32e373239EE8d7Bb7                                  |
| Transaction value          | 0 wei; no stake, payout, token transfer or automatic funding                                     |
| Strict aggregate cap       | 0.02 ETH = 20000000000000000 wei, across deployment, integration and retries                     |
| Proposed fee ceiling       | 0.1 gwei = 100000000 wei/gas; enforced maximum, not a fee prediction                             |
| Gas limit                  | ceil(current estimate ? 1.20), with an enforced maximum of 15000000 per transaction              |
| Per-invocation allocations | Proposed: deployment 0.002 ETH; integration 0.005 ETH; both also consume the shared 0.02 ETH cap |
| Confirmations              | Two, with a 180-second wait and no automatic write retry                                         |
| Approval status            | Not granted; both execution flags remain unset                                                   |

Exact future deployment command, from the repository root with secure environment injection, **only after explicit approval**:

    npm run deploy:sepolia -w @cipherquiz/contracts

Use npm.cmd on Windows if PowerShell blocks npm.ps1. No secret value belongs in command arguments or history. The [runbook](sepolia-integration.md) documents all variables, secure setup and separate integration authorization.

## Deployment and integration cost planning

Read-only Sepolia eth_estimateGas for this operator and the reviewed creation bytecode returned **8839309 gas**; the script's 20% margin gives **10607171 gas**. At the proposed 0.1 gwei ceiling, maximum deployment gas liability is **0.0010607171 ETH**. The observed operator balance is **0 ETH**, so deployment is blocked on funding. The RPC snapshot suggested max/priority fees of 71/50 wei per gas; the corresponding deployment estimate is 0.000000000627590939 ETH. These are volatile provider suggestions, not approved or guaranteed future prices. Costs are denominated in Sepolia test ETH, with no fiat-cost claim.

The earlier local unsigned estimate of 1545261 gas is materially lower and must not substitute for this network estimate. The creation bytecode hash is unchanged. No transaction receipt exists.

The existing four-question local mock test now reports gas for planning without changing its security assertions:

| Integration action | Local mock gas | With 20% margin | Illustrative ETH at 0.1 gwei |
| ------------------ | -------------: | --------------: | ---------------------------: |
| createRound        |         596872 |          716247 |                 0.0000716247 |
| submitAnswers      |         649183 |          779020 |                 0.0000779020 |
| finalizeRound      |          69493 |           83392 |                 0.0000083392 |
| Total              |        1315548 |         1578659 |                 0.0001578659 |

These are **provisional local integration estimates**, not measured Sepolia costs. Ciphertext calldata can change gas slightly. Exact live integration estimates are blocked until an approved deployment exists and real SDK ciphertext/proof inputs are available. We do not fabricate a deployed address or submit transactions to obtain an estimate.

A separate enforceable planning bound resolves aggregate headroom without assuming mock/network parity: each integration write is limited to 15000000 gas and 0.1 gwei, so its maximum permitted fee is 0.0015 ETH. All three integration writes together are bounded by **0.0045 ETH**. Current deployment estimate plus margin and this integration ceiling total **0.0055607171 ETH**. Even if all four permitted transactions hit the absolute gas/fee ceilings, they total at most **0.006 ETH**. These figures are bounds under the proposed limits, not estimates of what the entire test will cost and not permission to spend. The owner's **0.02 ETH remains the strict aggregate cap**, including subsequent attempts.

Before deployment the script checks that deployment plus all three integration ceilings fit the remaining aggregate allowance. Before integration, the runner checks three-write headroom; every individual write is still simulated and estimated afresh. Any over-ceiling estimate, excessive suggested fee, insufficient balance or exhausted budget stops execution. The scripts do not raise limits to make a failing operation fit.

## Persistent aggregate accounting

Both write commands share contracts/.sepolia-budget.jsonl, bound to chain 11155111 and the reviewed operator. Before any wallet broadcast they acquire an exclusive lock, re-read the ledger, reserve gasLimit ? maxFeePerGas, append and fsync the reservation, then release the lock. The total of all reservations cannot exceed 20000000000000000 wei. Budget persists across deployment, integration, process restarts and retries. Per-invocation limits add a tighter bound; they do not reset aggregate capacity.

Maximum liability remains reserved even when signing, broadcasting, waiting or a receipt fails. Confirmed cheaper receipts do not automatically release the difference. This intentionally stops sooner than actual spending might require. A crash lock, malformed/truncated ledger or exceeded cap blocks further reservations. No record is reset or silently repaired. Only public reservation IDs/amounts are logged; no secret or proof is stored. Stage A creates no production ledger or reservation.

Use this single canonical checkout and retain the ignored ledger and its lock across runs. Do not delete/edit it, run from a second fresh clone, or manually broadcast outside the controlled scripts. Local accounting cannot constrain unrelated wallet activity or deliberate ledger deletion. Any such transaction/replacement would require a new budget reconciliation and explicit authorization first. No ETH-valued service/funding transaction is authorized or performed in Stage A; if later required, include its liability in the same aggregate budget before execution.

## Stage B approval checkpoint

Public operator and aggregate cap are now supplied. Remaining prerequisites: secure local signer matching the exact operator, trusted HTTPS RPC, a separate player signer, funding, current unsigned estimates and explicit owner approval. The offline signer check and both write commands enforce the pinned address. No actual private signer match has been established yet.

**Do not set either approval flag now.** Request approval for deploying only CipherQuizScoring with the address, constructor, artifact, network, proposed transaction ceilings and strict aggregate cap above, conditional on the remaining local/funding checks passing. Deployment-only approval does not authorize the three integration writes; request that scope separately. No onchain transaction has been sent.

Real input proofs, live scoring and uncached authorized player KMS decryption remain unverified. Outsider/operator SDK denial is not independent remote KMS denial; that evidence gap remains explicit. Stage B must record actual hashes, block numbers, receipt gas/fees and timings, and stop when either the remaining aggregate allowance or transaction limits are inadequate.

## Verification results

`npm run check` passed after the operator/budget update: all five builds and workspace typechecks, ESLint/Solhint, formatting and **30 local tests** (3 API, 4 existing frontend, 9 orchestration/policy guards, 14 Hardhat). No failures or skips. New tests cover the pinned public address, durable cumulative reservations across attempts, exact cap exhaustion, damaged/locked journals and immutable fee/gas ceilings. Signer-role tests use disposable in-memory signers; none tests possession of the owner's private key. Hardhat tests use mock encryption and do not exercise real KMS. Existing scoring assertions remain intact; only gas reporting was added to their helper/mixed-score case.

Read-only Sepolia preflight passed as recorded above. The unsigned local gas estimate submitted no transaction, including on the local chain. `npm audit --omit=dev` returned zero known production vulnerabilities. `git diff --check` passed. No fresh `npm ci` reproduction was attempted. The first sandboxed `npm run check` stopped at the known Vite/esbuild parent-directory restriction; the authorized external run passed. The first sandboxed RPC/advisory requests were blocked; authorized external retries passed. A formatter invocation explicitly including `.env.example` failed because it has no parser; supported source/document files were then formatted and the full formatting check passed. No `.env` contents were rewritten.

Deployment and the live integration runner were deliberately **not invoked** in Stage A. Their gates are covered by local guard tests; the actual transaction-capable scripts remain typechecked and reviewed only. Real encrypted input acceptance, live FHE scoring, uncached player KMS decryption, live duplicate/unauthorized reverts and live transaction costs/latency await separately approved Stage B execution. See [verification history](verification.md) for earlier preparation and local evidence.
