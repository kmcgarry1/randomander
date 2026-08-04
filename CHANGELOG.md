# Changelog

All notable user-visible changes to Randomander are documented here. The project follows [Semantic Versioning](https://semver.org/) from 1.0 onward.

## [Unreleased]

### Added

- Semantic in-app card rules text, including double-faced and empty-rules handling.
- Typed browser-storage health, cache byte budgeting, and visible persistence recovery.
- Uniform ranked sampling and centralized partner-legality contracts.
- Request deadlines, cancellation, and workflow-wide request budgeting.
- Real-browser, accessibility, coverage, supply-chain, deployment, privacy, security, and support release controls.

### Changed

- History and Saved pulls are immutable snapshots.
- EDHREC identifiers are Unicode-safe and large responses are normalized before caching.
- External navigation uses HTTPS host allowlists.
- Node 22 and 24 are the supported development/CI runtimes.
- Analytics is disabled by default and third-party font loading was removed.

### Security

- Updated the dependency graph to clear all high and critical npm advisories.
- Added CSP/security headers, dependency review, secret-pattern scanning, SBOM generation, and hardened CI permissions/action pins.

## Release policy

- Patch releases contain backwards-compatible fixes.
- Minor releases add backwards-compatible capabilities.
- Major releases may change persisted data, public behavior, or support boundaries and require migration notes.
- Only the latest minor release receives routine support; critical fixes may be backported at the maintainer's discretion.

[Unreleased]: https://github.com/kmcgarry1/randomander/compare/v1.0.0...HEAD
