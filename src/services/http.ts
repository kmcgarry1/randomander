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
    throw new Error(`Request failed (${response.status}).`)
  }

  const data = (await response.json()) as T

  if (cache?.enabled) {
    setCachedValue(cache.key ?? url, data, cache.ttlMs, cache.maxEntries)
  }

  return data
}
