# Security policy

## Supported versions

Until Randomander 1.0 is published, security fixes are made on the default branch only. After 1.0, the latest released minor version is supported; older releases may be asked to upgrade before a fix is provided.

## Report a vulnerability privately

Do not open a public issue for a suspected vulnerability or include secrets, browser-storage contents, private URLs, or personal data in a report.

Use GitHub's private vulnerability reporting flow from the repository **Security** tab. If that option is unavailable, contact the repository owner through their GitHub profile and ask for a private reporting channel without disclosing the vulnerability details publicly.

Include only the information needed to reproduce and assess the problem:

- affected commit, version, and deployed URL;
- browser/OS and the relevant feature or integration;
- impact and realistic attack scenario;
- minimal reproduction steps or proof of concept;
- known mitigations or workarounds.

Never include a full `localStorage` dump. Redact card history, saved pulls, tokens, cookies, request identifiers, and account information.

## Response process

The project targets an initial acknowledgement within five business days and a substantive status update within ten business days. Timing may vary for a volunteer-maintained project, but reporters will be told when scope or timing changes.

The maintainer will validate severity, coordinate a fix and release, credit the reporter if requested, and agree on a disclosure date. Please allow a reasonable remediation period before public disclosure.

## Out of scope

- availability or content failures wholly within Scryfall, EDHREC, marketplace, font, analytics, or hosting services;
- self-XSS that requires pasting code into developer tools;
- reports produced only by automated scanners without a reproducible impact;
- denial-of-service load testing against Randomander or its upstream services;
- card-rules disagreements with no security impact.
