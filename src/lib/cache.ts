import { readStorage, writeStorage } from './storage'

type CacheEntry = {
  value: unknown
  expiresAt: number
  updatedAt: number
}

type CacheState = {
  entries: Record<string, CacheEntry>
}

const CACHE_KEY = 'randomander:cache:v1'

const loadCache = (): CacheState =>
  readStorage<CacheState>(CACHE_KEY, { entries: {} })

let cacheState: CacheState = loadCache()

const persistCache = () => {
  writeStorage(CACHE_KEY, cacheState)
}

const isExpired = (entry: CacheEntry) => entry.expiresAt <= Date.now()

export const getCachedValue = <T>(key: string): T | null => {
  const entry = cacheState.entries[key]
  if (!entry) return null
  if (isExpired(entry)) {
    delete cacheState.entries[key]
    persistCache()
    return null
  }
  return entry.value as T
}

export const setCachedValue = (
  key: string,
  value: unknown,
  ttlMs: number,
  maxEntries: number
) => {
  cacheState.entries[key] = {
    value,
    expiresAt: Date.now() + ttlMs,
    updatedAt: Date.now(),
  }
  pruneCache(maxEntries)
  persistCache()
}

export const pruneCache = (maxEntries: number) => {
  const keys = Object.keys(cacheState.entries)
  if (keys.length <= maxEntries) return
  const ordered = keys
    .map((key) => ({ key, updatedAt: cacheState.entries[key].updatedAt }))
    .sort((a, b) => a.updatedAt - b.updatedAt)
  const removeCount = Math.max(0, ordered.length - maxEntries)
  ordered.slice(0, removeCount).forEach(({ key }) => {
    delete cacheState.entries[key]
  })
}

export const clearCache = () => {
  cacheState = { entries: {} }
  persistCache()
}
