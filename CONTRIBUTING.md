# Contributing to Randomander

Thanks for helping improve Randomander. Focused bug fixes, accessibility improvements, tests, documentation, and carefully scoped product changes are all useful.

Before starting, read the [README](README.md) for product scope and [Architecture](docs/architecture.md) for the current ownership and data-flow boundaries. AI-assisted contributors must also follow [AGENTS.md](AGENTS.md).

## Before opening an issue

Search existing GitHub issues and confirm the behavior on the latest `main` branch when practical.

For a bug report, include:

- the browser and operating system;
- viewport or device when layout is involved;
- draw mode and every active filter;
- exact steps to reproduce;
- expected and actual behavior;
- visible error text;
- relevant console/network errors, with personal data removed;
- a screenshot or short recording when it adds information.

Do not paste full `localStorage` records into a public issue. History and Saved records contain complete card payload snapshots and may reveal a personal collection of ideas.

For a feature request, explain the user problem before proposing an implementation. Randomander's current scope is Commander inspiration, not full deck construction or account/sync infrastructure.

## Development environment

Installed Vite tooling requires Node.js `^20.19.0` or `>=22.12.0`. CI currently uses Node.js 20; for local development, prefer a maintained Vite-compatible release such as Node.js 22.12+ or 24. npm ships with Node.

No API key, `.env` file, local database, or application server is required. The browser makes direct requests to Scryfall and EDHREC.

### First setup

```bash
git clone https://github.com/kmcgarry1/randomander.git
cd randomander
npm ci
npm run dev
```

Use `npm install` instead of `npm ci` when intentionally updating dependency declarations or the lockfile.

The install runs the repository's Husky setup. The pre-push hook performs `npm run build`; it does not run the test suite for you.

### Useful commands

```bash
# Development server
npm run dev

# Expose the server to a phone/tablet on the same network
npm run dev -- --host

# Complete test suite
npm run test

# Watch tests
npm run test:watch

# One test file
npm run test -- src/__tests__/App.test.ts

# One named test
npm run test -- src/__tests__/App.test.ts -t "test name"

# Type-check application code and build production assets
npm run build

# Serve the completed production build
npm run preview
```

There are no standalone lint, format, typecheck, coverage, or deployment scripts at present. Do not report an unconfigured command as a completed check.

## Branch and commit workflow

1. Branch from an up-to-date `main`.
2. Use a descriptive branch such as `fix/background-pairing` or `feat/mobile-draw-controls`.
3. Keep each change focused; avoid drive-by refactors or reformatting unrelated files.
4. Add tests and docs with the behavior they describe.
5. Run the relevant targeted tests while developing.
6. Run the full suite and build before pushing.
7. Open a pull request against `main` and complete the template.

Feature branches receive GitHub Actions checks through pull requests targeting `main`. Direct push checks are configured for `main` and `fix/*`.

Use commits that explain an outcome, for example:

```text
fix: pair background-first draws with eligible commanders
docs: document cache and upstream failure behavior
```

The repository does not enforce a commit-message specification, so clarity and a reviewable scope matter more than a particular prefix.

## Code conventions

- Use Vue 3 Composition API with `<script setup lang="ts">`.
- Keep TypeScript strict and avoid `any` when a domain type or `unknown` check is possible.
- Use relative imports within `src`.
- Keep view-specific components and composables under their feature.
- Put shared card classification, formatting, and slug behavior in `src/lib`.
- Put network endpoints, pacing, and response parsing in `src/services`.
- Treat `src/stores/randomander.ts` as the current workflow/domain boundary; do not duplicate draw orchestration in components.
- Prefer existing Tailwind utilities and Material-inspired shared classes.
- Reserve `src/style.css` for design tokens, genuinely shared component classes, and global motion behavior.
- Reuse Heroicons and the existing MTG presentation components instead of introducing a second icon or mana-symbol system.
- Keep visible copy direct and concise. One informative label is usually better than a heading followed by a generic AI-sounding subtitle.

