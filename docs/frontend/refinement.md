# Frontend refinement handoff

This refines the existing React/Vite experience on `feat/cipherquiz-frontend`. Gameplay, shared categories, scoring, wallet integration, API routes and contract interfaces are preserved. No merge, force-push or deployment is part of this work. Unrelated uncommitted contract/blockchain/documentation work remains outside the frontend commits.

## What changed

- **Homepage:** a focused introduction, one primary Play Now action and one secondary How It Works action, plus an interactive trivia illustration. Removed the homepage category-card grid, repeated feature sections, payout tiers, closing CTA and decorative stat-like numerals. No prize-pool amounts, player counts or reward claims are shown.
- **Interactive illustration:** actual answer selection, immediate local feedback, keyboard radio controls and a next-question action, using public practice fixtures. It does not alter round history, stakes, wallet state or gameplay scores. Three sample questions cover geography, general knowledge and mathematics.
- **Dedicated guidance:** `/how-it-works` explains the three-step practice flow, confidentiality boundaries and illustrative credit tiers. Existing homepage anchors redirect to the appropriate dedicated routes.
- **Navigation:** Home (`/`), How It Works (`/how-it-works`), Play (`/dashboard`), Categories (`/categories`), Leaderboard (`/leaderboard`) and Profile (`/profile`) are available in consistent desktop and Radix mobile navigation. `/play` remains the existing active-quiz route. Wallet connection stays accessible, with an icon button on narrow screens.
- **Branding:** the actual supplied standalone PNG is integrated in navbar, footer and gameplay. The full image is unchanged; no screenshot-cropped or text replacement logo is used. Native PNG favicon sizes are derived from the mark in that approved standalone artwork. [Asset provenance and export](../../apps/web/public/brand/README.md).
- **Typography:** only Manrope and Space Grotesk are used. Removed Georgia, italics and the alternate serif treatment. Retained the major-third scale, normalized interface weights and reduced eyebrow tracking. Wallet address text inherits the interface family.

## Changed components

| Component / file                | Change                                                                                                     |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `Landing.tsx`                   | Reduced page structure, shorter copy, two hero actions, legacy-anchor redirects                            |
| `TriviaPreview.tsx`             | New self-contained, accessible interactive illustration                                                    |
| `HowItWorks.tsx`                | Dedicated practice/privacy/illustrative-return guidance                                                    |
| `Layout.tsx`                    | Consistent six-destination navigation, quieter wallet control, working footer links                        |
| `Logo.tsx`                      | Actual approved image in place of the text fallback                                                        |
| `Dashboard.tsx`                 | Replaced italic serif emphasis with the shared display treatment                                           |
| `Leaderboard.tsx`               | Updated privacy destination                                                                                |
| `App.tsx`                       | Added the guide route; retained all existing screen routes                                                 |
| `main.tsx`, `index.html`        | Approved favicon default, optional override reuse, two-font request and updated metadata                   |
| `tokens.css`, `styles/base.css` | Two-font typography and consistent weights                                                                 |
| `styles/landing.css`            | Simplified hero, layered quiz illustration and dedicated guide layout                                      |
| `styles/navigation.css`         | Approved image sizing and desktop/mobile navigation refinements                                            |
| `e2e/refinement.spec.ts`        | Navigation, interactive preview, branding provenance, favicon, typography and guide accessibility coverage |
| `e2e/experience.spec.ts`        | Updated homepage headline/CTA expectations; retained the full gameplay regression                          |

## Reference use

The owner supplied **CipherQuiz\_ Private Trivia Rewards.png** as visual direction and **CipherQuiz Geometric Security Logo.png** as the approved original branding. The first image is not used as page content or an asset source. Its embedded counts, rewards and claims are not adopted. The second image is copied byte-for-byte and used in the product. Its dark background and white lettering are preserved, so the lockup appears on its original dark plate within the light navigation.

Revisited [Mobbin](https://mobbin.com/), [Refero](https://refero.design/), [Magic UI Blur Fade](https://magicui.design/docs/components/blur-fade), [React Bits Stack](https://reactbits.dev/components/stack), [21st.dev](https://21st.dev/), [Typescale](https://typescale.com/) and [easings.net](https://easings.net/) for this refinement. The web reader still returns no text for Refero; the successful Chrome review and limits from the [original research record](design-research.md) remain applicable.

The existing Magic UI-inspired short reveal pattern is reused. React Bits' layered-card idea informed the interactive illustration's restrained depth; drag/throw physics were omitted to keep answer controls predictable. The shadcn/Radix foundations and Lucide remain in use. The scale and easeOutCubic tokens are retained. No additional component or animation library was installed.

## Verification and screenshots

The original verified frontend was checkpointed, pushed and verified at `e901b46e07217a4dfaab2cdba08ae1101d952ba6` before refinement. The refinement's final commit and remote verification are reported in the delivery message.

The full repository build, typecheck, lint, format check and tests are run for this change. The browser regression covers widths **320, 375, 390, 428, 768, 1024 and 1440px**. Two additional browser tests verify all six navigation destinations, old-anchor recovery, sample answers, keyboard control, the approved image SHA-256, favicon loading, the two-font limit and axe checks on the homepage/guide at 390 and 1440px. The existing injected-wallet state tests are retained.

| Review            | Mobile                                    | Desktop                                     |
| ----------------- | ----------------------------------------- | ------------------------------------------- |
| Refined homepage  | [390px](screenshots/landing-390.png)      | [1440px](screenshots/landing-1440.png)      |
| How It Works      | [390px](screenshots/how-it-works-390.png) | [1440px](screenshots/how-it-works-1440.png) |
| Existing gameplay | [390px](screenshots/quiz-390.png)         | [1440px](screenshots/quiz-1440.png)         |

Other screen captures are linked in [the frontend README](README.md#review-screenshots).

## Preview and remaining integration limits

Run `npm.cmd run dev:web` from the repository root, then open http://127.0.0.1:5173. Browser tests use local Google Chrome: `npm.cmd run test:e2e -w @cipherquiz/web`.

The approved logo is integrated. A separate transparent/vector or light-background lockup was not provided; the source PNG's dark treatment remains intentional. Native artwork files are not claimed to be vector.

Practice stakes, reveal and returns remain explicit simulations; live encrypted scoring, confidential staking and settlement are still not integrated. Fictional leaderboard data stays labelled. Physical devices, Safari, Firefox, assistive-technology interaction and real Sepolia transactions remain unverified. These existing integration limits do not prevent using the refined practice frontend.
