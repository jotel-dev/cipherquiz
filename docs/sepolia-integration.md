# Sepolia integration preparation and evidence

For the separate test-only player, follow the [secure player setup guide](sepolia-player-setup.md). The existing `CIPHERQUIZ_PLAYER_PRIVATE_KEY` is paired with a new independently supplied public `CIPHERQUIZ_PLAYER_ADDRESS` pin. Use `verify:sepolia-player` offline, then `check:sepolia-player` for public-address funding checks. Neither command requires approval flags or executes integration writes. Existing caps and deployed code are unchanged.

The [post-deployment read-only integration preparation](sepolia-integration-preparation.md) is the current approval report. Use `npm run prepare:sepolia -w @cipherquiz/blockchain` with securely injected HTTPS RPC for receipt/source/ABI/runtime/budget verification without a signer or SDK. The live runner is now pinned to the deployed address and checks complete invocation/funding headroom before round creation. No integration flag, populated env, deployed code or spending ceiling was changed. The exact three proposed transactions, missing player setup and SDK-versus-remote-KMS boundary are documented in that report.

**Current state (2026-11-13):** following strict signer verification and separate authorization, one `CipherQuizScoring` deployment succeeded at **0x4b4c204d28D5ee37896278C5fc56d61086f92b53**, chain **11155111**. Conservative aggregate budget remaining is **0.0187271396 ETH**. No integration transaction has been authorized or run. Keep the existing ignored spending journal; do not create a fresh budget or rerun deployment. The original deployment script intentionally requires nonce zero; the operator's nonce is now one. Integration still needs a separately configured/funded player and explicit approval. See the [execution record](sepolia-deployment.md); older preparation and format failures below are historical.

The approved deployment attempt on 2026-11-13 stopped before broadcast at the key-format guard. The local representation must include the documented `0x` prefix; offline verification now checks this requirement too. No local secret was changed, no transaction/reservation was created and no retry is authorized automatically. See the [execution record](sepolia-deployment.md).

Current checkpoint: the owner reported successful offline verification for the new operator on 2026-11-13. See the [final read-only review](sepolia-final-review.md) for refreshed confirmed funding, deployment gas, retry coverage and remaining blockers. Both approval flags remain unset; integration still requires a different funded player and separate approval. Earlier preparation evidence below is historical.

Initial preparation started on `feat/encrypted-scoring` at `1ba8282`. Stage A review on 2026-11-11 preserved that uncommitted preparation and the frontend work at `8ccbcb9` on `feat/sepolia-fhe-verification`. **No deployment or transaction was submitted during Stage A.** The live test is prepared and type-checked, not verified end to end. See the current [predeployment report and approval checkpoint](sepolia-predeployment.md); earlier preparation evidence below is historical.

## Review of the existing implementation

The scoring contract, its thirteen local scoring tests and the compile-only SDK compatibility assertions were inspected before changes. Contract source and existing security assertions are unchanged; the mixed-score test now also reports mock gas for cost planning. The circuit uses encrypted comparisons, key validity masking, encrypted boolean conversion and encrypted addition. Stored keys and scores retain contract ACL permissions; only final scores gain the player's permission. Immutable setup, caller checks, handle consumption and round/question context remain in force.

No new cryptographic assurance follows from this review. Authoring operators know plaintext keys. Deadlines depend on inclusion and block timestamps; operator-supplied content and keys are not independently validated. Question reuse, score inference and public participation metadata remain risks. The earlier [architecture and limitations](encrypted-scoring.md) continue to apply. Confidential staking is blocked on real network evidence and separate economic/security design.

## Prepared commands and boundaries

