# SDK denial assertion correction and approved round 1 finalization

Date: **2026-11-13**. Target: **0x4b4c204d28D5ee37896278C5fc56d61086f92b53**, Ethereum Sepolia **11155111**, existing round **1**. Immutable operator **0xbE4a3DAABCd4406e75314aC7324411249E0C36a2**; player **0xc0a50A4E032b19c905509E8f5EFD35fC7EA82D49**.

## Local assertion correction

The [single offchain diagnostic](sepolia-player-offchain-diagnostic.md) established that the installed lower SDK's ACL subclass exposes `.name = FhevmErrorBase`, while the public high-level SDK returns `NotEntitledError` with code `NOT_ENTITLED`. The denial assertion now requires that public SDK class **and** its stable code, following cycle-safe cause chains. Production callers additionally compare the error's account, contract and ciphertext to the exact denied request. Changing `.name` no longer changes the result.

The assertion still requires decryption to reject. Unexpected success, a timeout, HTTP 403, generic decryption/signing/relayer failure, an unrelated requesting actor/ciphertext or a plain object carrying a copied name/code cannot pass. Existing ACL reads/assertions remain in place. No Solidity, deployed bytecode, dependency or cap was changed. Recognizing the SDK preflight error continues to provide **no independent evidence of remote KMS denial**.

The installed-error regression constructs the actual lower SDK error and public typed wrapper, now verifies recognition despite its misleading name, and checks wrapped causes and mismatched account/contract/ciphertext rejection. An additional finalization guard regression rejects changes to calldata (including round ID), chain, contract, nonce, ETH value and gas/fee ceilings. No live permit or decryption path is run to test this correction.

**`npm run check` passed** all builds/typechecks/lint/format checks and **41 local tests**. The bounded configured-secret scan of all **11 changed files and 42 generated files** found zero matches; it is not a guarantee covering every secret format or all Git history. Source spending policy, existing reservations, populated env and approval flags remain unchanged before the approved transaction.

## Approved transaction and safeguards

The owner separately approved **one** operator `finalizeRound(1)` transaction, zero ETH value, maximum gas fee **0.0015 Sepolia ETH**, strict aggregate cap **0.02 ETH**, no retry, new round, resubmission, deployment, other transaction, permit or decryption request. Both existing approval flags remain unset; the dedicated runner requires an explicit approval argument and contains no Zama SDK or permit/decryption imports.

Before signing/broadcast, it verifies the actual operator signer, configured public operator/target, chain ID, exact deployed runtime hash and immutable operator, `nextRoundId = 2`, round 1 **Submitted** with the approved player/four questions/nonzero score and exact historical submission-block data. It checks contract score access, player/operator denial and no public decryption, then simulates only `finalizeRound(1)`, estimates gas with a **20% rounded-up margin**, checks current fees, latest/finalized funding, confirmed/pending nonce **2/2** and retained journal entries/headroom.

Maximum fee per gas remains **100000000 wei (0.1 gwei)** or lower if configured lower; gas must remain at most **15000000**, and their product must not exceed **1500000000000000 wei (0.0015 ETH)**. Signing scope checks fix chain, address, calldata, zero value and nonce 2. The transport accepts only necessary public RPC reads plus **one** exact signed-transaction hash for `eth_sendRawTransaction`, with transport retries disabled. It reports the public hash before submission so an ambiguous send cannot conceal the transaction identity. Receipt monitoring does not resubmit or replace transactions.

All three previous chain/operator-bound reservations must match their original IDs, operations and amounts. A new durable `finalizeRound(1)` reservation is appended before signing, and all previous reservations remain permanently retained, including cheaper receipt savings. No fee cap, aggregate cap, existing flag or populated env file is edited. Any guard failure stops the attempt; a reservation already made is not released. A successful receipt is checked after two confirmations, including target/caller/hash and `RoundFinalized(1)`, followed by preserved score/round data, Finalized state, enabled player score ACL and continued operator/public denial.

