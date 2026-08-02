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

The installed Vite toolchain requires Node.js `^20.19.0` or `>=22.12.0`. CI currently uses Node.js 20. For normal local development, prefer a maintained Vite-compatible release such as Node.js 22.12+ or 24.

No `.env`, API token, database, or local API process is required.

## Install fails

### Unsupported engine or syntax errors

Check `node --version`. Upgrade to Node 20.19 or later, or 22.12 or later, then reinstall from the lockfile:

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
3. disable the EDHREC deck threshold;
4. disable Skip top 10%;
5. randomize again.

For Partner pair, remember that the color rule applies to the combined identity of both cards. A legal first card can still have no compatible second card within the active limit.

### Background cannot find a commander

A legendary Background must resolve to a Commander-legal commander with “Choose a Background,” and the final pair must pass active color and popularity constraints. Clear narrow filters and try again.

When successful, the result order should be commander first and Background second. If it is reversed or the **Find commander** action is absent on a legendary Background, report a regression with the exact card name.

### Scryfall cooldown or rate-limit error

Randomander spaces Scryfall request starts by at least 150 ms. An HTTP 429 starts a cooldown of at least 60 seconds, or longer when Scryfall sends a longer `Retry-After`. A network/CORS failure also starts a 60-second cooldown.

The cooldown is not an automatic retry. Wait for it to expire, then try once. Repeatedly pressing Randomize cannot bypass it.

If the error persists:

- open Scryfall in the same browser to confirm general reachability;
- inspect the browser Network panel for 429, blocked, DNS, TLS, or CORS failures;
- temporarily test without a VPN, filtering DNS, privacy extension, or corporate proxy when permitted;
- confirm the device clock is correct.

### Card image or mana symbol is blank

Card images and mana symbols are hosted by Scryfall domains rather than bundled into the app. Content blockers, DNS filters, restrictive Content Security Policy, or an offline connection can allow the shell to load while images fail.

Inspect the Network panel for blocked requests to Scryfall image/symbol hosts. Randomander should still show accessible card names even when artwork fails.

## Deck inspiration issues

### Themes never appear

Confirm all of the following:

- the mode is Commander or Partner pair, not 3-card spark;
- **Settings → EDHREC metadata** is enabled;
- the reveal has completed or was skipped;
- the result has a corresponding EDHREC card, commander, or pair page;
- the browser can reach EDHREC's JSON host.

Post-reveal metadata loads only after the result is visible, and failures there degrade to empty metadata rather than failing the Scryfall result. The EDHREC deck-threshold filter is a separate, blocking selection path: if it is enabled, an unavailable count/request can fail the draw.

### Choice mode shows the wrong option's metadata

Each choice should have a separate **Option 1** or **Option 2** body under Deck inspiration. A pair's deck count/themes should be calculated using only the cards in that option.

If content is crossed or combined, report both complete choices, which follow-up pairing action was used, and whether the problem started before or after loading from History.

### A marketplace price is missing or outdated

Prices are estimates included in the Scryfall payload for the exact printing that was drawn. They are not fetched directly from Cardmarket, TCGplayer, or Cardhoarder and can be absent. Randomander omits an unavailable price instead of substituting another marketplace.

Check **Settings → Prices → Marketplace** if the currency is unexpected. Loading a History or Saved record restores its stored price snapshot. Only a future fresh Scryfall draw of that printing can provide a newer snapshot; loading History or Saved does not refresh it. Changing the marketplace can only show a value that exists in that stored card object.

### Metadata looks stale after Clear cache

**Settings → Clear cache** clears persistent `randomander:cache:v1`, but metadata already loaded in the current Pinia session can remain in memory. After clearing:

1. reload the page;
2. load or redraw the result;
3. open Deck inspiration again.

The cache has lazy expiration: an expired entry is removed when read. Reducing the maximum entry count takes full effect as subsequent eligible responses are written.

### Deck threshold includes/excludes an edge value

The implementation accepts a reported EDHREC deck count only when it is strictly **less than** the configured value. A card whose count equals the value is excluded.

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

Use the **Low power** performance preset, which reduces motion, simplifies the card-art backdrop, and removes translucent blur. You can also disable Card reveal animation and Card-art backdrop separately.

Use **Hide** on the mobile Draw mode card to reduce vertical space. The fixed Randomize button should remain above bottom navigation and device safe-area insets.

## History, Saved, or settings are missing

Durable data is stored only in the current browser profile under `randomander:state:v2`. It does not sync across devices, browsers, normal/private windows, or profiles.

Data can disappear when:

- site storage was cleared;
- private browsing ended;
- an extension or browser cleanup policy removed local storage;
- storage access was blocked;
- a quota/security error prevented a write;
- a different origin, port, protocol, or deployment URL is being used.

History and Saved each retain at most 40 records. Adding a 41st removes the oldest record in that collection.

### Inspect stored keys

In browser developer tools, open Application/Storage → Local Storage and select the exact Randomander origin. The expected keys are:

- `randomander:state:v2`
- `randomander:cache:v1`

Storage helpers log parse, quota, or access failures as console warnings and keep the in-memory session running where possible.

### Clear only network cache

Use **Settings → Clear cache**. This preserves mode, settings, History, and Saved pulls. Reload afterward when clearing already-loaded metadata.

### Fully reset the application

This is destructive: it permanently removes local preferences, History, and Saved pulls for the current origin. There is no undo or remote backup.

After confirming that loss is acceptable, remove both Randomander keys through the browser's site-storage controls and reload. Prefer the browser UI over pasting an unfamiliar script into developer tools.

If only the cache is suspect, do not remove `randomander:state:v2`.

## Test failures

### Node reports localStorage initialization failure

Some newer Node releases expose an experimental global `localStorage`. A local Vitest run can fail before jsdom setup with a message similar to:

```text
SecurityError: Cannot initialize local storage without a --localstorage-file path
```

As a compatibility diagnostic, reproduce with CI's configured Node 20.19+ line. For normal development, prefer a maintained supported Node release. As a temporary macOS/Linux workaround on a release that exposes the conflicting experimental storage, give it an isolated temporary file:

```bash
env NODE_OPTIONS=--localstorage-file=/tmp/randomander-node-localstorage.json npm run test
```

This workaround is not required in CI and should not be added to package scripts without first deciding the project's supported Node policy.

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

Clear Pinia instances, fetch mocks, `randomander:state:v2`, and `randomander:cache:v1` as the existing app-test setup does. A stored result, cooldown, or cache entry can otherwise make a later test order-dependent.

### Build passes while a test type error exists

`npm run build` runs the application TypeScript project and Vite, and that TypeScript project excludes `src/__tests__`. Always run both:

```bash
npm run test
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

Check the deployed site's Content Security Policy, HTTPS/mixed-content rules, corporate proxy, and host allowlist. The browser must reach Scryfall, EDHREC, Scryfall image/symbol hosts, Google Fonts, and Vercel Analytics according to the enabled features.

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
- whether clearing cache, reloading, or using Node 20 changed the result.

For a visual bug, include a screenshot that shows the full affected surface, not only the misaligned element. For an accessibility bug, name the assistive technology or keyboard sequence when possible.
