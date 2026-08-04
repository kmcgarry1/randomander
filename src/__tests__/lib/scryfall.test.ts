import { describe, expect, it } from "vitest";
import {
  decodeScryfallCard,
  getCardPrice,
  getCardSlug,
  getCardThumbnailUrl,
  getPartnerVariant,
  getTurnableCardFaces,
  isBackgroundCard,
} from "../../lib/scryfall";
import type { ScryfallCard } from "../../lib/scryfall";

const createCard = (overrides: Partial<ScryfallCard> = {}): ScryfallCard => ({
  id: "card-1",
  name: "Kaya, Ghost of Heroes",
  scryfall_uri: "https://example.com/card",
  ...overrides,
});

describe('scryfall helper utilities', () => {
  describe('getCardThumbnailUrl', () => {
    it('prefers Scryfall small images and falls back to the display image', () => {
      expect(
        getCardThumbnailUrl(
          createCard({
            image_uris: {
              small: 'https://cards.scryfall.io/small/card.jpg',
              normal: 'https://cards.scryfall.io/normal/card.jpg',
            },
          })
        )
      ).toBe('https://cards.scryfall.io/small/card.jpg')

      expect(
        getCardThumbnailUrl(
          createCard({
            layout: 'modal_dfc',
            card_faces: [
              {
                image_uris: {
                  small: 'https://cards.scryfall.io/small/front.jpg',
                  normal: 'https://cards.scryfall.io/normal/front.jpg',
                },
              },
            ],
          })
        )
      ).toBe('https://cards.scryfall.io/small/front.jpg')

      expect(
        getCardThumbnailUrl(
          createCard({
            image_uris: {
              normal: 'https://cards.scryfall.io/normal/fallback.jpg',
            },
          })
        )
      ).toBe('https://cards.scryfall.io/normal/fallback.jpg')
    })

    it('retains small image fields while decoding Scryfall responses', () => {
      const card = decodeScryfallCard({
        id: 'decoded-card',
        name: 'Decoded Card',
        scryfall_uri: 'https://scryfall.com/card/test/decoded-card',
        color_identity: [],
        image_uris: {
          small: 'https://cards.scryfall.io/small/decoded-card.jpg',
          normal: 'https://cards.scryfall.io/normal/decoded-card.jpg',
        },
      })

      expect(card.image_uris?.small).toBe(
        'https://cards.scryfall.io/small/decoded-card.jpg'
      )
    })
  })

  describe('getCardSlug', () => {
    it('creates a slug from the canonical portion of a double-faced card name', () => {
      const card = createCard({
        name: 'Kaya, Ghost of Heroes // Kaya, Eternity Weaver',
      })
      expect(getCardSlug(card)).toBe('kaya-ghost-of-heroes')
    })

    it('creates a slug from a regular single-faced card name', () => {
      const card = createCard({
        name: 'Tymna the Weaver',
      })
      expect(getCardSlug(card)).toBe('tymna-the-weaver')
    })

    it('handles single-faced cards with special characters', () => {
      const card = createCard({
        name: "Jeska, Thrice Reborn",
      })
      expect(getCardSlug(card)).toBe('jeska-thrice-reborn')
    })
  })

  describe('isBackgroundCard', () => {
    it('recognizes the Background subtype with a Unicode type-line separator', () => {
      expect(
        isBackgroundCard(
          createCard({ type_line: 'Legendary Enchantment — Background' })
        )
      ).toBe(true)
      expect(
        isBackgroundCard(createCard({ type_line: 'Legendary Creature — Orc' }))
      ).toBe(false)
    })
  })

  describe('getCardPrice', () => {
    const pricedCard = createCard({
      prices: {
        eur: '1.25',
        eur_foil: '1.75',
        usd: '2.50',
        usd_foil: '3.00',
        usd_etched: '3.25',
        tix: '0.40',
      },
      purchase_uris: {
        cardmarket: 'https://www.cardmarket.com/example',
        tcgplayer: 'https://www.tcgplayer.com/example',
        cardhoarder: 'https://www.cardhoarder.com/example',
      },
    })

    it('maps each marketplace to its currency and purchase link', () => {
      expect(getCardPrice(pricedCard, 'cardmarket')).toEqual({
        provider: 'cardmarket',
        providerLabel: 'Cardmarket',
        formatted: '€1.25',
        finish: 'regular',
        purchaseUrl: 'https://www.cardmarket.com/example',
      })
      expect(getCardPrice(pricedCard, 'tcgplayer')).toEqual({
        provider: 'tcgplayer',
        providerLabel: 'TCGplayer',
        formatted: '$2.50',
        finish: 'regular',
        purchaseUrl: 'https://www.tcgplayer.com/example',
      })
      expect(getCardPrice(pricedCard, 'cardhoarder')).toEqual({
        provider: 'cardhoarder',
        providerLabel: 'Cardhoarder',
        formatted: '0.40 tix',
        finish: 'regular',
        purchaseUrl: 'https://www.cardhoarder.com/example',
      })
    })

    it('falls back within the selected marketplace and labels the finish', () => {
      const fallbackCard = createCard({
        prices: {
          eur: null,
          eur_foil: '4.20',
          usd: null,
          usd_foil: null,
          usd_etched: '5.50',
        },
      })

      expect(getCardPrice(fallbackCard, 'cardmarket')).toMatchObject({
        formatted: '€4.20',
        finish: 'foil',
        purchaseUrl: null,
      })
      expect(getCardPrice(fallbackCard, 'tcgplayer')).toMatchObject({
        formatted: '$5.50',
        finish: 'etched',
        purchaseUrl: null,
      })
    })

    it('omits missing, invalid, zero, and cross-marketplace prices', () => {
      expect(
        getCardPrice(
          createCard({ prices: { eur: '', eur_foil: '-1', usd: '2.00' } }),
          'cardmarket'
        )
      ).toBeNull()
      expect(
        getCardPrice(createCard({ prices: { tix: 'not-a-price' } }), 'cardhoarder')
      ).toBeNull()
      expect(getCardPrice(createCard({ prices: { usd: '0' } }), 'tcgplayer')).toBeNull()
    })
  })

  describe('getTurnableCardFaces', () => {
    const faces = [
      {
        name: 'Valki, God of Lies',
        image_uris: { normal: 'https://cards.scryfall.io/valki.jpg' },
      },
      {
        name: 'Tibalt, Cosmic Impostor',
        image_uris: { normal: 'https://cards.scryfall.io/tibalt.jpg' },
      },
    ]

    it.each([
      'transform',
      'modal_dfc',
      'double_faced_token',
      'reversible_card',
    ])(
      'returns both display faces for the %s layout',
      (layout) => {
        expect(
          getTurnableCardFaces(
            createCard({
              name: 'Valki, God of Lies // Tibalt, Cosmic Impostor',
              layout,
              card_faces: faces,
            })
          )
        ).toEqual([
          {
            index: 0,
            name: 'Valki, God of Lies',
            imageUrl: 'https://cards.scryfall.io/valki.jpg',
          },
          {
            index: 1,
            name: 'Tibalt, Cosmic Impostor',
            imageUrl: 'https://cards.scryfall.io/tibalt.jpg',
          },
        ])
      }
    )

    it('does not make split cards or incomplete face data turnable', () => {
      expect(
        getTurnableCardFaces(
          createCard({ layout: 'split', card_faces: faces })
        )
      ).toEqual([])
      expect(
        getTurnableCardFaces(
          createCard({
            layout: 'modal_dfc',
            card_faces: [faces[0]!, { name: 'Missing reverse image' }],
          })
        )
      ).toEqual([])
      expect(getTurnableCardFaces(createCard())).toEqual([])
    })
  })

  describe('getPartnerVariant', () => {
    it('normalizes partner variants from oracle text with em-dash', () => {
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

    it('returns null for cards without any partner variant', () => {
      const noPartner = createCard({
        oracle_text: 'When this creature enters the battlefield, draw a card.',
      })
      const regularPartner = createCard({
        oracle_text: 'Partner (You can have two commanders if both have partner.)',
      })

      expect(getPartnerVariant(noPartner)).toBe(null)
      expect(getPartnerVariant(regularPartner)).toBe(null)
    })

    it('handles different dash types (hyphen, en-dash, em-dash)', () => {
      const hyphen = createCard({
        oracle_text: 'Partner-Survivors (You can have two commanders if both have this ability.)',
      })
      const enDash = createCard({
        oracle_text: 'Partner–Survivors (You can have two commanders if both have this ability.)',
      })
      const emDash = createCard({
        oracle_text: 'Partner—Survivors (You can have two commanders if both have this ability.)',
      })

      expect(getPartnerVariant(hyphen)).toBe('survivors')
      expect(getPartnerVariant(enDash)).toBe('survivors')
      expect(getPartnerVariant(emDash)).toBe('survivors')
    })

    it('handles trailing punctuation in different positions', () => {
      const trailingPeriod = createCard({
        oracle_text: 'Partner—Survivors. (You can have two commanders if both have this ability.)',
      })
      const trailingComma = createCard({
        oracle_text: 'Partner—Survivors, (You can have two commanders if both have this ability.)',
      })
      const trailingColon = createCard({
        oracle_text: 'Partner—Survivors: (You can have two commanders if both have this ability.)',
      })

      expect(getPartnerVariant(trailingPeriod)).toBe('survivors')
      expect(getPartnerVariant(trailingComma)).toBe('survivors')
      expect(getPartnerVariant(trailingColon)).toBe('survivors')
    })

    it('returns null when variant text is empty or only whitespace after dash', () => {
      const emptyVariant = createCard({
        oracle_text: 'Partner— (You can have two commanders if both have this ability.)',
      })
      const whitespaceVariant = createCard({
        oracle_text: 'Partner—   \n(You can have two commanders if both have this ability.)',
      })

      expect(getPartnerVariant(emptyVariant)).toBe(null)
      expect(getPartnerVariant(whitespaceVariant)).toBe(null)
    })
  })
})
describe("scryfall helper utilities", () => {
  it("creates a slug from the canonical portion of the name", () => {
    const card = createCard({
      name: "Kaya, Ghost of Heroes // Kaya, Eternity Weaver",
    });
    expect(getCardSlug(card)).toBe("kaya-ghost-of-heroes");
  });

  it("uses the front-face name when available", () => {
    const card = createCard({
      card_faces: [
        { name: "Ryusei, the Falling Star" } as any,
        { name: "Ryusei, the Ascended" } as any,
      ],
    });
    expect(getCardSlug(card)).toBe("ryusei-the-falling-star");
  });

  it("normalizes partner variants from oracle text", () => {
    const fatherAndSon = createCard({
      oracle_text:
        "Partner—Father & son (You can have two commanders if both have this ability.)",
    });
    const survivors = createCard({
      oracle_text:
        "Partner—Survivors (You can have two commanders if both have this ability.)",
    });

    expect(getPartnerVariant(fatherAndSon)).toBe("father & son");
    expect(getPartnerVariant(survivors)).toBe("survivors");
  });
});
