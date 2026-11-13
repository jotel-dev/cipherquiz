# Read-only encrypted scoring integration preparation

Prepared **2026-11-13 (Africa/Lagos)**. **STOP: integration execution and signatures are not authorized.** No Sepolia transaction, decryption permit, round, encryption request, KMS request or production budget reservation was created during this preparation. Local security tests use isolated disposable mock signers. Deployed code, spending limits, populated env files and approval flags are unchanged.

## Verified deployment and receipt cost

| Check                                       | Result                                                                                             |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Chain                                       | Ethereum Sepolia, **11155111**                                                                     |
| Scoring contract                            | **0x4b4c204d28D5ee37896278C5fc56d61086f92b53**                                                     |
| Deployment transaction                      | **0x9993ceddc07934d098e3b7458b278e2bf90fc8de79f4e2ce4dfedce4cc2429d1**                             |
| Deployer / immutable operator               | **0xbE4a3DAABCd4406e75314aC7324411249E0C36a2**                                                     |
| Receipt                                     | Success, block **12126360**                                                                        |
| Receipt block hash                          | `0x4ffd78f676c9ec4ffbfeeb7823aaa0d6ad4b87cf0f05e2ab21dd760df2706ac6`                               |
| Gas used × effective gas price              | **8768550 × 18 wei/gas**                                                                           |
| Independently recalculated actual fee       | **157833900 wei = 0.0000000001578339 Sepolia ETH**                                                 |
| ETH value                                   | **0 wei**                                                                                          |
| Latest observed block / confirmations       | **12126424 / 65**                                                                                  |
| Finalized block at that snapshot            | **12126355**, preceding the deployment block; do not claim finalized deployment from this snapshot |
| Latest / finalized operator balance         | **0.0499999998421661 / 0.05 ETH**                                                                  |
| Confirmed / provider-pending operator nonce | **1 / 1**                                                                                          |
| Contract protocol / next round ID           | **10001 / 1**; no round has been created                                                           |

`npm run prepare:sepolia -w @cipherquiz/blockchain` is the new reusable read-only command. With HTTPS RPC securely injected, it verifies the receipt, exact creation calldata with the sole approved operator argument, reviewed creation-bytecode hash, application source against compiler inputs, compiler settings (0.8.27/Cancun/800 optimizer runs), and the full artifact ABI against compiler output. It checks every shared integration function's selector and output types against that ABI. Runtime comparison masks only compiler-declared immutable bytes and separately verifies operator and protocol identity. No deployed ABI is assumed to exist onchain: the source/compiler ABI is tied to the verified deployed runtime and creation data.

Creation-bytecode Keccak-256: `0x4b033120899ac98fde5d0e1f8eded615afd01a48d825fdcc06766f3bd877cbcf`. Full deployed runtime hash: `0x98e53c2f853afaedee48a173730a1730d0c71f2cbd9cf61aafd3c8cb980daccc`. Artifact ABI JSON hash: `0x5d23326a0b9c4968960381e6694d1662e19320c83f1bcdb946e478d789f23a18` (serialization-specific).

The command also reads the contract's pinned coprocessor storage layout and verifies ACL, executor, KMS verifier and executor-resolved input verifier against installed SDK/Solidity expectations and code presence. Proxy implementations/governance and protocol cryptography are not attested by code-presence checks. No signer or SDK instance is constructed. The budget journal is read and checked byte-for-byte unchanged; no lock/reservation is acquired. A first-integration preparation fails if unexpected reservations, prior rounds or operator transactions appear, requiring reconciliation rather than resetting state.

## Exact proposed integration transactions

All three calls target **0x4b4c204d28D5ee37896278C5fc56d61086f92b53**, chain **11155111**, with **zero ETH value**. Each transaction is simulated and estimated immediately before sending, uses a rounded-up 20% gas margin, and stops above the existing **15000000 gas / 100000000 wei per gas (0.1 gwei)** limits. There is no automatic write retry.

| Order / caller        | Call and arguments                                                                                                                                                                                                                                                      | Maximum gas fee |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------: |
| 1 / approved operator | `createRound(address,uint64,bytes32,bytes32[],bytes)`: separately configured player, latest block timestamp + 3600 seconds, hash of `CipherQuiz Sepolia disposable public fixture v1`, four newly encrypted random dummy choices and real operator/contract-bound proof |  **0.0015 ETH** |
| 2 / designated player | `submitAnswers(uint64,bytes32[],bytes)`: actual round ID from `RoundOpened`, four fresh encrypted packed answers and player/contract-bound proof; first two correct, last two incorrect                                                                                 |  **0.0015 ETH** |
| 3 / approved operator | `finalizeRound(uint64)`: that same submitted round, granting only its player access to the encrypted final score                                                                                                                                                        |  **0.0015 ETH** |
| Total                 | Exactly three proposed writes                                                                                                                                                                                                                                           |  **0.0045 ETH** |

