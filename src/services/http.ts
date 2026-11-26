import { getCachedValue, setCachedValue } from '../lib/cache'
import { NetworkError } from '../lib/appError'

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

/**
 * Convert HttpError/RequestTimeoutError to NetworkError for unified handling.
 * @internal
 */
function toNetworkError(
  error: HttpError | RequestTimeoutError,
  url: string,
  requestId: string
): NetworkError {
  if (error instanceof RequestTimeoutError) {
    return new NetworkError('timeout', error.message, {
      sourceId: url,
      requestId,
      metadata: { timeoutMs: error.timeoutMs },
    })
  } else {
    return new NetworkError('http-error', error.message, {
      sourceId: url,
      requestId,
      metadata: { status: error.status, retryAfterMs: error.retryAfterMs },
    })
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
  // Generate unique request ID for correlation
  const requestId = generateRequestId()

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
      try {
        const error = didTimeout
          ? new RequestTimeoutError(safeTimeoutMs)
          : new DOMException('The request was cancelled.', 'AbortError')
        reject(error)
      } catch (err) {
        reject(err)
      }
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
    try {
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
    } catch (err) {
      if (err instanceof HttpError || err instanceof RequestTimeoutError) {
        throw toNetworkError(err, url, requestId)
      }
      // Network error (e.g., fetch failed due to no connection)
      throw new NetworkError('connection-failed', String(err), {
        sourceId: url,
        requestId,
        metadata: { originalError: err },
      })
    }
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

/**
 * Generate a unique request ID for correlation and logging.
 * @internal
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
