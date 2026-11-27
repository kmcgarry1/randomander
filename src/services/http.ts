import { getCachedValue, setCachedValue } from '../lib/cache'
import { NetworkError, ValidationError } from '../lib/appError'
import { getGlobalErrorLogger } from '../lib/errorLogger'

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

/**
 * Retry configuration for HTTP requests.
 * Exponential backoff: 100ms, 200ms (max 3 attempts)
 * Skip retry on 4xx errors (except 408 Timeout Request)
 */
export const RETRY_CONFIG = {
  maxAttempts: 3,
  backoffMs: [100, 200],
  retryableStatusCodes: new Set([408]),
}

/**
 * Determines if an error is retryable based on HTTP status code.
 * Retries on 408 (Request Timeout) and 5xx errors
 * Skips retry on 4xx errors (except 408)
 * @internal
 */
function isRetryableStatusCode(status: number): boolean {
  return RETRY_CONFIG.retryableStatusCodes.has(status) || (status >= 500 && status < 600)
}

/**
 * Determines if an error is retryable (timeout, connection failure, or specific HTTP status codes).
 * Does NOT retry DOMException (AbortError) since those are user-initiated cancellations.
 * @internal
 */
function isRetryable(error: Error): boolean {
  // DOMException (AbortError) should never be retried - it's a user cancellation
  if (error instanceof DOMException || error.name === 'AbortError') {
    return false
  }
  if (error instanceof RequestTimeoutError) {
    return true
  }
  if (error instanceof HttpError) {
    return isRetryableStatusCode(error.status)
  }
  // NetworkError might have been converted from an HttpError - check if it was retryable
  if (error instanceof NetworkError) {
    if (error.code === 'timeout' || error.code === 'connection-failed') {
      return true
    }
    if (error.code === 'http-error' && error.metadata?.status) {
      return isRetryableStatusCode(error.metadata.status as number)
    }
  }
  return false
}

/**
 * Retry async function with exponential backoff.
 * Attempts the operation up to maxAttempts times, applying exponential backoff between attempts.
 * Does NOT retry if the error is a DOMException (user cancellation via AbortSignal).
 * @internal
 */
async function retryAsync<T>(
  operation: () => Promise<T>,
  signal?: AbortSignal,
  maxAttempts: number = RETRY_CONFIG.maxAttempts,
  backoffMs: number[] = RETRY_CONFIG.backoffMs,
  requestId?: string
): Promise<T> {
  let lastError: Error | undefined
  const logger = getGlobalErrorLogger()

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (err) {
      // Preserve the original error object
      lastError =
        err instanceof Error ? err : new Error(String(err))

      // Never retry DOMException (user cancellation via AbortSignal)
      if (lastError instanceof DOMException || lastError.name === 'AbortError') {
        throw lastError
      }

      const retryable = isRetryable(lastError)
      if (attempt === maxAttempts || !retryable) {
        // Log error before throwing
        if (lastError instanceof NetworkError) {
          if (attempt === maxAttempts && retryable) {
            lastError.metadata.retryExhausted = true
            lastError.metadata.attempts = attempt
          }
          logger.logError(lastError, 'http-service', {
            attempt,
            maxAttempts,
            requestId,
          })
        }
        throw lastError
      }

      const delay = backoffMs[attempt - 1] ?? backoffMs[backoffMs.length - 1]
      logger.addBreadcrumb(`HTTP retry attempt ${attempt}/${maxAttempts} with ${delay}ms delay`)
      await new Promise<void>((resolve, reject) => {
        if (signal?.aborted) {
          reject(new DOMException('The request was cancelled.', 'AbortError'))
          return
        }
        const timer = setTimeout(() => {
          signal?.removeEventListener('abort', onAbort)
          resolve()
        }, delay)
        const onAbort = () => {
          clearTimeout(timer)
          signal?.removeEventListener('abort', onAbort)
          reject(new DOMException('The request was cancelled.', 'AbortError'))
        }
        signal?.addEventListener('abort', onAbort, { once: true })
      })
    }
  }

  throw lastError || new Error('Retry failed without error')
}

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

  // Wrap the entire request (including retries) in a retry wrapper
  return retryAsync(
    async () => {
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
            ? toNetworkError(new RequestTimeoutError(safeTimeoutMs), url, requestId)
            : new DOMException('The request was cancelled.', 'AbortError')
          reject(error)
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') throw err
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
        if (err instanceof Error && err.name === 'AbortError') throw err
        if (err instanceof SyntaxError) {
          throw new ValidationError('malformed-data', 'The response is not valid JSON.', {
            sourceId: url,
            requestId,
            originalError: err,
          })
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
  },
    signal,
    RETRY_CONFIG.maxAttempts,
    RETRY_CONFIG.backoffMs,
    requestId
  )
}

/**
 * Generate a unique request ID for correlation and logging.
 * @internal
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
