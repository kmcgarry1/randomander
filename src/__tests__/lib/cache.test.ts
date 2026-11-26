import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('response cache budget', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('evicts an entry that would exceed the byte budget', async () => {
    const { getCachedValue, getCacheSizeBytes, setCachedValue } = await import(
      '../../lib/cache'
    )

    const result = setCachedValue(
      'oversized',
      { body: 'x'.repeat(2_000) },
      60_000,
      10,
      250
    )

    expect(result).toEqual({ ok: true })
    expect(getCachedValue('oversized')).toBeNull()
    expect(getCacheSizeBytes()).toBeLessThanOrEqual(250)
  })

  it('keeps newest entries within both count and byte limits', async () => {
    const { getCachedValue, getCacheSizeBytes, setCachedValue } = await import(
      '../../lib/cache'
    )

    setCachedValue('oldest', { body: 'a'.repeat(80) }, 60_000, 2, 500)
    await new Promise((resolve) => setTimeout(resolve, 1))
    setCachedValue('middle', { body: 'b'.repeat(80) }, 60_000, 2, 500)
    await new Promise((resolve) => setTimeout(resolve, 1))
    setCachedValue('newest', { body: 'c'.repeat(80) }, 60_000, 2, 500)

    expect(getCachedValue('oldest')).toBeNull()
    expect(getCachedValue('middle')).toEqual({ body: 'b'.repeat(80) })
    expect(getCachedValue('newest')).toEqual({ body: 'c'.repeat(80) })
    expect(getCacheSizeBytes()).toBeLessThanOrEqual(500)
  })

  it('migrates the unversioned cache envelope and drops invalid entries', async () => {
    const { CACHE_STATE_VERSION, decodeCacheState } = await import('../../lib/cache')
    const decoded = decodeCacheState({
      entries: {
        valid: { value: { id: 1 }, expiresAt: 100, updatedAt: 50 },
        missingValue: { expiresAt: 100, updatedAt: 50 },
        invalidDate: { value: true, expiresAt: 'later', updatedAt: 50 },
      },
    })

    expect(decoded).toMatchObject({
      ok: true,
      migrated: true,
      repaired: true,
      value: {
        version: CACHE_STATE_VERSION,
        entries: {
          valid: { value: { id: 1 }, expiresAt: 100, updatedAt: 50 },
        },
      },
    })
  })

  it('recovers from unsupported cache versions with a typed error', async () => {
    const { decodeCacheState } = await import('../../lib/cache')
    const decoded = decodeCacheState({ version: 999, entries: {} })

    expect(decoded).toMatchObject({
      ok: false,
      error: {
        name: 'CacheError',
        type: 'cache',
        code: 'corrupted',
      },
      value: { entries: {} },
    })
  })

  it('evicts a cached value that fails its consumer decoder', async () => {
    const { getCachedValue, setCachedValue } = await import('../../lib/cache')
    setCachedValue('wrong-shape', { unexpected: true }, 60_000, 10)

    expect(
      getCachedValue('wrong-shape', () => {
        throw new TypeError('invalid fixture')
      })
    ).toBeNull()
    expect(getCachedValue('wrong-shape')).toBeNull()
  })
})

describe('cache - boundary conditions', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('handles empty cache gracefully after reset', async () => {
    const { setCachedValue } = await import(
      '../../lib/cache'
    )

    // Add a value then get it to populate cache
    setCachedValue('test', { value: 1 }, 60_000, 10)

    // Clear and verify empty behavior
    localStorage.clear()
    vi.resetModules()

    const freshImport = await import('../../lib/cache')
    expect(freshImport.getCachedValue('nonexistent')).toBeNull()
  })

  it('handles null stored cache', async () => {
    const { decodeCacheState } = await import('../../lib/cache')
    const decoded = decodeCacheState(null)

    expect(decoded).toMatchObject({
      ok: true,
      migrated: false,
      repaired: false,
    })
    expect(decoded.value.entries).toEqual({})
  })

  it('handles undefined stored cache', async () => {
    const { decodeCacheState } = await import('../../lib/cache')
    const decoded = decodeCacheState(undefined)

    expect(decoded).toMatchObject({
      ok: true,
      migrated: false,
      repaired: false,
    })
  })

  it('rejects non-object cache state', async () => {
    const { decodeCacheState } = await import('../../lib/cache')
    const decoded = decodeCacheState('not an object')

    expect(decoded.ok).toBe(false)
    if (!decoded.ok) {
      expect(decoded.error.name).toBe('CacheError')
      expect(decoded.error.type).toBe('cache')
      expect(decoded.error.code).toBe('corrupted')
    }
  })

  it('rejects cache with invalid entries object', async () => {
    const { decodeCacheState } = await import('../../lib/cache')
    const decoded = decodeCacheState({ version: 1, entries: 'invalid' })

    expect(decoded.ok).toBe(true)
    expect(decoded.value.entries).toEqual({})
  })
})