- `npm run preflight:sepolia -w @cipherquiz/blockchain`: read-only chain/infrastructure checks, aggregate headroom and unsigned deployment estimate using the pinned public `CIPHERQUIZ_OPERATOR_ADDRESS`. Requires HTTPS RPC and compiled artifacts; reads no private keys or approval flags and has no wallet/write path. Stage A may run this command without deployment authorization.
- `contracts/scripts/deploy-sepolia.ts`: separate, approval-gated Hardhat deployment. Fixes the operator to the environment signer, checks Sepolia and installed infrastructure addresses, estimates deployment gas, enforces fee/balance limits and reports only public deployment metadata. The script was not executed.
- `packages/blockchain/integration/scoring.sepolia.ts`: explicit current-SDK live test against an **existing** deployment. It contains no deployment path, Hardhat mock import, cleartext relayer or plaintext scoring substitute.
- `packages/blockchain/integration/support.ts` and its local tests: fail-closed configuration, strict packed-input bounds, specific ACL error classification and compiler-declared immutable masking for runtime identity comparison.
- Normal `npm test` runs local tests only. The live test requires its own command and flags; missing configuration fails, rather than silently skipping or claiming live success.
- Both scripts suppress raw errors and request bodies. SDK logging/debugging is disabled; no SDK event listener prints encryption values or credentials. Failure output identifies the stage. Transaction hashes are reported immediately after broadcast so an interrupted confirmation wait does not hide a submitted transaction. There is no automatic retry of writes.

After owner approval and secure configuration, deployment would use:

```sh
npm run deploy:sepolia -w @cipherquiz/contracts
```

After that approved deployment, set its returned address and separately authorize the live test:

```sh
npm run build -w @cipherquiz/contracts
npm run test:sepolia -w @cipherquiz/blockchain
```

These commands are a runbook, not authorization to execute them. Neither existing local tests nor `npm run check` deploys anything or runs the live test.

## Secure environment setup

Use the supplied operator `0xbE4a3DAABCd4406e75314aC7324411249E0C36a2` and a different dedicated Sepolia player account, with limited test ETH. Both write commands independently check the actual operator signer against this pinned public address before network access. Inject environment values from a local secret manager into the process. Never paste keys into chat, terminal commands/history, CI output, committed files, `VITE_*`, public configuration or screenshots. RPC URLs can contain credentials and must also be treated as secrets.

This test-only operator replaces the previous wallet as of 2026-11-12. Never deploy with the retired wallet. Updating the public address does not replace the private signer: configure the matching test-only signer privately, confirm local setup to the agent, and only then run the existing offline signer check. Do not request or send the private key in chat. The check derives a public address without signing or making network requests; it must report the new pinned address before deployment can be considered.

For local file-based configuration, the supplied `.env.example` files contain the public operator address and leave secret values empty. A populated `.env` is ignored by Git but remains plaintext on disk: restrict it to the current OS user, keep it out of synced/shared directories, and remove it after use. Scripts intentionally do not auto-load files. If using an ignored file instead of injected environment values, Node 24's `--env-file` can load it explicitly (commands below run from the repository root):

```sh
# Only after approval; the selected file supplies the required variables.
node --env-file=contracts/.env node_modules/hardhat/internal/cli/cli.js --config contracts/hardhat.config.ts run contracts/scripts/deploy-sepolia.ts --network sepolia
node --env-file=packages/blockchain/.env --import tsx --test packages/blockchain/integration/scoring.sepolia.ts
```

Prefer the npm commands above with a secret-manager-injected environment. Do not copy a populated example into source control. The approval flags are execution guards, not substitutes for the owner's actual approval.

