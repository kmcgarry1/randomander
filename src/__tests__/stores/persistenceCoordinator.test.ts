import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  StorageFailureKind,
  StorageReadResult,
  StorageResult,
} from '../../lib/storage'
import {
  DEFAULT_DISPLAY,
  DEFAULT_OPTIONS,
  DEFAULT_CACHE,
  DEFAULT_PERFORMANCE,
  PERSISTED_STATE_VERSION,
  type PersistedStateV2,
} from '../../stores/randomanderPersistence'
import {
  LEGACY_PERSISTED_STATE_KEY,
  PERSISTED_PARTITION_KEYS,
  PERSISTED_PARTITION_SCHEMA,
  PERSISTED_PARTITION_VERSION,
  comparePartitionEnvelopes,
  createPersistenceCoordinator,
  decodePartitionEnvelope,
  loadPersistedState,
  type PersistenceStorageAdapter,
} from '../../stores/persistenceCoordinator'

const createState = (
  theme: PersistedStateV2['theme'] = 'system'
): PersistedStateV2 => ({
  version: PERSISTED_STATE_VERSION,
  view: 'draw' as const,
  mode: 'commander' as const,
  options: { ...DEFAULT_OPTIONS, selectedColors: [] },
  display: { ...DEFAULT_DISPLAY },
  cache: { ...DEFAULT_CACHE },
  performance: { ...DEFAULT_PERFORMANCE },
  theme,
  history: [],
  saved: [],
})

const createRecord = (id: string): PersistedStateV2['saved'][number] => ({
  id,
  createdAt: '2026-08-11T12:00:00.000Z',
  mode: 'commander',
  options: { ...DEFAULT_OPTIONS, selectedColors: [] },
  cards: [
    {
      id: `card-${id}`,
      name: `Card ${id}`,
      scryfall_uri: `https://scryfall.com/card/test/${id}`,
      color_identity: [],
    },
  ],
})

const createMemoryStorage = () => {
  const values = new Map<string, unknown>()
  let removeFailure: { key: string; kind: StorageFailureKind } | null = null
  const storage: PersistenceStorageAdapter = {
    read: <Value>(key: string, fallback: Value): StorageReadResult<Value> => ({
      ok: true,
      value: (values.has(key) ? values.get(key) : fallback) as Value,
    }),
    write: <Value>(key: string, value: Value): StorageResult => {
      values.set(key, JSON.parse(JSON.stringify(value)) as Value)
      return { ok: true }
    },
    remove: (key: string): StorageResult => {
      if (removeFailure?.key === key) {
        return {
          ok: false,
          kind: removeFailure.kind,
          error: new DOMException('Blocked', 'SecurityError'),
        }
      }
      values.delete(key)
      return { ok: true }
    },
  }
  return {
    storage,
    values,
    failRemoval: (key: string, kind: StorageFailureKind = 'security') => {
      removeFailure = { key, kind }
    },
  }
}

class VisibilityTarget extends EventTarget {
  visibilityState = 'visible'

  setHidden() {
    this.visibilityState = 'hidden'
    this.dispatchEvent(new Event('visibilitychange'))
  }
}

