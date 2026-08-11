# Troubleshooting Randomander

Start with the symptom below. The application has no local backend or environment file, so most problems fall into one of four boundaries: Node/package setup, the browser, external card-data services, or local browser storage.

If the problem is user-facing behavior rather than local development, the [User guide](user-guide.md) explains the intended result first.

## Quick checks

Run these from the repository root:

```bash
node --version
npm --version
npm run test
npm run build
```

The supported runtimes are Node.js `^22.12.0` and `^24.0.0`. CI verifies both LTS lines, and `.nvmrc` selects Node.js 24 for local development.

No `.env`, API token, database, or local API process is required.

## Install fails

### Unsupported engine or syntax errors

Check `node --version`. Switch to Node 22.12 or later on the 22.x line, or Node 24, then reinstall from the lockfile:

```bash
npm ci
```

Do not delete or regenerate `package-lock.json` merely to work around an unsupported Node release.

### Husky message during install

The `prepare` script installs Git hooks. In a normal Git clone, this is expected. If installation completes successfully, an informational Husky message is not an application failure.

### Dependency tree differs from CI

Use `npm ci` on a clean clone to install exactly from `package-lock.json`. Use `npm install` when intentionally changing dependencies.

## Development server issues

### Port 5173 is already in use

Vite may automatically choose another port and print it. To choose one explicitly:

```bash
npm run dev -- --port 5174
```

### Test on a phone or tablet

Expose Vite on the local network:

```bash
npm run dev -- --host
```

Open the network URL printed by Vite from a device on the same network. Local firewall, VPN, guest Wi-Fi isolation, or corporate network policy can still block the connection.

Do not expose a development server to an untrusted network.

### Blank page after deploying under a subpath

Vite currently uses its default root base, and the favicon path is root-relative. A deployment such as `https://example.com/randomander/` may need a deliberate Vite `base` configuration and matching asset-path review. This repository does not currently define a canonical deployment target.

Test the built output locally first:

```bash
npm run build
npm run preview
```

## A draw fails or finds no match

### “No cards matched” or compatible-pair failure

Randomander tries at most 24 candidates for a filtered selection. A valid result may be too rare to appear within that bounded search, or the combined constraints may describe an empty pool.

Try these in order:

1. switch color count from **Exactly** to **Up to** or **Any**;
2. clear Color focus;
3. disable Skip top 10%;
4. randomize again.

For Partner pair, remember that the color rule applies to the combined identity of both cards. A legal first card can still have no compatible second card within the active limit.

### Background cannot find a commander

A legendary Background must resolve to a Commander-legal commander with “Choose a Background,” and the final pair must pass active color and popularity constraints. Clear narrow filters and try again.

When successful, the result order should be commander first and Background second. If it is reversed or the **Find commander** action is absent on a legendary Background, report a regression with the exact card name.

### Scryfall cooldown or rate-limit error

Randomander spaces Scryfall request starts by at least 150 ms. An HTTP 429 starts a cooldown of at least 60 seconds, or longer when Scryfall sends a longer valid `Retry-After`. An ordinary offline, DNS, CORS, or other network `TypeError` does not start that rate-limit cooldown, so a restored connection can recover immediately.

The cooldown is not an automatic retry. Wait for it to expire, then try once. Repeatedly pressing Randomize cannot bypass it.

If the error persists:

- open Scryfall in the same browser to confirm general reachability;
- inspect the browser Network panel for 429, blocked, DNS, TLS, or CORS failures;
- temporarily test without a VPN, filtering DNS, privacy extension, or corporate proxy when permitted;
- confirm the device clock is correct.

### Card image or mana symbol is blank

Card images and mana symbols are hosted by Scryfall domains rather than bundled into the app. Content blockers, DNS filters, restrictive Content Security Policy, or an offline connection can allow the shell to load while images fail.

Inspect the Network panel for blocked requests to Scryfall image/symbol hosts. Randomander should still show accessible card names even when artwork fails.

