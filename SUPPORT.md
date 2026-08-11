# Support policy

Randomander is a client-side card-inspiration tool maintained as a focused project. Community reports are welcome, but support is best-effort and does not promise real-time response.

## Before opening an issue

1. Check the [user guide](docs/user-guide.md) and [troubleshooting guide](docs/troubleshooting.md).
2. Reload once and determine whether Scryfall is experiencing an outage.
3. Reproduce with the current release or default branch.
4. Search open and closed issues for the same behavior.

## Where a report belongs

- **Application bug:** use the bug form for reproducible Randomander behavior.
- **Accessibility problem:** use the accessibility form and describe the assistive technology or input method.
- **Feature request:** use the feature form and explain the user outcome, not only a proposed implementation.
- **Documentation problem:** use the documentation form.
- **Security concern:** follow [SECURITY.md](SECURITY.md); never report it publicly.
- **Upstream outage or incorrect card data:** check Scryfall first. Open a Randomander bug only if the app handles the response incorrectly. EDHREC is a user-selected outbound destination in the public build, not an automated metadata dependency.
- **Magic rules question:** use an appropriate Magic rules resource unless Randomander is generating a pair that its own supported-mechanics contract says is illegal.

## Supported information

Include the mode, active filters, browser/OS, viewport if relevant, exact steps, expected result, actual result, and a redacted screenshot when useful. Console messages may be included after removing identifiers and personal data.

Do not post browser-storage exports, saved-pull collections, analytics identifiers, secrets, cookies, or authentication material.

## Current boundaries

Randomander requires Scryfall network access for new draws and has no account or cross-device sync. The public build does not automate EDHREC metadata requests; validated outbound links may still be unavailable for some cards or pairs. Browser extensions, unsupported browsers, modified builds, and upstream service policy questions may be closed as unsupported after guidance is provided.
