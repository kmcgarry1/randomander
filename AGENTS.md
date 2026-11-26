# AGENTS instructions for randomander

### Do
- use Vue 3 with TypeScript + Vite
- use Pinia for state management with composable patterns
- use Tailwind CSS utilities for styling; avoid hard-coded values
- use relative imports within `src/`
- keep component and style definitions concise
- run automated checks with `npm run dev`, `npm run test`, `npm run build`
- default to small components and focused diffs

### Don't
- do not introduce global CSS without justification
- do not hard-code colors or spacing values
- do not add new heavy dependencies without approval
- do not undo unrelated work without asking

### Commands
# file scoped checks preferred
npm run dev - local development
npm run test - unit tests (Vitest)
npm run build - production build (Vue TSC + Vite)
npm run preview - preview production build

### Safety and permissions

Allowed without prompt:
- read files, list files
- run npm run dev, npm run test locally
- run npm run build

Ask first: 
- npm install (new dependencies)
- git push
- deleting files
- major refactors

### Project structure
- src/features/ - feature views (draw, history, saved, settings)
- src/stores/ - Pinia stores and state management
- src/components/ - shared Vue components
- src/composables/ - shared composables and hooks
- src/lib/ - utilities and helpers
- src/services/ - API services (Scryfall, EDHREC)

### Good and bad examples
- reference src/stores/randomander.ts for Pinia patterns
- consider impact on HeroStage, HistoryView, SettingsView when modifying state
- use Pinia composables for state access, not direct store imports
- keep imports relative and within src/
- use component-scoped styles with Tailwind

### Project overview
- Magic: The Gathering card suggestion tool using Scryfall API
- Generates Commander-legal suggestions, companion pairs, and sparks
- Pinia store manages randomness, draw history, saved cards, and cache options
- Local storage persists state in `randomander:state:v3:*` envelopes
- History/Saved collections capped at 40 entries; v2 migration supported only

### PR checklist
- npm run test passes
- npm run build succeeds
- code uses Pinia patterns correctly
- styling uses Tailwind utilities
- diff is focused and well-summarized

### When stuck
- ask a clarifying question
- propose a short plan
- open a draft PR with notes

### Test first mode
- write or update tests first on new features
- code to green

## Git Workflow & Branching
- **Never commit directly to `main` (or `master`).**
- **Start every new task on a fresh branch off `main`:**
  1. Run `git status` to ensure the working tree is clean. If uncommitted changes exist, ask before proceeding.
  2. Switch to `main` and pull the latest changes (`git checkout main && git pull origin main`).
  3. Create and switch to a descriptive task branch (`git checkout -b ai/<short-kebab-case-description>`).
  4. *Exception:* If explicitly instructed to continue work on an existing branch or PR, check out that branch instead of creating a new one.

## Committing Rules
- **Commit frequently at logical checkpoints:** Make small, atomic commits after completing each self-contained sub-step (e.g., adding a model, implementing a function, fixing a test) so progress can be easily reverted if needed.
- **Verify before committing:** Ensure relevant linters, type checks, and unit tests pass before creating a commit. Do not commit broken or half-finished code.
- **Keep commits scoped:** Stage only files relevant to the current logical step (`git add <files>` rather than `git add -A` if unrelated files exist).
- **Write clear commit messages:** Use concise, imperative commit messages describing *what* changed and *why* (e.g., `feat: add rate limiter middleware to auth routes`).

## Safety & Remote Guardrails
- **Do not push or open PRs automatically** unless explicitly asked. Keep frequent checkpoint commits local so the branch can be squashed or cleaned up before review.
- **Never run destructive Git commands** without explicit approval, including:
  - `git push --force` / `--force-with-lease`
  - `git reset --hard`
  - `git clean -fd`
  - `git rebase` on shared branches
- **Never commit secrets:** Double-check `git diff --staged` to ensure `.env` file