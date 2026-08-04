import { defineStore } from 'pinia'
import { computed, nextTick, reactive, ref, shallowRef, watch } from 'vue'
import {
  formatColorIdentity,
  getCardSlug,
  getEdhrecPairIdentifier,
  getPartnerKind,
  getPartnerVariant,
  getPartnerWithName,
  getTypeLine,
  isBackgroundCard,
  isLegalPartnerPair,
  type PartnerKind,
  type PriceProvider,
  type ScryfallCard,
} from '../lib/scryfall'
import {
  fetchCardByExactName,
  fetchRandomCard,
  fetchRankedRandomCard,
  isScryfallRequestError,
} from '../services/scryfall'
import type { EdhrecTag, EdhrecMeta } from '../services/edhrec'
import {
  readStorageResult,
  removeStorage,
  writeStorage,
  type StorageFailureKind,
} from '../lib/storage'
import { clearCache, removeCache } from '../lib/cache'
import {
  compileColorFilter,
  formatColorCountLabel,
  type CompiledColorFilter,
} from '../lib/colorFilter'
import { RuntimeDataError } from '../lib/runtimeValidation'
import {
  HttpError,
  RequestTimeoutError,
  type CacheOptions,
} from '../services/http'
import {
  createDrawWorkflowContext,
  DRAW_WORKFLOW_DEADLINE_MS,
  DrawWorkflowNoMatchError,
  DrawWorkflowTimeoutError,
  type DrawWorkflowContext,
  type DrawWorkflowStopReason,
} from './drawWorkflow'
import {
  decodePersistedState,
  DEFAULT_CACHE,
  DEFAULT_DISPLAY,
  DEFAULT_OPTIONS,
  DEFAULT_PERFORMANCE,
  PERSISTED_COLLECTION_LIMIT,
  PERSISTED_STATE_VERSION,
  type PersistedStateV2,
} from './randomanderPersistence'

export {
  DRAW_WORKFLOW_CALL_BUDGET,
  DRAW_WORKFLOW_DEADLINE_MS,
} from './drawWorkflow'

export type Mode = 'commander' | 'spark' | 'partner'
export type ViewKey = 'draw'
export type LegacyViewKey = ViewKey | 'settings' | 'history' | 'saved'
export type ActivePanelKey = 'filters' | 'history' | 'saved' | 'settings'
export type ThemeMode = 'light' | 'dark' | 'system'

// EDHREC's public terms prohibit automated agents. Keep the adapter available
// to contract tests, but make public builds link-only unless written permission
// and a separately reviewed release decision change this boundary.
export const AUTOMATED_EDHREC_METADATA_ENABLED = import.meta.env.MODE === 'test'

export type MetadataLoadStatus =
  | 'idle'
  | 'loading'
  | 'success-data'
  | 'success-empty'
  | 'error'

export type MetadataLoadState = Readonly<{
  status: MetadataLoadStatus
  error: string
}>

export type CommanderChoice = {
  id: string
  cards: ScryfallCard[]
}

export type ColorCount = 'any' | '0' | '1' | '2' | '3' | '4' | '5'

export type OptionsState = {
  colorCount: ColorCount
  selectedColors: string[]
  limitByDecks: boolean
  maxDecks: number
  twoChoices: boolean
  excludeGameChangers: boolean
  useRankCutoff: boolean
  colorCountMode: 'up-to' | 'exactly'
}

export type DisplaySettings = {
  showHeader: boolean
  showStatus: boolean
  showChips: boolean
  showCardTitles: boolean
  showColorIdentity: boolean
  showLinks: boolean
  showTags: boolean
  usePairTags: boolean
  showAmbient: boolean
  enablePrestigeReveal: boolean
  priceProvider: PriceProvider
}

export type CacheSettings = {
  enabled: boolean
  ttlHours: number
  maxEntries: number
}

export type PerformanceSettings = {
  reduceMotion: boolean
  simplifyBackdrop: boolean
  reduceTransparency: boolean
}

export type PullRecord = {
  id: string
  createdAt: string
  mode: Mode
  options: OptionsState
  cards: ScryfallCard[]
  choices?: CommanderChoice[]
}

export type SaveRecordOptions = Readonly<{
  replaceOldest?: boolean
}>

const STORAGE_KEY = 'randomander:state:v2'
export const MAX_HISTORY = PERSISTED_COLLECTION_LIMIT
export const MAX_SAVED = PERSISTED_COLLECTION_LIMIT

type RequestOptions = Readonly<
  Omit<OptionsState, 'selectedColors'> & {
    selectedColors: readonly string[]
  }
>

type ResultProvenance = Readonly<{
  mode: Mode
  options: RequestOptions
}>

type DrawRequestConfig = ResultProvenance &
  Readonly<{
    signature: string
    drawCount: number
    isChoiceMode: boolean
    colorFilter: CompiledColorFilter
    pairColorFilter: CompiledColorFilter
    cacheOptions?: Readonly<CacheOptions>
    queries: Readonly<{
      background: string
      chooseBackgroundCommander: string
      commander: string
      doctors: string
      friendsForever: string
      genericPartner: string
      partnerPool: string
      spark: string
    }>
  }>

type ActiveDrawWorkflow = DrawWorkflowContext<DrawRequestConfig>

class CandidateMismatchError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CandidateMismatchError'
  }
}

export const modes = [
  {
    id: 'commander',
    label: 'Commander',
    description: 'One legal commander.',
  },
  {
    id: 'partner',
    label: 'Partner pair',
    description: 'A legal partner pair.',
  },
  {
    id: 'spark',
    label: '3-card spark',
    description: 'Three Commander-legal cards.',
  },
] as const

export const viewNavItems: Array<{ id: ViewKey; label: string }> = [
  { id: 'draw', label: 'Draw' },
] as const

export const colorOptions = [
  { value: 'any', label: 'Any colors' },
  { value: '0', label: 'Colorless' },
  { value: '1', label: 'Mono-color' },
  { value: '2', label: 'Two colors' },
  { value: '3', label: 'Three colors' },
  { value: '4', label: 'Four colors' },
  { value: '5', label: 'Five colors' },
] as const

export const COLOR_CHOICES = [
  {
    symbol: 'C',
    name: 'Colorless',
  },
  {
    symbol: 'W',
    name: 'White',
  },
  {
    symbol: 'U',
    name: 'Blue',
  },
  {
    symbol: 'B',
    name: 'Black',
  },
  {
    symbol: 'R',
    name: 'Red',
  },
  {
    symbol: 'G',
    name: 'Green',
  },
] as const

const defaultOptions: OptionsState = {
  ...DEFAULT_OPTIONS,
  selectedColors: [],
}

