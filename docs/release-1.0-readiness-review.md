# Randomander 1.0 release-readiness review

**Review date:** 2026-08-03<br>
**Reviewed branch:** `feat/choice-inspiration-copy-cleanup`<br>
**Reviewed commit:** `79cba76`<br>
**Decision:** **NO-GO for 1.0 at this commit.** The application is a strong beta with a healthy production bundle and good documentation, but it has confirmed correctness, data-durability, accessibility, security, and release-engineering blockers.

This document is the cross-functional handoff from Product, UX, Accessibility, Engineering, Data/API, Performance, QA, Security, Privacy/Legal, DevOps/Release, and Support/Documentation. Each numbered item is written so it can be copied into a GitHub issue with minimal editing.

For the implementation state after this historical review, see the [1.0 remediation status](release-1.0-remediation-status.md). The original findings and commit decision remain unchanged for auditability.

No GitHub issues were created by this review. On 2026-08-03, repository-scoped read-only GitHub issue searches were run separately for open and closed issues in `kmcgarry1/randomander`; neither returned an existing issue to deduplicate against, so every item below is currently treated as net-new.

## Executive summary

Randomander's underlying product concept and visual implementation are credible for a public release. The app builds successfully, the documented test workaround produces 67/67 passing tests, the production JavaScript bundle is only 61.79 kB gzip, reduced-motion handling is thoughtful, and the existing user/architecture/troubleshooting documentation is unusually strong.

The 1.0 release should nevertheless be blocked until the P0 and P1 gate issues below are closed. The most important failure modes are:

- archived History and Saved records can mutate after the fact;
- ranked draws are mathematically biased, and some partner paths can produce illegal pairs;
- one impossible draw can multiply into hundreds or more upstream calls without a global deadline;
- a response cache can consume enough Web Storage to make personal Saved/History data silently non-durable;
- there is no equivalent in-app textual rules representation outside the raster card image for screen-reader users;
- the dependency graph currently contains one critical and ten high advisories;
- there is no reproducible production deployment, supported runtime matrix, browser-level release suite, license, privacy decision, or tag-to-release process.

### Release issue count

| Priority | Meaning | Count | Release treatment |
| --- | --- | ---: | --- |
| P0 | Critical correctness, data, accessibility, security, or upstream-safety risk | 5 | Must close before 1.0 |
| P1 | High-impact confirmed defect or missing release control | 20 | Must close before 1.0 |
| P2 | Medium risk, governance gap, or bounded reliability work | 5 | Close before 1.0 unless the release owner explicitly accepts and records the risk |
| Post-1.0 | Maintainability, polish, and optimization | 8 themes | Schedule after the gate unless scope changes |

## Department-head sign-off

These are review-lens decisions, not legal or executive approvals by named individuals.

| Department | Decision | Primary reason |
| --- | --- | --- |
| Product | No-go | Visible results can be relabelled/saved with the wrong mode or filters; “Exactly” does not mean exactly in all modes. |
| UX and Content Design | No-go | Destructive collection actions, weak loading recovery, mobile information hierarchy, and inconsistent result/error states undermine trust. |
| Accessibility | No-go | No textual oracle/rules representation; loading/modal focus defects; missing mobile page heading; real assistive-technology verification absent. |
| Engineering and Architecture | No-go | Mutable snapshots, unchecked persistence, live request-state drift, and concentrated store responsibilities create correctness risks. |
| Data/API and Rules | No-go | Ranked sampling bias, unbounded request multiplication, partner-legality holes, and broken Unicode EDHREC identifiers. |
| Performance | Conditional no-go | Bundle size is healthy, but full EDHREC responses are cached and rewritten in Web Storage; disabling the backdrop still downloads/renders it. |
| QA | No-go | The test suite passes only with a runtime workaround; there is no real-browser, mobile, cross-browser, or assistive-technology release suite. |
| Security | No-go | One critical and ten high dependency advisories; deployment headers, URL validation, and continuous supply-chain controls are absent. |
| Privacy and Legal | No-go pending owner decisions | Analytics and a third-party font load unconditionally; no privacy notice or project license exists. No legal violation is asserted by this technical review. |
| DevOps and Release | No-go | CI uses an EOL runtime and mutable actions; there is no canonical deployment, rollback, versioning, changelog, or release workflow. |
| Support and Documentation | Conditional | Product documentation is strong, but SECURITY, SUPPORT, reporting forms, known limitations, and an operational runbook are missing. |

## Verification record

| Check | Result | Notes |
| --- | --- | --- |
| `npm run build` | Pass | 714 modules; JS 194.35 kB / 61.79 kB gzip; CSS 62.94 kB / 11.81 kB gzip. |
| `vue-tsc -p tsconfig.app.json --noEmit` | Pass | Production application sources type-check. Tests are excluded from this project. |
| `npm run test` on Node 25.2.1 | Fail: 58 pass, 9 fail | All failures come from Node exposing a non-browser-compatible experimental `localStorage`; the same underlying Node/global-localStorage conflict and workaround are documented in `docs/troubleshooting.md:217`. |
| Test run with documented isolated local-storage file | Pass: 67/67 | Confirms the nine failures are runtime reproducibility failures, not nine product regressions. |
| `npm audit` | Fail | 1 critical and 10 high findings; all report an available fix. |
| `npm audit --omit=dev` | Fail | One high PostCSS finding remains in the production dependency graph. |
| Tracked-tree secret-pattern scan | No obvious match | Git history and hosted GitHub security settings were not scanned. |
| Real-browser/manual AT suite | Not run | Playwright/Puppeteer/axe were not installed and no browser automation executable was available. |
| Production deployment/header smoke | Not run | No canonical host or deployment configuration exists. |
| Live upstream contract spot checks | Partial pass/fail | Scryfall/EDHREC checks confirmed Unicode slug, Doctor pairing, and large EDHREC payload concerns; comprehensive live-contract testing remains manual. |

