# Sepolia integration readiness and approval scope

**Subsequent authorized execution:** the initial invocation submitted `createRound` and `submitAnswers`, then stopped at a post-submission assertion. Later, a separately approved offchain diagnostic identified the SDK error representation, the typed assertion was corrected locally, and **one separately approved `finalizeRound(1)` succeeded**. Round **1 is Finalized**, with unchanged encrypted score and player score ACL enabled. Score decryption and remote KMS outcomes remain unverified. No retry occurred. The ledger now retains **0.0182746774 ETH**. See the [finalization and reconciliation report](sepolia-round-1-finalization.md). The readiness/approval figures below are the historical pre-invocation snapshot; all prior authorizations are consumed.

**Later player-only verification succeeded:** after canonical receipt finality was verified, the real SDK/KMS decrypted round 1's unchanged score to **2/4**, with one scoped one-day player permit, one remote request, no retries/writes and no budget change. See the [remote decryption report](sepolia-round-1-decryption.md). This supersedes the earlier decryption-unverified observation above; independent unauthorized remote KMS denial remains unverified. No further operation is authorized.

Reviewed **2026-11-13 (Africa/Lagos)**. **STOP: no integration execution or signature is authorized yet.** Player funding is now finalized, both identities/configuration and the deployment have passed their checks, and the exact **0.0045 ETH** invocation allocation is prepared. No active reservation, live-wallet/SDK signature, scoring round or Sepolia transaction was created. Local tests use isolated disposable mock signers. Owner approval of the three writes and offchain permits is the remaining execution gate.

## Finalized account and deployment checks

| Check                                   | Operator                                       | Player                                         |
| --------------------------------------- | ---------------------------------------------- | ---------------------------------------------- |
| Public address                          | **0xbE4a3DAABCd4406e75314aC7324411249E0C36a2** | **0xc0a50A4E032b19c905509E8f5EFD35fC7EA82D49** |
| Chain                                   | Ethereum Sepolia **11155111**                  | Ethereum Sepolia **11155111**                  |
| Latest mined balance                    | **0.0499999998421661 ETH**                     | **0.05 ETH**                                   |
| Finalized balance at block **12126671** | **0.0499999998421661 ETH**                     | **0.05 ETH**                                   |
| Latest observed block                   | **12126745**                                   | **12126746**                                   |
| Confirmed / provider-pending nonce      | **1 / 1**                                      | **0 / 0**                                      |
| Maximum role-specific integration fees  | **0.003 ETH**, sufficient                      | **0.0015 ETH**, sufficient                     |

The initial refresh at finalized block **12126639** still showed zero finalized player balance. A later read-only refresh confirmed the entire **0.05 ETH** at finalized block **12126671**, resolving that blocker. The player checker returned **player-readonly-ready**, with ordinary account code and no outgoing/pending activity. Offline configuration validation independently derived both signer addresses without signing anything and matched the public pins. These are block-specific observations; fresh checks still apply before any approved execution.

The integration target is **0x4b4c204d28D5ee37896278C5fc56d61086f92b53**, pinned in `reviewed-deployment.ts` and now set in the owner's existing ignored **contracts/.env**. The deployed receipt, creation calldata, constructor operator, compiler ABI, runtime and infrastructure configuration passed the existing read-only preparation command. `nextRoundId` is still **1**; no scoring round has been opened. Deployment transaction **0x9993ceddc07934d098e3b7458b278e2bf90fc8de79f4e2ce4dfedce4cc2429d1** remains successful. Actual deployment cost remains **8768550 gas × 18 wei/gas = 157833900 wei**.

## Prepared environment and execution gates

The current configuration is in **contracts/.env**, not `packages/blockchain/.env`. Only two public fields were prepared under the owner's instruction: the deployed target and invocation allocation below. All other env bytes, including signer/RPC values, comments and approval flags, were preserved. No secret was copied to another file or printed. The secret-bearing env file remains ignored and is not committed.

