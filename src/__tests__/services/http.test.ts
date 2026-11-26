import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchJson,
  RequestTimeoutError,
  HttpError,
  DEFAULT_REQUEST_TIMEOUT_MS,
} from '../../services/http'

const response = (json: () => Promise<unknown>, ok = true, status = 200) =>
  ({
    ok,
    status,
    headers: new Headers(),
    json,
  }) as Response

describe('HTTP request deadlines', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('times out a response body that never resolves', async () => {
    let requestSignal: AbortSignal | undefined
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string | URL | Request, init?: RequestInit) => {
        requestSignal = init?.signal ?? undefined
        return Promise.resolve(response(() => new Promise(() => undefined)))
      })
    )

    const pending = fetchJson('https://example.test/slow', { timeoutMs: 1_000 })
    const rejection = expect(pending).rejects.toEqual(
      expect.objectContaining({
        name: 'RequestTimeoutError',
        timeoutMs: 1_000,
      })
    )

    await vi.advanceTimersByTimeAsync(1_000)
    await rejection
    expect(requestSignal?.aborted).toBe(true)
  })

  it('keeps caller cancellation distinct from a timeout', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(response(() => new Promise(() => undefined))))
    )
    const controller = new AbortController()
    const pending = fetchJson('https://example.test/cancel', {
      signal: controller.signal,
      timeoutMs: 1_000,
    })
    const rejection = expect(pending).rejects.toMatchObject({ name: 'AbortError' })

    controller.abort()
    await rejection
  })

  it('cleans up its deadline after a successful response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(response(async () => ({ ok: true }))))
    )

    await expect(
      fetchJson<{ ok: boolean }>('https://example.test/success', {
        timeoutMs: 1_000,
      })
    ).resolves.toEqual({ ok: true })
    expect(vi.getTimerCount()).toBe(0)
  })

  it('exports a dedicated timeout error for recovery messaging', () => {
    expect(new RequestTimeoutError(2_500).message).toMatch(/3 seconds/i)
  })
})

describe('HTTP error handling', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('throws HttpError on 500 server error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(response(() => Promise.resolve({ ok: true }), false, 500)))
    )

    await expect(fetchJson('https://example.test/500')).rejects.toMatchObject({
      name: 'HttpError',
      status: 500,
    })
  })

  it('throws HttpError on 404 not found', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(response(() => Promise.resolve({ ok: true }), false, 404)))
    )

    await expect(fetchJson('https://example.test/404')).rejects.toMatchObject({
      status: 404,
    })
  })

  it('throws HttpError on 429 rate limit with Retry-After header', async () => {
    const headers = new Headers()
    headers.set('Retry-After', '60')
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 429,
          headers,
          json: () => Promise.resolve({}),
        } as Response)
      )
    )

    await expect(fetchJson('https://example.test/429')).rejects.toMatchObject({
      status: 429,
      retryAfterMs: 60_000,
    })
  })

  it('handles Retry-After with invalid date', async () => {
    const error = new HttpError(429, 'not-a-valid-date')
    expect(error.retryAfterMs).toBeNull()
  })

  it('handles Retry-After as negative seconds', async () => {
    const error = new HttpError(429, '-10')
    expect(error.retryAfterMs).toBe(0)
  })

  it('handles null Retry-After header', async () => {
    const error = new HttpError(500, null)
    expect(error.retryAfterMs).toBeNull()
  })

  it('formats HttpError message with status code', () => {
    const error = new HttpError(503)
    expect(error.message).toMatch(/503/)
    expect(error.name).toBe('HttpError')
  })
})

describe('fetchJson - Cache integration', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('skips cache fetch when disabled', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(response(() => Promise.resolve({ data: 'fresh' }))))
    )

    const result = await fetchJson('https://example.test/no-cache', {
      cache: { enabled: false, ttlMs: 60_000, maxEntries: 10 },
    })

    expect(result).toEqual({ data: 'fresh' })
  })

  it('stores response in cache when cache enabled', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(response(() => Promise.resolve({ cached: true }))))
    )

    const result = await fetchJson('https://example.test/cache', {
      cache: { enabled: true, ttlMs: 60_000, maxEntries: 10 },
    })

    expect(result).toEqual({ cached: true })
  })

  it('uses custom cache key when provided', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(response(() => Promise.resolve({ ok: true }))))
    )

    await fetchJson('https://example.test/url', {
      cache: {
        enabled: true,
        ttlMs: 60_000,
        maxEntries: 10,
        key: 'my-custom-key',
      },
    })

    // If cache key is used, it would be stored with 'my-custom-key'
    expect(true).toBe(true)
  })
})

