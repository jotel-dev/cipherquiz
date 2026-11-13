# Sepolia deployment execution record

**Latest read-only follow-up (2026-11-13):** after the owner reported correcting the prefix, the existing strict offline verifier still failed. The on-disk env file remained identical to the stopped-attempt version and its key representation remained unprefixed, with no inherited key override. Separate offline public-address derivation matched the intended operator, but `reviewed-signer-matched` was not established by the strict verifier. The public preflight passed at mined/finalized blocks **12126229/12126164**: chain **11155111**, balance **0.05 ETH** at both, nonce **0/0**, no reservations, and **0.02 ETH** remaining. Fresh estimate **8839309 gas**, gas limit **10607171**, fee ceiling **0.1 gwei**, maximum liability **0.0010607171 ETH**, within the **0.0015 ETH** transaction cap. No secret/flag/limit was changed and no new deployment attempt was made. See [verification](verification.md) for details. Save the corrected local representation and successfully verify it before separately authorizing another attempt.

Date: **2026-11-13 (Africa/Lagos)**. **STOPPED before broadcast. No automatic retry.**

The owner explicitly approved one `CipherQuizScoring` deployment on Ethereum Sepolia, chain **11155111**, from operator `0xbE4a3DAABCd4406e75314aC7324411249E0C36a2`, at a maximum deployment transaction cost of **0.0015 Sepolia ETH** under the retained **0.02 ETH** project aggregate cap. Other deployments, integration writes, automatic retries, spending-limit changes and merges were excluded.

## Execution and stop condition

The checked deployment guard update was committed as **03870d7** and pushed before the attempt. It pins the reviewed creation-bytecode hash, checks latest/finalized funding, requires confirmed/provider-pending nonce zero, passes that nonce explicitly, and reports public preflight/receipt/budget data. Existing spending limits and budget policy were unchanged. Contracts typechecking, targeted ESLint and all **25 relevant local tests** (11 blockchain policy/guards, 14 Hardhat) passed.

A temporary one-invocation launcher loaded the ignored local environment without printing values, checked the reviewed address/limits and absent ledger/lock, and independently matched the signer to the operator. It supplied deployment approval only in its child's process environment; the local env file and integration flag were untouched. It invoked the deployment script exactly once, with no compilation or retry loop.

The deployment script then failed at **configuration**, before any reservation or broadcast. Read-only diagnosis established that the local signer value is an unprefixed 64-character hexadecimal string. The deployment script requires `0x` followed by 64 hexadecimal characters. Ethers' wallet constructor, used by the earlier offline verifier, accepted the unprefixed representation and derived the correct operator, but that did not satisfy the deployment script's stricter format check.

No private value was printed, normalized, replaced or persisted. The offline verifier has now been aligned with the deployment script's existing prefix requirement so it cannot report a deployment-ready match for this rejected representation. This does not change the accepted deployment key format, operator, spending limits or contract bytecode.

The failure occurred before the deployment script reached chain/infrastructure checks, gas estimation, fees, reservations or signing. Accordingly there is **no fresh deployment gas/fee observation from this attempt**. The earlier [read-only estimate](sepolia-final-review.md) remains historical, not a new successful execution preflight. Following the stop, only read-only chain/balance/nonce confirmation was performed.

## Result

| Requested field                                    | Result                                       |
| -------------------------------------------------- | -------------------------------------------- |
| Deployment status                                  | **Not deployed; stopped at configuration**   |
| Contract address                                   | None created                                 |
| Transaction hash                                   | None; no transaction signed/broadcast        |
| Gas used                                           | **0**, no transaction submitted              |
| Actual transaction cost                            | **0 Sepolia ETH**                            |
| Receipt status                                     | Not applicable; no receipt exists            |
| New reserved liability                             | **0 wei**; ledger and lock remain absent     |
| Remaining aggregate budget                         | **20000000000000000 wei = 0.02 ETH**         |
| Latest confirmed/pending operator nonce after stop | **0 / 0**                                    |
| Balance after stop                                 | **50000000000000000 wei = 0.05 Sepolia ETH** |
| Read-only confirmation block / chain               | **12126167 / 11155111**                      |

The env file remained byte-for-byte unchanged and both persistent/process-parent execution flags remained unset. The authorized approval existed only in the terminated deployment child. No integration command, second deployment attempt, funding, token transfer or merge was performed. The temporary launcher and diagnostic scripts were removed after use.

## Required next action

The owner must correct the existing local key representation privately to the documented `0x`-prefixed format, without changing the underlying wallet or sharing its value, then rerun offline verification. A further deployment attempt requires explicit owner authorization to proceed after this stop. It must repeat all signer/chain/balance/nonce/artifact/gas/fee/ledger checks, retain the same spending caps and execute no other onchain operation. No retry is inferred from unused budget or the absence of a transaction.

The fresh npm advisory audit remains separately unapproved/unverified. Earlier live-FHE/KMS and integration limitations still apply. These are recorded in the [predeployment review](sepolia-final-review.md).
