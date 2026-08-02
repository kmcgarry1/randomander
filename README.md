<div align="center">
  <img src="./public/randomander.svg" width="112" height="112" alt="Randomander logo">

  # Randomander

  **Find a Commander deck worth building.**

  Random Commander inspiration, compatible pairings, and three-card sparks—powered by Scryfall and enriched with EDHREC.

  [![CI](https://github.com/kmcgarry1/randomander/actions/workflows/ci.yaml/badge.svg)](https://github.com/kmcgarry1/randomander/actions/workflows/ci.yaml)
</div>

Randomander is a responsive browser app for discovering unusual Magic: The Gathering Commander ideas. Pick a draw mode, narrow the card pool, reveal a result, and use the deck-inspiration panel to move from a random card to a build direction.

There is no account or project backend. Preferences, history, and saved pulls stay in the browser that created them. New draws still require network access to Scryfall, and optional deck metadata comes from EDHREC.

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
| Deck inspiration | Shows card or pair profiles, color identities, a compact marketplace price, available deck counts, links, and up to four EDHREC themes after reveal. |
| Personal library | Keeps up to 40 recent pulls and 40 saved pulls in local browser storage. |
| Display controls | Offers system/light/dark themes, a Cardmarket/TCGplayer/Cardhoarder price selector, optional card reveals and ambient art, and reduced-motion/low-power controls. |
| Responsive UI | Uses a compact, collapsible draw-mode card and fixed primary action/navigation on small screens. |

### Draw modes

- **Commander** draws one Commander-legal commander. Choice mode can return two separate options, and eligible cards can request a compatible partner or Background afterward.
- **Partner pair** builds a legal two-card pairing using the supported partner-style mechanics. Choose a Background commanders are resolved with a legendary Background.
- **3-card spark** draws three Commander-legal cards as a creative prompt and makes a best-effort retry when Scryfall repeats a card. It can exclude Game Changers. Choice mode and popularity filters are intentionally unavailable here.

Randomander uses Scryfall's live card data and legality/search syntax. Results are exploratory suggestions, not decklists or rules-engine validation.

## Getting started

### Prerequisites

- Node.js `^20.19.0` or `>=22.12.0` and npm, as required by the installed Vite toolchain. GitHub Actions currently verifies the project with Node.js 20.
- A modern browser with JavaScript and local storage enabled.
- Network access to install packages and load live card data.

No API keys or environment variables are required.

### Run locally

```bash
git clone https://github.com/kmcgarry1/randomander.git
cd randomander
npm install
npm run dev
```

Vite prints the local URL, normally `http://localhost:5173`. Open it in a browser and press **Randomize**.

### Production build

```bash
npm run build
npm run preview
```

The compiled static site is written to `dist/`. The repository does not currently prescribe a hosting provider or deployment configuration.

## Using Randomander

A normal session follows five steps:

1. Choose **Commander**, **Partner pair**, or **3-card spark**.
2. Open **Filters** to set color, popularity, choice, or Spark-specific constraints.
3. Press **Randomize** and wait for the live Scryfall result.
4. Complete or skip the reveal, then inspect the result and deck-inspiration details.
5. Keep a non-choice pull directly, save a choice pull from History, or randomize again.

On mobile, use **Show** and **Hide** on the Draw mode card to reclaim vertical space. The Randomize action and primary navigation remain within easy reach near the bottom of the viewport.

### Filter behavior

| Filter | Commander | Partner pair | 3-card spark | Notes |
| --- | :---: | :---: | :---: | --- |
| Color focus | ✓ | ✓ | ✓ | Choose W/U/B/R/G or colorless; comparison mode controls subset versus exact querying. |
| Up to / Exactly | ✓ | Partial | Partial | Exact identity is strict for a single Commander; pair and Spark workflows use maximum-style combined/palette limits. |
| Color count | ✓ | ✓ | ✓ | Any or 0–5 colors. Pair mode checks a combined ceiling; Spark chooses a palette up to the count. |
| EDHREC deck threshold | ✓ | ✓ | — | Accepts commanders whose reported count is below the configured maximum. |
| Skip top 10% | ✓ | ✓ | — | Samples ranked search results after skipping the leading 10%. |
| Choice mode | ✓ | ✓ | — | Returns two independent result groups. |
| Exclude Game Changers | — | — | ✓ | Applies only to Spark draws. |

Some combinations describe a very small or empty card pool. Randomander tries a bounded number of candidates rather than searching indefinitely; relax one or more filters if a draw cannot be completed.

### Reveal and deck inspiration

The optional card-back reveal is presentation-only. Use **Skip reveal** or press <kbd>Escape</kbd> to show the result immediately. Disabling the reveal or enabling reduced motion in Settings also shortens the path to the result.

Deck inspiration loads after the result is visible, so metadata traffic does not block the reveal. When choice mode is active, each choice has its own body section and its own card/pair metadata. EDHREC data can be absent when no matching page or theme data is available; that does not invalidate the Scryfall result.

Each card can show one compact Scryfall-supplied marketplace estimate for its exact printing. Cardmarket/EUR is the default; Settings can switch to TCGplayer/USD or Cardhoarder/tix. Prices are snapshots from the card response, not live checkout quotes, and are omitted when unavailable.

For a complete walkthrough, see the [User guide](docs/user-guide.md).

## Development

### Commands

| Command | Purpose |
| --- | --- |
| `npm install` | Install dependencies and configure the Husky hooks. |
| `npm run dev` | Start the Vite development server. |
| `npm run test` | Run the Vitest suite once in jsdom. |
| `npm run test:watch` | Re-run relevant tests while files change. |
| `npm run build` | Type-check with `vue-tsc`, then create the Vite production bundle. |
| `npm run preview` | Serve the latest production bundle locally. |

There is currently no separate lint or formatting script. TypeScript compilation, the test suite, and a production build are the repository's automated quality gates.

### Technology

- Vue 3 single-file components with `<script setup>` and TypeScript
- Pinia for application, result, and persisted UI state
- Vite for development and production builds
- Tailwind CSS 4 plus a small shared Material 3-inspired token/component layer
- Vitest, jsdom, and Testing Library for automated behavior tests
- Heroicons for interface icons
- Vercel Analytics for deployed usage analytics

### Verification

Before opening a pull request, run:

```bash
npm run test
npm run build
```

The pre-push hook runs the build. CI repeats tests and the build for pull requests targeting `main`. See [Troubleshooting](docs/troubleshooting.md) if local tests fail under a newer experimental Node.js local-storage implementation.

## Project structure

```text
randomander/
├── .github/workflows/       # GitHub Actions checks
├── docs/                    # User, architecture, and support documentation
├── public/                  # Static brand assets
├── src/
│   ├── app/                 # Responsive shell, navigation, and panels
│   ├── components/          # Shared layout and MTG presentation components
│   ├── composables/         # Shared theme and modal-focus behavior
│   ├── features/
│   │   ├── draw/            # Draw orchestration, reveal, choices, and details
│   │   ├── history/         # Recent-pull panel
│   │   ├── saved/           # Kept-pull panel
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
| [EDHREC](https://edhrec.com/) | Optional commander/pair deck counts, themes, and outbound inspiration links. |
| Google Fonts | The Google Sans Flex web font loaded by the stylesheet. |
| Vercel Analytics | Analytics initialized by the client application. |

Browser storage is split into two keys:

- `randomander:state:v2` stores mode, options, display/performance/cache settings (including the price marketplace), theme, history, and saved pulls.
- `randomander:cache:v1` stores eligible HTTP responses subject to the configured TTL and entry limit.

The default response-cache settings are 24 hours and 120 entries. Random Scryfall draws are live requests; persistent caching primarily benefits EDHREC metadata and exact-name card lookups. Clearing the network cache does not clear settings, history, or saved pulls.

Do not describe the app as offline-first: previously stored state remains available without a network, but new random draws require Scryfall and uncached metadata requires EDHREC.

## Documentation

- [User guide](docs/user-guide.md) — modes, filters, pair mechanics, choices, history, saved pulls, and settings
- [Architecture](docs/architecture.md) — runtime topology, state, draw pipelines, integrations, persistence, and testing boundaries
- [Troubleshooting](docs/troubleshooting.md) — local setup, browser storage, upstream service, test, and build issues
- [Contributing](CONTRIBUTING.md) — workflow, conventions, verification, accessibility, and pull-request expectations
- [Vision and goals](VISION.md) — product intent and current direction
- [Collaboration guide](COLLABORATION.md) — repository-specific coordination notes
- [Agent instructions](AGENTS.md) — additional rules for AI-assisted contributions
- [Original mobile UI plan](docs/mobile-ui-apple-plan.md) — historical design-planning context, not the current product specification

## Contributing

Issues and focused pull requests are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md), include tests for behavior changes, and verify both a narrow mobile viewport and a desktop layout for UI work.

When reporting a bug, include the mode, active filters, browser/OS, exact reproduction steps, and any visible error. Avoid posting the contents of local storage if a saved pull contains information you do not want to share.

## Project status and boundaries

Randomander is an evolving personal project. Its current scope is inspiration and discovery. It does not build complete decks, authenticate users, sync between devices, export lists, or guarantee EDHREC metadata for every result.

No license file is currently included. Until one is added, the repository's source is not offered under a general open-source license.

Magic: The Gathering is a trademark of Wizards of the Coast. Randomander is unofficial Fan Content and is not approved or endorsed by Wizards. Card information and images are supplied through Scryfall; deck metadata and links are supplied by EDHREC. Their respective terms and policies apply.
