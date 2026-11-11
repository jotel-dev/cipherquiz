# CipherQuiz frontend

Implemented locally on `feat/cipherquiz-frontend`. No deployment, push, merge or smart-contract source changes. Uncommitted work that already existed in the contract, blockchain and documentation directories was preserved.

## Preview

From the repository root on Windows:

```powershell
npm.cmd run dev:web
```

Open http://127.0.0.1:5173. The frontend works without the API. Start the API separately with `npm.cmd run dev:api` to enable its existing liveness status. API failures show an offline status and retry action; they do not block local practice.

Follow **Play now → Start a practice round → choose a category → Set up your round**. Choose 10, 25 or 50 practice credits, select a timer, acknowledge practice mode, and start. Answer or skip ten questions, reveal the result, then open history. A perfect 25-credit practice round returns 50 illustrative credits, including the original stake.

## Screens and behavior

| Route / surface                 | Implemented behavior                                                                                                                                                                   |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                             | Editorial landing page, responsive navigation, illustrated concept placeholder, category previews, how it works, privacy explanation, proposed payout tiers, exact required disclaimer |
| `/dashboard`                    | Playroom, start action, real statistics from the current practice session, category shortcuts, recent rounds and first-use empty state                                                 |
| `/categories`                   | Four shared categories, accessible radio selection, query-string preselection                                                                                                          |
| Round setup dialog              | Practice stake, 30-second / 60-second / untimed choices, tier calculations, required acknowledgment, no transaction or signature                                                       |
| `/play`                         | Ten questions per category, answer selection, lock-in, skip, deadline-based timer, progress, sticky mobile round controls, timeout announcements, explicit leave confirmation          |
| `/results`                      | Sealed practice result, simulated reveal, score, accuracy, illustrative total return, transparent settlement status, answer review, no-result recovery                                 |
| `/leaderboard`                  | Labelled fictional players, category and period filters, responsive ranking table                                                                                                      |
| `/profile`                      | Session display-name editing, wallet state, history filtering, per-round results, clear-history confirmation                                                                           |
| Wallet dialog                   | Existing injected-wallet/Wagmi integration, pending request, rejected request with retry, missing wallet, connected address, copy feedback, wrong chain, switch to Sepolia, disconnect |
| Unknown route / rendering error | Recovery page / reload action                                                                                                                                                          |

## What is real and what is simulated

- **Real:** React interactions, scoring against public practice fixtures, timer deadlines, session statistics, navigation, wallet permission requests and network switching, existing API liveness endpoint.
- **Simulated:** stakes, encrypted-result presentation and reveal, credit returns, settlement status, leaderboard players. The reveal explicitly says it is not encrypted. No fake transaction hashes or explorer claims are produced.
- **Not integrated:** deployed scoring-contract calls, generic FHE input encryption and player decryption, authoritative onchain deadlines, token approvals, confidential staking, reserve checks, reward claims and settlement. The existing contract and blockchain package interfaces were not changed.
- **Data lifetime:** practice answers, scores, history and display names stay in React memory for this tab's current runtime. Reloading clears them. No answer or decrypted-score persistence, analytics or server-side answer oracle was added. The existing wallet library retains its own connection state.
- The public practice answer bank must never become the source for real-money or confidential rounds. A future production bank needs the protected authoring boundary described in the existing architecture documents.

## Design and maintainability

`src/tokens.css` owns the light palette, type scale, spacing, radii, shadows and motion. `styles.css` imports the base, landing, application and responsive refinement styles. Page components are separate from reusable UI, typed practice data and the practice state/model.

Local shadcn/ui Button and Dialog adaptations use Radix primitives and the existing CSS tokens. Radio groups and progress also use Radix. Lucide provides all interface iconography. No animation framework or redundant component suite was installed. [Design research and decisions](design-research.md) records the resources actually inspected, limitations, adopted patterns and rejected effects.

Manrope is used for interface/body text, Space Grotesk for display headings and scores, with Georgia italic for a few editorial emphasis words. Google Fonts uses preconnect and `display=swap`, with local/system fallbacks. The base scale is 16px × 1.25, with fluid headings and optical label sizes. Motion honors `prefers-reduced-motion`; gameplay never waits for a reveal animation.

