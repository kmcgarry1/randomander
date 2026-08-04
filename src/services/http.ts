import { getCachedValue, setCachedValue } from '../lib/cache'

export type CacheOptions = {
  enabled: boolean
  ttlMs: number
  maxEntries: number
  key?: string
}

type FetchJsonOptions = {
  signal?: AbortSignal
  cache?: CacheOptions
  headers?: HeadersInit
  timeoutMs?: number
}

export const DEFAULT_REQUEST_TIMEOUT_MS = 15_000

const parseRetryAfter = (value: string | null) => {
  if (!value) return null
  const seconds = Number(value)
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000)
  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? null : Math.max(0, timestamp - Date.now())
}

export class HttpError extends Error {
  readonly status: number
  readonly retryAfterMs: number | null

  constructor(status: number, retryAfter: string | null = null) {
    super(`Request failed (${status}).`)
    this.name = 'HttpError'
    this.status = status
    this.retryAfterMs = parseRetryAfter(retryAfter)
  }
}

export class RequestTimeoutError extends Error {
  readonly timeoutMs: number

  constructor(timeoutMs: number) {
    super(`The request timed out after ${Math.ceil(timeoutMs / 1000)} seconds.`)
    this.name = 'RequestTimeoutError'
    this.timeoutMs = timeoutMs
  }
}

export const fetchJson = async <T>(
  url: string,
  {
    signal,
    cache,
    headers,
    timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
  }: FetchJsonOptions = {}
): Promise<T> => {
  if (cache?.enabled) {
    const cached = getCachedValue<T>(cache.key ?? url)
    if (cached !== null) return cached
  }

  const requestController = new AbortController()
  let didTimeout = false
  const onCallerAbort = () => requestController.abort()
  if (signal?.aborted) onCallerAbort()
  else signal?.addEventListener('abort', onCallerAbort, { once: true })

  const safeTimeoutMs = Number.isFinite(timeoutMs)
    ? Math.max(1, timeoutMs)
    : DEFAULT_REQUEST_TIMEOUT_MS
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const abortPromise = new Promise<never>((_, reject) => {
    const rejectForAbort = () => {
      reject(
        didTimeout
          ? new RequestTimeoutError(safeTimeoutMs)
          : new DOMException('The request was cancelled.', 'AbortError')
      )
    }
    if (requestController.signal.aborted) {
      rejectForAbort()
      return
    }
    requestController.signal.addEventListener('abort', rejectForAbort, {
      once: true,
    })
    timeoutId = setTimeout(() => {
      didTimeout = true
      requestController.abort()
    }, safeTimeoutMs)
  })

  const requestPromise = (async () => {
    const response = await fetch(url, {
      signal: requestController.signal,
      headers: {
        Accept: 'application/json',
        ...headers,
      },
    })

    if (!response.ok) {
      throw new HttpError(
        response.status,
        response.headers?.get?.('Retry-After') ?? null
      )
    }

    return (await response.json()) as T
  })()

  let data: T
  try {
    data = await Promise.race([requestPromise, abortPromise])
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId)
    signal?.removeEventListener('abort', onCallerAbort)
  }

  if (cache?.enabled) {
    setCachedValue(cache.key ?? url, data, cache.ttlMs, cache.maxEntries)
  }

  return data
}
