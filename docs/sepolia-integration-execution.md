# Single authorized Sepolia integration invocation

Date: **2026-11-13 (Africa/Lagos)**. **PARTIAL RESULT — stopped after two successful writes and a failed post-submission test check. No retry or recovery transaction was performed.** The third approved call, `finalizeRound`, was never broadcast. Round **1** remains **Submitted**. No decrypted score or successful complete integration is claimed.

## Authorization and prechecks

The owner explicitly authorized one invocation against **0x4b4c204d28D5ee37896278C5fc56d61086f92b53**, Ethereum Sepolia **11155111**, limited to operator `createRound`, player `submitAnswers`, operator `finalizeRound`, **0.0015 ETH per write / 0.0045 ETH combined**, and the retained **0.02 ETH** project cap. Reviewed single-contract EIP-712 permits of at most 30 days were authorized for the player/operator/ephemeral stranger. No extra deployment, staking, funding, limit change, merge or automatic retry was authorized.

Offline validation passed for operator **0xbE4a3DAABCd4406e75314aC7324411249E0C36a2** and player **0xc0a50A4E032b19c905509E8f5EFD35fC7EA82D49**. Fresh RPC checked chain 11155111, finalized block **12127084**, operator latest/finalized balance **0.0499999998421661 ETH**, player latest/finalized balance **0.05 ETH**, operator confirmed/pending nonce **1/1**, player **0/0**, exact reviewed deployment/runtime/operator/ABI/infrastructure and next round ID **1**. Latest precheck blocks were **12127155/12127156**. Suggested maximum/priority fees were **22/2 wei per gas**, below the unchanged **0.1 gwei** ceiling. The canonical journal had exactly the deployment reservation and **0.0187271396 ETH** remaining.

A one-shot launcher supplied `CIPHERQUIZ_SEPOLIA_TEST=approved` only to the single integration child after all prechecks passed. It contained no retry loop. The populated env file was not edited; persistent/parent deployment and integration flags remained unset before and after the attempt. Actual execution used reviewed source **a622389** plus a public transaction-hash logging change to flush each submitted hash immediately. Later diagnostic stage improvements were not replayed against Sepolia.

## Mined transactions and independent receipt reconciliation

Both transactions had **zero ETH value**, maximum fee **100000000 wei/gas**, successful receipts and real nonempty SDK-generated input proofs for four encrypted values. The decoded target, caller, nonce, call names and input counts matched the approved scope. Costs below were independently recomputed from RPC receipts, not inferred from gas estimates.

| Field                                        | `createRound`                                                        | `submitAnswers`                                                      |
| -------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Caller                                       | Approved operator                                                    | Approved player                                                      |
| Hash                                         | `0x07ff7fd4acff4e89e457469c7f576ccefc9aecdf278998eb290c60792d0b08e6` | `0x767f42afac9cb0f73c7afe69566740fbf94c6d398c3fb23e8d058cb6997ab1b6` |
| Receipt                                      | **Success**                                                          | **Success**                                                          |
| Block                                        | **12127160**                                                         | **12127163**                                                         |
| Block hash                                   | `0x4069214a736d5f39a11564a5af34c1864df5b75fddd78724f825cd9e739bf74a` | `0x3b76095557c6ef51c4687e76f3f1b37b931c94381e26d85132f78f74bca7ca23` |
| Confirmations at readback block **12127182** | **23**                                                               | **20**                                                               |
| Transaction nonce                            | **1**                                                                | **0**                                                                |
| Estimate / gas limit                         | **2155939 / 2587127**                                                | **1445194 / 1734233**                                                |
| Actual gas used                              | **2137805**                                                          | **1432656**                                                          |
| Effective gas price                          | **19 wei/gas**                                                       | **19 wei/gas**                                                       |
| Actual receipt cost                          | **40618295 wei**                                                     | **27220464 wei**                                                     |
| Actual cost in Sepolia ETH                   | **0.000000000040618295**                                             | **0.000000000027220464**                                             |
| Maximum liability reserved                   | **0.0002587127 ETH**                                                 | **0.0001734233 ETH**                                                 |