## Approved artwork handoff

No approved logo asset existed in the repository. `Logo.tsx` consistently renders the CipherQuiz wordmark and accepts an approved image URL. It does not invent a replacement C/question-mark/shield mark.

When owner-approved files are supplied, place them in `apps/web/public/brand/` and set the public values documented in `apps/web/.env.example`:

```dotenv
VITE_APPROVED_LOGO_URL=/brand/cipherquiz.svg
VITE_APPROVED_FAVICON_URL=/brand/favicon.svg
```

The logo component then uses the asset in navigation/footer/gameplay and `main.tsx` attaches the approved favicon. No placeholder favicon is shipped. The homepage hero is a deliberately labelled CSS concept composition, ready to be replaced by an approved illustration; it uses no downloaded stock art.

## Validation

| Check                                     | Result                                                                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `npm.cmd run build`                       | Passed across shared, blockchain, API, web and contracts; local compilation only                              |
| `npm.cmd run typecheck`                   | Passed across all workspaces, including the existing integration harness                                      |
| `npm.cmd run lint`                        | Passed, including Solidity lint                                                                               |
| `npm.cmd run format:check`                | Run at the repository root; frontend and new documentation formatted with the existing Prettier configuration |
| `npm.cmd test`                            | Passed: 3 API, 4 frontend model, 4 blockchain guard, 14 local contract tests                                  |
| `npm.cmd run test:e2e -w @cipherquiz/web` | Passed: 10 Chrome browser tests                                                                               |

Browser coverage includes complete ten-question gameplay at **320, 375, 390, 428, 768, 1024 and 1440px**, layout overflow assertions on the primary screens, 44px minimum quiz-answer touch targets, dialog Escape/focus restoration, profile editing, leaderboard filtering, zero-score timeout/skip behavior, API recovery and controlled EIP-1193 wallet states. Axe checks WCAG A/AA rules on primary screens at 390 and 1440px, plus the connected wallet dialog. Reported contrast violations and a completion-navigation race were fixed before the clean passing run.

Unverified: physical phones/tablets, Safari, Firefox, screen-reader interaction, slow real mobile hardware, real wallet extensions and actual Sepolia RPC/FHE transactions. No live blockchain test or deployment was attempted. Automated axe checks are not a full accessibility certification. The production JS bundle is approximately 493 kB before gzip / 157 kB gzip; CSS is approximately 51 kB / 11 kB gzip.

Reproduce browser tests with locally installed Google Chrome, or change the Playwright `channel` for an available browser. The config reuses a running Vite server or starts one. Screenshots are regenerated by the browser tests. Generated traces and external design-review captures are ignored by Git, ESLint and Prettier.

## Review screenshots

| Screen                      | 390px                                       | 1440px                                        |
| --------------------------- | ------------------------------------------- | --------------------------------------------- |
| Landing                     | [Mobile](screenshots/landing-390.png)       | [Desktop](screenshots/landing-1440.png)       |
| Playroom                    | [Mobile](screenshots/dashboard-390.png)     | [Desktop](screenshots/dashboard-1440.png)     |
| Categories                  | [Mobile](screenshots/categories-390.png)    | [Desktop](screenshots/categories-1440.png)    |
| Round setup                 | [Mobile](screenshots/stake-390.png)         | [Desktop](screenshots/stake-1440.png)         |
| Quiz                        | [Mobile](screenshots/quiz-390.png)          | [Desktop](screenshots/quiz-1440.png)          |
| Sealed practice result      | [Mobile](screenshots/sealed-result-390.png) | [Desktop](screenshots/sealed-result-1440.png) |
| Revealed result             | [Mobile](screenshots/results-390.png)       | [Desktop](screenshots/results-1440.png)       |
| Profile / history           | [Mobile](screenshots/profile-390.png)       | [Desktop](screenshots/profile-1440.png)       |
| Wallet absence              | [Mobile](screenshots/wallet-390.png)        | [Desktop](screenshots/wallet-1440.png)        |
| Filtered sample leaderboard | [Mobile](screenshots/leaderboard-390.png)   | [Desktop](screenshots/leaderboard-1440.png)   |

> This project is not audited, endorsed or operated by Zama. Use at your own risk.