## Proposed GitHub backlog

### R10-001 — Clear all critical and high npm advisories

**Suggested labels:** `security`, `dependencies`, `release-blocker`, `P0`<br>
**Owners:** Security, DevOps<br>
**Status:** Confirmed; 1.0 gate

**Problem and evidence**

`npm audit` reports 11 vulnerable packages: one critical and ten high. Direct vulnerable dependencies include `vitest@3.2.4` and `vite@7.3.1`; affected transitive packages include PostCSS, Rollup, Picomatch, ws, form-data, js-cookie, editorconfig, minimatch, and brace-expansion. One high PostCSS advisory remains under `npm audit --omit=dev`. See `package.json:20-34` and representative resolved versions at `package-lock.json:4089`, `package-lock.json:4810`, `package-lock.json:4908`, and `package-lock.json:5289`.

**Impact**

Vulnerable build/test tooling can expose source or CI hosts, and the production dependency graph does not meet a reasonable 1.0 security gate.

**Acceptance criteria**

- `npm audit --audit-level=high` reports zero high/critical findings.
- `npm audit --omit=dev --audit-level=high` passes.
- Unit tests, production type-check, and production build pass on every supported Node release.
- No affected version remains in `package-lock.json`, or a time-bounded, owner-approved exception documents compensating controls.

### R10-002 — Make History and Saved records immutable snapshots

**Suggested labels:** `bug`, `data-integrity`, `state`, `release-blocker`, `P0`<br>
**Owners:** Engineering, Product<br>
**Status:** Confirmed; 1.0 gate

**Problem and evidence**

`buildRecord` retains supplied arrays at `src/stores/randomander.ts:826`; choice draws archive the same array later mutated by follow-up pairing at `src/stores/randomander.ts:922` and `src/stores/randomander.ts:1048`. `saveRecord` retains the same record object at `src/stores/randomander.ts:839`, and `loadRecord` reattaches record arrays at `src/stores/randomander.ts:855`.

**Impact**

Adding a companion to a current choice can silently rewrite an earlier History or Saved entry. A user cannot trust an archived pull to remain the pull they kept.

**Acceptance criteria**

- Archive, save, persistence, and load boundaries create domain-level deep snapshots of cards, choices, and options.
- Enriching a current choice never changes an existing History record.
- Loading and changing a Saved pull never changes Saved until an explicit save action succeeds.
- Tests freeze prior records and prove nested arrays/objects are not shared.

### R10-003 — Prevent response cache growth from making user data non-durable

**Suggested labels:** `data-integrity`, `performance`, `persistence`, `release-blocker`, `P0`<br>
**Owners:** Engineering, Performance<br>
**Status:** Confirmed; 1.0 gate

**Problem and evidence**

`fetchJson` caches full upstream responses at `src/services/http.ts:62-64` before EDHREC reduces them to a count and a few tags at `src/services/edhrec.ts:89-102`. The default cache holds 120 entries (`src/stores/randomander.ts:188-192`) and every update serializes the complete cache (`src/lib/cache.ts:20-22` and `src/lib/cache.ts:37-49`). On 2026-08-03, `https://json.edhrec.com/pages/commanders/atraxa-praetors-voice.json` returned HTTP 200 with a 110,216-byte uncompressed response body; 120 similar responses are roughly 13.2 MB before History/Saved. Cache and user state share the origin's Web Storage quota, and write failure is swallowed after a console warning at `src/lib/storage.ts:19-23`.

**Impact**

Disposable cache entries can exhaust storage and cause later Saved pulls, History, or settings to appear successful in memory but disappear on reload.

**Dependency boundary**

R10-003 owns cache normalization, budgeting, eviction, and quota integration. R10-011 owns protected storage access, typed durability outcomes, and user-visible failure/retry behavior.

**Acceptance criteria**

- Cache normalized `EdhrecMeta` or another minimal projection, not the full upstream payload.
- Enforce a tested byte budget in addition to entry count/TTL; choose a more suitable backend if needed.
- On a quota outcome from R10-011, disposable cache is evicted before one bounded durable-write retry; failures are never swallowed.
- Representative maximum History + Saved + cache fixtures remain below the documented storage budget.

### R10-004 — Bound each draw with one global request budget and deadline

**Suggested labels:** `bug`, `api`, `performance`, `reliability`, `release-blocker`, `P0`<br>
**Owners:** Data/API, Engineering<br>
**Status:** Confirmed; 1.0 gate

**Problem and evidence**

`MAX_ATTEMPTS` is applied independently in the candidate loop (`src/stores/randomander.ts:707`), partner loop (`src/stores/randomander.ts:795`), and duplicate-choice loops (`src/stores/randomander.ts:891`). Requests are serialized at 150 ms intervals in `src/services/scryfall.ts:100`. One impossible pair can therefore produce over a thousand candidate/network operations, choice-mode nesting can multiply further, and ranked candidate selection can itself issue two HTTP requests at `src/services/scryfall.ts:212`.

**Impact**

