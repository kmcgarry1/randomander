# Spec Delta

## Purpose

Present two commander or pairing options with a clear visual hierarchy so users can compare cards and access each option's actions across screen sizes.

## ADDED Requirements

### Requirement: Comparable option hierarchy
The comparison SHALL present equally weighted option panels with an option number, a prominent title above the card stage, complete card images, per-card facts, and a separate action area after reveal. Wide layouts SHALL align the title, card-stage, and facts sections across both options.

#### Scenario: Two commanders on desktop
- **WHEN** two single commanders are revealed at a 1440px viewport
- **THEN** two equal-width panels appear side by side with matching section boundaries, titles above the images, and color identity, type, and price information associated with each commander

#### Scenario: Mixed single and paired options
- **WHEN** one revealed option contains two cards and the other contains one
- **THEN** both options retain equal visual prominence, every card is fully visible, and facts and actions remain unambiguously associated with their cards

### Requirement: Responsive readable comparison
The comparison SHALL stack option panels on narrow screens, preserve option order, wrap long content, and keep images and controls within their panels without horizontal page overflow. Phone pairings SHALL stack their cards vertically.

#### Scenario: Narrow phone with long names
- **WHEN** a pairing with long unbroken card names is viewed at 320px or 390px viewport width
- **THEN** option 1 precedes option 2 vertically, paired cards stack, names and links wrap, and no image or control is clipped or creates horizontal page scrolling

#### Scenario: Zoomed layout
- **WHEN** the browser is zoomed to 200 percent
- **THEN** content reflows and all facts and actions remain readable and reachable

### Requirement: Reveal-safe presentation
The comparison SHALL conceal commander names, facts, actionable links, partner actions, and identifying accessible image text until reveal completes. Skipping reveal SHALL expose the same final layout as normal completion, and reduced-motion behavior SHALL remain supported.

#### Scenario: Preparing the options
- **WHEN** a new comparison is awaiting reveal completion
- **THEN** generic option labels and the preparing heading are available without exposing commander identities or interactive card actions

#### Scenario: Reveal completes or is skipped
- **WHEN** reveal finishes normally or the user skips it
- **THEN** the comparison heading, option titles, facts, and eligible actions become available in the final layout

### Requirement: Independent accessible option actions
The comparison SHALL preserve independent card-face controls and eligible partner actions, with visible keyboard focus and accessible names identifying their target. Card-face controls SHALL remain outside card artwork, and partner actions SHALL be disabled while loading.

#### Scenario: Flip one card
- **WHEN** a keyboard user activates the back-face control of a revealed double-faced card
- **THEN** only that card changes face and its control remains reachable without covering the artwork

#### Scenario: Find an eligible partner
- **WHEN** the user requests a partner or commander for an eligible single-card option
- **THEN** the request targets only that option and preserves the other option's cards

### Requirement: Preference-aware facts and outbound actions
The comparison SHALL honor the selected price provider and external-link visibility preference. Links SHALL use validated destinations, include the existing external-link indication, and show unavailable labels when no valid destination exists. Paired options SHALL retain valid pair-specific inspiration links.

#### Scenario: Links hidden
- **WHEN** external links are disabled in display preferences
- **THEN** comparison facts remain visible but outbound links, including linked prices, are absent

#### Scenario: Link availability varies
- **WHEN** revealed cards include both valid and unavailable destinations
- **THEN** valid destinations are actionable only through user interaction and unavailable destinations have descriptive non-link labels
