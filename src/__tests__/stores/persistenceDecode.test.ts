import { describe, expect, it } from 'vitest'
import { DEFAULT_CACHE_MAX_BYTES } from '../../lib/cache'
import {
  getCardPrice,
  getPartnerWithName,
  getTurnableCardFaces,
} from '../../lib/scryfall'
import {
  CONSERVATIVE_WEB_STORAGE_BUDGET_BYTES,
  DEFAULT_CACHE,
  DEFAULT_DISPLAY,
  DEFAULT_OPTIONS,
  DEFAULT_PERFORMANCE,
  PERSISTED_COLLECTION_LIMIT,
  PERSISTED_COLLECTION_SCAN_LIMIT,
  PERSISTED_CARD_LIMITS,
  PERSISTED_STATE_TARGET_BYTES,
  PERSISTED_STATE_TRANSFORM_BUDGET_MS,
  PERSISTED_STATE_VERSION,
  decodePersistedState,
  projectPersistedCard,
  projectPersistedRecord,
  projectPersistedState,
  type PersistedStateV2,
} from '../../stores/randomanderPersistence'
import type { PullRecord } from '../../stores/randomander'

const legacyCard = (id: string) => ({
  id,
  name: `Card ${id}`,
  scryfall_uri: `https://scryfall.com/card/test/${id}`,
})

const legacyRecord = (id: string, createdAt = '2026-08-03T12:00:00.000Z') => ({
  id,
  createdAt,
  mode: 'commander',
  cards: [legacyCard(id)],
  options: {},
})

const representativeDfcCard = (id: string) => ({
  ...legacyCard(id),
  oracle_id: `oracle-${id}`,
  layout: 'transform',
  set: 'tst',
  collector_number: '123',
  type_line: 'Legendary Creature — Human Wizard',
  oracle_text: 'Representative commander rules text. '.repeat(20),
  keywords: [
    'Partner',
    ...Array.from({ length: 99 }, (_, index) => `Keyword ${index}`),
  ],
  color_identity: ['W', 'U'],
  image_uris: {
    small: `https://cards.scryfall.io/small/${id}.jpg`,
    normal: `https://cards.scryfall.io/normal/${id}.jpg`,
    art_crop: `https://cards.scryfall.io/art/${id}.jpg`,
  },
  card_faces: [0, 1].map((face) => ({
    name: `Face ${face}`,
    type_line: 'Legendary Creature — Human Wizard',
    oracle_text: 'Representative double-faced rules text. '.repeat(20),
    image_uris: {
      small: `https://cards.scryfall.io/small/${id}-${face}.jpg`,
      normal: `https://cards.scryfall.io/normal/${id}-${face}.jpg`,
      art_crop: `https://cards.scryfall.io/art/${id}-${face}.jpg`,
    },
  })),
  all_parts: Array.from({ length: 100 }, (_, part) => ({
    id: `${id}-part-${part}`,
    name: part === 0 ? `Partner ${id}` : `Related card ${part}`,
    component: part === 0 ? 'related_card' : 'combo_piece',
    uri: `https://api.scryfall.com/cards/${id}-part-${part}`,
  })),
  prices: {
    usd: '1.00',
    usd_foil: '2.00',
    eur: '1.00',
    eur_foil: '2.00',
    tix: '0.10',
  },
  purchase_uris: {
    cardmarket: 'https://www.cardmarket.com/en/Magic/Products/Singles/Test',
    tcgplayer: 'https://www.tcgplayer.com/product/1',
    cardhoarder: 'https://www.cardhoarder.com/cards/1',
  },
  related_uris: {
    edhrec: 'https://edhrec.com/commanders/test',
    gatherer: 'https://gatherer.wizards.com/test',
    ...Object.fromEntries(
      Array.from({ length: 50 }, (_, index) => [
        `unused_${index}`,
        `https://example.test/${'unused'.repeat(40)}/${index}`,
      ])
    ),
  },
  object: 'card',
  details: 'Unused API error detail'.repeat(20),
})

