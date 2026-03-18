# Apple-Style Mobile UI Plan

## Goal

Refactor Randomander from a desktop-forward shell into an iPhone-first experience centered on the Draw flow and aligned with Apple Human Interface Guidelines patterns: clear hierarchy, large-title screens, sheet-based secondary tasks, comfortable touch targets, vertical scrolling, and layouts that stay legible at larger text sizes.

## Apple References

- Designing for iOS: https://developer.apple.com/design/human-interface-guidelines/designing-for-ios
- Layout: https://developer.apple.com/design/human-interface-guidelines/layout
- Tab views: https://developer.apple.com/design/human-interface-guidelines/tab-views
- Toolbars: https://developer.apple.com/design/human-interface-guidelines/toolbars
- Sheets: https://developer.apple.com/design/human-interface-guidelines/sheets
- UI Design Dos and Don'ts: https://developer.apple.com/design/tips/
- Larger Text evaluation criteria: https://developer.apple.com/help/app-store-connect/manage-app-accessibility/larger-text-evaluation-criteria

Working guidance pulled from Apple's current public material:

- Keep primary content fully on-screen without horizontal scrolling.
- Treat touch input as the baseline interaction model.
- Size tap targets to at least 44 x 44 pt.
- Keep text readable at small sizes and verify the layout at much larger sizes.
- Prefer vertical reflow over dense horizontal compression when space gets tight.

## Current UI Audit

The current app already has strong state separation, but the presentation is still biased toward a wide viewport:

- `src/app/AppShell.vue` uses a desktop-style floating header with multiple utility buttons and currently treats several secondary surfaces as peers of the core Draw experience.
- `src/features/draw/DrawView.vue` stacks many peer controls in one scroll column: chips, mode switcher, hero stage, partner controls, status banner, primary CTA, and a dense secondary action tray.
- `src/features/history/HistoryView.vue` and `src/features/saved/SavedView.vue` use card grids, which work on larger screens but are heavier than iOS-style list navigation on phones.
- `src/features/settings/SettingsView.vue` presents settings as dashboard cards rather than grouped list sections.
- `src/components/layout/SupportPanel.vue` is already close to an iOS sheet on mobile and is the best starting point for filters and settings.
- `src/style.css` uses decorative typography and high-glass treatments that feel branded, but not especially Apple-native on small screens.

## Mobile Information Architecture

Recommendation:

- Treat `Draw` as the only primary mobile destination.
- Present `Settings` from a trailing toolbar button as a sheet or pushed screen.
- Keep `Filters` as a sheet launched from the Draw screen.
- Reserve sheets for secondary tasks and transient detail work.
- Defer any dedicated mobile treatment for `History` and `Saved` until the core Draw flow feels right.

Why this structure:

- The app has one clearly dominant job on mobile: generate and inspect a pull.
- Settings is utility UI and should not compete with the main action.
- History and Saved are supporting features, so they should not drive the initial mobile information architecture.

## Screen-by-Screen Plan

### 1. App Shell

Files:

- `src/app/AppShell.vue`
- `src/stores/randomander.ts`

Changes:

- Replace the floating capsule header on mobile with an iOS-style top bar.
- Remove the assumption that mobile needs peer destination navigation.
- Narrow overlay state so it prioritizes sheets like `filters`, `settings`, and possibly result details.
- Keep the existing larger-screen shell for tablet/desktop until the mobile refactor is stable.

State recommendation:

- Keep `Draw` as the dominant mobile route and avoid expanding primary navigation without a stronger product reason.
- Replace the current `activePanel` mental model with an `activeSheet` mental model for `filters` and `settings`.
- Preserve existing persistence behavior so the app restores the last active destination cleanly.

### 2. Draw Screen

Files:

- `src/features/draw/DrawView.vue`
- `src/features/draw/components/HeroStage.vue`
- `src/features/draw/components/ChoiceOptionsSection.vue`
- `src/features/draw/components/ResultDetailsSection.vue`

Changes:

- Convert the mode switcher into a tighter segmented-control treatment.
- Make the top of the screen simpler: title, current mode, and one or two utility actions only.
- Keep the hero card stack as the primary focus, but reduce extra chrome around it on phones.
- Collapse secondary actions into clearer groupings:
  - primary bottom action bar: `Randomize`
  - secondary row: `Save`, `Details`, `Filters`
  - move `Settings` into the toolbar or sheet trigger
  - remove `History` and `Saved` from the main mobile action cluster
- Rework the status banner so it reads like supporting system feedback instead of another card competing for attention.
- Consider presenting extended metadata and deckbuilder links in a details sheet instead of an always-inline expandable surface.

Mobile behavior targets:

- Touch targets at or above 44 px high.
- One-handed reach for the primary action.
- Stable vertical rhythm with 16 to 20 px horizontal padding.
- Much less uppercase microcopy on primary controls.

### 3. History and Saved

Files:

- `src/features/history/HistoryView.vue`
- `src/features/saved/SavedView.vue`

Changes:

Status:

- Deferred for the first mobile pass.

Later direction if they return to scope:

- Move from card-grid browsing to list-first browsing on mobile.
- Use rows with compact card thumbnails, title, subtitle, chips, and a trailing affordance.
- Keep destructive actions secondary and visually separated.
- Let a tap load the record directly; expose remove/clear actions through trailing buttons or a row action pattern.
- Preserve richer card layouts for larger breakpoints if they still add value.

### 4. Settings

Files:

- `src/features/settings/SettingsView.vue`
- `src/components/layout/SupportPanel.vue`

Changes:

- Present settings as grouped list sections instead of dashboard cards.
- Keep sections short and scannable: Theme, Display, Performance, Cache.
- Use native-feeling toggles, grouped rows, helper text, and destructive actions at the end of the relevant section.
- On phones, prefer sheet presentation with a drag handle, strong title, and a close affordance.

### 5. Visual System

Files:

- `src/style.css`
- shared Tailwind classes across layout and feature views

Changes:

- Shift mobile typography closer to the Apple system look:
  - use an SF-compatible system stack for body and control text
  - reduce reliance on decorative serif headings on phones
- Reduce blur, glow, and ornamental gradients in the main interaction path.
- Keep motion purposeful and short; avoid decorative animation around navigation changes.
- Use sentence case for primary buttons, labels, and section titles.
- Make the app feel lighter and more structured, not flatter.

## Rollout Phases

### Phase 1: Core shell foundation

- Refactor store view state around a single primary mobile screen plus sheets.
- Build the mobile shell with a top bar, safe-area spacing, and room for a bottom primary action.
- Keep the current desktop shell behind larger breakpoints.

### Phase 2: Draw screen refactor

- Simplify the screen hierarchy.
- Rebuild the mode switcher and action layout.
- Move details into a more iOS-like supporting surface.

### Phase 3: Settings and deferred secondary surfaces

- Convert settings into grouped sections.
- Reuse the sheet container for filters and settings.
- Revisit History and Saved only if they still matter after the Draw flow is stable.

### Phase 4: Accessibility and polish

- Audit all interactive elements for 44 x 44 minimum targets.
- Test larger text layouts aggressively.
- Verify reduced motion, transparency, and focus states still feel coherent.

## Definition of Done

The mobile refactor is complete when:

- Mobile navigation is clearly centered on the Draw experience.
- Filters and settings use sheets cleanly.
- Draw has one clear primary action and a simpler information hierarchy.
- History and Saved no longer distract from the first-pass mobile flow.
- The layout stays readable at larger text sizes without overlapping or unreadable truncation.
- Mobile styling feels recognizably Apple-aligned without stripping the product of its MTG identity.
