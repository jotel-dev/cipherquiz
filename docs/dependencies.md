# Dependency decisions

Phase 2 update (2026-11-11): no dependency or lockfile changes. The [encrypted-scoring record](encrypted-scoring.md#sdk-compatibility-boundary) distinguishes executed plugin/legacy-relayer local workflows from type-checked current-SDK APIs and unverified current-SDK wire compatibility. Current SDK generic encryption/decryption APIs exist; token-focused examples are not the only available surface.

Reviewed on 2026-11-10 using official sources and npm registry metadata. Resolved package versions are recorded in package-lock.json; docs/verification.md records the installed versions.

## Zama sources consulted before selecting packages

- [Official SDK overview](https://docs.zama.org/protocol/sdk)
- [Official FHEVM Hardhat quick start](https://docs.zama.org/protocol/solidity-guides/getting-started/quick-start-tutorial)
- [Official template package manifest](https://github.com/zama-ai/fhevm-hardhat-template/blob/main/package.json)
- [Official template Hardhat configuration](https://github.com/zama-ai/fhevm-hardhat-template/blob/main/hardhat.config.ts)
- [Official ACL guide](https://docs.zama.org/protocol/solidity-guides/smart-contract/acl)
- [Official legacy SDK deprecation notice](https://github.com/zama-ai/relayer-sdk)

The official SDK overview now points application developers to @zama-fhe/sdk. The legacy repository announces that @zama-fhe/relayer-sdk is no longer maintained from 2026-11-06. However, the current Hardhat plugin still requires that package as an exact peer. This is an upstream compatibility constraint, not a recommendation to use the legacy SDK in new application code.

## Selected boundaries

| Boundary              | Choice                                               | Reason                                                                                                                                            |
| --------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Browser               | React 19, Vite 7, TypeScript 5.9, Wagmi 3, Viem 2    | Wagmi 3 makes unused wallet connectors optional; only the injected connector is configured. Vite 7 is retained as a stable compatible build tool. |
| API                   | Fastify 5, pg 8                                      | Minimal typed service and PostgreSQL driver; no ORM or additional service needed yet.                                                             |
| Application FHE SDK   | @zama-fhe/sdk 3.7.2                                  | Current official application SDK, installed but not initialized or called in Phase 1.                                                             |
| Contract runtime      | Hardhat 2.28.6, ethers 6                             | Matches official template generation and plugin peer constraints; avoid unsupported Hardhat 3 migration.                                          |
| FHEVM library         | @fhevm/solidity 0.11.1, encrypted-types 0.0.4        | Exact reviewed template library versions.                                                                                                         |
| Local FHE tooling     | @fhevm/hardhat-plugin 0.4.2, @fhevm/mock-utils 0.4.2 | Exact plugin and required mock peer.                                                                                                              |
| Legacy toolchain peer | @zama-fhe/relayer-sdk 0.4.1                          | Exact plugin peer; not imported in application source.                                                                                            |
| Solidity              | 0.8.27, Cancun, optimizer 800 runs                   | Reviewed template compiler settings, tested with minimal imports.                                                                                 |

The Hardhat workspace uses a separate CommonJS TypeScript configuration. Ethers belongs to that toolchain; browser wallet interaction uses Wagmi/Viem. The optional Zama React SDK is omitted because there is no FHE UI integration yet.

No API signatures for gameplay encryption, decryption or tokens are invented. The abstract Solidity boundary resolves FHE and ZamaEthereumConfig from installed sources; it implements no game behavior. No template gameplay/demo contract, Quiza code or deployment scripts were copied.

## Reproducibility and review

Use npm ci and keep the lockfile with source control. Review dependency upgrades as coordinated SDK/plugin/library changes. Do not override the plugin's exact peer requirements without testing. npm audit results include upstream development-tool dependencies; a successful build is not an audit or a production security assessment.

PostgreSQL is an external local prerequisite, not bundled software. PostgreSQL 16+ is the proposed development baseline; a live server has not yet been verified in this workspace.
