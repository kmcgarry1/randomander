# Release evidence

This file records reproducible evidence for the Randomander 1.0 release candidate. A repository file can document a check, but hosted/deployment rows are not complete until the referenced release commit is present on the remote and in production.

## Hosted repository controls

Verified against `kmcgarry1/randomander` on 2026-08-03 with authenticated GitHub API reads after applying the listed settings.

| Control | Result | Evidence boundary |
| --- | --- | --- |
| Repository visibility and default branch | Public; `main` | GitHub repository metadata. |
| Secret scanning | Enabled; zero open alerts at verification time | `security_and_analysis.secret_scanning.status` plus the authenticated secret-scanning alerts API. The local scanner also inspected tracked files and all Git patches without printing candidate values. |
| Secret push protection | Enabled | `security_and_analysis.secret_scanning_push_protection.status`. |
| Dependabot alerts and security updates | Enabled | Vulnerability-alerts API succeeds and `dependabot_security_updates.status` is `enabled`. |
| Private vulnerability reporting | Enabled | Private-vulnerability-reporting API returns `enabled: true`; the issue-form contact link is now usable. |
| Default Actions token | Read-only; cannot approve pull requests | Repository Actions workflow-permissions API. Individual release permissions remain job-scoped in workflow files. |
| Issue/update labels | Present | `accessibility`, `needs-triage`, `dependencies`, `security`, and `github-actions` were created for committed forms/automation. |
| `main` branch protection and required checks | **Pending** | The branch is currently unprotected. Configure it only after the new workflow checks exist on GitHub, then record the exact required-check names here. |

## Production environment

| Control | Current result | Completion condition |
| --- | --- | --- |
| Canonical URL | <https://randomander.vercel.app/> returned the Randomander application shell on 2026-08-03. | Record the immutable deployment URL and release commit. |
| Repository deployment policy | `vercel.json`, `vite.config.ts`, `docs/deployment.md`, and `scripts/smoke-deployment.mjs` define the root-hosted policy. | Promote a build containing those files. |
| Security/cache headers | **Pending production promotion.** The 2026-08-03 pre-change smoke found HSTS but no CSP, `X-Content-Type-Options`, frame header, Referrer-Policy, Permissions-Policy, or Cross-Origin-Opener-Policy. | `npm run smoke:deployment -- https://randomander.vercel.app` must pass after promotion. |
| Preview and rollback | **Pending owner-hosted verification.** | Record the tested preview URL, production promotion, previous immutable deployment, rollback drill, and re-promotion. |

## Automated evidence commands

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
