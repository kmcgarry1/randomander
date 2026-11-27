import { CACHE_KEY } from '../lib/cache'
import { isRecord } from '../lib/runtimeValidation'
import { withStorageLock } from '../lib/storageCoordination'
import {
  LEGACY_PERSISTED_STATE_KEY,
  PERSISTED_PARTITION_KEYS,
} from './persistenceCoordinator'

export type StorageRecoveryTarget = Readonly<{
  key: string
  value: string | null
}>

type RecoveryFailure = Readonly<{
  ok: false
  reason: 'invalid-baseline' | 'unverifiable' | 'conflict' | 'coordination-unavailable'
  error?: unknown
}>

const recoveryKeys = new Set([
  CACHE_KEY,
  LEGACY_PERSISTED_STATE_KEY,
  ...Object.values(PERSISTED_PARTITION_KEYS),
])

const isValidBaseline = (value: unknown): value is StorageRecoveryTarget[] => {
  if (!Array.isArray(value) || value.length === 0 || value.length > recoveryKeys.size) {
    return false
  }
  const keys = new Set<string>()
  for (const target of value) {
    if (
      !isRecord(target) ||
      typeof target.key !== 'string' ||
      !recoveryKeys.has(target.key) ||
      keys.has(target.key) ||
      (typeof target.value !== 'string' && target.value !== null)
    ) return false
    keys.add(target.key)
  }
  return true
}

// Capture while holding the same lock as the failed write, including its partial effects.
export const captureStorageRecoveryBaseline = (
  keys: readonly string[]
): { ok: true; value: StorageRecoveryTarget[] } | RecoveryFailure => {
  if (keys.length === 0 || new Set(keys).size !== keys.length || keys.some((key) => !recoveryKeys.has(key))) {
    return { ok: false, reason: 'invalid-baseline' }
  }
  try {
    return {
      ok: true,
      value: keys.map((key) => ({ key, value: localStorage.getItem(key) })),
    }
  } catch (error) {
    return { ok: false, reason: 'unverifiable', error }
  }
}

export const replayStorageRecovery = async <T>(
  baseline: unknown,
  affectedKeys: readonly string[],
  operation: () => T | Promise<T>
): Promise<{ ok: true; value: T } | RecoveryFailure> => {
  if (
    !isValidBaseline(baseline) ||
    affectedKeys.length !== baseline.length ||
    new Set(affectedKeys).size !== affectedKeys.length ||
    baseline.some((target) => !affectedKeys.includes(target.key))
  ) {
    return { ok: false, reason: 'invalid-baseline' }
  }
  const targets = baseline.map(({ key, value }) => ({ key, value }))
  const result = await withStorageLock(async () => {
    for (const target of targets) {
      let current: string | null
      try {
        current = localStorage.getItem(target.key)
      } catch (error) {
        return { ok: false as const, reason: 'unverifiable' as const, error }
      }
      if (current !== target.value) {
        return { ok: false as const, reason: 'conflict' as const }
      }
    }
    return { ok: true as const, value: await operation() }
  })
  return result.ok
    ? result.value
    : { ok: false, reason: 'coordination-unavailable', error: result.error }
}
