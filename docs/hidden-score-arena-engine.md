# Hidden Score Arena: complete local gameplay engine

Phase B gameplay milestone, **2026-11-14**, on `feat/hidden-score-arena`, based on **`64ce617`**. This implements the requested **token-free game lifecycle** and future settlement interface. The funded-engine stage in the [Phase A architecture](hidden-score-arena-architecture.md) remains separate: no actual token deposits, staking, payout transfers, admission mask or vault custody is implemented here. Entitlement units are not money. No deployment is authorized or performed.

## Implementation and compatibility

- [HiddenScoreArena.sol](../contracts/src/HiddenScoreArena.sol): standalone non-upgradeable engine, derived from the Phase A circuit. Immutable publisher/consumer, immutable ten-question configuration, commitment consent, two-player scoring/comparison, cancellation, deadline policy, terminal ACL and transient settlement interface.
- [ArenaEngineConsumerLab.sol](../contracts/src/lab/ArenaEngineConsumerLab.sol): **31337-only** consumer demonstrating original-handle FHE composition and once-only symbolic recording. It is not an ERC-7984 vault or deployable Sepolia consumer.
- [arena.ts](../packages/blockchain/src/arena.ts): pure exported client ABI, exact content/terms hashing, legitimate answer packing and installed SDK input shape. No SDK instance, wallet, RPC, storage or signature is constructed.
- [Engine security cases](../contracts/test/arena-engine.test.ts) and [four client compatibility tests](../packages/blockchain/test/arena.test.ts). All previous Phase A fixtures/tests are preserved as historical proof-of-concept evidence.

Unlike the local consumer, the engine has no 31337 constructor guard; this is a network-configured contract candidate, **not permission or readiness to deploy it**. Its tests check the named Hardhat network, chain **31337** and mock mode before constructing fixtures. There is no new deployment/live runner or approval flag. Existing `deploy:sepolia` targets the approved V1 artifact and must not be reused for Arena.

Deployed V1 at **0x4b4c204d28D5ee37896278C5fc56d61086f92b53**, existing single-player staking source, approved frontend and spending controls remain unchanged. No existing rounds/claims are migrated. The public blockchain package gains Arena exports without changing its old deployment-status constants. The frontend itself is not wired to the new engine.

