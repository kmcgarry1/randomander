# Tasks

## 1. Comparison composition and responsive layout

- [x] 1.1 Restructure ChoiceOptionsSection into option heading, card stage, facts, and action bands using existing theme tokens; verify both revealed options have prominent h3 titles above complete images and equally weighted panels.
- [x] 1.2 Add local responsive grid alignment and larger constrained card stages, removing pair rotations while retaining phone stacking; extend ResponsiveAccessibility component assertions and mocked Playwright geometry coverage to verify 320px, 390px, 1024px, and 1440px layouts, long names, and mixed single/pair options without horizontal overflow.
- [x] 1.3 Capture and inspect desktop and phone screenshots with mocked cards; verify increased artwork prominence, readable hierarchy, matching desktop section boundaries, and no clipped DFC controls. Record the reviewed viewport matrix with the implementation summary.

## 2. Interaction and preference preservation

- [x] 2.1 Group per-card facts and outbound links and place eligible partner discovery in the action band; verify existing App tests still cover independent partner/Background discovery, independent DFC flipping, and pair-specific EDHREC destinations.
- [x] 2.2 Preserve reveal gating on relocated titles and controls, result-heading focus, and loading states; add focused component/App assertions that identities and actions remain concealed until completion and that normal completion, skip reveal, and reduced motion expose the same result.
- [x] 2.3 Verify price-provider and hidden-link preferences with focused component tests, including unavailable URLs and missing prices; confirm card-specific accessible link names and external-link hints remain present where applicable.
- [x] 2.4 Extend mocked browser coverage for keyboard traversal, face controls outside artwork, and axe checks; verify visible focus and reachable actions, and manually inspect 200-percent browser zoom without overflow or clipped content.

## 3. Integration verification

- [x] 3.1 Run npm run test and npm run build; resolve regressions and verify existing HeroStage, History, Saved, Settings, and store contracts remain passing without data-model changes.
- [x] 3.2 Run npm run test:e2e for the affected browser scenarios and review the final comparison in npm run dev; report test results and the reviewed visual matrix, including any environment limitation, before marking implementation complete.
