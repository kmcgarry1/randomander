# Vision & Goals

This document captures the Randomander concept, the user itch it scratches, and the product goals we are pursuing with each release.

## Idea
- Randomander is a lightweight local web app that randomizes Commander-compatible Magic: The Gathering cards using Scryfall metadata plus optional EDHREC insights.
- Players can riff on formats (commander, partner pairs, 3-card sparks) without leaving their browser, while still seeing links to card art, Scryfall/EDHREC references, and partner/companion context.
- By keeping state in Pinia + localStorage, it works offline, respects privacy, and lets the user revisit favorite pulls via history/saved collections.

## Goals
1. **Make discovery playful** – Provide an immersive hero stage with instant randomization paired with handy actions (partner companion buttons, filters, history load/save).
2. **Surface trustworthy info** – Combine Scryfall card data with EDHREC commander links, color identity chips, and partner-friendly defaults so users understand each pull at a glance.
3. **Stay responsive** – Lean on Vite + Vue 3 for fast updates, cached requests, and predictable render patterns in `DrawView`, `HistoryView`, `SavedView`, and `SettingsView`.
4. **Protect context** – Persist history/saved entries up to 40 records, let users clear/reset, and run cache/persistence helpers (`randomander:state:v2`) without accidental data loss.
5. **Enable future contributions** – Keep helpers (`src/lib/*`, `src/services/*`) modular so future features (e.g., more filters or deck-building exports) can plug in cleanly.

## Success signals
- Users rotate through modes quickly, with `DrawView` actively showing Scryfall art, companion combos, and quick-access actions.
- History and saved views are approachable: people can reload favorite pulls and share them (e.g., copy/paste card combinations).
- Tests, lint, and build scripts pass before releases so the idea remains polished and reliable.
