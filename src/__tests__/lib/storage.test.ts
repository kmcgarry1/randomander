import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  readStorageResult,
  removeStorage,
  writeStorage,
} from '../../lib/storage'
import {
  configureOperationalMetricSink,
  getOperationalMetricSnapshot,
  resetOperationalMetrics,
} from '../../lib/operationalMetrics'

const originalStorageDescriptor = Object.getOwnPropertyDescriptor(
  globalThis,
  'localStorage'
)

const restoreLocalStorage = () => {
  if (originalStorageDescriptor) {
    Object.defineProperty(globalThis, 'localStorage', originalStorageDescriptor)
  }
}

beforeEach(() => {
  restoreLocalStorage()
  localStorage.clear()
  resetOperationalMetrics()
})

afterEach(() => {
  restoreLocalStorage()
  resetOperationalMetrics()
  vi.restoreAllMocks()
})

describe('Web Storage outcomes', () => {
  it('returns typed success outcomes for normal access', () => {
    localStorage.clear()

    expect(writeStorage('test:key', { value: 42 })).toEqual({ ok: true })
    expect(readStorageResult('test:key', null)).toEqual({
      ok: true,
      value: { value: 42 },
    })
    expect(removeStorage('test:key')).toEqual({ ok: true })
    expect(getOperationalMetricSnapshot().storage.outcomes.success).toBe(3)
  })

  it('survives a SecurityError thrown by the localStorage getter', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get: () => {
        throw new DOMException('Blocked', 'SecurityError')
      },
    })

    expect(readStorageResult('test:key', { fallback: true })).toMatchObject({
      ok: false,
      kind: 'security',
      value: { fallback: true },
    })
    expect(writeStorage('test:key', true)).toMatchObject({
      ok: false,
      kind: 'security',
    })
    expect(removeStorage('test:key')).toMatchObject({
      ok: false,
      kind: 'security',
    })
    expect(getOperationalMetricSnapshot().storage.outcomes.security).toBe(3)
  })

  it('distinguishes quota and corrupt JSON failures', () => {
    const values = new Map<string, string>([['bad', '{not-json']])
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: () => {
          throw new DOMException('Full', 'QuotaExceededError')
        },
        removeItem: (key: string) => values.delete(key),
      },
    })

    expect(readStorageResult('bad', 'fallback')).toMatchObject({
      ok: false,
      kind: 'invalid-data',
      value: 'fallback',
    })
    expect(writeStorage('test:key', true)).toMatchObject({
      ok: false,
      kind: 'quota',
    })
    const outcomes = getOperationalMetricSnapshot().storage.outcomes
    expect(outcomes['invalid-data']).toBe(1)
    expect(outcomes.quota).toBe(1)
  })

  it('reports serialization failure without touching storage', () => {
    const value: { self?: unknown } = {}
    value.self = value

    expect(writeStorage('test:key', value)).toMatchObject({
      ok: false,
      kind: 'serialization',
    })
    expect(getOperationalMetricSnapshot().storage.outcomes['unknown-error']).toBe(
      1
    )
  })

  it('records unavailable and unknown failures as bounded outcomes', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: null,
    })
    expect(readStorageResult('private:key', null)).toMatchObject({
      ok: false,
      kind: 'unavailable',
    })

    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        removeItem: () => {
          throw new Error('Unexpected failure with private:key')
        },
      },
    })
    expect(removeStorage('private:key')).toMatchObject({
      ok: false,
      kind: 'unknown',
    })

    const outcomes = getOperationalMetricSnapshot().storage.outcomes
    expect(outcomes.unavailable).toBe(1)
    expect(outcomes['unknown-error']).toBe(1)
  })

  it('emits only the storage outcome without keys, values, or error details', () => {
    const sink = vi.fn()
    configureOperationalMetricSink(sink)

    expect(
      writeStorage('private-card-id', {
        history: 'private commander and filter details',
      })
    ).toEqual({ ok: true })

    expect(sink).toHaveBeenCalledTimes(1)
    expect(sink).toHaveBeenCalledWith({
      type: 'storage',
      outcome: 'success',
    })
    expect(JSON.stringify(sink.mock.calls)).not.toMatch(
      /private|card|commander|filter|history/i
    )
  })
})
