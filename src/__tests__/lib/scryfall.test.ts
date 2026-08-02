import { describe, expect, it } from "vitest";
import {
  getCardSlug,
  getPartnerVariant,
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
