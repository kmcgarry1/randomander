# Release checklist

This is the evidence checklist for promoting Randomander 1.0 and later releases. A checked box must link to authoritative output, a deployment, or an owner decision; intent is not evidence. Record the manual and hosted checks in a copy of the [manual release evidence template](manual-release-evidence-template.md).

## Code and automated gates

- [ ] Package version and `vX.Y.Z` tag agree; changelog has a dated matching section.
- [ ] Clean `npm ci` succeeds on supported Node 22 and 24.
- [ ] Production and test-source type-checks pass.
- [ ] Unit/integration tests and risk-based coverage thresholds pass.
- [ ] Chromium, Firefox, WebKit, desktop, and phone E2E projects pass with retained trace/screenshot evidence.
- [ ] `npm audit --audit-level=high` and production-only audit report no high/critical findings.
- [ ] Secret baseline, Dependency Review, SBOM, and license inventory gates pass.
- [ ] Production build succeeds and the bundle budget is reviewed.

## Product and accessibility

- [ ] Commander, Partner, Spark, choice, History, Saved, settings, errors, timeout, cancellation, and recovery flows pass.
- [ ] 320/375/390 px, 200% zoom, long text, DFC, slow image, and reduced-motion checks pass.
- [ ] VoiceOver/Safari, NVDA/Firefox or Chromium, and TalkBack/Chrome checks cover headings, result announcements, card rules, dialogs, focus restoration, and errors.
- [ ] Product owner accepts filter semantics, Saved capacity, terminology, first-use guidance, and known limitations.

## Deployment and operations

- [ ] The exact release commit is present in the promoted Vercel deployment.
- [ ] `npm run smoke:deployment -- https://randomander.vercel.app` passes after promotion.
- [ ] TLS, redirects, CSP, security headers, HTML/assets cache behavior, privacy page, analytics setting, and upstream origins match policy.
- [ ] Synthetic availability check, alert owner, upstream-status procedure, and rollback target are recorded.
- [ ] A rollback drill has promoted and re-promoted an immutable deployment successfully.

## Repository and governance

- [ ] Required CI/security checks and branch protection are enabled for `main`.
- [ ] Secret scanning, push protection, private vulnerability reporting, and Dependabot security updates are enabled.
- [ ] SECURITY, SUPPORT, issue forms, license, third-party notices, privacy notice, and fan-content/service review are owner-approved.
- [ ] No unresolved P0/P1 readiness item remains; every accepted P2 risk has an owner, rationale, mitigation, and review date.

## Release evidence

- [ ] GitHub release identifies tag, commit, changelog, production deployment, checks, SBOM, license inventory, known limitations, and rollback deployment.
- [ ] Support owner and monitoring window are named.
- [ ] The previous known-good release remains recoverable.
