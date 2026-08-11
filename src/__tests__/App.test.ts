import { render, screen, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia } from 'pinia'
import App from '../App.vue'
import type { ScryfallCard } from '../lib/scryfall'
import { clearCache } from '../lib/cache'
import { useRandomanderStore } from '../stores/randomander'
import {
  PERSISTED_PARTITION_KEYS,
  decodePartitionEnvelope,
} from '../stores/persistenceCoordinator'

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
      container: {
        json_dict: {
          card: { num_decks: 500 },
        },
      },
      panels: {
        taglinks: [{ slug: 'infect', value: 'Infect', count: 1000 }],
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

const renderApp = (pinia = createPinia()) =>
  render(App, {
    global: {
      plugins: [pinia],
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

const readPersistedPreferences = () => {
  const raw = localStorage.getItem(PERSISTED_PARTITION_KEYS.preferences)
  if (!raw) return null
  const decoded = decodePartitionEnvelope(JSON.parse(raw), 'preferences')
  return decoded.ok ? decoded.envelope.value : null
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  clearCache()
  if (typeof localStorage !== 'undefined' && typeof localStorage.clear === 'function') {
    localStorage.clear()
  }
})

describe('Randomander', () => {
  it('moves focus into modal surfaces and restores the opener on close', async () => {
    renderApp()
    const user = userEvent.setup()
    const opener = screen.getAllByRole('button', { name: /filters/i })[0]!

    await user.click(opener)
    const dialog = await screen.findByRole('dialog', {
      name: /randomizer options/i,
    })

    await vi.waitFor(() => {
      expect(dialog).toContainElement(document.activeElement as HTMLElement)
    })

    await user.click(within(dialog).getByRole('button', { name: /done/i }))
    await vi.waitFor(() => expect(opener).toHaveFocus())
  })

  it('contains the Randomize state layer at desktop breakpoints', () => {
    renderApp()
    const randomize = screen.getByRole('button', { name: /^randomize$/i })

    expect(randomize).toHaveClass('fixed', 'sm:relative', 'sm:inset-auto')
    expect(randomize).not.toHaveClass('sm:static')
  })

  it('allows the Deck inspiration heading to reflow at narrow text sizes', () => {
    renderApp()
    const heading = screen.getByRole('heading', { name: /deck inspiration/i })

    expect(heading).toHaveClass('break-words', '[overflow-wrap:anywhere]')
    expect(heading.parentElement?.parentElement).toHaveClass(
      'min-w-0',
      'flex-col',
      'sm:flex-row'
    )
  })

  it('keeps mobile draw controls compact until the user expands them', async () => {
    renderApp()
    const user = userEvent.setup()
    const panel = document.querySelector('#draw-controls-panel')
    const showControls = screen.getByRole('button', {
      name: /show draw controls/i,
    })

    expect(panel).not.toBeNull()
    expect(panel).toHaveClass('hidden', 'lg:block')
    expect(showControls).toHaveAttribute('aria-expanded', 'false')
    expect(
      within(showControls.parentElement!).getByText('Commander')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^randomize$/i })).toBeInTheDocument()

    await user.click(showControls)

    const hideControls = screen.getByRole('button', {
      name: /hide draw controls/i,
    })
    expect(hideControls).toHaveAttribute('aria-expanded', 'true')
    expect(panel).toHaveClass('block')
    expect(panel).not.toHaveClass('hidden')
    expect(
      screen.getByRole('button', { name: /^commander\b/i }),
    ).toHaveAttribute('aria-pressed', 'true')

    await user.click(hideControls)

    expect(panel).toHaveClass('hidden', 'lg:block')
    expect(
      screen.getByRole('button', { name: /show draw controls/i }),
    ).toHaveAttribute('aria-expanded', 'false')
  })

  it('fetches a commander, shows external links, and renders visible EDHREC metadata', async () => {
    const fetchMock = createFetchMock(
      createCard({
        name: 'Atraxa, Praetors Voice',
        type_line: 'Legendary Creature — Phyrexian Angel Horror',
        oracle_text: 'Flying, vigilance, deathtouch, lifelink',
        prices: { eur: '1.25', usd: '2.50' },
        purchase_uris: {
          cardmarket: 'https://www.cardmarket.com/en/Magic/Products/example',
          tcgplayer: 'https://www.tcgplayer.com/product/example',
        },
      })
    )
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
    const inspiration = screen.getByRole('complementary', {
      name: /deck inspiration/i,
    })
    const cardText = within(inspiration).getByRole('region', {
      name: /card text for atraxa, praetors voice/i,
    })
    expect(
      within(inspiration).getByText('Legendary Creature — Phyrexian Angel Horror')
    ).toBeInTheDocument()
    expect(
      within(cardText).getByText('Flying, vigilance, deathtouch, lifelink')
    ).toBeInTheDocument()
    expect(
      within(inspiration).getByRole('link', {
        name: /cardmarket price for atraxa.*€1\.25/i,
      })
    ).toHaveAttribute(
      'href',
      'https://www.cardmarket.com/en/Magic/Products/example'
    )
    expect(within(inspiration).queryByText('$2.50')).not.toBeInTheDocument()
    expect(
      fetchMock.mock.calls.some(([input]) => {
        const url = typeof input === 'string' ? input : input.toString()
        return url.includes('cardmarket.com')
      })
    ).toBe(false)
    expect(await screen.findByText(/500 decks/i)).toBeInTheDocument()
    expect(screen.getByText('DECK THEMES')).toBeInTheDocument()
    expect(await screen.findByText('Infect')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Infect (opens in a new tab)' })
    ).toHaveAttribute(
      'href',
      'https://edhrec.com/commanders/atraxa-praetors-voice/infect'
    )
  })

  it('distinguishes metadata errors, retries them, and clears loaded metadata', async () => {
    const card = createCard({
      name: 'Atraxa, Praetors Voice',
      type_line: 'Legendary Creature — Phyrexian Angel Horror',
    })
    let metadataAttempts = 0
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('api.scryfall.com')) {
        return Promise.resolve(mockResponse(card))
      }
      if (url.includes('json.edhrec.com')) {
        metadataAttempts += 1
        return Promise.resolve(
          metadataAttempts === 1
            ? ({
                ok: false,
                status: 500,
                headers: new Headers(),
              } as Response)
            : mockEdhrecResponse()
        )
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`))
    })
    vi.stubGlobal('fetch', fetchMock)
    const pinia = createPinia()
    renderApp(pinia)
    const store = useRandomanderStore(pinia)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /^randomize$/i }))
    await screen.findAllByText('Atraxa, Praetors Voice')
    await user.click(screen.getByRole('button', { name: /show details/i }))

    const retry = await screen.findByRole('button', { name: /retry metadata/i })
    expect(retry.closest('[role="alert"]')).toHaveTextContent(
      /could not load \(500\)/i
    )

    await user.click(retry)
    expect(await screen.findByText('Infect')).toBeInTheDocument()
    expect(metadataAttempts).toBe(2)
    expect(store.getMetadataStateForCard(card, [card]).status).toBe(
      'success-data'
    )

    expect(store.clearNetworkCache()).toBe(true)
    expect(store.getMetadataStateForCard(card, [card]).status).toBe('idle')
    expect(store.getTagsForCard(card, [card])).toEqual([])
    expect(await screen.findByText(/themes are ready to load/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /load metadata/i })
    ).toBeInTheDocument()
    expect(screen.queryByText(/could not load \(500\)/i)).not.toBeInTheDocument()
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
        prices: { eur: '0.35' },
        purchase_uris: {
          cardmarket: 'https://www.cardmarket.com/en/Magic/Products/prava',
        },
      }),
      createCard({
        id: 'card-2',
        name: 'Malcolm, Keen-Eyed Navigator',
        scryfall_uri: 'https://scryfall.com/card/abc/malcolm-keen-eyed-navigator',
        color_identity: ['U'],
        type_line: 'Legendary Creature - Siren Pirate',
        oracle_text: 'Partner',
        keywords: ['Partner'],
        prices: { eur: '0.80' },
        purchase_uris: {
          cardmarket: 'https://www.cardmarket.com/en/Magic/Products/malcolm',
        },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    renderApp()
    const user = userEvent.setup()
    await user.click(screen.getAllByRole('button', { name: /partner pair/i })[0]!)
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
      screen.getByRole('link', {
        name: /cardmarket price for prava.*€0\.35/i,
      })
    ).toHaveAttribute(
      'href',
      'https://www.cardmarket.com/en/Magic/Products/prava'
    )
    expect(
      screen.getByRole('link', {
        name: /cardmarket price for malcolm.*€0\.80/i,
      })
    ).toHaveAttribute(
      'href',
      'https://www.cardmarket.com/en/Magic/Products/malcolm'
    )
    expect(
      screen
        .getAllByRole('link')
        .some((link) => link.getAttribute('href') === pairUrl)
    ).toBe(true)
  })

  it('randomizes a background for commanders with choose a background', async () => {
    const fetchMock = createFetchMock(
      createCard({
        id: 'card-1',
        name: 'Burakos, Party Leader',
        scryfall_uri: 'https://scryfall.com/card/abc/burakos-party-leader',
        color_identity: ['B'],
        type_line: 'Legendary Creature - Orc',
        oracle_text:
          'Choose a Background (You can have a Background as a second commander.)',
      }),
      createCard({
        id: 'card-2',
        name: 'Agent of the Iron Throne',
        scryfall_uri: 'https://scryfall.com/card/abc/agent-of-the-iron-throne',
        color_identity: ['B'],
        type_line: 'Legendary Enchantment - Background',
        oracle_text:
          'Commander creatures you own have "Whenever this creature attacks, defending player loses 1 life and you gain 1 life."',
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    renderApp()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /^randomize$/i }))
    await screen.findAllByText('Burakos, Party Leader')

    const backgroundButton = screen.getByRole('button', {
      name: /randomize background/i,
    })
    expect(screen.queryByRole('button', { name: /find commander/i })).not.toBeInTheDocument()

    await user.click(backgroundButton)

    expect(
      await screen.findByRole('heading', {
        name: /burakos, party leader \+ agent of the iron throne/i,
      })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: 'Agent of the Iron Throne' })
    ).toBeInTheDocument()
    const requestedUrls = fetchMock.mock.calls.map(([input]) =>
      typeof input === 'string' ? input : input.toString()
    )
    expect(requestedUrls.filter((url) => url.includes('api.scryfall.com'))).toHaveLength(2)
    expect(requestedUrls.some((url) => url.includes('json.edhrec.com'))).toBe(true)
  })

  it('finds a commander after drawing a Background first', async () => {
    const fetchMock = createFetchMock(
      createCard({
        id: 'background-card',
        name: 'Agent of the Iron Throne',
        scryfall_uri: 'https://scryfall.com/card/abc/agent-of-the-iron-throne',
        color_identity: ['B'],
        type_line: 'Legendary Enchantment — Background',
        oracle_text:
          'Commander creatures you own have "Whenever this creature attacks, defending player loses 1 life and you gain 1 life."',
      }),
      createCard({
        id: 'commander-card',
        name: 'Burakos, Party Leader',
        scryfall_uri: 'https://scryfall.com/card/abc/burakos-party-leader',
        color_identity: ['B'],
        type_line: 'Legendary Creature — Orc',
        oracle_text:
          'Choose a Background (You can have a Background as a second commander.)',
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    renderApp()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /^randomize$/i }))

    expect(
      await screen.findByRole('heading', { name: 'Agent of the Iron Throne' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: 'Agent of the Iron Throne' })
    ).toBeInTheDocument()
    const findCommander = screen.getByRole('button', { name: /find commander/i })
    expect(
      screen.getByRole('link', {
        name: /edhrec card \(opens in a new tab\)/i,
      })
    ).toHaveAttribute(
      'href',
      'https://edhrec.com/cards/agent-of-the-iron-throne'
    )
    expect(
      screen.queryByRole('button', { name: /randomize background/i })
    ).not.toBeInTheDocument()

    await user.click(findCommander)

    expect(
      await screen.findByRole('heading', {
        name: /burakos, party leader \+ agent of the iron throne/i,
      })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: 'Burakos, Party Leader' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: 'Agent of the Iron Throne' })
    ).toBeInTheDocument()

    const requestedScryfallUrls = fetchMock.mock.calls
      .map(([input]) => (typeof input === 'string' ? input : input.toString()))
      .filter((url) => url.includes('api.scryfall.com'))
    expect(requestedScryfallUrls).toHaveLength(2)

    const reverseCommanderQuery = new URL(requestedScryfallUrls[1]!).searchParams.get(
      'q'
    )
    expect(reverseCommanderQuery).toContain('is:commander legal:commander')
    expect(reverseCommanderQuery).toContain('o:"choose a background"')
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
    const randomize = screen.getByRole('button', { name: /^randomize$/i })
    await user.click(randomize)

    const loadingOverlay = screen.getByRole('dialog', {
      name: /shuffling cards/i,
    })
    expect(loadingOverlay).toBeInTheDocument()
    expect(loadingOverlay).toHaveAttribute('aria-modal', 'true')
    expect(loadingOverlay).toHaveTextContent(/shuffling cards/i)
    expect(screen.getByTestId('app-background')).toHaveAttribute('inert')
    expect(screen.getByTestId('persistence-background')).toHaveAttribute('inert')
    await vi.waitFor(() =>
      expect(
        within(loadingOverlay).getByRole('button', { name: /cancel draw/i })
      ).toHaveFocus()
    )

    resolveCard!(mockResponse(createCard()))
    await screen.findAllByText('Atraxa, Praetors Voice')

    await vi.waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: /shuffling cards/i })
      ).not.toBeInTheDocument()
      expect(randomize).toHaveFocus()
    })
  })

  it('cancels an active draw, restores focus, and permits a successful retry', async () => {
    const stalledResponse = new Promise<Response>(() => {})
    const fetchMock = vi
      .fn()
      .mockReturnValueOnce(stalledResponse)
      .mockResolvedValueOnce(
        mockResponse(createCard({ id: 'recovered', name: 'Recovered Commander' }))
      )
    vi.stubGlobal('fetch', fetchMock)

    renderApp()
    const user = userEvent.setup()
    const randomize = screen.getByRole('button', { name: /^randomize$/i })
    await user.click(randomize)

    const loadingOverlay = screen.getByRole('dialog', {
      name: /shuffling cards/i,
    })
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    await user.click(
      within(loadingOverlay).getByRole('button', { name: /cancel draw/i })
    )

    await vi.waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: /shuffling cards/i })
      ).not.toBeInTheDocument()
      expect(randomize).toHaveFocus()
    })
    expect(screen.getByTestId('app-background')).not.toHaveAttribute('inert')
    expect(screen.getByTestId('persistence-background')).not.toHaveAttribute('inert')
    const cancellation = screen.getByRole('alert')
    expect(cancellation).toHaveTextContent(/draw cancelled/i)
    const retry = within(cancellation).getByRole('button', { name: /try again/i })

    await user.click(retry)
    expect(await screen.findAllByText('Recovered Commander')).not.toHaveLength(0)
    expect(
      fetchMock.mock.calls.filter(([input]) =>
        (typeof input === 'string' ? input : input.toString()).includes(
          'api.scryfall.com'
        )
      )
    ).toHaveLength(2)
  })

  it('keeps the result and EDHREC inspiration concealed until a prestige reveal is skipped', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
    )
    const fetchMock = createFetchMock(
      createCard({ name: 'Atraxa, Praetors Voice' })
    )
    vi.stubGlobal('fetch', fetchMock)

    renderApp()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /^randomize$/i }))

    const skipButton = await screen.findByRole('button', { name: /skip reveal/i })
    expect(screen.queryByText('Atraxa, Praetors Voice')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('img', { name: 'Atraxa, Praetors Voice' })
    ).not.toBeInTheDocument()
    expectNoEdhrecMetadataFetch(fetchMock)

    await user.click(skipButton)

    const revealedHeading = await screen.findByText('Atraxa, Praetors Voice')
    expect(revealedHeading).toBeInTheDocument()
    await vi.waitFor(() => expect(revealedHeading).toHaveFocus())
    await vi.waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([input]) => {
          const url = typeof input === 'string' ? input : input.toString()
          return url.includes('json.edhrec.com')
        })
      ).toBe(true)
    })
  })

  it('renders deck inspiration for both options in distinct sections', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
    )
    const fetchMock = createFetchMock(
      createCard({
        id: 'card-1',
        name: 'Tymna the Weaver',
        type_line: 'Legendary Creature - Human Cleric',
        color_identity: ['W', 'B'],
        prices: { eur: '3.10' },
        purchase_uris: {
          cardmarket: 'https://www.cardmarket.com/en/Magic/Products/tymna',
        },
      }),
      createCard({
        id: 'card-2',
        name: 'Kraum, Ludevic\'s Opus',
        type_line: 'Legendary Creature - Zombie Horror',
        color_identity: ['U', 'R'],
        prices: { eur: '4.20' },
        purchase_uris: {
          cardmarket: 'https://www.cardmarket.com/en/Magic/Products/kraum',
        },
      })
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
    expect(screen.queryByText('Tymna the Weaver')).not.toBeInTheDocument()
    expectNoEdhrecMetadataFetch(fetchMock)

    await user.click(await screen.findByRole('button', { name: /skip reveal/i }))

    expect(screen.getAllByText('Tymna the Weaver').length).toBeGreaterThan(0)
    expect(screen.getAllByText("Kraum, Ludevic's Opus").length).toBeGreaterThan(0)

    await vi.waitFor(() => {
      const requestedEdhrecUrls = fetchMock.mock.calls
        .map(([input]) => (typeof input === 'string' ? input : input.toString()))
        .filter((url) => url.includes('json.edhrec.com'))

      expect(requestedEdhrecUrls).toHaveLength(2)
      expect(requestedEdhrecUrls).toEqual(
        expect.arrayContaining([
          'https://json.edhrec.com/pages/commanders/tymna-the-weaver.json',
          'https://json.edhrec.com/pages/commanders/kraum-ludevics-opus.json',
        ])
      )
    })

    const inspiration = screen.getByRole('complementary', {
      name: /deck inspiration/i,
    })
    const detailsToggle = within(inspiration).getByRole('button', {
      name: /show option details/i,
    })
    expect(detailsToggle).toHaveAttribute('aria-expanded', 'false')
    expect(
      within(inspiration).queryByRole('region', { name: /option [12]/i })
    ).not.toBeInTheDocument()

    await user.click(detailsToggle)
    expect(detailsToggle).toHaveAttribute('aria-expanded', 'true')
    expect(detailsToggle).toHaveAccessibleName(/hide option details/i)
    const optionRegions = within(inspiration).getAllByRole('region', {
      name: /option [12]/i,
    })
    expect(optionRegions).toHaveLength(2)

    const optionOne = within(inspiration).getByRole('region', {
      name: /option 1/i,
    })
    expect(
      within(optionOne).getByRole('heading', {
        level: 3,
        name: 'Tymna the Weaver',
      })
    ).toBeInTheDocument()
    expect(
      within(optionOne).getByText('Legendary Creature - Human Cleric')
    ).toBeInTheDocument()
    expect(within(optionOne).getByText(/500 decks/i)).toBeInTheDocument()
    expect(
      within(optionOne).getByRole('link', {
        name: /cardmarket price for tymna.*€3\.10/i,
      })
    ).toHaveAttribute(
      'href',
      'https://www.cardmarket.com/en/Magic/Products/tymna'
    )
    expect(within(optionOne).queryByText('€4.20')).not.toBeInTheDocument()
    expect(within(optionOne).getByText('DECK THEMES')).toBeInTheDocument()
    expect(
      within(optionOne).getByRole('link', {
        name: 'Infect (opens in a new tab)',
      })
    ).toHaveAttribute(
      'href',
      'https://edhrec.com/commanders/tymna-the-weaver/infect'
    )

    const optionTwo = within(inspiration).getByRole('region', {
      name: /option 2/i,
    })
    expect(
      within(optionTwo).getByRole('heading', {
        level: 3,
        name: "Kraum, Ludevic's Opus",
      })
    ).toBeInTheDocument()
    expect(
      within(optionTwo).getByText('Legendary Creature - Zombie Horror')
    ).toBeInTheDocument()
    expect(within(optionTwo).getByText(/500 decks/i)).toBeInTheDocument()
    expect(
      within(optionTwo).getByRole('link', {
        name: /cardmarket price for kraum.*€4\.20/i,
      })
    ).toHaveAttribute(
      'href',
      'https://www.cardmarket.com/en/Magic/Products/kraum'
    )
    expect(within(optionTwo).queryByText('€3.10')).not.toBeInTheDocument()
    expect(within(optionTwo).getByText('DECK THEMES')).toBeInTheDocument()
    expect(
      within(optionTwo).getByRole('link', {
        name: 'Infect (opens in a new tab)',
      })
    ).toHaveAttribute(
      'href',
      'https://edhrec.com/commanders/kraum-ludevics-opus/infect'
    )
  })

  it('turns double-faced cards independently in choice mode', async () => {
    const doubleFacedCard = (
      id: string,
      frontName: string,
      backName: string
    ) =>
      createCard({
        id,
        name: `${frontName} // ${backName}`,
        layout: 'modal_dfc',
        image_uris: undefined,
        card_faces: [
          {
            name: frontName,
            image_uris: {
              normal: `https://cards.scryfall.io/normal/${id}-front.jpg`,
            },
          },
          {
            name: backName,
            image_uris: {
              normal: `https://cards.scryfall.io/normal/${id}-back.jpg`,
            },
          },
        ],
      })
    const fetchMock = createFetchMock(
      doubleFacedCard(
        'valki',
        'Valki, God of Lies',
        'Tibalt, Cosmic Impostor'
      ),
      doubleFacedCard(
        'esika',
        'Esika, God of the Tree',
        'The Prismatic Bridge'
      )
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

    const choicesHeading = await screen.findByRole('heading', {
      name: /compare commanders/i,
    })
    const choicesSection = choicesHeading.closest('section')!
    const optionOne = within(choicesSection).getByText(/^option 1$/i).closest('article')!
    const optionTwo = within(choicesSection).getByText(/^option 2$/i).closest('article')!

    expect(
      within(optionOne).getByRole('img', {
        name: 'Valki, God of Lies (front face)',
      })
    ).toHaveAttribute(
      'src',
      'https://cards.scryfall.io/normal/valki-front.jpg'
    )
    expect(
      within(optionTwo).getByRole('img', {
        name: 'Esika, God of the Tree (front face)',
      })
    ).toBeInTheDocument()

    await user.click(
      within(optionOne).getByRole('button', {
        name: 'Show Tibalt, Cosmic Impostor (back face)',
      })
    )

    expect(
      within(optionOne).getByRole('img', {
        name: 'Tibalt, Cosmic Impostor (back face)',
      })
    ).toHaveAttribute(
      'src',
      'https://cards.scryfall.io/normal/valki-back.jpg'
    )
    expect(
      within(optionTwo).getByRole('img', {
        name: 'Esika, God of the Tree (front face)',
      })
    ).toHaveAttribute(
      'src',
      'https://cards.scryfall.io/normal/esika-front.jpg'
    )
  })

  it('finds a commander for a Background choice without changing the other option', async () => {
    const fetchMock = createFetchMock(
      createCard({
        id: 'background-option',
        name: 'Agent of the Iron Throne',
        color_identity: ['B'],
        type_line: 'Legendary Enchantment — Background',
      }),
      createCard({
        id: 'other-option',
        name: 'Muldrotha, the Gravetide',
        color_identity: ['U', 'B', 'G'],
        type_line: 'Legendary Creature — Elemental Avatar',
      }),
      createCard({
        id: 'background-commander',
        name: 'Burakos, Party Leader',
        color_identity: ['B'],
        type_line: 'Legendary Creature — Orc',
        oracle_text: 'Choose a Background',
      })
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

    const choicesHeading = await screen.findByRole('heading', {
      name: /compare commanders/i,
    })
    const choicesSection = choicesHeading.closest('section')!
    const optionOne = within(choicesSection).getByText(/^option 1$/i).closest('article')!
    const optionTwo = within(choicesSection).getByText(/^option 2$/i).closest('article')!

    expect(
      within(optionOne).getByRole('heading', { name: 'Agent of the Iron Throne' })
    ).toBeInTheDocument()
    const findCommander = within(optionOne).getByRole('button', {
      name: /find commander/i,
    })
    expect(
      within(optionTwo).getByRole('heading', { name: 'Muldrotha, the Gravetide' })
    ).toBeInTheDocument()

    await user.click(findCommander)

    expect(
      await within(optionOne).findByRole('heading', {
        name: 'Burakos, Party Leader + Agent of the Iron Throne',
      })
    ).toBeInTheDocument()
    expect(
      within(optionOne)
        .getAllByRole('listitem')
        .map((item) => within(item).getByRole('img').getAttribute('alt'))
    ).toEqual(['Burakos, Party Leader', 'Agent of the Iron Throne'])
    expect(
      within(optionTwo).getByRole('heading', { name: 'Muldrotha, the Gravetide' })
    ).toBeInTheDocument()

    const requestedScryfallUrls = fetchMock.mock.calls
      .map(([input]) => (typeof input === 'string' ? input : input.toString()))
      .filter((url) => url.includes('api.scryfall.com'))
    expect(requestedScryfallUrls).toHaveLength(3)
  })

  it('renders pair-specific deck inspiration for both partner choices', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
    )
    const partnerCard = (id: string, name: string, colorIdentity: string[]) =>
      createCard({
        id,
        name,
        color_identity: colorIdentity,
        type_line: 'Legendary Creature',
        oracle_text: 'Partner',
        keywords: ['Partner'],
      })
    const fetchMock = createFetchMock(
      partnerCard('card-1', 'Prava of the Steel Legion', ['W']),
      partnerCard('card-2', 'Malcolm, Keen-Eyed Navigator', ['U']),
      partnerCard('card-3', 'Tymna the Weaver', ['W', 'B']),
      partnerCard('card-4', "Kraum, Ludevic's Opus", ['U', 'R'])
    )
    vi.stubGlobal('fetch', fetchMock)

    renderApp()
    const user = userEvent.setup()
    const dialog = await openFiltersDialog(user)
    await user.click(within(dialog).getByRole('button', { name: /partner pair/i }))
    await user.click(
      within(dialog).getByRole('checkbox', { name: /show two partner options/i })
    )
    await user.click(within(dialog).getByRole('button', { name: /done/i }))
    await user.click(screen.getByRole('button', { name: /^randomize$/i }))

    expect(await screen.findByText(/option 1/i)).toBeInTheDocument()
    expect(screen.getByText(/option 2/i)).toBeInTheDocument()
    expectNoEdhrecMetadataFetch(fetchMock)

    await user.click(await screen.findByRole('button', { name: /skip reveal/i }))

    const firstPairName =
      'Prava of the Steel Legion + Malcolm, Keen-Eyed Navigator'
    const secondPairName = "Tymna the Weaver + Kraum, Ludevic's Opus"
    const firstPairSlug =
      'malcolm-keen-eyed-navigator-prava-of-the-steel-legion'
    const secondPairSlug = 'kraum-ludevics-opus-tymna-the-weaver'

    await vi.waitFor(() => {
      const requestedEdhrecUrls = fetchMock.mock.calls
        .map(([input]) => (typeof input === 'string' ? input : input.toString()))
        .filter((url) => url.includes('json.edhrec.com'))

      expect(requestedEdhrecUrls).toHaveLength(2)
      expect(requestedEdhrecUrls).toEqual(
        expect.arrayContaining([
          `https://json.edhrec.com/pages/commanders/${firstPairSlug}.json`,
          `https://json.edhrec.com/pages/commanders/${secondPairSlug}.json`,
        ])
      )
    })

    const inspiration = screen.getByRole('complementary', {
      name: /deck inspiration/i,
    })
    const detailsToggle = within(inspiration).getByRole('button', {
      name: /show option details/i,
    })
    expect(detailsToggle).toHaveAttribute('aria-expanded', 'false')
    await user.click(detailsToggle)
    expect(detailsToggle).toHaveAttribute('aria-expanded', 'true')
    const optionRegions = within(inspiration).getAllByRole('region', {
      name: /option [12]/i,
    })
    expect(optionRegions).toHaveLength(2)

    const pairExpectations = [
      { region: optionRegions[0]!, name: firstPairName, slug: firstPairSlug },
      { region: optionRegions[1]!, name: secondPairName, slug: secondPairSlug },
    ]

    pairExpectations.forEach(({ region, name, slug }) => {
      expect(within(region).getByRole('heading', { name })).toBeInTheDocument()
      expect(within(region).getByText(/500 decks/i)).toBeInTheDocument()
      expect(within(region).getByText('DECK THEMES')).toBeInTheDocument()
      expect(within(region).getByRole('link', { name: /edhrec pair/i })).toHaveAttribute(
        'href',
        `https://edhrec.com/commanders/${slug}`
      )
      expect(
        within(region).getByRole('link', {
          name: 'Infect (opens in a new tab)',
        })
      ).toHaveAttribute(
        'href',
        `https://edhrec.com/commanders/${slug}/infect`
      )
    })
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

    expect(
      await screen.findByText('Scryfall upstream failure: Request failed (500).')
    ).toBeInTheDocument()
    expect(screen.queryByText(/draw issue/i)).not.toBeInTheDocument()
  })

  it('keeps the draw controls focused on details and filters instead of save actions', async () => {
    const fetchMock = createFetchMock(createCard({ name: 'Atraxa, Praetors Voice' }))
    vi.stubGlobal('fetch', fetchMock)

    renderApp()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /^randomize$/i }))
    await screen.findAllByText('Atraxa, Praetors Voice')

    expect(screen.queryByRole('button', { name: /save current/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /saved pulls/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /show details/i })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /filters/i }).length).toBeGreaterThan(0)
  })

  it('restores the up to and exactly color comparison controls', async () => {
    renderApp()
    const user = userEvent.setup()
    const dialog = await openFiltersDialog(user)
    const comparisonSection = within(dialog)
      .getByRole('heading', { level: 3, name: /comparison/i })
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
    expect(
      within(
        screen.getByRole('button', { name: /show draw controls/i }).parentElement!
      ).getByText('1 filter')
    ).toBeInTheDocument()
  })

  it('applies the low-power preset without rendering a card-art backdrop', async () => {
    const fetchMock = createFetchMock(createCard({ name: 'Atraxa, Praetors Voice' }))
    vi.stubGlobal('fetch', fetchMock)

    renderApp()
    const user = userEvent.setup()
    await user.click(screen.getAllByRole('button', { name: /^settings$/i })[0]!)
    expect(await screen.findByRole('dialog', { name: /settings/i })).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: /low power/i }))

    const shell = screen.getByTestId('app-shell')
    expect(shell).toHaveAttribute('data-performance-mode', 'low-power')
    expect(shell).toHaveClass('app-reduced-motion')
    expect(shell).toHaveClass('app-simplified-backdrop')
    expect(shell).toHaveClass('app-reduced-transparency')

    await user.click(screen.getByRole('button', { name: /^close$/i }))
    await user.click(screen.getByRole('button', { name: /^randomize$/i }))
    await screen.findAllByText('Atraxa, Praetors Voice')

    expect(screen.queryByTestId('draw-backdrop')).not.toBeInTheDocument()
  })

  it('defaults price data to Cardmarket and persists another marketplace', async () => {
    localStorage.setItem(
      'randomander:state:v2',
      JSON.stringify({ display: { showLinks: true } })
    )
    const firstRender = renderApp()
    const user = userEvent.setup()

    await user.click(screen.getAllByRole('button', { name: /^settings$/i })[0]!)
    const settingsDialog = await screen.findByRole('dialog', { name: /settings/i })
    const providerSelect = within(settingsDialog).getByRole('combobox', {
      name: /marketplace/i,
    })

    expect(providerSelect).toHaveValue('cardmarket')
    expect(
      within(providerSelect)
        .getAllByRole('option')
        .map((option) => ({
          label: option.textContent?.trim(),
          value: option.getAttribute('value'),
        }))
    ).toEqual([
      { label: 'Cardmarket (EUR)', value: 'cardmarket' },
      { label: 'TCGplayer (USD)', value: 'tcgplayer' },
      { label: 'Cardhoarder (tix)', value: 'cardhoarder' },
    ])
    await user.selectOptions(providerSelect, 'tcgplayer')

    await vi.waitFor(() => {
      expect(readPersistedPreferences()?.display.priceProvider).toBe(
        'tcgplayer'
      )
      expect(localStorage.getItem('randomander:state:v2')).toBeNull()
    })

    firstRender.unmount()
    renderApp()
    await user.click(screen.getAllByRole('button', { name: /^settings$/i })[0]!)
    const reopenedDialog = await screen.findByRole('dialog', { name: /settings/i })

    expect(
      within(reopenedDialog).getByRole('combobox', { name: /marketplace/i })
    ).toHaveValue('tcgplayer')
  })

  it('repairs an invalid persisted marketplace to Cardmarket', async () => {
    localStorage.setItem(
      'randomander:state:v2',
      JSON.stringify({ display: { priceProvider: 'retired-marketplace' } })
    )

    renderApp()
    const user = userEvent.setup()
    await user.click(screen.getAllByRole('button', { name: /^settings$/i })[0]!)
    const settingsDialog = await screen.findByRole('dialog', { name: /settings/i })

    expect(
      within(settingsDialog).getByRole('combobox', { name: /marketplace/i })
    ).toHaveValue('cardmarket')
    await vi.waitFor(() => {
      expect(readPersistedPreferences()?.display.priceProvider).toBe(
        'cardmarket'
      )
      expect(localStorage.getItem('randomander:state:v2')).toBeNull()
    })
  })

  it('switches visible price data to the selected marketplace', async () => {
    const fetchMock = createFetchMock(
      createCard({
        name: 'Atraxa, Praetors Voice',
        prices: { eur: '1.25', usd: '2.50' },
        purchase_uris: {
          cardmarket: 'https://www.cardmarket.com/en/Magic/Products/example',
          tcgplayer: 'https://www.tcgplayer.com/product/example',
        },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    renderApp()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /^randomize$/i }))
    await screen.findAllByText('Atraxa, Praetors Voice')
    await user.click(screen.getByRole('button', { name: /show details/i }))

    const inspiration = screen.getByRole('complementary', {
      name: /deck inspiration/i,
    })
    expect(
      within(inspiration).getByRole('link', {
        name: /cardmarket price for atraxa.*€1\.25/i,
      })
    ).toHaveAttribute(
      'href',
      'https://www.cardmarket.com/en/Magic/Products/example'
    )

    const scryfallRequestsBeforeSwitch = fetchMock.mock.calls.filter(([input]) => {
      const url = typeof input === 'string' ? input : input.toString()
      return url.includes('api.scryfall.com')
    }).length

    await user.click(screen.getAllByRole('button', { name: /^settings$/i })[0]!)
    const settingsDialog = await screen.findByRole('dialog', { name: /settings/i })
    await user.selectOptions(
      within(settingsDialog).getByRole('combobox', { name: /marketplace/i }),
      'tcgplayer'
    )
    await user.click(within(settingsDialog).getByRole('button', { name: /^close$/i }))

    expect(
      within(inspiration).getByRole('link', {
        name: /tcgplayer price for atraxa.*\$2\.50/i,
      })
    ).toHaveAttribute('href', 'https://www.tcgplayer.com/product/example')
    expect(within(inspiration).queryByText('€1.25')).not.toBeInTheDocument()
    expect(
      fetchMock.mock.calls.filter(([input]) => {
        const url = typeof input === 'string' ? input : input.toString()
        return url.includes('api.scryfall.com')
      })
    ).toHaveLength(scryfallRequestsBeforeSwitch)

    await user.click(screen.getAllByRole('button', { name: /^settings$/i })[0]!)
    const reopenedSettings = await screen.findByRole('dialog', { name: /settings/i })
    await user.click(
      within(reopenedSettings).getByRole('checkbox', { name: /external links/i })
    )
    await user.click(
      within(reopenedSettings).getByRole('button', { name: /^close$/i })
    )

    expect(
      within(inspiration).queryByRole('link', { name: /tcgplayer price/i })
    ).not.toBeInTheDocument()
    expect(within(inspiration).getByText('$2.50')).toBeInTheDocument()
  })

  it('persists the choice to skip future card reveals', async () => {
    const firstRender = renderApp()
    const user = userEvent.setup()

    await user.click(screen.getAllByRole('button', { name: /^settings$/i })[0]!)
    const settingsDialog = await screen.findByRole('dialog', { name: /settings/i })
    const revealToggle = within(settingsDialog).getByRole('checkbox', {
      name: /card reveal animation/i,
    })

    expect(revealToggle).toBeChecked()
    await user.click(revealToggle)

    await vi.waitFor(() => {
      expect(
        readPersistedPreferences()?.display.enablePrestigeReveal
      ).toBe(false)
    })

    firstRender.unmount()
    renderApp()
    await user.click(screen.getAllByRole('button', { name: /^settings$/i })[0]!)
    const reopenedDialog = await screen.findByRole('dialog', { name: /settings/i })

    expect(
      within(reopenedDialog).getByRole('checkbox', {
        name: /card reveal animation/i,
      })
    ).not.toBeChecked()
  })

  it('stops a partner search when Scryfall rate-limits the request', async () => {
    const primary = createCard({
      id: 'partner-primary',
      name: 'Prava of the Steel Legion',
      color_identity: ['W'],
      oracle_text: 'Partner',
      keywords: ['Partner'],
    })
    let requestCount = 0
    const fetchMock = vi.fn(() => {
      requestCount += 1
      if (requestCount === 1) return Promise.resolve(mockResponse(primary))
      return Promise.resolve({
        ok: false,
        status: 429,
        headers: new Headers({ 'Retry-After': '60' }),
      } as Response)
    })
    vi.stubGlobal('fetch', fetchMock)

    renderApp()
    const user = userEvent.setup()
    await user.click(screen.getAllByRole('button', { name: /partner pair/i })[0]!)
    await user.click(screen.getByRole('button', { name: /^randomize$/i }))

    expect(
      await screen.findByText(/Scryfall is rate-limiting this connection/i)
    ).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