| Variable                            | Deployment            | Integration test      | Meaning                                                                                    |
| ----------------------------------- | --------------------- | --------------------- | ------------------------------------------------------------------------------------------ |
| `SEPOLIA_RPC_URL`                   | Required              | Required              | Trusted HTTPS Sepolia JSON-RPC, used by the wallet and SDK network reads                   |
| `CIPHERQUIZ_OPERATOR_ADDRESS`       | Required              | Required              | Pinned public operator address; actual signer must derive exactly this address             |
| `CIPHERQUIZ_OPERATOR_PRIVATE_KEY`   | Required              | Required              | Environment-only 0x-prefixed 32-byte test signer; deployment sender and immutable operator |
| `CIPHERQUIZ_PLAYER_PRIVATE_KEY`     | Unused                | Required              | Different environment-only test signer; submits answers and authorizes decryption          |
| `CIPHERQUIZ_SEPOLIA_ADDRESS`        | Unused                | Required              | Existing approved CipherQuizScoring deployment; never invented or defaulted                |
| `CIPHERQUIZ_MAX_FEE_PER_GAS_WEI`    | Required              | Required              | Positive integer maximum EIP-1559 fee per gas; at most 100000000 wei (0.1 gwei)            |
| `CIPHERQUIZ_MAX_TOTAL_GAS_COST_WEI` | Required              | Required              | Positive integer gas-cost budget for that invocation; excludes relayer service charges     |
| `CIPHERQUIZ_SEPOLIA_DEPLOY`         | Must equal `approved` | Unused                | Set only after explicit deployment approval; leave unset now                               |
| `CIPHERQUIZ_SEPOLIA_TEST`           | Unused                | Must equal `approved` | Explicit live-test opt-in after deployment; leave unset now                                |

The outsider signer is generated ephemerally in memory and needs no ETH because it only signs decryption permits. SDK instances use separate in-memory credential stores, so player permits/results cannot leak through a shared cache. No real answer bank is loaded. The fixture uses four random dummy choices known only to this process; it submits two correct and two incorrect answers. Only encrypted handles and proofs enter key/answer calldata. The public content hash excludes keys. Output records score equality as a boolean without printing keys or answers.

The owner's strict aggregate budget is **0.02 Sepolia ETH (20000000000000000 wei)** across deployment, integration and retries. Both commands share the ignored `contracts/.sepolia-budget.jsonl` ledger. Each write reserves its maximum gas liability durably before broadcast; a lock prevents concurrent reservations exceeding the cap. Reservations remain charged after failures, uncertain broadcasts and cheaper confirmed receipts. Never delete/reset the ledger or lock to retry, switch to a fresh clone, or manually send outside these guards. A stale lock or corrupt journal requires stopping and reviewing public receipts/reservations first. Unused budget does not authorize an onchain operation.

Operator rotation does not reset this project-wide cap. The reader rejects any reservation for a different operator, including mixed old/new journals, before another reservation can be appended. Never relabel old entries, silently migrate them, or replace a rejected journal with a new one. Reconcile previous liabilities explicitly before any write. On 2026-11-12 neither the canonical ledger nor its lock was present in this checkout. The reader treats an absent ledger as zero local reservations; this cannot distinguish a never-created ledger from lost history or spending in another checkout. Resolve any such history before deployment approval. No production ledger was created, edited, moved or deleted during rotation.

`CIPHERQUIZ_MAX_TOTAL_GAS_COST_WEI` remains an additional per-invocation limit. Proposed allocations: deployment `2000000000000000` wei (0.002 ETH), integration `5000000000000000` wei (0.005 ETH). The shared cap takes precedence. Proposed enforced transaction limits are 15000000 gas and 100000000 wei/gas, bounding each write's gas cost at 0.0015 ETH. Deployment checks headroom for itself plus three integration write ceilings; integration checks complete three-write headroom before starting. No ETH value, staking, payout or token transfer is sent.

### Secure local setup steps

1. Configure public `CIPHERQUIZ_OPERATOR_ADDRESS=0xbE4a3DAABCd4406e75314aC7324411249E0C36a2`, `CIPHERQUIZ_MAX_FEE_PER_GAS_WEI=100000000`, and the appropriate per-invocation allocation above. Keep both approval flags unset.
2. Privately configure `SEPOLIA_RPC_URL` through your own trusted secret manager or the private ignored environment file. Do not paste it into chat/history or print environment dumps. The original Stage A used a public RPC; the replacement wallet's balance was checked through the owner's configured RPC as recorded in [verification](verification.md).
3. Privately provision `CIPHERQUIZ_OPERATOR_PRIVATE_KEY` for the supplied public wallet and `CIPHERQUIZ_PLAYER_PRIVATE_KEY` for a different player through the secret manager. The player is needed only for integration. Never expose either key through `VITE_*`, browser bundles, terminal arguments or committed files. Do not substitute another available signer for the pinned operator.
4. After local provisioning, confirm to the agent that the replacement signer is configured before asking it to run the offline verification command below. It has no provider or network/write API and logs only a public address on success. Missing, malformed or mismatched signing material fails with a sanitized message. Success must report `reviewed-signer-matched` and `0xbE4a3DAABCd4406e75314aC7324411249E0C36a2`. Historical failures with missing credentials do not verify this signer.

