# Manual release evidence template

Copy this file for each release candidate and replace every `TBD`. A manual
check is not complete when it is merely attempted: record the exact build,
environment, result, evidence, and reviewer. Do not paste browser-storage
contents, card names from a personal library, IP addresses, account details, or
other user data into release evidence.

## Candidate identity

| Field | Evidence |
| --- | --- |
| Version and tag | `TBD` |
| Git commit SHA | `TBD` |
| GitHub Actions run | `TBD` |
| Immutable preview deployment | `TBD` |
| Immutable production deployment | `TBD` |
| Previous known-good deployment | `TBD` |
| Test window (UTC) | `TBD` |
| Release owner | `TBD` |

## Product and live-safe contracts

Live checks must be bounded to ordinary interactive use. Do not load test
Scryfall or EDHREC. Automated EDHREC JSON metadata must remain disabled in a
public build unless its separate service-terms gate has been approved.

| Check | Environment | Result | Evidence / notes | Reviewer and date |
| --- | --- | --- | --- | --- |
| Commander draw and retry | `TBD` | `TBD` | `TBD` | `TBD` |
| Legal Partner pair, including one mechanic-specific pair | `TBD` | `TBD` | `TBD` | `TBD` |
| Three-card Spark | `TBD` | `TBD` | `TBD` | `TBD` |
| Choice completion and double-faced-card controls | `TBD` | `TBD` | `TBD` | `TBD` |
| Save, reload, load, remove, capacity choice, and confirmed clear | `TBD` | `TBD` | `TBD` | `TBD` |
| Timeout, cancellation, upstream error, and successful recovery | `TBD` | `TBD` | `TBD` | `TBD` |
| Bounded Scryfall minimum-schema contract | `TBD` | `TBD` | `TBD` | `TBD` |
| Approved EDHREC behavior or verified default-off state | `TBD` | `TBD` | `TBD` | `TBD` |

## Layout, browser, and device matrix

Record the physical device when one is used; otherwise name the browser's
emulation profile. Test portrait and landscape where supported. “No horizontal
overflow” includes transformed card edges and double-faced-card controls.

| Platform / viewport | Browser and OS version | Zoom / text size | Result | Artifact / notes | Reviewer and date |
| --- | --- | --- | --- | --- | --- |
| 320 CSS px phone | `TBD` | 100% and 200% | `TBD` | `TBD` | `TBD` |
| 375 CSS px iPhone | `TBD` | 100% and 200% | `TBD` | `TBD` | `TBD` |
| 390 CSS px iPhone | `TBD` | 100% and 200% | `TBD` | `TBD` | `TBD` |
| Android phone | `TBD` | Default and largest practical text | `TBD` | `TBD` | `TBD` |
| Desktop Chromium | `TBD` | 100% and 200% | `TBD` | `TBD` | `TBD` |
| Desktop Firefox | `TBD` | 100% and 200% | `TBD` | `TBD` | `TBD` |
| Desktop Safari | `TBD` | 100% and 200% | `TBD` | `TBD` | `TBD` |
| iOS safe areas and orientation change | `TBD` | Default | `TBD` | `TBD` | `TBD` |
| Slow card-image loading / images blocked | `TBD` | Default | `TBD` | `TBD` | `TBD` |
| Reduced motion and forced colors / high contrast | `TBD` | Default | `TBD` | `TBD` | `TBD` |

For each row, exercise a single card, a pair, a choice pair, a long card name,
and a double-faced card. Verify card identity/rules remain available without
images, controls remain operable, and the page has no horizontal scrolling.

## Assistive technology

Use the screen reader's normal browse/heading navigation and keyboard or touch
gestures. Record unexpected verbosity, silence, duplicate announcements, focus
loss, or background interaction even if the task can eventually be completed.

| Combination | Result and observed announcement/focus behavior | Artifact / notes | Reviewer and date |
| --- | --- | --- | --- |
| VoiceOver + Safari on macOS | `TBD` | `TBD` | `TBD` |
| VoiceOver + Safari on iOS | `TBD` | `TBD` | `TBD` |
| NVDA + Firefox or Chromium on Windows | `TBD` | `TBD` | `TBD` |
| TalkBack + Chrome on Android | `TBD` | `TBD` | `TBD` |