| Exact variable                      | Prepared/required state                                                                                                                                   |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SEPOLIA_RPC_URL`                   | Existing privately configured trusted HTTPS endpoint; not displayed                                                                                       |
| `CIPHERQUIZ_OPERATOR_ADDRESS`       | Pinned operator above                                                                                                                                     |
| `CIPHERQUIZ_OPERATOR_PRIVATE_KEY`   | Existing matching local signer, `0x`-prefixed; never displayed                                                                                            |
| `CIPHERQUIZ_PLAYER_ADDRESS`         | Independently supplied player above                                                                                                                       |
| `CIPHERQUIZ_PLAYER_PRIVATE_KEY`     | Existing matching separate local signer, `0x`-prefixed; never displayed                                                                                   |
| `CIPHERQUIZ_SEPOLIA_ADDRESS`        | **0x4b4c204d28D5ee37896278C5fc56d61086f92b53**                                                                                                            |
| `CIPHERQUIZ_MAX_FEE_PER_GAS_WEI`    | Existing **100000000** (0.1 gwei); unchanged                                                                                                              |
| `CIPHERQUIZ_MAX_TOTAL_GAS_COST_WEI` | Prepared **4500000000000000** (0.0045 ETH), replacing the deployment-specific 0.002 ETH allocation; supersedes the earlier 0.005 ETH integration proposal |
| `CIPHERQUIZ_SEPOLIA_TEST`           | **Unset**; only after explicit integration approval may the execution process receive `approved`                                                          |
| `CIPHERQUIZ_SEPOLIA_DEPLOY`         | **Unset**, and unnecessary for integration                                                                                                                |

The shared validation was separated from the execution gate: `readIntegrationConfig` validates configuration offline; `readSettings` still requires explicit live-test approval first. New `npm run validate:sepolia-integration -w @cipherquiz/blockchain` validates signer identities, target, exact complete-run allocation and budget without activating an approval flag, constructing an SDK, signing or reserving spending. Its status is **integration-config-validated-no-approval**. The live command was not invoked, even as a dry run.

## Exactly three proposed transactions

All calls target the deployed scoring contract on chain **11155111** with **zero ETH value**. Actual estimates will be obtained with fresh ciphertext/proofs and intermediate round state only during an approved invocation. Each is simulated, estimated with a rounded-up 20% gas margin and rejected above the immutable **15000000 gas / 0.1 gwei** limits. No automatic write retry is proposed.

| Order / signer | Call                                                                                                        | Individual maximum gas fee |
| -------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------: |
| 1 / operator   | `createRound(player, latestBlockTimestamp + 3600, contentHash, fourEncryptedDummyKeys, operatorBoundProof)` |             **0.0015 ETH** |
| 2 / player     | `submitAnswers(actualRoundIdFromReceipt, fourEncryptedPackedAnswers, playerBoundProof)`                     |             **0.0015 ETH** |
| 3 / operator   | `finalizeRound(sameRoundId)`                                                                                |             **0.0015 ETH** |
| Total          | Exactly these three writes                                                                                  |             **0.0045 ETH** |

The fixture has four disposable random keys; it supplies two correct and two incorrect answers, expecting decrypted score **2/4**. The content hash excludes answer keys. Current operator nonces imply **1 then 2** for its two calls and player nonce **0** for submission, absent outside activity; execution must recheck rather than assume. Round ID comes from the actual `RoundOpened` event. Negative application-action checks are read-only simulations. No deployment, ETH transfer, staking, token approval, delegation or publicly decryptable output is proposed.

## Persistent accounting

The unchanged journal contains one chain/operator-bound deployment reservation, ID `bbba8b28-7817-4902-bbff-0f62552552b7`, for **0.0012728604 ETH**. Full liability remains reserved despite a much smaller actual receipt fee. Lock absent; no reservation was appended or released during readiness work.

| Accounting item                                             |      Sepolia ETH |
| ----------------------------------------------------------- | ---------------: |
| Strict aggregate cap, unchanged                             |         **0.02** |
| Existing deployment reservation                             | **0.0012728604** |
| Remaining before integration                                | **0.0187271396** |
| Prepared invocation allocation / three-write ceiling        |       **0.0045** |
| Remaining if all three writes reserve their absolute maxima | **0.0142271396** |

An allocation is configuration, **not an active reservation or permission to spend**. Only after approval and per-transaction checks would each send acquire the shared lock and durably reserve its own worst-case fee before broadcast. Failed/uncertain writes retain their charges. Keep the canonical journal; manual sends, another clone or deleted/modified accounting can bypass local enforcement and require reconciliation under the same original cap.

## Required offchain signature scope

Installed SDK paths and the [official permit model](https://docs.zama.org/protocol/sdk/concepts/permit-model) were reviewed. The runner now explicitly calls `permits.grantPermit([scoringAddress])` before each decryption path, making the one-contract scope visible in source. Player permit reuse is expected between the before-finalization denial and authorized final-score decryption. Normally one initial permit is needed for each of **player, operator and freshly generated ephemeral stranger**; the latter two are negative ACL test actors, not extra onchain senders. Their keys/permits are never printed.

- EIP-712 primary type: **UserDecryptRequestVerification**; domain **Decryption**, version **1**, host chain **11155111**, verifying contract **0x5D8BD78e2ea6bbE41f26dFe9fdaEAa349e077478** from the installed Sepolia preset. This verification-domain address differs from the scoring target; the permitted contract array is only **0x4b4c204d28D5ee37896278C5fc56d61086f92b53**.
- Installed V1 message fields are `publicKey`, `contractAddresses`, `startTimestamp`, `durationDays`, `extraData`. V2 uses `userAddress`, `publicKey`, `allowedContracts`, `startTimestamp`, `durationSeconds`, `extraData`. The transport public key and protocol/KMS context are resolved at execution. V2 rounds start time down to the minute. The SDK selects the supported protocol version; both direct-user schemas were reviewed.
- The existing SDK default is **30 days** for permits and **2592000 seconds** for transport-key cache lifetime. These values were not silently shortened or extended. Approval must include this permit lifetime. Permits are scoped to identity/chain/contract, not a single score handle, and remain subject to actual ACL rights. They can therefore cover later ciphertexts for that same actor/contract while valid. They do not grant onchain ACL access or authorize token transfers.
- Transport key generation was inspected in installed `TransportKeyPair-p.ts`: it generates cryptographic transport keys through the runtime, without an Ethereum wallet signature. The encryption service also has no wallet-signing input in this runner. No additional personal-message signature, wildcard permit, delegation or onchain decryption-authorization transaction is proposed. The actual typed permit includes the public transport key and runtime timestamps/context; no signed permit was generated during review.
- Every actor uses separate in-memory key/permit stores. The player's valid permit is reused; operator/stranger permits accompany their SDK negative-decryption checks. Discarding memory/terminating SDKs does not itself revoke an already signed permit. The default 30-day capability and lack of per-handle restriction are disclosed for approval. No permit/signature value is logged.

The KMS caveat remains: installed V1/V2 direct decryption checks onchain ACL permissions **before** relayer submission. `AclUserDecryptionError` establishes **SDK ACL preflight rejection**, not independent remote KMS denial. A successful authorized uncached decryption would exercise KMS, but remote negative enforcement is still unverified. Protocol/SDK compatibility, live proof acceptance, actual integration gas, timing, scoring and decryption are objectives of the proposed integration, not completed evidence. No production/staking claim follows from readiness.

## Checks and approval checkpoint

Offline configuration validation, finalized account reads, deployment/runtime/ABI/infrastructure checks and byte-preservation checks passed. Unit regressions verify that an exact **0.0045 ETH** allocation validates without an approval flag, the live gate stays closed, and one wei less fails the complete-run ceiling. **`npm run check` passed all builds, workspace typechecks, ESLint/Solhint, formatting and 36 local tests** (3 API, 4 frontend, 15 blockchain, 14 Hardhat), with no failures/skips. A final exact-configured-secret scan of **143 source files and 45 build/artifact files** found zero matches and rechecked the allocation, unchanged aggregate allowance, single journal entry, absent lock and unset flags. This bounded scan is not an absence guarantee for every secret format. Git synchronization is recorded with [verification](verification.md). No secret values were printed. No active spending reservation or live-wallet/SDK signature was created.

After the local checks pass, request explicit authorization for **one invocation only**, limited to the three zero-value calls above, **0.0015 ETH each / 0.0045 ETH total**, under the retained **0.02 ETH** project cap, plus the reviewed contract-scoped **30-day EIP-712 decryption permits** for the player/operator/ephemeral stranger. No retries, funding, extra deployments, delegation or merge are included. Fresh signer, balance, nonce, fee, gas, deployment and ledger checks must still pass at execution.

Future command, **only after approval** and secure environment injection:

```sh
npm run test:sepolia -w @cipherquiz/blockchain
```

For the owner's current env-file location, the runbook alternative is `node --env-file=contracts/.env --import tsx --test packages/blockchain/integration/scoring.sepolia.ts`. Both commands remain disabled with the current unset integration flag. Do not execute either until the owner explicitly authorizes these writes and signatures. No permission is inferred from funded accounts or prepared allocation.