```sh
npm run verify:sepolia-signer -w @cipherquiz/contracts
```

5. Run contracts build and read-only preflight with the securely injected RPC environment. Review current balance, gas estimate, fees, artifact identity and aggregate headroom. The replacement wallet's observed balance was 0.05 ETH, subsequently confirmed with the `finalized` block tag. Refresh estimates for the replacement wallet and reconcile any previous ledger history before seeking deployment approval. No funding command is performed here.
6. If using an optional ignored `.env`, create/populate it privately in an editor, with OS access restricted to your account. Load it explicitly; offline verification from the repository root can use:

```sh
node --env-file=contracts/.env node_modules/ts-node/dist/bin.js --project contracts/tsconfig.json contracts/scripts/verify-sepolia-signer.ts
```

7. Review the [current cost plan](sepolia-predeployment.md), then obtain explicit deployment approval. Only afterwards set `CIPHERQUIZ_SEPOLIA_DEPLOY=approved` locally and execute deployment. Integration needs separate explicit authorization, the actual deployed address and `CIPHERQUIZ_SEPOLIA_TEST=approved`. Neither flag is set during Stage A.

No private key, permit, proof, RPC credential or decrypted answer is required in chat. The ledger contains public metadata and must be retained across retries. Actual receipt fees are recorded separately from conservative reservations. No external ETH-valued service/funding transaction is executed; if one is later authorized, its liability must fit the same remaining aggregate cap.

## What a successful live run would establish

Before any round transaction, the test checks chain ID 11155111, deployed runtime identity against the locally compiled artifact (masking only compiler-declared immutables), immutable operator identity and protocol ID. It reads the contract's three coprocessor configuration storage slots using the layout pinned in installed Solidity 0.11.1, compares ACL/KMS/input-verifier addresses to the installed current SDK preset, and checks infrastructure bytecode and signer funding. Address parity and code existence alone do not prove protocol semantics.

The test then uses SDK 3.7.2 `node()` transport and public `sdk.encrypt` for real proof generation. Accepted `createRound` and `submitAnswers` transactions would establish proof and circuit acceptance on that network. It derives the allocated round ID from the receipt event instead of predicting it, packs encrypted round/question context, and tests malformed-proof rejection with a read-only `eth_call`. It requires an EVM revert rather than accepting a transport error as proof rejection.

Before submission it also checks unauthorized round creation, outsider finalization/submission, premature finalization and partial submission through `eth_call`. After successful writes it checks duplicate submission and duplicate finalization. These checks require the exact application custom error decoded against the compiled ABI; a network failure cannot satisfy them. They are simulations against live state, not mined reverted transactions. A normal run broadcasts exactly three transactions: operator `createRound`, player `submitAnswers`, operator `finalizeRound`. It does not claim live cross-round replay, exact timestamp-boundary or maximum-size circuit verification; those remain local-test evidence.

ACL queries check contract key access, player/outsider key denial, contract score access, player denial before finalization, player permission afterwards and operator/outsider denial. It also confirms the score is not publicly decryptable. An authorized `decryption.decryptValues` call must return the expected score using the real SDK/KMS path. Separate outsider and operator SDK instances must fail with the specific underlying `AclUserDecryptionError`, including through SDK error causes. Generic decryption failures, timeouts, signing errors and HTTP errors do not count as denial.

**Remote KMS denial remains a separate boundary.** Inspection of installed `@fhevm/sdk` 0.13.2 shows `fetchKmsSigncryptedSharesV1` calls `checkPersistAllowed` before relayer submission. The supported API exposes no ACL-check bypass. Therefore this test labels negative results as **SDK ACL denial against real onchain permissions**, never as remote KMS rejection. Authorized successful uncached decryption would exercise KMS behavior, but it cannot establish a negative KMS response. No internal SDK imports, RPC permission falsification or fabricated successful integration are used. A documented raw relayer test route or upstream-supported adversarial test utility is needed for independent remote-denial evidence before staking.

