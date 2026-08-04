import { describe, expect, it } from 'vitest'
import {
  getCardSlug,
  getEdhrecCardUrl,
  getEdhrecCommanderUrl,
  getEdhrecPairIdentifier,
  isDoctorCommander,
  isLegalPartnerPair,
  type ScryfallCard,
} from '../../lib/scryfall'

const createCard = (
  name: string,
  overrides: Partial<ScryfallCard> = {}
): ScryfallCard => ({
  id: name.toLowerCase().replace(/\W+/g, '-'),
  name,
  scryfall_uri: `https://scryfall.com/search?q=${encodeURIComponent(name)}`,
  type_line: 'Legendary Creature — Human',
  oracle_text: '',
  ...overrides,
})

describe('partner-pair legality contract', () => {
  const genericPartners = [
    createCard('Tymna the Weaver', { oracle_text: 'Partner' }),
    createCard("Kraum, Ludevic's Opus", { oracle_text: 'Partner' }),
  ] as const
  const namedPartners = [
    createCard('Virtus the Veiled', {
      oracle_text: 'Partner with Gorm the Great',
    }),
    createCard('Gorm the Great', {
      oracle_text: 'Partner with Virtus the Veiled',
    }),
  ] as const
  const friendsForever = [
    createCard('Eleven, the Mage', { oracle_text: 'Friends forever' }),
    createCard('Mike, the Dungeon Master', { oracle_text: 'Friends forever' }),
  ] as const
  const backgroundPair = [
    createCard('Erinis, Gloom Stalker', {
      oracle_text: 'Choose a Background',
    }),
    createCard('Agent of the Iron Throne', {
      type_line: 'Legendary Enchantment — Background',
    }),
  ] as const
  const doctorPair = [
    createCard('Clara Oswald', { oracle_text: "Doctor's companion" }),
    createCard('The Tenth Doctor', {
      type_line: 'Legendary Creature — Time Lord Doctor',
    }),
  ] as const
  const matchingVariant = [
    createCard('Survivor One', { oracle_text: 'Partner—Survivors' }),
    createCard('Survivor Two', { oracle_text: 'Partner—Survivors' }),
  ] as const

  it.each([
    ['Partner', genericPartners],
    ['Partner With', namedPartners],
    ['Friends Forever', friendsForever],
    ['Choose a Background', backgroundPair],
    ["Doctor's Companion", doctorPair],
    ['matching Partner variants', matchingVariant],
  ])('accepts a legal %s fixture in either order', (_mechanic, pair) => {
    expect(isLegalPartnerPair(pair[0], pair[1])).toBe(true)
    expect(isLegalPartnerPair(pair[1], pair[0])).toBe(true)
  })

  it('rejects self-pairing, including Faceless One and another printing', () => {
    const facelessOne = createCard('Faceless One', {
      id: 'faceless-one-a',
      oracle_id: 'faceless-one-oracle',
      type_line: 'Legendary Enchantment Creature — Background',
    })
    const otherPrinting = createCard('Faceless One', {
      id: 'faceless-one-b',
      oracle_id: 'faceless-one-oracle',
      type_line: 'Legendary Enchantment Creature — Background',
    })

    expect(isLegalPartnerPair(facelessOne, facelessOne)).toBe(false)
    expect(isLegalPartnerPair(facelessOne, otherPrinting)).toBe(false)
  })

  it('rejects mismatched named and variant partners', () => {
    expect(isLegalPartnerPair(namedPartners[0], genericPartners[0])).toBe(false)
    expect(
      isLegalPartnerPair(
        matchingVariant[0],
        createCard('Father', { oracle_text: 'Partner—Father & son' })
      )
    ).toBe(false)
  })

  it.each([
    ['a non-Time-Lord Doctor', 'Legendary Creature — Human Doctor', ''],
    [
      'a Doctor with an extra creature type',
      'Legendary Creature — Human Time Lord Doctor',
      '',
    ],
    [
      'a changeling',
      'Legendary Creature — Time Lord Doctor',
      'Changeling',
    ],
    ['a nonlegendary Doctor', 'Creature — Time Lord Doctor', ''],
  ])('rejects %s for Doctor\'s Companion', (_label, typeLine, oracleText) => {
    const invalidDoctor = createCard('Invalid Doctor', {
      type_line: typeLine,
      oracle_text: oracleText,
    })
    expect(isDoctorCommander(invalidDoctor)).toBe(false)
    expect(isLegalPartnerPair(doctorPair[0], invalidDoctor)).toBe(false)
  })
})

describe('EDHREC integration contracts', () => {
  it.each([
    ['Éowyn, Fearless Knight', 'eowyn-fearless-knight'],
    ['Márton Stromgald', 'marton-stromgald'],
    ["Kraum, Ludevic's Opus", 'kraum-ludevics-opus'],
  ])('creates the canonical metadata identifier for %s', (name, expected) => {
    expect(getCardSlug(createCard(name))).toBe(expected)
  })

  it('uses the front face for a double-faced metadata identifier', () => {
    expect(
      getCardSlug(
        createCard('Extus, Oriq Overlord // Awaken the Blood Avatar', {
          layout: 'modal_dfc',
          card_faces: [
            { name: 'Extus, Oriq Overlord' },
            { name: 'Awaken the Blood Avatar' },
          ],
        })
      )
    ).toBe('extus-oriq-overlord')
  })

  it('creates an alphabetical Unicode-safe pair identifier', () => {
    expect(
      getEdhrecPairIdentifier([
        createCard('Márton Stromgald'),
        createCard('Éowyn, Fearless Knight'),
      ])
    ).toBe('eowyn-fearless-knight-marton-stromgald')
  })

  it('uses a validated Scryfall EDHREC route directly for outbound links', () => {
    const route = 'https://edhrec.com/route/?cc=%C3%89owyn%2C+Fearless+Knight'
    const card = createCard('Éowyn, Fearless Knight', {
      related_uris: { edhrec: route },
    })

    expect(getEdhrecCommanderUrl(card)).toBe(route)
    expect(getEdhrecCardUrl(card)).toBe(route)
  })

  it.each([
    'javascript:alert(1)',
    'http://edhrec.com/route/?cc=unsafe',
    'https://edhrec.com.example.com/route/?cc=unsafe',
  ])('rejects an unsafe related URI and uses the canonical fallback', (url) => {
    const card = createCard('Éowyn, Fearless Knight', {
      related_uris: { edhrec: url },
    })
    expect(getEdhrecCommanderUrl(card)).toBe(
      'https://edhrec.com/commanders/eowyn-fearless-knight'
    )
  })

  it('returns an unavailable state instead of a root link for an empty identifier', () => {
    const card = createCard('東京')

    expect(getCardSlug(card)).toBe('')
    expect(getEdhrecCommanderUrl(card)).toBeNull()
    expect(getEdhrecCardUrl(card)).toBeNull()
    expect(getEdhrecPairIdentifier([card, createCard('Éowyn')])).toBeNull()
  })

  it('returns unavailable when a combined pair identifier exceeds the service limit', () => {
    expect(
      getEdhrecPairIdentifier([
        createCard('a'.repeat(130)),
        createCard('b'.repeat(130)),
      ])
    ).toBeNull()
  })
})
