# One authorized player-only offchain diagnostic

Date: **2026-11-13**. Contract **0x4b4c204d28D5ee37896278C5fc56d61086f92b53**, Ethereum Sepolia **11155111**, round **1**, player **0xc0a50A4E032b19c905509E8f5EFD35fC7EA82D49**. **Exactly one player permit was signed and one SDK decryption was attempted. Zero onchain writes, zero retries and no operator/stranger permits. The diagnostic is stopped.**

## Precise observed result

The new, separately approved diagnostic reproduced a **denial-classification defect in the test harness**, while confirming that player decryption is intentionally prohibited before finalization:

1. Offline player identity matched the approved public address. Neither operator nor stranger signing keys were supplied to the diagnostic child.
2. Chain, deployed runtime hash, round/player identity, nonzero score, score ACL and persistent budget checks passed.
3. `sdk.permits.grantPermit([scoringContract])` completed. The restricted signing interface signed **one** direct, contract-scoped EIP-712 decryption permit, with **86400 seconds / one day** validity. No signature or transport key was printed or persisted.
4. One `sdk.decryption.decryptValues` call rejected with **`NotEntitledError` / `NOT_ENTITLED`**. The guarded backend recorded **one** decryption entry, and the network monitor recorded **zero remote user-decryption/KMS requests** and no failed HTTP responses. This is an **SDK ACL preflight rejection**, not an observed remote KMS denial.
5. The unchanged strict test predicate, `isAclDenial(error)`, returned **false**. Its enclosing assertion failed with **`AssertionError` / `ERR_ASSERTION`**. The process exited **1** and was not retried. This assertion failure must not be relabelled as a passing strict ACL test.

The failure was therefore at **`player pre-finalization SDK decryption`**, specifically the assertion requiring an error-chain member with `.name === 'AclUserDecryptionError'`. Permit setup and signing had already succeeded. No permit/signature rejection or relayer transport failure was observed. Successful authorized score decryption and the expected plaintext **2/4** remain unverified.

Retained sanitized failure checkpoints (no payloads or signatures):

```json
{"status":"player-permit-signed","signatures":1,"lifetimeSeconds":86400,"scope":"reviewed-contract-only"}
{"status":"scoped-permit-ready","lifetimeSeconds":86400}
{"status":"checkpoint","stage":"player pre-finalization SDK decryption"}
{"status":"player-decryption-rejected","errorTypes":["NotEntitledError","NOT_ENTITLED"],"strictAclEvidence":false,"remoteKmsRequests":0,"remoteKmsDenialVerified":false}
{"status":"diagnostic-stopped","stage":"player pre-finalization SDK decryption","errorTypes":["AssertionError","ERR_ASSERTION"],"sensitiveDetailsSuppressed":true}
```

This observed result provides a concrete reproducer consistent with the [earlier incomplete invocation](sepolia-integration-execution.md). That invocation's original exception was not retained, so this result does not retroactively prove which individual substep failed then.

## Installed SDK cause of the mismatch

Installed versions remain **@zama-fhe/sdk 3.7.2** and **@fhevm/sdk 0.13.2**, with no dependency changes. The higher-level SDK maps the requesting actor's local ACL-denial message to `NotEntitledError`, preserving the underlying error as its cause. Its [official error reference](https://docs.zama.org/protocol/sdk/api-references/sdk/errors) documents that typed error separately from signing, relayer and generic decryption failures.

The installed lower SDK's `core/errors/FhevmErrorBase.ts` constructor overwrites the supplied subclass name with **`FhevmErrorBase`**. An offline construction of the real `AclUserDecryptionError` therefore produces:

```text
constructor: AclUserDecryptionError
runtime .name: FhevmErrorBase
instanceof AclUserDecryptionError: true
```

A local regression constructs that installed error, wraps it in the public `NotEntitledError` class and verifies that the existing name-based predicate rejects it. The earlier synthetic test fixture carrying `.name = 'AclUserDecryptionError'` did not cover this actual installed behavior. This diagnosis does not require another signature, decryption attempt or write.

**No ACL or security assertion was weakened or broadened.** The next reviewed correction should replace reliance on that unstable name with precise typed SDK evidence bound to the expected player, contract and score plus independent ACL checks. Generic `FhevmErrorBase`, a bare status 403, timeout or `DECRYPTION_FAILED` must never be accepted as proof of ACL denial. Even a correctly recognized local denial would not prove remote KMS enforcement. That correction and any further live verification are outside this consumed diagnostic invocation.

## Public state and recovery

