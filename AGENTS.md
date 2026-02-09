# AGENTS instructions for randomander

## Purpose
This file captures expectations for AI agents working in `randomander`. Treat it as the single source for repository-specific reminders after honoring the system/developer guidance.

## Core principles
- Honor the system/developer directions first. They define tone, safety, citation, browsing, and verification expectations.
- Respect the skill guidance listed in `skill-creator` and `skill-installer`. If any skill is mentioned (plain text or `$SkillName`), read its `SKILL.md`, follow the workflow, and mention which skill(s) you used and why.
- Prioritize automated verification (e.g., `npm run test`, `npm run build`, `npm run dev` smoke runs) after making code changes, and clearly state when a required check cannot run.
- Prefer `rg`/`rg --files` when searching for text or listing files; fall back only if `rg` is unavailable.
- Avoid undoing unrelated work. If you see unexpected modifications, pause and ask for clarification before proceeding.

## Repository specifics
- `randomander` is a Vue 3 + TypeScript + Vite project powered by Pinia, Tailwind CSS, and integrations with Scryfall and EDHREC.
- `src/features/draw`, `history`, `saved`, and `settings` each own a view, with shared helpers/composables and `src/stores/randomander.ts` managing randomness, history, saved pulls, and display/cache options.
- Use relative imports within `src/`. Tailwind utilities and component-level styling should stay concise; avoid introducing global CSS unless justified.
- Scripts defined in `package.json` (e.g., `npm run dev`, `npm run build`, `npm run test`, `npm run preview`) are the preferred way to verify behavior locally.

## Project overview
- Randomander generates Commander-legal card suggestions, companion pairs, and three-card sparks by pulling from Scryfall and optionally querying EDHREC metadata.
- Users can adjust draw modes, history length, saved pulls, tags, cache settings, and display preferences inside the available UI views.
- The store persists settings/history via local storage (`randomander:state:v2`) while guarding caches and saved history counts (40 entries each, configurable limits).

## Workflow guidance
- Start with `npm install` if dependencies are missing, then `npm run dev` for local UI work, `npm run test` (Vitest) for unit verification, and `npm run build` (Vue TSC + Vite) before major submissions.
- After code changes, highlight touched areas when summarizing (e.g., mention `src/features/draw/DrawView.vue` or `src/stores/randomander.ts` line references).
- When adding or modifying features, consider their impact on `HeroStage`, `HistoryView`, `SettingsView`, and the Pinia store to keep UI/state layers consistent.

## Final responses
- Lead with a concise overview of what changed or what was discovered.
- Summaries discussing code must reference files with `path:line` notation.
- Suggest natural next steps (tests to run, follow-up items, etc.) when appropriate.
- Keep tone collaborative, action-oriented, and free of unnecessary fluff.
