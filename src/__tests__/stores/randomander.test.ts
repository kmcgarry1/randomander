import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import {
  useRandomanderStore,
  type OptionsState,
  type PullRecord,
} from '../../stores/randomander'
import type { ScryfallCard } from '../../lib/scryfall'
import {
  PERSISTED_PARTITION_KEYS,
  decodePartitionEnvelope,
} from '../../stores/persistenceCoordinator'

const options: OptionsState = {
  colorCount: 'any',
  selectedColors: ['W'],
  limitByDecks: false,
  maxDecks: 1000,
  twoChoices: true,
  excludeGameChangers: false,
  useRankCutoff: false,
  colorCountMode: 'up-to',
}

const createCard = (id: string): ScryfallCard => ({
  id,
  name: `Card ${id}`,
  scryfall_uri: `https://scryfall.com/card/test/${id}`,
  type_line: 'Legendary Creature — Human Wizard',
  oracle_text: 'Original rules text.',
  color_identity: ['W'],
  image_uris: { normal: `https://cards.scryfall.io/${id}.jpg` },
  card_faces: [
    {
      name: `Face ${id}`,
      type_line: 'Legendary Creature — Human Wizard',
      oracle_text: 'Original face rules text.',
    },
  ],
})

const createChoiceRecord = (): PullRecord => ({
  id: 'record-1',
  createdAt: '2026-08-03T12:00:00.000Z',
  mode: 'commander',
  options: { ...options, selectedColors: [...options.selectedColors] },
  cards: [],
  choices: [{ id: 'choice-1', cards: [createCard('one')] }],
})

const createRecord = (id: string): PullRecord => ({
  id: `record-${id}`,
  createdAt: '2026-08-03T12:00:00.000Z',
  mode: 'commander',
  options: { ...options, selectedColors: [...options.selectedColors] },
  cards: [createCard(id)],
})

