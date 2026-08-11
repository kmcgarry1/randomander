# Release evidence

This file records reproducible evidence for the Randomander 1.0 release candidate. A repository file can document a check, but hosted/deployment rows are not complete until the referenced release commit is present on the remote and in production.

The [1.0 remediation status](release-1.0-remediation-status.md) maps each historical R10 item and post-1 theme to its current implementation and remaining gate.

## Hosted repository controls

Originally verified against `kmcgarry1/randomander` on 2026-08-03 after applying the listed settings. Repository metadata, open work, security alerts, Actions permissions, and branch protection were re-read without mutation on 2026-08-11.

| Control | Result | Evidence boundary |
| --- | --- | --- |
| Repository visibility and default branch | Public; `main` at `7f9a7957b895eb5487f408bf74385ad61a57a8c0` on 2026-08-11 | GitHub repository/branch metadata. The local remediation candidate and commit `5fb10a7` are not on a hosted branch. |
| Secret scanning | Enabled; zero open alerts on 2026-08-11 | `security_and_analysis.secret_scanning.status` plus the authenticated secret-scanning alerts API. The local scanner also inspects tracked files and all Git patches without printing candidate values. |
| Secret push protection | Enabled | `security_and_analysis.secret_scanning_push_protection.status`. |
| Dependabot alerts and security updates | Enabled; **17 alerts remain open against the old `main` lockfile** | The 2026-08-11 alert read returned 17 open findings. Every listed dependency is at or above its first patched version in the local candidate and both local npm audits pass, but the hosted gate cannot close until that lockfile reaches the default branch and GitHub recalculates the alerts. |
| Private vulnerability reporting | Enabled | Private-vulnerability-reporting API returns `enabled: true`; the issue-form contact link is now usable. |
| Default Actions token | Read-only; cannot approve pull requests | Repository Actions workflow-permissions API. Individual release permissions remain job-scoped in workflow files. |
| Issue/update labels | Present | `accessibility`, `needs-triage`, `dependencies`, `security`, and `github-actions` were created for committed forms/automation. |
| Open issues and pull requests | Zero open issues; six open Dependabot pull requests (#17, #18, #19, #20, #22, and #23) on 2026-08-11 | Repository-scoped reads found no published release-remediation issue or candidate pull request. The automated dependency pull requests target the stale hosted branch and must be reconciled with the candidate lockfile after publication. |
| `main` branch protection and required checks | **Pending** | The branch is currently unprotected. Configure it only after the new workflow checks exist on GitHub, then record the exact required-check names here. |

## Production environment

| Control | Current result | Completion condition |
| --- | --- | --- |
| Canonical URL | <https://randomander.vercel.app/> returned the Randomander application shell on 2026-08-11. | Record the immutable deployment URL and release commit. |
| Repository deployment policy | `vercel.json`, `vite.config.ts`, `docs/deployment.md`, and `scripts/smoke-deployment.mjs` define the root-hosted policy. | Promote a build containing those files. |
| Security/cache headers | **Pending production promotion.** The 2026-08-11 smoke still found HSTS but no CSP, `X-Content-Type-Options`, frame header, Referrer-Policy, Permissions-Policy, or Cross-Origin-Opener-Policy. | `npm run smoke:deployment -- https://randomander.vercel.app` must pass after promotion. |
| Preview and rollback | **Pending owner-hosted verification.** | Record the tested preview URL, production promotion, previous immutable deployment, rollback drill, and re-promotion. |

## Automated evidence commands

### Final local working-tree snapshot (2026-08-11)

These results were produced after a clean dependency install on the stable local working tree. They are strong candidate evidence, but they are not immutable release evidence until the same tree is committed and the commands pass from that exact clean checkout in hosted CI.

| Gate | Result |
| --- | --- |
| Dependency install/tree | Node 24.11.1 + npm 11.6.2 `npm ci` passed; 322 packages installed; `npm ls --all` valid. |
| Node 24 | Test-source typecheck, 33 Vitest files / 274 tests, coverage, and production build passed. |
| Node 22 | Node 22.22.0 + npm 11.6.2 test-source typecheck, 33 Vitest files / 274 tests, and production build passed. |
| Coverage | 88.95% statements, 82.98% branches, 94.89% functions, 88.95% lines; every floor passed. |
| Browser matrix | Exact responsive Chromium/WebKit 2/2 and full Playwright 32/32 across desktop/mobile/responsive Chromium, Firefox, and WebKit. The deterministic Firefox timeout/retry case also passed 20/20 with five workers. |
| Production output | 734 modules; production-policy scan passed over 13 text assets; nine JS chunks total 85.38 KiB gzip, largest 69.49 KiB, CSS 9.88 KiB. |
| Security/supply chain | Full and production npm audits: zero vulnerabilities; secret scan: 140 nonignored files plus Git history; license inventory: 399 packages / zero unknown; CycloneDX 1.5 SBOM: 393 components. |
| Workflow/repository integrity | Four workflow YAML files parsed; all 19 action uses were 40-character SHA-pinned and their tags remotely verified; `git diff --check` passed. |

The generated SBOM still identifies the root package as `0.0.0`, the project license is absent, and the current candidate spans an uncommitted working tree. Repeat and retain every gate after the owner-approved version/license changes and final commit.

Run these from a clean checkout of the release commit on Node 22 and Node 24 as applicable. CI retains coverage, Playwright reports/traces, SBOM, and license inventory artifacts.

```bash
npm ci
npm run security:audit
npm run security:secrets
npm run typecheck:test
npm run test:coverage
npm run build
npm run test:e2e
npm run license:inventory
npm sbom --package-lock-only --sbom-format=cyclonedx --sbom-type=application
```

The signed release record must add the exact run URLs, artifact checksums,
production/rollback deployment URLs, manual assistive-technology results, and
owner/legal decisions required by [the release checklist](release-checklist.md).
Start from the [manual release evidence template](manual-release-evidence-template.md)
so the candidate identity, device/browser versions, results, artifacts, and
named sign-offs are recorded consistently.