Initial public checks at block **12127426**, timestamp **1794590580 = 17:23:00 UTC**:

- Round **1**, **Submitted**, approved player, nonzero encrypted score.
- Score ACL: contract **true**, player **false**, public decryption **false**.
- Player confirmed/pending nonce **1/1**.
- Deadline **1794590952 = 17:29:12 UTC / 18:29:12 Africa/Lagos**, not yet expired at that snapshot.
- Remaining aggregate allowance **18295003600000000 wei = 0.0182950036 ETH**.

The strict assertion stopped the main probe before its inline readback step. A separate **read-only public postcondition check**, containing no SDK, signing or decryption functionality, confirmed at block **12127437**, timestamp **1794590724 = 17:25:24 UTC**:

- Round data exactly equals `getRound(1)` at submission block **12127163**: still Submitted, same encrypted score and player.
- Contract score access **true**, player access **false**, public decryption **false**.
- Player confirmed/pending nonce still **1/1**; approval flags unset.
- The deadline was still 228 seconds in the future at this second snapshot. This does not imply it remains unexpired when the report is read.

Only the contract's `finalizeRound(1)` path grants the designated player access to the existing score. **Finalization is necessary before authorized player score decryption can be tested.** For an already Submitted round, expiry does not replace or discard its score; either the immutable operator or designated player may finalize later. No new round or answer submission is necessary. Remote ciphertext/KMS availability and the plaintext result are still unverified, so finalization alone does not establish successful decryption.

No finalization was performed or simulated, and this authorization does not cover it. A future recovery needs separate approval for one `finalizeRound(1)` write under the unchanged **0.0015 ETH** transaction ceiling and any newly needed permit/decryption operations. Never restart the three-write integration harness.

## Permit scope, lifetime and safeguards

The public `grantPermit` workflow in this installed SDK validates `permitTTL` as a positive integer number of **days**. **One day** is its shortest supported setting; both `permitTTL = 1` and transport-key TTL **86400 seconds** were explicitly configured. This is a statement about the installed high-level SDK workflow, not a claim that every underlying protocol API uses day granularity. The signature policy validated the complete recognized V1/V2 direct-decryption schema, host chain ID, Decryption domain/verifier, one exact contract, current start timestamp and one-day duration. V2, if requested, must also carry the approved player identity. Delegated/operator/stranger permits were prohibited.

The permit was needed because prior actor-isolated in-memory credentials were not retained after the earlier stopped process. This diagnostic also used isolated `MemoryStorage` and exited; its permit and transport private key were not exported. A copied permit together with its corresponding transport private key could still be usable until its signed expiry, subject to ACL. Process exit is not remote revocation, and this new one-day permit does not invalidate any earlier permit that may have existed. See the [permit model](https://docs.zama.org/protocol/sdk/concepts/permit-model).

The dedicated runner has an explicit one-shot command argument and never activates either existing approval flag. It passes no operator key to the child, exposes only a guarded player EIP-712 signing interface, blocks transaction and other signing RPC methods, consumes signature attempts even when they fail, caps backend decryption entries at one, disables decryption HTTP retries and blocks repeats of failed network requests. A version-checked wrapper uses the installed SDK's internal resolved-router shape solely to enforce that backend attempt/retry cap; it preserves the underlying ACL code. If that pinned shape changes, execution stops before signing. This internal-shape dependency is a maintenance limitation, not a claim of a stable public SDK API.

The final safety summary recorded **signatures 1**, **backend decrypt attempts 1**, **remote KMS requests 0**, **blocked retry attempts 0**, **blocked write/signing RPC attempts 0**, **HTTP error statuses []**, **onchain writes 0**, env/journal byte-for-byte unchanged and **0.0182950036 ETH** remaining. No watchdog timeout or stderr output occurred. These counters do not prove remote KMS access control; no remote decryption request reached that path.

## Accounting, verification and stop

The diagnostic consumed **zero Sepolia ETH**, made no reservation and left all three existing reservations intact: total reserved liability **0.0017049964 ETH**, remaining **0.0182950036 ETH**, aggregate cap **0.02 ETH**. Limits, deployed contract, approval flags and persistent accounting were not modified.

Local guard tests cover exact permit scope/schema/lifetime, write-RPC rejection, attempt consumption and the real installed SDK name mismatch. Validation is recorded in [verification](verification.md). The temporary execution launcher and public readback tool were removed. Sanitized runner/test sources are retained for review; retaining them grants no permission to rerun them.

**The single authorization is consumed. Stop pending separate authorization for further signatures, decryption attempts or transactions.**
