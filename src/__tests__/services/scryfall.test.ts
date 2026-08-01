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

describe('Scryfall request policy', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-01T10:00:00.000Z'))
    localStorage.clear()
    vi.resetModules()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('paces independent random-card requests below the upstream limit', async () => {
    let requestNumber = 0
    const fetchMock = vi.fn(() =>
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
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 429,
        headers: new Headers({ 'Retry-After': '120' }),
      } as Response)
    )
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
  })

  it('treats an opaque CORS failure as a cooldown instead of retrying', async () => {
    const fetchMock = vi.fn(() =>
      Promise.reject(new TypeError('NetworkError when attempting to fetch resource.'))
    )
    vi.stubGlobal('fetch', fetchMock)
    const { fetchRandomCard } = await import('../../services/scryfall')

    const first = fetchRandomCard('is:commander')
    const firstRejection = expect(first).rejects.toThrow(
      /may be rate-limiting this connection/i
    )
    await vi.advanceTimersByTimeAsync(0)
    await firstRejection

    const blocked = fetchRandomCard('is:commander')
    const blockedRejection = expect(blocked).rejects.toThrow(
      /may be rate-limiting this connection/i
    )
    await vi.advanceTimersByTimeAsync(0)
    await blockedRejection
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(59_999)
    const stillBlocked = fetchRandomCard('is:commander')
    const stillBlockedRejection = expect(stillBlocked).rejects.toThrow(
      /may be rate-limiting this connection/i
    )
    await vi.advanceTimersByTimeAsync(0)
    await stillBlockedRejection
    expect(fetchMock).toHaveBeenCalledTimes(1)
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
})
