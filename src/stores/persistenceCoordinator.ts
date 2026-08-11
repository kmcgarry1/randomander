import {
  readStorageResult,
  removeStorage,
  writeStorage,
  type StorageFailureKind,
  type StorageReadResult,
  type StorageResult,
} from '../lib/storage'
import { isRecord } from '../lib/runtimeValidation'
import {
  PERSISTED_STATE_VERSION,
  decodePersistedState,
  projectPersistedState,
  type PersistedStateV2,
} from './randomanderPersistence'

export const LEGACY_PERSISTED_STATE_KEY = 'randomander:state:v2'
export const PERSISTED_PARTITION_VERSION = 1 as const
export const PERSISTED_PARTITION_SCHEMA = 'randomander-partition' as const
export const DEFAULT_PERSISTENCE_DEBOUNCE_MS = 150

export const PERSISTED_PARTITIONS = [
  'preferences',
  'history',
  'saved',
] as const

export type PersistedPartition = (typeof PERSISTED_PARTITIONS)[number]

export const PERSISTED_PARTITION_KEYS: Readonly<
  Record<PersistedPartition, string>
> = Object.freeze({
  preferences: 'randomander:state:v3:preferences',
  history: 'randomander:state:v3:history',
  saved: 'randomander:state:v3:saved',
})

export type PersistedPreferences = Omit<
  PersistedStateV2,
  'version' | 'history' | 'saved'
>

export type PersistedPartitionValues = {
  preferences: PersistedPreferences
  history: PersistedStateV2['history']
  saved: PersistedStateV2['saved']
}

export type PersistedPartitionEnvelope<
  Partition extends PersistedPartition = PersistedPartition,
> = Readonly<{
  schema: typeof PERSISTED_PARTITION_SCHEMA
  version: typeof PERSISTED_PARTITION_VERSION
  partition: Partition
  revision: Readonly<{
    counter: number
    writer: string
  }>
  value: PersistedPartitionValues[Partition]
}>

export type PersistenceStorageAdapter = Readonly<{
  read: <Value>(key: string, fallback: Value) => StorageReadResult<Value>
  write: <Value>(key: string, value: Value) => StorageResult
  remove: (key: string) => StorageResult
}>

export const browserPersistenceStorage: PersistenceStorageAdapter = {
  read: readStorageResult,
  write: writeStorage,
  remove: removeStorage,
}

type PartitionEnvelopeMap = {
  [Partition in PersistedPartition]: PersistedPartitionEnvelope<Partition>
}

export type PartitionDecodeResult<Partition extends PersistedPartition> =
  | Readonly<{
      ok: true
      envelope: PersistedPartitionEnvelope<Partition>
      repaired: boolean
    }>
  | Readonly<{
      ok: false
      error: Error
    }>

export type LoadedPersistence = Readonly<{
  state: PersistedStateV2
  envelopes: PartitionEnvelopeMap
  failures: readonly StorageFailureKind[]
  needsMigration: boolean
  legacyPresent: boolean
}>

export type PersistenceFlushResult =
  | Readonly<{
      ok: true
      partitions: readonly PersistedPartition[]
    }>
  | Readonly<{
      ok: false
      partitions: readonly PersistedPartition[]
      kind: StorageFailureKind
      error: unknown
    }>

export type PersistenceClearResult =
  | Readonly<{ ok: true }>
  | Readonly<{
      ok: false
      kind: StorageFailureKind
      error: unknown
    }>

const unavailablePartitionError = (partition: PersistedPartition) =>
  new Error(`The ${partition} persistence partition is invalid.`)

const emptyRevision = () => Object.freeze({ counter: 0, writer: '' })

const freezeEnvelope = <Partition extends PersistedPartition>(
  partition: Partition,
  value: PersistedPartitionValues[Partition],
  counter = 0,
  writer = ''
): PersistedPartitionEnvelope<Partition> =>
  Object.freeze({
    schema: PERSISTED_PARTITION_SCHEMA,
    version: PERSISTED_PARTITION_VERSION,
    partition,
    revision:
      counter === 0 && writer === ''
        ? emptyRevision()
        : Object.freeze({ counter, writer }),
    value,
  })

export const partitionPersistedState = (
  state: PersistedStateV2
): PersistedPartitionValues => {
  const projected = projectPersistedState(state)
  const {
    version: _version,
    history,
    saved,
    ...preferences
  } = projected
  return { preferences, history, saved }
}

export const assemblePersistedState = (
  partitions: PersistedPartitionValues
): PersistedStateV2 =>
  projectPersistedState({
    version: PERSISTED_STATE_VERSION,
    ...partitions.preferences,
    history: partitions.history,
    saved: partitions.saved,
  })

