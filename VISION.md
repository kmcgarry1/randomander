# Vision and goals

This document captures the Randomander concept, the player problem it addresses, and the principles that guide product decisions. Current behavior is documented in the [User guide](docs/user-guide.md); implementation details belong in [Architecture](docs/architecture.md).

## Idea

- Randomander is a lightweight browser experience that uses live Scryfall data to find Commander-legal cards and compatible pairings, with optional user-initiated EDHREC inspiration links.
- It offers three levels of creative constraint: one commander, a rules-aware partner/background pair, or a loose three-card spark.
- It keeps preferences, recent pulls, and saved ideas in local browser storage so discovery does not require an account. New draws still require network access.

## Goals

1. **Make discovery playful** — Keep the path from opening the app to seeing an intriguing result short, tactile, and repeatable.
2. **Respect Commander rules that shape the idea** — Model partner-style mechanics, combined color identity, and Backgrounds in both directions well enough that a result is a useful starting point.
3. **Add context without burying the cards** — Keep card details and validated external inspiration links supplemental to the result, never blockers for the core reveal.
4. **Work at phone scale first** — Keep the primary action reachable, make dense controls collapsible, and preserve focus, reduced-motion, and safe-area behavior.
5. **Protect personal context** — Make History, Saved pulls, cache controls, and destructive clear actions predictable within their local-only scope.
6. **Stay maintainable** — Keep upstream adapters, pure card helpers, UI components, and workflow state separated enough for focused tests and contributions.

## Success signals

- A first-time user can understand the three modes, randomize, and reach useful result context without instruction.
- Choice mode makes two ideas genuinely comparable, including independent pair details and links rather than a combined block.
- A Background result works as naturally as drawing its compatible commander first.
- The Draw surface remains comfortable on a narrow phone without sacrificing the desktop comparison layout.
- History and Saved pulls make good ideas easy to revisit on the same device.
- Tests and production builds pass before releases, and external-service failures degrade into clear, recoverable states.

## Current boundaries

Randomander is an inspiration tool, not a deck builder or Magic rules engine. It currently has no account, cloud sync, sharing/export workflow, repository-owned backend, or guaranteed offline draw path. Scryfall availability and schema remain live dependencies. The public build treats EDHREC only as a user-selected outbound destination unless a future release records separate permission and privacy approval.
