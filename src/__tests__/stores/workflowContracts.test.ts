import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ScryfallCard } from '../../lib/scryfall'
import {
  DRAW_WORKFLOW_CALL_BUDGET,
  DRAW_WORKFLOW_DEADLINE_MS,
  useRandomanderStore,
  type OptionsState,
  type PullRecord,
} from '../../stores/randomander'

const createCard = (
  id: string,
  overrides: Partial<ScryfallCard> = {}
): ScryfallCard => ({
  id,
  name: `Card ${id}`,
  scryfall_uri: `https://scryfall.com/card/test/${id}`,
  type_line: 'Legendary Creature — Human Wizard',
  oracle_text: '',
  color_identity: ['W'],
  ...overrides,
})

const response = (data: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    json: async () => data,
  }) as Response

const recordOptions: OptionsState = {
  colorCount: '1',
  selectedColors: ['W'],
  limitByDecks: false,
  maxDecks: 1000,
  twoChoices: false,
  excludeGameChangers: false,
  useRankCutoff: false,
  colorCountMode: 'exactly',
}

const createRecord = (): PullRecord => ({
  id: 'existing-record',
  createdAt: '2026-08-03T12:00:00.000Z',
  mode: 'commander',
  options: { ...recordOptions, selectedColors: [...recordOptions.selectedColors] },
  cards: [createCard('existing')],
})

let clock = new Date('2026-08-03T12:00:00.000Z').getTime()

describe('draw workflow budget, deadline, and provenance', () => {
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

  it('shares one fixed call budget across nested choice and pair retries', async () => {
    const incompatiblePartner = createCard('same-partner', {
      name: 'Same Partner',
      oracle_text: 'Partner',
    })
    const fetchMock = vi.fn(() =>
      Promise.resolve(response(incompatiblePartner))
    )
    vi.stubGlobal('fetch', fetchMock)

    const store = useRandomanderStore()
    store.mode = 'partner'
    store.options.twoChoices = true
    const startedAt = Date.now()

    const draw = store.randomize()
    await vi.runAllTimersAsync()
    await draw

    expect(fetchMock).toHaveBeenCalledTimes(DRAW_WORKFLOW_CALL_BUDGET)
    expect(Date.now() - startedAt).toBeLessThan(DRAW_WORKFLOW_DEADLINE_MS)
    expect(store.errorMessage).toMatch(/no legal match.*24-call limit/i)
    expect(store.cards).toEqual([])
    expect(store.choices).toEqual([])
    expect(store.history).toEqual([])
  })

  it('enforces one end-to-end deadline through the transport abort signal', async () => {
    const fetchMock = vi.fn(
      () => new Promise<Response>(() => undefined)
    )
    vi.stubGlobal('fetch', fetchMock)

    const store = useRandomanderStore()
    const draw = store.randomize()
    await vi.advanceTimersByTimeAsync(0)

    await vi.advanceTimersByTimeAsync(DRAW_WORKFLOW_DEADLINE_MS - 1)
    expect(store.isLoading).toBe(true)
    await vi.advanceTimersByTimeAsync(1)
    await draw

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(store.isLoading).toBe(false)
    expect(store.errorMessage).toMatch(/draw timed out after 10 seconds/i)
  })

  it('stops a nested pair workflow immediately on an upstream failure', async () => {
    const primary = createCard('primary', {
      name: 'Primary Partner',
      oracle_text: 'Partner',
    })
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(primary))
      .mockResolvedValueOnce(response({}, 500))
    vi.stubGlobal('fetch', fetchMock)

    const store = useRandomanderStore()
    store.mode = 'partner'
    const draw = store.randomize()
    await vi.runAllTimersAsync()
    await draw

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(store.errorMessage).toMatch(/scryfall upstream failure.*500/i)
  })

  it.each([
    ['mode', (store: ReturnType<typeof useRandomanderStore>) => {
      store.mode = 'spark'
    }],
    ['selected colors', (store: ReturnType<typeof useRandomanderStore>) => {
      store.options.selectedColors.push('U')
    }],
  ])(
    'synchronously invalidates and prevents late commits after an in-flight %s change',
    async (_label, changeConfiguration) => {
      let resolveFetch: ((value: Response) => void) | undefined
      const fetchMock = vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveFetch = resolve
          })
      )
      vi.stubGlobal('fetch', fetchMock)

      const store = useRandomanderStore()
      store.loadRecord(createRecord())
      const draw = store.randomize()
      await vi.advanceTimersByTimeAsync(0)
      expect(store.isLoading).toBe(true)

      changeConfiguration(store)

      expect(store.isLoading).toBe(false)
      expect(store.cards).toEqual([])
      expect(store.choices).toEqual([])
      expect(store.errorMessage).toBe('')

      resolveFetch?.(response(createCard('late')))
      await vi.advanceTimersByTimeAsync(0)
      await draw

      expect(store.cards).toEqual([])
      expect(store.history).toEqual([])
    }
  )

  it('retains loaded result provenance through a failed retry and save', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(response({}, 500)))
    )
    const store = useRandomanderStore()
    const record = createRecord()

    store.loadRecord(record)
    expect(store.cards).toHaveLength(1)

    const draw = store.randomize()
    await vi.runAllTimersAsync()
    await draw

    expect(store.cards[0]?.id).toBe('existing')
    expect(store.errorMessage).toMatch(/upstream failure/i)
    expect(store.saveCurrent()).toBe(true)
    expect(store.saved[0]).toMatchObject({
      mode: 'commander',
      options: {
        colorCount: '1',
        colorCountMode: 'exactly',
        selectedColors: ['W'],
      },
      cards: [{ id: 'existing' }],
    })
  })

  it('distinguishes explicit cancellation from timeout and allows no late commit', async () => {
    let resolveFetch: ((value: Response) => void) | undefined
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveFetch = resolve
          })
      )
    )
    const store = useRandomanderStore()
    const draw = store.randomize()
    await vi.advanceTimersByTimeAsync(0)

    expect(store.cancelActiveRequest()).toBe(true)
    expect(store.isLoading).toBe(false)
    expect(store.errorMessage).toBe('Draw cancelled.')

    resolveFetch?.(response(createCard('late')))
    await vi.advanceTimersByTimeAsync(0)
    await draw
    expect(store.cards).toEqual([])
    expect(store.history).toEqual([])
  })
})
