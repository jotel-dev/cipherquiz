# CipherQuizScoring Stage A predeployment report

Date: 2026-11-11 (Africa/Lagos). **STOP: no Sepolia deployment or other transaction is authorized or submitted.** Local checks and read-only Sepolia configuration checks are complete. A signer-specific approval package remains blocked on the public operator address and budget selection. This report does not claim real encrypted scoring or KMS verification.

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

Observed block `12112749`, timestamp `1794412596`, chain ID `11155111`. Installed protocol ID is `10001` (distinct from the Ethereum chain ID).

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

## Proposed deployment and costs

**Not executable until signer setup, budget selection and explicit approval.** From the repository root, with secrets injected securely and approval flag set only after authorization:

```sh
npm run deploy:sepolia -w @cipherquiz/contracts
```

On Windows PowerShell use `npm.cmd` in place of `npm`. Do not put keys or credential-bearing RPC URLs in command arguments/history. The [runbook](sepolia-integration.md) lists all environment variables and the separate integration command.

| Parameter                           | Proposed value/status                                                                           |
| ----------------------------------- | ----------------------------------------------------------------------------------------------- |
| Network                             | Ethereum Sepolia only, chain ID `11155111`                                                      |
| Contract                            | `contracts/src/CipherQuizScoring.sol:CipherQuizScoring`                                         |
| Signer public address               | **Unavailable; owner must provide/select the real dedicated account. No address was invented.** |
| Constructor                         | `authorizedOperator = CIPHERQUIZ_OPERATOR_ADDRESS = derived deployment signer`                  |
| Transaction value                   | `0` wei; only Sepolia gas fees                                                                  |
| Gas limit                           | `ceil(estimatedGas × 1.20)`, freshly estimated before broadcast                                 |
| Confirmations/timeout               | Two confirmations; 180 seconds; no automatic write retry                                        |
| Example fee cap                     | **Proposed, unapproved:** `1,000,000,000` wei/gas (1 gwei)                                      |
| Example deployment budget           | **Proposed, unapproved:** `3,000,000,000,000,000` wei (0.003 Sepolia ETH)                       |
| Example separate integration budget | **Proposed, unapproved:** `7,000,000,000,000,000` wei (0.007 Sepolia ETH)                       |

An unsigned estimate on isolated local Hardhat chain `31337` returned **1,545,261 gas**, or **1,854,314** with the margin. At the example 1 gwei cap, deployment would reserve approximately **0.001854314 Sepolia ETH**, subject to the real signer-specific Sepolia estimate. This is a local planning estimate, not a measured network receipt. The read-only network snapshot suggested maximum/priority fees of 70/50 wei per gas; this volatile observation is not an approved cap or future fee quote.

The example total envelope is 0.01 Sepolia ETH across deployment plus three integration writes; it is a proposed safety ceiling, not a claim that all runs will fit. Example account funding split: operator 0.007 and player 0.003 Sepolia ETH; stranger zero. Funding is not performed by these scripts. Actual balances, per-operation network gas estimates, service availability and sufficient funding remain unverified until real public signer details are supplied. Deployment and integration each use `CIPHERQUIZ_MAX_TOTAL_GAS_COST_WEI` as their **own invocation's allocation**, so set 0.003 and 0.007 respectively if that proposal is approved. A fresh run/retry requires reviewing previous hashes and remaining aggregate approval budget.

Both scripts stop if estimated gas with the margin exceeds their allocation, fee suggestions exceed the cap, priority fee exceeds the cap, or signer balance is inadequate. Actual mined fees may be lower than the reserved maximum. No staking, payout, token transfer, automatic funding or production-network transaction is included.

## Stage B approval checkpoint

Required inputs: real public operator address; separate securely provisioned player signer; trusted HTTPS RPC; funded test accounts; selected fee cap and separate deployment/integration allocations. Public-address preflight must then supply the actual signer-specific unsigned Sepolia estimate and balance before requesting approval for that concrete deployment.

**Do not set either approval flag or execute either transaction-capable command now.** After the missing public details are available, request explicit owner approval covering the named signer, reviewed artifact, constructor, chain and budget. Deployment-only approval does not authorize the three integration transactions; obtain that scope explicitly too.

Stage B must retain deployment/test hashes, block numbers, gas/cost and timings, verify real proofs/scoring and uncached player decryption, and report unsupported remote-negative KMS verification accurately. Local and read-only checks cannot establish these outcomes. The runner's outsider/operator denials remain SDK checks unless independent remote evidence is obtained.

## Verification results

`npm run check` passed after the code changes: all five builds and workspace typechecks, ESLint/Solhint, formatting and **26 local tests** (3 API, 4 existing frontend, 5 orchestration guards, 14 Hardhat). No failures or skips. Hardhat tests use mock encryption and do not exercise real KMS. The new role/budget guard test uses disposable in-memory signers and checks identical roles, invalid scalars and absent/invalid fee allocations before network access.

Read-only Sepolia preflight passed as recorded above. The unsigned local gas estimate submitted no transaction, including on the local chain. `npm audit --omit=dev` returned zero known production vulnerabilities. `git diff --check` passed. No fresh `npm ci` reproduction was attempted. The first sandboxed `npm run check` stopped at the known Vite/esbuild parent-directory restriction; the authorized external run passed. The first sandboxed RPC/advisory requests were blocked; authorized external retries passed. A formatter invocation explicitly including `.env.example` failed because it has no parser; supported source/document files were then formatted and the full formatting check passed. No `.env` contents were rewritten.

Deployment and the live integration runner were deliberately **not invoked** in Stage A. Their gates are covered by local guard tests; the actual transaction-capable scripts remain typechecked and reviewed only. Real encrypted input acceptance, live FHE scoring, uncached player KMS decryption, live duplicate/unauthorized reverts and live transaction costs/latency await separately approved Stage B execution. See [verification history](verification.md) for earlier preparation and local evidence.
