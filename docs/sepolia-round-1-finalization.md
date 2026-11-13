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

**Pending the fresh preflight and one approved transaction.** The local fix and guarded recovery source are validated and pushed before execution. The result and new retained reservation will be appended after the attempt. Retaining this script does not authorize another invocation.