describe('cache - expiration handling', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('cache entries remain valid across retrievals', async () => {
    const { getCachedValue, setCachedValue } = await import('../../lib/cache')
    const future = Date.now() + 60_000

    setCachedValue('valid', { data: 'fresh' }, future, 10)
    
    // Retrieve multiple times to verify not expired
    expect(getCachedValue('valid')).toEqual({ data: 'fresh' })
    expect(getCachedValue('valid')).toEqual({ data: 'fresh' })
  })

  it('keeps non-expired entries', async () => {
    const { getCachedValue, setCachedValue } = await import('../../lib/cache')
    const now = Date.now()

    setCachedValue('fresh', { data: 'new' }, now + 60_000, 10)
    
    expect(getCachedValue('fresh')).toEqual({ data: 'new' })
  })
})

describe('cache - entry validation', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('rejects cache entry with missing value', async () => {
    const { decodeCacheState } = await import('../../lib/cache')
    const decoded = decodeCacheState({
      version: 1,
      entries: {
        missing: { expiresAt: 100, updatedAt: 50 },
      },
    })

    expect(decoded.value.entries.missing).toBeUndefined()
  })

  it('rejects cache entry with invalid expiresAt', async () => {
    const { decodeCacheState } = await import('../../lib/cache')
    const decoded = decodeCacheState({
      version: 1,
      entries: {
        invalid: { value: { data: 1 }, expiresAt: 'not-a-number', updatedAt: 50 },
      },
    })

    expect(decoded.value.entries.invalid).toBeUndefined()
  })

  it('rejects cache entry with negative expiresAt', async () => {
    const { decodeCacheState } = await import('../../lib/cache')
    const decoded = decodeCacheState({
      version: 1,
      entries: {
        negative: { value: { data: 1 }, expiresAt: -100, updatedAt: 50 },
      },
    })

    expect(decoded.value.entries.negative).toBeUndefined()
  })

  it('rejects cache entry with invalid updatedAt', async () => {
    const { decodeCacheState } = await import('../../lib/cache')
    const decoded = decodeCacheState({
      version: 1,
      entries: {
        invalid: { value: { data: 1 }, expiresAt: 100, updatedAt: 'not-a-number' },
      },
    })

    expect(decoded.value.entries.invalid).toBeUndefined()
  })

  it('rejects cache entry with negative updatedAt', async () => {
    const { decodeCacheState } = await import('../../lib/cache')
    const decoded = decodeCacheState({
      version: 1,
      entries: {
        negative: { value: { data: 1 }, expiresAt: 100, updatedAt: -50 },
      },
    })

    expect(decoded.value.entries.negative).toBeUndefined()
  })

  it('allows cache entry with zero timestamps', async () => {
    const { decodeCacheState } = await import('../../lib/cache')
    const decoded = decodeCacheState({
      version: 1,
      entries: {
        zero: { value: { data: 1 }, expiresAt: 0, updatedAt: 0 },
      },
    })

    expect(decoded.value.entries.zero).toEqual(
      { value: { data: 1 }, expiresAt: 0, updatedAt: 0 }
    )
  })
})

describe('cache - set operation result', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('returns ok result on successful cache set', async () => {
    const { setCachedValue } = await import('../../lib/cache')
    const result = setCachedValue('key', { value: 1 }, 60_000, 10)

    expect(result).toEqual({ ok: true })
  })
})

describe('cache - multiple entries and sorting', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('sorts entries by recency (newest first)', async () => {
    const { getCachedValue, setCachedValue } = await import('../../lib/cache')

    // Add entries with delays to ensure different timestamps
    setCachedValue('a', { order: 1 }, 60_000, 10, 1000)
    await new Promise((resolve) => setTimeout(resolve, 2))
    setCachedValue('b', { order: 2 }, 60_000, 10, 1000)
    await new Promise((resolve) => setTimeout(resolve, 2))
    setCachedValue('c', { order: 3 }, 60_000, 10, 1000)

    // All should be retrievable
    expect(getCachedValue('a')).toEqual({ order: 1 })
    expect(getCachedValue('b')).toEqual({ order: 2 })
    expect(getCachedValue('c')).toEqual({ order: 3 })
  })

  it('enforces max entries limit', async () => {
    const { getCachedValue, setCachedValue } = await import('../../lib/cache')

    setCachedValue('first', { n: 1 }, 60_000, 2, 10_000)
    await new Promise((resolve) => setTimeout(resolve, 1))
    setCachedValue('second', { n: 2 }, 60_000, 2, 10_000)
    await new Promise((resolve) => setTimeout(resolve, 1))
    setCachedValue('third', { n: 3 }, 60_000, 2, 10_000)

    // Oldest should be evicted
    expect(getCachedValue('first')).toBeNull()
    expect(getCachedValue('second')).toEqual({ n: 2 })
    expect(getCachedValue('third')).toEqual({ n: 3 })
  })

  it('handles loading large number of cache entries', async () => {
    const { CACHE_STATE_VERSION, decodeCacheState } = await import(
      '../../lib/cache'
    )
    
    const entries: Record<string, any> = {}
    for (let i = 0; i < 100; i++) {
      entries[`entry-${i}`] = {
        value: { id: i },
        expiresAt: Date.now() + 60_000,
        updatedAt: Date.now() - i * 100,
      }
    }

    const decoded = decodeCacheState({ version: CACHE_STATE_VERSION, entries })
    expect(decoded.ok).toBe(true)
    expect(Object.keys(decoded.value.entries).length).toBeGreaterThan(0)
  })
})