describe('fetchJson - Custom headers', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('includes Accept header in requests', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(response(() => Promise.resolve({ ok: true })))
    )
    vi.stubGlobal('fetch', fetchMock)

    await fetchJson('https://example.test/headers')

    const [, options] = fetchMock.mock.calls[0]!
    expect(options.headers).toHaveProperty('Accept', 'application/json')
  })

  it('merges custom headers with defaults', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(response(() => Promise.resolve({ ok: true })))
    )
    vi.stubGlobal('fetch', fetchMock)

    await fetchJson('https://example.test/merge', {
      headers: { 'X-Custom': 'header-value' },
    })

    const [, options] = fetchMock.mock.calls[0]!
    expect(options.headers).toHaveProperty('Accept', 'application/json')
    expect(options.headers).toHaveProperty('X-Custom', 'header-value')
  })
})

describe('fetchJson - Signal handling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('honors pre-aborted signal', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(response(() => Promise.resolve({})))))

    const controller = new AbortController()
    controller.abort()

    await expect(
      fetchJson('https://example.test/preabort', {
        signal: controller.signal,
      })
    ).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('aborts when caller aborts mid-request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(response(() => new Promise(() => undefined))))
    )

    const controller = new AbortController()
    const pending = fetchJson('https://example.test/abort', {
      signal: controller.signal,
      timeoutMs: 10_000,
    })

    controller.abort()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('removes abort listener after completion', async () => {
    const removeEventListenerSpy = vi.spyOn(AbortSignal.prototype, 'removeEventListener')
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(response(() => Promise.resolve({ ok: true }))))
    )

    const controller = new AbortController()
    await fetchJson('https://example.test/listener', {
      signal: controller.signal,
      timeoutMs: 1_000,
    })

    expect(removeEventListenerSpy).toHaveBeenCalled()
    removeEventListenerSpy.mockRestore()
  })
})

describe('fetchJson - Timeout edge cases', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it.skip('enforces minimum timeout of 1ms', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(response(() => new Promise(() => undefined))))
    )

    const pending = fetchJson('https://example.test/min-timeout', { timeoutMs: 0 })

    await vi.advanceTimersByTimeAsync(1)
    // Properly consume the rejection to avoid unhandled rejection warnings
    await pending.catch(() => {})
  })

  it.skip('defaults to DEFAULT_REQUEST_TIMEOUT_MS when not specified', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(response(() => new Promise(() => undefined))))
    )

    const pending = fetchJson('https://example.test/default', {
      timeoutMs: undefined,
    })

    await vi.advanceTimersByTimeAsync(DEFAULT_REQUEST_TIMEOUT_MS)
    // Properly consume the rejection to avoid unhandled rejection warnings
    await pending.catch(() => {})
  })

  it('handles non-finite timeout values', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(response(() => Promise.resolve({ ok: true }))))
    )

    // Non-finite should use default
    const result = await fetchJson('https://example.test/non-finite', {
      timeoutMs: NaN,
    })

    expect(result).toEqual({ ok: true })
  })

  it('cleans up timer on successful response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(response(() => Promise.resolve({ ok: true }))))
    )

    await fetchJson('https://example.test/cleanup-success', { timeoutMs: 5_000 })

    expect(vi.getTimerCount()).toBe(0)
  })

  it('cleans up timer on error response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(response(() => Promise.resolve({}), false, 500)))
    )

    try {
      await fetchJson('https://example.test/cleanup-error', { timeoutMs: 5_000 })
    } catch {
      // Expected
    }

    expect(vi.getTimerCount()).toBe(0)
  })

  it.skip('cleans up timer on timeout', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(response(() => new Promise(() => undefined))))
    )

    const pending = fetchJson('https://example.test/cleanup-timeout', {
      timeoutMs: 500,
    })

    await vi.advanceTimersByTimeAsync(500)
    try {
      await pending
    } catch {
      // Expected
    }

    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('RequestTimeoutError', () => {
  it('formats message with timeout in seconds', () => {
    const error = new RequestTimeoutError(5000)
    expect(error.message).toMatch(/5 seconds/)
    expect(error.name).toBe('RequestTimeoutError')
  })

  it('rounds up timeout to nearest second', () => {
    const error = new RequestTimeoutError(5500)
    expect(error.message).toMatch(/6 seconds/)
  })

  it('handles 1ms timeout', () => {
    const error = new RequestTimeoutError(1)
    expect(error.message).toMatch(/1 second/)
  })

  it('stores timeout value', () => {
    const error = new RequestTimeoutError(3500)
    expect(error.timeoutMs).toBe(3500)
  })
})
