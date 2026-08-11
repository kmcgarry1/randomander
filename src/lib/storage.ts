import {
  recordStorageMetric,
  type StorageOutcome,
} from './operationalMetrics'

export type StorageFailureKind =
  | 'unavailable'
  | 'quota'
  | 'security'
  | 'invalid-data'
  | 'serialization'
  | 'unknown'

export type StorageResult =
  | { ok: true }
  | { ok: false; kind: StorageFailureKind; error: unknown }

export type StorageReadResult<T> =
  | { ok: true; value: T }
  | { ok: false; kind: StorageFailureKind; error: unknown; value: T }

type StorageAccessResult =
  | { ok: true; storage: Storage }
  | { ok: false; kind: StorageFailureKind; error: unknown }

const failureKind = (
  error: unknown,
  fallback: StorageFailureKind = 'unknown'
): StorageFailureKind => {
  const name =
    typeof error === 'object' && error !== null && 'name' in error
      ? String(error.name)
      : ''
  if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED') {
    return 'quota'
  }
  if (name === 'SecurityError') return 'security'
  return fallback
}

const unavailableError = (operation: string) =>
  new Error(`Web Storage is unavailable for ${operation}.`)

const recordOutcome = (kind?: StorageFailureKind) => {
  const outcome: StorageOutcome =
    kind === undefined
      ? 'success'
      : kind === 'quota' ||
          kind === 'security' ||
          kind === 'unavailable' ||
          kind === 'invalid-data'
        ? kind
        : 'unknown-error'
  recordStorageMetric(outcome)
}

const resolveStorage = (method: keyof Storage): StorageAccessResult => {
  try {
    const storage = globalThis.localStorage
    if (!storage || typeof storage[method] !== 'function') {
      const error = unavailableError(String(method))
      return { ok: false, kind: 'unavailable', error }
    }
    return { ok: true, storage }
  } catch (error) {
    return { ok: false, kind: failureKind(error, 'unavailable'), error }
  }
}

export const readStorageResult = <T>(
  key: string,
  fallback: T
): StorageReadResult<T> => {
  const access = resolveStorage('getItem')
  if (!access.ok) {
    recordOutcome(access.kind)
    return { ...access, value: fallback }
  }
  try {
    const raw = access.storage.getItem(key)
    const value = raw ? (JSON.parse(raw) as T) : fallback
    recordOutcome()
    return { ok: true, value }
  } catch (error) {
    const kind = failureKind(error, 'invalid-data')
    recordOutcome(kind)
    return {
      ok: false,
      kind,
      error,
      value: fallback,
    }
  }
}

export const readStorage = <T>(key: string, fallback: T): T =>
  readStorageResult(key, fallback).value

export const writeStorage = <T>(key: string, value: T): StorageResult => {
  const access = resolveStorage('setItem')
  if (!access.ok) {
    recordOutcome(access.kind)
    return access
  }

  let serialized: string
  try {
    const output = JSON.stringify(value)
    if (typeof output !== 'string') {
      recordOutcome('serialization')
      return {
        ok: false,
        kind: 'serialization',
        error: new TypeError('Value cannot be serialized for Web Storage.'),
      }
    }
    serialized = output
  } catch (error) {
    recordOutcome('serialization')
    return { ok: false, kind: 'serialization', error }
  }

  try {
    access.storage.setItem(key, serialized)
    recordOutcome()
    return { ok: true }
  } catch (error) {
    const kind = failureKind(error)
    recordOutcome(kind)
    return { ok: false, kind, error }
  }
}

export const removeStorage = (key: string): StorageResult => {
  const access = resolveStorage('removeItem')
  if (!access.ok) {
    recordOutcome(access.kind)
    return access
  }
  try {
    access.storage.removeItem(key)
    recordOutcome()
    return { ok: true }
  } catch (error) {
    const kind = failureKind(error)
    recordOutcome(kind)
    return { ok: false, kind, error }
  }
}
