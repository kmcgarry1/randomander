import { describe, expect, it } from 'vitest'
import {
  usesCommanderMetadataLink,
  getMetadataKey,
  getMetadataTargets,
  getMetadataFailureMessage,
  type MetadataTargetOptions,
} from '../../stores/randomanderMetadata'
import { HttpError, RequestTimeoutError } from '../../services/http'
import { RuntimeDataError } from '../../lib/runtimeValidation'
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

const createBackgroundCard = (): ScryfallCard => ({
  id: 'bg-1',
  name: 'Test Background',
  scryfall_uri: 'https://scryfall.com/card/test/bg',
  type_line: 'Enchantment — Background',
  oracle_text: 'Background rules text.',
  color_identity: ['U'],
  image_uris: {
    normal: 'https://cards.scryfall.io/normal/front/bg.jpg',
  },
})

describe('usesCommanderMetadataLink', () => {
  it('returns true for commander mode with non-background card', () => {
    const card = createCard()
    expect(usesCommanderMetadataLink('commander', card)).toBe(true)
  })

  it('returns true for partner mode with non-background card', () => {
    const card = createCard()
    expect(usesCommanderMetadataLink('partner', card)).toBe(true)
  })

  it('returns false for spark mode', () => {
    const card = createCard()
    expect(usesCommanderMetadataLink('spark', card)).toBe(false)
  })

  it('returns false for background card regardless of mode', () => {
    const bgCard = createBackgroundCard()
    expect(usesCommanderMetadataLink('commander', bgCard)).toBe(false)
    expect(usesCommanderMetadataLink('partner', bgCard)).toBe(false)
  })
})

describe('getMetadataKey', () => {
  it('returns card slug for single card', () => {
    const card = createCard({ name: 'Atraxa, Praetors Voice' })
    const result = getMetadataKey(card, [card], false)
    expect(result).toContain('atraxa')
  })

  it('returns card slug for group with usePairTags disabled', () => {
    const card1 = createCard({ name: 'Card One' })
    const card2 = createCard({ id: 'card-2', name: 'Card Two' })
    const result = getMetadataKey(card1, [card1, card2], false)
    expect(result).toContain('card-one')
    expect(result).not.toContain('card-two')
  })

  it('returns pair identifier for two-card group with usePairTags enabled', () => {
    const card1 = createCard({ name: 'Card One', id: 'card-1' })
    const card2 = createCard({ name: 'Card Two', id: 'card-2' })
    const result = getMetadataKey(card1, [card1, card2], true)
    // For pairs, it should return a pair identifier
    expect(result).toBeDefined()
  })

  it('returns card slug for single card even with usePairTags enabled', () => {
    const card = createCard({ name: 'Single Card' })
    const result = getMetadataKey(card, [card], true)
    expect(result).toContain('single-card')
  })
})

