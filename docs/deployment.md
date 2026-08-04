# Deployment and rollback

Randomander is a root-hosted Vite application deployed on Vercel.

## Environments

| Environment | Address | Accountable owner | Purpose |
| --- | --- | --- | --- |
| Production | <https://randomander.vercel.app/> | Project owner (`kmcgarry1`) through the authorized Vercel project | Canonical public release; verified live on 2026-08-03. |
| Preview | Vercel URL attached to each pull request/deployment | Pull-request author, with promotion controlled by the project owner | Browser, accessibility, CSP, and release-candidate validation before promotion. |

The application deliberately uses Vite `base: '/'`. Subpath hosting is not supported by the 1.0 deployment contract.

## Build contract

- Node 22 or 24 and the npm version pinned in `package.json`.
- Clean install with `npm ci`.
- Production bundle with `npm run build`; output is `dist/`.
- Analytics is off unless the production build explicitly sets `VITE_ENABLE_ANALYTICS=true` after privacy approval.
- No application API keys are required.

`vercel.json` is the authoritative hosting configuration. It defines the build/output, root hosting, CSP and response headers, HTML revalidation, and immutable caching for hashed assets.

## Promotion checklist

1. Confirm the commit passed unit/integration, test type-check, coverage, browser E2E, audit, and production build gates.
2. Inspect the preview network log. Only documented Scryfall, EDHREC, Vercel Analytics (when enabled), and same-origin requests are permitted.
3. Run `npm run smoke:deployment -- <preview-url>` and complete the manual browser/assistive-technology matrix.
4. Promote that exact Vercel deployment to the production alias; do not rebuild a different commit for production.
5. Run the smoke command against <https://randomander.vercel.app/> and record the deployment URL, commit, checks, and rollback target in the GitHub release.

## Rollback

1. Identify the last known-good immutable deployment recorded in the previous GitHub release.
2. In Vercel, promote that deployment to the production alias. Do not force-push, delete deployments, or rebuild an old working tree.
3. Run the deployment smoke and one mocked/live-safe draw check.
4. Record the rollback reason, affected release, restored deployment, and follow-up issue.

If the failure involves unsafe client behavior, privacy, or vulnerable dependencies, take the production alias back to the known-good deployment before investigating forward fixes.

## Manual host verification

Before 1.0, verify in the Vercel project and GitHub repository that preview access, production ownership, deployment permissions, environment variables, branch protection, required checks, retention, and rollback permissions match the documented policy. These hosted settings cannot be proven by repository files alone.