Each write is simulated and gas-estimated before sending with a 20% gas margin. The test bounds maximum transaction fees against its remaining total budget, waits two confirmations, records receipt gas, effective gas fee and cumulative wei cost, and checks receipt success. Those receipt values would be real Sepolia costs; local HCU/gas figures are not substituted. Two confirmations are a test waiting policy, not economic finality. Congestion, timeouts or failures can leave an open/submitted round; inspect printed transaction hashes before rerunning. A fresh run creates a new round. This harness does not benchmark ten-question network throughput or implement recovery.

Receipt diagnostics include block number, sender, gas estimate/limit and elapsed milliseconds from simulation through two confirmations. Encryption and authorized decryption have separate elapsed timings. These are wall-clock workflow measurements including RPC/polling/confirmation delays, not isolated KMS or coprocessor processing benchmarks. Transaction hashes are emitted immediately; on a timeout, inspect them before retrying because an already-broadcast transaction may still mine and incur fees.

## Evidence recorded in this preparation

| Area                                                 | Status                                                                         |
| ---------------------------------------------------- | ------------------------------------------------------------------------------ |
| Existing scoring circuit and tests                   | Reviewed; unchanged                                                            |
| Official current-SDK APIs and installed declarations | Reviewed; runner compiles against pinned packages                              |
| Local guard tests                                    | Four passing; these are ordinary configuration/packing tests, not FHE evidence |
| Existing Hardhat FHE tests                           | Local mock results only; see verification record                               |
| Live runner with current environment                 | Fails closed at approval/configuration guard; no network activity or broadcast |
| Deployment                                           | Not executed; no address or deployment transaction exists                      |
| Real encrypted proofs accepted on Sepolia            | Not verified                                                                   |
| Live circuit execution and authorized KMS decryption | Not verified                                                                   |
| Unauthorized SDK denial against live ACL             | Not verified                                                                   |
| Independent remote KMS denial                        | Not verified; supported SDK preflight prevents claiming this                   |
| Sepolia gas costs and protocol/module compatibility  | Not measured/verified                                                          |

See [verification](verification.md) for final local command results. No dependency versions or lockfile entries were changed; only workspace scripts/typechecking were extended. The existing compile-only compatibility layer remains unchanged.

## Official sources consulted

- [Current SDK configuration](https://docs.zama.org/protocol/sdk/guides/configuration): Node transport, signer/provider separation and testnet relayer setup.
- [Generic SDK reference](https://docs.zama.org/protocol/sdk/api-references/sdk/zamasdk): `encrypt` and `decryption.decryptValues`.
- [Permit model](https://docs.zama.org/protocol/sdk/concepts/permit-model) and [error reference](https://docs.zama.org/protocol/sdk/api-references/sdk/errors): scoped signed permits and structured failure handling.
- [Solidity configuration](https://docs.zama.org/protocol/solidity-guides/smart-contract/configure), [inputs](https://docs.zama.org/protocol/solidity-guides/smart-contract/inputs) and [ACL](https://docs.zama.org/protocol/solidity-guides/smart-contract/acl).
- [Hardhat network modes](https://docs.zama.org/protocol/solidity-guides/development-guide/hardhat/run_test) and [official template manifest](https://github.com/zama-ai/fhevm-hardhat-template/blob/main/package.json).

## Required before confidential staking

Obtain deployment approval; provision dedicated signers and RPC securely; fund test accounts; deploy the reviewed artifact; run and retain the real integration receipts and redacted results; resolve any discovered protocol/SDK incompatibility as a coordinated change; obtain independent remote ACL/KMS denial evidence; then review question secrecy, fairness, reserve accounting, token behavior, reentrancy, expiry/recovery and economic finality. Passing local tests or compiling the runner does not remove these blockers.
