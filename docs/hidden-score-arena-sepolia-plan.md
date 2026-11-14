# Hidden Score Arena: gated Sepolia integration plan

Prepared **2026-11-14**, Phase B. **Plan only: no deployment, RPC execution, signature, reservation or transaction is authorized by this document.** The [engine report](hidden-score-arena-engine.md) defines the token-free boundary. Single-player V1 and its existing round remain untouched.

## Source and identity blockers before any live approval

1. `HiddenScoreArena` is compiled and locally validated. No Arena address exists or is configured. Never use V1 **0x4b4c204d28D5ee37896278C5fc56d61086f92b53** as the Arena target.
2. Its constructor needs an existing immutable consumer contract. `ArenaEngineConsumerLab` explicitly rejects Sepolia. A dedicated **token-free** test consumer/one-time binder or atomically attested factory must be separately implemented, reviewed and locally validated first. Do not remove the lab guard as an unreviewed deployment shortcut. No funded consumer may accept this engine's units as proof of funds.
3. The existing `deploy:sepolia` script pins the reviewed V1 artifact. There is no approved Arena deployment command. A future separate guarded runner must pin the exact new artifacts/constructor args, chain, signers, calldata, nonces, per-attempt caps, no-retry behavior and canonical persistent spending journal. Review it before presenting a concrete execution command for approval.
4. Assign two distinct dedicated test players; neither may be publisher or consumer. The existing verified test-player address may serve as A after fresh verification. B needs its own offline-verified signer and test funding. Never reuse a regular wallet or expose keys. Verify the operator/deployer separately; do not silently inherit old one-shot approval.
5. Revalidate official current FHEVM host addresses/protocol ID, SDK/relayer configuration, API credentials, authenticated transport and supported permit lifetime. Read-only balance/nonce/finality checks belong in the future approved preflight; no current balance assertion is made here.

This token-free test uses no ERC-7984 token approvals, deposits, wrapping, staking or withdrawals. Funded multiplayer requires the separate admission-aware scorer/vault design and its own review/approval, not a backend bookkeeping attachment.

## Proposed single happy-path invocation

After the source blockers are resolved, request explicit authorization for the exact artifact hashes, actors, constructor arguments and the following bounded writes. Use Ethereum Sepolia **11155111** only. A deterministic **public dummy-content fixture** should produce **A=7/10, B=9/10**, encrypted outcome **2 (B wins)** and shares **[0,2]**. Do not use production answer keys in a public fixture or a committed runner.

| Order | Actor                             | Exact proposed action                                   | Precondition / receipt check                                                                                                                                             |
| ----- | --------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | Approved deployer                 | Deploy separately reviewed token-free consumer          | Pin creation hash/args and contract receipt; no lab-only code.                                                                                                           |
| 2     | Approved deployer                 | Deploy `HiddenScoreArena(operator, consumer)`           | Pin exact artifact and immutable addresses; verify runtime with compiler-declared immutable offsets only.                                                                |
| 3     | Consumer's approved configurer    | One-time bind consumer to engine                        | Exact method/calldata determined by reviewed consumer source, reverse binding verified; cannot invent this API in the runner.                                            |
| 4     | Operator                          | `createRound(expectedId, config, keyHandles, keyProof)` | Read next ID immediately before encryption. Exactly ten unique manifest leaves/common keys; proof for engine/operator. Config/commitments verified in receipt and state. |
| 5     | Player A                          | `joinRound(id, termsHash)`                              | Independently recompute manifest/key/config/domain commitment, Waiting and before join expiry.                                                                           |
| 6     | Player B                          | `joinRound(id, termsHash)`                              | Same verified commitment; receipt fixes Active/common deadline and both joined bits.                                                                                     |
| 7     | Player A                          | `submitAnswers(id, answerHandlesA, proofA)`             | Ten packed answers for A seat 0, engine/A proof binding, no prior submission, before deadline.                                                                           |
| 8     | Player B                          | `submitAnswers(id, answerHandlesB, proofB)`             | Same ten question order, B seat 1, engine/B proof binding and sufficient inclusion time.                                                                                 |
| 9     | Explicit approved closing actor   | `finalizeRound(id)`                                     | Both submissions confirmed; no cancellation, new round or resubmission. Check terminal state/reason, unchanged score handles and ACL.                                    |
| 10    | Explicit approved recording actor | Consumer's reviewed once-only record action             | Exact ABI/source/calldata reviewed at gate 2/3. Verify same terms/beneficiaries and derived-output ACL. Optional only if excluded from initial authorization explicitly. |