For a transforming or modal double-faced card, the **Back face** control appears only after the reveal and only when Scryfall supplies separate images for both faces. If the front loads but the reverse does not, check the failed image request in the same panel. Split and Adventure cards intentionally keep their combined image and have no turn control.

## Deck inspiration issues

### EDHREC deck counts or themes do not appear

This is expected in the public build. Automated EDHREC JSON requests are disabled, the deck-count filter is hidden, and Settings shows this release boundary instead of a metadata toggle. Deck inspiration retains validated user-initiated links to EDHREC pages.

If an EDHREC link is absent, Randomander could not derive or validate an `https://edhrec.com` destination for that card or pair. The Scryfall result remains usable. Do not enable the internal adapter in a public deployment without the documented permission and privacy review.

### Choice mode shows the wrong option's details or links

Each choice should have a separate **Option 1** or **Option 2** body under Deck inspiration. Card details and outbound links must use only the cards in that option.

If content is crossed or combined, report both complete choices, which follow-up pairing action was used, and whether the problem started before or after loading from History.

### A marketplace price is missing or outdated

Prices are estimates included in the Scryfall payload for the exact printing that was drawn. They are not fetched directly from Cardmarket, TCGplayer, or Cardhoarder and can be absent. Randomander omits an unavailable price instead of substituting another marketplace.

Check **Settings → Prices → Marketplace** if the currency is unexpected. Loading a History or Saved record restores its stored price snapshot. Only a future fresh Scryfall draw of that printing can provide a newer snapshot; loading History or Saved does not refresh it. Changing the marketplace can only show a value that exists in that stored card object.

### An exact-name lookup looks stale after Clear cache

**Settings → Clear cache** clears persistent `randomander:cache:v1` and the store's in-memory metadata state. The cache has lazy expiration: an expired entry is removed when read. Reducing the maximum entry count takes full effect as subsequent eligible responses are written.

## Reveal and motion issues

### Reveal appears to skip automatically

The reveal is bypassed when any of these applies:

- Card reveal animation is off;
- application Reduce motion is enabled;
- the operating system/browser reports `prefers-reduced-motion: reduce`;
- the result was explicitly skipped.

Check **Settings → Display controls** and **Settings → Performance**. System accessibility preferences take precedence over decorative animation.

### Reveal waits on an image

Randomander preloads artwork but has a four-second safety timeout before proceeding. A slow or blocked image should not hold the interface indefinitely. Use **Skip reveal** or <kbd>Escape</kbd> to complete immediately.

### Interface feels slow on mobile

Use the **Low power** performance preset, which reduces motion, simplifies the decorative backdrop, and removes translucent blur. You can also disable Card reveal animation and Ambient backdrop separately.

Use **Hide** on the mobile Draw mode card to reduce vertical space. The fixed Randomize button should remain above bottom navigation and device safe-area insets.

## History, Saved, or settings are missing

Durable data is stored only in the current browser profile under three `randomander:state:v3:*` partitions. Same-origin tabs reconcile those partitions, but data does not sync across devices, browsers, normal/private windows, or profiles.

