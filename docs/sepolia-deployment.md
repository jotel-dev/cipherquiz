# Sepolia deployment execution record

## Successful separately authorized attempt (2026-11-13)

**Deployed successfully on Ethereum Sepolia, chain 11155111.** After the owner saved the key-format correction, the existing strict offline verifier reported `reviewed-signer-matched` for `0xbE4a3DAABCd4406e75314aC7324411249E0C36a2`. The owner then explicitly authorized one new deployment attempt, retaining the **0.0015 ETH transaction maximum** and **0.02 ETH aggregate cap**. Exactly one deployment transaction was submitted; there was no automatic retry, integration write, other deployment, funding, limit change or merge.

| Result                                                        | Verified value                                                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Contract                                                      | `CipherQuizScoring`                                                                  |
| Contract address                                              | **0x4b4c204d28D5ee37896278C5fc56d61086f92b53**                                       |
| Transaction hash                                              | **0x9993ceddc07934d098e3b7458b278e2bf90fc8de79f4e2ce4dfedce4cc2429d1**               |
| Deployer / immutable operator                                 | **0xbE4a3DAABCd4406e75314aC7324411249E0C36a2**                                       |
| Receipt status / block                                        | **1 (success) / 12126360**                                                           |
| Block hash                                                    | `0x4ffd78f676c9ec4ffbfeeb7823aaa0d6ad4b87cf0f05e2ab21dd760df2706ac6`                 |
| Confirmation evidence                                         | Two confirmations awaited by deployment; **7** at independent read-only verification |
| Transaction nonce / value                                     | **0 / 0 wei**                                                                        |
| Final deployment-path gas estimate / gas limit                | **10607170 / 12728604**, rounded-up 20% margin                                       |
| Maximum / priority fee                                        | **100000000 / 2 wei per gas**                                                        |
| Pre-send suggested maximum fee                                | **34 wei per gas**, below the ceiling                                                |
| Maximum reserved deployment liability                         | **1272860400000000 wei = 0.0012728604 ETH**, below 0.0015 ETH                        |
| Actual gas used                                               | **8768550**                                                                          |
| Effective gas price                                           | **18 wei per gas**                                                                   |
| Actual transaction cost                                       | **157833900 wei = 0.0000000001578339 Sepolia ETH**                                   |
| Remaining aggregate allowance, after conservative reservation | **18727139600000000 wei = 0.0187271396 ETH**                                         |
| Post-deployment operator balance                              | **49999999842166100 wei = 0.0499999998421661 ETH**                                   |
| Post-deployment confirmed / provider-pending nonce            | **1 / 1**                                                                            |
| Errors from this attempt                                      | **None**                                                                             |

All final checks passed before broadcast: signer/public pin, HTTPS RPC, chain 11155111, infrastructure code/configuration, reviewed creation-bytecode hash, latest and finalized balances of **0.05 ETH**, confirmed/provider-pending nonce **0/0**, current gas/fee ceilings and ledger headroom. The final deployment-path gas estimate supersedes the earlier read-only estimate for this transaction; it remained within every approved limit. The ledger was consistent with zero prior reservations, and deployment plus the three integration planning ceilings fit its remaining allowance. Integration headroom is a check, not integration authorization.

The canonical ledger now contains exactly one deployment reservation, ID `bbba8b28-7817-4902-bbff-0f62552552b7`, associated with chain 11155111 and the approved operator. The full **0.0012728604 ETH** remains charged even though the actual receipt fee is lower. No difference was refunded/released. The ledger lock is absent following successful reservation. Preserve this ignored ledger across future invocations; the available allowance is **0.0187271396 ETH**, not an allowance reset based on actual fees.

Independent post-deployment read-only checks verified receipt success, transaction sender/nonce/chain/zero value, exact creation calldata plus the sole approved operator constructor argument, and full runtime identity against the compiled artifact while masking only compiler-declared immutables. Onchain `OPERATOR` matches the approved address, `confidentialProtocolId` is **10001**, and `nextRoundId` remains **1**. This establishes deployment identity and untouched round state; real encrypted scoring, input acceptance and KMS security remain unverified.

