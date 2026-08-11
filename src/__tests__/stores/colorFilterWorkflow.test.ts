import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ScryfallCard } from '../../lib/scryfall'
import {
  useRandomanderStore,
  type ColorCount,
  type Mode,
} from '../../stores/randomander'

const card = (
  id: string,
  colors: string[],
  oracleText = ''
): ScryfallCard => ({
  id,
  name: `Card ${id}`,
  scryfall_uri: `https://scryfall.com/card/test/${id}`,
  type_line: 'Legendary Creature — Human Wizard',
  oracle_text: oracleText,
  color_identity: colors,
})

const response = (data: unknown) =>
  ({
    ok: true,
    status: 200,
    headers: new Headers(),
    json: async () => data,
  }) as Response

let clock = new Date('2026-08-03T15:00:00.000Z').getTime()

describe('store color-filter workflow integration', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    clock += 60_000
    vi.setSystemTime(clock)
    localStorage.clear()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.useRealTimers()
    localStorage.clear()
  })

  it.each<{
    mode: Mode
    count: ColorCount
    comparison: 'up-to' | 'exactly'
    colors: string[]
    message: RegExp
  }>([
    {
      mode: 'commander',
      count: '0',
      comparison: 'up-to',
      colors: ['W'],
      message: /zero-color result cannot use a colored focus/i,
    },
    {
      mode: 'partner',
      count: '3',
      comparison: 'exactly',
      colors: ['W', 'U'],
      message: /needs at least 3 focused colors/i,
    },
    {
      mode: 'spark',
      count: 'any',
      comparison: 'up-to',
      colors: ['C', 'W'],
      message: /colorless cannot be combined/i,
    },
  ])(
    'rejects an impossible $mode configuration before any request',
    async ({ mode, count, comparison, colors, message }) => {
      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)
      const store = useRandomanderStore()
      store.mode = mode
      store.options.colorCount = count
      store.options.colorCountMode = comparison
      store.options.selectedColors = colors

      await store.randomize()

      expect(fetchMock).not.toHaveBeenCalled()
      expect(store.errorMessage).toMatch(message)
      expect(store.isLoading).toBe(false)
      expect(store.history).toEqual([])
    }
  )

  it('keeps Commander Exactly truthful in both the request and accepted card', async () => {
    const fetchMock = vi.fn((_input: RequestInfo | URL) =>
      Promise.resolve(response(card('blue', ['U'])))
    )
    vi.stubGlobal('fetch', fetchMock)
    const store = useRandomanderStore()
    store.options.colorCount = '1'
    store.options.colorCountMode = 'exactly'
    store.options.selectedColors = ['W', 'U']

    const draw = store.randomize()
    await vi.runAllTimersAsync()
    await draw

    const query = new URL(String(fetchMock.mock.calls[0]?.[0])).searchParams.get('q')
    expect(query).toContain('ci<=wu')
    expect(query).toContain('ci=1')
    expect(store.cards.map((entry) => entry.id)).toEqual(['blue'])
  })

  it('applies Exactly to the combined Partner result', async () => {
    const fetchMock = vi
      .fn((_input: RequestInfo | URL) =>
        Promise.resolve(response(card('unused', [])))
      )
      .mockResolvedValueOnce(response(card('white', ['W'], 'Partner')))
      .mockResolvedValueOnce(response(card('blue', ['U'], 'Partner')))
    vi.stubGlobal('fetch', fetchMock)
    const store = useRandomanderStore()
    store.mode = 'partner'
    store.options.colorCount = '2'
    store.options.colorCountMode = 'exactly'
    store.options.selectedColors = ['W', 'U']

    const draw = store.randomize()
    await vi.runAllTimersAsync()
    await draw

    expect(store.cards.map((entry) => entry.id)).toEqual(['white', 'blue'])
    expect(fetchMock).toHaveBeenCalledTimes(2)
    fetchMock.mock.calls.forEach(([input]) => {
      const query = new URL(String(input)).searchParams.get('q')
      expect(query).toContain('ci<=wu')
      expect(query).toContain('ci<=2')
    })
  })

  it('chooses and satisfies an exact Spark palette', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const fetchMock = vi
      .fn((_input: RequestInfo | URL) =>
        Promise.resolve(response(card('unused', [])))
      )
      .mockResolvedValueOnce(response(card('white', ['W'])))
      .mockResolvedValueOnce(response(card('blue', ['U'])))
      .mockResolvedValueOnce(response(card('colorless', [])))
    vi.stubGlobal('fetch', fetchMock)
    const store = useRandomanderStore()
    store.mode = 'spark'
    store.options.colorCount = '2'
    store.options.colorCountMode = 'exactly'

    const draw = store.randomize()
    await vi.runAllTimersAsync()
    await draw

    expect(store.sparkPalette).toEqual(['W', 'U'])
    expect(store.cards.map((entry) => entry.id)).toEqual([
      'white',
      'blue',
      'colorless',
    ])
    fetchMock.mock.calls.forEach(([input]) => {
      const query = new URL(String(input)).searchParams.get('q')
      expect(query).toContain('ci<=wu')
      expect(query).toContain('ci<=2')
    })
  })
})
