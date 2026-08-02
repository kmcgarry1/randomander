# Randomander user guide

Randomander turns Commander discovery into a short loop: choose a kind of prompt, set any useful boundaries, reveal a live result, and follow the links or themes that make it interesting.

This guide describes the current interface and its limits. For installation and development, return to the [README](../README.md#getting-started).

## Interface tour

The Draw surface is always the center of the app. Its surrounding controls adapt to the available width:

- **Draw mode** selects Commander, Partner pair, or 3-card spark and summarizes active filters.
- **Randomizer result** reveals card art and result actions.
- **Deck inspiration** shows result details and available EDHREC context after reveal.
- **Filters** opens all card-pool constraints in a modal sheet.
- **History**, **Saved**, and **Settings** open as support panels over the Draw surface.

On a desktop-sized viewport, navigation sits in a left rail, and draw controls and deck inspiration can appear beside the result. On a phone-sized viewport, navigation and Randomize are fixed near the bottom. The Draw mode card can be collapsed with **Hide** and reopened with **Show** so it does not dominate the page.

Randomander does not use URL routes. Closing a support panel returns to the same Draw surface and current result.

## Make a draw

1. Select a mode in the Draw mode card, or open **Filters** and select it there.
2. Add only the filters that matter to the idea you want.
3. Press **Randomize**.
4. Let the reveal finish, press **Skip reveal**, or press <kbd>Escape</kbd> during the reveal.
5. Review the cards and Deck inspiration.
6. Keep a single result directly, or save any recorded draw from History.

Randomize is disabled while a request is active. Internally, a newly initiated draw workflow aborts older request work, and filtered searches cap candidate attempts rather than running indefinitely.

## Draw modes

### Commander

Commander mode requests one card that Scryfall marks as both a commander and Commander-legal.

Eligible cards expose a follow-up pairing action:

- **Randomize partner** for a compatible generic Partner.
- **Get _name_** for a specific “Partner with” card.
- **Randomize friend** for Friends forever.
- **Randomize doctor** for Doctor's companion.
- **Randomize background** for a commander with Choose a Background.
- **Find commander** when the initial card is a legendary Background.

The follow-up result becomes a two-card pull and is added to History. Combined color filters are checked again for the completed pair.

Turn on Choice mode to draw two Commander options. Each option remains an independent group; adding a compatible card changes only that option.

### Partner pair

Partner-pair mode starts with a partner-capable card and resolves the other half automatically. Randomander understands these mechanics:

| Mechanic | Compatibility rule |
| --- | --- |
| Partner | Pairs with another generic Partner of the same supported variant. |
| Partner with | Fetches the specifically named partner. |
| Friends forever | Pairs with another different Friends forever card. |
| Choose a Background | Pairs the commander with a legendary Background. |
| Doctor's companion | Pairs the companion with a supported Doctor commander. |

The resulting pair must remain within the selected combined color count and color focus. A narrow combination can be legal in theory but still fail within the bounded live search; try again or relax a filter.

The reverse Background workflow starts from a legendary Background drawn in **Commander** mode (including a Commander choice), where **Find commander** fetches the eligible commander. Successful Background pairs are normalized to commander first, then Background.

Choice mode produces two independently resolved pair groups. After reveal, Deck inspiration gives Option 1 and Option 2 separate detail sections instead of combining their metadata.

### 3-card spark

Spark mode returns three Commander-legal cards as a loose creative constraint. It retries a repeated card up to six times, so variety is best-effort rather than guaranteed when the eligible pool is very small.

When a color count is selected, Spark can generate a palette within the allowed colors and use it across the three-card prompt. **Exclude Game Changers** removes cards in Scryfall's Game Changer category.

Choice mode, EDHREC deck-count limits, ranked cutoff, and EDHREC result metadata are unavailable in Spark mode.

## Filters

Open **Filters** from the header, Draw surface, or Draw mode card. **Reset filters** restores the default randomizer options; it does not erase history, saved pulls, or display settings.

### Color focus

Select any combination of white, blue, black, red, and green. With **Up to**, selected colors define the allowed identity and a result may use a subset. With **Exactly**, the Scryfall query for an individual card uses the exact selected colored identity.

Colorless is mutually exclusive with colored selections. Choosing colorless clears the colored selections; choosing a color removes colorless.

With no color focus, the full legal color space is allowed.

### Color comparison and count

- **Up to** allows a single Commander at or below the selected number of colors.
- **Exactly** requires that number for a single Commander and makes a selected colored focus exact.
- **Any** removes the numeric color-count constraint.
- **0** targets colorless identities.

Partner-pair validation currently treats the number as a maximum for the union of both cards' color identities, even when Exactly is selected. Spark chooses a shared palette whose size can range from zero through the selected number. In those two modes, **Exactly** does not guarantee an exact final combined/palette count.

### Deck popularity

These controls are available in Commander and Partner-pair modes:

- **Limit by EDHREC decks** accepts applicable candidates whose reported deck count is strictly below the configured value. A missing count or failed threshold lookup can fail the draw because this filter depends on EDHREC.
- **Skip top 10% (EDHREC rank)** asks Scryfall for results ordered by EDHREC rank, skips the leading 10%, and samples from the remainder.

The two popularity strategies are mutually exclusive in the interface. Neither represents a combined EDHREC pair-page popularity score. In Partner mode, ranked sampling applies to the initial partner-capable card and the other half follows its mechanic-specific query; Background cards bypass the individual commander deck threshold. Both strategies may take longer than an unconstrained random draw.

### Choice mode

Choice mode is available for Commander and Partner pair. It returns two result groups in a single draw so they can be compared without losing the first result.

The result and metadata remain grouped throughout the interface:

- each option has its own card art, title, types, colors, and links;
- follow-up pairing changes only the chosen option;
- each Deck inspiration option renders its own card or pair profile, deck count, and themes;
- History records the complete choice state together.

To save a choice-mode pull, open History and save its record.

### Spark extras

**Exclude Game Changers** only applies to 3-card spark. It is disabled in the other modes.

## Reveal and result actions

When Card reveal animation is enabled, Randomander preloads available images before beginning the flip sequence. A safety timeout prevents a slow image from delaying the interface indefinitely.

During the reveal:

- use **Skip reveal** or <kbd>Escape</kbd> to finish immediately;
- Draw-card mode buttons and pairing actions wait until the reveal is complete; Filters can still be opened;
- post-reveal metadata requests are deferred so the reveal surface appears first.

After a non-choice reveal, **Keep pull** saves the current result. Once saved, it changes to **Pull kept**. A commander with a supported pairing mechanic also shows the appropriate pairing action.

External Scryfall, EDHREC, and marketplace links open in a new tab when External links are enabled in Settings. Price text remains visible without a link when that setting is off.

## Deck inspiration

Deck inspiration is supplemental context, not part of card selection. It may contain:

- a card or combined pair name;
- card type lines and color identities;
- one selected-marketplace price estimate per card when available;
- a combined EDHREC deck count when available;
- up to four EDHREC theme links;
- Scryfall links for each card;
- an EDHREC card, commander, or pair link.

For single, non-choice results, use **Show details** and **Hide details** to control the panel. Choice results show one body section per option because each may have a different pair slug, count, and theme set.

EDHREC's public page data changes independently of Randomander and is not guaranteed for every card or pair. “No themes available” can mean that a page has no recognized theme data or that the optional metadata request failed. The Scryfall result remains usable.

Price estimates come from the existing Scryfall card response and correspond to the exact printing that was drawn. Partner prices stay attached to each card rather than being presented as a potentially misleading pair total. Choice options keep their own prices inside their separate bodies.

## History

Every successful draw or follow-up pairing creates a History record. The newest record appears first.

From History you can:

- load a previous record back into Draw;
- save an unsaved record;
- see the mode, time, a summary of selected filters, and recorded cards or choices;
- clear all history.

Loading a record restores its draw mode, filter snapshot, cards, and choice groups. It does not recreate old EDHREC metadata; current metadata is fetched when the loaded result becomes visible. Any stored card price is the snapshot included in that historical Scryfall payload and may no longer match the marketplace.

History is capped at 40 records. Once full, a new record removes the oldest one. Clearing History does not clear Saved pulls.

## Saved pulls

Saved holds result records you want to keep beyond the rolling History list. From Saved you can:

- load a pull;
- remove one saved record;
- clear the saved collection.

Equivalent results are deduplicated using their mode and card/group identity. Saved is capped at 40 records and is local to the current browser profile and device.

## Settings

### Theme

- **System** follows the operating-system or browser color preference.
- **Light** and **Dark** force the selected appearance.

### Display controls

| Setting | Effect |
| --- | --- |
| Card reveal animation | Enables the staged card-back reveal. Turn it off for immediate results. |
| External links | Shows or hides Scryfall, EDHREC, and marketplace actions; price text remains. |
| EDHREC metadata | Enables deck counts and themes after reveal. |
| Card-art backdrop | Uses result artwork to tint the result surface. |

### Performance

- **Standard** clears Reduce motion, Simplify backdrop, and Reduce transparency without changing separate display preferences.
- **Low power** enables those three reductions together and turns off Card-art backdrop.
- Changing one of those controls directly creates a **Custom** profile.

The app also respects the operating system's `prefers-reduced-motion` setting for reveal behavior.

### Prices

The **Marketplace** dropdown controls the single compact estimate shown for each card in Deck inspiration:

- **Cardmarket (EUR)** is the default;
- **TCGplayer (USD)** uses dollar prices;
- **Cardhoarder (tix)** uses Magic Online ticket prices.

Randomander does not call those marketplaces for pricing. Scryfall supplies price and purchase-link fields with the selected printing, and the badge links to the selected marketplace when Scryfall supplies a purchase URI. A regular price is preferred; a foil or etched fallback is clearly labelled, and missing values are omitted. Changing the marketplace updates the visible result without another card request.

### Cache

The response cache is enabled by default with a 24-hour lifetime and a 120-entry maximum. The interface accepts a minimum TTL of one hour and a minimum limit of 20 entries.

Caching primarily helps repeat EDHREC metadata and exact-name card lookups. It does not turn live random draws into an offline feature.

**Clear cache** removes persistent cached responses without touching Settings, History, or Saved. If metadata already loaded in the current session still looks stale, clear the cache and reload the page to clear the in-memory copy too.

## Keyboard and accessibility behavior

- Interactive controls use native buttons, links, inputs, and pressed/expanded state where applicable.
- Filters and support panels trap focus while open and restore focus to the previous control when closed.
- <kbd>Escape</kbd> closes the active modal/panel, or skips an active reveal.
- Background content becomes inert while a modal surface is open.
- Loading, reveal, and error messages use live status/alert semantics.
- Result headings receive focus after a skipped reveal.
- Reduced-motion and reduced-transparency controls provide alternatives to the full visual presentation.

If a keyboard or assistive-technology workflow is not usable, please report it with the browser, operating system, input method, and exact control involved.

## Local data and network behavior

Randomander stores its durable state in the current browser profile:

| Key | Contents | Clearing it does |
| --- | --- | --- |
| `randomander:state:v2` | Mode, filters, display/cache/performance settings, theme, History, and Saved records | Resets preferences and permanently removes local History/Saved data. |
| `randomander:cache:v1` | Eligible HTTP response payloads and timestamps | Forces future eligible requests to fetch fresh data; personal collections remain. |

The current unsaved result is represented through History rather than a separate reload-resume record. Private/incognito browsing, browser cleanup tools, storage quotas, or switching profiles can remove or isolate stored data.

The app makes client-side requests to Scryfall, EDHREC, Scryfall's image/symbol hosts, Google Fonts, and Vercel Analytics. There is no account or cross-device sync.

## Errors and recovery

Common recovery steps are deliberately simple:

1. If no card matches, loosen color or popularity filters and try again.
2. If Scryfall reports a cooldown or network failure, wait before retrying and check whether the API is reachable.
3. If themes are missing, confirm EDHREC metadata is enabled and the reveal has completed.
4. If metadata looks stale, clear Cache in Settings and reload.
5. If the application cannot start or build locally, follow [Troubleshooting](troubleshooting.md).

Avoid repeatedly pressing Randomize during an upstream cooldown. Randomander spaces Scryfall requests and temporarily blocks new calls after rate-limit or network failures to avoid making the condition worse.