Deployment approval was supplied only to the one child process. The populated env file remained byte-for-byte unchanged during execution and subsequent verification. Persistent/parent deployment and integration flags remain unset. No secret values were printed, no player was configured and no live integration command was invoked. Temporary launch/verification scripts were removed after use. Application source, dependencies and spending limits were unchanged for this attempt; the deployed guard source remains commit **03870d7**.

**Stop here.** The single-attempt authorization is consumed. Integration, retries, further deployments, funding and merges require separate owner approval. Earlier npm-advisory and live FHE/KMS limitations remain as documented in the [predeployment review](sepolia-final-review.md).

## Historical pre-broadcast stop and recheck

**Latest read-only follow-up (2026-11-13):** after the owner reported correcting the prefix, the existing strict offline verifier still failed. The on-disk env file remained identical to the stopped-attempt version and its key representation remained unprefixed, with no inherited key override. Separate offline public-address derivation matched the intended operator, but `reviewed-signer-matched` was not established by the strict verifier. The public preflight passed at mined/finalized blocks **12126229/12126164**: chain **11155111**, balance **0.05 ETH** at both, nonce **0/0**, no reservations, and **0.02 ETH** remaining. Fresh estimate **8839309 gas**, gas limit **10607171**, fee ceiling **0.1 gwei**, maximum liability **0.0010607171 ETH**, within the **0.0015 ETH** transaction cap. No secret/flag/limit was changed and no new deployment attempt was made. See [verification](verification.md) for details. Save the corrected local representation and successfully verify it before separately authorizing another attempt.

Date: **2026-11-13 (Africa/Lagos)**. **STOPPED before broadcast. No automatic retry.**

The owner explicitly approved one `CipherQuizScoring` deployment on Ethereum Sepolia, chain **11155111**, from operator `0xbE4a3DAABCd4406e75314aC7324411249E0C36a2`, at a maximum deployment transaction cost of **0.0015 Sepolia ETH** under the retained **0.02 ETH** project aggregate cap. Other deployments, integration writes, automatic retries, spending-limit changes and merges were excluded.

### Earlier execution and stop condition

The checked deployment guard update was committed as **03870d7** and pushed before the attempt. It pins the reviewed creation-bytecode hash, checks latest/finalized funding, requires confirmed/provider-pending nonce zero, passes that nonce explicitly, and reports public preflight/receipt/budget data. Existing spending limits and budget policy were unchanged. Contracts typechecking, targeted ESLint and all **25 relevant local tests** (11 blockchain policy/guards, 14 Hardhat) passed.

A temporary one-invocation launcher loaded the ignored local environment without printing values, checked the reviewed address/limits and absent ledger/lock, and independently matched the signer to the operator. It supplied deployment approval only in its child's process environment; the local env file and integration flag were untouched. It invoked the deployment script exactly once, with no compilation or retry loop.

The deployment script then failed at **configuration**, before any reservation or broadcast. Read-only diagnosis established that the local signer value is an unprefixed 64-character hexadecimal string. The deployment script requires `0x` followed by 64 hexadecimal characters. Ethers' wallet constructor, used by the earlier offline verifier, accepted the unprefixed representation and derived the correct operator, but that did not satisfy the deployment script's stricter format check.

No private value was printed, normalized, replaced or persisted. The offline verifier has now been aligned with the deployment script's existing prefix requirement so it cannot report a deployment-ready match for this rejected representation. This does not change the accepted deployment key format, operator, spending limits or contract bytecode.

The failure occurred before the deployment script reached chain/infrastructure checks, gas estimation, fees, reservations or signing. Accordingly there is **no fresh deployment gas/fee observation from this attempt**. The earlier [read-only estimate](sepolia-final-review.md) remains historical, not a new successful execution preflight. Following the stop, only read-only chain/balance/nonce confirmation was performed.

### Earlier result

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

### Earlier required next action (subsequently completed)

At that checkpoint, the owner needed to save the documented `0x`-prefixed representation privately, rerun strict offline verification and explicitly authorize another attempt. Those prerequisites were subsequently completed for the successful separately approved attempt above. No retry was inferred from unused budget or the earlier absence of a transaction.

The fresh npm advisory audit remains separately unapproved/unverified. Earlier live-FHE/KMS and integration limitations still apply. These are recorded in the [predeployment review](sepolia-final-review.md).
