# Read-only diagnosis of the stopped Sepolia integration

Date: **2026-11-13**. Scope: inspection, public RPC reads, local tests and source/documentation updates only. **No Sepolia signing, permit issuance, decryption request or write was performed during this diagnosis.** Deployment and integration flags remain unset; spending policy and the persistent journal were not changed.

Subsequent separately authorized work: the [single player-only offchain diagnostic](sepolia-player-offchain-diagnostic.md) completed one one-day permit, observed SDK `NotEntitledError` rejection before any remote KMS request, and reproduced the strict error-name classifier mismatch. The original report below remains the historical read-only evidence boundary.

## Finding and evidence boundary

**Round 1 is recoverable, but the precise original exception is not recoverable from the retained execution report.** The confirmed failure boundary is after successful `submitAnswers` and its duplicate-submission rejection check, before `finalizeRound`. No completed `verified-sdk-acl-denial` marker was recorded. The original failed worker was stopped after its test failed but before a detailed exception was emitted. The [complete execution report](sepolia-integration-execution.md) is the retained evidence; no additional detailed execution log was found in the repository.

The original stage label covered this entire sequence:

1. Read `getRound(1)`, assert Submitted and nonzero score.
2. Read score ACL for contract, player, operator and ephemeral stranger.
3. Grant the player's contract-scoped permit.
4. Expect `sdk.decryption.decryptValues` to reject with an ACL error recognized by `isAclDenial`.

It is therefore **not established which individual assertion or SDK operation failed**. A failed read, stranger ACL assertion, permit/key setup failure, unexpected decryption success, or an unrecognized SDK rejection cannot be distinguished retrospectively. Player permit issuance during the original invocation remains uncertain. No raw request/error/permit payload was exposed to fill this gap.

## Independent receipt and state checks

RPC chain ID was **11155111**. Snapshot: latest block **12127285**, timestamp **1794588864 = 2026-11-13 16:54:24 UTC**; finalized block **12127212**. Both supplied transaction receipts were successful and finalized:

| Call            | Transaction                                                          |    Block | Event                    | Gas used | Effective price |   Actual cost in ETH |
| --------------- | -------------------------------------------------------------------- | -------: | ------------------------ | -------: | --------------: | -------------------: |
| `createRound`   | `0x07ff7fd4acff4e89e457469c7f576ccefc9aecdf278998eb290c60792d0b08e6` | 12127160 | `RoundOpened(1, player)` |  2137805 |          19 wei | 0.000000000040618295 |
| `submitAnswers` | `0x767f42afac9cb0f73c7afe69566740fbf94c6d398c3fb23e8d058cb6997ab1b6` | 12127163 | `AnswersSubmitted(1)`    |  1432656 |          19 wei | 0.000000000027220464 |

The target was **0x4b4c204d28D5ee37896278C5fc56d61086f92b53** in both cases; callers and nonces were operator **1** and player **0**; ETH value was zero. Independent multiplication of receipt `gasUsed * effectiveGasPrice` gives **67838759 wei = 0.000000000067838759 ETH** total. There was no failed EVM receipt for either supplied transaction.

Historical `eth_call` reads pinned to submission block **12127163**, and current reads pinned to **12127285**, agreed:

- Round **1**, **Submitted (2)**, approved player **0xc0a50A4E032b19c905509E8f5EFD35fC7EA82D49**, four questions, nonzero encrypted score.
- Score ACL: scoring contract **allowed**, player **denied**, operator **denied**, public decryption **disabled**.
- All four key handles: scoring contract **allowed**, player/operator **denied**, public decryption **disabled**.
- The ephemeral stranger address from the original process was not retained, so that specific ACL assertion cannot be independently replayed for the same identity.

The contract's immutable operator is **0xbE4a3DAABCd4406e75314aC7324411249E0C36a2**, `nextRoundId = 2`, and deployed runtime hash remains **0x98e53c2f853afaedee48a173730a1730d0c71f2cbd9cf61aafd3c8cb980daccc**, matching the reviewed deployment. These results establish correct observable state at the submission block and now; they do not prove every original RPC read succeeded.

| Account  | Latest and finalized balance (ETH) | Confirmed / pending nonce |
| -------- | ---------------------------------: | ------------------------: |
| Operator |               0.049999999801547805 |                     2 / 2 |
| Player   |               0.049999999972779536 |                     1 / 1 |

No pending finalization from these accounts was indicated by the checked provider. No score was decrypted; expected plaintext **2/4**, successful authorized decryption and independent remote KMS denial remain unverified.

## Deadline and recovery

Round deadline: **1794590952 = 2026-11-13 17:29:12 UTC / 18:29:12 Africa/Lagos**. It **had not expired at the checked block**: 2088 seconds remained. This is a block-timestamp observation, not a promise that the deadline remains in the future when this report is read.

`submitAnswers` enforces the deadline only when accepting an Open round's submission. `finalizeRound` checks the deadline and creates an encrypted zero **only for an Open, unsubmitted round**. For this already Submitted round, either the immutable operator or designated player can finalize, before or after the deadline, preserving its existing encrypted score and granting player access. The original score handle remains usable by the contract. No new round, answer submission, answer-key reinitialization, or contract modification is needed. SDK/KMS availability and eventual plaintext correctness are separate from this contract-level recovery conclusion.

