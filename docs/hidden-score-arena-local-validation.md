# Hidden Score Arena local validation

Phase A, **2026-11-14 (Africa/Lagos)**, branch **`feat/hidden-score-arena`**, base **`5fe1c5c`**. See the [complete architecture and staged plan](hidden-score-arena-architecture.md). Prototype checkpoint **`fc94bb44c2c2c50b763bf67449809cbb34e8a179`** was pushed and its remote hash verified immediately after the targeted checks.

## Implemented boundary

- [HiddenScoreArenaLab](../contracts/src/lab/HiddenScoreArenaLab.sol): exactly ten immutable encrypted keys/common content hash, two distinct player seats, both joins before a common deadline starts, context-bound encrypted answers, two computed scores, FHE comparison, timeout policy and restricted result ACL.
- [ArenaEntitlementLab](../contracts/src/lab/ArenaEntitlementLab.sol): once-only local source binding, transient original-outcome handoff, FHE-derived symbolic two-unit entitlements, per-owner ACL and duplicate-record rejection. No caller supplies a winner.
- [arena-lab.test.ts](../contracts/test/arena-lab.test.ts): official isolated FHEVM Hardhat mock. Both constructors reject chains other than **31337**; each test requires network **hardhat**, chain 31337 and `fhevm.isMock === true` before deployment.

These fixtures hold no tokens. There is no actual deposit, lock, payout, withdrawal, production factory, funding-masked activation, canonical bank proof, randomness selection, live SDK/KMS session or new frontend mode. Symbolic units are **not money or evidence of deposits**; cancellation assigns two refund units even if nobody joined. A production vault must refund only actual locks.

V1 scoring, prior staking source, frontend, dependencies/lockfile and gated live runners are preserved. No live wallet is loaded and no env/approval file is changed. Normal checks do not invoke the separately gated Sepolia runner.

## Executed security assertions

The **18-case** Arena suite verifies:

1. **10/0, 0/10, 2/4, 0/0 and 10/10** comparisons out of ten questions: both winner directions, low/high ties, exact own scores/shared outcome and conserved symbolic **[2,0], [0,2] or [1,1]** entitlements.
2. Score denial before finalization including the submitting player; key denial for players/operator/stranger; opponent-score, operator/stranger result and public score/outcome denial afterward. Participants decrypt their own terminal score and shared outcome only.
3. Cross-contract FHE computation with transient outcome ACL, no permanent consumer outcome/raw-score grant, owner-only entitlement views and duplicate-record rejection.
4. Ten immutable keys/content, no early submission, distinct reserved seats, duplicate/unauthorized joins, common clock starting on second join, one-time binding and nonexistent-round rejection.
5. Unauthorized publishing, invalid players, expired join setup, invalid durations/content and four-question challenges rejected.
6. Partial/unauthorized/duplicate submissions, premature/repeated finalization and terminal joins/submissions rejected.
7. Both sole-submitter forfeits at expiry, including a zero score, with no early forfeit award.
8. Exact-deadline static-call submission rejection and no-submission refund; join expiry cancellation with zero/one join and no duplicate finalization.
9. Empty/mismatched proofs, wrong sender/contract and duplicate handles revert atomically without consuming valid handles or setting submitted.
10. Cross-round consumed-handle replay rejected; freshly encrypted wrong round/seat/reversed question contexts score zero. Invalid keys/choices contribute zero; late finalization preserves timely scores.
11. Shared heterogeneous keys **0,1,2,3,0,1,2,3,0,1** yield exact **10 vs 9**, proving ordered nonconstant key use for both seats.

Local ACL negatives are mock SDK/preflight evidence, **not independently reached remote KMS denial**. Local authorized user-decryption helpers are not real threshold-KMS evidence. The Arena tests use no debugger bypass.

## Reproduce locally

From the repository root:

```sh
npm run test -w @cipherquiz/contracts -- --network hardhat test/arena-lab.test.ts
npm run check
```

No private key, RPC credential, faucet, token approval, spending reservation or live approval flag is needed. Do not pass `--network sepolia` or add these fixtures to a live runner.

Initial harness issues were fixed without weakening security assertions: ethers tuple field `keys` collided with `Array.keys`, so the lab ABI uses `answerKeys`; ethers `Result` arrays are spread for immutable-vector equality. Solhint requested an indexed public seat event and prefix increment. Final targeted checks passed **18/18**, zero-warning Solidity lint, contracts typecheck and targeted ESLint. Full repository results are recorded after execution below.

**`npm run check` passed** all workspace builds/typechecks, ESLint, zero-warning Solhint, formatting and **74 tests**: 3 API, 4 frontend, 22 blockchain and 45 Hardhat (the prior 27 plus 18 Arena cases), with zero failures or skips. This preserves single-player tier, scoring/ACL, spending-cap, SDK-denial and staking conservation regressions. Later changes are documentation-only and receive formatting/diff/link checks rather than another unchanged full test run.

Protected tracked source diffs against `5fe1c5c` are empty for V1 scoring/foundation, all prior staking fixtures, frontend, blockchain/live runners, deployment policy, manifests and lockfile. Recompiled V1 creation hash remains **0x4b033120899ac98fde5d0e1f8eded615afd01a48d825fdcc06766f3bd877cbcf** and ABI hash **0x5d23326a0b9c4968960381e6694d1662e19320c83f1bcdb946e478d789f23a18**, matching the prior reviewed evidence. Environment/journal snapshots taken during the full check match afterward; neither is tracked. No spending limit, reservation or approval setting was edited. The phase invoked no external Ethereum RPC, live signer, permit, deployment or live runner; only disposable Hardhat mock transactions ran.

A bounded exact configured-secret scan of **74 changed/generated files** found zero matches, including configured private keys without their prefix. This is not a scan of every possible secret format or all Git history. Final documentation/secret and remote synchronization checks are performed before stopping. No environment contents, signatures or RPC credentials are included in the report.

## Local planning metrics

One isolated 10/0 case measured:

| Operation                  | Mock EVM gas | Global HCU | Maximum HCU depth |
| -------------------------- | -----------: | ---------: | ----------------: |
| One ten-answer submission  |    1,446,152 |  4,840,352 |         1,158,032 |
| Final comparison/score ACL |      284,148 |    224,096 |           165,000 |

These are compiler/mock observations, not maxima, live fee estimates or cryptographic benchmarks; calldata/mock gas can vary. Creation, joins, second submission, symbolic consumer and future token operations are excluded from this table. The second submission has its own circuit. HCU/depth limits apply per target-network transaction, not to a round-total sum. Published example devnet limits are not assumed to apply to Sepolia/mainnet. No remote proof-generation, coprocessor queue or KMS latency was measured.

## Stop

Phase A ends after architecture/local validation and synchronized commits. Funding, conservation/refunds, token administration, content trust/reuse, selection randomness, timing fairness, permit limitations and release gates are specified in the architecture. Neither these fixtures nor dependencies are claimed audited or production-ready. No live operation or extra spend is authorized.