describe('partitioned persistence coordinator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads legacy v2 data and marks it for one-time partition migration', () => {
    const memory = createMemoryStorage()
    memory.values.set(LEGACY_PERSISTED_STATE_KEY, {
      ...createState('dark'),
      version: 2,
    })

    const loaded = loadPersistedState(memory.storage)

    expect(loaded.state.theme).toBe('dark')
    expect(loaded.legacyPresent).toBe(true)
    expect(loaded.needsMigration).toBe(true)
    expect(loaded.envelopes.preferences.value.theme).toBe('dark')
  })

  it('writes every migration partition before removing legacy v2', () => {
    const memory = createMemoryStorage()
    memory.values.set(LEGACY_PERSISTED_STATE_KEY, {
      ...createState('dark'),
      history: [createRecord('history')],
      saved: [createRecord('saved')],
    })
    const loaded = loadPersistedState(memory.storage)
    const coordinator = createPersistenceCoordinator({
      writerId: 'tab-a',
      initial: loaded,
      getState: () => loaded.state,
      onRemotePartition: vi.fn(),
      storage: memory.storage,
      visibilitySource: null,
      storageEventSource: null,
    })

    // A preferences edit while migration is pending must not narrow the
    // migration batch or delete the only complete v2 recovery copy early.
    coordinator.schedule(['preferences'])
    expect(coordinator.flush().ok).toBe(true)

    expect(memory.values.has(PERSISTED_PARTITION_KEYS.preferences)).toBe(true)
    expect(memory.values.has(PERSISTED_PARTITION_KEYS.history)).toBe(true)
    expect(memory.values.has(PERSISTED_PARTITION_KEYS.saved)).toBe(true)
    expect(memory.values.has(LEGACY_PERSISTED_STATE_KEY)).toBe(false)
  })

  it('rejects a partition envelope with a mismatched key or unsafe revision', () => {
    const envelope = {
      schema: PERSISTED_PARTITION_SCHEMA,
      version: PERSISTED_PARTITION_VERSION,
      partition: 'history',
      revision: { counter: Number.POSITIVE_INFINITY, writer: 'tab-a' },
      value: [],
    }

    expect(decodePartitionEnvelope(envelope, 'saved').ok).toBe(false)
    expect(
      decodePartitionEnvelope({ ...envelope, partition: 'saved' }, 'saved').ok
    ).toBe(false)
  })

  it('debounces and writes only the scheduled durable partition', () => {
    const memory = createMemoryStorage()
    const loaded = loadPersistedState(memory.storage)
    let state = createState('light')
    const coordinator = createPersistenceCoordinator({
      writerId: 'tab-a',
      initial: loaded,
      getState: () => state,
      onRemotePartition: vi.fn(),
      storage: memory.storage,
      debounceMs: 150,
      visibilitySource: null,
      storageEventSource: null,
    })

    coordinator.schedule(['preferences'])
    vi.advanceTimersByTime(149)
    expect(memory.values.size).toBe(0)

    vi.advanceTimersByTime(1)
    expect([...memory.values.keys()]).toEqual([
      PERSISTED_PARTITION_KEYS.preferences,
    ])
    const decoded = decodePartitionEnvelope(
      memory.values.get(PERSISTED_PARTITION_KEYS.preferences),
      'preferences'
    )
    expect(decoded.ok && decoded.envelope.value.theme).toBe('light')

    state = createState('dark')
    coordinator.schedule(['history'])
    coordinator.flush()
    const preferences = decodePartitionEnvelope(
      memory.values.get(PERSISTED_PARTITION_KEYS.preferences),
      'preferences'
    )
    expect(preferences.ok && preferences.envelope.value.theme).toBe('light')
  })

  it('flushes pending changes when the document becomes hidden', () => {
    const memory = createMemoryStorage()
    const visibility = new VisibilityTarget()
    const coordinator = createPersistenceCoordinator({
      writerId: 'tab-a',
      initial: loadPersistedState(memory.storage),
      getState: () => createState('dark'),
      onRemotePartition: vi.fn(),
      storage: memory.storage,
      debounceMs: 10_000,
      visibilitySource: visibility,
      storageEventSource: null,
    })

    coordinator.schedule(['preferences'])
    expect(memory.values.size).toBe(0)
    visibility.setHidden()
    expect(memory.values.has(PERSISTED_PARTITION_KEYS.preferences)).toBe(true)
  })

  it('converges concurrent settings, Saved, and clear-all tab changes', () => {
    const memory = createMemoryStorage()
    const loadedA = loadPersistedState(memory.storage)
    const loadedB = loadPersistedState(memory.storage)
    let stateA = createState('light')
    const stateB = createState('dark')
    const remoteA = vi.fn((partition, value) => {
      if (partition === 'preferences') {
        stateA = { ...stateA, ...value }
      } else if (partition === 'saved') {
        stateA = { ...stateA, saved: [...value] }
      } else {
        stateA = { ...stateA, history: [...value] }
      }
    })
    const eventsA = new EventTarget()
    const eventsB = new EventTarget()
    const coordinatorA = createPersistenceCoordinator({
      writerId: 'tab-a',
      initial: loadedA,
      getState: () => stateA,
      onRemotePartition: remoteA,
      storage: memory.storage,
      visibilitySource: null,
      storageEventSource: eventsA,
    })
    const coordinatorB = createPersistenceCoordinator({
      writerId: 'tab-b',
      initial: loadedB,
      getState: () => stateB,
      onRemotePartition: vi.fn(),
      storage: memory.storage,
      visibilitySource: null,
      storageEventSource: eventsB,
    })

    coordinatorA.schedule(['preferences'])
    coordinatorA.flush()
    const writeA = memory.values.get(PERSISTED_PARTITION_KEYS.preferences)
    coordinatorB.schedule(['preferences'])
    coordinatorB.flush()
    const writeB = memory.values.get(PERSISTED_PARTITION_KEYS.preferences)

    eventsA.dispatchEvent(
      new StorageEvent('storage', {
        key: PERSISTED_PARTITION_KEYS.preferences,
        newValue: JSON.stringify(writeB),
      })
    )
    eventsB.dispatchEvent(
      new StorageEvent('storage', {
        key: PERSISTED_PARTITION_KEYS.preferences,
        newValue: JSON.stringify(writeA),
      })
    )

    expect(stateA.theme).toBe('dark')
    expect(remoteA).toHaveBeenCalledTimes(1)
    expect(memory.values.get(PERSISTED_PARTITION_KEYS.preferences)).toEqual(
      writeB
    )
    const decodedA = decodePartitionEnvelope(writeA, 'preferences')
    const decodedB = decodePartitionEnvelope(writeB, 'preferences')
    expect(decodedA.ok && decodedB.ok).toBe(true)
    if (decodedA.ok && decodedB.ok) {
      expect(comparePartitionEnvelopes(decodedB.envelope, decodedA.envelope)).toBeGreaterThan(0)
    }

    stateB.saved = [createRecord('remote-saved')]
    coordinatorB.schedule(['saved'])
    coordinatorB.flush()
    eventsA.dispatchEvent(
      new StorageEvent('storage', {
        key: PERSISTED_PARTITION_KEYS.saved,
        newValue: JSON.stringify(
          memory.values.get(PERSISTED_PARTITION_KEYS.saved)
        ),
      })
    )
    expect(stateA.saved.map((record) => record.id)).toEqual(['remote-saved'])

    expect(coordinatorB.clear().ok).toBe(true)
    Object.values(PERSISTED_PARTITION_KEYS).forEach((key) => {
      eventsA.dispatchEvent(
        new StorageEvent('storage', { key, newValue: null })
      )
    })
    expect(stateA.theme).toBe('system')
    expect(stateA.history).toEqual([])
    expect(stateA.saved).toEqual([])
  })

  it('rolls partition removals back when clear-all cannot remove every key', () => {
    const memory = createMemoryStorage()
    const coordinator = createPersistenceCoordinator({
      writerId: 'tab-a',
      initial: loadPersistedState(memory.storage),
      getState: () => createState('dark'),
      onRemotePartition: vi.fn(),
      storage: memory.storage,
      visibilitySource: null,
      storageEventSource: null,
    })
    coordinator.schedule()
    expect(coordinator.flush().ok).toBe(true)
    memory.failRemoval(LEGACY_PERSISTED_STATE_KEY)

    expect(coordinator.clear()).toMatchObject({
      ok: false,
      kind: 'security',
    })
    expect(memory.values.has(PERSISTED_PARTITION_KEYS.preferences)).toBe(true)
    expect(memory.values.has(PERSISTED_PARTITION_KEYS.history)).toBe(true)
    expect(memory.values.has(PERSISTED_PARTITION_KEYS.saved)).toBe(true)
  })
})
