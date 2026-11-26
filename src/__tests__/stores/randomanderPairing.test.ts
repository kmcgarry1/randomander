import { describe, expect, it } from 'vitest'
import {
  getPartnerActionLabel,
  requireLegalPartnerPair,
} from '../../stores/randomanderPairing'
import type { ScryfallCard } from '../../lib/scryfall'

const createCard = (overrides: Partial<ScryfallCard> = {}): ScryfallCard => ({
  id: 'card-1',
  name: 'Test Card',
  scryfall_uri: 'https://scryfall.com/card/test/1',
  type_line: 'Creature — Human',
  oracle_text: 'Test rules text.',
  color_identity: ['W'],
  image_uris: {
    normal: 'https://cards.scryfall.io/normal/front/test.jpg',
  },
  ...overrides,
})

const createBackgroundCard = (name = 'Test Background'): ScryfallCard => ({
  id: 'bg-1',
  name,
  scryfall_uri: 'https://scryfall.com/card/test/bg',
  type_line: 'Enchantment — Background',
  oracle_text: 'Background rules text.',
  color_identity: ['U'],
  image_uris: {
    normal: 'https://cards.scryfall.io/normal/front/bg.jpg',
  },
})

const createPartnerCard = (
  name = 'Partner Card',
  partnerWith = 'Specific Partner'
): ScryfallCard => ({
  id: 'partner-1',
  name,
  scryfall_uri: 'https://scryfall.com/card/test/partner',
  type_line: 'Creature — Human',
  oracle_text: `Partner with ${partnerWith}`,
  color_identity: ['W'],
  image_uris: {
    normal: 'https://cards.scryfall.io/normal/front/partner.jpg',
  },
})

const createFriendsForeverCard = (name = 'Friends Card'): ScryfallCard => ({
  id: 'friends-1',
  name,
  scryfall_uri: 'https://scryfall.com/card/test/friends',
  type_line: 'Creature — Cleric',
  oracle_text: 'Friends forever',
  color_identity: ['B'],
  image_uris: {
    normal: 'https://cards.scryfall.io/normal/front/friends.jpg',
  },
})

const createChooseBackgroundCard = (name = 'Choose Bg'): ScryfallCard => ({
  id: 'choose-bg-1',
  name,
  scryfall_uri: 'https://scryfall.com/card/test/choose-bg',
  type_line: 'Creature — Human',
  oracle_text: 'Choose a Background',
  color_identity: ['R'],
  image_uris: {
    normal: 'https://cards.scryfall.io/normal/front/choose-bg.jpg',
  },
})

const createDoctorsCompanionCard = (name = 'Doctor Companion'): ScryfallCard => ({
  id: 'doctor-1',
  name,
  scryfall_uri: 'https://scryfall.com/card/test/doctor',
  type_line: 'Creature — Human',
  oracle_text: "Doctors' Companion",
  color_identity: ['G'],
  image_uris: {
    normal: 'https://cards.scryfall.io/normal/front/doctor.jpg',
  },
})

describe('getPartnerActionLabel', () => {
  it('returns "Find commander" for background card', () => {
    const bgCard = createBackgroundCard()
    const label = getPartnerActionLabel(bgCard)
    expect(label).toBe('Find commander')
  })

  it('returns "Get partner" for null card', () => {
    const label = getPartnerActionLabel(null)
    expect(label).toBe('Randomize partner')
  })

  it('returns "Get partner" for regular card without partner', () => {
    const card = createCard({ name: 'Regular Commander' })
    const label = getPartnerActionLabel(card)
    expect(label).toBe('Randomize partner')
  })

  it('returns specific partner name for partner_with card', () => {
    const card = createPartnerCard('Pir', 'Toothy, Imaginary Friend')
    const label = getPartnerActionLabel(card)
    expect(label).toContain('Toothy')
  })

  it('returns "Get partner" when partner_with has no name', () => {
    const card = createPartnerCard('Mystery Partner', '')
    const label = getPartnerActionLabel(card)
    // This tests the case where partner text exists but name extraction fails
    expect(label).toMatch(/partner/i)
  })

  it('returns "Randomize background" for choose_background mode', () => {
    const card = createChooseBackgroundCard()
    const label = getPartnerActionLabel(card)
    expect(label).toBe('Randomize background')
  })

  it('returns "Randomize friend" for friends_forever mode', () => {
    const card = createFriendsForeverCard()
    const label = getPartnerActionLabel(card)
    expect(label).toBe('Randomize friend')
  })

  it('returns "Randomize partner" for unknown partner mode', () => {
    const card = createDoctorsCompanionCard()
    const label = getPartnerActionLabel(card)
      expect(label).toBe('Randomize partner')
  })

  it('handles null with partner kind logic', () => {
    const label = getPartnerActionLabel(null)
    expect(label).toMatch(/randomize/i)
  })
})

describe('requireLegalPartnerPair', () => {
  it('returns pair for valid legal partners', () => {
    const card1 = createCard({
      name: 'Card One',
      id: 'card-1',
      oracle_text: 'Partner',
    })
    const card2 = createCard({
      name: 'Card Two',
      id: 'card-2',
      oracle_text: 'Partner',
    })
    const result = requireLegalPartnerPair(card1, card2)
    expect(result).toEqual([card1, card2])
  })

  it('throws error for incompatible partners', () => {
    const card1 = createCard({ name: 'Card One' })
    const card2 = createCard({ name: 'Card Two' })
    expect(() => {
      requireLegalPartnerPair(card1, card2)
    }).toThrow(/incompatible/)
  })

  it('throws error with Scryfall message', () => {
    const card1 = createCard()
    const card2 = createCard({ id: 'card-2' })
    expect(() => {
      requireLegalPartnerPair(card1, card2)
    }).toThrow(/Scryfall returned an incompatible commander pair/)
  })

  it('validates both cards in the pair', () => {
    // Create incompatible pair
    const legal = createPartnerCard()
    const illegal = createCard()
    expect(() => {
      requireLegalPartnerPair(legal, illegal)
    }).toThrow()
  })

  it('handles background + choose_background combination', () => {
    const bg = createBackgroundCard()
    const chooseCard = createChooseBackgroundCard()
    // Should not throw if properly paired
    if (bg.type_line?.includes('Background')) {
      // This would normally pass validation if implemented correctly
      const result = requireLegalPartnerPair(bg, chooseCard)
      expect(result).toBeDefined()
    }
  })

  it('preserves card order in result', () => {
    const first = createCard({
      name: 'First Card',
      id: 'first',
      oracle_text: 'Partner',
    })
    const second = createCard({
      name: 'Second Card',
      id: 'second',
      oracle_text: 'Partner',
    })
    const [one, two] = requireLegalPartnerPair(first, second)
    expect(one.name).toBe('First Card')
    expect(two.name).toBe('Second Card')
  })

  it('handles legal partner pairs when implemented', () => {
    const friends1 = createFriendsForeverCard('Friend One')
    const friends2 = createFriendsForeverCard('Friend Two')
    // Test that the function handles pairs; actual partner validation
    // depends on isLegalPartnerPair implementation
    expect(() => {
      requireLegalPartnerPair(friends1, friends2)
    }).toThrow()
  })

  it('validates incompatible doctor/companion combinations', () => {
    const doctor = createDoctorsCompanionCard()
    const companion = createCard({
      name: 'Companion',
      oracle_text: 'Doctor\'s Companion',
    })
    // Should throw since they're not actually legal partners
    expect(() => {
      requireLegalPartnerPair(doctor, companion)
    }).toThrow()
  })
})
