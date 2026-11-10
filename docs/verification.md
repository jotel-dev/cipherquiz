# Phase 1 verification and handoff

Verified on 2026-11-10 on Windows with Node.js 24.15.0 and npm 11.12.1. The project directory was initially empty, with no package manifest, source files, Git repository or applicable AGENTS.md found. No Quiza source was accessed or copied.

## Complete source structure

Generated dependencies, compiler artifacts and build output are excluded from this source tree.

```text
cipherquiz/
├── .editorconfig
├── .env.example
├── .gitattributes
├── .gitignore
├── .npmrc
├── .nvmrc
├── .prettierignore
├── .prettierrc.json
├── eslint.config.mjs
├── package.json
├── package-lock.json
├── README.md
├── tsconfig.base.json
├── apps/
│   ├── api/
│   │   ├── .env.example
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── app.ts
│   │   │   ├── config.ts
│   │   │   └── server.ts
│   │   └── test/
│   │       └── health.test.ts
│   └── web/
│       ├── .env.example
│       ├── index.html
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       └── src/
│           ├── App.tsx
│           ├── main.tsx
│           ├── styles.css
│           └── wallet.ts
├── contracts/
│   ├── .env.example
│   ├── .solhint.json
│   ├── hardhat.config.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   └── CipherQuizFoundation.sol
│   └── test/
│       └── foundation.test.ts
├── packages/
│   ├── blockchain/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       └── index.ts
│   └── shared/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           └── index.ts
├── docs/
│   ├── architecture.md
│   ├── dependencies.md
│   └── verification.md
└── scripts/
    └── dev.mjs
```

Ignored generated directories include root node_modules, workspace dist directories, contracts/artifacts and contracts/cache. Git ignore and attributes are provided; no Git repository or commits were created.

## Installed versions

These are resolved versions, not just manifest ranges. package-lock.json records the complete transitive graph. `npm ls --depth=0` completed successfully.

| Technology or package                     | Installed version                                      |
| ----------------------------------------- | ------------------------------------------------------ |
| Node.js / npm                             | 24.15.0 / 11.12.1                                      |
| React / React DOM                         | 19.3.1 / 19.3.1                                        |
| Vite / React plugin                       | 7.3.8 / 5.2.0                                          |
| TypeScript                                | 5.9.3                                                  |
| Fastify / pg                              | 5.12.8 / 8.23.1                                        |
| Wagmi / Viem                              | 3.7.11 / 2.57.17                                       |
| TanStack React Query                      | 5.107.1                                                |
| Zama application SDK                      | 3.7.2                                                  |
| Hardhat                                   | 2.28.6                                                 |
| Solidity compiler                         | 0.8.27, Cancun target                                  |
| FHEVM Solidity                            | 0.11.1                                                 |
| FHEVM Hardhat plugin / mock utilities     | 0.4.2 / 0.4.2                                          |
| encrypted-types                           | 0.0.4                                                  |
| Legacy relayer SDK, contract tooling only | 0.4.1                                                  |
| Hardhat ethers plugin / ethers            | 3.1.3 / 6.17.0                                         |
| ESLint / @eslint/js                       | 9.39.5 / 9.39.5                                        |
| typescript-eslint                         | 8.72.2                                                 |
| eslint-config-prettier                    | 10.1.8                                                 |
| Prettier / Solidity formatter plugin      | 3.9.10 / 2.4.1                                         |
| Solhint                                   | 6.2.5                                                  |
| tsx / ts-node                             | 4.23.15 / 10.9.2                                       |
| globals                                   | 17.14.0                                                |
| @types/node                               | 24.19.2                                                |
| @types/react / @types/react-dom           | 19.3.0 / 19.3.0                                        |
| @types/pg / @types/mocha                  | 8.23.1 / 10.0.10                                       |
| PostgreSQL server                         | Not installed or verified; proposed local baseline 16+ |
| ERC-7984 token library                    | Not selected or installed                              |

## Commands

Run at the monorepo root. In PowerShell, use npm.cmd if npm.ps1 is blocked by execution policy.

