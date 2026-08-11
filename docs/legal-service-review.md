# Legal and external-service release review

**Technical review date:** 2026-08-03  
**Approval status:** Owner/legal approval required before 1.0  
**Scope:** This records implementation facts and public service-policy constraints. It is not legal advice and does not replace advice for the operator's target jurisdictions.

## Release decisions

| Area | Technical finding | Required 1.0 decision |
| --- | --- | --- |
| Project source license | The repository has no source license. Dependency licenses do not license Randomander's own code. | The owner must select and approve a `LICENSE`; package metadata, README, and contribution language must match it. |
| Wizards fan content | Randomander uses Magic card names, text, symbols, and images and must remain free and clearly unofficial under the [Wizards Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy). | Approve the fan-content posture and notice. Do not paywall the application or imply Wizards endorsement. |
| Scryfall data/images | The [Scryfall API rules](https://scryfall.com/docs/api#use-of-scryfall-data-and-images) permit value-added Magic software subject to access and image-handling conditions. | Keep the product free/value-added, retain Scryfall attribution/navigation, and ship only after the image/rate-limit checks below pass. |
| EDHREC metadata | The [EDHREC Terms of Service](https://edhrec.com/terms) prohibit software/automated agents or scripts from generating automated searches, requests, or queries. No official public-API permission for `json.edhrec.com` was found in the linked terms, FAQ, or guide during this review. | Do not enable automated EDHREC JSON metadata in the public 1.0 build without written permission or owner-approved legal advice establishing another basis. User-initiated outbound links may remain. |
| Marketplace links | Randomander displays only allowlisted purchase URLs supplied by Scryfall and does not process a purchase or claim its own affiliate relationship. | Approve that description; disclose any future operator affiliate arrangement before enabling it. |
| Analytics/privacy | [Vercel Web Analytics](https://vercel.com/docs/analytics/privacy-policy) is cookieless/aggregated but still processes page/referrer, approximate location, browser/OS, and device information; reporting retention can vary by plan. | Analytics is disabled and rejected by the 1.0 production-policy scan. Enabling it requires controller/contact, jurisdiction, lawful-basis/consent or opt-out, retention, CSP, notice, and scanner decisions to be owner-approved together. |
| Fonts | Google Fonts was removed; the shipped application uses system fonts. | Confirm production has no third-party font request. |

## Scryfall implementation checklist

Scryfall's current API documentation asks browser clients to retain the browser User-Agent, send an Accept header, remain below 10 requests per second, avoid retrying through rate limits, add user value, and present card images without covering, cropping, distorting, blurring, sharpening, desaturating, or color-shifting them.

- [x] Browser requests retain the browser User-Agent and use HTTPS.
- [x] The browser supplies an Accept header; the app does not attempt to replace its protected User-Agent.
- [x] Request starts are paced at 150 ms (below 10 requests per second).
- [x] One draw has a shared 24-call/10-second ceiling and stops immediately on transport/rate-limit failures.
- [x] HTTP 429 creates a bounded cooldown instead of a retry-through loop.
- [ ] Browser evidence proves every displayed card image is contained at its native aspect ratio, unobscured, and visually unmodified.
- [ ] The former blurred/cropped `art_crop` backdrop is absent from the production bundle and network log.
- [ ] Scryfall attribution and the upstream card-page links are present and URL-allowlisted.

## Fan-content notice

The following proposed substance still requires owner approval before use as final legal wording:

> Randomander is unofficial fan content permitted under Wizards of the Coast's Fan Content Policy. Wizards does not approve or endorse it. Some materials are property of Wizards of the Coast LLC. © Wizards of the Coast LLC.

The Randomander “R” mark must not imitate a Wizards, Magic, or set logo. Card images and mana symbols must retain their original notices and must not be presented as Randomander-owned art.

## EDHREC release gate

The repository retains an internal EDHREC adapter for deterministic contract tests and any future separately approved integration. If enabled, it derives commander/pair identifiers and requests `https://json.edhrec.com/pages/commanders/*.json` for deck counts and themes. Those requests would be automated even though they originate in each visitor's browser; caching, throttling, and a low call count would not by themselves supply permission.

The 1.0 implementation uses the default-off option: public builds compile the automated adapter and endpoint out, force the deck-count filter and metadata display off, retain only validated user-initiated EDHREC links, and fail the production build if an EDHREC JSON endpoint appears in `dist`. The release owner must still approve that boundary and the accompanying notice.

Any future change must use one of these recorded bases:

1. **Default-off (recommended until permission):** compile automated EDHREC metadata out of the public build, keep safe outbound EDHREC links, and explain that metadata can be enabled only after approval.
2. **Written permission:** retain the approval and any rate, attribution, endpoint, caching, or revocation conditions with the release record.
3. **Owner-approved legal conclusion:** record the responsible reviewer, rationale, scope, compensating controls, and review date.

Silence or the technical accessibility of an endpoint is not release approval.

## Privacy/controller approval fields

The owner-approved privacy notice still needs these deployment-specific facts before 1.0:

- controller/operator name or role and a durable contact route;
- target jurisdictions and age/audience posture;
- analytics enabled/disabled decision, retention, opt-out/consent/DNT handling;
- Vercel deployment-log/analytics retention and deletion procedure;
- confirmation that local History/Saved/settings are not transmitted by Randomander;
- incident/privacy request handling route and review date.

Record the approval, reviewer, date, and any future-review trigger in the release evidence. Do not mark the legal/privacy gate complete solely because a draft notice exists.
