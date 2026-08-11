import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const createCardResponse = (id: string) =>
  ({
    ok: true,
    status: 200,
    headers: new Headers(),
    json: async () => ({
      id,
      name: `Card ${id}`,
      scryfall_uri: `https://scryfall.com/card/test/${id}`,
      color_identity: [],
      image_uris: { normal: `https://cards.scryfall.io/${id}.jpg` },
    }),
  }) as Response

const createSearchResponse = (page: number, totalCards: number) => {
  const startIndex = (page - 1) * 175
  const pageLength = Math.min(175, totalCards - startIndex)

  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    json: async () => ({
      total_cards: totalCards,
      data: Array.from({ length: pageLength }, (_, index) => ({
        id: String(startIndex + index),
        name: `Card ${startIndex + index}`,
        scryfall_uri: `https://scryfall.com/card/test/${startIndex + index}`,
        color_identity: [],
      })),
    }),
  } as Response
}

describe('Scryfall request policy', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-01T10:00:00.000Z'))
    localStorage.clear()
    vi.resetModules()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it.each([
    ['the first card after the skipped indices', 0, 1, '40'],
    ['the end of the partially eligible first page', 134.25 / 360, 1, '174'],
    ['the start of the full middle page', 135.25 / 360, 2, '175'],
    ['the middle of the full middle page', 180.25 / 360, 2, '220'],
    ['the start of the partial final page', 310.25 / 360, 3, '350'],
    ['the end of the partial final page', 359.25 / 360, 3, '399'],
  ])(
    'samples %s uniformly across eligible cards',
    async (_description, randomValue, expectedPage, expectedId) => {
      const fetchMock = vi.fn((input: string | URL | Request) => {
        const page = Number(new URL(String(input)).searchParams.get('page') ?? '1')
        return Promise.resolve(createSearchResponse(page, 400))
      })
      vi.stubGlobal('fetch', fetchMock)
      vi.spyOn(Math, 'random').mockReturnValue(randomValue as number)
      const { fetchRankedRandomCard } = await import('../../services/scryfall')

      const result = fetchRankedRandomCard('is:commander')
      await vi.runAllTimersAsync()

      await expect(result).resolves.toMatchObject({ id: expectedId })
      expect(fetchMock).toHaveBeenCalledTimes(expectedPage === 1 ? 1 : 2)
      if (expectedPage > 1) {
        expect(String(fetchMock.mock.calls[1]?.[0])).toContain(
          `&page=${expectedPage}`
        )
      }
    }
  )

  it('paces independent random-card requests below the upstream limit', async () => {
    let requestNumber = 0
    const fetchMock = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) =>
      Promise.resolve(createCardResponse(String(++requestNumber)))
    )
    vi.stubGlobal('fetch', fetchMock)
    const { fetchRandomCard } = await import('../../services/scryfall')

    const first = fetchRandomCard('is:commander')
    const second = fetchRandomCard('is:commander')

    await vi.advanceTimersByTimeAsync(0)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(149)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)

    await expect(Promise.all([first, second])).resolves.toHaveLength(2)
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      headers: { Accept: 'application/json;q=0.9,*/*;q=0.8' },
    })
  })

  it('does not retry a 429 and blocks follow-up traffic during cooldown', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ 'Retry-After': '120' }),
      } as Response)
      .mockResolvedValueOnce(createCardResponse('after-cooldown'))
    vi.stubGlobal('fetch', fetchMock)
    const { fetchRandomCard } = await import('../../services/scryfall')

    const first = fetchRandomCard('is:commander')
    const firstRejection = expect(first).rejects.toThrow(/rate-limiting.*wait/i)
    await vi.advanceTimersByTimeAsync(0)
    await firstRejection

    const blocked = fetchRandomCard('is:commander')
    const blockedRejection = expect(blocked).rejects.toThrow(
      /rate-limiting.*wait/i
    )
    await vi.advanceTimersByTimeAsync(0)
    await blockedRejection
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(59_999)
    const stillBlocked = fetchRandomCard('is:commander')
    const stillBlockedRejection = expect(stillBlocked).rejects.toThrow(
      /rate-limiting.*wait/i
    )
    await vi.advanceTimersByTimeAsync(0)
    await stillBlockedRejection
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(60_001)
    const recovered = fetchRandomCard('is:commander')
    await vi.advanceTimersByTimeAsync(0)

    await expect(recovered).resolves.toMatchObject({ id: 'after-cooldown' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('allows the next paced request to recover immediately after an offline failure', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(
        new TypeError('NetworkError when attempting to fetch resource.')
      )
      .mockResolvedValueOnce(createCardResponse('online'))
    vi.stubGlobal('fetch', fetchMock)
    const { fetchRandomCard } = await import('../../services/scryfall')

    const first = fetchRandomCard('is:commander')
    const firstRejection = expect(first).rejects.toMatchObject({
      kind: 'network',
      recoverable: true,
    })
    await vi.advanceTimersByTimeAsync(0)
    await firstRejection

    const recovered = fetchRandomCard('is:commander')
    await vi.advanceTimersByTimeAsync(149)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)

    await expect(recovered).resolves.toMatchObject({ id: 'online' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('cancels a queued request without sending it', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(createCardResponse('one')))
    vi.stubGlobal('fetch', fetchMock)
    const { fetchRandomCard } = await import('../../services/scryfall')

    const first = fetchRandomCard('is:commander')
    await vi.advanceTimersByTimeAsync(0)
    await first

    const controller = new AbortController()
    const queued = fetchRandomCard('is:commander', controller.signal)
    const queuedRejection = expect(queued).rejects.toMatchObject({
      name: 'AbortError',
    })
    await vi.advanceTimersByTimeAsync(0)
    controller.abort()

    await queuedRejection
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('rejects an aborted request immediately while an earlier request is in flight', async () => {
    let resolveFirst: ((response: Response) => void) | undefined
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFirst = resolve
        })
    )
    vi.stubGlobal('fetch', fetchMock)
    const { fetchRandomCard } = await import('../../services/scryfall')

    const first = fetchRandomCard('is:commander')
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const controller = new AbortController()
    const queued = fetchRandomCard('is:commander', controller.signal)
    const queuedRejection = expect(queued).rejects.toMatchObject({
      name: 'AbortError',
    })
    controller.abort()
    await queuedRejection

    resolveFirst?.(createCardResponse('one'))
    await first
    await vi.runAllTimersAsync()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('serves a cached named card while live requests are cooling down', async () => {
    const cachedCard = createCardResponse('cached')
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(cachedCard)
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ 'Retry-After': '60' }),
      } as Response)
    vi.stubGlobal('fetch', fetchMock)
    const { fetchCardByExactName, fetchRandomCard } = await import(
      '../../services/scryfall'
    )
    const cache = { enabled: true, ttlMs: 60_000, maxEntries: 10 }

    const first = fetchCardByExactName('Cached Card', undefined, cache)
    await vi.advanceTimersByTimeAsync(0)
    await expect(first).resolves.toMatchObject({ id: 'cached' })

    const limited = fetchRandomCard('is:commander')
    const limitedRejection = expect(limited).rejects.toThrow(/rate-limiting/i)
    await vi.advanceTimersByTimeAsync(150)
    await limitedRejection

    await expect(
      fetchCardByExactName('Cached Card', undefined, cache)
    ).resolves.toMatchObject({ id: 'cached' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('returns a typed recoverable data error for a malformed card response', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ id: 'missing-required-fields' }),
      } as Response)
    )
    vi.stubGlobal('fetch', fetchMock)
    const { fetchRandomCard } = await import('../../services/scryfall')

    const draw = fetchRandomCard('is:commander')
    const rejection = expect(draw).rejects.toMatchObject({
      name: 'ScryfallRequestError',
      kind: 'data',
      recoverable: true,
      cause: {
        name: 'RuntimeDataError',
        source: 'scryfall',
      },
    })
    await vi.advanceTimersByTimeAsync(0)
    await rejection
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('rejects malformed ranked search envelopes without a follow-up request', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ data: 'not-an-array', total_cards: 10 }),
      } as Response)
    )
    vi.stubGlobal('fetch', fetchMock)
    const { fetchRankedRandomCard } = await import('../../services/scryfall')

    const draw = fetchRankedRandomCard('is:commander')
    const rejection = expect(draw).rejects.toMatchObject({ kind: 'data' })
    await vi.advanceTimersByTimeAsync(0)
    await rejection
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('evicts a malformed named-card cache entry and recovers from the network', async () => {
    const { setCachedValue } = await import('../../lib/cache')
    const cache = {
      enabled: true,
      ttlMs: 60_000,
      maxEntries: 10,
      key: 'named-card-fixture',
    }
    setCachedValue(cache.key, { id: 'malformed' }, cache.ttlMs, cache.maxEntries)
    const fetchMock = vi.fn(() => Promise.resolve(createCardResponse('recovered')))
    vi.stubGlobal('fetch', fetchMock)
    const { fetchCardByExactName } = await import('../../services/scryfall')

    const request = fetchCardByExactName('Recovered', undefined, cache)
    await vi.advanceTimersByTimeAsync(0)

    await expect(request).resolves.toMatchObject({ id: 'recovered' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
