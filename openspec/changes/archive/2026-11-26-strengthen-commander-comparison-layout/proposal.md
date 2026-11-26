# Proposal

## Why

Choice mode currently presents small card images above dense summaries and repeated links, weakening the visual comparison between two commanders or pairings. A clearer hierarchy and more prominent card presentation will make both options easier to scan together and on phones.

## What Changes

- Give each option an equally weighted panel with a distinct option label, prominent commander title, larger card stage, readable facts, and grouped actions.
- Align corresponding panel sections on wide screens and stack options naturally on narrow screens, including mixed single-card and paired options.
- Preserve reveal concealment, independent double-faced card controls, partner discovery, price preferences, and validated external links.
- Maintain the existing visual theme and accessibility behavior without adding selection, scoring, or a winner workflow.

## Capabilities

### New Capabilities

- `commander-comparison`: Responsive visual presentation and accessible interaction with two commander or pairing options. This introduces a specification for an existing feature whose presentation is being updated.

### Modified Capabilities

None; the main specification inventory is currently empty.

## Impact

Primary implementation area: `src/features/draw/components/ChoiceOptionsSection.vue`, with integration adjustments in `src/features/draw/DrawView.vue` only if required. Reuse PrestigeCard, ManaIdentity, CardPriceBadge, and current theme tokens. Extend existing component, app, and browser coverage. No new dependency, network integration, persistence schema, or store contract is planned; HeroStage, History, Saved, and Settings retain their current behavior.
