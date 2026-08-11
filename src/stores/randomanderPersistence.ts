import {
  decodeScryfallCard,
  isPriceProvider,
  type ScryfallCard,
} from '../lib/scryfall'
import {
  RuntimeDataError,
  isRecord,
  nonEmptyString,
} from '../lib/runtimeValidation'
import type {
  CacheSettings,
  ColorCount,
  DisplaySettings,
  LegacyViewKey,
  Mode,
  OptionsState,
  PerformanceSettings,
  PullRecord,
  ThemeMode,
} from './randomander'

export const PERSISTED_STATE_VERSION = 2 as const
export const PERSISTED_COLLECTION_LIMIT = 40
export const PERSISTED_COLLECTION_SCAN_LIMIT = 400
export const PERSISTED_OPTIONS_COLOR_SCAN_LIMIT = 32
// Project budget for state plus the disposable cache. This deliberately leaves
// headroom instead of targeting a browser's full Web Storage quota.
export const CONSERVATIVE_WEB_STORAGE_BUDGET_BYTES = 4_000_000
// The response cache has its own 1.5 MB cap. Keeping durable application state
// below this target leaves another 250 kB for serialization and browser quota
// variance while staying inside the shared conservative storage budget.
export const PERSISTED_STATE_TARGET_BYTES = 2_250_000
export const PERSISTED_STATE_TRANSFORM_BUDGET_MS = 250
export const MAX_DECK_LIMIT = 1_000_000
export const MAX_CACHE_TTL_HOURS = 8_760
export const MAX_CACHE_ENTRIES = 1_000
export const PERSISTED_CARD_LIMITS = Object.freeze({
  idLength: 128,
  nameLength: 512,
  urlLength: 2_048,
  layoutLength: 64,
  typeLineLength: 1_024,
  oracleTextLength: 16_384,
  colorCount: 5,
  keywordCount: 32,
  keywordLength: 128,
  faceCount: 4,
  relatedPartScanCount: 100,
  relatedPartCount: 8,
  componentLength: 64,
  priceLength: 64,
})
export const PERSISTED_RECORD_LIMITS = Object.freeze({
  idLength: 128,
  createdAtLength: 64,
})

export const DEFAULT_OPTIONS: Readonly<OptionsState> = Object.freeze({
  colorCount: 'any',
  selectedColors: [],
  limitByDecks: false,
  maxDecks: 1_000,
  twoChoices: false,
  excludeGameChangers: false,
  useRankCutoff: false,
  colorCountMode: 'up-to',
})

export const DEFAULT_DISPLAY: Readonly<DisplaySettings> = Object.freeze({
  showHeader: false,
  showStatus: false,
  showChips: false,
  showCardTitles: true,
  showColorIdentity: true,
  showLinks: true,
  showTags: true,
  usePairTags: true,
  showAmbient: false,
  enablePrestigeReveal: true,
  priceProvider: 'cardmarket',
})

export const DEFAULT_CACHE: Readonly<CacheSettings> = Object.freeze({
  enabled: true,
  ttlHours: 24,
  maxEntries: 120,
})

export const DEFAULT_PERFORMANCE: Readonly<PerformanceSettings> = Object.freeze({
  reduceMotion: false,
  simplifyBackdrop: false,
  reduceTransparency: false,
})

export type PersistedStateV2 = {
  version: typeof PERSISTED_STATE_VERSION
  view: LegacyViewKey
  mode: Mode
  options: OptionsState
  display: DisplaySettings
  cache: CacheSettings
  performance: PerformanceSettings
  theme: ThemeMode
  history: PullRecord[]
  saved: PullRecord[]
}

export type PersistedStateDecodeResult =
  | {
      ok: true
      value: PersistedStateV2
      migrated: boolean
      repaired: boolean
    }
  | {
      ok: false
      value: PersistedStateV2
      error: RuntimeDataError
      migrated: false
      repaired: true
    }

