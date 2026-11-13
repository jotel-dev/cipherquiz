# Authorized round 1 remote SDK/KMS decryption

Date: **2026-11-13**. **SUCCESS: the existing finalized encrypted score decrypted to exactly 2 out of 4 using the real Zama SDK and remote KMS response.** One player-only offchain verification was performed. No transaction, operator/stranger permit, automatic retry or spending/approval change occurred. The single authorization is consumed.

## Scope and finalized-state prechecks

- Ethereum Sepolia **11155111**, scoring contract **0x4b4c204d28D5ee37896278C5fc56d61086f92b53**, round **1**.
- Actual test-player signer matched **0xc0a50A4E032b19c905509E8f5EFD35fC7EA82D49** offline. No operator/stranger key was supplied to the child; no other signer was instantiated.
- Exact reviewed runtime hash **0x98e53c2f853afaedee48a173730a1730d0c71f2cbd9cf61aafd3c8cb980daccc**, immutable operator **0xbE4a3DAABCd4406e75314aC7324411249E0C36a2**, and `nextRoundId = 2` matched.
- The successful [finalization transaction](sepolia-round-1-finalization.md), **0x5ed8fc94f071c2d69479e400547dac139673e84e914e18092fe986063ae897dd**, remained in canonical block **12127968**. Before signing, the runner checked the receipt's block hash against the canonical block, correct caller/target and receipt success, then required inclusion in Sepolia's **finalized checkpoint**, beyond the earlier two-confirmation policy.
- Fresh execution precheck: **112 confirmations**, finalized block **12128004**, latest reported block **12128079**, timestamp **1794598500**. Receipt inclusion in the finalized checkpoint was verified. An earlier read-only preparation check had already observed 77 confirmations and finalized block 12127972.
- `getRound(1)` at the finalized block was **Finalized (3)** with four questions and the designated player. Its encrypted score handle, player, deadline, content commitment and question count matched the historical submission-block data (**12127163**), with only lifecycle state changing from Submitted to Finalized. No handle, answer key, proof or plaintext answer was printed.
- Score ACL: **player true**, **contract true**, **operator false**, **public decryption false**. Player confirmed/pending nonce **1/1**. No existing spending lock; all four exact journal reservation IDs/amounts matched, remaining **0.0182746774 ETH**. Both approval flags remained unset.

## Single execution and remote evidence

Installed dependencies remained **@zama-fhe/sdk 3.7.2**, **@fhevm/sdk 0.13.2**, with the real **Node FhevmRelayer** and Sepolia chain preset. No cleartext backend, Hardhat simulation, stubbed response, falsified ACL result or local cached score was used. The new SDK instance used fresh isolated `MemoryStorage` for credentials and permits.

The previous permit and transport private key existed only in an exited process's memory. They could not be reused. `sdk.permits.hasPermit([contract])` returned **false**, then one `grantPermit` completed using the authorized player signer. It requested **one exact contract** with **one-day / 86400-second** validity, the minimum positive whole-day setting supported by this installed high-level SDK workflow. The transport-key lifetime was also explicitly 86400 seconds. The signing policy checked the complete recognized direct-decryption schema, Decryption domain/verifier, chain, contract, actor where present, start time and exact duration. No payload or signature was emitted or persisted.

| Observation                             | Result                                                          |
| --------------------------------------- | --------------------------------------------------------------- |
| Player permit signatures                | **1**                                                           |
| Permit flow time                        | **1294 ms**                                                     |
| SDK/backend decrypt attempts            | **1**                                                           |
| Remote user-decrypt POST                | **1**, HTTP **202**, **5055 ms**                                |
| Accepted-job result retrieval           | **1 GET**, HTTP **200**, **268 ms**                             |
| Successful remote result envelopes      | **1**                                                           |
| Returned KMS signcrypted shares         | **12**; payloads and response signatures suppressed             |
| SDK result                              | **2**, matched expected score **2/4**                           |
| SDK decrypt/reconstruction time         | **8599 ms**                                                     |
| Total verification time                 | **19438 ms**, including public prechecks, permit and postchecks |
| Failed HTTP responses / blocked retries | **0 / 0**                                                       |
| Process result                          | **Exit 0**, no timeout or stderr output                         |