Follow the formatting already present in the file you touch. Because no repository formatter is configured, avoid a whole-file formatting rewrite unless formatting is the explicit task.

## Where a change belongs

| Change | Primary location | Also inspect |
| --- | --- | --- |
| Draw workflow or filter | `src/stores/randomander.ts` | `OptionsModal.vue`, Draw components, History record snapshots, tests, docs |
| Card/pair classification | `src/lib/scryfall.ts` | store queries/actions, slug behavior, helper tests |
| Scryfall request policy | `src/services/scryfall.ts` | HTTP helper, fake-timer tests, user-facing errors |
| EDHREC schema/metadata | `src/services/edhrec.ts` | tag/group methods, ResultDetailsSection, parser tests |
| Reveal behavior | `src/features/draw/DrawView.vue` | `PrestigeCard.vue`, global motion CSS, app tests |
| Deck inspiration UI | `ResultDetailsSection.vue` and `DrawView.vue` | choice grouping, metadata gating, mobile/desktop layouts |
| Navigation or modal surface | `src/app/AppShell.vue` / `src/components/layout` | focus management, inert state, responsive navigation |
| History/Saved behavior | respective feature plus store | fingerprints, persistence caps, load/save tests |
| Setting or persistence | Settings feature plus store | defaults, old stored state, clear/reset scope, docs |

If a change crosses several rows, identify one owning layer and keep the other edits as adapters rather than implementing the same rule twice.

## External API work

Automated tests must not depend on live Scryfall or EDHREC responses. Stub `fetch` with the smallest response shape that exercises the behavior.

### Scryfall

Preserve the request-policy guarantees:

- starts are spaced by at least 150 ms;
- abort signals can cancel queued and active work;
- HTTP 429 respects a minimum one-minute cooldown or a longer `Retry-After`;
- network/CORS failures start a one-minute cooldown;
- random/ranked draws are live, while exact-name lookups may use persistent cache.

The service queue and cooldown live at module scope. Reset modules and fake timers between tests that exercise them.

Use Scryfall search syntax to reduce the candidate pool, but retain client-side validation where the API cannot express a compatibility rule exactly.

Marketplace prices use the nullable `prices` and `purchase_uris` fields already present on Scryfall card payloads. Keep provider mapping in the pure Scryfall helper, never fetch or scrape a marketplace from the browser, label foil/etched fallbacks, and test missing values without coercing them to zero. Historical records contain price snapshots rather than live quotes.

Double-faced-card presentation uses `layout` plus two usable `card_faces[].image_uris.normal` values. Do not infer a turnable card from `//` or `card_faces.length`: split and Adventure layouts have logical faces but one printed image. Keep the selected face as local component state rather than persisting it with a pull.

### EDHREC

Treat post-reveal deck inspiration as optional: parser and display-loader changes should cover every supported schema fixture and degrade to `null`/empty themes rather than invalidating an otherwise successful Scryfall result.

Deck-threshold filtering is different. It queries EDHREC while selecting candidates and can fail the draw when a count or request is unavailable. Tests must distinguish this blocking filter path from optional display enrichment.

Do not assume every card or pair has a page. Pair slugs and theme links need explicit tests because ordering and path normalization affect both navigation and cache keys.

## State and persistence changes

The durable state key is `randomander:state:v2`; the separate response-cache key is `randomander:cache:v1`.

When changing persisted state:

- keep old/missing values safe through defaults or add an explicit migration;
- decide whether the field belongs in state, cache, or only memory;
- confirm History/Saved records still load;
- preserve the 40-record caps unless changing them intentionally;
- verify that Clear cache, Reset filters, Clear History, and Clear Saved affect only their stated scope;
- test storage-unavailable and malformed-data fallbacks when the boundary changes;
- update the User guide and Architecture document.

Never silently reuse an existing versioned key for an incompatible payload shape.

## Testing expectations

Add the narrowest test that would have prevented the regression, then cover the user-visible workflow when multiple layers interact.

### Test layers

