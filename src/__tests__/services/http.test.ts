import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchJson,
  RequestTimeoutError,
} from '../../services/http'

const response = (json: () => Promise<unknown>) =>
  ({
    ok: true,
    status: 200,
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