An already Submitted round remains eligible after its original deadline: finalization preserves the encrypted score. Finalizing grants player access but does not verify remote decryption or plaintext **2/4**. Those require separately authorized permit/decryption operations.

## Execution record

**Success: exactly one operator transaction was broadcast and mined. No retry, other transaction, permit or decryption request occurred.** The verified local fix and guarded source were committed and pushed as **`26c14de`** before execution; remote identity and a clean worktree were verified before creating the temporary launcher.

Fresh preflight at block **12127967**, timestamp **1794597144**, passed all guards: chain **11155111**, actual approved operator signer, exact contract/runtime/immutable operator, round 1 Submitted with the unchanged submission-block score, player/operator/public denial, contract score access, `nextRoundId = 2`, no ledger lock, three exact original reservations and **0.0182950036 ETH** available. The original deadline **1794590952** had expired; simulation succeeded because the round was Submitted. Operator confirmed/pending nonce **2/2**, latest/finalized balance **49999999801547805 wei = 0.049999999801547805 ETH**. Both existing approval flags remained unset.

| Field                                         | Verified value                                                               |
| --------------------------------------------- | ---------------------------------------------------------------------------- |
| Transaction                                   | `0x5ed8fc94f071c2d69479e400547dac139673e84e914e18092fe986063ae897dd`         |
| Call                                          | Operator `finalizeRound(1)` to the reviewed contract                         |
| Chain / nonce / ETH value                     | **11155111 / 2 / 0**                                                         |
| Gas estimate / limit                          | **169385 / 203262**                                                          |
| Suggested maximum / actual configured ceiling | **22 / 100000000 wei per gas**                                               |
| Priority fee ceiling                          | **2 wei per gas**                                                            |
| Maximum transaction liability                 | **20326200000000 wei = 0.0000203262 ETH**, below the approved **0.0015 ETH** |
| Reservation ID                                | `90083e9f-0bf6-41f8-8eae-65564794ecaa`                                       |
| Receipt status / block                        | **1 (success) / 12127968**                                                   |
| Gas used                                      | **164439**                                                                   |
| Effective gas price                           | **19 wei per gas**                                                           |
| Actual fee                                    | **3124341 wei = 0.000000000003124341 ETH**                                   |
| Event                                         | **`RoundFinalized(1)`**                                                      |
| Remaining aggregate allowance                 | **18274677400000000 wei = 0.0182746774 ETH**                                 |

The runner waited for two confirmations. A separate read-only reconciliation at block **12127976** observed **nine confirmations**, receipt status 1, correct target/caller/function/round/nonce/zero value and independently recomputed **164439 × 19 = 3124341 wei**. The receipt had **not yet reached Ethereum's finalized checkpoint** at that snapshot. This distinction is separate from the contract's `Finalized` lifecycle state; no claim of Ethereum checkpoint finality is made.

Both the transaction runner and independent readback verified round **1 Finalized (3)** with the exact original encrypted score, unchanged player/deadline/content commitment/question count and no new round. Score ACL: **player true**, **contract true**, **operator false**, **public decryption false**. Operator confirmed/pending nonce is now **3/3**. No plaintext score was requested or observed; **2/4** and remote KMS decryption/denial remain unverified.

The canonical ledger now contains exactly **four** chain/operator-bound reservations. The original deployment/create/submit entries are byte-for-byte retained as the journal prefix; the only appended operation is **`finalizeRound(1)`**, reserved at **0.0000203262 ETH**. Total permanently reserved liability is **0.0017253226 ETH**, leaving **0.0182746774 ETH** under the unchanged **0.02 ETH** cap. No savings were released. The populated env file was verified byte-for-byte unchanged. No stderr output, watchdog timeout or attempt error occurred. Temporary launch/readback tools were removed.

**The one-transaction authorization is consumed. Stop: no further transaction, permit or decryption request is authorized.** Retaining the guarded script does not authorize another invocation; its original Submitted-state/nonce/ledger guards now reject this completed state.
