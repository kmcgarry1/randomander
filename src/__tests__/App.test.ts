import { render, screen, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia } from 'pinia'
import App from '../App.vue'
import type { ScryfallCard } from '../lib/scryfall'
import { clearCache } from '../lib/cache'

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
    expect(screen.getByText('DECK THEMES')).toBeInTheDocument()
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
      screen.getByRole('link', { name: /open background on edhrec/i })
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
    expect(revealedHeading).toHaveFocus()
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
      }),
      createCard({
        id: 'card-2',
        name: 'Kraum, Ludevic\'s Opus',
        type_line: 'Legendary Creature - Zombie Horror',
        color_identity: ['U', 'R'],
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

    await user.click(screen.getByRole('button', { name: /skip reveal/i }))

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
    const optionRegions = within(inspiration).getAllByRole('region', {
      name: /option [12]/i,
    })
    expect(optionRegions).toHaveLength(2)

    const optionOne = within(inspiration).getByRole('region', {
      name: /option 1/i,
    })
    expect(
      within(optionOne).getByRole('heading', { name: 'Tymna the Weaver' })
    ).toBeInTheDocument()
    expect(
      within(optionOne).getByText('Legendary Creature - Human Cleric')
    ).toBeInTheDocument()
    expect(within(optionOne).getByText(/500 decks/i)).toBeInTheDocument()
    expect(within(optionOne).getByText('DECK THEMES')).toBeInTheDocument()
    expect(within(optionOne).getByRole('link', { name: 'Infect' })).toHaveAttribute(
      'href',
      'https://edhrec.com/commanders/tymna-the-weaver/infect'
    )

    const optionTwo = within(inspiration).getByRole('region', {
      name: /option 2/i,
    })
    expect(
      within(optionTwo).getByRole('heading', { name: "Kraum, Ludevic's Opus" })
    ).toBeInTheDocument()
    expect(
      within(optionTwo).getByText('Legendary Creature - Zombie Horror')
    ).toBeInTheDocument()
    expect(within(optionTwo).getByText(/500 decks/i)).toBeInTheDocument()
    expect(within(optionTwo).getByText('DECK THEMES')).toBeInTheDocument()
    expect(within(optionTwo).getByRole('link', { name: 'Infect' })).toHaveAttribute(
      'href',
      'https://edhrec.com/commanders/kraum-ludevics-opus/infect'
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

    await user.click(screen.getByRole('button', { name: /skip reveal/i }))

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
      expect(within(region).getByRole('link', { name: 'Infect' })).toHaveAttribute(
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

    expect(await screen.findByText('Request failed (500).')).toBeInTheDocument()
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
    expect(
      within(
        screen.getByRole('button', { name: /show draw controls/i }).parentElement!
      ).getByText('1 filter')
    ).toBeInTheDocument()
  })

  it('applies the low-power preset to the shell and backdrop', async () => {
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

    expect(screen.getByTestId('draw-backdrop')).toHaveAttribute(
      'data-mode',
      'simplified'
    )
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
      const persisted = JSON.parse(
        localStorage.getItem('randomander:state:v2') ?? '{}'
      ) as { display?: { enablePrestigeReveal?: boolean } }
      expect(persisted.display?.enablePrestigeReveal).toBe(false)
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