Expected decrypted score is **2/4**. Round IDs are obtained from the mined event, never predicted. The current next round is 1; current operator nonce is 1, so absent outside transactions its create/finalize calls would use nonces 1 and 2. Player address and nonce are unknown until securely provisioned and checked. Transactions are signed only after separate approval and renewed checks. The harness never deploys, stakes, pays tokens, funds accounts or grants public decryption.

Real integration gas has **not** been estimated: valid proof/ciphertext inputs and intermediate round state do not exist yet. The numbers above are enforceable maxima, not mock-derived live estimates or expected actual prices. Current suggested maximum/priority gas prices were **21/2 wei per gas**, both below the fee ceiling, but will be checked again at execution.

## Persistent ledger reconciliation

The canonical ignored `contracts/.sepolia-budget.jsonl` has exactly one valid reservation: ID `bbba8b28-7817-4902-bbff-0f62552552b7`, operation `deployment`, chain **11155111**, approved operator. Its amount equals the mined transaction's **12728604 gas limit × 100000000 wei/gas = 1272860400000000 wei (0.0012728604 ETH)**. Receipt cost is lower, but the full reservation remains charged by design. The journal was not edited and no surplus was released. No lock remains.

| Budget item                                           |      Sepolia ETH |
| ----------------------------------------------------- | ---------------: |
| Strict lifetime project cap                           |         **0.02** |
| Existing deployment reservation                       | **0.0012728604** |
| Confirmed remaining aggregate allowance               | **0.0187271396** |
| Proposed three-write maximum                          |       **0.0045** |
| Remaining if all three writes reserve absolute maxima | **0.0142271396** |

Both operator and player writes consume this same project budget under the pinned operator identity. Each future write reserves maximum liability with an exclusive lock and fsync before broadcasting. Failed/uncertain sends retain their reservations. Local tests exercise rotation, malformed entries, duplicate IDs, exhaustion and fee/gas ceiling guards. Local accounting cannot constrain manual sends, another clone, journal deletion or deliberately modified scripts. Those activities require stopping for reconciliation under the original cap; no wallet/checkout change creates a new allowance.

## Prepared runner and SDK compatibility

The existing `scoring.sepolia.ts` now pins the exact deployed address and reviewed creation hash in addition to runtime/operator/protocol checks. It requires invocation allocation sufficient for the complete three-write ceiling before network access. Before SDK construction or round creation it requires full aggregate headroom and operator/player balances covering their respective absolute maxima (**0.003 / 0.0015 ETH**). This prevents beginning a round with only enough allocation or funding for part of the workflow. These are additional fail-closed readiness checks; the existing spending ceilings are unchanged.

The runner prepares real SDK encryption and proof generation for four disposable random keys, verifies round creation and proof acceptance, packs answers as `(roundId << 16) | (questionIndex << 8) | choice`, submits once, checks score ACLs before/after finalization, and requires authorized player decryption to equal two. Key public-decryption permission and operator/outsider score permissions are explicitly checked. The following negatives use only live-state `eth_call` simulation: unauthorized round creation, outsider actions, premature finalization, partial answers, malformed proofs and duplicate submission/finalization. Exact application error decoding excludes transport failures; malformed proof checks require an EVM revert.

The compatibility layer remains compile-only: installed **@zama-fhe/sdk 3.7.2**, Viem adapter, **@fhevm/sdk 0.13.2**, Solidity **0.11.1**, and plugin/mock **0.4.2** expose the reviewed encryption, `encryptedValues`/`inputProof`, decryption and adapter APIs. The complete runner is typechecked against these declarations. `node()` uses the real Sepolia preset; no cleartext transport, Hardhat mock or legacy-relayer application call is used. Compilation establishes API compatibility, not wire/proof compatibility, live FHE circuit acceptance or KMS behavior. Local FHE tests still use official mocks.

Each SDK actor uses independent `MemoryStorage` and permit storage, with logging/debug output disabled. Plaintext keys/answers remain disposable in-memory fixture values; content hashes and logs exclude them. A player's initial denied decryption cannot provide a successful cached score; its first successful decryption after finalization must obtain the expected score through the SDK. No guarantee is inferred about independent hostile KMS requests.

