# randomander

Randomander is a local, Vue 3 + TypeScript + Vite experience for exploring Commander-legal cards. It pulls suggestions from Scryfall and EDHREC while letting you randomize commander pairings, companion candidates, and three-card sparks with history, saved pulls, and display options.

## Features
- **Draw modes** – Cycle between *Commander*, *Partner pair*, and *Spark* (3-card randomizer) pulls while filtering by color count, selected color identities, deck limits, or ranked cutoffs.
- **Hero stage + controls** – The `DrawView` adds details (images, titles, partner names) plus links to Scryfall/EDHREC, quick randomize buttons, and controls for mode, history, settings, and display adjustments.
- **Persistence layers** – History and saved pulls are stored locally (`randomander:state:v2`), capped to 40 entries each, and include summaries of mode, colors, chips, companions, and cached metadata.
- **Supporting views** – `HistoryView` lets you load or save past pulls, `SavedView` keeps curated records, and `SettingsView` lets you fine-tune display, caching, and theme preferences.

## Getting started
1. Install dependencies with `npm install`.
2. Run `npm run dev` to start Vite’s dev server and preview in the browser.
3. Use `npm run test` for the Vitest suite and `npm run build` (Vue TSC + Vite) before releases.
4. Preview a production build with `npm run preview` if needed.

## Project structure highlights
- `src/app/AppShell.vue` and `src/App.vue` orchestrate the main layout and view switching logic.
- `src/features/*` contains view-specific components plus composables (e.g., `draw/composables/useHeroSummary.ts`) that shape the hero data and filters.
- `src/stores/randomander.ts` is the Pinia store that drives random draws, caching, saved/history logic, and persistence helpers.
- `src/lib` and `src/services` host Scryfall/EDHREC helpers, HTTP wrappers, caching, and storage utilities.
- Tests live under `src/__tests__`; run them with `npm run test`.

## Notes for agents
Follow the repository’s `AGENTS.md` whenever contributing or describing behavior; it covers agent expectations, verification rules, and workspace context.