const COLOR_COUNTS = new Set<ColorCount>(['any', '0', '1', '2', '3', '4', '5'])
const MODES = new Set<Mode>(['commander', 'partner', 'spark'])
const VIEWS = new Set<LegacyViewKey>(['draw', 'settings', 'history', 'saved'])
const THEMES = new Set<ThemeMode>(['light', 'dark', 'system'])
const COMPARISONS = new Set<OptionsState['colorCountMode']>(['up-to', 'exactly'])
const COLORS = ['C', 'W', 'U', 'B', 'R', 'G'] as const
const COLOR_SET = new Set<string>(COLORS)

const defaultState = (): PersistedStateV2 => ({
  version: PERSISTED_STATE_VERSION,
  view: 'draw',
  mode: 'commander',
  options: { ...DEFAULT_OPTIONS, selectedColors: [] },
  display: { ...DEFAULT_DISPLAY },
  cache: { ...DEFAULT_CACHE },
  performance: { ...DEFAULT_PERFORMANCE },
  theme: 'system',
  history: [],
  saved: [],
})

type PersistedCardProjection = {
  value: ScryfallCard
  repaired: boolean
}

const projectCardInput = (value: unknown) => {
  if (!isRecord(value)) return { value, repaired: false }
  let repaired = false
  const boundedString = (candidate: unknown, maximum: number) => {
    if (typeof candidate !== 'string') return candidate
    if (candidate.length <= maximum) return candidate
    repaired = true
    return candidate.slice(0, maximum)
  }
  const optionalFields = (
    candidate: unknown,
    fields: ReadonlyArray<readonly [string, number]>
  ) => {
    if (!isRecord(candidate)) return candidate
    return Object.fromEntries(
      fields.flatMap(([field, maximum]) => {
        const fieldValue = candidate[field]
        if (fieldValue === undefined) return []
        if (typeof fieldValue !== 'string') {
          repaired = true
          return []
        }
        return [[field, boundedString(fieldValue, maximum)]]
      })
    )
  }
  const imageUris = (candidate: unknown) => {
    if (!isRecord(candidate)) return candidate
    if (candidate.art_crop !== undefined) repaired = true
    return optionalFields(candidate, [
      ['small', PERSISTED_CARD_LIMITS.urlLength],
      ['normal', PERSISTED_CARD_LIMITS.urlLength],
    ])
  }

  const keywords = Array.isArray(value.keywords)
    ? value.keywords
        .slice(0, PERSISTED_CARD_LIMITS.keywordCount)
        .map((keyword) =>
          boundedString(keyword, PERSISTED_CARD_LIMITS.keywordLength)
        )
    : value.keywords
  if (
    Array.isArray(value.keywords) &&
    value.keywords.length > PERSISTED_CARD_LIMITS.keywordCount
  ) {
    repaired = true
  }

  const colorIdentity = Array.isArray(value.color_identity)
    ? value.color_identity.slice(0, PERSISTED_CARD_LIMITS.colorCount)
    : value.color_identity
  if (
    Array.isArray(value.color_identity) &&
    value.color_identity.length > PERSISTED_CARD_LIMITS.colorCount
  ) {
    repaired = true
  }

  const cardFaces = Array.isArray(value.card_faces)
    ? value.card_faces
        .slice(0, PERSISTED_CARD_LIMITS.faceCount)
        .map((face) =>
          isRecord(face)
            ? {
                name: boundedString(
                  face.name,
                  PERSISTED_CARD_LIMITS.nameLength
                ),
                type_line: boundedString(
                  face.type_line,
                  PERSISTED_CARD_LIMITS.typeLineLength
                ),
                oracle_text: boundedString(
                  face.oracle_text,
                  PERSISTED_CARD_LIMITS.oracleTextLength
                ),
                image_uris: imageUris(face.image_uris),
              }
            : face
        )
    : value.card_faces
  if (
    Array.isArray(value.card_faces) &&
    value.card_faces.length > PERSISTED_CARD_LIMITS.faceCount
  ) {
    repaired = true
  }

  const scannedParts = Array.isArray(value.all_parts)
    ? value.all_parts.slice(0, PERSISTED_CARD_LIMITS.relatedPartScanCount)
    : null
  const allParts = scannedParts
    ? scannedParts
        .filter(
          (part) => isRecord(part) && part.component === 'related_card'
        )
        .slice(0, PERSISTED_CARD_LIMITS.relatedPartCount)
        .map((part) => {
          const record = part as Record<string, unknown>
          return {
            id: boundedString(record.id, PERSISTED_CARD_LIMITS.idLength),
            name: boundedString(
              record.name,
              PERSISTED_CARD_LIMITS.nameLength
            ),
            component: boundedString(
              record.component,
              PERSISTED_CARD_LIMITS.componentLength
            ),
            uri: boundedString(record.uri, PERSISTED_CARD_LIMITS.urlLength),
          }
        })
    : value.all_parts
  if (
    Array.isArray(value.all_parts) &&
    (value.all_parts.length > PERSISTED_CARD_LIMITS.relatedPartScanCount ||
      value.all_parts.length !== (Array.isArray(allParts) ? allParts.length : 0))
  ) {
    repaired = true
  }

  if (
    value.oracle_id !== undefined ||
    value.set !== undefined ||
    value.collector_number !== undefined ||
    value.object !== undefined ||
    value.details !== undefined
  ) {
    repaired = true
  }
  if (
    isRecord(value.related_uris) &&
    (value.related_uris.gatherer !== undefined ||
      value.related_uris.tcgplayer_infinite_articles !== undefined ||
      value.related_uris.tcgplayer_infinite_decks !== undefined)
  ) {
    repaired = true
  }

  const projectedValue = {
    id: boundedString(value.id, PERSISTED_CARD_LIMITS.idLength),
    name: boundedString(value.name, PERSISTED_CARD_LIMITS.nameLength),
    scryfall_uri: boundedString(
      value.scryfall_uri,
      PERSISTED_CARD_LIMITS.urlLength
    ),
    color_identity: colorIdentity,
    layout: boundedString(value.layout, PERSISTED_CARD_LIMITS.layoutLength),
    type_line: boundedString(
      value.type_line,
      PERSISTED_CARD_LIMITS.typeLineLength
    ),
    oracle_text: boundedString(
      value.oracle_text,
      PERSISTED_CARD_LIMITS.oracleTextLength
    ),
    keywords,
    image_uris: imageUris(value.image_uris),
    card_faces: cardFaces,
    all_parts: allParts,
    prices: optionalFields(value.prices, [
      ['usd', PERSISTED_CARD_LIMITS.priceLength],
      ['usd_foil', PERSISTED_CARD_LIMITS.priceLength],
      ['usd_etched', PERSISTED_CARD_LIMITS.priceLength],
      ['eur', PERSISTED_CARD_LIMITS.priceLength],
      ['eur_foil', PERSISTED_CARD_LIMITS.priceLength],
      ['tix', PERSISTED_CARD_LIMITS.priceLength],
    ]),
    purchase_uris: optionalFields(value.purchase_uris, [
      ['cardmarket', PERSISTED_CARD_LIMITS.urlLength],
      ['tcgplayer', PERSISTED_CARD_LIMITS.urlLength],
      ['cardhoarder', PERSISTED_CARD_LIMITS.urlLength],
    ]),
    related_uris: isRecord(value.related_uris)
      ? {
          edhrec: boundedString(
            value.related_uris.edhrec,
            PERSISTED_CARD_LIMITS.urlLength
          ),
        }
      : value.related_uris,
  }
  return { repaired, value: projectedValue }
}