const decodePartitionValue = <Partition extends PersistedPartition>(
  partition: Partition,
  value: unknown
): Readonly<{
  value: PersistedPartitionValues[Partition]
  repaired: boolean
}> | null => {
  if (partition === 'preferences') {
    if (!isRecord(value)) return null
    const decoded = decodePersistedState({
      version: PERSISTED_STATE_VERSION,
      ...value,
      history: [],
      saved: [],
    })
    if (!decoded.ok) return null
    return {
      value: partitionPersistedState(decoded.value)[
        partition
      ] as PersistedPartitionValues[Partition],
      repaired: decoded.repaired,
    }
  }

  if (!Array.isArray(value)) return null
  const decoded = decodePersistedState({
    version: PERSISTED_STATE_VERSION,
    [partition]: value,
  })
  if (!decoded.ok) return null
  return {
    value: partitionPersistedState(decoded.value)[
      partition
    ] as PersistedPartitionValues[Partition],
    repaired: decoded.repaired,
  }
}

export const decodePartitionEnvelope = <
  Partition extends PersistedPartition,
>(
  value: unknown,
  expectedPartition: Partition
): PartitionDecodeResult<Partition> => {
  if (
    !isRecord(value) ||
    value.schema !== PERSISTED_PARTITION_SCHEMA ||
    value.version !== PERSISTED_PARTITION_VERSION ||
    value.partition !== expectedPartition ||
    !isRecord(value.revision) ||
    !Number.isSafeInteger(value.revision.counter) ||
    (value.revision.counter as number) < 0 ||
    typeof value.revision.writer !== 'string' ||
    value.revision.writer.length > 128
  ) {
    return { ok: false, error: unavailablePartitionError(expectedPartition) }
  }

  const decodedValue = decodePartitionValue(expectedPartition, value.value)
  if (!decodedValue) {
    return { ok: false, error: unavailablePartitionError(expectedPartition) }
  }

  const envelope = freezeEnvelope(
    expectedPartition,
    decodedValue.value,
    value.revision.counter as number,
    value.revision.writer
  )
  return {
    ok: true,
    envelope,
    repaired:
      decodedValue.repaired ||
      JSON.stringify(envelope) !== JSON.stringify(value),
  }
}

const envelopePayloadKey = (envelope: PersistedPartitionEnvelope) =>
  JSON.stringify(envelope.value)

// Logical counters capture causal order. Writer IDs, then the bounded payload,
// provide a stable tie-break when two tabs branch from the same observed state.
export const comparePartitionEnvelopes = (
  left: PersistedPartitionEnvelope,
  right: PersistedPartitionEnvelope
) => {
  if (left.revision.counter !== right.revision.counter) {
    return left.revision.counter - right.revision.counter
  }
  const writerOrder = left.revision.writer.localeCompare(right.revision.writer)
  if (writerOrder !== 0) return writerOrder
  return envelopePayloadKey(left).localeCompare(envelopePayloadKey(right))
}

const createFallbackEnvelopes = (
  state: PersistedStateV2
): PartitionEnvelopeMap => {
  const partitions = partitionPersistedState(state)
  return {
    preferences: freezeEnvelope('preferences', partitions.preferences),
    history: freezeEnvelope('history', partitions.history),
    saved: freezeEnvelope('saved', partitions.saved),
  }
}

export const loadPersistedState = (
  storage: PersistenceStorageAdapter = browserPersistenceStorage
): LoadedPersistence => {
  const defaultDecode = decodePersistedState(null)
  const defaults = defaultDecode.value
  const legacyRead = storage.read<unknown>(LEGACY_PERSISTED_STATE_KEY, null)
  const legacyPresent = legacyRead.ok && legacyRead.value !== null
  const legacyDecoded = decodePersistedState(legacyRead.value)
  const fallbackState = legacyDecoded.value
  const fallbackEnvelopes = createFallbackEnvelopes(fallbackState)
  const failures: StorageFailureKind[] = []
  let needsMigration =
    legacyPresent &&
    legacyRead.ok &&
    legacyDecoded.ok

  if (!legacyRead.ok) failures.push(legacyRead.kind)
  if (legacyPresent && !legacyDecoded.ok) failures.push('invalid-data')

  const envelopes = { ...fallbackEnvelopes } as PartitionEnvelopeMap
  for (const partition of PERSISTED_PARTITIONS) {
    const read = storage.read<unknown>(PERSISTED_PARTITION_KEYS[partition], null)
    if (!read.ok) {
      failures.push(read.kind)
      continue
    }
    if (read.value === null) continue

    const decoded = decodePartitionEnvelope(read.value, partition)
    if (!decoded.ok) {
      failures.push('invalid-data')
      needsMigration = true
      continue
    }
    envelopes[partition] = decoded.envelope as never
    if (decoded.repaired) needsMigration = true
  }

  const state = assemblePersistedState({
    preferences: envelopes.preferences.value,
    history: envelopes.history.value,
    saved: envelopes.saved.value,
  })

  return {
    state: state ?? defaults,
    envelopes,
    failures: Object.freeze([...new Set(failures)]),
    needsMigration,
    legacyPresent,
  }
}

