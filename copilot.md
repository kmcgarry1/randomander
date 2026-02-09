# Copilot Instructions

## Project overview

- Randomander is a Vue 3 + TypeScript + Vite app with Pinia and Tailwind CSS.
- Key feature areas live under `src/features` (draw, history, saved, settings).
- Shared state lives in the Pinia store at `src/stores/randomander.ts`.

## Development workflow

- Install deps: `npm install`.
- Run the app: `npm run dev`.
- Run tests: `npm run test`.
- Build: `npm run build`.

## Code conventions

- Prefer relative imports within `src/`.
- Keep Tailwind usage concise; avoid global CSS unless justified.
- Keep component logic close to its feature area.
- Keep UI/state changes consistent across HeroStage, HistoryView, and SettingsView when relevant.

## Testing and verification

- Prefer automated verification after code changes.
- If you cannot run a check, say so and explain why.

## Notes

- Settings and history are persisted in local storage under `randomander:state:v2`.
