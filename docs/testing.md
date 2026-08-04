# Testing and release evidence

Randomander uses two complementary automated suites. Vitest exercises domain,
state, component, persistence, and integration contracts in jsdom. Playwright
exercises release-critical journeys in real browser engines against deterministic
mocked Scryfall and EDHREC responses.

## Local commands

Install the locked dependencies before running the gates:

```bash
npm ci
npm run test
npm run typecheck:test
npm run test:coverage
npm run build
```

Install the browser engines once, then run the real-browser suite:

```bash
npx playwright install chromium firefox webkit
npm run test:e2e
```

`npm run test:e2e:headed` is useful when debugging locally. A single project or
test can be selected with Playwright arguments, for example:

```bash
npm run test:e2e -- --project=desktop-chromium --grep "keyboard focus"
```

## Browser release matrix

The Playwright configuration runs the core release smoke flows in five
compatibility projects and the dedicated layout stress flow in two exact-width
projects:

| Project | Engine and viewport |
| --- | --- |
| `desktop-chromium` | Current Playwright Chromium, desktop Chrome profile |
| `desktop-firefox` | Current Playwright Firefox, desktop Firefox profile |
| `desktop-webkit` | Current Playwright WebKit, desktop Safari profile |
| `mobile-chromium` | Chromium with a Pixel 7 viewport, touch, and user agent |
| `mobile-webkit` | WebKit with an iPhone 13 viewport, touch, and user agent |
| `responsive-chromium` | Chromium exact-width evidence at 320/375/390 CSS px and 100%/200% root text |
| `responsive-webkit` | WebKit exact-width evidence at 320/375/390 CSS px and 100%/200% root text |

The smoke suite covers Commander, Partner pair, and 3-card Spark draws; choice
completion; independent double-faced-card controls; save, reload, and restore in
native Web Storage; keyboard modal focus containment and restoration; automated
WCAG A/AA axe scans; timeout and HTTP-failure recovery; and cancellation followed
by a successful retry. The two responsive-evidence projects also stress long
unbroken pair names and a modal double-faced card, measure document/card/control
bounds, exercise both card faces, and attach screenshots and JSON measurements.
They verify that standard, simplified, and disabled ambient backdrops use only
local CSS gradients and trigger no external asset request.

Browser emulation is not a substitute for release-candidate checks on physical
iOS Safari and Android Chrome, or for keyboard and screen-reader checks with
VoiceOver, NVDA, and TalkBack. Record those manual results in the release
checklist.

## Mock-only upstream contract

E2E must never depend on live Scryfall, EDHREC, font, image, analytics, or other
external services. `e2e/fixtures/upstream.ts` installs a catch-all route before
navigation, fulfills the expected hosts from deterministic fixtures, and aborts
any unrecognized external request. Every test also asserts that the unexpected
request list is empty and, for draw tests, that the planned Scryfall response
queue was consumed as expected.

This contract keeps the suite repeatable and prevents CI from adding traffic to
public APIs. Live integration availability belongs in deployment smoke checks,
not in the browser test suite.

## Risk-based coverage policy

Coverage is intentionally scoped to the release-critical orchestration and data
boundary: `src/stores/**/*.ts`, `src/services/**/*.ts`, and the cache,
operational-metrics, Scryfall-domain, and storage helpers under `src/lib/`. The
initial Node 24 baseline measured 87.04% statements, 81.96% branches, 92.37%
functions, and 87.04% lines.
CI enforces these floors:

| Metric | Required minimum |
| --- | ---: |
| Statements | 85% |
| Branches | 80% |
| Functions | 88% |
| Lines | 85% |

Threshold changes should normally raise the floor. Lowering a threshold requires
explicit QA/release review and a rationale in the pull request; it must not be an
incidental response to a failing gate.

The risk-focused suite includes these contracts:

| Risk | Primary automated evidence |
| --- | --- |
| Result snapshot immutability and provenance | `stores/randomander.test.ts`, `stores/workflowContracts.test.ts` |
| Persisted state, corruption/quota recovery, and cache budgets | `lib/storage.test.ts`, `lib/cache.test.ts`, `stores/randomander.test.ts`, service cache tests |
| Commander, Partner, Spark, and choice behavior | `App.test.ts`, `stores/workflowContracts.test.ts`, Playwright release smoke |
| Pair legality and partner/background invariants | `lib/partnerAndEdhrecContracts.test.ts`, `stores/partnerContracts.test.ts` |
| Color, popularity, choice, and Spark filter combinations | `App.test.ts` and Scryfall-domain contract tests |
| Shared request budgets, deadlines, cancellation, and late-result suppression | `stores/workflowContracts.test.ts` |
| Ranked-search page/index boundary sampling | `services/scryfall.test.ts` |
| Rate-limit, CORS, timeout, HTTP error, retry, and recovery behavior | service tests, `DrawRecovery.test.ts`, Playwright release smoke |
| Bounded operational counters and redacted diagnostic snapshots | `lib/operationalMetrics.test.ts` |

`npm run typecheck:test` separately compiles test sources, E2E fixtures, and test
configuration so type errors outside the production TypeScript project cannot
silently reach CI.

## Bundle budget

`npm run build` finishes by measuring the generated assets with gzip level 9. It
enforces a 90 KiB ceiling for total JavaScript, 75 KiB for the largest JavaScript
chunk, and 20 KiB for total CSS. On Node 24, the measured 1.0 candidate is 80.92
KiB total JavaScript, 66.36 KiB for its largest chunk, and 9.85 KiB CSS; the
Node 22 release gate reports 81.25 KiB, 66.61 KiB, and 9.87 KiB respectively
because its gzip implementation differs slightly. Raising a ceiling
requires explicit performance/release review and a pull-request rationale; it
must not be an incidental response to a failed build.

## CI artifacts

CI runs unit tests, test-source type-checking, coverage, and production builds on
the supported Node matrix. Coverage is generated on Node 24 and uploaded as the
`coverage-node-24` artifact. The E2E job installs Chromium, Firefox, and WebKit,
runs the full matrix, and always uploads `playwright-report` and `test-results`.
Artifacts are retained for 14 days.

The tag-triggered release workflow first requires a clean Node 22 install,
unit-test, test-typecheck, and build gate. Its Node 24 release job repeats the
coverage and browser gates and retains their tag-specific evidence for 90 days
before a draft release can be assembled.

Playwright keeps a screenshot, trace, and video for failed tests. Axe JSON results
are attached to the relevant test in the Playwright report. Locally generated
`coverage/`, `playwright-report/`, and `test-results/` directories are ignored by
Git.