Current official [FHE operations](https://docs.zama.org/protocol/solidity-guides/smart-contract/operations), [ACL](https://docs.zama.org/protocol/solidity-guides/smart-contract/acl) and [generic SDK encryption/decryption](https://docs.zama.org/protocol/sdk/guides/encrypt-decrypt) were rechecked. Installed FHEVM **0.11.1**, plugin/mock **0.4.2**, relayer SDK **0.4.1** and public SDK **3.7.2** compile unchanged. No dependency/lockfile update or speculative API was introduced. Generic SDK calls remain an explicit future live-validation gate.

## Immutable identity and same-question guarantee

`Config` stores two reserved distinct players, **ten unique nonzero ordered question hashes**, nonzero bank root, exclusive join deadline and common answer duration (**60..3600 seconds**). Players cannot equal publisher or consumer. There is no open matchmaking, seat replacement, key update, duration extension, operator outcome setter or administrative upgrade. Unique hashes prevent identical leaves; they do not detect semantically duplicated questions under different content/IDs.

The publisher directly calls `createRound(expectedId, config, keys, proof)`, importing exactly ten keys with sender/contract-bound proofs. The explicit expected ID prevents a reordered creation silently changing contextual-answer identity. IDs are 1..2^47-1. Every external key/answer handle is consumed once across this deployment; reverted imports undo both nonce and registry writes.

The exact commitments are:

```text
RULES_HASH = keccak256(UTF8("CipherQuiz.Arena.TokenFree.v1"))
contentHash = keccak256(abi.encode(bytes32[10] questionHashes))
keyCommitment = keccak256(abi.encode(bytes32[] importedExternalKeyHandles))
termsHash = keccak256(abi.encode(
  RULES_HASH, uint256(chainId), engine, publisher, consumer,
  uint64(roundId), Config, keyCommitment
))
```

`Config` ABI order is `(address[2] players, bytes32[10] questions, bytes32 bankRoot, uint64 joinDeadline, uint32 duration)`. Each client recomputes terms from readonly metadata and original handles, verifies manifest leaves and then signs only `joinRound(id, expectedTermsHash)`. A mismatching hash reverts without recording consent. Both seats use the same stored ordered keys/questions. Proofs attest ciphertext import, not plaintext truth or bank membership.

The client manifest leaf convention is `keccak256(abi.encode(string id, uint32 revision, string prompt, string[4] choices))`, exact UTF-8 bytes with **no implicit whitespace/Unicode normalization**. Both clients must use the same available versioned manifest. Solidity stores opaque leaves; it cannot prove that browser content matches them, that the declared bank root contains them, or that private answer keys are correct. Frontend verification and authoring trust remain necessary. No plaintext answer-key hash, unsalted answer commitment or production answer material is committed to Git.

## Lifecycle and cancellation rights

| State                                    | Action / conditions                                              | Result                                                                                                            |
| ---------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Waiting                                  | Reserved player joins once before `joinDeadline`, matching terms | Set consent bit (A=1, B=2). First join starts no answer timer.                                                    |
| Waiting                                  | Second join                                                      | Active with common exclusive deadline `block.timestamp + duration`.                                               |
| Waiting, no consent                      | Publisher cancels strictly before expiry                         | Cancelled / PublisherCancelled; zero units to both.                                                               |
| Waiting, one consent                     | That joined player cancels strictly before expiry                | Cancelled / PlayerCancelled; one unit only to that seat. Publisher, outsider and unjoined opponent cannot cancel. |
| Waiting at/after expiry                  | Anyone finalizes                                                 | Cancelled / JoinExpired; one refund-entitlement unit per actually joined seat, zero for unjoined seats.           |
| Active before deadline                   | Seat submits one full valid-proof batch                          | Set submitted bit; compute encrypted score. No score view granted yet.                                            |
| Active, both submitted                   | Anyone finalizes immediately, including long after deadline      | Finalized / Completed; compare the original scores.                                                               |
| Active at/after deadline, one submitted  | Anyone finalizes                                                 | Finalized / AnswerExpired; sole submitter wins even with score zero.                                              |
| Active at/after deadline, none submitted | Anyone finalizes                                                 | Finalized / AnswerExpired; one refund-entitlement unit each.                                                      |
| Terminal                                 | Join, submit, cancel or finalize again                           | Revert. Consumer may reread source; financial idempotency belongs in the future vault.                            |

No voluntary cancellation is possible in Active, even before either answer batch. An operator cannot cancel after the first consent, extend time, change keys or override a completed result. Waiting players can withdraw consent instead of being trapped by an unresponsive opponent. All pre-expiry cancellations become deterministic permissionless expiry after the boundary. A duration/uint64 upper-bound validation prevents deadline addition overflow for every accepted join timestamp.

States are **Missing=0, Waiting=1, Active=2, Finalized=3, Cancelled=4**. Closure reasons are **None=0, Completed=1, AnswerExpired=2, JoinExpired=3, PublisherCancelled=4, PlayerCancelled=5**. A reason never identifies a secret winner; timeout outcomes are already inferable from public submissions.

## FHE circuit, input validity and entitlements

Each encrypted `uint64` answer is `(roundId << 17) | (seat << 16) | (index << 8) | choice`, with valid choice 0..3 and index 0..9. `FHE.fromExternal` binds import to this engine and the direct player caller. The circuit checks full encrypted contextual equality to `key + publicContext`, AND key < 4, casts the boolean to `euint8` and sums ten contributions. Invalid choice/key/context contributes zero without revealing which input failed. Even uint64-max keys are independently masked. Score bounds are 0..10 without uint8 overflow.

The installed library also supports **empty-proof imports of already-authorized handles** for intercontract/smart-account workflows. This engine deliberately rejects empty proofs for both keys and answers before importing any handle; every accepted batch follows the nonempty bound-proof path. [ArenaInputReuseLab](../contracts/src/lab/ArenaInputReuseLab.sol) is a permissive 31337-only test issuer that grants both player and engine access to contextual ciphertexts. Its regression proves those handles still cannot bypass this input policy with an empty proof and that flags/nonces/registry roll back. V1 and Phase A are preserved unchanged; this stricter engine interface does not claim support for that alternative library import mode.

Both scores share the same encrypted key array. Compare with `FHE.gt`, `FHE.eq` and nested `FHE.select`: outcome **1=A wins, 2=B wins, 3=tie, 4=cancel/refund**. No backend winner, operator result signature or plaintext KMS response is accepted by finalization. Complete valid-proof submissions count for forfeits even if all choices are wrong; an invalid proof does not count.

In Active/Finalized, entitlement units are **[2,0]**, **[0,2]** or **[1,1]**. Cancelled waiting rooms assign the joined-seat mask only: **[0,0]**, **[1,0]** or **[0,1]**. This fixes the Phase A consumer's synthetic two-refund-unit cancellation demonstration. **Joined is still not funded**: actual payouts/refunds must use a future vault's actual locks. There is no token address, stake size, deposit, withdraw or claim function in this engine.

## ACL and settlement interface

| Value              | Persisted engine access | Participant access                                                   | Consumer access                     |
| ------------------ | ----------------------- | -------------------------------------------------------------------- | ----------------------------------- |
| Keys               | Yes                     | No added permanent decrypt grant; publisher knows authored plaintext | None                                |
| Scores             | Yes                     | Own score only after terminal state; opponent denied                 | None                                |
| Outcome            | Yes                     | Both players after terminal state                                    | Transient in `shareSettlement` only |
| Entitlement shares | Yes                     | Own units only after terminal state                                  | Transient in `shareSettlement` only |

No handle is publicly decryptable. Inputs already known to their creators cannot be made unknown by ACL. A terminal zero for a missing submission is only the deterministic default, not a verified submitted score.

`shareSettlement(id)` is restricted to immutable `CONSUMER`, requires a terminal round and returns `(termsHash, players, joinedMask, originalOutcome, originalShares)`. It grants same-transaction computation ACL only on outcome/shares; never raw scores. It may be called more than once because a future vault must authenticate source/domain and enforce once-only **financial** settlement itself. The local consumer records once, derives new ciphertexts using FHE, persists its own outputs/owner ACL and does not retain permanent source permissions. Its configurer can bind exactly once with reverse-consumer validation; that is a local fixture, not audited factory attestation.

A funded successor needs a distinct rules hash, immutable token/quote/source identity, actual two-seat reservations, encrypted pair-admission masking, exact-lock refunds, solvency/conservation, withdrawal reconciliation and reentrancy tests from the preserved staking design. Do not attach real funds to this token-free scorer or interpret its freely earned units as funded claims. A handle, consent bit or SDK success cannot substitute for actual token movement.

## Frontend/API contract

The exported `arenaAbi` matches every compiled function signature/output and event index, including inherited `confidentialProtocolId`; it also includes the engine's custom errors. The compatibility test fails on compiler/client drift. No private values are embedded in event schemas.

| Read call                                  | Purpose                                                                                                        |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `getPublicRound(id)`                       | Fixed players, state/reason, consent/submission masks, timing, bank/content/key/terms commitments. All public. |
| `getQuestions(id)`                         | Exactly ten ordered manifest leaves.                                                                           |
| `getKeyHandles(id)`                        | Original ciphertext metadata for commitment verification; no decryption right.                                 |
| `getResults(id)`                           | Encrypted score/outcome/unit handles; uncomputed fields are zero handles.                                      |
| `nextRoundId`, role/rules/protocol getters | Explicit creation nonce and deployment identity.                                                               |
| `usedInputs(handle)`                       | Public replay registry, not answer plaintext.                                                                  |

Clients derive availability from state, masks and chain timestamp, then simulate the exact call immediately before requesting a signature. Waiting expiry is independent of Active answer deadline. Do not enable decrypt on zero handles, before finalization, for opponent scores, or before verifying contract/chain/ACL. A UI prediction is not an inclusion guarantee. Event streams need finalized receipt reconciliation; events are hints, not authority over current contract state.

`arenaTermsHash`, `hashArenaQuestion`, `arenaContentHash`, `arenaKeyCommitment`, `packArenaAnswers` and `arenaEncryptionRequest` are pure utilities. Packing rejects invalid round IDs/seats, non-ten batches and noninteger/out-of-range choices before encryption. Hash helpers calculate commitments; they do not establish semantic correctness or replace onchain config validation. Values must never be logged. Existing real SDK encryption returns handles/proof used by `submitAnswers`; no mocked frontend encryption API is added. Pure-call annotations permit unused Arena exports to be eliminated from the existing single-player frontend bundle.

## Security limitations

Publisher knowledge, false answers, selective content, collusion and Sybils remain trusted risks. Nonzero bank root is a commitment label, not an implemented membership/selection proof. No randomness or fair bank selection is implemented. Commitments prevent later changes; they do not prevent choosing unfair content beforehand. See Phase A for independently reviewed banks, multi-party authoring and future verifiable selection options.

Repeated question sets and participant score/outcome disclosure permit inference oracles, pre-study and answer sharing. A common deadline does not guarantee simultaneous prompt delivery, equal prior knowledge or transaction inclusion. Input/proof/chain outages can cause forfeits; no discretionary operator override is available. Public players, timing, masks, states and activity remain visible. Forfeits/refunds reveal their logical outcome even when handles remain encrypted. Participants can disclose their own results.

Direct result ACL grants persist; permit expiry does not revoke them or erase plaintext. Future live permits should be explicitly authorized, contract-scoped and valid at most one day. SDK preflight rejection, permit failure, relayer failure and remote KMS denial are different observations. Local user-decryption tests prove the mock ACL path only; **no real Arena KMS success or remote denial was tested**. Browser, dependency, Zama protocol and token-administration assumptions remain relevant.

## Local validation and measurements

Targeted checks passed **30 engine cases**, **four client cases**, contracts/blockchain typechecks and ESLint/Solhint. This includes the explicit empty-proof/pre-authorized-handle regression. Engine tests cover each score 0..10, low/high ties, both zero-score forfeits, unmatched/cancellation rights, actual last-second joins/submissions, exact-deadline readonly rejection, immutable commitments, nonce/proof/handle rollback, wrong context, duplicate/foreign submissions, raw-score ACL, transient consumer computation, maximum packed ID and EIP-170 size. Client tests independently compare ethers/viem commitment encodings, mutate every domain/config field, bound packing and verify compiler ABI compatibility. Full repository results are recorded after execution.

One local mock flow measured **11,356 deployed bytecode bytes** (below EIP-170 24,576). Excludes deployment gas, proof-generation latency and any network/relayer costs:

| Call                              | Local mock gas | Global HCU | Maximum depth |
| --------------------------------- | -------------: | ---------: | ------------: |
| Create ten-key round              |      1,578,822 |          0 |             0 |
| Second join                       |         40,363 |          0 |             0 |
| One ten-answer submission         |      1,422,050 |  4,840,352 |     1,158,032 |
| Compare/finalize and derive units |        518,687 |    606,224 |       492,000 |
| Local consumer record             |        310,509 |    220,064 |       110,000 |

Mock gas varies with fixture/calldata. Zero measured HCU for import/join does not imply free real proof verification or transactions. These are observations, not maximum fee quotes, target-network capacity or real cryptographic performance. Re-estimate every live transaction; source bytecode size includes compiler immutable placeholders. The tests use disposable Hardhat accounts and mock proofs; the maximum-ID test deliberately overrides **local** storage to reach an infeasible nonce boundary.

**`npm run check` passed** builds, all workspace typechecks (including integration/test types), ESLint, zero-warning Solhint, formatting and **108 tests**: 3 API, 4 frontend, 26 blockchain and 75 Hardhat. Zero failures/skips. This includes the old single-player tiers/scoring, staking invariants, persistent-cap/approval guards and real-KMS-evidence regressions. The frontend build completed without a chunk-size warning after unused-export tree shaking; its source/design remains unchanged. Changes after this full run are documentation-only and receive focused format/diff/link checks.

Original V1 creation hash **0x4b033120899ac98fde5d0e1f8eded615afd01a48d825fdcc06766f3bd877cbcf** and ABI hash **0x5d23326a0b9c4968960381e6694d1662e19320c83f1bcdb946e478d789f23a18** remain exact. Final engine creation hash is **0x35cee63b97dc005ad81044a8c348d5e121a0ac3246fd19d82b2eec674ab4bfc4**, ABI hash **0x273d1ca04896cec99e9597743a67ae1226888c83815308bb160b62b37ee4b3a8**; no live runtime identity is claimed. Protected legacy/V1/staking/frontend/live-runner/manifest diffs against `64ce617` are empty. Environment and spending journal match the snapshots taken before this task; no spending/approval setting or reservation changed.

Verified feature checkpoints pushed with matching remote hashes: **`3531a5072422ab99944782e448555cdef80ba243`** (engine/29 initial cases), **`df6c1e08967503b03562e15ae9c5819d89f4d4ef`** (client ABI/commitments), **`2724d51e4b1e6373616c5dc95928c2f1151d884f`** (strict proof guard/30th case and tree shaking). Final documentation/secret audit and synchronization are completed before stopping and summarized in [verification](verification.md). See the [precise gated Sepolia plan](hidden-score-arena-sepolia-plan.md); no live operation, permit, deployment, merge or spend occurred.
