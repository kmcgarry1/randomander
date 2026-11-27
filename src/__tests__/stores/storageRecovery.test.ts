import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PERSISTED_PARTITION_KEYS } from '../../stores/persistenceCoordinator'
import {
  captureStorageRecoveryBaseline,
  replayStorageRecovery,
} from '../../stores/storageRecovery'

describe('storage recovery baselines', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('navigator', {
      locks: {
        request: async (_name: string, operation: () => unknown) => operation(),
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('replays an operation when the captured target is unchanged', async () => {
    localStorage.setItem(PERSISTED_PARTITION_KEYS.saved, 'before')
    const baseline = captureStorageRecoveryBaseline([PERSISTED_PARTITION_KEYS.saved])
    expect(baseline.ok).toBe(true)
    if (!baseline.ok) throw baseline.error
    const operation = vi.fn(() => 'replayed')

    await expect(replayStorageRecovery(baseline.value, [PERSISTED_PARTITION_KEYS.saved], operation)).resolves.toEqual({
      ok: true,
      value: 'replayed',
    })
    expect(operation).toHaveBeenCalledOnce()
  })

  it('refuses to replay over a changed target', async () => {
    const baseline = captureStorageRecoveryBaseline([PERSISTED_PARTITION_KEYS.saved])
    if (!baseline.ok) throw baseline.error
    localStorage.setItem(PERSISTED_PARTITION_KEYS.saved, 'newer data')
    const operation = vi.fn()

    const result = await replayStorageRecovery(baseline.value, [PERSISTED_PARTITION_KEYS.saved], operation)

    expect(result).toMatchObject({ ok: false, reason: 'conflict' })
    expect(operation).not.toHaveBeenCalled()
    expect(localStorage.getItem(PERSISTED_PARTITION_KEYS.saved)).toBe('newer data')
  })

  it('does not replay invalid or unverifiable baselines', async () => {
    const operation = vi.fn()
    await expect(
      replayStorageRecovery([{ key: 'unrelated', value: null }], ['unrelated'], operation)
    ).resolves.toMatchObject({ ok: false, reason: 'invalid-baseline' })
    await expect(
      replayStorageRecovery(
        [{ key: PERSISTED_PARTITION_KEYS.saved, value: null }],
        [PERSISTED_PARTITION_KEYS.saved, PERSISTED_PARTITION_KEYS.history],
        operation
      )
    ).resolves.toMatchObject({ ok: false, reason: 'invalid-baseline' })
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new DOMException('Denied', 'SecurityError')
      },
    })

    await expect(
      replayStorageRecovery([{ key: PERSISTED_PARTITION_KEYS.saved, value: null }], [PERSISTED_PARTITION_KEYS.saved], operation)
    ).resolves.toMatchObject({ ok: false, reason: 'unverifiable' })
    expect(operation).not.toHaveBeenCalled()
  })

  it('uses the post-failure values when capturing known partial effects', async () => {
    localStorage.setItem(PERSISTED_PARTITION_KEYS.saved, 'before')
    localStorage.removeItem(PERSISTED_PARTITION_KEYS.saved)
    const baseline = captureStorageRecoveryBaseline([PERSISTED_PARTITION_KEYS.saved])
    if (!baseline.ok) throw baseline.error
    const operation = vi.fn()

    await expect(
      replayStorageRecovery(baseline.value, [PERSISTED_PARTITION_KEYS.saved], operation)
    ).resolves.toMatchObject({ ok: true })
    expect(operation).toHaveBeenCalledOnce()
  })

  it('does not replay when coordination is unavailable', async () => {
    vi.stubGlobal('navigator', {})
    const operation = vi.fn()
    await expect(
      replayStorageRecovery([{ key: PERSISTED_PARTITION_KEYS.saved, value: null }], [PERSISTED_PARTITION_KEYS.saved], operation)
    ).resolves.toMatchObject({ ok: false, reason: 'coordination-unavailable' })
    expect(operation).not.toHaveBeenCalled()
  })

  it('checks for changes after acquiring the lock', async () => {
    let acquire: (() => void) | undefined
    const waiting = new Promise<void>((resolve) => {
      acquire = resolve
    })
    vi.stubGlobal('navigator', {
      locks: {
        request: async (_name: string, operation: () => unknown) => {
          await waiting
          return operation()
        },
      },
    })
    const baseline = captureStorageRecoveryBaseline([PERSISTED_PARTITION_KEYS.saved])
    if (!baseline.ok) throw baseline.error
    const operation = vi.fn()
    const retry = replayStorageRecovery(baseline.value, [PERSISTED_PARTITION_KEYS.saved], operation)

    localStorage.setItem(PERSISTED_PARTITION_KEYS.saved, 'newer data')
    acquire?.()

    await expect(retry).resolves.toMatchObject({ ok: false, reason: 'conflict' })
    expect(operation).not.toHaveBeenCalled()
  })
})