describe('getMetadataTargets', () => {
  const baseOptions: MetadataTargetOptions = {
    enabled: true,
    mode: 'commander',
    showTags: true,
    usePairTags: false,
  }

  it('returns empty map when disabled', () => {
    const card = createCard({ name: 'Test Card' })
    const result = getMetadataTargets([[card]], { ...baseOptions, enabled: false })
    expect(result.size).toBe(0)
  })

  it('returns empty map when showTags is false', () => {
    const card = createCard({ name: 'Test Card' })
    const result = getMetadataTargets([[card]], { ...baseOptions, showTags: false })
    expect(result.size).toBe(0)
  })

  it('returns empty map for spark mode', () => {
    const card = createCard({ name: 'Test Card' })
    const result = getMetadataTargets([[card]], { ...baseOptions, mode: 'spark' })
    expect(result.size).toBe(0)
  })

  it('skips empty groups', () => {
    const card = createCard({ name: 'Test Card' })
    const result = getMetadataTargets([[], [card]], baseOptions)
    expect(result.size).toBe(1)
  })

  it('skips background cards when usePairTags enabled', () => {
    const bgCard = createBackgroundCard()
    const card = createCard({ name: 'Commander' })
    const result = getMetadataTargets(
      [[bgCard, card]],
      { ...baseOptions, usePairTags: true }
    )
    expect(result.size).toBe(1)
  })

  it('skips pair groups with only background cards', () => {
    const bgCard = createBackgroundCard()
    const result = getMetadataTargets(
      [[bgCard, bgCard]],
      { ...baseOptions, usePairTags: true }
    )
    expect(result.size).toBe(0)
  })

  it('includes single card targets in commander mode', () => {
    const card = createCard({ name: 'Atraxa, Praetors Voice' })
    const result = getMetadataTargets([[card]], baseOptions)
    expect(result.size).toBeGreaterThan(0)
    const slugs = Array.from(result.values())[0]
    expect(slugs).toBeDefined()
    expect(Array.isArray(slugs)).toBe(true)
  })

  it('skips background cards in single-card mode', () => {
    const bgCard = createBackgroundCard()
    const result = getMetadataTargets([[bgCard]], baseOptions)
    expect(result.size).toBe(0)
  })

  it('handles multiple card groups', () => {
    const card1 = createCard({ name: 'Card One', id: 'card-1' })
    const card2 = createCard({ name: 'Card Two', id: 'card-2' })
    const card3 = createCard({ name: 'Card Three', id: 'card-3' })
    const result = getMetadataTargets([[card1], [card2], [card3]], baseOptions)
    expect(result.size).toBeGreaterThanOrEqual(2)
  })

  it('handles pair groups with matching and non-matching slug order', () => {
    const card1 = createCard({ name: 'Aaa Card', id: 'card-1' })
    const card2 = createCard({ name: 'Zzz Card', id: 'card-2' })
    const result = getMetadataTargets(
      [[card1, card2]],
      { ...baseOptions, usePairTags: true }
    )
    expect(result.size).toBeGreaterThan(0)
  })

  it('handles multiple groups with pairs and singles', () => {
    const card1 = createCard({ name: 'Single One', id: 'card-1' })
    const card2 = createCard({ name: 'Pair One', id: 'card-2' })
    const card3 = createCard({ name: 'Pair Two', id: 'card-3' })
    const result = getMetadataTargets(
      [[card1], [card2, card3]],
      { ...baseOptions, usePairTags: true }
    )
    expect(result.size).toBeGreaterThan(0)
  })
})

describe('getMetadataFailureMessage', () => {
  it('returns timeout message for RequestTimeoutError', () => {
    const error = new RequestTimeoutError(5000)
    const message = getMetadataFailureMessage(error)
    expect(message).toMatch(/timed out/)
  })

  it('includes status code in HttpError message', () => {
    const error = new HttpError(500)
    const message = getMetadataFailureMessage(error)
    expect(message).toMatch(/500/)
  })

  it('includes message in RuntimeDataError', () => {
    const error = new RuntimeDataError('metadata', 'field', 'invalid structure')
    const message = getMetadataFailureMessage(error)
    expect(message).toMatch(/invalid structure/)
  })

  it('handles 404 errors', () => {
    const error = new HttpError(404)
    const message = getMetadataFailureMessage(error)
    expect(message).toMatch(/404/)
  })

  it('handles 429 rate limit errors', () => {
    const error = new HttpError(429)
    const message = getMetadataFailureMessage(error)
    expect(message).toMatch(/429/)
  })

  it('provides fallback message for unknown errors', () => {
    const error = new Error('Unknown error')
    const message = getMetadataFailureMessage(error)
    expect(message).toMatch(/could not load/)
  })

  it('handles null/undefined gracefully', () => {
    const message1 = getMetadataFailureMessage(null)
    const message2 = getMetadataFailureMessage(undefined)
    expect(message1).toMatch(/could not load/)
    expect(message2).toMatch(/could not load/)
  })
})
