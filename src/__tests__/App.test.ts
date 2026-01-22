import { render, screen, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia } from 'pinia'
import App from '../App.vue'
import type { ScryfallCard } from '../lib/scryfall'

const createCard = (overrides: Partial<ScryfallCard> = {}): ScryfallCard => ({
  id: 'card-1',
  name: 'Atraxa, Praetors Voice',
  scryfall_uri: 'https://scryfall.com/card/abc/atraxa-praetors-voice',
  color_identity: ['W', 'U', 'B', 'G'],
  image_uris: {
    normal: 'https://cards.scryfall.io/normal/front/a/b/abc123.jpg',
  },
  ...overrides,
})

const mockResponse = (card: ScryfallCard) =>
  ({
    ok: true,
    json: async () => card,
  } as Response)

const mockEdhrecResponse = () =>
  ({
    ok: true,
    json: async () => ({
      num_decks: 500,
      panels: {
        links: [
          {
            header: 'Tags',
            items: [
              {
                href: '/tags/infect/atraxa-praetors-voice',
                value: 'Infect',
              },
            ],
          },
        ],
        taglinks: [{ slug: 'infect', count: 1000 }],
      },
    }),
  } as Response)

const createFetchMock = (...cards: ScryfallCard[]) => {
  const queue = [...cards]
  return vi.fn((input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString()
    if (url.includes('api.scryfall.com')) {
      const card = queue.shift()
      if (!card) {
        return Promise.reject(new Error('No more mock cards available'))
      }
      return Promise.resolve(mockResponse(card))
    }
    if (url.includes('json.edhrec.com')) {
      return Promise.resolve(mockEdhrecResponse())
    }
    return Promise.reject(new Error(`Unexpected fetch: ${url}`))
  })
}

afterEach(() => {
  vi.restoreAllMocks()
  if (typeof localStorage !== 'undefined' && typeof localStorage.clear === 'function') {
    localStorage.clear()
  }
})

describe('Randomander', () => {
  it('fetches a commander and shows Scryfall and EDHREC links', async () => {
    const fetchMock = createFetchMock(
      createCard({ name: 'Atraxa, Praetors Voice' })
    )
    vi.stubGlobal('fetch', fetchMock)

    render(App, {
      global: {
        plugins: [createPinia()],
      },
    })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /^randomize$/i }))

    expect(fetchMock).toHaveBeenCalled()
    const cardNames = await screen.findAllByText('Atraxa, Praetors Voice')
    expect(cardNames.length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /scryfall/i })).toHaveAttribute(
      'href',
      'https://scryfall.com/card/abc/atraxa-praetors-voice'
    )
    expect(screen.getByRole('link', { name: /edhrec commander/i })).toHaveAttribute(
      'href',
      'https://edhrec.com/commanders/atraxa-praetors-voice'
    )
  })

  it('draws three cards in 3-card spark mode', async () => {
    const fetchMock = createFetchMock(
      createCard({ id: 'card-1', name: 'Sol Ring' }),
      createCard({ id: 'card-2', name: 'Cultivate' }),
      createCard({ id: 'card-3', name: 'Lightning Greaves' })
    )
    vi.stubGlobal('fetch', fetchMock)

    render(App, {
      global: {
        plugins: [createPinia()],
      },
    })
    const user = userEvent.setup()
    const optionsButtons = screen.getAllByRole('button', { name: /options/i })
    await user.click(optionsButtons[0])
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /3-card spark/i }))
    await user.click(within(dialog).getByRole('button', { name: /done/i }))
    await user.click(screen.getByRole('button', { name: /^randomize$/i }))

    const results = await screen.findAllByRole('listitem')
    expect(results).toHaveLength(3)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
