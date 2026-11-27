import { afterEach, describe, expect, it, vi } from 'vitest'
import { withStorageLock } from '../../lib/storageCoordination'

describe('storage coordination', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('runs a storage operation under an exclusive shared lock', async () => {
    const request = vi.fn(async (_name: string, callback: () => unknown) =>
      callback()
    )
    vi.stubGlobal('navigator', { locks: { request } })
    const operation = vi.fn(() => 'saved')

    await expect(withStorageLock(operation)).resolves.toEqual({
      ok: true,
      value: 'saved',
    })
    expect(operation).toHaveBeenCalledOnce()
    expect(request).toHaveBeenCalledWith(
      'randomander:storage',
      expect.any(Function)
    )
  })

  it('does not perform an operation when locking is unavailable', async () => {
    vi.stubGlobal('navigator', {})
    const operation = vi.fn()

    const result = await withStorageLock(operation)

    expect(result.ok).toBe(false)
    expect(operation).not.toHaveBeenCalled()
  })

  it('reports lock acquisition failure without performing the operation', async () => {
    const error = new Error('Lock request failed')
    vi.stubGlobal('navigator', {
      locks: { request: vi.fn().mockRejectedValue(error) },
    })
    const operation = vi.fn()

    await expect(withStorageLock(operation)).resolves.toEqual({
      ok: false,
      error,
    })
    expect(operation).not.toHaveBeenCalled()
  })

  it('does not mistake an operation failure for a lock failure', async () => {
    vi.stubGlobal('navigator', {
      locks: {
        request: async (_name: string, callback: () => unknown) => callback(),
      },
    })
    const error = new Error('Write failed')

    await expect(
      withStorageLock(() => {
        throw error
      })
    ).rejects.toBe(error)
  })

  it('keeps the lock until an asynchronous operation completes', async () => {
    let releaseFirst: (() => void) | undefined
    let queue = Promise.resolve()
    vi.stubGlobal('navigator', {
      locks: {
        request: (_name: string, callback: () => Promise<unknown>) => {
          const result = queue.then(callback)
          queue = result.then(() => undefined)
          return result
        },
      },
    })
    const events: string[] = []
    const first = withStorageLock(async () => {
      events.push('first-start')
      await new Promise<void>((resolve) => {
        releaseFirst = resolve
      })
      events.push('first-end')
    })
    const second = withStorageLock(() => {
      events.push('second')
    })
    await Promise.resolve()
    expect(events).toEqual(['first-start'])

    releaseFirst?.()
    await Promise.all([first, second])
    expect(events).toEqual(['first-start', 'first-end', 'second'])
  })
})