Until consumer source exists, orders 1, 3 and 10 are **defined blockers**, not executable speculative APIs. All other method names/signatures are the compiled current engine interface, checked by the client ABI regression. Do not create a second round to recover a failed step. Stop on any preflight/receipt failure and diagnose existing state read-only. Continuation, timeout close, cancellation or any retry needs a new explicit approval; local permissionless contract rights do not authorize this agent to act.

For the first measured live fixture use the engine's maximum answer duration **3600 seconds**, with a fresh public join expiry leaving adequate time for both joins. Verify the available duration against actual SDK proof-generation/transaction latency. The second join sets the common clock; publishing content beforehand may permit study and must be disclosed. Never extend a deadline or hide a missed inclusion.

## Permits and real remote evidence

Before any decrypt, independently verify deployed identity, canonical successful close receipt at the reviewed finality threshold, unchanged submission score handles and expected ACL. Player A must have only A score/A units and outcome; B only B score/B units and outcome. Publisher, stranger and public score access must be false. Consumer may compute using only transient source outcome/units; it must not persist source-score access.

Request separate explicit authorization for **at most one engine-scoped EIP-712 decryption permit per player**, shortest supported lifetime **at most 86400 seconds**. If a usable previously approved scoped permit exists, reuse it rather than signing another. Validate exact signer, chain, domain, verifying contracts, delegated authority and lifetime before signing. SDK convenience methods must not silently issue broader or longer permits. No publisher/stranger permit or consumer-scoped decrypt is included in the first plan; those need separate approval.

Using the real public SDK and relayer/KMS, decrypt A's own score/units/outcome and B's own score/units/outcome and require **7,0,2** and **9,2,2** respectively. Record sanitized stage names, typed error codes, latency, actual remote job acceptance/completion and verified SDK reconstruction evidence. Never log request payloads, answer words, keys, permit signatures, transport private keys, KMS shares or credentials. HTTP success alone or mock/local plaintext is not remote KMS evidence.

Negative evidence starts with read-only ACL and permitted SDK preflight checks. An SDK-side actor rejection is not an independent KMS rejection. No stranger signature or bypass of SDK safeguards is authorized implicitly. Report independent remote unauthorized KMS denial as **unverified** unless a separately reviewed and explicitly approved diagnostic genuinely reaches it. Permit expiry cannot revoke direct historical result ACL or erase disclosed plaintext.

## Spending envelope and stop rules

Retain the existing **0.02 ETH aggregate cap** and all historical reservations. Existing reports carried forward **0.0182746774 ETH** remaining, but the future runner must freshly reconcile the exact persistent journal; it cannot rely on this historical figure, confirmed balances alone or reset accounting. Use the canonical shared policy, not a parallel Arena ledger.

For an initial proposal of ten writes, **0.0015 ETH per transaction** gives an invocation allocation **at most 0.015 ETH**, only if every fresh gas estimate/fee ceiling fits. Against the historical remainder this would leave **0.0032746774 ETH** reserved capacity. This is a conservative proposed ceiling, **not a live estimate or permission to reserve/spend**. The engine deployment and future consumer deployment must each independently fit the per-transaction limit; stop if either cannot. No automatic retry budget, faucet spend or side transaction is included. If an optional write is excluded, authorization/allocation must list the resulting exact actions explicitly.

Before each broadcast verify signer, chain, contract/runtime/immutables, nonce (latest and pending), balance, current gas/fee data, current phase/deadline, call simulation and persistent worst-case reservation. Account for any protocol/relayer billing separately and stop on unsupported or unreviewed costs. Persist the authorized maximum before submission; retain uncertain/reverted-attempt reservations under existing policy. Do not change limits, approval flags or reservations during Phase B.

Each future report must include actual hashes, canonical receipts/status, gas used, effective gas price, independently calculated actual ETH fees, finality and journal remaining capacity. Decrypt stages incur no Ethereum transaction themselves but may use signed permits and remote services requiring explicit scope review. No merge, mainnet operation or staking test follows automatically from a successful fixture.

## Later scenario matrix

Ties, reverse winners, both forfeits, no submissions, join expiry and waiting withdrawal are locally covered. Running them remotely creates **additional rounds/writes**; each scenario needs a new bounded invocation approval. Complete production-funded validation additionally needs ERC-7984 actual-transfer, pair admission, reserve/refund/withdrawal conservation, overflow, source substitution and callback/reentrancy tests. Preserve single-player coverage and obtain independent security review before release. Stop after the current local milestone.
