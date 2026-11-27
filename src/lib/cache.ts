import {
  readStorageResult,
  removeStorage,
  writeStorage,
  type StorageResult,
} from './storage'
import { RuntimeDataError, isRecord } from './runtimeValidation'
import { CacheError } from './appError'
import { getGlobalErrorLogger } from './errorLogger'

export type CacheEntry = {
  value: unknown
  expiresAt: number
  updatedAt: number
}

export const CACHE_STATE_VERSION = 1 as const
const MAX_LOADED_CACHE_ENTRIES = 1_000

export type CacheState = {
  version: typeof CACHE_STATE_VERSION
  entries: Record<string, CacheEntry>
}

const CACHE_KEY = 'randomander:cache:v1'
export const DEFAULT_CACHE_MAX_BYTES = 1_500_000

const emptyCache = (): CacheState => ({
  version: CACHE_STATE_VERSION,
  entries: {},
})

const isCacheEntry = (value: unknown): value is CacheEntry => {
  if (!value || typeof value !== 'object') return false
  const entry = value as Partial<CacheEntry>
  return (
    Number.isFinite(entry.expiresAt) &&
    Number(entry.expiresAt) >= 0 &&
    Number.isFinite(entry.updatedAt) &&
    Number(entry.updatedAt) >= 0 &&
    'value' in entry
  )
}

export type CacheStateDecodeResult =
  | {
      ok: true
      value: CacheState
      migrated: boolean
      repaired: boolean
    }
  | {
      ok: false
      value: CacheState
      error: RuntimeDataError | CacheError
      migrated: false
      repaired: true
    }

export const decodeCacheState = (stored: unknown): CacheStateDecodeResult => {
  const fallback = emptyCache()
  const logger = getGlobalErrorLogger()

  if (stored === null || stored === undefined) {
    return { ok: true, value: fallback, migrated: false, repaired: false }
  }
  if (!isRecord(stored)) {
    const error = new CacheError('corrupted', 'cache state is not a valid object')
    logger.logError(error, 'cache-service', { severity: 'warn' })
    return {
      ok: false,
      value: fallback,
      error,
      migrated: false,
      repaired: true,
    }
  }
  const migrated = stored.version === undefined
  if (!migrated && stored.version !== CACHE_STATE_VERSION) {
    const error = new CacheError(
      'corrupted',
      `unsupported cache version ${String(stored.version)}`
    )
    logger.logError(error, 'cache-service', { severity: 'warn', version: stored.version })
    return {
      ok: false,
      value: fallback,
      error,
      migrated: false,
      repaired: true,
    }
  }
  if (!isRecord(stored.entries)) {
    logger.addBreadcrumb('cache entries repaired (not a valid object)')
    return {
      ok: true,
      value: fallback,
      migrated,
      repaired: true,
    }
  }
  const rawEntries = Object.entries(stored.entries)
  const validEntries = rawEntries
    .flatMap(([key, entry]): Array<[string, CacheEntry]> =>
      isCacheEntry(entry) ? [[key, entry]] : []
    )
    .sort(([firstKey, first], [secondKey, second]) => {
      const byNewest = second.updatedAt - first.updatedAt
      return byNewest || firstKey.localeCompare(secondKey)
    })
    .slice(0, MAX_LOADED_CACHE_ENTRIES)
  const entries = Object.fromEntries(validEntries)
  return {
    ok: true,
    value: { version: CACHE_STATE_VERSION, entries },
    migrated,
    repaired:
      validEntries.length !== rawEntries.length ||
      rawEntries.length > MAX_LOADED_CACHE_ENTRIES,
  }
}

const loadCache = (): CacheState => {
  const stored = readStorageResult<unknown>(CACHE_KEY, null)
  if (!stored.ok) return emptyCache()
  const decoded = decodeCacheState(stored.value)
  if (decoded.ok && (decoded.migrated || decoded.repaired)) {
    writeStorage(CACHE_KEY, decoded.value)
  }
  return decoded.value
}