Local Hardhat coverage explicitly submits before the deadline, advances beyond it, finalizes, and verifies the preserved decrypted score. This is isolated mock execution, not a Sepolia transaction or proof that remote decryption will succeed.

## SDK, relayer, permit and KMS diagnosis

The runner uses installed **@zama-fhe/sdk 3.7.2** with the Node relayer and **@fhevm/sdk 0.13.2**. Real encrypted input proofs were accepted by both successful transactions. This proves that the earlier encrypted-input path worked; it does not validate the separate permit/decryption path.

Installed `@fhevm/sdk` `checkPersistAllowed` checks the user and contract ACL before remote KMS requests and throws `AclUserDecryptionError` on denial. The higher-level SDK's `wrapDecryptError` can wrap an actor denial in **`NotEntitledError` / `NOT_ENTITLED`**, preserving a cause. See the [official error reference](https://docs.zama.org/protocol/sdk/api-references/sdk/errors). The current helper walks causes and accepts `AclUserDecryptionError`; a preserved underlying ACL error therefore already passes. A wrapper whose cause loses that name would fail this strict predicate. **A classifier mismatch is a possibility, not a confirmed cause of the original failure.** No classifier was broadened based on that speculation.

A timeout, RPC/relayer error, signature rejection, missing transport key or generic decryption failure is not ACL-denial evidence. An SDK preflight rejection does not establish independent remote KMS denial. The retained evidence proves neither a KMS outage nor a remote KMS authorization rejection. Existing in-memory permits/transport keys were not retained; no fresh permits or remote decryption attempts were issued for this diagnosis. Previously issued copied permits, if any, must still be treated as potentially valid until expiry subject to ACL; stopping the process is not remote revocation. See the [SDK security model](https://docs.zama.org/protocol/sdk/concepts/security-model).

## Diagnostic correction and proposed continuation

The previous fine stage labels were added **after** the failed invocation. They could identify a future broad failure stage, but buffered test diagnostics and the absence of safe error categories could still conceal the rejection type. The smallest verified correction is now limited to diagnostics:

- Immediate public checkpoints for score state, each actor's pre-finalization ACL read, scoped permit setup and SDK denial.
- Immediate `scoped-permit-ready` output, rather than a potentially buffered test diagnostic.
- Fixed, allowlisted error names/codes from a bounded, cycle-safe cause traversal; no messages, bodies, signatures, credentials, handles or plaintext results are emitted.
- Separate rejection evidence from unexpected decryption success, with an explicit `remoteKmsDenialVerified: false` field. The original strict denial assertion remains intact.

Local regressions verify that wrapped ACL evidence is recognized, unrelated errors still fail, sensitive fields cannot enter diagnostic output, and cyclic errors terminate. These changes have **not** been replayed against Sepolia and cannot reconstruct the missing original exception.

**Do not rerun `test:sepolia`: it creates a new round.** The smallest next diagnostic step, requiring separate explicit approval, is a narrowly scoped probe pinned to round **1**, its existing score and the deployed contract: fresh public state/ACL checks; at most one new player-only contract-scoped EIP-712 permit (maximum 30 days); one player negative SDK decryption attempt before finalization; immediate sanitized evidence; then stop. It requires **zero onchain writes** and no operator/stranger permit. A dedicated probe must be reviewed before execution and prevent extra signature attempts, including SDK credential-recovery regrant paths. This report does not activate that probe or its approval.

Only after reviewing that result should a separate recovery approval cover **one operator `finalizeRound(1)`**, zero ETH value, maximum **0.0015 ETH**, no automatic retry, against this deployment on chain 11155111. Fresh identity, state/ACL, nonce, balance, gas/fee and journal checks must precede any write. A future recovery runner must stop if the round or score differs and must never call `createRound` or `submitAnswers`. New player permits/authorized decryption and optional operator/stranger negative probes must have their explicit signature scope approved; they are not implied by a finalization approval. No finalization gas estimate or new reservation was made during this diagnosis.

## Retained budget and local validation

All **three** prior chain/operator-bound reservations remain intact: deployment **0.0012728604 ETH**, create **0.0002587127 ETH**, submit **0.0001734233 ETH**. Total permanently reserved liability is **0.0017049964 ETH**, leaving **0.0182950036 ETH** under the unchanged **0.02 ETH** cap. The earlier **0.0187271396 ETH** balance predates the two writes. No receipt savings were released, fourth reservation created, lock removed or journal entry altered. The ledger has no active lock; the populated env and journal were verified byte-for-byte unchanged during RPC diagnosis. Both approval flags remain unset.

The optional future finalization's **0.0015 ETH** outer ceiling fits this remaining allowance and would leave at least **0.0167950036 ETH** if that full maximum were reserved; its actual gas-limit reservation must be calculated anew. This arithmetic is not an allocation, active reservation or approval.

Local validation results are recorded in [verification](verification.md). **Stop pending separate authorization for further live operations.**
