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
- `randomander` is a Vue 3 + TypeScript + Vite project powered by Pinia and Tailwind CSS. Public builds automate Scryfall requests and provide validated, user-initiated EDHREC links; the internal EDHREC metadata adapter is test-only unless a future release is separately approved.
- `src/features/draw`, `history`, `saved`, and `settings` each own a view, with shared helpers/composables and `src/stores/randomander.ts` managing randomness, history, saved pulls, and display/cache options.
- Use relative imports within `src/`. Tailwind utilities and component-level styling should stay concise; avoid introducing global CSS unless justified.
- Scripts defined in `package.json` (e.g., `npm run dev`, `npm run build`, `npm run test`, `npm run preview`) are the preferred way to verify behavior locally.

## Project overview
- Randomander generates Commander-legal card suggestions, companion pairs, and three-card sparks from Scryfall, with optional outbound EDHREC inspiration links.
- Users can adjust draw modes, filters, cache/performance settings, and display preferences, and can review or clear bounded History and Saved collections.
- The store persists preferences, History, and Saved records in the partitioned `randomander:state:v3:*` local-storage envelopes while retaining `randomander:state:v2` only as a guarded migration source. Response caches remain separate, and History/Saved collections are capped at 40 entries each.

## Workflow guidance
- Start with `npm install` if dependencies are missing, then `npm run dev` for local UI work, `npm run test` (Vitest) for unit verification, and `npm run build` (Vue TSC + Vite) before major submissions.
- After code changes, highlight touched areas when summarizing (e.g., mention `src/features/draw/DrawView.vue` or `src/stores/randomander.ts` line references).
- When adding or modifying features, consider their impact on `HeroStage`, `HistoryView`, `SettingsView`, and the Pinia store to keep UI/state layers consistent.

## Final responses
- Lead with a concise overview of what changed or what was discovered.
- Summaries discussing code must reference files with `path:line` notation.
- Suggest natural next steps (tests to run, follow-up items, etc.) when appropriate.
- Keep tone collaborative, action-oriented, and free of unnecessary fluff.