let cacheState: CacheState = loadCache()
let cacheGeneration = 0

export const getCacheGeneration = () => cacheGeneration

const serializedBytes = (value: unknown): number => {
  try {
    const serialized = JSON.stringify(value)
    return typeof serialized === 'string'
      ? new TextEncoder().encode(serialized).byteLength
      : Number.POSITIVE_INFINITY
  } catch {
    return Number.POSITIVE_INFINITY
  }
}

export const getCacheSizeBytes = () => serializedBytes(cacheState)

const oldestKeys = () =>
  Object.keys(cacheState.entries).sort(
    (a, b) =>
      (cacheState.entries[a]?.updatedAt ?? 0) -
      (cacheState.entries[b]?.updatedAt ?? 0)
  )

const persistCache = (): StorageResult => {
  let result = writeStorage(CACHE_KEY, cacheState)
  if (result.ok || result.kind !== 'quota') return result

  // Cache data is disposable. On quota pressure, progressively evict it rather
  // than allowing it to compete with History and Saved state.
  for (const key of oldestKeys()) {
    delete cacheState.entries[key]
    result = writeStorage(CACHE_KEY, cacheState)
    if (result.ok || result.kind !== 'quota') break
  }
  return result
}

const isExpired = (entry: CacheEntry) => entry.expiresAt <= Date.now()

export const getCachedValue = <T>(
  key: string,
  decode?: (value: unknown) => T,
  options?: { allowExpired?: boolean; preserveExpired?: boolean }
): T | null => {
  const entry = cacheState.entries[key]
  if (!entry) return null
  if (isExpired(entry) && !options?.allowExpired) {
    if (!options?.preserveExpired) {
      delete cacheState.entries[key]
      persistCache()
    }
    return null
  }
  if (!decode) return entry.value as T
  try {
    return decode(entry.value)
  } catch {
    delete cacheState.entries[key]
    persistCache()
    return null
  }
}

export const pruneCache = (
  maxEntries: number,
  maxBytes = DEFAULT_CACHE_MAX_BYTES
) => {
  Object.entries(cacheState.entries).forEach(([key, entry]) => {
    if (isExpired(entry)) delete cacheState.entries[key]
  })

  const safeMaxEntries = Number.isFinite(maxEntries)
    ? Math.max(0, Math.floor(maxEntries))
    : 0
  const safeMaxBytes = Number.isFinite(maxBytes)
    ? Math.max(0, Math.floor(maxBytes))
    : 0
  const ordered = oldestKeys()

  while (
    ordered.length > 0 &&
    (Object.keys(cacheState.entries).length > safeMaxEntries ||
      getCacheSizeBytes() > safeMaxBytes)
  ) {
    const key = ordered.shift()
    if (key) delete cacheState.entries[key]
  }
}

export const setCachedValue = (
  key: string,
  value: unknown,
  ttlMs: number,
  maxEntries: number,
  maxBytes = DEFAULT_CACHE_MAX_BYTES
): StorageResult => {
  const safeTtlMs = Number.isFinite(ttlMs) ? Math.max(0, ttlMs) : 0
  cacheState.entries[key] = {
    value,
    expiresAt: Date.now() + safeTtlMs,
    updatedAt: Date.now(),
  }
  pruneCache(maxEntries, maxBytes)
  return persistCache()
}

export const clearCache = (): StorageResult => {
  cacheGeneration += 1
  cacheState = emptyCache()
  return persistCache()
}

// Clear-all uses removal rather than an empty envelope so both Randomander
// storage keys can be absent after the action. Keep the in-memory cache intact
// when deletion fails so the caller can safely retry.
export const removeCache = (): StorageResult => {
  const result = removeStorage(CACHE_KEY)
  if (result.ok) {
    cacheGeneration += 1
    cacheState = emptyCache()
  }
  return result
}
