# Collaboration Guide

Use this guide whenever collaborating on `randomander`, especially during multi-person or AI-assisted work.

## Communication
- Reference `AGENTS.md` before making repo-wide decisions—system/developer instructions go first, then the agent guidance.
- When describing work to others, mention touched views (e.g., `src/features/draw/DrawView.vue`, `src/features/history/HistoryView.vue`) and the Pinia store (`src/stores/randomander.ts`) since those files drive the main experiences.
- Keep update notes factual: summarize what changed, highlight verification status, and provide `path:line` references for code discussions.

## Workflow
- Install deps with `npm install` prior to running scripts.
- Run `npm run dev` for interactive debugging, `npm run test` for Vitest, and `npm run build` (Vue TSC + Vite) before shipping major changes; report any blocked checks.
- Use `npm run preview` when you want to inspect a production-like build locally.
- When adding features, check supporting views (`history`, `settings`, `saved`) to keep the UX aligned.

## Collaboration best practices
- Favor relative imports within `src/`.
- Explore `src/lib` and `src/services` when working with Scryfall/EDHREC helpers to keep logic in dedicated modules.
- Keep Tailwind utility usage consistent with the existing dark/light aesthetic.
- Avoid reverting unrelated changes; if you notice unexpected diffs, pause and ask for confirmation before modifying them.

## Verification notes
- Automated tests and builds are preferred but not required for docs-only changes; mention in the PR if verification could not run.
- If a requested change touches the store, history, or persistence layers, double-check `localStorage` keys (e.g., `randomander:state:v2`).

## Onboarding the next collaborator
- Point team members to `README.md` for the project overview and `AGENTS.md` for agent-specific rules.
- Update this guide if collaboration expectations shift (e.g., new scripts, new conventions) so future contributors can ramp quickly.