const compactDecodedCard = (card: ScryfallCard): ScryfallCard => {
  const compact: ScryfallCard = {
    id: card.id,
    name: card.name,
    scryfall_uri: card.scryfall_uri,
    color_identity: card.color_identity ?? [],
  }
  if (card.layout !== undefined) compact.layout = card.layout
  if (card.type_line !== undefined) compact.type_line = card.type_line
  if (card.oracle_text !== undefined) compact.oracle_text = card.oracle_text
  if (card.keywords?.length) compact.keywords = card.keywords
  if (card.image_uris) {
    compact.image_uris = {
      ...(card.image_uris.small !== undefined
        ? { small: card.image_uris.small }
        : {}),
      ...(card.image_uris.normal !== undefined
        ? { normal: card.image_uris.normal }
        : {}),
    }
  }
  if (card.card_faces?.length) {
    compact.card_faces = card.card_faces.map((face) => ({
      ...(face.name !== undefined ? { name: face.name } : {}),
      ...(face.type_line !== undefined ? { type_line: face.type_line } : {}),
      ...(face.oracle_text !== undefined
        ? { oracle_text: face.oracle_text }
        : {}),
      ...(face.image_uris
        ? {
            image_uris: {
              ...(face.image_uris.small !== undefined
                ? { small: face.image_uris.small }
                : {}),
              ...(face.image_uris.normal !== undefined
                ? { normal: face.image_uris.normal }
                : {}),
            },
          }
        : {}),
    }))
  }
  if (card.all_parts?.length) compact.all_parts = card.all_parts
  if (card.prices) {
    const prices = Object.fromEntries(
      Object.entries(card.prices).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string'
      )
    )
    if (Object.keys(prices).length) compact.prices = prices
  }
  if (card.purchase_uris) {
    const purchaseUris = Object.fromEntries(
      Object.entries(card.purchase_uris).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string'
      )
    )
    if (Object.keys(purchaseUris).length) {
      compact.purchase_uris = purchaseUris
    }
  }
  if (card.related_uris?.edhrec !== undefined) {
    compact.related_uris = { edhrec: card.related_uris.edhrec }
  }
  return compact
}