- **Pure helper tests** for card classification, parsing, formatting, ordering, and slugs.
- **Service tests** for request construction, pacing, cooldown, abort, caching, and external schema parsing.
- **Component tests** for focused presentation or interaction state.
- **App integration tests** for workflows involving Pinia, modal surfaces, reveal, History/Saved, or several components.

### Required automated checks

Run both before requesting review:

```bash
npm run test
npm run build
```

`npm run build` excludes test files from its TypeScript project, so a successful build does not imply tests compiled or passed.

If a check cannot run, explain exactly why in the pull request. Do not mark it complete based only on expected behavior.

## Manual UI checks

For interface changes, verify the affected workflow at minimum in:

- a narrow phone viewport around 375 px;
- a wider phone viewport around 430 px;
- a desktop viewport at or above 1280 px;
- light and dark themes when colors/surfaces changed;
- keyboard-only navigation;
- reduced-motion mode when animation or transitions changed.

Use `npm run dev -- --host` for a physical mobile device when possible. Check safe-area spacing, fixed Randomize/navigation controls, sheet scrolling, and touch targets.

### Draw and metadata regression matrix

When draw logic or Deck inspiration changes, cover the relevant rows:

| Scenario | Expected outcome |
| --- | --- |
| Commander, normal | One result, follow-up action only when eligible, one detail body. |
| Commander, choice | Two independently rendered groups and two separate detail bodies. |
| Partner pair, normal | Compatible two-card group within combined color rules. |
| Partner pair, choice | Two independent compatible groups and metadata contexts. |
| Commander with Choose a Background | Commander plus Background. |
| Legendary Background first | Eligible commander is found and canonical order is commander then Background. |
| Spark | Three cards with best-effort duplicate avoidance; no choice/popularity metadata path. |
| Reveal enabled | Metadata begins only after visible result. |
| Reveal skipped/reduced | Result and metadata become available without decorative delay. |
| Transforming/modal DFC | Front is shown first; each result card can turn independently after reveal. |
| Metadata disabled | No post-reveal EDHREC metadata request or theme UI. |

## Accessibility review

Any interaction change should answer these questions:

- Can it be reached and activated without a pointer?
- Does focus move somewhere predictable when a modal opens, closes, or a reveal is skipped?
- Is state conveyed through `aria-pressed`, `aria-expanded`, an accessible name, or native control semantics?
- Is dynamic loading/error information announced without stealing focus?
- Does the background stay inert while a modal is open?
- Does it work with reduced motion and without relying on color alone?
- Are mobile controls large enough and unobscured by fixed navigation/safe areas?

Add a behavioral test for focus or keyboard regressions when jsdom can represent the interaction.

## Documentation changes

Update documentation in the same pull request when behavior, commands, storage, dependencies, or architecture change.

- `README.md` is the concise GitHub landing page and capability matrix.
- `docs/user-guide.md` describes user-visible behavior.
- `docs/architecture.md` describes ownership and contracts.
- `docs/troubleshooting.md` contains recovery instructions.
- `VISION.md` describes product intent rather than implementation detail.
- `COLLABORATION.md` contains coordination reminders.

Use exact current UI labels and commands. Do not claim offline draws, guaranteed EDHREC data, account sync, export/sharing, a deployment target, or a license that the repository does not provide.

## Pull request checklist

Before opening or updating a pull request:

- [ ] The change has one clear user or maintenance outcome.
- [ ] Unrelated work and formatting were left intact.
- [ ] Behavior changes include appropriate tests.
- [ ] `npm run test` passes.
- [ ] `npm run build` passes.
- [ ] Relevant mobile and desktop layouts were checked.
- [ ] Keyboard, focus, and reduced-motion behavior were checked when applicable.
- [ ] External API calls are mocked in automated tests.
- [ ] Persistence/cache compatibility was considered when applicable.
- [ ] User and architecture docs were updated when applicable.
- [ ] The pull request explains risks, limitations, and checks honestly.

## License status

The repository currently has no license file. A contribution does not by itself create a general right for others to use or redistribute the project. Maintainers should choose and add an explicit license before presenting Randomander as open-source software.