The UI can remain blocked for minutes, users cannot recover predictably, and Randomander risks violating [Scryfall's API access guidance](https://scryfall.com/docs/faqs/i-m-having-trouble-accessing-the-scryfall-api-or-i-m-blocked-17) or being blocked.

**Dependency boundary**

R10-004 owns the workflow-wide call budget and end-to-end deadline. R10-014 owns per-transport timeout composition, the Cancel UI, focus, and overlay modality.

**Acceptance criteria**

- One immutable request context owns a documented total call budget and wall-clock deadline across the entire normal or choice workflow.
- Every nested candidate/pair/duplicate path consumes the same budget.
- Transport, rate-limit, and dependency failures stop immediately rather than being treated as candidate mismatches.
- Impossible-filter fake-timer tests prove a fixed maximum duration and call count.
- User-visible messaging distinguishes timeout, cancellation, upstream failure, and no legal match.

### R10-005 — Provide semantic card rules independent of card images

**Suggested labels:** `accessibility`, `content`, `release-blocker`, `P0`<br>
**Owners:** Accessibility, Frontend<br>
**Status:** Confirmed; 1.0 gate

**Problem and evidence**

Card images expose only the card or face name in `src/features/draw/components/PrestigeCard.vue:119-129`. Result details render type, colors, prices, and metadata, but not the rules text at `src/features/draw/components/ResultDetailsSection.vue:143`. Oracle text is already modeled and normalized at `src/lib/scryfall.ts:6` and `src/lib/scryfall.ts:178`. The app can link to external Scryfall text, but it has no equivalent in-app textual rules representation.

**Impact**

The functional content embedded in a raster card image is unavailable within Randomander to screen-reader users and can be unreadable for low-vision/mobile users. A card name alone is not an equivalent text representation under [WCAG 2.2 Non-text Content](https://www.w3.org/TR/WCAG22/#non-text-content).

**Acceptance criteria**

- Every result exposes semantic card/face name, type line, and oracle text outside the image.
- Double-faced cards expose both faces with clear labels and order.
- Cards whose upstream oracle text is legitimately empty expose their name/type without treating the empty field as a loading or integration failure.
- Rules remain usable with images disabled and at 200% zoom.
- Automated accessibility tests can locate the visible card's rules; VoiceOver/NVDA/TalkBack verification is recorded.

### R10-006 — Preserve draw-time mode and filter provenance

**Suggested labels:** `bug`, `product`, `state`, `release-blocker`, `P1`<br>
**Owners:** Product, Engineering<br>
**Status:** Confirmed; 1.0 gate

**Problem and evidence**

Mode changes immediately at `src/features/draw/DrawView.vue:301`; relevant store watchers do not generally invalidate the existing result at `src/stores/randomander.ts:1217`. Hero labels derive from the current mode at `src/features/draw/components/HeroStage.vue:22`, and saving builds a record from current mode/options at `src/stores/randomander.ts:849`. Async actions also reread live state while a request is pending.

**Impact**

A Commander can be presented or saved as a Spark/Partner result, filters can be recorded against cards they did not produce, and controls changed mid-request can alter its final record.

**Acceptance criteria**

- Capture an immutable request configuration at action start and attach it to the active result.
- Switching modes or query-defining filters cannot relabel old cards; either retain their provenance or invalidate them deliberately.
- Mid-request changes cannot alter filtering, labels, or History for that request.
- Regression tests cover mode/filter changes, failure retention, in-flight changes, load, and save.

### R10-007 — Sample ranked eligible cards uniformly

**Suggested labels:** `bug`, `algorithm`, `randomness`, `release-blocker`, `P1`<br>
**Owners:** Data/API, Engineering<br>
**Status:** Confirmed; 1.0 gate

**Problem and evidence**

The ranked path chooses a page uniformly at `src/services/scryfall.ts:228-231`, then a card uniformly within that page at `src/services/scryfall.ts:243-245`. With `total_cards=176` and 17 skipped cards, 158 eligible cards remain on page one and one on page two: the last card receives 50% probability while each page-one card receives about 0.316%.

**Impact**

The core randomizer materially overrepresents cards on partial pages, contradicting the product's randomness promise.

**Acceptance criteria**

- Select one uniform global eligible index and derive page/offset, or weight pages by eligible-card count.
- Skipped indices are impossible to select.
- Deterministic tests cover partial first/final pages and page-boundary values.
- A distribution/property test establishes equal mapping opportunity for every eligible index.

### R10-008 — Compile color filters once and make “Exactly” truthful

**Suggested labels:** `bug`, `filters`, `product`, `api`, `release-blocker`, `P1`<br>
**Owners:** Product, Data/API<br>
**Status:** Confirmed; 1.0 gate

**Problem and evidence**

The modal promises “Require the selected color count” at `src/components/layout/OptionsModal.vue:35-38`; Partner uses an up-to comparison at `src/stores/randomander.ts:632`, and Spark chooses zero through the maximum at `src/stores/randomander.ts:652`. Selected-color query clauses at `src/stores/randomander.ts:446` and numeric client validation at `src/stores/randomander.ts:602` can contradict each other, causing repeated requests for impossible configurations.

**Impact**

Users receive results that violate the control's wording or wait through many requests for a combination that cannot succeed.

**Acceptance criteria**

- A pure mode-aware filter compiler owns UI semantics, Scryfall query clauses, and final client validation.
- “Exactly” behaves exactly everywhere it is offered; otherwise mode-specific copy/control states describe the true behavior.
- Impossible combinations show inline accessible guidance and send zero network requests.
- Table-driven tests cover Any/Up to/Exactly, colorless, palettes, Commander, Partner, and Spark.

### R10-009 — Centralize and enforce partner-legality invariants

**Suggested labels:** `bug`, `rules`, `data-integrity`, `release-blocker`, `P1`<br>
**Owners:** Rules/Data, Engineering<br>
**Status:** Confirmed; 1.0 gate

**Problem and evidence**

Doctor candidates use broad `type:doctor` at `src/stores/randomander.ts:490`, with no Time Lord check in the pairing branch at `src/stores/randomander.ts:757`. On 2026-08-03, `https://api.scryfall.com/cards/search?q=is%3Acommander%20legal%3Acommander%20type%3Adoctor&unique=cards` returned 24 cards, including Arcade Gannon (`Legendary Creature — Human Doctor`), which lacks the required Time Lord type. The named Partner With path calls but ignores the deck-limit result at `src/stores/randomander.ts:732`, and Choose a Background does not exclude the primary card at `src/stores/randomander.ts:739`, allowing a singleton to pair with itself in an edge case.

**Impact**

Randomander can return an illegal Commander pair or a partner that violates an enabled popularity limit.

**Acceptance criteria**

- Every completed pair passes one pure `isLegalPartnerPair` invariant.
- Doctor's Companion requires a legendary Time Lord Doctor with no other creature types; it rejects representative non-Time-Lord, extra-type, and changeling cards.
- Named partners honor the enabled deck threshold.
- A card can never pair with itself; Faceless One is an explicit regression fixture.
- Mechanic-specific contract fixtures cover Partner, Partner With, Friends Forever, Background, Doctor's Companion, and other supported mechanics.

### R10-010 — Resolve EDHREC navigation and metadata identifiers for Unicode names

**Suggested labels:** `bug`, `integration`, `i18n`, `release-blocker`, `P1`<br>
**Owners:** Data/API<br>
**Status:** Confirmed; 1.0 gate

**Problem and evidence**

`slugify` strips non-ASCII letters at `src/lib/scryfall.ts:212`; those slugs drive EDHREC fetches and links at `src/lib/scryfall.ts:232`. Live checks on 2026-08-03 (following redirects) produced:

- app-generated `https://json.edhrec.com/pages/commanders/owyn-fearless-knight.json` → HTTP 403; canonical `https://json.edhrec.com/pages/commanders/eowyn-fearless-knight.json` → HTTP 200;
- app-generated `https://json.edhrec.com/pages/commanders/m-rton-stromgald.json` → HTTP 403; canonical `https://json.edhrec.com/pages/commanders/marton-stromgald.json` → HTTP 200.

**Impact**

Themes, deck counts, external links, pair pages, and deck-limit filtering fail for commanders with accented names.

**Acceptance criteria**

- Use Scryfall's validated `related_uris.edhrec` directly for outbound navigation when available; do not assume its route/query contains a reusable API slug.
- Generate metadata endpoint identifiers with verified Unicode normalization/transliteration or another contract-tested resolver.
- Fixtures cover Éowyn, Márton, apostrophes, double-faced front faces, and accented pair identifiers.
- Invalid or absent identifiers produce a recoverable metadata state, not misleading empty content.

### R10-011 — Protect every Web Storage access and report durability outcomes

**Suggested labels:** `bug`, `persistence`, `browser-compat`, `release-blocker`, `P1`<br>
**Owners:** Engineering, QA<br>
**Status:** Confirmed; 1.0 gate

**Problem and evidence**

The `localStorage` global/method is resolved before the protected `try` at `src/lib/storage.ts:2`, `src/lib/storage.ts:16`, and `src/lib/storage.ts:27`. A browser can throw `SecurityError` from the storage getter itself. Writes currently only log a warning and the UI continues as if state is durable.

**Impact**

Blocked-storage contexts can fail during initialization, or the app can claim a pull is Saved when it will disappear after reload.

**Acceptance criteria**

- Resolve storage and invoke every method inside protected code.
- Reads/writes/removals return typed outcomes that distinguish unavailable, quota, corrupt data, and success.
- A throwing `localStorage` getter does not prevent the app from mounting and drawing in memory.
- Save/settings UI never claims durable success after a failed write and offers an accessible recovery action.
- Tests cover getter, read, write, remove, quota, and successful retry paths.

### R10-012 — Runtime-validate and migrate persisted and upstream data

**Suggested labels:** `architecture`, `validation`, `persistence`, `release-blocker`, `P1`<br>
**Owners:** Engineering, QA<br>
**Status:** Confirmed; 1.0 gate

**Problem and evidence**

`readStorage<T>` parses and casts at `src/lib/storage.ts:6-8`; persisted values are loaded and shallow-merged without a schema at `src/stores/randomander.ts:206-235`; cache startup assumes the expected shape at `src/lib/cache.ts:15`; and upstream JSON is cast to `T` at `src/services/http.ts:60`. History/Saved caps are not reapplied on initial load.

**Impact**

Parseable but malformed or old state can crash rendering, silently disable filters, create oversized collections, or misrepresent upstream data.

**Acceptance criteria**

- Introduce versioned runtime decoders/migrations for persisted state and cache.
- Validate enums, booleans, dates, arrays, required card fields, and finite bounded numeric settings.
- Cap History and Saved during load and deterministically drop/repair invalid records.
- Validate the minimum consumed Scryfall/EDHREC response shapes and return recoverable typed errors.
- Fixture tests cover malformed JSON, wrong shapes, legacy partial data, oversized arrays, and valid legacy migrations.

### R10-013 — Protect bulk clears and eliminate silent Saved eviction

**Suggested labels:** `ux`, `data-integrity`, `accessibility`, `release-blocker`, `P1`<br>
**Owners:** Product, UX<br>
**Status:** Confirmed; 1.0 gate

**Problem and evidence**

Clear History and Clear Saved execute immediately at `src/features/history/HistoryView.vue:84` and `src/features/saved/SavedView.vue:72`. The Saved list silently truncates to 40 at `src/stores/randomander.ts:846`; limits are defined at `src/stores/randomander.ts:99`.

**Impact**

One accidental activation permanently erases local ideas, and keeping item 41 silently deletes the oldest supposedly Saved pull.

**Acceptance criteria**

- Clear actions state the affected count and require accessible confirmation or provide a reliable undo.
- Cancel preserves data; completion announces the result and restores/moves focus predictably.
- History's rolling capacity is disclosed.
- Saving at capacity prompts for an explicit choice or safely expands storage; Saved never silently evicts.
- Tests cover empty, one-item, item 40, item 41, cancel, and confirm; R10-011 owns persistence-failure behavior.

### R10-014 — Add timeouts, cancellation, and coherent loading modality

**Suggested labels:** `reliability`, `ux`, `accessibility`, `release-blocker`, `P1`<br>
**Owners:** Frontend, Data/API<br>
**Status:** Confirmed; 1.0 gate

**Problem and evidence**

`fetchJson` forwards a caller signal but has no endpoint timeout at `src/services/http.ts:36`. The full-screen loading surface has no Cancel action at `src/components/layout/LoadingOverlay.vue:14`. The shell's inert state only accounts for panels/options at `src/app/AppShell.vue:50`, so keyboard users can reach visually obscured controls.

**Impact**

A stalled fetch can trap pointer users indefinitely while keyboard users can change hidden state underneath the overlay.

**Acceptance criteria**

- Compose the request's global deadline with caller cancellation and endpoint timeouts.
- Cancel aborts active work, exits loading, and restores focus.
- If loading remains blocking, background content is inert and focus behavior is modal; otherwise use a clearly non-blocking design with frozen request state.
- Timeout/cancel/upstream/no-match states have distinct actionable messages and permit a successful next draw.
- Tests cover never-resolving response bodies, abort cleanup, focus, and recovery.

### R10-015 — Verify and harden Partner choice-card reflow on phone and zoom layouts

**Suggested labels:** `responsive`, `accessibility`, `manual-test`, `P2`<br>
**Owners:** UX, Frontend<br>
**Status:** Static risk; manual browser reproduction required; 1.0 risk-acceptance candidate

**Problem and evidence**

The result clips horizontal overflow at `src/features/draw/DrawView.vue:418` and `src/features/draw/DrawView.vue:536`. Choice pairs use two `9.5rem` preferred-width flex items in a non-wrapping row at `src/features/draw/components/ChoiceOptionsSection.vue:102-110`, and rotated transforms can extend their painted bounds. The items retain the default ability to shrink, so static layout math alone does not prove visible clipping.

**Impact**

Cards and face-turn controls may shrink excessively or be clipped on common phones and under text zoom; this must be reproduced or cleared in real browsers.

**Acceptance criteria**

- No card or face control is clipped at 320, 375, and 390 CSS px.
- No horizontal page scrolling is introduced.
- Both cards remain identifiable and operable at 200% text resize.
- Browser-level visual regression tests cover single cards, pairs, double-faced cards, and long names.

### R10-016 — Fix modal initial focus and topmost-only Escape handling

**Suggested labels:** `accessibility`, `keyboard`, `ux`, `release-blocker`, `P1`<br>
**Owners:** Accessibility, Frontend<br>
**Status:** Confirmed; 1.0 gate

**Problem and evidence**

Modal focus defaults to the first enabled control at `src/composables/useModalFocus.ts:61-64`; in populated History/Saved panels that is the destructive Clear action. Draw and modal behavior install separate global Escape listeners at `src/features/draw/DrawView.vue:340` and `src/composables/useModalFocus.ts:25`.

**Impact**

Panels initially focus destructive actions, and one Escape can close a panel and also skip a hidden reveal beneath it.

**Acceptance criteria**

- Each panel specifies a safe initial target such as its heading/container or Close, never Clear.
- One Escape affects only the topmost visible surface.
- Tab and Shift+Tab remain contained; nested-panel close order is deterministic.
- Focus restores to the invoker after all panel routes.
- Automated keyboard tests cover History, Saved, Settings, Options, nested navigation, and active reveals.

### R10-017 — Distinguish EDHREC empty, error, and retry states

**Suggested labels:** `integration`, `error-handling`, `ux`, `release-blocker`, `P1`<br>
**Owners:** Product, Data/API<br>
**Status:** Confirmed; 1.0 gate

**Problem and evidence**

Any failed tag lookup becomes an empty array at `src/stores/randomander.ts:1138`, and the presence check prevents future attempts for the session at `src/stores/randomander.ts:1127`. The UI then says “No themes available” in `src/features/draw/components/ResultDetailsSection.vue:123-126`. Clear cache only clears persistent cache at `src/stores/randomander.ts:1198`, not in-memory metadata/tag maps.

**Impact**

A transient outage is represented as legitimate empty content and remains stuck until reload; the advertised Clear cache action cannot recover it.

**Acceptance criteria**

- Model loading, success-with-data, success-empty, and error separately.
- “No themes available” appears only after a successful empty response.
- Metadata failure does not invalidate a valid card and exposes Retry.
- Clear cache aborts relevant work and clears persistent cache, metadata map, and tag lookup.
- A test where a 500 is followed by success recovers without page reload.

### R10-018 — Preserve an accessible page hierarchy and phone onboarding

**Suggested labels:** `accessibility`, `onboarding`, `mobile`, `release-blocker`, `P1`<br>
**Owners:** Product, Accessibility<br>
**Status:** Confirmed; 1.0 gate

**Problem and evidence**

The only `h1` is inside a header hidden below `sm` at `src/features/draw/DrawView.vue:419`. Mode descriptions are hidden below `lg` at `src/features/draw/DrawView.vue:497`, while the initial hero only prompts a draw at `src/features/draw/components/HeroStage.vue:164`.

**Impact**

The mobile accessibility tree lacks a discoverable page-level heading, and first-time phone users do not get enough guidance to distinguish modes. WCAG requires a meaningful, programmatically determinable heading structure; exactly one `h1` is a product outline standard, not itself a WCAG requirement.

**Acceptance criteria**

- A discoverable page-level heading exists at every supported breakpoint, and the chosen one-`h1` document-outline standard is documented and tested consistently.
- Commander, Partner, and Spark descriptions are accessible on phone without opening documentation.
- Initial and empty History/Saved states provide an obvious route to the main draw action.
- Mobile screen-reader heading navigation is manually verified.

### R10-019 — Establish a robust focus-indicator token and interaction audit

**Suggested labels:** `accessibility`, `design-system`, `release-blocker`, `P1`<br>
**Owners:** Accessibility, Visual Design<br>
**Status:** Confirmed WCAG 2.2 AA defect on the tested light surface; 1.0 gate

**Problem and evidence**

The global outline mixes the primary color at 55% transparency at `src/style.css:159`. Against the light surface tokens at `src/style.css:9` and `src/style.css:24`, the resulting visible color is approximately `#a996c0`, about 2.57:1. [WCAG 2.2 Focus Appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html) is AAA, but W3C states that an author-styled focus indicator is also subject to the Level AA [Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast) criterion. The tested light-surface outline therefore misses the required 3:1 adjacent contrast.

**Impact**

Keyboard focus can be difficult to locate on common light surfaces.

**Acceptance criteria**

- Add a dedicated focus token that achieves at least 3:1 against adjacent colors on every supported surface.
- Focus remains visible in light, dark, high-contrast, and forced-colors modes.
- No control removes the shared focus treatment without an equal or stronger replacement.
- Representative keyboard screenshots and manual forced-colors checks are release evidence.

### R10-020 — Add real-browser E2E, accessibility, mobile, and contract release tests

**Suggested labels:** `testing`, `e2e`, `accessibility`, `release-blocker`, `P1`<br>
**Owners:** QA, Accessibility<br>
**Status:** Confirmed coverage gap; 1.0 gate

**Problem and evidence**

`vitest.config.ts:7` runs jsdom only, and CI runs tests/build only at `.github/workflows/ci.yaml:23`. Sticky layouts, `dvh`, `inert`, focus trapping, native Web Storage, image behavior, CSP, and cross-browser rendering are not covered.

**Acceptance criteria**

- Chromium, Firefox, and WebKit run in CI with at least one phone and one desktop project.
- Mocked smoke flows cover Commander, Partner, Spark, choice completion, double-faced cards, save/load persistence, keyboard modals, timeout/cancel, and upstream failure recovery.
- Automated accessibility scans complement, but do not replace, documented VoiceOver, NVDA, and TalkBack checks.
- Failed runs retain screenshots/traces.
- Release tests do not depend on live Scryfall/EDHREC; a separate bounded contract job may monitor minimum schemas.

### R10-021 — Define supported Node/browser versions and harden CI

**Suggested labels:** `ci`, `devops`, `security`, `release-blocker`, `P1`<br>
**Owners:** DevOps, QA<br>
**Status:** Confirmed; 1.0 gate

**Problem and evidence**

CI uses Node 20 and `npm install` with mutable action tags at `.github/workflows/ci.yaml:14`. It has no explicit permissions, timeout, or concurrency policy. `package.json` has no `engines` or `packageManager`, and plain tests fail on Node 25.2.1 because its experimental global storage shadows jsdom. Node 20 reached end of life on 2026-03-24 according to the [official Node.js release status](https://nodejs.org/en/about/previous-releases).

**Acceptance criteria**

- Select maintained Node LTS lines (initially 22 and 24), encode them in CI, `package.json`, and a version-manager file.
- Plain `npm test` passes on each declared runtime without `NODE_OPTIONS`; unsupported versions fail clearly.
- CI uses `npm ci`, lockfile-aware caching, explicit read-only permissions, timeouts, and PR concurrency cancellation.
- Third-party actions are pinned to reviewed commit SHAs.
- Concrete Chromium/Firefox/Safari-or-WebKit support and the matching Vite target are documented.
- Required branch-protection checks are verified manually in repository settings.

### R10-022 — Type-check test sources and enforce risk-based coverage

**Suggested labels:** `testing`, `developer-experience`, `release-blocker`, `P1`<br>
**Owners:** QA, Engineering Enablement<br>
**Status:** Confirmed coverage gap; 1.0 gate

**Problem and evidence**

Tests are excluded at `tsconfig.app.json:15`; `package.json` has no test type-check or coverage script. Critical invariants such as request budgets, record immutability, partner legality, migrations, and quota handling lack enforceable coverage.

**Acceptance criteria**

- `npm run typecheck:test` checks all tests and setup files.
- CI produces and retains coverage output.
- Initial thresholds are documented and cannot decrease without explicit review.
- Risk-focused tests cover snapshots, persistence/cache, draw modes, pair invariants, filter combinations, global budgets, ranked indices, and failure recovery.

### R10-023 — Establish a canonical deployment, security headers, smoke, and rollback

**Suggested labels:** `deployment`, `security`, `release-blocker`, `P1`<br>
**Owners:** DevOps, Security<br>
**Status:** Confirmed gap; 1.0 gate

**Problem and evidence**

`vite.config.ts:6` contains only plugins; `index.html:3` has no repository-defined CSP; `README.md:78` explicitly says no deployment target/config exists. Root/subpath behavior, preview promotion, security headers, caching, and rollback are not reproducible.

**Acceptance criteria**

- Document canonical production and preview URLs and the owner of each environment.
- Make root/subpath choice and Vite `base` explicit.
- Enforce HTTPS and a tested CSP plus HSTS, `X-Content-Type-Options`, Referrer-Policy, Permissions-Policy, and frame protection.
- CSP narrowly permits only required Scryfall, EDHREC, image, font, and analytics origins.
- Cache policy distinguishes immutable hashed assets from HTML.
- A post-deploy browser smoke and documented rollback complete before promotion.

### R10-024 — Publish a privacy notice and decide analytics/font behavior

**Suggested labels:** `privacy`, `legal`, `release-blocker`, `P1`<br>
**Owners:** Privacy/Legal, Product<br>
**Status:** Owner/legal decision required; 1.0 gate; no violation asserted

**Problem and evidence**

Analytics initializes unconditionally at `src/main.ts:3`, and Google Fonts loads from a third party at `src/style.css:1`. The app has no unified Privacy/About or clear-all-local-data surface, although Settings provides individual cache and collection controls. [Vercel's privacy documentation](https://vercel.com/docs/analytics/privacy-policy) describes its analytics as cookieless and anonymized but still records page/referrer, approximate location, OS/browser, and device information.

**Acceptance criteria**

- An owner-approved privacy notice is linked from the app and identifies services, purposes, data points, retention, controller/contact, and user choices.
- Legal review records whether consent, opt-out, or DNT behavior is required for target jurisdictions.
- Analytics initialization is environment-gated and follows that decision.
- Google Fonts is self-hosted with its license or the third-party request is disclosed and justified.
- Production network inspection matches the notice.
- Users can understand local retention/capacity and clear all local personal data.

### R10-025 — Choose a project license and complete legal/service notices

**Suggested labels:** `legal`, `documentation`, `release-blocker`, `P1`<br>
**Owners:** Project owner, Legal<br>
**Status:** Owner/legal decision required; 1.0 gate

**Problem and evidence**

`README.md:222` and `CONTRIBUTING.md:272` explicitly state that the repository has no license; `package.json` has no license metadata. Third-party dependencies, Google font behavior, card art, marketplace links, Scryfall/EDHREC terms, and fan-content notices need an owner-approved release record.

**Acceptance criteria**

- Add an owner-approved `LICENSE`; package metadata and documentation agree.
- Add `THIRD_PARTY_NOTICES` or equivalent for shipped dependencies/assets where required.
- Record review of Scryfall, EDHREC, marketplace, Wizards/fan-content, and font obligations/disclaimers.
- README and Contributing use consistent licensing/contribution language.

### R10-026 — Define SemVer, changelog, release gates, and tag promotion

**Suggested labels:** `release`, `documentation`, `release-blocker`, `P1`<br>
**Owners:** Release Management<br>
**Status:** Confirmed gap; 1.0 gate

**Problem and evidence**

`package.json:4` and `package-lock.json:3`/`package-lock.json:9` remain at `0.0.0`; no changelog or release workflow exists, and CI only covers branch pushes/PRs at `.github/workflows/ci.yaml:3`.

**Acceptance criteria**

- Document versioning and supported-release policy.
- `CHANGELOG.md` describes the 1.0 baseline, breaking decisions, and known limitations.
- Version metadata is consistent across package and lockfile.
- An immutable tag triggers the complete gate set and produces a GitHub release tied to commit, deployment, evidence, and rollback target.
- The checklist blocks promotion on failed required checks or unresolved critical/high security findings.

### R10-027 — Validate all externally navigable URLs

**Suggested labels:** `security`, `integration`, `P2`<br>
**Owners:** Security, Frontend<br>
**Status:** Confirmed unsanitized flow; exploitability depends on manipulated upstream/persisted data; 1.0 gate

**Problem and evidence**

Purchase URLs flow through `src/lib/scryfall.ts:119` and render in `src/features/draw/components/CardPriceBadge.vue:38`; Scryfall/EDHREC URIs render directly in `src/features/draw/components/ResultDetailsSection.vue:91` and `src/features/draw/components/ResultDetailsSection.vue:173`; EDHREC fallback accepts any string starting with `http` at `src/services/edhrec.ts:67-69`.

**Acceptance criteria**

- Centralize external URL construction and validation.
- Only HTTPS and explicitly expected hosts are linkable.
- `javascript:`, `data:`, protocol-relative, deceptive-host, credential-bearing, and malformed URLs render as non-links.
- Persisted legacy records pass through the same validator.
- Tests cover every link source and representative bypass strings.

### R10-028 — Make “Card-art backdrop off” avoid the art request and blur

**Suggested labels:** `performance`, `settings`, `P2`<br>
**Owners:** Frontend, Performance<br>
**Status:** Confirmed; 1.0 risk-acceptance candidate

**Problem and evidence**

Settings describe `showAmbient` as “Card-art backdrop” at `src/features/settings/SettingsView.vue:77`; Draw always passes result cards at `src/features/draw/DrawView.vue:540-544`, and `ambient=false` still renders a blurred `art_crop` background at `src/features/draw/components/DrawBackdrop.vue:30-36`.

**Impact**

Turning the setting off still downloads an extra image and performs a large blur, defeating bandwidth/GPU and low-power expectations.

**Acceptance criteria**

- When backdrop is off, no `art_crop` request, style, or DOM backdrop is produced.
- The relationship between Off, Simplify, and reduced/low-power modes is documented and reflected in UI copy.
- A browser test asserts network and DOM behavior for each state.

### R10-029 — Add SECURITY, SUPPORT, and structured issue reporting

**Suggested labels:** `security`, `support`, `documentation`, `P2`<br>
**Owners:** Security, Support<br>
**Status:** Confirmed gap; 1.0 gate unless the repository remains private

**Problem and evidence**

Normal contribution and troubleshooting guidance exists, but there is no `SECURITY.md`, `SUPPORT.md`, or issue-form set. Reporters lack a private vulnerability route and clear supported-version/response expectations.

**Acceptance criteria**

- `SECURITY.md` states supported versions, private reporting route, response expectations, and coordinated disclosure process.
- `SUPPORT.md` distinguishes application defects, upstream outages, rules questions, and unsupported requests.
- Bug, feature, accessibility, and documentation forms request reproducible information without soliciting localStorage dumps or sensitive data.
- README links the policies and issue entry points.

### R10-030 — Add continuous dependency, secret, and supply-chain controls

**Suggested labels:** `security`, `supply-chain`, `devops`, `P2`<br>
**Owners:** Security, DevOps<br>
**Status:** Manual hosted-settings verification required; 1.0 risk-acceptance candidate

**Problem and evidence**

The current workflow only installs, tests, and builds. No Dependabot configuration or repository security workflow is committed. The tracked-tree scan found no obvious secret, but history and hosted GitHub settings were not checked.

**Acceptance criteria**

- Dependabot or equivalent opens grouped, scheduled update PRs.
- CI blocks newly introduced high/critical advisories and runs Dependency Review on PRs.
- GitHub secret scanning, push protection, and private vulnerability reporting are enabled and recorded.
- Complete a baseline history scan without publishing any discovered secret.
- Produce an SBOM and retain it with the 1.0 release evidence.

## Post-1.0 backlog themes

These should not displace the release gates unless additional testing raises their severity.

1. **Split the 1,404-line domain store and remove dead paths.** Extract a pure filter compiler, pairing engine, record repository, and metadata coordinator after invariant tests exist. Remove or justify unused `HelloWorld.vue`, `DrawToolbar.vue`, `HeroDetailsSection.vue`, `useManaFilters.ts`, scaffold SVGs, and legacy display settings.
2. **Partition/debounce persistence and minimize card snapshots.** Benchmark a full 40 History + 40 Saved library and set main-thread/payload budgets.
3. **Add privacy-safe observability and an outage/rollback runbook.** Track failure type, latency, request count, timeout, and quota without card names, filters, or history payloads. Promote to a 1.0 gate if material public traffic is expected immediately.
4. **Standardize Keep/Save terminology and external-link behavior.** Pick one retention verb and make new-tab behavior consistent in copy and accessible names.
5. **Prevent theme flash and update browser chrome.** Apply persisted/system theme before first paint and synchronize `theme-color` for light/dark modes.
6. **Optimize dense lists and secondary routes.** Use Scryfall thumbnails in History/Saved, lazy-load secondary panels, and retain a bundle budget. The current 61.79 kB gzip JS bundle is already healthy.
7. **Assess multi-tab reconciliation and offline recovery.** Current whole-state writes are last-writer-wins, and a transient offline `TypeError` can start a fixed 60-second cooldown. Define the supported behavior and test it.
8. **Make offline/PWA scope explicit.** No service worker exists; record this as a deliberate product boundary rather than an accidental omission.

## Manual 1.0 release checks

The following cannot be closed through code inspection alone:

- verify the deployed URL's TLS, redirects, CSP/security headers, asset/HTML cache rules, root/subpath navigation, preview promotion, and rollback;
- verify GitHub branch protection, required checks, least-privilege tokens, secret scanning, push protection, private reporting, and maintainer permissions;
- exercise Commander, Partner, Spark, and choice flows against bounded live-safe Scryfall/EDHREC contracts without load testing those services;
- test 320/375/390 px layouts, 200% zoom, iOS safe areas/orientation, Android Chrome, Firefox, Safari/WebKit, slow image loading, and double-faced cards;
- complete VoiceOver, NVDA, and TalkBack result announcements, headings, focus order, modal containment, error recovery, and reduced-motion checks;
- test blocked Web Storage, private browsing, quota exhaustion, corrupted/legacy state, reload durability, two-tab save/clear, offline-to-online recovery, and cache clearing;
- inspect production analytics/font network calls and confirm privacy retention/consent decisions;
- obtain owner/legal approval for license, privacy notice, third-party notices, fan-content posture, and upstream service terms;
- run a release candidate rehearsal from clean checkout through tag, CI evidence, deployment smoke, GitHub release, and rollback drill.

## Recommended delivery sequence

### Tranche 1 — Stop corruption, invalid output, and unsafe traffic

Close R10-001 through R10-010. These are the highest-risk security, personal-data, accessibility, algorithm, request-volume, and rules-correctness defects.

### Tranche 2 — Make failure and recovery trustworthy

Close R10-011 through R10-019. This establishes validated persistence, recoverable loading/integrations, safe personal-data actions, usable phone layouts, and coherent keyboard/focus behavior.

### Tranche 3 — Make the release reproducible

Close R10-020 through R10-030, record any explicitly accepted P2 risk, and complete every applicable manual check. Cut an internal release candidate before changing the package version to 1.0.0.

## Definition of ready for 1.0

The release owner may change the decision from NO-GO only when:

- all P0 and P1 issues are closed with linked automated/manual evidence;
- every P2 item is closed or has a named owner, rationale, compensating control, and review date;
- clean checkout, install, test, type-check, audit, E2E/accessibility, and build gates pass on the declared matrix;
- production deployment, smoke, telemetry/privacy, support, security, legal, rollback, and GitHub settings checks are signed off;
- the 1.0.0 tag, changelog, release notes, known limitations, deployed commit, and rollback target all agree.

## Standards and external references

- [WCAG 2.2 Recommendation](https://www.w3.org/TR/WCAG22/)
- [What's new in WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)
- [Understanding WCAG 2.2 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast)
- [Understanding WCAG 2.2 Focus Appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html)
- [OWASP Content Security Policy Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [OWASP HTTP Security Response Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html)
- [Node.js end-of-life schedule](https://nodejs.org/en/about/eol)
- [Node.js release status](https://nodejs.org/en/about/previous-releases)
- [Scryfall API access guidance](https://scryfall.com/docs/faqs/i-m-having-trouble-accessing-the-scryfall-api-or-i-m-blocked-17)
- [Vercel Web Analytics privacy documentation](https://vercel.com/docs/analytics/privacy-policy)
- [Vercel Web Analytics usage documentation](https://vercel.com/docs/analytics/using-web-analytics)