On Draw, **Save pull** adds the current result to Saved; the disabled **Pull saved** state confirms it is already there. History records use the shorter **Save**/**Saved** labels for the same action and state.

Data can disappear when:

- site storage was cleared;
- private browsing ended;
- an extension or browser cleanup policy removed local storage;
- storage access was blocked;
- a quota/security error prevented a write;
- a different origin, port, protocol, or deployment URL is being used.

History and Saved each retain at most 40 records. History removes its oldest record automatically; Saved asks for confirmation before replacing its oldest record.

### Inspect stored keys

In browser developer tools, open Application/Storage → Local Storage and select the exact Randomander origin. The expected current keys are:

- `randomander:state:v3:preferences`
- `randomander:state:v3:history`
- `randomander:state:v3:saved`
- `randomander:cache:v1`

`randomander:state:v2` can appear briefly during migration. It is removed only after all three v3 partitions are written. If migration is interrupted by quota or blocked storage, the app retains the v2 recovery copy and exposes a durability warning/retry path.

Storage failures are represented as typed outcomes. The app keeps the in-memory session running where possible, shows an accessible persistence warning, and does not claim a durable save or clear when the browser rejected it.

### Clear only network cache

Use **Settings → Clear cache**. This preserves mode, settings, History, and Saved pulls.

### Fully reset the application

This is destructive: it permanently removes local preferences, History, and Saved pulls for the current origin. There is no undo or remote backup.

Use **Settings → Clear all local data**, review the exact History/Saved counts, and confirm the destructive action. This resets preferences and the current result and removes History, Saved, cached responses, and any legacy v2 state. If the app cannot start, remove the Randomander keys through the browser's site-storage controls and reload; prefer the browser UI over pasting an unfamiliar script into developer tools.

If only the cache is suspect, do not remove any `randomander:state:*` key.

## Test failures

### Node reports a localStorage initialization warning

The test setup replaces Node's global `localStorage` with an isolated in-memory implementation, so a plain `npm run test` should pass on both supported Node lines. If Node still prints a message similar to:

```text
SecurityError: Cannot initialize local storage without a --localstorage-file path
```

confirm that `node --version` reports a supported release and that your shell or editor is not injecting custom Node options:

```bash
env -u NODE_OPTIONS npm run test
```

If the warning persists on Node 22 or 24, include the exact Node and npm versions in a bug report.

### Tests time out around Scryfall requests

Scryfall service pacing and cooldown are module-level. Tests that exercise them should:

- stub `fetch` before importing the service under test;
- use fake timers where request spacing is relevant;
- reset modules and timers between cases;
- avoid live upstream requests;
- restore mocks after each case.

Run the focused file while diagnosing:

```bash
npm run test -- src/__tests__/services/scryfall.test.ts
```

### App tests leak state between cases

Clear Pinia instances, fetch mocks, all three `randomander:state:v3:*` partitions, the legacy `randomander:state:v2` migration key, and `randomander:cache:v1` as the existing app-test setup does. A stored result, cooldown, or cache entry can otherwise make a later test order-dependent.

### Build passes while a test type error exists

`npm run build` runs the application TypeScript project and Vite, and that TypeScript project excludes test and E2E sources. Run the dedicated test-source compiler as well:

```bash
npm run test
npm run typecheck:test
npm run build
```

### Build fails on unused code

The application TypeScript configuration enables unused-local and unused-parameter checks. Remove truly unused imports/variables or use the value meaningfully; do not suppress a valid error by weakening strict project settings for one change.

## Production build issues

### Preview serves old code

`npm run preview` serves the last contents of `dist`; it does not rebuild automatically. Run:

```bash
npm run build
npm run preview
```

### Direct external requests work locally but fail when deployed

Check the deployed site's Content Security Policy, HTTPS/mixed-content rules, corporate proxy, and host allowlist. The 1.0 public build permits same-origin application assets, the Scryfall API, and the documented Scryfall image/symbol hosts. It does not load Google Fonts, automated EDHREC metadata, or Vercel Analytics.

Randomander has no backend proxy to change those requests at runtime.

## Reporting a problem

If the issue remains reproducible, open a GitHub issue with:

- Randomander branch/commit;
- Node and npm versions for development problems;
- browser, OS, viewport, and input method for UI problems;
- mode, filter state, and exact card names;
- steps, expected behavior, and actual behavior;
- the exact failing command and complete relevant error;
- console/network evidence with tokens, cookies, and personal data removed;
- whether clearing cache, reloading, or switching between supported Node 22 and 24 changed the result.

For a visual bug, include a screenshot that shows the full affected surface, not only the misaligned element. For an accessibility bug, name the assistive technology or keyboard sequence when possible.