const decodePersistedCard = (
  value: unknown,
  path: string
): PersistedCardProjection => {
  const projectedInput = projectCardInput(value)
  const decoded = decodeScryfallCard(projectedInput.value, {
    source: 'persisted-state',
    path,
    requireColorIdentity: false,
  })
  const compact = compactDecodedCard(decoded)
  return {
    value: compact,
    repaired:
      projectedInput.repaired ||
      JSON.stringify(projectedInput.value) !== JSON.stringify(compact),
  }
}

export const projectPersistedCard = (card: ScryfallCard): ScryfallCard =>
  decodePersistedCard(card, 'card').value

const projectPersistedOptions = (options: OptionsState): OptionsState => ({
  colorCount: options.colorCount,
  selectedColors: options.selectedColors.slice(0, COLORS.length),
  limitByDecks: options.limitByDecks,
  maxDecks: options.maxDecks,
  twoChoices: options.twoChoices,
  excludeGameChangers: options.excludeGameChangers,
  useRankCutoff: options.useRankCutoff,
  colorCountMode: options.colorCountMode,
})

export const projectPersistedRecord = (record: PullRecord): PullRecord => {
  const choices = record.choices
    ?.slice(0, 2)
    .map((choice) => ({
      id: choice.id.slice(0, PERSISTED_RECORD_LIMITS.idLength),
      cards: choice.cards.slice(0, 2).map(projectPersistedCard),
    }))

  return {
    id: record.id.slice(0, PERSISTED_RECORD_LIMITS.idLength),
    createdAt: record.createdAt.slice(
      0,
      PERSISTED_RECORD_LIMITS.createdAtLength
    ),
    mode: record.mode,
    options: projectPersistedOptions(record.options),
    cards: record.cards.slice(0, 3).map(projectPersistedCard),
    ...(choices?.length ? { choices } : {}),
  }
}

// Keep the durable wire payload independent from reactive/store objects and
// from unused fields that may be added to live domain models in the future.
// This pure projection is also the single place where collection and nested
// record caps are applied before serialization.
export const projectPersistedState = (
  state: PersistedStateV2
): PersistedStateV2 => ({
  version: PERSISTED_STATE_VERSION,
  view: state.view,
  mode: state.mode,
  options: projectPersistedOptions(state.options),
  display: {
    showHeader: state.display.showHeader,
    showStatus: state.display.showStatus,
    showChips: state.display.showChips,
    showCardTitles: state.display.showCardTitles,
    showColorIdentity: state.display.showColorIdentity,
    showLinks: state.display.showLinks,
    showTags: state.display.showTags,
    usePairTags: state.display.usePairTags,
    showAmbient: state.display.showAmbient,
    enablePrestigeReveal: state.display.enablePrestigeReveal,
    priceProvider: state.display.priceProvider,
  },
  cache: {
    enabled: state.cache.enabled,
    ttlHours: state.cache.ttlHours,
    maxEntries: state.cache.maxEntries,
  },
  performance: {
    reduceMotion: state.performance.reduceMotion,
    simplifyBackdrop: state.performance.simplifyBackdrop,
    reduceTransparency: state.performance.reduceTransparency,
  },
  theme: state.theme,
  history: state.history
    .slice(0, PERSISTED_COLLECTION_LIMIT)
    .map(projectPersistedRecord),
  saved: state.saved
    .slice(0, PERSISTED_COLLECTION_LIMIT)
    .map(projectPersistedRecord),
})