const createId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`

// Pull records cross the JSON persistence boundary, so clone them through the
// same representation. This also unwraps Vue proxies and prevents current,
// History, and Saved state from sharing nested card or choice references.
const snapshotRecord = (record: PullRecord): PullRecord =>
  JSON.parse(JSON.stringify(record)) as PullRecord

const persistenceFailureMessage = (kind: StorageFailureKind) => {
  if (kind === 'quota') {
    return 'Browser storage is full, so these changes are only available in this tab.'
  }
  if (kind === 'security' || kind === 'unavailable') {
    return 'Browser storage is blocked, so these changes are only available in this tab.'
  }
  if (kind === 'invalid-data') {
    return 'Saved browser data could not be read. Defaults are in use until storage is repaired.'
  }
  return 'Randomander could not save these changes to browser storage.'
}

export const useRandomanderStore = defineStore('randomander', () => {
  const persistedReadResult = readStorageResult<unknown>(STORAGE_KEY, null)
  const persistedDecodeResult = decodePersistedState(persistedReadResult.value)
  const persisted = persistedDecodeResult.value
  const persistedView = persisted.view
  const initialPanel =
    persistedView === 'history' || persistedView === 'saved' ? persistedView : null

  const view = ref<ViewKey>('draw')
  const activePanel = ref<ActivePanelKey | null>(initialPanel)
  const mode = ref<Mode>(persisted.mode)
  const options = reactive<OptionsState>({
    ...persisted.options,
    limitByDecks: AUTOMATED_EDHREC_METADATA_ENABLED
      ? persisted.options.limitByDecks
      : false,
    selectedColors: [...persisted.options.selectedColors],
  })
  const display = reactive<DisplaySettings>({
    ...persisted.display,
    showTags: AUTOMATED_EDHREC_METADATA_ENABLED
      ? persisted.display.showTags
      : false,
  })
  const cacheSettings = reactive<CacheSettings>({ ...persisted.cache })
  const performance = reactive<PerformanceSettings>({ ...persisted.performance })
  const theme = ref<ThemeMode>(persisted.theme)
  const history = ref<PullRecord[]>(persisted.history)
  const saved = ref<PullRecord[]>(persisted.saved)

  const cards = ref<ScryfallCard[]>([])
  const choices = ref<CommanderChoice[]>([])
  const sparkPalette = ref<string[] | null>(null)
  const isLoading = ref(false)
  const errorMessage = ref('')
  const initialPersistenceFailure: StorageFailureKind | null =
    !persistedReadResult.ok
      ? persistedReadResult.kind
      : !persistedDecodeResult.ok
        ? 'invalid-data'
        : null
  const persistenceError = ref(
    initialPersistenceFailure
      ? persistenceFailureMessage(initialPersistenceFailure)
      : ''
  )
  const shouldPersistDecodedState =
    persistedReadResult.ok &&
    persistedDecodeResult.ok &&
    (persistedDecodeResult.migrated || persistedDecodeResult.repaired)
  const persistenceNotice = ref('')
  const metadataSurfaceVisible = ref(false)
  const resultProvenance = shallowRef<ResultProvenance | null>(null)

  let activeWorkflow: ActiveDrawWorkflow | null = null
  let suppressQueryInvalidation = false
  let suppressPersistenceWatch = false
  const tagController = ref<AbortController | null>(null)
  const tagLookup = ref<Record<string, EdhrecTag[]>>({})
  const metadataStateLookup = ref<Record<string, MetadataLoadState>>({})
  const tagRequestId = ref(0)
  const metaCache = reactive(new Map<string, EdhrecMeta>())
  let pendingDurabilityAction: (() => boolean) | null = null
  const isOptionsOpen = computed(() => activePanel.value === 'filters')

  const cacheOptions = computed<CacheOptions | undefined>(() => {
    if (!cacheSettings.enabled) return undefined
    return {
      enabled: true,
      ttlMs: cacheSettings.ttlHours * 60 * 60 * 1000,
      maxEntries: cacheSettings.maxEntries,
    }
  })

  const drawCount = computed(() => {
    if (mode.value === 'spark') return 3
    if (mode.value === 'partner') return 2
    return 1
  })

  const primaryCard = computed(() => cards.value[0] ?? null)
  const primaryPartnerKind = computed<PartnerKind>(() =>
    primaryCard.value ? getPartnerKind(primaryCard.value) : null
  )
  const canRandomizePartner = computed(
    () =>
      mode.value === 'commander' &&
      (isBackgroundCard(primaryCard.value) || primaryPartnerKind.value !== null)
  )

  const isChoiceMode = computed(
    () => options.twoChoices && mode.value !== 'spark'
  )
  const hasResults = computed(() =>
    isChoiceMode.value ? choices.value.length > 0 : cards.value.length > 0
  )

  const compiledColorFilter = computed(() =>
    compileColorFilter({
      mode: mode.value,
      colorCount: options.colorCount,
      colorCountMode: options.colorCountMode,
      selectedColors: options.selectedColors,
    })
  )
  const colorCountNumber = computed(() => compiledColorFilter.value.count)
  const selectedColorSet = computed(
    () => new Set(compiledColorFilter.value.selectedColors)
  )
  const allowedColors = computed(() => [
    ...compiledColorFilter.value.allowedColors,
  ])
  const colorFilterLabel = computed(
    () => compiledColorFilter.value.ui.summary
  )
  const colorFilterProblem = computed(
    () => compiledColorFilter.value.problem?.message ?? ''
  )
  const colorComparisonDescription = computed(
    () => compiledColorFilter.value.ui.comparisonDescription
  )

  const sparkPaletteLabel = computed(() =>
    sparkPalette.value ? formatColorIdentity(sparkPalette.value) : ''
  )

  const modeLabel = computed(
    () => modes.find((modeOption) => modeOption.id === mode.value)?.label ?? 'Commander'
  )

  const stageTitle = computed(() => {
    if (!hasResults.value && !errorMessage.value && !isLoading.value) {
      return 'Commander studio'
    }
    if (isChoiceMode.value) return 'Choose your lead'
    if (mode.value === 'spark') return 'Deckbuilding sparks'
    if (mode.value === 'partner') return 'Partner pairing'
    return 'Commander draw'
  })

  const summaryChips = computed(() => {
    const chips: string[] = []
    chips.push(`Mode: ${modeLabel.value}`)
    if (
      mode.value !== 'spark' ||
      options.colorCount !== 'any' ||
      options.selectedColors.length > 0
    ) {
      chips.push(`Colors: ${colorFilterLabel.value}`)
    }
    if (mode.value === 'spark' && options.excludeGameChangers) {
      chips.push('No Game Changers')
    }
    if (sparkPalette.value) {
      chips.push(`Palette: ${sparkPaletteLabel.value}`)
    }
    if (options.limitByDecks && !options.useRankCutoff) {
      chips.push(`Decks < ${options.maxDecks}`)
    }
    if (options.useRankCutoff) {
      chips.push('Skip top 10%')
    }
    if (options.twoChoices && mode.value !== 'spark') {
      chips.push('Two options')
    }
    return chips
  })

  const colorLabel = computed(() => compiledColorFilter.value.ui.fieldLabel)

  const choiceLabel = computed(() =>
    mode.value === 'partner'
      ? 'Show two partner options'
      : 'Show two commander options'
  )

  const statusText = computed(() => {
    if (isLoading.value) return 'Fetching a random pull from Scryfall...'
    if (errorMessage.value) return 'Something went wrong.'
    if (!hasResults.value) return 'Ready to randomize.'
    if (isChoiceMode.value) {
      return mode.value === 'partner'
        ? 'Showing two partner-ready options.'
        : 'Showing two commander options.'
    }
    if (mode.value === 'spark') {
      const extras: string[] = []
      if (options.excludeGameChangers) extras.push('Game Changers excluded')
      if (sparkPalette.value) extras.push(`Palette: ${sparkPaletteLabel.value}`)
      return `Showing ${cards.value.length} cards${
        extras.length ? `. ${extras.join('. ')}.` : '.'
      }`
    }
    if (mode.value === 'partner') {
      return 'Showing a compatible partner pair.'
    }
    if (mode.value === 'commander' && cards.value.length > 1) {
      return 'Showing a commander and a compatible partner.'
    }
    return `Showing ${cards.value.length} random card${
      cards.value.length > 1 ? 's' : ''
    }.`
  })

  const isFirstLoad = computed(
    () => !hasResults.value && !errorMessage.value && !isLoading.value
  )

  const getPartnerButtonLabel = (card: ScryfallCard | null) => {
    if (isBackgroundCard(card)) return 'Find commander'
    const partnerKind = card ? getPartnerKind(card) : null
    switch (partnerKind) {
      case 'partner_with': {
        const partnerName = card ? getPartnerWithName(card) : null
        return partnerName ? `Get ${partnerName}` : 'Get partner'
      }
      case 'choose_background':
        return 'Randomize background'
      case 'friends_forever':
        return 'Randomize friend'
      case 'doctors_companion':
        return 'Randomize doctor'
      case 'partner':
        return 'Randomize partner'
      default:
        return 'Randomize partner'
    }
  }

  const partnerButtonLabel = computed(() =>
    getPartnerButtonLabel(primaryCard.value)
  )

  const gameChangerFilter = computed(() =>
    mode.value === 'spark' && options.excludeGameChangers
      ? ' -is:game-changer'
      : ''
  )

  const joinQuery = (...parts: Array<string | null | undefined>) =>
    parts.filter(Boolean).join(' ').trim()

  const colorIdentityQuery = computed(() =>
    compiledColorFilter.value.getScryfallClause()
  )

  const commanderQuery = computed(() =>
    joinQuery('is:commander legal:commander', colorIdentityQuery.value)
  )
  const sparkQuery = computed(() =>
    joinQuery('legal:commander', gameChangerFilter.value, colorIdentityQuery.value)
  )
  const partnerPoolQuery = computed(() =>
    joinQuery(
      'is:commander legal:commander (keyword:partner or keyword:"partner with" or keyword:"friends forever" or keyword:"choose a background" or keyword:"doctor\'s companion")',
      colorIdentityQuery.value
    )
  )
  const genericPartnerQuery = computed(() =>
    joinQuery('is:commander legal:commander keyword:partner', colorIdentityQuery.value)
  )
  const friendsForeverQuery = computed(() =>
    joinQuery('is:commander legal:commander keyword:"friends forever"', colorIdentityQuery.value)
  )
  const doctorsQuery = computed(() =>
    joinQuery(
      'is:commander legal:commander type:"Time Lord" type:doctor',
      colorIdentityQuery.value
    )
  )
  const backgroundQuery = computed(() =>
    joinQuery('type:background legal:commander', colorIdentityQuery.value)
  )
  const snapshotOptions = (): RequestOptions =>
    Object.freeze({
      ...options,
      limitByDecks: AUTOMATED_EDHREC_METADATA_ENABLED
        ? options.limitByDecks
        : false,
      selectedColors: Object.freeze([...options.selectedColors]),
    })

  const cloneRequestOptions = (requestOptions: RequestOptions): OptionsState => ({
    ...requestOptions,
    selectedColors: [...requestOptions.selectedColors],
  })

  const getRequestSignature = (
    requestMode: Mode,
    requestOptions: RequestOptions
  ) =>
    JSON.stringify([
      requestMode,
      requestOptions.colorCount,
      requestOptions.colorCountMode,
      requestOptions.excludeGameChangers,
      requestOptions.selectedColors,
      requestOptions.limitByDecks,
      requestOptions.maxDecks,
      requestOptions.twoChoices,
      requestOptions.useRankCutoff,
    ])

  const getCurrentRequestSignature = () =>
    getRequestSignature(mode.value, snapshotOptions())

  const captureRequestConfig = (): DrawRequestConfig => {
    const requestMode = mode.value
    const requestOptions = snapshotOptions()
    const colorFilter = compileColorFilter({
      mode: requestMode,
      colorCount: requestOptions.colorCount,
      colorCountMode: requestOptions.colorCountMode,
      selectedColors: requestOptions.selectedColors,
    })
    const pairColorFilter = compileColorFilter({
      mode: 'partner',
      colorCount: requestOptions.colorCount,
      colorCountMode: requestOptions.colorCountMode,
      selectedColors: requestOptions.selectedColors,
    })
    const requestCacheOptions = cacheOptions.value
      ? Object.freeze({ ...cacheOptions.value })
      : undefined
    return Object.freeze({
      mode: requestMode,
      options: requestOptions,
      signature: getRequestSignature(requestMode, requestOptions),
      drawCount: requestMode === 'spark' ? 3 : requestMode === 'partner' ? 2 : 1,
      isChoiceMode: requestOptions.twoChoices && requestMode !== 'spark',
      colorFilter,
      pairColorFilter,
      cacheOptions: requestCacheOptions,
      queries: Object.freeze({
        background: 'type:background legal:commander',
        chooseBackgroundCommander:
          'is:commander legal:commander o:"choose a background"',
        commander: 'is:commander legal:commander',
        doctors: 'is:commander legal:commander type:"Time Lord" type:doctor',
        friendsForever:
          'is:commander legal:commander keyword:"friends forever"',
        genericPartner: 'is:commander legal:commander keyword:partner',
        partnerPool:
          'is:commander legal:commander (keyword:partner or keyword:"partner with" or keyword:"friends forever" or keyword:"choose a background" or keyword:"doctor\'s companion")',
        spark: joinQuery(
          'legal:commander',
          requestOptions.excludeGameChangers ? '-is:game-changer' : ''
        ),
      }),
    })
  }

  const provenanceFromConfig = (
    config: DrawRequestConfig
  ): ResultProvenance =>
    Object.freeze({ mode: config.mode, options: config.options })

  const usesCommanderLink = (card: ScryfallCard) => {
    if (mode.value === 'spark') return false
    return !isBackgroundCard(card)
  }

  const shouldShowTags = (card: ScryfallCard) =>
    AUTOMATED_EDHREC_METADATA_ENABLED &&
    display.showTags &&
    usesCommanderLink(card)

  const getGroupsForState = (
    cardsToCheck: ScryfallCard[],
    choiceRecords?: CommanderChoice[]
  ) =>
    choiceRecords?.length
      ? choiceRecords.map((choice) => choice.cards)
      : cardsToCheck.length > 0
        ? [cardsToCheck]
        : []

  const getFingerprintForGroups = (
    modeToFingerprint: Mode,
    cardsToFingerprint: ScryfallCard[],
    choiceRecords?: CommanderChoice[]
  ) => {
    const groups = getGroupsForState(cardsToFingerprint, choiceRecords)
    if (groups.length === 0) return null

    const normalizedGroups = groups
      .map((group) => group.map((card) => card.id).slice().sort().join(','))
      .sort()

    return `${modeToFingerprint}:${normalizedGroups.join('|')}`
  }

  const getRecordFingerprint = (record: PullRecord) =>
    getFingerprintForGroups(record.mode, record.cards ?? [], record.choices)

  const savedFingerprints = computed(
    () =>
      new Set(
        saved.value
          .map((record) => getRecordFingerprint(record))
          .filter((fingerprint): fingerprint is string => fingerprint !== null)
      )
  )

  const currentResultFingerprint = computed(() =>
    getFingerprintForGroups(
      resultProvenance.value?.mode ?? mode.value,
      cards.value,
      choices.value
    )
  )

  const isCurrentSaved = computed(() => {
    const fingerprint = currentResultFingerprint.value
    return fingerprint ? savedFingerprints.value.has(fingerprint) : false
  })

  const isRecordSaved = (record: PullRecord) => {
    const fingerprint = getRecordFingerprint(record)
    return fingerprint ? savedFingerprints.value.has(fingerprint) : false
  }

  const isPairGroup = (group: ScryfallCard[]) => group.length === 2
  const getPairSlug = (group: ScryfallCard[]) =>
    getEdhrecPairIdentifier(group)

  const getPartnerSlugForGroup = (group: ScryfallCard[]) => getPairSlug(group)

  const getTagKeyForCard = (card: ScryfallCard, group: ScryfallCard[]) => {
    if (display.usePairTags && isPairGroup(group)) {
      return getPairSlug(group)
    }
    return getCardSlug(card)
  }

  const shouldRenderTagPanel = (card: ScryfallCard) =>
    shouldShowTags(card)

  const getTagsForCard = (card: ScryfallCard, group: ScryfallCard[]) =>
    getTagKeyForCard(card, group)
      ? tagLookup.value[getTagKeyForCard(card, group)!] ?? []
      : []

  const hasTagEntry = (card: ScryfallCard, group: ScryfallCard[]) => {
    const status = getMetadataStateForCard(card, group).status
    return status === 'success-data' || status === 'success-empty'
  }

  const getMetadataStateForCard = (
    card: ScryfallCard,
    group: ScryfallCard[]
  ): MetadataLoadState => {
    const key = getTagKeyForCard(card, group)
    return key
      ? metadataStateLookup.value[key] ?? { status: 'idle', error: '' }
      : {
          status: 'error',
          error: 'Metadata is unavailable because this card has no safe identifier.',
        }
  }

  const getDeckCountForCard = (card: ScryfallCard, group: ScryfallCard[]) => {
    const key = getTagKeyForCard(card, group)
    return key ? metaCache.get(key)?.deckCount ?? null : null
  }

  const getTagUrlForCard = (
    card: ScryfallCard,
    group: ScryfallCard[],
    tag: EdhrecTag
  ) => {
    if (!tag.slug || !usesCommanderLink(card)) return tag.href
    const key = getTagKeyForCard(card, group)
    return key
      ? `https://edhrec.com/commanders/${key}/${tag.slug}`
      : tag.href
  }

  const requireLegalPartnerPair = (
    first: ScryfallCard,
    second: ScryfallCard
  ): [ScryfallCard, ScryfallCard] => {
    if (!isLegalPartnerPair(first, second)) {
      throw new Error('Scryfall returned an incompatible commander pair.')
    }
    return [first, second]
  }

  const cancelWorkflow = (
    workflow: ActiveDrawWorkflow,
    reason: DrawWorkflowStopReason
  ) => {
    workflow.cancel(reason)
    workflow.finish()
    if (activeWorkflow === workflow) {
      activeWorkflow = null
      isLoading.value = false
    }
  }

  const beginWorkflow = () => {
    if (activeWorkflow) cancelWorkflow(activeWorkflow, 'superseded')
    const config = captureRequestConfig()
    errorMessage.value = ''
    if (config.colorFilter.problem) {
      errorMessage.value = config.colorFilter.problem.message
      isLoading.value = false
      return null
    }
    const workflow = createDrawWorkflowContext(
      createId(),
      config
    )
    activeWorkflow = workflow
    isLoading.value = true
    return workflow
  }

  const assertCurrentWorkflow = (workflow: ActiveDrawWorkflow) => {
    if (
      activeWorkflow !== workflow ||
      workflow.signal.aborted ||
      workflow.config.signature !== getCurrentRequestSignature()
    ) {
      if (!workflow.signal.aborted) workflow.cancel('configuration')
      throw new DOMException('The draw workflow was cancelled.', 'AbortError')
    }
  }

  const finishWorkflow = (workflow: ActiveDrawWorkflow) => {
    workflow.finish()
    if (activeWorkflow === workflow) {
      activeWorkflow = null
      isLoading.value = false
    }
  }

  const getWorkflowErrorMessage = (
    error: unknown,
    workflow: ActiveDrawWorkflow,
    fallback: string
  ) => {
    if (
      error instanceof DrawWorkflowTimeoutError ||
      workflow.stopReason === 'timeout'
    ) {
      return new DrawWorkflowTimeoutError(DRAW_WORKFLOW_DEADLINE_MS).message
    }
    if (
      error instanceof DrawWorkflowNoMatchError ||
      workflow.stopReason === 'budget'
    ) {
      return error instanceof DrawWorkflowNoMatchError
        ? error.message
        : new DrawWorkflowNoMatchError(workflow.callBudget).message
    }
    if (workflow.stopReason === 'user') return 'Draw cancelled.'
    if (
      workflow.stopReason === 'configuration' ||
      workflow.stopReason === 'superseded'
    ) {
      return null
    }
    if (error instanceof RequestTimeoutError) {
      return `An upstream request timed out. ${error.message}`
    }
    if (isScryfallRequestError(error)) {
      return `Scryfall upstream failure: ${error.message}`
    }
    if (error instanceof HttpError) {
      return `EDHREC upstream failure: ${error.message}`
    }
    if (error instanceof RuntimeDataError) {
      const service = error.source === 'edhrec' ? 'EDHREC' : 'Upstream'
      return `${service} data is unavailable: ${error.message}`
    }
    if (error instanceof Error && error.name === 'AbortError') {
      return 'Draw cancelled.'
    }
    return error instanceof Error ? error.message : fallback
  }

  const handleWorkflowError = (
    error: unknown,
    workflow: ActiveDrawWorkflow,
    fallback: string
  ) => {
    if (activeWorkflow !== workflow) return
    const message = getWorkflowErrorMessage(error, workflow, fallback)
    if (message !== null) errorMessage.value = message
  }

  const cancelActiveRequest = () => {
    if (!activeWorkflow) return false
    const workflow = activeWorkflow
    cancelWorkflow(workflow, 'user')
    errorMessage.value = 'Draw cancelled.'
    return true
  }

  const invalidateResultsForConfiguration = () => {
    if (activeWorkflow) cancelWorkflow(activeWorkflow, 'configuration')
    cards.value = []
    choices.value = []
    sparkPalette.value = null
    resultProvenance.value = null
    errorMessage.value = ''
  }

  const getEdhrecMeta = async (
    slug: string,
    signal: AbortSignal,
    workflow?: ActiveDrawWorkflow
  ) => {
    if (!slug) {
      throw new RuntimeDataError(
        'edhrec',
        'identifier',
        'this card has no EDHREC-compatible identifier'
      )
    }
    const cached = metaCache.get(slug)
    if (cached) return cached
    workflow?.consumeCalls()
    if (!AUTOMATED_EDHREC_METADATA_ENABLED) {
      throw new Error('Automated EDHREC metadata is disabled in this build.')
    }
    const { fetchCommanderMeta } = await import('../services/edhrec')
    const meta = await fetchCommanderMeta(
      slug,
      signal,
      workflow?.config.cacheOptions ?? cacheOptions.value
    )
    metaCache.set(slug, meta)
    return meta
  }

  const passesDeckLimit = async (
    card: ScryfallCard,
    workflow: ActiveDrawWorkflow
  ) => {
    const config = workflow.config
    if (!AUTOMATED_EDHREC_METADATA_ENABLED || !config.options.limitByDecks) {
      return true
    }
    if (isBackgroundCard(card)) return true
    if (
      !Number.isFinite(config.options.maxDecks) ||
      config.options.maxDecks <= 0
    ) {
      return true
    }
    if (config.options.useRankCutoff) return true
    if (config.mode === 'spark') return true
    const meta = await getEdhrecMeta(getCardSlug(card), workflow.signal, workflow)
    if (meta.deckCount === null) {
      throw new Error('EDHREC deck counts are unavailable for this commander.')
    }
    return meta.deckCount < config.options.maxDecks
  }

  const fetchCardMatchingFilters = async (
    workflow: ActiveDrawWorkflow,
    query: string,
    optionsOverrides?: {
      colorFilter?: CompiledColorFilter
      palette?: readonly string[] | null
      extraFilter?: (card: ScryfallCard) => boolean
      asyncFilter?: (
        card: ScryfallCard,
        workflow: ActiveDrawWorkflow
      ) => Promise<boolean>
      useRankedRandom?: boolean
    }
  ) => {
    const config = workflow.config
    const colorFilter = optionsOverrides?.colorFilter ?? config.colorFilter
    const palette = optionsOverrides?.palette
    const extraFilter = optionsOverrides?.extraFilter ?? (() => true)
    const asyncFilter = optionsOverrides?.asyncFilter ?? (async () => true)
    const useRankedRandom = optionsOverrides?.useRankedRandom ?? false
    const constrainedQuery = joinQuery(
      query,
      colorFilter.getScryfallClause(palette)
    )

    while (true) {
      workflow.consumeCalls(useRankedRandom ? 2 : 1)
      const card = useRankedRandom
        ? await fetchRankedRandomCard(constrainedQuery, workflow.signal)
        : await fetchRandomCard(constrainedQuery, workflow.signal)
      if (
        !colorFilter.matchesCandidate(card, palette) ||
        !extraFilter(card)
      ) {
        continue
      }
      if (await asyncFilter(card, workflow)) {
        return card
      }
    }
  }

  const fetchPartnerForCard = async (
    primary: ScryfallCard,
    workflow: ActiveDrawWorkflow
  ) => {
    const config = workflow.config
    const pairColorFilter = config.pairColorFilter
    const partnerKind = getPartnerKind(primary)
    if (!partnerKind) return null
    const variant = getPartnerVariant(primary)
    if (partnerKind === 'partner_with') {
      const partnerName = getPartnerWithName(primary)
      if (!partnerName) {
        throw new CandidateMismatchError(
          'Unable to find a named partner for this commander.'
        )
      }
      workflow.consumeCalls()
      const partner = await fetchCardByExactName(
        partnerName,
        workflow.signal,
        config.cacheOptions
      )
      if (!(await passesDeckLimit(partner, workflow))) {
        throw new CandidateMismatchError(
          'That named partner does not meet the active deck limit.'
        )
      }
      if (!isLegalPartnerPair(primary, partner)) {
        throw new CandidateMismatchError(
          'That card is not the named partner for this commander.'
        )
      }
      if (
        !pairColorFilter.matchesResult([primary, partner])
      ) {
        throw new CandidateMismatchError(
          `That partner pair does not match ${pairColorFilter.ui.summary}.`
        )
      }
      return partner
    }
    if (partnerKind === 'choose_background') {
      return fetchCardMatchingFilters(workflow, config.queries.background, {
        colorFilter: pairColorFilter,
        extraFilter: (card) =>
          isLegalPartnerPair(primary, card) &&
          pairColorFilter.matchesResult([primary, card]),
      })
    }
    if (partnerKind === 'friends_forever') {
      return fetchCardMatchingFilters(workflow, config.queries.friendsForever, {
        colorFilter: pairColorFilter,
        extraFilter: (card) =>
          isLegalPartnerPair(primary, card) &&
          pairColorFilter.matchesResult([primary, card]),
        asyncFilter: passesDeckLimit,
      })
    }
    if (partnerKind === 'doctors_companion') {
      return fetchCardMatchingFilters(workflow, config.queries.doctors, {
        colorFilter: pairColorFilter,
        extraFilter: (card) =>
          isLegalPartnerPair(primary, card) &&
          pairColorFilter.matchesResult([primary, card]),
        asyncFilter: passesDeckLimit,
      })
    }
    return fetchCardMatchingFilters(workflow, config.queries.genericPartner, {
      colorFilter: pairColorFilter,
      extraFilter: (card) =>
        isLegalPartnerPair(primary, card) &&
        getPartnerKind(card) === 'partner' &&
        getPartnerVariant(card) === variant &&
        pairColorFilter.matchesResult([primary, card]),
      asyncFilter: passesDeckLimit,
    })
  }

  const fetchCommanderForBackground = async (
    background: ScryfallCard,
    workflow: ActiveDrawWorkflow
  ) =>
    fetchCardMatchingFilters(
      workflow,
      workflow.config.queries.chooseBackgroundCommander,
      {
        colorFilter: workflow.config.pairColorFilter,
        extraFilter: (card) =>
          isLegalPartnerPair(card, background) &&
          getPartnerKind(card) === 'choose_background' &&
          workflow.config.pairColorFilter.matchesResult([card, background]),
        asyncFilter: passesDeckLimit,
        useRankedRandom: workflow.config.options.useRankCutoff,
      }
    )

  const fetchPartnerPair = async (workflow: ActiveDrawWorkflow) => {
    const config = workflow.config
    while (true) {
      const primary = await fetchCardMatchingFilters(workflow, config.queries.partnerPool, {
        extraFilter: (card) => getPartnerKind(card) !== null,
        colorFilter: config.pairColorFilter,
        asyncFilter: passesDeckLimit,
        useRankedRandom: config.options.useRankCutoff,
      })
      try {
        const partner = await fetchPartnerForCard(primary, workflow)
        if (
          partner &&
          isLegalPartnerPair(primary, partner) &&
          config.pairColorFilter.matchesResult([primary, partner])
        ) {
          return requireLegalPartnerPair(primary, partner)
        }
      } catch (error) {
        if (error instanceof CandidateMismatchError) continue
        throw error
      }
    }
  }

  const buildRecord = (
    cardsToRecord: ScryfallCard[],
    choiceRecords: CommanderChoice[] | undefined,
    provenance: ResultProvenance
  ): PullRecord =>
    snapshotRecord({
      id: createId(),
      createdAt: new Date().toISOString(),
      mode: provenance.mode,
      options: cloneRequestOptions(provenance.options),
      cards: cardsToRecord,
      choices: choiceRecords,
    })

  const createPersistedPayload = (): PersistedStateV2 => {
    const persistedPanel =
      activePanel.value === 'history' || activePanel.value === 'saved'
        ? activePanel.value
        : null
    return {
      version: PERSISTED_STATE_VERSION,
      view: persistedPanel ?? view.value,
      mode: mode.value,
      options: {
        ...options,
        limitByDecks: AUTOMATED_EDHREC_METADATA_ENABLED
          ? options.limitByDecks
          : false,
      },
      display: {
        ...display,
        showTags: AUTOMATED_EDHREC_METADATA_ENABLED
          ? display.showTags
          : false,
      },
      cache: { ...cacheSettings },
      performance: { ...performance },
      theme: theme.value,
      history: history.value,
      saved: saved.value,
    }
  }

  const persistCurrentState = () => {
    let result = writeStorage(STORAGE_KEY, createPersistedPayload())
    if (!result.ok && result.kind === 'quota') {
      clearCache()
      result = writeStorage(STORAGE_KEY, createPersistedPayload())
    }
    if (result.ok) {
      if (persistenceError.value) {
        persistenceNotice.value = 'Changes are saved to this browser again.'
      }
      persistenceError.value = ''
      return true
    }
    persistenceNotice.value = ''
    persistenceError.value = persistenceFailureMessage(result.kind)
    return false
  }

  const retryPersistence = () =>
    pendingDurabilityAction
      ? pendingDurabilityAction()
      : persistCurrentState()
  const dismissPersistenceNotice = () => {
    persistenceNotice.value = ''
  }

  const addHistory = (record: PullRecord) => {
    history.value = [snapshotRecord(record), ...history.value].slice(0, MAX_HISTORY)
  }

  const saveRecord = (
    record: PullRecord,
    saveOptions: SaveRecordOptions = {}
  ) => {
    const snapshot = snapshotRecord(record)
    const fingerprint = getRecordFingerprint(snapshot)
    if (!fingerprint) return false
    const exists = saved.value.some(
      (item) => getRecordFingerprint(item) === fingerprint
    )
    if (exists) return false
    if (saved.value.length >= MAX_SAVED && !saveOptions.replaceOldest) {
      return false
    }
    const previousSaved = saved.value
    saved.value = saveOptions.replaceOldest
      ? [snapshot, ...saved.value].slice(0, MAX_SAVED)
      : [snapshot, ...saved.value]
    if (!persistCurrentState()) {
      saved.value = previousSaved
      return false
    }
    return true
  }

  const saveCurrent = (saveOptions: SaveRecordOptions = {}) => {
    if (!hasResults.value || isCurrentSaved.value) return false
    const provenance =
      resultProvenance.value ?? provenanceFromConfig(captureRequestConfig())
    const record = buildRecord(cards.value, choices.value, provenance)
    return saveRecord(record, saveOptions)
  }

  const loadRecord = (record: PullRecord) => {
    const snapshot = snapshotRecord(record)
    if (activeWorkflow) cancelWorkflow(activeWorkflow, 'superseded')
    suppressQueryInvalidation = true
    try {
      mode.value = snapshot.mode
      Object.assign(options, {
        ...snapshot.options,
        limitByDecks: AUTOMATED_EDHREC_METADATA_ENABLED
          ? snapshot.options.limitByDecks
          : false,
      })
      cards.value = snapshot.cards ?? []
      choices.value = snapshot.choices ?? []
      sparkPalette.value = null
      resultProvenance.value = Object.freeze({
        mode: snapshot.mode,
        options: Object.freeze({
          ...snapshot.options,
          selectedColors: Object.freeze([
            ...snapshot.options.selectedColors,
          ]),
        }),
      })
      errorMessage.value = ''
      isLoading.value = false
    } finally {
      suppressQueryInvalidation = false
    }
    view.value = 'draw'
    activePanel.value = null
  }

  const removeSaved = (id: string) => {
    const nextSaved = saved.value.filter((record) => record.id !== id)
    if (nextSaved.length === saved.value.length) return false
    const previousSaved = saved.value
    saved.value = nextSaved
    if (!persistCurrentState()) {
      saved.value = previousSaved
      return false
    }
    return true
  }

  const clearHistory = () => {
    if (history.value.length === 0) return false
    const previousHistory = history.value
    history.value = []
    if (!persistCurrentState()) {
      history.value = previousHistory
      return false
    }
    return true
  }

  const clearSaved = () => {
    if (saved.value.length === 0) return false
    const previousSaved = saved.value
    saved.value = []
    if (!persistCurrentState()) {
      saved.value = previousSaved
      return false
    }
    return true
  }

  const resetOptions = () => {
    Object.assign(options, defaultOptions)
  }

  const commitWorkflowResult = (
    workflow: ActiveDrawWorkflow,
    result: {
      cards: ScryfallCard[]
      choices?: CommanderChoice[]
      sparkPalette?: string[] | null
    }
  ) => {
    assertCurrentWorkflow(workflow)
    const provenance = provenanceFromConfig(workflow.config)
    resultProvenance.value = provenance
    cards.value = result.choices ? [] : result.cards
    choices.value = result.choices ?? []
    sparkPalette.value = result.sparkPalette ?? null
    addHistory(buildRecord(result.cards, result.choices, provenance))
  }

  const randomize = async () => {
    const workflow = beginWorkflow()
    if (!workflow) return
    const config = workflow.config
    const nextCards: ScryfallCard[] = []
    try {
      if (config.isChoiceMode) {
        const nextChoices: CommanderChoice[] = []
        const seenIds = new Set<string>()
        for (let i = 0; i < 2; i += 1) {
          if (config.mode === 'partner') {
            let pair: [ScryfallCard, ScryfallCard]
            do {
              pair = await fetchPartnerPair(workflow)
            } while (pair.some((card) => seenIds.has(card.id)))
            pair.forEach((card) => seenIds.add(card.id))
            nextChoices.push({ id: createId(), cards: pair })
          } else {
            let card: ScryfallCard
            do {
              card = await fetchCardMatchingFilters(
                workflow,
                config.queries.commander,
                {
                  asyncFilter: passesDeckLimit,
                  useRankedRandom: config.options.useRankCutoff,
                }
              )
            } while (seenIds.has(card.id))
            seenIds.add(card.id)
            nextChoices.push({ id: createId(), cards: [card] })
          }
        }
        commitWorkflowResult(workflow, { cards: [], choices: nextChoices })
      } else if (config.mode === 'partner') {
        const pair = await fetchPartnerPair(workflow)
        nextCards.push(...pair)
        commitWorkflowResult(workflow, { cards: nextCards })
      } else if (config.mode === 'commander') {
        const card = await fetchCardMatchingFilters(
          workflow,
          config.queries.commander,
          {
            asyncFilter: passesDeckLimit,
            useRankedRandom: config.options.useRankCutoff,
          }
        )
        nextCards.push(card)
        commitWorkflowResult(workflow, { cards: nextCards })
      } else {
        const nextSparkPalette = config.colorFilter.pickSparkPalette()
        const seenIds = new Set<string>()
        do {
          nextCards.length = 0
          seenIds.clear()
          for (let i = 0; i < config.drawCount; i += 1) {
            let card: ScryfallCard
            do {
              card = await fetchCardMatchingFilters(
                workflow,
                config.queries.spark,
                {
                  palette: nextSparkPalette,
                }
              )
            } while (seenIds.has(card.id))
            seenIds.add(card.id)
            nextCards.push(card)
          }
        } while (
          !config.colorFilter.matchesResult(nextCards, nextSparkPalette)
        )
        commitWorkflowResult(workflow, {
          cards: nextCards,
          sparkPalette: nextSparkPalette ? [...nextSparkPalette] : null,
        })
      }
      await nextTick()
    } catch (error) {
      handleWorkflowError(
        error,
        workflow,
        'Unable to fetch a random card.'
      )
    } finally {
      finishWorkflow(workflow)
    }
  }

  const randomizePartnerForPrimary = async () => {
    const primary = primaryCard.value
    if (!primary) return
    const workflow = beginWorkflow()
    if (!workflow) return
    try {
      const partner = await fetchPartnerForCard(primary, workflow)
      if (!partner) {
        throw new Error("This commander doesn't have a compatible partner.")
      }
      assertCurrentWorkflow(workflow)
      const provenance = provenanceFromConfig(workflow.config)
      cards.value = requireLegalPartnerPair(primary, partner)
      choices.value = []
      sparkPalette.value = null
      resultProvenance.value = provenance
      addHistory(buildRecord(cards.value, undefined, provenance))
    } catch (error) {
      handleWorkflowError(error, workflow, 'Unable to fetch a partner.')
    } finally {
      finishWorkflow(workflow)
    }
  }

  const randomizePartnerForChoice = async (index: number) => {
    const choice = choices.value[index]
    const primary = choice?.cards[0]
    if (!primary) return
    const workflow = beginWorkflow()
    if (!workflow) return
    try {
      const primaryIsBackground = isBackgroundCard(primary)
      const companion = primaryIsBackground
        ? await fetchCommanderForBackground(primary, workflow)
        : await fetchPartnerForCard(primary, workflow)
      if (!companion) {
        throw new Error(
          primaryIsBackground
            ? "This Background doesn't have a compatible commander."
            : "This commander doesn't have a compatible partner."
        )
      }
      assertCurrentWorkflow(workflow)
      const currentChoice = choices.value[index]
      if (!currentChoice || currentChoice.id !== choice.id) {
        throw new DOMException('The draw workflow was cancelled.', 'AbortError')
      }
      choices.value[index] = {
        ...currentChoice,
        cards: primaryIsBackground
          ? requireLegalPartnerPair(companion, primary)
          : requireLegalPartnerPair(primary, companion),
      }
      const provenance = provenanceFromConfig(workflow.config)
      resultProvenance.value = provenance
      addHistory(buildRecord([], choices.value, provenance))
    } catch (error) {
      handleWorkflowError(error, workflow, 'Unable to fetch a partner.')
    } finally {
      finishWorkflow(workflow)
    }
  }

  const randomizeCommanderForBackground = async () => {
    const background = primaryCard.value
    if (!isBackgroundCard(background)) return
    const workflow = beginWorkflow()
    if (!workflow) return
    try {
      const commander = await fetchCommanderForBackground(background, workflow)
      assertCurrentWorkflow(workflow)
      const provenance = provenanceFromConfig(workflow.config)
      cards.value = requireLegalPartnerPair(commander, background)
      choices.value = []
      sparkPalette.value = null
      resultProvenance.value = provenance
      addHistory(buildRecord(cards.value, undefined, provenance))
    } catch (error) {
      handleWorkflowError(error, workflow, 'Unable to fetch a commander.')
    } finally {
      finishWorkflow(workflow)
    }
  }

  const getMetadataTargetsForGroups = (groups: ScryfallCard[][]) => {
    const targets = new Map<string, string[]>()
    groups.forEach((group) => {
      if (!group.length) return
      if (display.usePairTags && isPairGroup(group)) {
        if (group.some((card) => usesCommanderLink(card))) {
          const pairSlug = getPairSlug(group)
          if (!pairSlug) return
          const alphabeticalSlug = group
            .map((card) => getCardSlug(card))
            .slice()
            .sort((a, b) => a.localeCompare(b))
            .join('-')
          const candidates =
            alphabeticalSlug === pairSlug
              ? [pairSlug]
              : [pairSlug, alphabeticalSlug]
          targets.set(pairSlug, candidates)
        }
        return
      }
      group.forEach((card) => {
        if (!shouldShowTags(card)) return
        const slug = getCardSlug(card)
        if (!slug) return
        targets.set(slug, [slug])
      })
    })
    return targets
  }

  const metadataFailureMessage = (error: unknown) => {
    if (error instanceof RequestTimeoutError) {
      return 'EDHREC metadata timed out. Try again.'
    }
    if (error instanceof HttpError) {
      return `EDHREC metadata could not load (${error.status}). Try again.`
    }
    if (error instanceof RuntimeDataError) {
      return `EDHREC metadata could not be used. ${error.message}`
    }
    return 'EDHREC metadata could not load. Try again.'
  }

  const abortMetadataRequests = () => {
    tagRequestId.value += 1
    tagController.value?.abort()
    tagController.value = null
  }

  const clearMetadataMemory = () => {
    abortMetadataRequests()
    tagLookup.value = {}
    metadataStateLookup.value = {}
    metaCache.clear()
  }

  const loadTagsForGroups = async (
    groups: ScryfallCard[][],
    forceKeys: ReadonlySet<string> = new Set()
  ) => {
    if (
      !AUTOMATED_EDHREC_METADATA_ENABLED ||
      !display.showTags ||
      mode.value === 'spark' ||
      !metadataSurfaceVisible.value
    ) {
      return
    }
    const targets = getMetadataTargetsForGroups(groups)
    if (targets.size === 0) return

    const missing = Array.from(targets.keys()).filter(
      (key) => {
        if (forceKeys.has(key)) return true
        const state = metadataStateLookup.value[key]?.status ?? 'idle'
        return state === 'idle'
      }
    )
    if (missing.length === 0) return

    const requestId = tagRequestId.value + 1
    tagRequestId.value = requestId
    const current = new AbortController()
    tagController.value?.abort()
    tagController.value = current
    metadataStateLookup.value = {
      ...metadataStateLookup.value,
      ...Object.fromEntries(
        missing.map((key) => [key, { status: 'loading', error: '' }])
      ),
    }

    await Promise.all(
      missing.map(async (slug) => {
        try {
          const candidates = targets.get(slug) ?? [slug]
          let meta: EdhrecMeta | null = null
          let lastError: unknown = null
          for (const candidate of candidates) {
            try {
              meta = await getEdhrecMeta(candidate, current.signal)
              break
            } catch (error) {
              if (error instanceof Error && error.name === 'AbortError') {
                throw error
              }
              lastError = error
            }
          }
          if (!meta) {
            throw lastError ?? new Error('No metadata response was available.')
          }
          if (tagRequestId.value !== requestId) return
          tagLookup.value = { ...tagLookup.value, [slug]: meta.tags }
          metadataStateLookup.value = {
            ...metadataStateLookup.value,
            [slug]: {
              status: meta.tags.length > 0 ? 'success-data' : 'success-empty',
              error: '',
            },
          }
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            return
          }
          if (tagRequestId.value !== requestId) return
          const nextTags = { ...tagLookup.value }
          delete nextTags[slug]
          tagLookup.value = nextTags
          metadataStateLookup.value = {
            ...metadataStateLookup.value,
            [slug]: {
              status: 'error',
              error: metadataFailureMessage(error),
            },
          }
        }
      })
    )
    if (tagRequestId.value === requestId) {
      tagController.value = null
    }
  }

  const retryMetadataForCard = (
    card: ScryfallCard,
    group: ScryfallCard[]
  ) => {
    if (!AUTOMATED_EDHREC_METADATA_ENABLED) return false
    const key = getTagKeyForCard(card, group)
    if (!key) return false
    const targets = getMetadataTargetsForGroups([group])
    const candidates = targets.get(key)
    if (!candidates) return false

    const nextTags = { ...tagLookup.value }
    delete nextTags[key]
    tagLookup.value = nextTags
    candidates.forEach((candidate) => metaCache.delete(candidate))
    metadataStateLookup.value = {
      ...metadataStateLookup.value,
      [key]: { status: 'idle', error: '' },
    }
    void loadTagsForGroups([group], new Set([key]))
    return true
  }

  const openPanel = (panel: ActivePanelKey) => {
    view.value = 'draw'
    activePanel.value = panel
  }

  const closePanel = () => {
    activePanel.value = null
  }

  const openHistoryPanel = () => {
    openPanel('history')
  }

  const openSavedPanel = () => {
    openPanel('saved')
  }

  const openOptions = () => {
    openPanel('filters')
  }

  const openSettingsPanel = () => {
    openPanel('settings')
  }

  const closeOptions = () => {
    if (activePanel.value === 'filters') {
      activePanel.value = null
    }
  }

  const clearNetworkCache = () => {
    const result = removeCache()
    if (result.ok) {
      clearMetadataMemory()
      if (pendingDurabilityAction === clearNetworkCache) {
        pendingDurabilityAction = null
        persistenceError.value = ''
      }
      persistenceNotice.value = 'Cached responses and loaded metadata were cleared.'
      return true
    }
    pendingDurabilityAction = clearNetworkCache
    persistenceNotice.value = ''
    persistenceError.value =
      `Browser storage could not clear the persistent response cache. ${persistenceFailureMessage(result.kind)}`
    return false
  }

  const applyClearedLocalState = () => {
    if (activeWorkflow) cancelWorkflow(activeWorkflow, 'user')
    suppressQueryInvalidation = true
    try {
      view.value = 'draw'
      mode.value = 'commander'
      Object.assign(options, {
        ...DEFAULT_OPTIONS,
        selectedColors: [],
        limitByDecks: false,
      })
      Object.assign(display, {
        ...DEFAULT_DISPLAY,
        showTags: AUTOMATED_EDHREC_METADATA_ENABLED
          ? DEFAULT_DISPLAY.showTags
          : false,
      })
      Object.assign(cacheSettings, DEFAULT_CACHE)
      Object.assign(performance, DEFAULT_PERFORMANCE)
      theme.value = 'system'
      history.value = []
      saved.value = []
      cards.value = []
      choices.value = []
      sparkPalette.value = null
      resultProvenance.value = null
      metadataSurfaceVisible.value = false
      errorMessage.value = ''
      isLoading.value = false
    } finally {
      suppressQueryInvalidation = false
    }
  }

  const clearAllLocalData = () => {
    const cacheResult = removeCache()
    if (!cacheResult.ok) {
      pendingDurabilityAction = clearAllLocalData
      persistenceNotice.value = ''
      persistenceError.value =
        `Local data was left unchanged because the response cache could not be cleared. ${persistenceFailureMessage(cacheResult.kind)}`
      return false
    }

    const stateResult = removeStorage(STORAGE_KEY)
    if (!stateResult.ok) {
      pendingDurabilityAction = clearAllLocalData
      persistenceNotice.value = ''
      persistenceError.value =
        `Cached responses were cleared, but settings, History, and Saved pulls remain because browser storage could not clear them. ${persistenceFailureMessage(stateResult.kind)}`
      return false
    }

    pendingDurabilityAction = null
    clearMetadataMemory()
    suppressPersistenceWatch = true
    applyClearedLocalState()
    queueMicrotask(() => {
      suppressPersistenceWatch = false
    })
    persistenceError.value = ''
    persistenceNotice.value =
      'All local Randomander data was cleared from this browser.'
    return true
  }

  const applyPerformancePreset = (preset: 'standard' | 'low-power') => {
    const useLowPower = preset === 'low-power'
    performance.reduceMotion = useLowPower
    performance.simplifyBackdrop = useLowPower
    performance.reduceTransparency = useLowPower

    if (useLowPower) {
      display.showAmbient = false
    }
  }

  const setMetadataSurfaceVisible = (visible: boolean) => {
    metadataSurfaceVisible.value = visible
  }

  watch(
    [
      () => mode.value,
      () => options.colorCount,
      () => options.colorCountMode,
      () => options.excludeGameChangers,
      () => options.selectedColors,
      () => options.limitByDecks,
      () => options.maxDecks,
      () => options.twoChoices,
      () => options.useRankCutoff,
    ],
    () => {
      if (!suppressQueryInvalidation) invalidateResultsForConfiguration()
    },
    { deep: true, flush: 'sync' }
  )

  watch(
    [() => mode.value, () => options.colorCount],
    () => {
      if (mode.value !== 'spark') {
        options.excludeGameChangers = false
      }
      sparkPalette.value = null
      if (mode.value === 'spark') {
        options.twoChoices = false
        choices.value = []
        options.limitByDecks = false
        options.useRankCutoff = false
      }
    },
    { flush: 'sync' }
  )

  watch(
    () => options.selectedColors,
    () => {
      sparkPalette.value = null
    },
    { deep: true, flush: 'sync' }
  )

  watch(
    () => options.useRankCutoff,
    (value) => {
      if (value) {
        options.limitByDecks = false
      }
    },
    { flush: 'sync' }
  )

  watch(
    () => options.twoChoices,
    (value) => {
      if (value) {
        cards.value = []
      } else {
        choices.value = []
      }
    },
    { flush: 'sync' }
  )

  watch(
    [
      cards,
      choices,
      mode,
      metadataSurfaceVisible,
      () => display.showTags,
      () => display.usePairTags,
    ],
    () => {
      if (!display.showTags || mode.value === 'spark' || !metadataSurfaceVisible.value) {
        return
      }
      const groups = getGroupsForState(cards.value, isChoiceMode.value ? choices.value : undefined)
      if (groups.length === 0) return
      loadTagsForGroups(groups)
    },
    { deep: true }
  )

  let isInitialPersistenceWatch = true
  watch(
    [view, activePanel, mode, options, display, cacheSettings, performance, theme, history, saved],
    () => {
      if (suppressPersistenceWatch) return
      if (isInitialPersistenceWatch) {
        isInitialPersistenceWatch = false
        if (!shouldPersistDecodedState) return
      }
      persistCurrentState()
    },
    { deep: true, immediate: true }
  )

  const getColorOptionLabel = (option: { value: ColorCount; label: string }) => {
    if (option.value === 'any') return 'Any colors'
    return formatColorCountLabel(option.value, options.colorCountMode)
  }

  return {
    view,
    activePanel,
    mode,
    options,
    display,
    cacheSettings,
    performance,
    theme,
    history,
    saved,
    cards,
    choices,
    sparkPalette,
    isLoading,
    errorMessage,
    persistenceError,
    persistenceNotice,
    metadataStateLookup,
    isOptionsOpen,
    isCurrentSaved,
    drawCount,
    primaryCard,
    primaryPartnerKind,
    canRandomizePartner,
    isChoiceMode,
    hasResults,
    colorCountNumber,
    selectedColorSet,
    allowedColors,
    colorFilterLabel,
    colorFilterProblem,
    colorComparisonDescription,
    sparkPaletteLabel,
    modeLabel,
    stageTitle,
    summaryChips,
    colorLabel,
    choiceLabel,
    statusText,
    isFirstLoad,
    partnerButtonLabel,
    commanderQuery,
    sparkQuery,
    partnerPoolQuery,
    genericPartnerQuery,
    friendsForeverQuery,
    doctorsQuery,
    backgroundQuery,
    usesCommanderLink,
    shouldShowTags,
    shouldRenderTagPanel,
    getTagsForCard,
    hasTagEntry,
    getMetadataStateForCard,
    getDeckCountForCard,
    getTagUrlForCard,
    getPartnerButtonLabel,
    getColorOptionLabel,
    getRecordFingerprint,
    isRecordSaved,
    randomize,
    cancelActiveRequest,
    randomizePartnerForPrimary,
    randomizePartnerForChoice,
    addHistory,
    saveRecord,
    saveCurrent,
    loadRecord,
    removeSaved,
    clearHistory,
    clearSaved,
    resetOptions,
    openHistoryPanel,
    openSavedPanel,
    openOptions,
    openSettingsPanel,
    closeOptions,
    closePanel,
    clearNetworkCache,
    clearAllLocalData,
    retryPersistence,
    dismissPersistenceNotice,
    applyPerformancePreset,
    setMetadataSurfaceVisible,
    retryMetadataForCard,
    formatColorIdentity,
    getTypeLine,
    getTagKeyForCard,
    getPartnerSlugForGroup,
    randomizeCommanderForBackground,
  }
})
