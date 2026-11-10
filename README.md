# CipherQuiz

Confidential Web3 trivia, built independently for the Zama Developer Program Mainnet Season 5. The intended deployment target is **Ethereum Sepolia**, using test tokens only.

> This project is not audited, endorsed or operated by Zama. Use at your own risk.

## Phase 1: foundation

This repository provides a working React preview, Fastify health endpoints, PostgreSQL connection boundary, shared types, wallet configuration and a locally compilable FHEVM toolchain. There is no game engine, question bank content, staking, token transfer, SDK encryption/decryption integration or deployment.

Quiza is gameplay inspiration only. No Quiza source code was used.

## Intended game

Each round will contain ten timed multiple-choice questions drawn from a prebuilt bank: Mathematics, Geography, History and General Knowledge.

| Correct answers | Planned total return |
| --------------- | -------------------- |
| 10              | 2.0× stake           |
| 8–9             | 1.5× stake           |
| 7               | 1.2× stake           |
| Below 7         | 0× stake             |

Multipliers are interpreted as total return including the original stake; confirm this economic assumption before implementation. Question duration and timeout/refund policies remain open.

The planned confidential boundary covers answer keys, submitted answers, scores and payout amounts. Public prompts and choices live outside that boundary. FHEVM contract permissions and player-authorized decryption are intended to keep result access narrow. Encryption does not automatically prevent cheating: question reuse, external assistance, timing manipulation, malicious content operators and repeated-score inference need separate controls. See [architecture](docs/architecture.md).

## Quick start

Requirements: Node.js 22.12+ or 24 LTS, npm 10+, and PostgreSQL 16+ for database readiness. Node 24 was used for foundation verification. On Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`. No private key, wallet funding or RPC credentials are required for local foundation checks.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. The API listens on http://127.0.0.1:3001. Vite proxies browser health requests to the API during development. Run the processes separately with:

```sh
npm run dev:web
npm run dev:api
```

For PostgreSQL, provision a local database and least-privileged application user, then copy `apps/api/.env.example` to `apps/api/.env` and replace its development-only connection string. There is no application schema or migration yet. Do not use the example password outside local development. The API loads its own `.env` automatically.

- `GET /health/live`: process liveness, independent of PostgreSQL.
- `GET /health/ready`: executes `SELECT 1`; returns 200 when available, otherwise 503 without database details.

The frontend health indicator reports liveness only. No database is needed to view the preview. No Docker, cache, indexer, authentication service or background worker is required.

```sh
npm run build
npm run typecheck
npm run lint
npm run format:check
npm test
# All of the above, in order:
npm run check
# Apply formatting:
npm run format
# Start compiled API:
npm run start -w @cipherquiz/api
# Preview the compiled frontend:
npm run preview -w @cipherquiz/web
```

Vite preview serves static assets only; its development API proxy is not a production deployment configuration. A future host must route same-origin API requests appropriately. `npm run node -w @cipherquiz/contracts` starts an optional local chain; the tests start their own in-process chain. There are no deployment commands.

## Repository map

| Location              | Responsibility                                                    |
| --------------------- | ----------------------------------------------------------------- |
| `apps/web`            | React 19 / Vite preview, Wagmi provider, public disclaimer        |
| `apps/api`            | Fastify service, environment validation, PostgreSQL readiness     |
| `contracts`           | Hardhat 2, Solidity, FHEVM imports and local toolchain smoke test |
| `packages/shared`     | Public category types, disclaimer, health response contract       |
| `packages/blockchain` | Sepolia chain boundary; reserved SDK integration dependency       |
| `docs`                | Architecture, dependency decisions and verification record        |
| `scripts`             | Cross-platform development process launcher                       |

Internal packages export TypeScript source for Vite/tsx development. Their build commands emit declarations and JavaScript; the API build includes any referenced shared sources. Browser and API code use ESM; Hardhat 2 configuration uses CommonJS via its separate TypeScript project.

## Dependency policy

The npm lockfile records exact resolved versions. Zama dependencies are explicitly pinned to the reviewed versions; compatible version ranges for other tools are locked by `package-lock.json`. Use `npm ci` to reproduce the installation.

The current [official Zama SDK docs](https://docs.zama.org/protocol/sdk) recommend `@zama-fhe/sdk`. It is installed at the blockchain package boundary, with no fabricated adapter or SDK calls. The [official Hardhat template](https://github.com/zama-ai/fhevm-hardhat-template) still uses Hardhat 2 and a legacy relayer SDK peer dependency. That legacy package remains restricted to the contracts toolchain. See [dependency decisions](docs/dependencies.md) for the compatibility split.

## Security boundaries

Never commit `.env`, signing keys, decryption secrets or answer keys. All `VITE_*` values are public browser configuration. No plaintext answer keys belong in contract state, calldata, events, frontend assets or a public API. No sensitive question content has been created in Phase 1.

PostgreSQL is intended for public prompts, content versions and service metadata. Protected answer authoring and encrypted ingestion require a separately reviewed workflow; plaintext answers must never enter the public content pipeline or logs.

The wallet provider is configured for Sepolia but has no transaction UI. No tokens, deployed addresses or contract ABIs are invented. ERC-7984 compatibility and custom encrypted input/decryption APIs must be verified before their implementation.

## Next milestone

Design and validate a local encrypted-scoring proof of concept with dummy data, a reviewed round state machine and explicit ACL tests. Prove that unauthorized users cannot decrypt keys, answers or scores; then benchmark ten-question execution and decide timing and anti-replay rules. Staking and ERC-7984 settlement follow only after those boundaries are tested.

See [verification](docs/verification.md) for completed checks and remaining integration limits.
