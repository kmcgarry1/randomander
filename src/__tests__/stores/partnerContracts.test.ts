import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ScryfallCard } from '../../lib/scryfall'
import { clearCache } from '../../lib/cache'
import { useRandomanderStore } from '../../stores/randomander'

const createCard = (overrides: Partial<ScryfallCard> = {}): ScryfallCard => ({
  id: 'virtus',
  name: 'Virtus the Veiled',
  scryfall_uri: 'https://scryfall.com/card/test/virtus',
  type_line: 'Legendary Creature — Azra Rogue',
  oracle_text: 'Partner with Gorm the Great',
  color_identity: ['B'],
  ...overrides,
})

const response = (data: unknown) =>
  ({
    ok: true,
    status: 200,
    headers: new Headers(),
    json: async () => data,
  }) as Response

describe('partner completion contracts', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    clearCache()
    localStorage.clear()
  })

  it('does not complete a named pair when the partner exceeds the deck limit', async () => {
    const primary = createCard()
    const namedPartner = createCard({
      id: 'gorm',
      name: 'Gorm the Great',
      scryfall_uri: 'https://scryfall.com/card/test/gorm',
      oracle_text: 'Partner with Virtus the Veiled',
      color_identity: ['G'],
    })
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('api.scryfall.com/cards/named')) {
        return Promise.resolve(response(namedPartner))
      }
      if (url.includes('json.edhrec.com')) {
        return Promise.resolve(
          response({ container: { json_dict: { card: { num_decks: 500 } } } })
        )
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`))
    })
    vi.stubGlobal('fetch', fetchMock)

    const store = useRandomanderStore()
    store.options.limitByDecks = true
    store.options.maxDecks = 100
    store.cards = [primary]

    await store.randomizePartnerForPrimary()

    expect(store.cards).toEqual([primary])
    expect(store.errorMessage).toMatch(/named partner.*deck limit/i)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
