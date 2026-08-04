# Third-party notices

Randomander is an unofficial fan project. This file records the external software and services that materially support the distributed application. It is not a substitute for the full license texts shipped by each dependency.

## Runtime software

| Package | Role | Declared license |
| --- | --- | --- |
| Vue and Vue runtime/compiler packages | UI runtime and production compilation | MIT |
| Pinia | Client state management | MIT |
| Heroicons for Vue | Interface icons | MIT |
| Vercel Analytics | Optional, environment-gated production analytics | MPL-2.0 |

The lockfile is authoritative for exact versions and transitive packages. The release workflow generates a CycloneDX SBOM and machine-readable license inventory from that lockfile. Source and license text for each package are available from its npm distribution and upstream repository.

Tailwind CSS, Vite, Vitest, TypeScript, Playwright, axe-core, and related packages are used to build or verify the application. Their declared licenses are included in the generated release inventory even when they are not shipped as browser runtime modules.

## Data and hosted services

- [Scryfall](https://scryfall.com/docs/api) supplies card data, legality/search results, images, prices, and purchase URLs. Randomander follows Scryfall's API access guidance and is not endorsed by Scryfall.
- [EDHREC](https://edhrec.com/) supplies optional deck counts, themes, and inspiration links. Availability and metadata are not guaranteed.
- Cardmarket, TCGplayer, and Cardhoarder are optional outbound marketplace destinations derived from allowlisted Scryfall purchase URLs. Randomander does not process a purchase.
- Vercel hosts the canonical deployment. Vercel Web Analytics is disabled unless explicitly enabled after privacy approval.

## Magic: The Gathering content

Magic: The Gathering, card names, rules text, symbols, and artwork belong to Wizards of the Coast and their respective rights holders. Randomander is unofficial Fan Content and is not approved or endorsed by Wizards of the Coast. Card information and images are presented through Scryfall for discovery and inspiration.

The project owner must approve the repository's own source license and final fan-content/service wording before the 1.0 release. Until a project `LICENSE` is added, no general open-source grant is implied.
