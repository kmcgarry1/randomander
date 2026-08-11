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
        name: 'RuntimeDataError',
        source: 'cache',
        recoverable: true,
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
