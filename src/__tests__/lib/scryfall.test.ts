import { describe, expect, it } from 'vitest'
import { getCardSlug, getPartnerVariant } from '../../lib/scryfall'
import type { ScryfallCard } from '../../lib/scryfall'

const createCard = (overrides: Partial<ScryfallCard> = {}): ScryfallCard => ({
  id: 'card-1',
  name: 'Kaya, Ghost of Heroes',
  scryfall_uri: 'https://example.com/card',
  ...overrides,
})

describe('scryfall helper utilities', () => {
  it('creates a slug from the canonical portion of the name', () => {
    const card = createCard({
      name: 'Kaya, Ghost of Heroes // Kaya, Eternity Weaver',
    })
    expect(getCardSlug(card)).toBe('kaya-ghost-of-heroes')
  })

  it('normalizes partner variants from oracle text', () => {
    const fatherAndSon = createCard({
      oracle_text:
        'Partner—Father & son (You can have two commanders if both have this ability.)',
    })
    const survivors = createCard({
      oracle_text:
        'Partner—Survivors (You can have two commanders if both have this ability.)',
    })

    expect(getPartnerVariant(fatherAndSon)).toBe('father & son')
    expect(getPartnerVariant(survivors)).toBe('survivors')
  })
})