export const createPersistenceWriterId = () => {
  const randomId = globalThis.crypto?.randomUUID?.()
  if (randomId) return randomId
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

type VisibilitySource = Readonly<{
  visibilityState: string
  addEventListener: (type: 'visibilitychange', listener: EventListener) => void
  removeEventListener: (type: 'visibilitychange', listener: EventListener) => void
}>

type StorageEventSource = Readonly<{
  addEventListener: (type: 'storage', listener: EventListener) => void
  removeEventListener: (type: 'storage', listener: EventListener) => void
}>

export type PersistenceCoordinatorOptions = Readonly<{
  writerId: string
  initial: LoadedPersistence
  getState: () => PersistedStateV2
  onRemotePartition: <Partition extends PersistedPartition>(
    partition: Partition,
    value: PersistedPartitionValues[Partition]
  ) => void
  onFlush?: (result: PersistenceFlushResult) => void
  storage?: PersistenceStorageAdapter
  debounceMs?: number
  visibilitySource?: VisibilitySource | null
  storageEventSource?: StorageEventSource | null
}>

export type PersistenceCoordinator = Readonly<{
  schedule: (partitions?: readonly PersistedPartition[]) => void
  flush: () => PersistenceFlushResult
  retry: () => PersistenceFlushResult
  clear: () => PersistenceClearResult
  hasPendingWrites: () => boolean
  dispose: () => PersistenceFlushResult
}>

const parseStorageEvent = (event: Event) => {
  const candidate = event as StorageEvent
  return {
    key: typeof candidate.key === 'string' ? candidate.key : null,
    newValue:
      typeof candidate.newValue === 'string' ? candidate.newValue : null,
  }
}

export const createPersistenceCoordinator = (
  options: PersistenceCoordinatorOptions
): PersistenceCoordinator => {
  if (!options.writerId || options.writerId.length > 128) {
    throw new TypeError('A bounded persistence writer ID is required.')
  }

  const storage = options.storage ?? browserPersistenceStorage
  const debounceMs = Number.isFinite(options.debounceMs)
    ? Math.max(0, options.debounceMs ?? DEFAULT_PERSISTENCE_DEBOUNCE_MS)
    : DEFAULT_PERSISTENCE_DEBOUNCE_MS
  const visibilitySource =
    options.visibilitySource === undefined
      ? typeof document === 'undefined'
        ? null
        : document
      : options.visibilitySource
  const storageEventSource =
    options.storageEventSource === undefined
      ? typeof window === 'undefined'
        ? null
        : window
      : options.storageEventSource

  const accepted = { ...options.initial.envelopes } as PartitionEnvelopeMap
  const pending = new Map<PersistedPartition, PersistedPartitionEnvelope>()
  let logicalCounter = Math.max(
    ...PERSISTED_PARTITIONS.map(
      (partition) => accepted[partition].revision.counter
    )
  )
  let timer: ReturnType<typeof setTimeout> | null = null
  let disposed = false
  let migrationPending = options.initial.needsMigration

  const clearTimer = () => {
    if (timer === null) return
    globalThis.clearTimeout(timer)
    timer = null
  }

  const nextEnvelope = <Partition extends PersistedPartition>(
    partition: Partition,
    value: PersistedPartitionValues[Partition]
  ) => {
    logicalCounter = Math.max(
      logicalCounter,
      accepted[partition].revision.counter,
      pending.get(partition)?.revision.counter ?? 0
    ) + 1
    return freezeEnvelope(
      partition,
      value,
      logicalCounter,
      options.writerId
    )
  }

  const flush = (): PersistenceFlushResult => {
    clearTimer()
    const entries = [...pending.entries()]
    const flushed: PersistedPartition[] = []
    for (const [partition, envelope] of entries) {
      const result = storage.write(PERSISTED_PARTITION_KEYS[partition], envelope)
      if (!result.ok) {
        const failure = {
          ok: false as const,
          partitions: Object.freeze(flushed),
          kind: result.kind,
          error: result.error,
        }
        options.onFlush?.(failure)
        return failure
      }
      accepted[partition] = envelope as never
      if (pending.get(partition) === envelope) pending.delete(partition)
      flushed.push(partition)
    }

    if (migrationPending && pending.size === 0) {
      const removal = storage.remove(LEGACY_PERSISTED_STATE_KEY)
      if (!removal.ok) {
        const failure = {
          ok: false as const,
          partitions: Object.freeze(flushed),
          kind: removal.kind,
          error: removal.error,
        }
        options.onFlush?.(failure)
        return failure
      }
      migrationPending = false
    }

    const result = {
      ok: true as const,
      partitions: Object.freeze(flushed),
    }
    options.onFlush?.(result)
    return result
  }

  const queueFlush = () => {
    clearTimer()
    timer = globalThis.setTimeout(flush, debounceMs)
  }

  const schedule = (
    partitions: readonly PersistedPartition[] = PERSISTED_PARTITIONS
  ) => {
    if (disposed) return
    const values = partitionPersistedState(options.getState())
    ;[...new Set(partitions)].forEach((partition) => {
      pending.set(partition, nextEnvelope(partition, values[partition]))
    })
    queueFlush()
  }

  const applyRemoteEnvelope = (
    partition: PersistedPartition,
    remote: PersistedPartitionEnvelope
  ) => {
    const local = pending.get(partition) ?? accepted[partition]
    const comparison = comparePartitionEnvelopes(remote, local)
    logicalCounter = Math.max(logicalCounter, remote.revision.counter)
    if (comparison > 0) {
      pending.delete(partition)
      accepted[partition] = remote as never
      options.onRemotePartition(partition, remote.value as never)
      return
    }
    if (comparison < 0) {
      // A late lower-ranked write can otherwise leave storage divergent from
      // both tabs' selected winner. Rewriting the winner makes convergence
      // independent of browser event delivery order.
      const result = storage.write(PERSISTED_PARTITION_KEYS[partition], local)
      if (!result.ok) {
        options.onFlush?.({
          ok: false,
          partitions: Object.freeze([]),
          kind: result.kind,
          error: result.error,
        })
      }
    }
  }

  const onStorage = (event: Event) => {
    if (disposed) return
    const { key, newValue } = parseStorageEvent(event)
    const partition = PERSISTED_PARTITIONS.find(
      (candidate) => PERSISTED_PARTITION_KEYS[candidate] === key
    )
    if (!partition) return

    if (newValue === null) {
      pending.delete(partition)
      const fallback = createFallbackEnvelopes(
        decodePersistedState(null).value
      )[partition]
      accepted[partition] = fallback as never
      options.onRemotePartition(partition, fallback.value as never)
      return
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(newValue)
    } catch {
      return
    }
    const decoded = decodePartitionEnvelope(parsed, partition)
    if (!decoded.ok) return
    applyRemoteEnvelope(partition, decoded.envelope)
  }

  const onVisibilityChange = () => {
    if (visibilitySource?.visibilityState === 'hidden' && pending.size > 0) {
      flush()
    }
  }

  const clear = (): PersistenceClearResult => {
    clearTimer()
    const snapshots = new Map<string, PersistedPartitionEnvelope>()
    for (const partition of PERSISTED_PARTITIONS) {
      const envelope = pending.get(partition) ?? accepted[partition]
      if (envelope.revision.counter > 0) {
        snapshots.set(PERSISTED_PARTITION_KEYS[partition], envelope)
      }
    }

    const removed: string[] = []
    for (const key of [
      ...Object.values(PERSISTED_PARTITION_KEYS),
      LEGACY_PERSISTED_STATE_KEY,
    ]) {
      const result = storage.remove(key)
      if (!result.ok) {
        removed.forEach((removedKey) => {
          const snapshot = snapshots.get(removedKey)
          if (snapshot) storage.write(removedKey, snapshot)
        })
        return { ok: false, kind: result.kind, error: result.error }
      }
      removed.push(key)
    }

    pending.clear()
    const defaults = createFallbackEnvelopes(decodePersistedState(null).value)
    PERSISTED_PARTITIONS.forEach((partition) => {
      accepted[partition] = defaults[partition] as never
    })
    logicalCounter = 0
    migrationPending = false
    return { ok: true }
  }

  visibilitySource?.addEventListener('visibilitychange', onVisibilityChange)
  storageEventSource?.addEventListener('storage', onStorage)
  if (migrationPending) schedule(PERSISTED_PARTITIONS)

  return Object.freeze({
    schedule,
    flush,
    retry: flush,
    clear,
    hasPendingWrites: () => pending.size > 0,
    dispose: () => {
      if (disposed) {
        return {
          ok: true as const,
          partitions: Object.freeze([]) as readonly PersistedPartition[],
        }
      }
      const result = flush()
      disposed = true
      clearTimer()
      visibilitySource?.removeEventListener(
        'visibilitychange',
        onVisibilityChange
      )
      storageEventSource?.removeEventListener('storage', onStorage)
      return result
    },
  })
}
