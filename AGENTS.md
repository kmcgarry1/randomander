# AGENTS instructions for randomander

## Purpose
This file captures the expectations for AI agents responding inside this repository. Treat it as the go-to set of reminders whenever you work in `randomander`.

## Core principles
- Honor the system/developer directions first. They define the preferred tone, safety, citation, and browsing expectations for any turn.
- Respect the skill guidance listed in the repository root (`skill-creator`, `skill-installer`). If a user explicitly invokes a skill (mentioning it by name), open the corresponding `SKILL.md`, follow its workflow, and note in your response which skill(s) you used and why.
- Prioritize automated verification when applicable (e.g., `npm test`, `npm run lint`, `npm run build`) especially after code changes. Signal if you could not run a required check.
- Favor `rg` when searching for text and `rg --files` when listing files; fall back to other commands only if `rg` is unavailable.
- Avoid undoing or reverting unrelated work. If you notice unexpected changes, pause and ask for clarification before acting.

## Repository specifics
- `randomander` is a Vite/React + TypeScript project. Use `npm install` for dependencies and leverage scripts defined in `package.json` (e.g., `dev`, `build`, `test`, `lint`) for work verification.
- For styling changes, Tailwind CSS is configured (see `tailwind.config.js`). Be mindful of utility-first conventions when editing components under `src/` or `public/` for layout assets.
- `src/` holds TypeScript modules and assets; prefer relative imports and keep the existing module boundaries.

## Final responses
- Lead with a concise overview of what changed or what was found.
- Summaries should include file references (`path:line`) for any code discussion.
- Suggest natural next steps when they exist (tests to run, follow-up items, etc.).
- Keep tone collaborative and focused on action; avoid extra fluff.