Each combination must cover the page heading and mode guidance, result and
card-rules announcements, focus order, Options/History/Saved/Settings dialogs,
nested confirmation, topmost-only Escape where applicable, loading/cancel,
errors/retry, and reduced-motion behavior.

## Storage, lifecycle, and recovery

Use synthetic fixture records rather than a real personal library. For quota
testing, operate only in a disposable browser profile.

| Check | Browser / setup | Result | Evidence / notes | Reviewer and date |
| --- | --- | --- | --- | --- |
| Storage getter blocked / private-browsing restriction | `TBD` | `TBD` | `TBD` | `TBD` |
| Read, write, and remove throw independently | `TBD` | `TBD` | `TBD` | `TBD` |
| Quota exhaustion, one cache-eviction retry, and visible recovery | `TBD` | `TBD` | `TBD` | `TBD` |
| Malformed JSON, wrong-shape state, and supported legacy migration | `TBD` | `TBD` | `TBD` | `TBD` |
| Maximum 40 History + 40 Saved + bounded cache reloads durably | `TBD` | `TBD` | `TBD` | `TBD` |
| Clear cache versus clear all local data | `TBD` | `TBD` | `TBD` | `TBD` |
| Two-tab save/remove/clear reconciliation | `TBD` | `TBD` | `TBD` | `TBD` |
| Offline failure followed by immediate online recovery | `TBD` | `TBD` | `TBD` | `TBD` |

## Production policy and rollback

| Check | Result | Evidence / notes | Reviewer and date |
| --- | --- | --- | --- |
| TLS and HTTP-to-HTTPS redirect | `TBD` | `TBD` | `TBD` |
| Root and deep-link navigation | `TBD` | `TBD` | `TBD` |
| CSP and all required security headers | `TBD` | `TBD` | `TBD` |
| HTML no-cache and hashed-asset immutable cache policy | `TBD` | `TBD` | `TBD` |
| Production network origins match approved privacy/service policy | `TBD` | `TBD` | `TBD` |
| Analytics enabled/disabled state and DNT/consent behavior match decision | `TBD` | `TBD` | `TBD` |
| Preview promoted from the recorded immutable deployment | `TBD` | `TBD` | `TBD` |
| Roll back to the recorded known-good deployment | `TBD` | `TBD` | `TBD` |
| Re-promote the candidate and rerun smoke | `TBD` | `TBD` | `TBD` |

Attach the complete output of:

```bash
npm run smoke:deployment -- https://randomander.vercel.app
```

## Hosted repository controls

| Check | Result | Evidence / notes | Reviewer and date |
| --- | --- | --- | --- |
| `main` protection and exact required checks | `TBD` | `TBD` | `TBD` |
| Read-only default Actions token and reviewed job-level grants | `TBD` | `TBD` | `TBD` |
| Secret scanning and push protection | `TBD` | `TBD` | `TBD` |
| Private vulnerability reporting | `TBD` | `TBD` | `TBD` |
| Dependabot alerts/security updates | `TBD` | `TBD` | `TBD` |
| Maintainer and deployment permissions | `TBD` | `TBD` | `TBD` |
| Immutable release-tag protection | `TBD` | `TBD` | `TBD` |

## Owner and legal decisions

Link to a durable approval record; do not infer approval from silence.

| Decision | Approved value / scope | Approval record | Owner and date |
| --- | --- | --- | --- |
| Project license and copyright holder | `TBD` | `TBD` | `TBD` |
| Privacy controller/contact and target jurisdictions | `TBD` | `TBD` | `TBD` |
| Analytics purpose, retention, consent/opt-out/DNT posture | `TBD` | `TBD` | `TBD` |
| EDHREC automated metadata permission or default-off decision | `TBD` | `TBD` | `TBD` |
| Scryfall image/access compliance | `TBD` | `TBD` | `TBD` |
| Wizards fan-content and marketplace-link posture | `TBD` | `TBD` | `TBD` |
| Third-party notices | `TBD` | `TBD` | `TBD` |

## Final decision

| Field | Value |
| --- | --- |
| Unresolved P0/P1 items | `TBD` |
| Accepted P2 risks, named owner, mitigation, and review date | `TBD` |
| Known limitations | `TBD` |
| Support owner and monitoring window | `TBD` |
| Release decision (`GO` / `NO-GO`) | `TBD` |
| Release owner signature and UTC timestamp | `TBD` |

