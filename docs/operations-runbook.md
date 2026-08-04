# Operations and upstream-outage runbook

Randomander is a static client application with direct browser dependencies on Scryfall and, only when separately approved/enabled, EDHREC metadata. The project has no application server, account database, or remote copy of local History/Saved data.

## Monitoring and ownership

- The `Production smoke` GitHub Actions workflow checks the canonical deployment daily and on demand. It validates HTTP-to-HTTPS redirection, the app shell, CSP/security headers, HTML and hashed-asset caching, and the privacy page.
- The project owner (`kmcgarry1`) owns the canonical Vercel deployment and subscribes to failed default-branch workflow notifications before 1.0. GitHub notification delivery is a hosted setting and must be verified manually.
- A release monitoring window starts at promotion and lasts at least 24 hours. Record the named watcher and handoff in the GitHub release.
- Browser-side diagnostic instrumentation, if enabled later, may record only aggregate failure class, latency, request count, timeout/cancellation, and storage quota class. Never emit card names/IDs, filters, History/Saved content, full URLs containing card identifiers, storage values, IP addresses, or stable user/device identifiers.

The synthetic smoke proves availability and deployment policy, not the live legality/content behavior of every upstream integration.

## Triage sequence

1. Confirm whether the failure is the production shell/policy, Scryfall, approved EDHREC metadata, or a browser-specific client regression.
2. Record UTC time, release/tag/commit, immutable Vercel deployment URL, affected browser class, and the privacy-safe error category. Do not request or copy a user's browser-storage dump.
3. Check the relevant public upstream status/support channel and one bounded request. Do not load-test or repeatedly retry an upstream.
4. If only optional metadata is affected, keep valid Scryfall results usable, disable or leave metadata default-off, expose retry, and post a support note if the outage is material.
5. If draws are unsafe, unbounded, privacy-impacting, or the shell/security policy is broken, promote the last known-good immutable deployment using [the rollback procedure](deployment.md#rollback).
6. Run the production smoke and one bounded mocked/live-safe draw after recovery. Open a follow-up issue with redacted evidence and update the incident/release record.

## Failure classes

| Class | Expected user behavior | Operator action |
| --- | --- | --- |
| Scryfall 429/cooldown | Stop immediately; show upstream failure/cooldown; allow retry only after the bounded interval. | Do not bypass or retry through the limit. Review request counts and recent releases. |
| Scryfall 4xx/5xx/network | Preserve any prior valid result; distinguish upstream failure; permit a later retry. | Confirm upstream status with one bounded check. Roll back if a client release multiplied traffic. |
| EDHREC unavailable | A valid card remains valid; metadata shows error/retry, never false empty content. | Keep automated metadata off unless approved; if enabled, respect permission/rate conditions and disable on sustained failure. |
| Browser storage blocked/full | Continue in memory; clearly state changes are not durable and offer a retry/clear-data path. | Do not solicit stored payloads. Link troubleshooting and test the quota/security boundary. |
| CSP/header/cache smoke failure | Treat as deployment-policy regression. | Stop promotion or roll back immediately; do not weaken the smoke to match a bad deployment. |
| Accessibility/layout regression | Preserve report details without personal data and identify affected input/AT/browser. | Roll back when a critical flow is blocked; otherwise provide an owner/timeline and validate with the affected AT. |

## Incident record

Record:

- start/detection/recovery times in UTC;
- detecting workflow or report, release tag, commit, and deployment URL;
- privacy-safe symptoms and impact;
- upstream/client/deployment classification;
- mitigations, rollback and restored deployment URLs;
- smoke/manual recovery evidence;
- follow-up owner and review date.

Do not put secrets, raw request headers, full localStorage, card/history payloads, or reporter personal data in a public incident issue.
