const STORAGE_LOCK_NAME = 'randomander:storage'

export type StorageCoordinationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: unknown }

export const withStorageLock = async <T>(
  operation: () => T | Promise<T>
): Promise<StorageCoordinationResult<T>> => {
  let started = false
  try {
    const locks = globalThis.navigator?.locks
    if (!locks || typeof locks.request !== 'function') {
      return {
        ok: false,
        error: new Error('Cross-tab storage coordination is unavailable.'),
      }
    }

    return await locks.request(STORAGE_LOCK_NAME, async () => {
      started = true
      return { ok: true as const, value: await operation() }
    })
  } catch (error) {
    if (started) throw error
    return { ok: false, error }
  }
}
