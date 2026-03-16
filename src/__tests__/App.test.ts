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

const renderApp = () =>
  render(App, {
    global: {
      plugins: [createPinia()],
    },
  })

const openFiltersDialog = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getAllByRole('button', { name: /filters/i })[0]!)
  return screen.findByRole('dialog', { name: /randomizer options/i })
}

const expectNoEdhrecMetadataFetch = (fetchMock: ReturnType<typeof vi.fn>) => {
  const requestedEdhrecJson = fetchMock.mock.calls.some(([input]) => {
    const url = typeof input === 'string' ? input : input.toString()
    return url.includes('json.edhrec.com')
  })
  expect(requestedEdhrecJson).toBe(false)
}

afterEach(() => {
  vi.restoreAllMocks()
  if (typeof localStorage !== 'undefined' && typeof localStorage.clear === 'function') {
    localStorage.clear()
  }
})

describe('Randomander', () => {
  it('fetches a commander, shows external links, and renders visible EDHREC metadata', async () => {
    const fetchMock = createFetchMock(createCard({ name: 'Atraxa, Praetors Voice' }))
    vi.stubGlobal('fetch', fetchMock)

    renderApp()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /^randomize$/i }))

    expect(fetchMock).toHaveBeenCalled()
    const cardNames = await screen.findAllByText('Atraxa, Praetors Voice')
    expect(cardNames.length).toBeGreaterThan(0)
    expect(
      screen
        .getAllByRole('link', { name: /scryfall/i })
        .every(
          (link) =>
            link.getAttribute('href') ===
            'https://scryfall.com/card/abc/atraxa-praetors-voice'
        )
    ).toBe(true)
    expect(
      screen
        .getAllByRole('link', { name: /edhrec commander|edhrec/i })
        .some(
          (link) =>
            link.getAttribute('href') ===
            'https://edhrec.com/commanders/atraxa-praetors-voice'
        )
    ).toBe(true)
    await user.click(screen.getByRole('button', { name: /show details/i }))
    expect(await screen.findByText(/500 decks/i)).toBeInTheDocument()
    expect(await screen.findByText('Infect')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Infect' })).toHaveAttribute(
      'href',
      'https://edhrec.com/commanders/atraxa-praetors-voice/infect'
    )
  })

  it('uses the alphabetical EDHREC pair page and combines partner details', async () => {
    const fetchMock = createFetchMock(
      createCard({
        id: 'card-1',
        name: 'Prava of the Steel Legion',
        scryfall_uri: 'https://scryfall.com/card/abc/prava-of-the-steel-legion',
        color_identity: ['W'],
        type_line: 'Legendary Creature - Cat Soldier',
        oracle_text: 'Partner',
        keywords: ['Partner'],
      }),
      createCard({
        id: 'card-2',
        name: 'Malcolm, Keen-Eyed Navigator',
        scryfall_uri: 'https://scryfall.com/card/abc/malcolm-keen-eyed-navigator',
        color_identity: ['U'],
        type_line: 'Legendary Creature - Siren Pirate',
        oracle_text: 'Partner',
        keywords: ['Partner'],
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    renderApp()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /partner pair/i }))
    await user.click(screen.getByRole('button', { name: /^randomize$/i }))

    const pairUrl =
      'https://edhrec.com/commanders/malcolm-keen-eyed-navigator-prava-of-the-steel-legion'

    await vi.waitFor(() => {
      expect(
        screen
          .getAllByRole('link')
          .some((link) => link.getAttribute('href') === pairUrl)
      ).toBe(true)
    })

    await user.click(screen.getByRole('button', { name: /show details/i }))

    expect(screen.getAllByText(/500 decks/i)).toHaveLength(1)
    expect(
      screen
        .getAllByRole('link')
        .some((link) => link.getAttribute('href') === pairUrl)
    ).toBe(true)
  })

  it('draws three cards in 3-card spark mode', async () => {
    const fetchMock = createFetchMock(
      createCard({ id: 'card-1', name: 'Sol Ring' }),
      createCard({ id: 'card-2', name: 'Cultivate' }),
      createCard({ id: 'card-3', name: 'Lightning Greaves' })
    )
    vi.stubGlobal('fetch', fetchMock)

    renderApp()
    const user = userEvent.setup()
    const dialog = await openFiltersDialog(user)
    await user.click(within(dialog).getByRole('button', { name: /3-card spark/i }))
    await user.click(within(dialog).getByRole('button', { name: /done/i }))
    await user.click(screen.getByRole('button', { name: /^randomize$/i }))

    const results = await screen.findAllByRole('listitem')
    expect(results).toHaveLength(3)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('shows loading overlay while fetching cards', async () => {
    let resolveCard: (value: Response) => void
    const cardPromise = new Promise<Response>((resolve) => {
      resolveCard = resolve
    })

    const fetchMock = vi.fn(() => cardPromise)
    vi.stubGlobal('fetch', fetchMock)

    renderApp()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /^randomize$/i }))

    const loadingOverlay = screen.getByRole('status', { name: /loading cards/i })
    expect(loadingOverlay).toBeInTheDocument()
    expect(loadingOverlay).toHaveTextContent(/shuffling cards/i)

    resolveCard!(mockResponse(createCard()))
    await screen.findAllByText('Atraxa, Praetors Voice')

    await vi.waitFor(() => {
      expect(screen.queryByRole('status', { name: /loading cards/i })).not.toBeInTheDocument()
    })
  })

  it('renders both options in two-choice mode', async () => {
    const fetchMock = createFetchMock(
      createCard({ id: 'card-1', name: 'Tymna the Weaver' }),
      createCard({ id: 'card-2', name: 'Kraum, Ludevic\'s Opus' })
    )
    vi.stubGlobal('fetch', fetchMock)

    renderApp()
    const user = userEvent.setup()
    const dialog = await openFiltersDialog(user)
    await user.click(
      within(dialog).getByRole('checkbox', { name: /show two commander options/i })
    )
    await user.click(within(dialog).getByRole('button', { name: /done/i }))
    await user.click(screen.getByRole('button', { name: /^randomize$/i }))

    expect(await screen.findByText(/option 1/i)).toBeInTheDocument()
    expect(screen.getByText(/option 2/i)).toBeInTheDocument()
    expect(screen.getAllByText('Tymna the Weaver').length).toBeGreaterThan(0)
    expect(screen.getAllByText("Kraum, Ludevic's Opus").length).toBeGreaterThan(0)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expectNoEdhrecMetadataFetch(fetchMock)
  })

  it('shows inline error messaging when a draw fails', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
      } as Response)
    )
    vi.stubGlobal('fetch', fetchMock)

    renderApp()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /^randomize$/i }))

    expect(await screen.findByText('Request failed (500).')).toBeInTheDocument()
    expect(screen.getByText(/draw issue/i)).toBeInTheDocument()
  })

  it('saves the current result once and opens it from the saved panel', async () => {
    const fetchMock = createFetchMock(createCard({ name: 'Atraxa, Praetors Voice' }))
    vi.stubGlobal('fetch', fetchMock)

    renderApp()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /^randomize$/i }))
    await screen.findAllByText('Atraxa, Praetors Voice')

    await user.click(screen.getByRole('button', { name: /save current/i }))

    const savedButton = screen.getByRole('button', { name: /^saved$/i })
    expect(savedButton).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /saved pulls/i }))

    const panel = await screen.findByRole('dialog', { name: /saved pulls/i })
    expect(within(panel).getByText(/saved pulls/i)).toBeInTheDocument()
    expect(within(panel).getByText('Atraxa, Praetors Voice')).toBeInTheDocument()
  })

  it('restores the up to and exactly color comparison controls', async () => {
    renderApp()
    const user = userEvent.setup()
    const dialog = await openFiltersDialog(user)
    const comparisonSection = within(dialog)
      .getByText(/comparison/i)
      .closest('section')

    expect(comparisonSection).not.toBeNull()
    expect(
      within(comparisonSection!).getByRole('button', { name: /up to/i })
    ).toBeInTheDocument()
    expect(
      within(comparisonSection!).getByRole('button', { name: /exactly/i })
    ).toBeInTheDocument()

    await user.click(
      within(comparisonSection!).getByRole('button', { name: /exactly/i })
    )
    await user.click(within(dialog).getByRole('button', { name: /done/i }))

    expect(screen.getAllByText('Exact colors').length).toBeGreaterThan(0)
  })

  it('applies the low-power preset to the shell and backdrop', async () => {
    const fetchMock = createFetchMock(createCard({ name: 'Atraxa, Praetors Voice' }))
    vi.stubGlobal('fetch', fetchMock)

    renderApp()
    const user = userEvent.setup()
    await user.click(screen.getAllByRole('button', { name: /^settings$/i })[0]!)
    await user.click(await screen.findByRole('button', { name: /low power/i }))

    const shell = screen.getByTestId('app-shell')
    expect(shell).toHaveAttribute('data-performance-mode', 'low-power')
    expect(shell).toHaveClass('app-reduced-motion')
    expect(shell).toHaveClass('app-simplified-backdrop')
    expect(shell).toHaveClass('app-reduced-transparency')

    await user.click(screen.getAllByRole('button', { name: /back to draw/i })[0]!)
    await user.click(screen.getByRole('button', { name: /^randomize$/i }))
    await screen.findAllByText('Atraxa, Praetors Voice')

    expect(screen.getByTestId('draw-backdrop')).toHaveAttribute(
      'data-mode',
      'simplified'
    )
  })
})
