<div align="center">
  <img src="./public/randomander.svg" width="112" height="112" alt="Randomander logo">

  # Randomander

  **Find a Commander deck worth building.**

  Random Commander inspiration, compatible pairings, and three-card sparks—powered by Scryfall, with optional outbound EDHREC inspiration.

  [![CI](https://github.com/kmcgarry1/randomander/actions/workflows/ci.yaml/badge.svg)](https://github.com/kmcgarry1/randomander/actions/workflows/ci.yaml)
</div>

Randomander is a responsive browser app for discovering unusual Magic: The Gathering Commander ideas. Pick a draw mode, narrow the card pool, reveal a result, and use the deck-inspiration panel to move from a random card to a build direction.

There is no account or project backend. Preferences, history, and saved pulls stay in the browser that created them. New draws require network access to Scryfall. The public build does not automate EDHREC requests; validated EDHREC links open only when a user chooses them.

## Contents

- [What it does](#what-it-does)
- [Getting started](#getting-started)
- [Using Randomander](#using-randomander)
- [Development](#development)
- [Project structure](#project-structure)
- [Data, privacy, and external services](#data-privacy-and-external-services)
- [Documentation](#documentation)
- [Contributing](#contributing)

## What it does

| Area | Capability |
| --- | --- |
| Draw modes | Find one commander, a compatible partner/background pair, or a three-card creative spark. |
| Choice mode | Compare two commanders or two partner-pair options in one draw. |
| Card filters | Focus on selected colors, mode-aware color-count limits, less-common commanders, or ranked results outside EDHREC's top 10%. |
| Pairing rules | Supports Partner, Partner with, Friends forever, Choose a Background, Background cards, and Doctor's companion. |
| Double-faced cards | Adds an accessible front/back control to transforming and modal double-faced results. |
| Deck inspiration | Shows card or pair profiles, color identities, a compact marketplace price, Scryfall links, and validated outbound EDHREC links after reveal. |
| Personal library | Stores up to 40 recent pulls and 40 saved pulls in local browser storage. |
| Display controls | Offers system/light/dark themes, a Cardmarket/TCGplayer/Cardhoarder price selector, optional card reveals and ambient art, and reduced-motion/low-power controls. |
| Responsive UI | Uses a compact, collapsible draw-mode card and fixed primary action/navigation on small screens. |

### Draw modes

- **Commander** draws one Commander-legal commander. Choice mode can return two separate options, and eligible cards can request a compatible partner or Background afterward.
- **Partner pair** builds a legal two-card pairing using the supported partner-style mechanics. Choose a Background commanders are resolved with a legendary Background.
- **3-card spark** draws three Commander-legal cards as a creative prompt and makes a best-effort retry when Scryfall repeats a card. It can exclude Game Changers. Choice mode and popularity filters are intentionally unavailable here.

Randomander uses Scryfall's live card data and legality/search syntax. Results are exploratory suggestions, not decklists or rules-engine validation.

## Getting started

### Prerequisites

- Node.js `^22.12.0` or `^24.0.0` and npm. GitHub Actions verifies both supported LTS lines; `.nvmrc` selects Node.js 24 for local development.
- Chrome/Edge 112+, Firefox 112+, or Safari/iOS Safari 16.4+, with JavaScript enabled. Browser storage is optional for drawing but required for durable settings, History, and Saved pulls.
- Network access to install packages and load live card data.

No API keys or environment variables are required.

### Run locally

```bash
git clone https://github.com/kmcgarry1/randomander.git
cd randomander
npm ci
npm run dev
```

Vite prints the local URL, normally `http://localhost:5173`. Open it in a browser and press **Randomize**.

The production bundle targets ES2020. CI exercises Playwright's current Chromium, Firefox, and WebKit engines on desktop, Chromium and WebKit phone emulation, and exact 320/375/390 CSS-pixel evidence at normal and 200% root text size; the release checklist adds physical iOS Safari and Android Chrome checks because automation does not prove device-specific behavior.

### Production build

```bash
npm run build
npm run preview
```

The compiled static site is written to `dist/`. The canonical production deployment is <https://randomander.vercel.app/>; `vercel.json` and the [deployment guide](docs/deployment.md) define hosting, headers, preview promotion, smoke checks, and rollback.

## Using Randomander

A normal session follows five steps:

1. Choose **Commander**, **Partner pair**, or **3-card spark**.
2. Open **Filters** to set color, popularity, choice, or Spark-specific constraints.
3. Press **Randomize** and wait for the live Scryfall result.
4. Complete or skip the reveal, then inspect the result and deck-inspiration details.
5. Save a non-choice pull directly, save a choice pull from History, or randomize again.

On mobile, use **Show** and **Hide** on the Draw mode card to reclaim vertical space. The Randomize action and primary navigation remain within easy reach near the bottom of the viewport.

### Filter behavior

| Filter | Commander | Partner pair | 3-card spark | Notes |
| --- | :---: | :---: | :---: | --- |
| Color focus | ✓ | ✓ | ✓ | Choose W/U/B/R/G or colorless; comparison mode controls subset versus exact querying. |
| Up to / Exactly | ✓ | Partial | Partial | Exact identity is strict for a single Commander; pair and Spark workflows use maximum-style combined/palette limits. |
| Color count | ✓ | ✓ | ✓ | Any or 0–5 colors. Pair mode checks a combined ceiling; Spark chooses a palette up to the count. |
| EDHREC deck threshold | — | — | — | Hidden in the public build because automated EDHREC requests are disabled. |
| Skip top 10% | ✓ | ✓ | — | Samples ranked search results after skipping the leading 10%. |
| Choice mode | ✓ | ✓ | — | Returns two independent result groups. |
| Exclude Game Changers | — | — | ✓ | Applies only to Spark draws. |

Some combinations describe a very small or empty card pool. Randomander tries a bounded number of candidates rather than searching indefinitely; relax one or more filters if a draw cannot be completed.

### Reveal and deck inspiration

The optional card-back reveal is presentation-only. Use **Skip reveal** or press <kbd>Escape</kbd> to show the result immediately. Disabling the reveal or enabling reduced motion in Settings also shortens the path to the result.

Deck inspiration appears after the result is visible. When choice mode is active, each choice has its own body section and card/pair links. Public builds make no automated EDHREC metadata request; an EDHREC destination opens in a new tab only after the user activates its validated link.

Each card can show one compact Scryfall-supplied marketplace estimate for its exact printing. Cardmarket/EUR is the default; Settings can switch to TCGplayer/USD or Cardhoarder/tix. Prices are snapshots from the card response, not live checkout quotes, and are omitted when unavailable.

For a complete walkthrough, see the [User guide](docs/user-guide.md).

## Development

### Commands

| Command | Purpose |
| --- | --- |
| `npm ci` | Install the exact locked dependencies and configure the Husky hooks. |
| `npm install` | Intentionally update dependency declarations or the lockfile. |
| `npm run dev` | Start the Vite development server. |
| `npm run test` | Run the Vitest suite once in jsdom. |
| `npm run test:watch` | Re-run relevant tests while files change. |
| `npm run typecheck:test` | Type-check unit tests, E2E specs, fixtures, and test configuration. |
| `npm run test:coverage` | Run the risk-scoped Vitest coverage gate and create `coverage/`. |
| `npm run test:e2e` | Run the mocked release suite across the desktop and phone browser matrix. |
| `npm run test:e2e:headed` | Run the same Playwright suite with visible browser windows. |
| `npm run build` | Type-check, create the Vite production bundle, and enforce gzip asset budgets. |
| `npm run preview` | Serve the latest production bundle locally. |

There is currently no separate lint or formatting script. Test-source and production TypeScript compilation, risk-based coverage, mocked real-browser E2E, and a production build are automated quality gates.

### Technology

- Vue 3 single-file components with `<script setup>` and TypeScript
- Pinia for application, result, and persisted UI state
- Vite for development and production builds
- Tailwind CSS 4 plus a small shared Material 3-inspired token/component layer
- Vitest, jsdom, and Testing Library for unit and integration behavior tests
- Playwright and axe-core for mocked real-browser journeys and accessibility scans
- Heroicons for interface icons
- Vercel Analytics behind a release-policy gate; the 1.0 candidate keeps it disabled and out of the production bundle

### Verification

Before opening a pull request, run:

```bash
npm run test
npm run typecheck:test
npm run test:coverage
npm run test:e2e
npm run build
```

The pre-push hook runs the build. CI repeats tests, test-source type-checking, coverage, E2E, and the build on the supported Node/browser matrix for pull requests targeting `main`. See [Testing and release evidence](docs/testing.md) for the browser matrix, mock-only contract, coverage policy, and artifacts.

## Project structure

```text
randomander/
├── .github/workflows/       # GitHub Actions checks
├── docs/                    # User, architecture, and support documentation
├── e2e/                     # Mocked real-browser release journeys and fixtures
├── public/                  # Static brand assets
├── src/
│   ├── app/                 # Responsive shell, navigation, and panels
│   ├── components/          # Shared layout and MTG presentation components
│   ├── composables/         # Shared theme and modal-focus behavior
│   ├── features/
│   │   ├── draw/            # Draw orchestration, reveal, choices, and details
│   │   ├── history/         # Recent-pull panel
│   │   ├── saved/           # Saved-pull panel
│   │   └── settings/        # Appearance, prices, performance, and cache controls
│   ├── lib/                 # Card helpers, storage, and persistent cache
│   ├── services/            # Scryfall, EDHREC, and HTTP adapters
│   ├── stores/              # Pinia application/domain store
│   └── __tests__/           # Integration, component, helper, and service tests
├── CONTRIBUTING.md
└── package.json
```

`AppShell.vue` always hosts the Draw experience. History, Saved, Settings, and Filters are modal surfaces rather than URL routes. `src/stores/randomander.ts` is the application core: it owns the draw pipelines, compatibility rules, history/saved records, metadata scheduling, and persistence in addition to reactive state.

Read [Architecture](docs/architecture.md) before changing draw behavior or persistence contracts.

## Data, privacy, and external services

Randomander has no repository-owned API server and does not require a login. It does make requests to third-party services:

| Service | Used for |
| --- | --- |
| [Scryfall](https://scryfall.com/docs/api) | Random/search/exact card data, legality, images, mana-symbol assets, marketplace price estimates, and purchase links. |
| [EDHREC](https://edhrec.com/) | User-initiated outbound commander and pair inspiration links. Automated metadata requests are disabled in the public build. |
| [Vercel Analytics](https://vercel.com/docs/analytics/privacy-policy) | Available as an optional dependency, but disabled and excluded by the 1.0 production policy pending an owner-approved privacy decision. |

The UI uses system fonts and does not make a third-party font request. See the in-app [privacy notice](public/privacy.html) for retention, service, and user-choice details.

Browser storage separates durable concerns so one tab or preference update does not rewrite unrelated collections:

- `randomander:state:v3:preferences` stores mode, options, display/performance/cache settings (including the price marketplace), theme, and the restorable support panel;
- `randomander:state:v3:history` and `randomander:state:v3:saved` store their compact, bounded record collections independently;
- `randomander:cache:v1` stores eligible HTTP responses subject to the configured TTL, entry, and byte limits.

An existing `randomander:state:v2` payload is runtime-validated, projected into all three v3 partitions, and removed only after every partition is durable. Preference writes are coalesced; History and Saved mutations flush immediately. Same-origin tabs reconcile each partition deterministically, with last-write-wins behavior for simultaneous edits to the same partition.

The default response-cache settings are 24 hours and 120 entries, with a 1.5 MB serialized byte ceiling. Random Scryfall draws are live requests; in the public build, persistent caching primarily benefits exact-name Scryfall lookups. Clearing the network cache does not clear settings, history, or saved pulls.

Do not describe the app as offline-first: previously stored state remains available without a network, but new random draws require Scryfall.

## Documentation

- [1.0 release-readiness review](docs/release-1.0-readiness-review.md) — cross-functional sign-off, release gates, and paste-ready GitHub issue backlog
- [1.0 remediation status](docs/release-1.0-remediation-status.md) — current R10 evidence, hosted/manual boundaries, and remaining owner blockers
- [User guide](docs/user-guide.md) — modes, filters, pair mechanics, choices, history, saved pulls, and settings
- [Architecture](docs/architecture.md) — runtime topology, state, draw pipelines, integrations, persistence, and testing boundaries
- [Testing and release evidence](docs/testing.md) — commands, browser matrix, mock-only contracts, coverage floors, and CI artifacts
- [Troubleshooting](docs/troubleshooting.md) — local setup, browser storage, upstream service, test, and build issues
- [Deployment and rollback](docs/deployment.md) — canonical environments, headers, promotion smoke, and recovery
- [Operations runbook](docs/operations-runbook.md) — synthetic monitoring, upstream triage, privacy-safe incidents, and rollback triggers
- [Release evidence](docs/release-evidence.md) — hosted controls, deployment state, and commands/artifacts required for sign-off
- [Legal and service review](docs/legal-service-review.md) — sourced Scryfall, EDHREC, fan-content, privacy, and licensing decisions
- [Security policy](SECURITY.md) — supported versions and private vulnerability reporting
- [Support policy](SUPPORT.md) — issue routing, support boundaries, and safe diagnostic information
- [Privacy notice](public/privacy.html) — local data, disabled 1.0 analytics policy, external requests, and retention
- [Contributing](CONTRIBUTING.md) — workflow, conventions, verification, accessibility, and pull-request expectations
- [Vision and goals](VISION.md) — product intent and current direction
- [Collaboration guide](COLLABORATION.md) — repository-specific coordination notes
- [Agent instructions](AGENTS.md) — additional rules for AI-assisted contributions
- [Original mobile UI plan](docs/mobile-ui-apple-plan.md) — historical design-planning context, not the current product specification

## Contributing

Issues and focused pull requests are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md), include tests for behavior changes, and verify both a narrow mobile viewport and a desktop layout for UI work.

Use the [structured issue forms](https://github.com/kmcgarry1/randomander/issues/new/choose) for bugs, accessibility barriers, feature requests, and documentation problems. When reporting a bug, include the mode, active filters, browser/OS, exact reproduction steps, and any visible error. Avoid posting the contents of local storage if a saved pull contains information you do not want to share. Suspected vulnerabilities belong in the [private reporting flow](https://github.com/kmcgarry1/randomander/security/advisories/new), never a public issue.

## Project status and boundaries

Randomander is an evolving personal project. Its current scope is inspiration and discovery. It does not build complete decks, authenticate users, sync between devices, export lists, or automate EDHREC metadata in the public build.

No license file is currently included. Until one is added, the repository's source is not offered under a general open-source license.

Magic: The Gathering is a trademark of Wizards of the Coast. Randomander is unofficial Fan Content and is not approved or endorsed by Wizards. Card information and images are supplied through Scryfall; optional inspiration links point to EDHREC. Their respective terms and policies apply.