**Total actual integration cost: 67838759 wei = 0.000000000067838759 Sepolia ETH.** No `finalizeRound` transaction hash/receipt exists for this invocation, and no fee or reservation was incurred for that call.

The SDK's real key encryption/proof stage completed in **17954 ms** and answer encryption/proof stage in **7472 ms**. Creation elapsed **27026 ms** and submission **22852 ms**, including simulation/estimation, broadcast and the two-confirmation waiting policy. These are workflow timings, not isolated cryptographic-processing benchmarks. The test reported failure after **85547.865 ms**; the lingering worker was subsequently stopped, not restarted.

## Verification outcomes and failure boundary

| Requested evidence                                | Result                                                                                                                                   |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Real encrypted key proof acceptance               | **Verified:** real SDK proof and four encrypted keys accepted by successful `createRound`                                                |
| Real encrypted answer submission/proof acceptance | **Verified:** successful player `submitAnswers` with four encrypted answers                                                              |
| Onchain FHE score operations                      | **Verified execution/storage:** submission succeeded and a nonzero encrypted score handle is stored; plaintext correctness is unverified |
| Expected decrypted result **2/4**                 | **Unverified; decryption stage not reached**                                                                                             |
| Finalization/player score access                  | **Not executed/granted**                                                                                                                 |
| Authorized player decryption                      | **Unverified; not reached**                                                                                                              |
| Unauthorized SDK rejection                        | **Unverified:** the strict post-submission test path failed before a completed denial result was recorded                                |
| Independent remote KMS denial                     | **Unverified**; supported SDK paths also perform local ACL preflight                                                                     |

The live test emitted a failure after successful submission and verified duplicate-submission simulation. Its original diagnostics grouped the following score-state/ACL checks and player permit/denial path too coarsely to identify the exact failing substep. No `verified-sdk-acl-denial` result was emitted. Do not reinterpret the failure as a successful negative test, a proved KMS rejection or an EVM transaction revert. The precise root exception was not captured in the sanitized report before worker termination; raw errors were not exposed because they may contain signing/RPC/plaintext material. The SDK/test-check failure remains unresolved.

The failed worker did not exit promptly after reporting the failure. It was interrupted to stop the approved invocation; a process inventory then found **zero** matching integration workers. There was no restart, finalization, new round, second invocation, additional permit/decryption request or recovery write. After stopping, only public RPC receipt/state/ACL/account reads and local checks were performed.

Subsequent read-only state at block **12127182**:

- `nextRoundId = 2`; round **1**, player matching the approved player, four questions, **Submitted (state 2)**, encrypted score present, deadline **1794590952**.
- Score ACL: contract **true**, player **false**, operator **false**, publicly decryptable **false**.
- All four key handles: contract access **true**, player access **false**, public decryption **false**. No handles or proofs were printed by the verifier.
- Operator balance **0.049999999801547805 ETH**, confirmed/pending nonce **2/2**. Player balance **0.049999999972779536 ETH**, nonce **1/1**. These nonces account for exactly the two observed new writes and no pending finalization from either account at that provider.

The public score/key permissions checked on readback match the intended pre-finalization ACL state. The ephemeral stranger's private runtime identity was not retained, so its specific ACL entry was not independently reread. A submitted round preserves its timely score across late finalization under the reviewed contract; this does not authorize recovery. Do not rerun the whole harness: that would create another round. Any future signatures/writes, including finalization of round 1, require separate owner authorization after reviewing the failed check and current state.

## Persistent budget after the stopped invocation

The ledger has exactly **three** valid entries, associated with chain 11155111 and the approved operator as project-budget identity:

| Operation                            | Reservation ID                         | Liability in ETH |
| ------------------------------------ | -------------------------------------- | ---------------: |
| Previous deployment                  | `bbba8b28-7817-4902-bbff-0f62552552b7` | **0.0012728604** |
| This `createRound`                   | `1b3e15fe-ffe4-4c41-820a-6d1b65704dbd` | **0.0002587127** |
| This `submitAnswers`                 | `83218b2a-8719-42ff-8200-ca32c697fadf` | **0.0001734233** |
| Aggregate reserved                   |                                        | **0.0017049964** |
| Remaining strict aggregate allowance |                                        | **0.0182950036** |

Integration reserved liability is **0.000432136 ETH**, within its **0.0045 ETH** allocation, and both writes remain below their individual maxima. No cheaper-receipt savings were released. No third reservation exists and no lock remains. The ignored journal was preserved, not reset/relabelled; readback verified it unchanged during reconciliation. Source spending policy and the **0.02 ETH** cap remain unchanged. The unspent portion of an allocation does not authorize another invocation. First-integration readiness commands intentionally expect the earlier initial state and will require reviewed reconciliation for future use; never reset the journal/round assumptions to make them pass.

## Permits, expiry and invalidation limitations

The failed check boundary includes possible player-scoped permit setup. **Player permit issuance is not conclusively recorded**: it may have been attempted/completed before the failure, but no permit payload or signature was logged/persisted and the finer progress marker was added only afterward. Operator/stranger negative-decryption permit paths and authorized player decryption after finalization were not reached. Do not claim zero or three successfully issued permits from this evidence.

Any player permit that may have been issued was requested only for this contract on Sepolia under the reviewed default maximum **30-day** lifetime, using actor-isolated in-memory transport-key/permit stores. Such a permit is not restricted to one score handle and may cover other ciphertexts for that same identity/contract while valid and ACL-authorized. It does not override ACL denial or authorize token/ETH transfers. No persistent permit/transport-key artifact was produced by this harness. Process termination discards the session's local stores; it is not remote cryptographic revocation.

According to the installed SDK's public declarations and [official security model](https://docs.zama.org/protocol/sdk/concepts/security-model), `sdk.permits.revokePermits()` removes local cached permits; `sdk.permits.clear()` also removes the local transport key pair. Those storage operations do **not** invalidate an already copied permit at the relayer/KMS. A party holding both a valid permit and its transport private key must be treated as potentially able to use it until expiry, subject to ACL rights. No independently verified remote-invalidation route was established for this installed setup. A source comment referring to protocol-specific timestamp invalidation is not evidence that this network/API supports a usable revocation procedure. No extra invalidation transaction/signature was submitted, and none is implicitly authorized.

Independent unauthorized remote KMS denial remains separate from SDK `checkPersistAllowed` rejection, even if future SDK negative checks succeed. No undocumented raw-relayer bypass or falsified ACL response was used.

## Local changes, validation and stop

Transaction hashes were changed to immediate public console output before the invocation so confirmation failure could not conceal submitted hashes. After stopping, finer stage labels were added around score-state, score-ACL and scoped-permit/SDK-denial checks, plus a public `scoped-permit-ready` marker and an immediate sanitized failure-stage checkpoint. These diagnostics do not log keys, signatures, plaintext answers or request bodies. No security assertion was weakened and no SDK error was accepted as denial merely to make the test pass. No live replay was performed after the diagnostic edits.

Post-edit blockchain typecheck, targeted ESLint/formatting and **15 local guard/policy tests passed**, with no local failures/skips. The **one live test failed** as described above; no live replay was performed. A final bounded configured-secret scan of **144 source files and 45 build/artifact files** found zero matches and independently rechecked the three journal entries, remaining allowance, absent lock and unset persistent flags. Final documentation formatting and diff checks passed. The successful local baseline does not turn this failed live invocation into a pass. See [verification](verification.md). No deployment, staking, limit changes, merge or secret commit occurred. The one-invocation authorization is consumed. **Stop here pending separate authorization for any further write or offchain signature.**