```sh
npm ci
npm run dev                 # frontend and API together
npm run dev:web             # frontend only: http://127.0.0.1:5173
npm run dev:api             # backend only: http://127.0.0.1:3001
npm run build
npm run typecheck
npm run lint
npm run format:check
npm test
npm run check               # build, typecheck, lint, formatting, tests
npm run start -w @cipherquiz/api
npm run preview -w @cipherquiz/web
```

## Successful checks

- Dependency installation completed with a lockfile and a valid workspace dependency tree. The initial registry timeout was resolved by retrying with lower download concurrency. Wagmi 3 avoids installing unused third-party wallet SDKs.
- All five workspace builds completed. The frontend emitted production HTML, CSS and JavaScript. Hardhat compiled seven Solidity source files, including dependencies, using compiler 0.8.27. The only project contract is abstract and contains no gameplay.
- All five workspace TypeScript checks completed.
- ESLint and Solhint passed with zero Solidity warnings; Prettier's repository check passed.
- Three API tests passed: liveness without PostgreSQL, readiness availability/error behavior without leaking database details, and invalid port rejection.
- One Hardhat smoke test passed against local chain ID 31337. It verifies local toolchain operation, not encrypted gameplay.
- The combined development launcher started both services. Frontend HTTP 200, API liveness HTTP 200 and Vite health proxy HTTP 200 were verified.
- API readiness without a configured database returned HTTP 503 as designed.
- The compiled API start command returned HTTP 200 on a separate test port. The compiled frontend preview returned HTTP 200. The exact disclaimer was present in its JavaScript bundle and is rendered by the footer component; it is also in README.md.
- All servers launched for verification were stopped. No deployment or real token interaction occurred.

Vite/esbuild parent-directory resolution was blocked by the Windows sandbox. The frontend build and server commands succeeded with the required external execution approval. Hardhat's initial compiler download also required network access. These are execution-environment restrictions, not unresolved build errors.

## Dependency advisory results and limits

`npm audit --omit=dev --json` reported **zero known production dependency advisories** at verification time. This is not an application security audit.

The full `npm audit --json` reported **29 development-tool dependency findings: 10 low, 11 moderate, eight high, zero critical**. Affected chains include Hardhat's HTTP/archive/legacy ethers dependencies and lint tooling. The scanner includes parent packages affected through transitive dependencies; 29 is not a count of distinct application exploits.

The pinned Hardhat plugin requires the deprecated relayer SDK. npm also marks ESLint 9 unsupported. These constraints and advisories need a coordinated maintenance review before a production release; no forced major upgrades or blanket dependency overrides were applied. See [dependency decisions](dependencies.md) for the reviewed official sources and exact toolchain boundary.

## Unverified integrations and assumptions

- No PostgreSQL server or Docker executable was available. The readiness success/failure paths are unit tested with an injected dependency; no live database query was verified. No application schema or migrations exist yet.
- No browser visual automation, wallet connection, RPC calls, Sepolia deployment, real FHE encryption/decryption, ciphertext ACL enforcement or token settlement was exercised.
- SDK 3.7.2's exported type resolves in the blockchain package, but generic answer encryption and player-authorized decryption remain unimplemented and must be verified against the selected protocol versions.
- ERC-7984 implementation/version, deployed token identity and confidential transfer failure semantics remain open. No token addresses or contract APIs were invented.
- Tier multipliers are assumed to mean total return including principal. Question duration, per-question versus batch submission, timeout/refund rules, question randomness, reserve funding and administration remain design decisions.
- Local mocks and successful compilation do not establish cryptographic confidentiality, anti-cheating properties or production readiness.
- `npm ci` is the documented lockfile installation command; the completed installation used `npm install`. A separate clean-install reproduction was not run.

## Next recommended milestone

Build a local, token-free encrypted-scoring proof of concept using dummy questions, an explicit round state machine and negative ACL tests. Validate the real SDK input/decryption flow, replay protection, deadlines, score bounds and ten-question execution cost before designing ERC-7984 staking or deploying to Sepolia.