## ACL and KMS evidence boundaries

Round keys receive only application contract persistence through `FHE.allowThis`; the operator author already knows its keys. Scores retain contract permission and gain designated-player permission only on finalization. No application public-decryption or delegation path exists. Operator/outsider access to the final score and player/outsider access to keys are checked independently. These uses follow the [official ACL guide](https://docs.zama.org/protocol/solidity-guides/smart-contract/acl).

Installed `fetchKmsSigncryptedSharesV1` and `fetchKmsSigncryptedSharesV2` call `checkPersistAllowed` before forwarding direct user decryption to the relayer. That check reads both user and contract permission and raises `AclUserDecryptionError` locally. The runner therefore labels these negatives **SDK ACL preflight denial**, never genuine remote KMS denial. A generic 403, timeout or failed signature is not accepted as proof. A successful uncached authorized decryption would exercise the KMS path; it would not prove the remote service rejects an unauthorized request. Independent negative KMS evidence still needs a documented upstream-supported route; no private SDK bypass, falsified RPC permission or fabricated remote denial is introduced.

Remaining risks include operator trust and key loss, score inference across reused questions, collusion, public metadata, infrastructure governance, SDK/protocol compatibility, relayer availability, inclusion deadlines and partial workflow completion after a timeout. Live replay across rounds, exact timestamp boundary, maximum ten-question network cost, recovery and throughput remain unverified. There is no production/staking security claim.

## Missing configuration and required approvals

The local inventory found no populated `packages/blockchain/.env`, no configured player signer, no integration target in the current deployment environment, and an existing **0.002 ETH deployment invocation allocation**, below the conservative **0.0045 ETH** integration ceiling. Operator signer/RPC are available locally, but neither was copied into another file. Both approval flags remain unset. The example now contains the public deployed address only; populated env files were not modified.

Before execution, the owner must securely provision a different dedicated player's `0x`-prefixed key, supply the exact target address, and fund/check the player for **0.0015 ETH** at the reviewed maximum. Operator funding already covers its **0.003 ETH** maximum. A proposed **0.005 ETH integration invocation allocation**, documented previously, would cover the three-write maximum and remain subordinate to the shared cap. No allocation or limit was changed here; the owner must separately authorize/configure that integration scope. Any project-paid funding, service fee or recovery transaction requires separate approval and inclusion in the same budget before execution.

According to current [Zama authentication documentation](https://docs.zama.org/protocol/sdk/guides/authentication), the shared **Sepolia relayer requires no API key**. Trusted HTTPS RPC access is already configured privately. No KMS private key or custom signer credential is required or requested: public protocol configuration, real proofs, player ACL and SDK-generated signed permits govern user decryption. Relayer/KMS availability was not tested by this read-only preparation.

The owner must explicitly authorize **one integration invocation with these three zero-value writes**, their maxima, and SDK-required offchain signatures, including the chain/contract-scoped [EIP-712 decryption permits](https://docs.zama.org/protocol/sdk/concepts/permit-model) for player and negative-test identities. The stranger is generated in memory and needs no ETH. The SDK may request transport-key authorization as part of permit setup. Permit creation/decryption calls are not read-only verification and are deferred with integration. The existing default permit lifetime is 30 days; memory stores are actor-isolated and discarded after the invocation, which does not itself revoke any signed permit. This scope must be understood before signing.

Only after that authorization, secure environment injection and renewed checks would execution use:

```sh
npm run test:sepolia -w @cipherquiz/blockchain
```

`CIPHERQUIZ_SEPOLIA_TEST=approved` remains unset now. Do not invoke the live command during preparation; it is not a dry-run command. No deployment, integration, automatic retry, funding, audit metadata export or merge is implied by this document.

## Validation

The targeted blockchain suite passes **12 tests**, including exact deployment pinning, complete invocation allocation, unchanged fee/gas ceilings and signer-role cost distribution. The read-only preparation passed against live Sepolia and independently reconciled receipt liability and the unchanged ledger. **`npm run check` passed all builds, workspace typechecks, ESLint/Solhint, formatting and 33 local tests** (3 API, 4 frontend, 12 blockchain, 14 Hardhat), without failures or skips. An initial new address-check type inference issue was fixed before the full passing check. Final documentation formatting and diff checks passed. The final Git checkpoint is recorded with [verification](verification.md). No current dependency advisory audit was run; earlier advisory limitations remain historical. No secret values were printed or committed.