export const decodePersistedState = (
  value: unknown
): PersistedStateDecodeResult => {
  const fallback = defaultState()
  if (value === null || value === undefined) {
    return { ok: true, value: fallback, migrated: false, repaired: false }
  }
  if (!isRecord(value)) {
    return {
      ok: false,
      value: fallback,
      error: new RuntimeDataError(
        'persisted-state',
        'root',
        'expected a versioned object'
      ),
      migrated: false,
      repaired: true,
    }
  }

  const rawVersion = value.version
  const migrated = rawVersion === undefined || rawVersion === 1
  if (!migrated && rawVersion !== PERSISTED_STATE_VERSION) {
    return {
      ok: false,
      value: fallback,
      error: new RuntimeDataError(
        'persisted-state',
        'version',
        `unsupported version ${String(rawVersion)}`
      ),
      migrated: false,
      repaired: true,
    }
  }

  let repaired = false
  const repair = () => {
    repaired = true
  }
  const enumValue = <T extends string>(
    candidate: unknown,
    allowed: ReadonlySet<T>,
    defaultValue: T
  ) => {
    if (candidate === undefined) return defaultValue
    if (typeof candidate === 'string' && allowed.has(candidate as T)) {
      return candidate as T
    }
    repair()
    return defaultValue
  }
  const booleanValue = (candidate: unknown, defaultValue: boolean) => {
    if (candidate === undefined) return defaultValue
    if (typeof candidate === 'boolean') return candidate
    repair()
    return defaultValue
  }
  const boundedInteger = (
    candidate: unknown,
    defaultValue: number,
    minimum: number,
    maximum: number
  ) => {
    if (candidate === undefined) return defaultValue
    if (typeof candidate !== 'number' || !Number.isFinite(candidate)) {
      repair()
      return defaultValue
    }
    const normalized = Math.min(maximum, Math.max(minimum, Math.floor(candidate)))
    if (normalized !== candidate) repair()
    return normalized
  }
  const objectValue = (candidate: unknown) => {
    if (candidate === undefined) return {}
    if (isRecord(candidate)) return candidate
    repair()
    return {}
  }

  const decodeOptions = (candidate: unknown): OptionsState => {
    const raw = objectValue(candidate)
    let selectedColors: string[] = []
    if (raw.selectedColors !== undefined) {
      if (!Array.isArray(raw.selectedColors)) {
        repair()
      } else {
        const rawColors = raw.selectedColors.slice(
          0,
          PERSISTED_OPTIONS_COLOR_SCAN_LIMIT
        )
        if (raw.selectedColors.length > PERSISTED_OPTIONS_COLOR_SCAN_LIMIT) {
          repair()
        }
        const normalized = rawColors.flatMap((color) => {
          if (typeof color !== 'string') {
            repair()
            return []
          }
          const symbol = color.toUpperCase()
          if (!COLOR_SET.has(symbol)) {
            repair()
            return []
          }
          return [symbol]
        })
        selectedColors = COLORS.filter((color) => normalized.includes(color))
        if (selectedColors.includes('C') && selectedColors.length > 1) {
          selectedColors = selectedColors.filter((color) => color !== 'C')
          repair()
        }
        if (
          selectedColors.length !== rawColors.length ||
          selectedColors.some((color, index) => color !== rawColors[index])
        ) {
          repair()
        }
      }
    }
    return {
      colorCount: enumValue(
        raw.colorCount,
        COLOR_COUNTS,
        DEFAULT_OPTIONS.colorCount
      ),
      selectedColors,
      limitByDecks: booleanValue(
        raw.limitByDecks,
        DEFAULT_OPTIONS.limitByDecks
      ),
      maxDecks: boundedInteger(
        raw.maxDecks,
        DEFAULT_OPTIONS.maxDecks,
        100,
        MAX_DECK_LIMIT
      ),
      twoChoices: booleanValue(raw.twoChoices, DEFAULT_OPTIONS.twoChoices),
      excludeGameChangers: booleanValue(
        raw.excludeGameChangers,
        DEFAULT_OPTIONS.excludeGameChangers
      ),
      useRankCutoff: booleanValue(
        raw.useRankCutoff,
        DEFAULT_OPTIONS.useRankCutoff
      ),
      colorCountMode: enumValue(
        raw.colorCountMode,
        COMPARISONS,
        DEFAULT_OPTIONS.colorCountMode
      ),
    }
  }

  const decodeRecord = (candidate: unknown, path: string): PullRecord | null => {
    if (!isRecord(candidate)) {
      repair()
      return null
    }
    const rawId = nonEmptyString(candidate.id)
    const id = rawId?.slice(0, PERSISTED_RECORD_LIMITS.idLength) ?? null
    if (rawId && rawId.length > PERSISTED_RECORD_LIMITS.idLength) repair()
    const createdAt = nonEmptyString(candidate.createdAt)
    const recordMode =
      typeof candidate.mode === 'string' && MODES.has(candidate.mode as Mode)
        ? (candidate.mode as Mode)
        : null
    const timestamp =
      createdAt && createdAt.length <= PERSISTED_RECORD_LIMITS.createdAtLength
        ? Date.parse(createdAt)
        : Number.NaN
    if (
      !id ||
      !createdAt ||
      createdAt.length > PERSISTED_RECORD_LIMITS.createdAtLength ||
      !recordMode ||
      !Number.isFinite(timestamp)
    ) {
      repair()
      return null
    }
    const normalizedDate = new Date(timestamp).toISOString()
    if (normalizedDate !== createdAt) repair()
    if (!Array.isArray(candidate.cards)) {
      repair()
      return null
    }
    const cards = candidate.cards.slice(0, 3).flatMap((card, index) => {
      try {
        const decoded = decodePersistedCard(card, `${path}.cards[${index}]`)
        if (decoded.repaired) repair()
        return [decoded.value]
      } catch {
        repair()
        return []
      }
    })
    if (candidate.cards.length > 3) repair()

    const choices = Array.isArray(candidate.choices)
      ? candidate.choices.slice(0, 2).flatMap((choice, choiceIndex) => {
          if (!isRecord(choice) || !Array.isArray(choice.cards)) {
            repair()
            return []
          }
          const rawChoiceId = nonEmptyString(choice.id)
          const choiceId =
            rawChoiceId?.slice(0, PERSISTED_RECORD_LIMITS.idLength) ?? null
          if (
            rawChoiceId &&
            rawChoiceId.length > PERSISTED_RECORD_LIMITS.idLength
          ) {
            repair()
          }
          if (!choiceId) {
            repair()
            return []
          }
          const choiceCards = choice.cards
            .slice(0, 2)
            .flatMap((card, cardIndex) => {
              try {
                const decoded = decodePersistedCard(
                  card,
                  `${path}.choices[${choiceIndex}].cards[${cardIndex}]`
                )
                if (decoded.repaired) repair()
                return [decoded.value]
              } catch {
                repair()
                return []
              }
            })
          if (choice.cards.length > 2) repair()
          if (choiceCards.length === 0) {
            repair()
            return []
          }
          return [{ id: choiceId, cards: choiceCards }]
        })
      : undefined
    if (Array.isArray(candidate.choices) && candidate.choices.length > 2) repair()
    if (candidate.choices !== undefined && !Array.isArray(candidate.choices)) {
      repair()
    }
    if (cards.length === 0 && (!choices || choices.length === 0)) {
      repair()
      return null
    }

    return {
      id,
      createdAt: normalizedDate,
      mode: recordMode,
      options: decodeOptions(candidate.options),
      cards,
      choices: choices?.length ? choices : undefined,
    }
  }

  const decodeCollection = (candidate: unknown, path: string) => {
    if (candidate === undefined) return []
    if (!Array.isArray(candidate)) {
      repair()
      return []
    }
    if (candidate.length > PERSISTED_COLLECTION_LIMIT) repair()
    const decoded: PullRecord[] = []
    const scanLength = Math.min(
      candidate.length,
      PERSISTED_COLLECTION_SCAN_LIMIT
    )
    for (
      let index = 0;
      index < scanLength && decoded.length < PERSISTED_COLLECTION_LIMIT;
      index += 1
    ) {
      const record = candidate[index]
      const result = decodeRecord(record, `${path}[${index}]`)
      if (result) decoded.push(result)
    }
    if (candidate.length > scanLength) repair()
    return decoded
  }

  const rawDisplay = objectValue(value.display)
  const rawCache = objectValue(value.cache)
  const rawPerformance = objectValue(value.performance)
  const priceProvider = isPriceProvider(rawDisplay.priceProvider)
    ? rawDisplay.priceProvider
    : DEFAULT_DISPLAY.priceProvider
  if (
    rawDisplay.priceProvider !== undefined &&
    !isPriceProvider(rawDisplay.priceProvider)
  ) {
    repair()
  }

  const decodedValue: PersistedStateV2 = {
    version: PERSISTED_STATE_VERSION,
    view: enumValue(value.view, VIEWS, 'draw'),
    mode: enumValue(value.mode, MODES, 'commander'),
    options: decodeOptions(value.options),
    display: {
      showHeader: booleanValue(
        rawDisplay.showHeader,
        DEFAULT_DISPLAY.showHeader
      ),
      showStatus: booleanValue(
        rawDisplay.showStatus,
        DEFAULT_DISPLAY.showStatus
      ),
      showChips: booleanValue(
        rawDisplay.showChips,
        DEFAULT_DISPLAY.showChips
      ),
      showCardTitles: booleanValue(
        rawDisplay.showCardTitles,
        DEFAULT_DISPLAY.showCardTitles
      ),
      showColorIdentity: booleanValue(
        rawDisplay.showColorIdentity,
        DEFAULT_DISPLAY.showColorIdentity
      ),
      showLinks: booleanValue(rawDisplay.showLinks, DEFAULT_DISPLAY.showLinks),
      showTags: booleanValue(rawDisplay.showTags, DEFAULT_DISPLAY.showTags),
      usePairTags: booleanValue(
        rawDisplay.usePairTags,
        DEFAULT_DISPLAY.usePairTags
      ),
      showAmbient: booleanValue(
        rawDisplay.showAmbient,
        DEFAULT_DISPLAY.showAmbient
      ),
      enablePrestigeReveal: booleanValue(
        rawDisplay.enablePrestigeReveal,
        DEFAULT_DISPLAY.enablePrestigeReveal
      ),
      priceProvider,
    },
    cache: {
      enabled: booleanValue(rawCache.enabled, DEFAULT_CACHE.enabled),
      ttlHours: boundedInteger(
        rawCache.ttlHours,
        DEFAULT_CACHE.ttlHours,
        1,
        MAX_CACHE_TTL_HOURS
      ),
      maxEntries: boundedInteger(
        rawCache.maxEntries,
        DEFAULT_CACHE.maxEntries,
        20,
        MAX_CACHE_ENTRIES
      ),
    },
    performance: {
      reduceMotion: booleanValue(
        rawPerformance.reduceMotion,
        DEFAULT_PERFORMANCE.reduceMotion
      ),
      simplifyBackdrop: booleanValue(
        rawPerformance.simplifyBackdrop,
        DEFAULT_PERFORMANCE.simplifyBackdrop
      ),
      reduceTransparency: booleanValue(
        rawPerformance.reduceTransparency,
        DEFAULT_PERFORMANCE.reduceTransparency
      ),
    },
    theme: enumValue(value.theme, THEMES, 'system'),
    history: decodeCollection(value.history, 'history'),
    saved: decodeCollection(value.saved, 'saved'),
  }

  return {
    ok: true,
    migrated,
    repaired,
    value: decodedValue,
  }
}
