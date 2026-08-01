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

export const fetchJson = async <T>(
  url: string,
  { signal, cache, headers }: FetchJsonOptions = {}
): Promise<T> => {
  if (cache?.enabled) {
    const cached = getCachedValue<T>(cache.key ?? url)
    if (cached !== null) return cached
  }

  const response = await fetch(url, {
    signal,
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

  const data = (await response.json()) as T

  if (cache?.enabled) {
    setCachedValue(cache.key ?? url, data, cache.ttlMs, cache.maxEntries)
  }

  return data
}