describe('Randomander record snapshots', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('detaches History from the record supplied by its caller', () => {
    const store = useRandomanderStore()
    const record = createChoiceRecord()

    store.addHistory(record)
    record.options.selectedColors.push('U')
    record.choices?.[0]?.cards.push(createCard('two'))
    if (record.choices?.[0]?.cards[0]?.card_faces?.[0]) {
      record.choices[0].cards[0].card_faces[0].oracle_text = 'Mutated.'
    }

    expect(store.history[0]?.options.selectedColors).toEqual(['W'])
    expect(store.history[0]?.choices?.[0]?.cards).toHaveLength(1)
    expect(
      store.history[0]?.choices?.[0]?.cards[0]?.card_faces?.[0]?.oracle_text
    ).toBe('Original face rules text.')
  })

  it('keeps History, Saved, and a loaded current pull independent', () => {
    const store = useRandomanderStore()
    const record = createChoiceRecord()

    store.addHistory(record)
    store.saveRecord(record)
    const savedRecord = store.saved[0]
    expect(savedRecord).toBeDefined()
    if (!savedRecord) return

    store.loadRecord(savedRecord)
    store.choices[0]?.cards.push(createCard('two'))
    store.options.selectedColors.push('U')

    expect(store.saved[0]?.choices?.[0]?.cards).toHaveLength(1)
    expect(store.saved[0]?.options.selectedColors).toEqual(['W'])
    expect(store.history[0]?.choices?.[0]?.cards).toHaveLength(1)
    expect(store.history[0]).not.toBe(store.saved[0])
    expect(store.choices).not.toBe(store.saved[0]?.choices)
  })

  it('does not claim a pull is Saved when durable storage fails', () => {
    let quotaExceeded = true
    const values = new Map<string, string>()
    const storage = {
      get length() {
        return values.size
      },
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      key: (index: number) => [...values.keys()][index] ?? null,
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => {
        if (quotaExceeded) throw new DOMException('Full', 'QuotaExceededError')
        values.set(key, value)
      },
    } satisfies Storage
    vi.stubGlobal('localStorage', storage)
    setActivePinia(createPinia())
    const store = useRandomanderStore()
    const record = createChoiceRecord()

    expect(store.saveRecord(record)).toBe(false)
    expect(store.saved).toHaveLength(0)
    expect(store.persistenceError).toMatch(/storage is full/i)

    quotaExceeded = false
    expect(store.retryPersistence()).toBe(true)
    expect(store.persistenceError).toBe('')
    expect(store.persistenceNotice).toMatch(/saved/i)
    expect(values.get(PERSISTED_PARTITION_KEYS.saved)).toBeTruthy()
  })

  it('evicts disposable cache before retrying durable personal state', () => {
    const record = createChoiceRecord()
    const values = new Map<string, string>([
      [
        'randomander:state:v2',
        JSON.stringify({ history: [record], saved: [record] }),
      ],
      [
        'randomander:cache:v1',
        JSON.stringify({
          entries: {
            large: {
              value: 'x'.repeat(5_000),
              expiresAt: Date.now() + 60_000,
              updatedAt: Date.now(),
            },
          },
        }),
      ],
    ])
    const byteLimit = 4_000
    const storage = {
      get length() {
        return values.size
      },
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      key: (index: number) => [...values.keys()][index] ?? null,
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => {
        const next = new Map(values)
        next.set(key, value)
        const totalBytes = [...next.values()].reduce(
          (total, entry) => total + new TextEncoder().encode(entry).byteLength,
          0
        )
        if (totalBytes > byteLimit) {
          throw new DOMException('Full', 'QuotaExceededError')
        }
        values.set(key, value)
      },
    } satisfies Storage
    vi.stubGlobal('localStorage', storage)
    setActivePinia(createPinia())

    const store = useRandomanderStore()

    expect(store.persistenceError).toBe('')
    expect(store.history).toHaveLength(1)
    expect(store.saved).toHaveLength(1)
    expect(JSON.parse(values.get('randomander:cache:v1') ?? '{}')).toEqual({
      version: 1,
      entries: {},
    })
    const saved = decodePartitionEnvelope(
      JSON.parse(values.get(PERSISTED_PARTITION_KEYS.saved) ?? 'null'),
      'saved'
    )
    expect(saved.ok && saved.envelope.value).toHaveLength(1)
    expect(values.has(PERSISTED_PARTITION_KEYS.preferences)).toBe(true)
    expect(values.has(PERSISTED_PARTITION_KEYS.history)).toBe(true)
    expect(values.has(PERSISTED_PARTITION_KEYS.saved)).toBe(true)
    expect(values.has('randomander:state:v2')).toBe(false)
  })

  it('surfaces malformed persisted JSON without overwriting it on startup', () => {
    localStorage.setItem('randomander:state:v2', '{not-json')

    const store = useRandomanderStore()

    expect(store.history).toEqual([])
    expect(store.saved).toEqual([])
    expect(store.persistenceError).toMatch(/could not be read/i)
    expect(localStorage.getItem('randomander:state:v2')).toBe('{not-json')
  })

  it('does not overwrite a future persisted-state version on startup', () => {
    const futureState = JSON.stringify({ version: 999, history: ['future'] })
    localStorage.setItem('randomander:state:v2', futureState)

    const store = useRandomanderStore()

    expect(store.mode).toBe('commander')
    expect(store.history).toEqual([])
    expect(store.persistenceError).toMatch(/could not be read/i)
    expect(localStorage.getItem('randomander:state:v2')).toBe(futureState)
  })

  it('rejects a 41st Saved record unless replacement is explicit', () => {
    const store = useRandomanderStore()
    for (let index = 0; index < 40; index += 1) {
      expect(store.saveRecord(createRecord(String(index)))).toBe(true)
    }

    const atCapacity = store.saved.map((record) => record.id)
    expect(store.saveRecord(createRecord('40'))).toBe(false)
    expect(store.saved.map((record) => record.id)).toEqual(atCapacity)

    expect(
      store.saveRecord(createRecord('40'), { replaceOldest: true })
    ).toBe(true)
    expect(store.saved).toHaveLength(40)
    expect(store.saved[0]?.id).toBe('record-40')
    expect(store.saved.some((record) => record.id === 'record-0')).toBe(false)
  })

  it('rolls back remove and clear mutations when persistence fails', () => {
    let rejectWrites = false
    const values = new Map<string, string>()
    const storage = {
      get length() {
        return values.size
      },
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      key: (index: number) => [...values.keys()][index] ?? null,
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => {
        if (rejectWrites) throw new Error('Storage write failed')
        values.set(key, value)
      },
    } satisfies Storage
    vi.stubGlobal('localStorage', storage)
    setActivePinia(createPinia())
    const store = useRandomanderStore()
    const historyRecord = createRecord('history')
    const savedRecord = createRecord('saved')
    store.addHistory(historyRecord)
    expect(store.saveRecord(savedRecord)).toBe(true)
    rejectWrites = true

    expect(store.removeSaved(savedRecord.id)).toBe(false)
    expect(store.saved.map((record) => record.id)).toEqual([savedRecord.id])
    expect(store.clearHistory()).toBe(false)
    expect(store.history.map((record) => record.id)).toEqual([historyRecord.id])
    expect(store.clearSaved()).toBe(false)
    expect(store.saved.map((record) => record.id)).toEqual([savedRecord.id])
    expect(store.persistenceError).toMatch(/could not save/i)
  })

  it('clears both storage keys without a watcher rewriting them, then resumes persistence', async () => {
    const store = useRandomanderStore()
    store.addHistory(createRecord('history'))
    expect(store.saveRecord(createRecord('saved'))).toBe(true)
    store.openSettingsPanel()
    localStorage.setItem(
      'randomander:cache:v1',
      JSON.stringify({ version: 1, entries: {} })
    )

    expect(store.clearAllLocalData()).toBe(true)
    expect(store.activePanel).toBeNull()
    expect(store.history).toEqual([])
    expect(store.saved).toEqual([])
    expect(localStorage.getItem('randomander:state:v2')).toBeNull()
    expect(localStorage.getItem(PERSISTED_PARTITION_KEYS.preferences)).toBeNull()
    expect(localStorage.getItem(PERSISTED_PARTITION_KEYS.history)).toBeNull()
    expect(localStorage.getItem(PERSISTED_PARTITION_KEYS.saved)).toBeNull()
    expect(localStorage.getItem('randomander:cache:v1')).toBeNull()

    await nextTick()
    expect(localStorage.getItem('randomander:state:v2')).toBeNull()
    expect(localStorage.getItem('randomander:cache:v1')).toBeNull()

    store.theme = 'dark'
    expect(store.retryPersistence()).toBe(true)
    const preferences = decodePartitionEnvelope(
      JSON.parse(
        localStorage.getItem(PERSISTED_PARTITION_KEYS.preferences) ?? 'null'
      ),
      'preferences'
    )
    expect(preferences.ok && preferences.envelope.value.theme).toBe('dark')
  })

  it('keeps personal state in memory when clear-all only clears the disposable cache', async () => {
    let rejectStateRemoval = true
    const values = new Map<string, string>()
    const storage = {
      get length() {
        return values.size
      },
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      key: (index: number) => [...values.keys()][index] ?? null,
      removeItem: (key: string) => {
        if (rejectStateRemoval && key === 'randomander:state:v2') {
          throw new DOMException('Blocked', 'SecurityError')
        }
        values.delete(key)
      },
      setItem: (key: string, value: string) => values.set(key, value),
    } satisfies Storage
    vi.stubGlobal('localStorage', storage)
    setActivePinia(createPinia())
    const store = useRandomanderStore()
    const historyRecord = createRecord('history')
    const savedRecord = createRecord('saved')
    store.addHistory(historyRecord)
    expect(store.saveRecord(savedRecord)).toBe(true)
    values.set(
      'randomander:cache:v1',
      JSON.stringify({ version: 1, entries: {} })
    )

    expect(store.clearAllLocalData()).toBe(false)
    expect(store.history.map((record) => record.id)).toEqual([historyRecord.id])
    expect(store.saved.map((record) => record.id)).toEqual([savedRecord.id])
    expect(values.has(PERSISTED_PARTITION_KEYS.history)).toBe(true)
    expect(values.has(PERSISTED_PARTITION_KEYS.saved)).toBe(true)
    expect(values.has('randomander:cache:v1')).toBe(false)
    expect(store.persistenceError).toMatch(
      /cached responses were cleared.*history.*saved pulls remain/i
    )

    rejectStateRemoval = false
    expect(store.retryPersistence()).toBe(true)
    await nextTick()
    expect(store.history).toEqual([])
    expect(store.saved).toEqual([])
    expect(values.has('randomander:state:v2')).toBe(false)
    expect(values.has(PERSISTED_PARTITION_KEYS.preferences)).toBe(false)
    expect(values.has(PERSISTED_PARTITION_KEYS.history)).toBe(false)
    expect(values.has(PERSISTED_PARTITION_KEYS.saved)).toBe(false)
    expect(values.has('randomander:cache:v1')).toBe(false)
  })
})
