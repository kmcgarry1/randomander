# Randomander 1.0 remediation status

**Status date:** 2026-08-11  
**Current decision:** **NO-GO until the owner, hosted, deployment, and manual gates below are signed off.**

This is the current companion to the historical [1.0 release-readiness review](release-1.0-readiness-review.md), which assessed commit `79cba76` and supplied the paste-ready R10-001 through R10-030 issue bodies. It does not rewrite those findings; it records what the local remediation candidate now proves and what repository files cannot prove.

## Candidate and hosted boundary

| Surface | Current fact |
| --- | --- |
| Local candidate | Committed remediation base `5fb10a7` plus the current uncommitted integration/documentation work. A final candidate SHA does not exist yet. |
| Hosted default branch | Public `main` at `7f9a7957b895eb5487f408bf74385ad61a57a8c0`; the local candidate is not present on a hosted branch. |
| Hosted work | Zero open issues and six open Dependabot pull requests (#17, #18, #19, #20, #22, and #23) on 2026-08-11. No release-remediation issue or candidate PR was created without owner authorization. |
| Hosted security | Secret scanning and push protection are enabled with zero open secret alerts. Dependabot security updates are enabled, but 17 alerts remain open against the old hosted lockfile. |
| Branch policy | `main` is unprotected because the candidate workflows/check names have not reached GitHub. |
| Production | <https://randomander.vercel.app/> still serves the pre-candidate deployment and fails the candidate security-header smoke. |

The original issue text remains suitable for audit history. If GitHub work is published now, issues should be opened only for the remaining owner/hosted/manual outcomes rather than recreating already-remediated implementation defects as open work.

The stable local snapshot is green on Node 22 and 24 (274/274 tests on each), all coverage floors, the production policy/bundle budget, both exact responsive projects, and the complete 32-case Playwright matrix. The Firefox timeout/retry contract also passes a 20-run, five-worker stress check after its route ordering was made deterministic. Audits report zero vulnerabilities; the history secret scan, 399-package license inventory with zero unknowns, 393-component SBOM, workflow pin/YAML audit, and diff check also pass. Exact figures and evidence boundaries are recorded in [Release evidence](release-evidence.md#final-local-working-tree-snapshot-2026-08-11).

## R10-001 through R10-030

| ID | Candidate state | Primary evidence | What remains before 1.0 |
| --- | --- | --- | --- |
| R10-001 | Hosted pending | Patched dependency graph and `security:audit`; local full and production npm audits report zero vulnerabilities. | Publish the lockfile to the default branch and verify all 17 hosted alerts close. |
| R10-002 | Implemented | Deep record snapshots at current, History, Saved, load, and persistence boundaries; store regression tests. | Final candidate gate only. |
| R10-003 | Implemented | Normalized cache values, 1.5 MB cache budget, quota eviction/retry, compact persisted-state projection on the partitioned write path, and maximum-library budget/migration tests. | Final candidate gate only. |
| R10-004 | Implemented | Frozen per-draw context with one 24-call ceiling, ten-second deadline, cancellation, and transport timeouts in `src/stores/drawWorkflow.ts`. | Final candidate gate only. |
| R10-005 | Automated implementation complete | `CardRulesText.vue` exposes semantic single/DFC/empty rules text with component tests. | Manual VoiceOver, NVDA, and TalkBack evidence. |
| R10-006 | Implemented | Frozen draw-time mode/options provenance retained through success, failure, load, and save. | Final candidate gate only. |
| R10-007 | Implemented | Global eligible ranked index and page-boundary sampling tests. | Final candidate gate only. |
| R10-008 | Implemented | Pure mode-aware color compiler, truthful single-Commander exact behavior, impossible-config zero-fetch tests. | Final candidate gate only. |
| R10-009 | Implemented | Central partner legality invariant covers Partner, named Partner, Friends forever, Background, Doctor, uniqueness, and color rules. | Final candidate gate only. |
| R10-010 | Implemented | Unicode-normalized identifiers, Scryfall related-URI preference, pair ordering, and invalid-URL tests. | Final candidate gate only. |
| R10-011 | Automated implementation complete | Typed guarded Web Storage outcomes, durability rollback/retry UI, quota/access/read/remove tests. | Manual private-browsing and browser-policy checks. |
| R10-012 | Implemented | Runtime upstream/persistence/cache decoders, versioned migration, repair, and collection/nested bounds. | Final candidate gate only. |
| R10-013 | Implemented | Confirmed History/Saved clears, visible collection counts, and explicit item-41 replace/cancel behavior. | Final candidate gate only. |
| R10-014 | Implemented | Per-request timeout, workflow deadline, Cancel action, inert modal loading surface, focus restoration, and late-result suppression. | Final candidate gate only. |
| R10-015 | Automated implementation complete | Exact Chromium/WebKit evidence at 320/375/390 CSS px and 100%/200% text, long names, four cards, DFC controls, and horizontal containment. | Physical iOS/Android, orientation, and device safe-area evidence. |
| R10-016 | Implemented | Safe modal initial focus, one topmost Escape owner, nested focus restoration, and keyboard tests. | Manual assistive-technology confirmation. |
| R10-017 | Implemented under public default-off policy | Internal idle/loading/data/empty/error/retry state machine and cache-memory reset tests. Public builds compile automated EDHREC metadata out and retain validated outbound links only. | Owner approval of the default-off service boundary; no automated EDHREC production request. |
| R10-018 | Automated implementation complete | One responsive page h1, phone onboarding, and direct empty History/Saved routes to Draw. | Manual mobile screen-reader navigation. |
| R10-019 | Automated implementation complete | Shared focus token, forced-colors CSS, contrast and keyboard tests. | Manual forced-colors/keyboard visual sign-off. |
| R10-020 | Local automation complete | Seven Playwright projects, 32 deterministic cases, catch-all network isolation, axe scans, responsive measurements, traces/screenshots. | Rerun against the final SHA in hosted CI plus physical-device and real-AT evidence. |
| R10-021 | Local implementation complete | Supported Node 22.12+ and Node 24 engine ranges, npm pin, ES2020/browser baseline, read-only/pinned/time-bounded workflows. | Hosted Node 22/24 checks and required branch checks after publication. |
| R10-022 | Local implementation complete | Test-source typecheck and V8 coverage floors over stores/services/persistence/cache/metrics. | Retain final hosted coverage artifact. |
| R10-023 | Repository implementation complete | `vercel.json`, narrow CSP/security/cache headers, deployment smoke, promotion guide, operations runbook, and rollback procedure. | Immutable preview, candidate promotion, production smoke, and rollback/re-promotion drill. |
| R10-024 | Owner blocked | System fonts, analytics disabled/excluded, public EDHREC default-off, clear-all local-data surface, draft privacy notice, and production-policy scan. | Approve controller/contact, jurisdictions/age posture, Vercel retention/deletion, privacy wording, and disabled-analytics decision. |
| R10-025 | Owner blocked | Third-party/legal-service review covers Scryfall, EDHREC, marketplaces, Wizards fan content, fonts, and dependency inventory. | Select copyright holder and project license; add `LICENSE` and matching package/docs metadata; approve legal wording. |
| R10-026 | Owner/release blocked | SemVer policy, changelog, tag verifier, evidence-producing release workflow, and draft-release automation. | Change package/lock from `0.0.0` to `1.0.0`, date the changelog, create the authorized tag/release, and bind it to the deployment/rollback evidence. |
| R10-027 | Implemented | Central HTTPS host/credential/port allowlists cover Scryfall, EDHREC, and marketplace destinations with bypass tests. | Final candidate gate only. |
| R10-028 | Implemented | Ambient backdrop uses local CSS gradients only; disabled/simplified/standard states request no card art and have browser evidence. | Confirm the same network behavior after production promotion. |
| R10-029 | Local implementation complete | `SECURITY.md`, `SUPPORT.md`, private-reporting link, and four structured issue forms. | Publish the files and verify rendered hosted forms/contact routes. |
| R10-030 | Hosted/release pending | Dependabot config, Dependency Review, audit, history secret scan, SBOM, license inventory, least-privilege permissions, and immutable action pins. | Publish workflows, close hosted alerts, protect `main`, require the exact checks, and retain 1.0 artifacts. |

## Post-1.0 themes

These themes were explicitly non-gating in the original review unless later evidence raised their severity. They are tracked here so “1.0 preparation” does not make them disappear.

| Theme | Current state |
| --- | --- |
| Split the domain store and remove dead paths | Partially complete: filter, workflow, persistence, record, pairing, and metadata boundaries now have integrated pure modules/tests, and earlier unused scaffold paths were removed. The Pinia façade still owns substantial orchestration and remains a deliberate later refactor rather than a 1.0 gate. |
| Partition/debounce persistence and minimize snapshots | Complete locally: compact bounded projections, three independent v3 partitions, v2 migration, debounced preferences, immediate collections, visibility flush, typed quota retry, and focused tests. |
| Privacy-safe observability and runbook | Complete locally: bounded enum/bucket metrics, exactly-once draw outcome wiring, storage outcomes, no external sink by default, and the operations runbook. Hosted alert ownership remains a release-owner task. |
| Standardize Save terminology/external links | Complete locally: Save/Saved terminology and consistent external-link hints/accessibility names. |
| Prevent theme flash/update browser chrome | Complete locally: pre-paint theme initialization and synchronized `theme-color`. |
| Optimize dense lists/secondary routes | Complete locally: small lazy thumbnails, lazy support panels, and enforced JS/CSS bundle budgets. |
| Multi-tab reconciliation/offline recovery | Complete locally: ordinary network failures recover immediately and only HTTP 429 starts cooldown; storage-event tests cover deterministic partition-level settings, Saved, and clear propagation. Same-partition concurrent edits are documented last-write-wins. |
| Make offline/PWA scope explicit | Complete: no service worker/offline shell is an intentional documented boundary. |

## Irreducible release-owner checklist

The local implementation cannot supply these approvals or external-state changes:

1. Choose the project license and copyright holder.
2. Approve the privacy controller/contact, audience/jurisdictions, retention/deletion, fan-content wording, upstream-service boundary, and analytics-disabled posture.
3. Authorize publication of the candidate branch/PR and any remaining GitHub issues.
4. Enable required checks/branch protection after the workflows exist on GitHub and confirm Dependabot alert reconciliation.
5. Complete VoiceOver, NVDA, TalkBack, forced-colors, physical iOS/Android, orientation, and safe-area evidence.
6. Promote an immutable Vercel candidate, pass production smoke, and perform rollback/re-promotion.
7. Approve version `1.0.0`, date the changelog, create `v1.0.0`, and publish the evidence-linked release.

Use the [manual release evidence template](manual-release-evidence-template.md) and [release checklist](release-checklist.md) for the named sign-offs and artifacts.
