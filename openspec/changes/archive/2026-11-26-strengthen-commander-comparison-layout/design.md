# Design

## Context

See proposal.md for motivation. ChoiceOptionsSection currently owns the comparison and receives all behavior through props from DrawView. Its panels switch to two columns at lg, images are capped at 11/12.5rem, paired cards rotate on wider screens, and titles appear beneath the images. PrestigeCard already owns image containment, reveal behavior, and independent face state. Existing App tests cover partner discovery and flipping; ResponsiveAccessibility tests assert phone stacking, wrapping, and external-control placement. Browser smoke coverage provides mocked upstream responses and axe checks.

The visual request leaves minor styling choices open. This plan assumes a card-focused evolution of the current Material theme, encompassing both commander and pairing comparisons. No new selection interaction is implied.

## Goals / Non-Goals

**Goals:** Keep the comparison component as the presentation boundary; provide consistent reading order and aligned comparison bands; preserve existing callbacks and card identity keys.

**Non-Goals:** New scoring, winner selection, individual-option saving, rules expansion, new APIs, or redesigning HeroStage and collection views. Store, History, Saved, and Settings behavior stays intact.

## Decisions

1. **Use four visual bands per panel: heading, card stage, facts, actions.** Put the option number and revealed h3 title first. Use an outlined surface and restrained theme-token accent to separate each option. Desktop panels share row sizing through a local grid/subgrid layout so long titles and mixed pairings expand matching bands together. A simple equal-height flex layout was considered but would not reliably align intermediate boundaries. Keep article semantics and DOM reading order.

2. **Make card images the dominant content.** Target a single-card maximum around 16rem when space permits, with paired cards around 13rem each, constrained by available panel width. Show complete images using PrestigeCard, without cropping or overlapping cards. Remove pair rotation to make comparison edges easier to scan. Use stacked options by default and two columns only when the result area can support them; verify the existing lg breakpoint with DrawView's sidebar. Within a phone option, keep pair cards stacked. Do not force fixed heights on wrapped content.

3. **Group facts and links by card.** Use each card's name to identify facts in paired options, with ManaIdentity, type line, and CardPriceBadge. Keep partner discovery prominent in the action band and card-specific outbound links secondary; retain the pair link once per option. Retain descriptive accessible link names even if visible labels are shortened. A dense comparison table was considered but makes multi-card and phone cases harder to read.

4. **Preserve reveal and interaction ownership.** Gate the moved titles, facts, and action bands on revealComplete. Before reveal, render neutral placeholders and generic labels only. Preserve globalCardIndex, totalCards, stable keys, loading gates, URL helpers, and existing callback signatures. Avoid image-derived backgrounds, extra motion, and network requests. Retain data-result-heading and the existing focus handoff in DrawView.

5. **Verify layout in a real browser.** Update component checks where class assertions encode the old layout, retaining semantic guarantees. Add focused mocked browser scenarios to the existing Playwright coverage for geometry, overflow, and keyboard reachability. DOM-only tests cannot establish rendered visual alignment.

## Risks / Trade-offs

- Larger artwork increases phone scrolling -> Keep facts compact, preserve document order, and avoid oversized padding.
- The sidebar reduces available desktop width -> Validate at 1024px and 1440px; stack until both panels can fit comfortably.
- Long titles, DFC controls, and mixed pairings can break alignment -> Use shared intrinsic row sizing on desktop and natural flow on phones; test these cases together.
- Moving headings can leak identities during reveal -> Assert names, links, and identifying accessible text are absent before completion.
- Shared card components also serve HeroStage -> Prefer local layout changes and run existing HeroStage and App coverage if shared code changes.
- Screenshots alone do not guarantee accessibility -> Combine visual inspection with keyboard, zoom, overflow, and axe checks.

## Migration Plan

Ship as a presentation update with no data migration. Run unit tests, the production build, and relevant mocked browser tests before delivery. Rollback is a source revert of the layout and its tests; stored preferences and collections remain compatible.