Retrieving the result of the accepted HTTP 202 job was normal asynchronous completion, **not a retry of a failed request**. Exactly one backend entry and one remote user-decrypt POST were allowed. Low-level decryption HTTP retries were disabled, repeated failed network requests were blocked, SDK credential-recovery signatures could not exceed the single allowed signing attempt, and a second backend decryption entry was prohibited.

The remote-success assertion required **all** of: SDK score exactly 2, one backend entry, one remote POST, one successful user-decrypt result envelope and nonempty signed-share data. A plaintext result of 2, a successful metadata/key fetch, a queued response or an empty/malformed result alone cannot establish remote KMS success. The real SDK's installed reconstruction path (`core/modules/decrypt/module/api-p.ts`) calls TKMS `process_user_decryption_resp_from_js` with **verification enabled**, using the onchain signer context. The application did not bypass that path or independently implement reconstruction. This is evidence of successful authorized remote decryption through the installed client stack, not merely successful SDK ACL preflight.

Sanitized checkpoints retained from the actual run:

```json
{"status":"permit-flow-completed","permitReused":false,"signatures":1,"elapsedMs":1294}
{"status":"remote-user-decrypt-http","method":"POST","httpStatus":202,"successfulKmsResults":0,"kmsShareCount":0,"elapsedMs":5055}
{"status":"remote-user-decrypt-http","method":"GET","httpStatus":200,"successfulKmsResults":1,"kmsShareCount":12,"elapsedMs":268}
{"status":"sdk-score-returned","score":"2","questionCount":4,"elapsedMs":8599,"backendAttempts":1,"remotePosts":1,"successfulResults":1,"kmsShareCount":12}
{"status":"authorized-decryption-verified","roundUnchanged":true,"authorizedDecryptionVerified":true,"score":2,"questionCount":4,"remoteKmsEvidenceVerified":true}
```

No execution error occurred. This one authorized verification was not repeated after completion.

## Postconditions, budget and local validation

Read-only postchecks confirmed unchanged round data and score, player/contract ACL true, operator/public denial and player nonce still **1/1**. Both the child and launcher independently verified the populated env file and canonical spending journal **byte-for-byte unchanged**. No spending reservation was added, removed, relabelled or refunded. Four retained reservations total **0.0017253226 ETH**, leaving **0.0182746774 ETH** under the unchanged **0.02 ETH** cap. This offchain verification spent **zero Sepolia ETH** and performed **zero onchain writes**.

Relevant local validation passed **22 blockchain tests**, integration/package typecheck, targeted ESLint and formatting. New regressions enforce successful canonical/finalized receipt inclusion and reject assertions of remote success based only on a score, HTTP success, missing shares, failed/missing request or multiple attempts. Existing permit/write/attempt/security-budget regressions also passed. No contract, deployed bytecode, dependency, fee/spending policy, existing reservation or approval flag changed. The prior full repository check remains the separately recorded 41-test baseline; it was not rerun for these isolated integration-tool additions. The temporary finality checker and live launcher were removed. Final secret/output, formatting/diff and Git checks are recorded in [verification](verification.md).

## Remaining limitations and stop

- The new one-day permit and transport private key were kept only in memory and not exported; process exit discards that local session. It is **not remote cryptographic revocation**. A copied valid permit plus its transport private key may remain usable until expiry, subject to ACL. New permits do not invalidate any prior permits. The contract-scoped permit is not restricted to this one score handle; it can cover other ACL-authorized ciphertexts for the same identity/contract while valid.
- The result relies on the configured RPC provider's chain/finality evidence, TLS endpoints, installed SDK/TKMS implementation and network KMS cryptographic assumptions. It is not an independent implementation audit or a production-security certification. The attempt cap wraps the pinned SDK's internal resolved-router shape; a future SDK change requires review and should fail closed before signing.
- **Independent unauthorized remote KMS denial remains unverified.** The earlier negative test established SDK preflight rejection, not a remote unauthorized challenge. No operator/stranger permit or unauthorized remote request was included here.
- This establishes the four-question fixture's existing score as **2/4**. It does not add staking, payouts, another round, deployment or authorization for another verification.

**Stop. No further signature, decryption request or transaction is authorized by this completed one-shot approval.**