const representativeChoiceRecord = (index: number): PullRecord => ({
  ...legacyRecord(`record-${index}`),
  mode: 'partner',
  options: {
    ...DEFAULT_OPTIONS,
    selectedColors: ['W', 'U'],
    twoChoices: true,
  },
  cards: [],
  choices: [0, 1].map((choice) => ({
    id: `record-${index}-choice-${choice}`,
    cards: [0, 1].map((card) =>
      representativeDfcCard(`record-${index}-${choice}-${card}`)
    ),
  })),
})

describe('versioned persisted-state decoding', () => {
  it.each([
    ['array root', []],
    ['string root', 'wrong'],
    ['future schema', { version: 999 }],
  ])('recovers from a wrong %s shape with a typed error', (_name, value) => {
    const decoded = decodePersistedState(value)

    expect(decoded.ok).toBe(false)
    if (decoded.ok) return
    expect(decoded.error).toMatchObject({
      name: 'RuntimeDataError',
      source: 'persisted-state',
      recoverable: true,
    })
    expect(decoded.value).toMatchObject({
      version: PERSISTED_STATE_VERSION,
      mode: 'commander',
      history: [],
      saved: [],
    })
  })

  it.each([undefined, 1])(
    'migrates a valid legacy partial document with version %s',
    (version) => {
      const decoded = decodePersistedState({
        ...(version === undefined ? {} : { version }),
        view: 'history',
        mode: 'spark',
        options: {
          colorCount: '2',
          colorCountMode: 'exactly',
          selectedColors: ['u', 'W', 'U'],
        },
        history: [legacyRecord('legacy')],
      })

      expect(decoded.ok).toBe(true)
      if (!decoded.ok) return
      expect(decoded.migrated).toBe(true)
      expect(decoded.repaired).toBe(true)
      expect(decoded.value).toMatchObject({
        version: PERSISTED_STATE_VERSION,
        view: 'history',
        mode: 'spark',
        options: {
          ...DEFAULT_OPTIONS,
          colorCount: '2',
          colorCountMode: 'exactly',
          selectedColors: ['W', 'U'],
        },
      })
      expect(decoded.value.history[0]).toMatchObject({
        id: 'legacy',
        cards: [{ id: 'legacy', color_identity: [] }],
      })
    }
  )

  it('repairs invalid enums, booleans, mixed colors, and bounded numbers', () => {
    const decoded = decodePersistedState({
      version: PERSISTED_STATE_VERSION,
      mode: 'invalid',
      theme: 'sepia',
      options: {
        colorCount: '9',
        colorCountMode: 'roughly',
        selectedColors: ['C', 'W', 'wat'],
        limitByDecks: 'yes',
        maxDecks: Number.POSITIVE_INFINITY,
      },
      display: {
        showLinks: 'yes',
        priceProvider: 'unsafe-market',
      },
      cache: {
        enabled: 'yes',
        ttlHours: -10,
        maxEntries: 1_000_000,
      },
    })

    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    expect(decoded.repaired).toBe(true)
    expect(decoded.value.mode).toBe('commander')
    expect(decoded.value.theme).toBe('system')
    expect(decoded.value.options).toEqual({
      ...DEFAULT_OPTIONS,
      selectedColors: ['W'],
    })
    expect(decoded.value.display).toEqual(DEFAULT_DISPLAY)
    expect(decoded.value.cache).toEqual({
      ...DEFAULT_CACHE,
      ttlHours: 1,
      maxEntries: 1_000,
    })
  })

  it('drops malformed records and deterministically caps loaded collections', () => {
    const records = Array.from(
      { length: PERSISTED_COLLECTION_LIMIT + 5 },
      (_, index) => legacyRecord(`record-${index}`)
    )
    records.splice(2, 0, legacyRecord('bad-date', 'not-a-date'))
    const decoded = decodePersistedState({
      version: PERSISTED_STATE_VERSION,
      history: records,
      saved: [
        { ...legacyRecord('missing-card'), cards: [{ id: 'missing-card' }] },
        legacyRecord('valid-saved'),
      ],
    })

    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    expect(decoded.repaired).toBe(true)
    expect(decoded.value.history).toHaveLength(PERSISTED_COLLECTION_LIMIT)
    expect(decoded.value.history.map((record) => record.id)).toEqual(
      Array.from({ length: PERSISTED_COLLECTION_LIMIT }, (_, index) =>
        `record-${index}`
      )
    )
    expect(decoded.value.saved.map((record) => record.id)).toEqual([
      'valid-saved',
    ])
  })

  it('bounds decoding work for a very oversized collection', () => {
    const records = Array.from(
      { length: PERSISTED_COLLECTION_SCAN_LIMIT * 25 },
      (_, index) =>
        index === PERSISTED_COLLECTION_SCAN_LIMIT - 1
          ? legacyRecord('last-scanned')
          : { malformed: index }
    )
    records[PERSISTED_COLLECTION_SCAN_LIMIT] = legacyRecord('past-scan-limit')

    const decoded = decodePersistedState({ history: records })

    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    expect(decoded.repaired).toBe(true)
    expect(decoded.value.history.map((record) => record.id)).toEqual([
      'last-scanned',
    ])
  })

  it('caps nested card and choice arrays while preserving their order', () => {
    const decoded = decodePersistedState({
      history: [
        {
          ...legacyRecord('oversized'),
          cards: Array.from({ length: 6 }, (_, index) => legacyCard(`card-${index}`)),
          choices: Array.from({ length: 4 }, (_, choiceIndex) => ({
            id: `choice-${choiceIndex}`,
            cards: Array.from({ length: 4 }, (_, cardIndex) =>
              legacyCard(`choice-${choiceIndex}-card-${cardIndex}`)
            ),
          })),
        },
      ],
    })

    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    expect(decoded.value.history[0]?.cards.map((card) => card.id)).toEqual([
      'card-0',
      'card-1',
      'card-2',
    ])
    expect(decoded.value.history[0]?.choices).toHaveLength(2)
    expect(decoded.value.history[0]?.choices?.[0]?.cards).toHaveLength(2)
  })

  it('projects maximum collections inside explicit payload and transform budgets', () => {
    const rawState: PersistedStateV2 = {
      version: PERSISTED_STATE_VERSION,
      view: 'draw',
      mode: 'partner',
      options: { ...DEFAULT_OPTIONS, selectedColors: ['W', 'U'] },
      display: { ...DEFAULT_DISPLAY },
      cache: { ...DEFAULT_CACHE },
      performance: { ...DEFAULT_PERFORMANCE },
      theme: 'system',
      history: Array.from({ length: PERSISTED_COLLECTION_LIMIT }, (_, index) =>
        representativeChoiceRecord(index)
      ),
      saved: Array.from({ length: PERSISTED_COLLECTION_LIMIT }, (_, index) =>
        representativeChoiceRecord(index + PERSISTED_COLLECTION_LIMIT)
      ),
    }
    const rawSerialized = JSON.stringify(rawState)
    const rawStateBytes = new TextEncoder().encode(rawSerialized).byteLength
    const startedAt = performance.now()
    const projected = projectPersistedState(rawState)
    const serialized = JSON.stringify(projected)
    const decoded = decodePersistedState(JSON.parse(serialized))
    const transformDurationMs = performance.now() - startedAt

    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    expect(decoded.repaired).toBe(false)
    expect(decoded.value.history).toHaveLength(PERSISTED_COLLECTION_LIMIT)
    expect(decoded.value.saved).toHaveLength(PERSISTED_COLLECTION_LIMIT)
    const stateBytes = new TextEncoder().encode(serialized).byteLength

    expect(stateBytes).toBeLessThan(rawStateBytes * 0.25)
    expect(stateBytes).toBeLessThanOrEqual(PERSISTED_STATE_TARGET_BYTES)
    expect(stateBytes + DEFAULT_CACHE_MAX_BYTES).toBeLessThanOrEqual(
      CONSERVATIVE_WEB_STORAGE_BUDGET_BYTES
    )
    expect(transformDurationMs).toBeLessThan(
      PERSISTED_STATE_TRANSFORM_BUDGET_MS
    )
  })

  it('strips unknown state, option, and record fields at the write boundary', () => {
    const source = {
      version: PERSISTED_STATE_VERSION,
      view: 'draw',
      mode: 'commander',
      options: {
        ...DEFAULT_OPTIONS,
        selectedColors: ['W'],
        privateFilterDraft: 'do not persist',
      },
      display: { ...DEFAULT_DISPLAY, privateDisplayDraft: true },
      cache: { ...DEFAULT_CACHE, privateCacheDraft: true },
      performance: { ...DEFAULT_PERFORMANCE, privatePerformanceDraft: true },
      theme: 'system',
      history: [
        {
          ...representativeChoiceRecord(1),
          privateRecordDraft: 'do not persist',
        },
      ],
      saved: [],
      privateRootDraft: 'do not persist',
    } as unknown as PersistedStateV2

    const serialized = JSON.stringify(projectPersistedState(source))

    expect(serialized).not.toContain('private')
    expect(Object.keys(JSON.parse(serialized))).toEqual([
      'version',
      'view',
      'mode',
      'options',
      'display',
      'cache',
      'performance',
      'theme',
      'history',
      'saved',
    ])
  })

  it('projects only post-load display and partner-continuation fields', () => {
    const projected = projectPersistedRecord(
      representativeChoiceRecord(999)
    )
    const card = projected.choices?.[0]?.cards[0]

    expect(card).toBeDefined()
    if (!card) return
    expect(card).not.toHaveProperty('oracle_id')
    expect(card).not.toHaveProperty('set')
    expect(card).not.toHaveProperty('collector_number')
    expect(card).not.toHaveProperty('object')
    expect(card).not.toHaveProperty('details')
    expect(card.image_uris).not.toHaveProperty('art_crop')
    expect(card.card_faces?.[0]?.image_uris).not.toHaveProperty('art_crop')
    expect(card.keywords).toHaveLength(PERSISTED_CARD_LIMITS.keywordCount)
    expect(card.all_parts).toHaveLength(1)
    expect(card.related_uris).toEqual({
      edhrec: 'https://edhrec.com/commanders/test',
    })
    expect(getPartnerWithName(card)).toBe(`Partner record-999-0-0`)
    expect(getTurnableCardFaces(card)).toHaveLength(2)
    expect(getCardPrice(card, 'cardmarket')).toMatchObject({
      formatted: '€1.00',
    })
  })

  it('is idempotent after one persisted-card projection repair', () => {
    const first = decodePersistedState({
      version: PERSISTED_STATE_VERSION,
      history: [representativeChoiceRecord(1)],
    })
    expect(first.ok).toBe(true)
    if (!first.ok) return
    expect(first.repaired).toBe(true)

    const second = decodePersistedState(first.value)
    expect(second.ok).toBe(true)
    if (!second.ok) return
    expect(second.migrated).toBe(false)
    expect(second.repaired).toBe(false)
    expect(second.value).toEqual(first.value)
  })

  it('bounds individual persisted strings and related maps', () => {
    const projected = projectPersistedCard({
      ...representativeDfcCard('bounded'),
      name: 'N'.repeat(PERSISTED_CARD_LIMITS.nameLength + 100),
      scryfall_uri: `https://scryfall.com/${'s'.repeat(
        PERSISTED_CARD_LIMITS.urlLength + 100
      )}`,
      oracle_text: 'O'.repeat(
        PERSISTED_CARD_LIMITS.oracleTextLength + 100
      ),
      related_uris: {
        edhrec: `https://edhrec.com/${'e'.repeat(
          PERSISTED_CARD_LIMITS.urlLength + 100
        )}`,
        unused: 'private upstream field',
      },
    })

    expect(projected.name).toHaveLength(PERSISTED_CARD_LIMITS.nameLength)
    expect(projected.scryfall_uri).toHaveLength(
      PERSISTED_CARD_LIMITS.urlLength
    )
    expect(projected.oracle_text).toHaveLength(
      PERSISTED_CARD_LIMITS.oracleTextLength
    )
    expect(projected.related_uris?.edhrec).toHaveLength(
      PERSISTED_CARD_LIMITS.urlLength
    )
    expect(Object.keys(projected.related_uris ?? {})).toEqual(['edhrec'])
  })
})
