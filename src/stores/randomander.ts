import { defineStore } from 'pinia'
import { computed, nextTick, reactive, ref, watch } from 'vue'
import {
  formatColorIdentity,
  getPartnerKind,
  getPartnerWithName,
  getTypeLine,
  slugify,
  type PartnerKind,
  type ScryfallCard,
} from '../lib/scryfall'
import {
  fetchCardByExactName,
  fetchRandomCard,
  fetchRankedRandomCard,
} from '../services/scryfall'
import { fetchCommanderMeta, type EdhrecTag, type EdhrecMeta } from '../services/edhrec'
import { readStorage, writeStorage } from '../lib/storage'
import { clearCache } from '../lib/cache'
import type { CacheOptions } from '../services/http'

export type Mode = 'commander' | 'spark' | 'partner'
export type ViewKey = 'draw' | 'history' | 'saved' | 'settings'
export type ThemeMode = 'light' | 'dark' | 'system'

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
}

export type CacheSettings = {
  enabled: boolean
  ttlHours: number
  maxEntries: number
}

export type PullRecord = {
  id: string
  createdAt: string
  mode: Mode
  options: OptionsState
  cards: ScryfallCard[]
  choices?: CommanderChoice[]
}

type PersistedState = {
  view: ViewKey
  mode: Mode
  options: OptionsState
  display: DisplaySettings
  cache: CacheSettings
  theme: ThemeMode
  history: PullRecord[]
  saved: PullRecord[]
}

const STORAGE_KEY = 'randomander:state:v2'
const MAX_HISTORY = 40
const MAX_SAVED = 40
const MAX_ATTEMPTS = 24

export const modes = [
  {
    id: 'commander',
    label: 'Commander',
    description: 'One commander-legal legend.',
  },
  {
    id: 'partner',
    label: 'Partner pair',
    description: 'Two cards that can partner together.',
  },
  {
    id: 'spark',
    label: '3-card spark',
    description: 'Three random Commander-legal cards.',
  },
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

const COLOR_SYMBOLS = ['W', 'U', 'B', 'R', 'G'] as const
export const COLOR_CHOICES = [
  {
    symbol: 'C',
    name: 'Colorless',
    icon: 'ms-c',
    chip:
      'border-slate-200 text-slate-700 bg-white dark:border-slate-700/70 dark:bg-slate-900 dark:text-slate-200',
  },
  {
    symbol: 'W',
    name: 'White',
    icon: 'ms-w',
    chip:
      'border-amber-200 text-amber-800 bg-amber-50 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-100',
  },
  {
    symbol: 'U',
    name: 'Blue',
    icon: 'ms-u',
    chip:
      'border-sky-200 text-sky-800 bg-sky-50 dark:border-sky-400/40 dark:bg-sky-400/10 dark:text-sky-100',
  },
  {
    symbol: 'B',
    name: 'Black',
    icon: 'ms-b',
    chip:
      'border-slate-300 text-slate-800 bg-slate-100 dark:border-slate-600/70 dark:bg-slate-800 dark:text-slate-100',
  },
  {
    symbol: 'R',
    name: 'Red',
    icon: 'ms-r',
    chip:
      'border-rose-200 text-rose-800 bg-rose-50 dark:border-rose-400/40 dark:bg-rose-400/10 dark:text-rose-100',
  },
  {
    symbol: 'G',
    name: 'Green',
    icon: 'ms-g',
    chip:
      'border-emerald-200 text-emerald-800 bg-emerald-50 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-100',
  },
] as const

const defaultOptions: OptionsState = {
  colorCount: 'any',
  selectedColors: [],
  limitByDecks: false,
  maxDecks: 1000,
  twoChoices: false,
  excludeGameChangers: false,
  useRankCutoff: false,
}

const defaultDisplay: DisplaySettings = {
  showHeader: true,
  showStatus: true,
  showChips: true,
  showCardTitles: true,
  showColorIdentity: true,
  showLinks: true,
  showTags: true,
  usePairTags: true,
  showAmbient: true,
}

const defaultCache: CacheSettings = {
  enabled: true,
  ttlHours: 24,
  maxEntries: 120,
}

const createId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`

export const useRandomanderStore = defineStore('randomander', () => {
  const persisted = readStorage<Partial<PersistedState>>(STORAGE_KEY, {})

  const view = ref<ViewKey>(persisted.view ?? 'draw')
  const mode = ref<Mode>(persisted.mode ?? 'commander')
  const options = reactive<OptionsState>({
    ...defaultOptions,
    ...(persisted.options ?? {}),
  })
  const display = reactive<DisplaySettings>({
    ...defaultDisplay,
    ...(persisted.display ?? {}),
  })
  const cacheSettings = reactive<CacheSettings>({
    ...defaultCache,
    ...(persisted.cache ?? {}),
  })
  const theme = ref<ThemeMode>(persisted.theme ?? 'system')
  const history = ref<PullRecord[]>(persisted.history ?? [])
  const saved = ref<PullRecord[]>(persisted.saved ?? [])

  const cards = ref<ScryfallCard[]>([])
  const choices = ref<CommanderChoice[]>([])
  const sparkPalette = ref<string[] | null>(null)
  const isLoading = ref(false)
  const errorMessage = ref('')
  const isOptionsOpen = ref(false)

  const controller = ref<AbortController | null>(null)
  const tagController = ref<AbortController | null>(null)
  const tagLookup = ref<Record<string, EdhrecTag[]>>({})
  const tagRequestId = ref(0)
  const metaCache = new Map<string, EdhrecMeta>()

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
    () => mode.value === 'commander' && primaryPartnerKind.value !== null
  )

  const isChoiceMode = computed(
    () => options.twoChoices && mode.value !== 'spark'
  )
  const hasResults = computed(() =>
    isChoiceMode.value ? choices.value.length > 0 : cards.value.length > 0
  )

  const colorCountNumber = computed(() =>
    options.colorCount === 'any' ? null : Number(options.colorCount)
  )
  const selectedColorSet = computed(
    () => new Set(options.selectedColors.map((color) => color.toUpperCase()))
  )
  const allowedColors = computed(() =>
    options.selectedColors.length > 0
      ? options.selectedColors
          .map((color) => color.toUpperCase())
          .filter((color) => color !== 'C')
      : [...COLOR_SYMBOLS]
  )

  const colorFilterLabel = computed(() => {
    const selection =
      options.selectedColors.length > 0
        ? `within ${formatColorIdentity(options.selectedColors)}`
        : ''
    if (options.colorCount === 'any') {
      return selection ? `any colors ${selection}` : 'any colors'
    }
    const count = Number(options.colorCount)
    if (mode.value === 'commander') {
      const base =
        colorOptions.find((option) => option.value === options.colorCount)
          ?.label ?? 'Any colors'
      return selection ? `${base} ${selection}` : base
    }
    if (count === 0) return 'colorless only'
    const base = `up to ${count} color${count === 1 ? '' : 's'}`
    return selection ? `${base} ${selection}` : base
  })

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

  const colorLabel = computed(() =>
    mode.value === 'commander' ? 'Color identity' : 'Max color identity'
  )

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

  const colorIdentityQuery = computed(() => {
    if (options.selectedColors.length === 0) return ''
    const colors = options.selectedColors
      .map((color) => color.toUpperCase())
      .filter((color) => color !== 'C')
    const hasColorless = options.selectedColors.some(
      (color) => color.toUpperCase() === 'C'
    )
    if (colors.length === 0 && hasColorless) return 'ci:c'
    if (colors.length === 0) return ''
    const colorString = colors.join('').toLowerCase()
    const base = `ci<=${colorString}`
    return hasColorless ? `(${base} or ci:c)` : base
  })

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
    joinQuery('is:commander legal:commander type:doctor', colorIdentityQuery.value)
  )
  const backgroundQuery = computed(() =>
    joinQuery('type:background legal:commander', colorIdentityQuery.value)
  )

  const usesCommanderLink = (card: ScryfallCard) => {
    if (mode.value === 'spark') return false
    const typeLine = getTypeLine(card).toLowerCase()
    if (typeLine.includes('background')) return false
    return true
  }

  const shouldShowTags = (card: ScryfallCard) =>
    display.showTags && usesCommanderLink(card)

  const isPairGroup = (group: ScryfallCard[]) => group.length === 2
  const getPairSlug = (group: ScryfallCard[]) =>
    group
      .map((card) => slugify(card.name))
      .sort()
      .join('-')

  const getTagKeyForCard = (card: ScryfallCard, group: ScryfallCard[]) => {
    if (display.usePairTags && isPairGroup(group)) {
      return getPairSlug(group)
    }
    return slugify(card.name)
  }

  const shouldRenderTagPanel = (card: ScryfallCard) =>
    shouldShowTags(card)

  const getTagsForCard = (card: ScryfallCard, group: ScryfallCard[]) =>
    tagLookup.value[getTagKeyForCard(card, group)] ?? []

  const hasTagEntry = (card: ScryfallCard, group: ScryfallCard[]) =>
    Object.prototype.hasOwnProperty.call(
      tagLookup.value,
      getTagKeyForCard(card, group)
    )

  const matchesColorCount = (card: ScryfallCard) => {
    const expected = colorCountNumber.value
    if (expected === null) return true
    const actual = card.color_identity?.length ?? 0
    return actual === expected
  }

  const matchesSelectedColors = (card: ScryfallCard) => {
    if (options.selectedColors.length === 0) return true
    const colors = card.color_identity ?? []
    if (colorCountNumber.value === 0) {
      return colors.length === 0
    }
    const allowsColorless = selectedColorSet.value.has('C')
    if (colors.length === 0) return allowsColorless
    if (selectedColorSet.value.size === 1 && allowsColorless) return false
    return colors.every((color) => selectedColorSet.value.has(color))
  }

  const getCombinedColors = (cardsToCheck: ScryfallCard[]) => {
    const combined = new Set<string>()
    cardsToCheck.forEach((card) => {
      ;(card.color_identity ?? []).forEach((color) => combined.add(color))
    })
    return Array.from(combined)
  }

  const isWithinMaxColors = (
    cardsToCheck: ScryfallCard[],
    maxColors: number | null
  ) => {
    if (maxColors === null) return true
    return getCombinedColors(cardsToCheck).length <= maxColors
  }

  const isWithinSelectedColors = (cardsToCheck: ScryfallCard[]) => {
    if (options.selectedColors.length === 0) return true
    const combined = getCombinedColors(cardsToCheck)
    if (colorCountNumber.value === 0) {
      return combined.length === 0
    }
    const allowsColorless = selectedColorSet.value.has('C')
    if (combined.length === 0) return allowsColorless
    if (selectedColorSet.value.size === 1 && allowsColorless) return false
    return combined.every((color) => selectedColorSet.value.has(color))
  }

  const pickRandomPalette = (maxColors: number, pool: string[]) => {
    const available = [...pool]
    const cappedMax = Math.max(0, Math.min(maxColors, available.length))
    const target = cappedMax === 0 ? 0 : Math.floor(Math.random() * (cappedMax + 1))
    const picked: string[] = []
    for (let i = 0; i < target; i += 1) {
      const index = Math.floor(Math.random() * available.length)
      picked.push(available.splice(index, 1)[0]!)
    }
    return picked
  }

  const isCardWithinPalette = (card: ScryfallCard, palette: string[]) => {
    const colors = card.color_identity ?? []
    return colors.every((color) => palette.includes(color))
  }

  const getEdhrecMeta = async (slug: string, signal: AbortSignal) => {
    const cached = metaCache.get(slug)
    if (cached) return cached
    const meta = await fetchCommanderMeta(slug, signal, cacheOptions.value)
    metaCache.set(slug, meta)
    return meta
  }

  const passesDeckLimit = async (card: ScryfallCard, signal: AbortSignal) => {
    if (!options.limitByDecks) return true
    if (!Number.isFinite(options.maxDecks) || options.maxDecks <= 0) return true
    if (options.useRankCutoff) return true
    if (mode.value === 'spark') return true
    const meta = await getEdhrecMeta(slugify(card.name), signal)
    if (meta.deckCount === null) {
      throw new Error('EDHREC deck counts are unavailable for this commander.')
    }
    return meta.deckCount < options.maxDecks
  }

  const fetchCardMatchingFilters = async (
    signal: AbortSignal,
    query: string,
    optionsOverrides?: {
      applyColorFilter?: boolean
      extraFilter?: (card: ScryfallCard) => boolean
      errorLabel?: string
      asyncFilter?: (card: ScryfallCard, signal: AbortSignal) => Promise<boolean>
      useRankedRandom?: boolean
    }
  ) => {
    const applyColorFilter = optionsOverrides?.applyColorFilter ?? true
    const extraFilter = optionsOverrides?.extraFilter ?? (() => true)
    const errorLabel = optionsOverrides?.errorLabel ?? colorFilterLabel.value
    const asyncFilter = optionsOverrides?.asyncFilter ?? (async () => true)
    const useRankedRandom = optionsOverrides?.useRankedRandom ?? false

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const card = useRankedRandom
        ? await fetchRankedRandomCard(query, signal)
        : await fetchRandomCard(query, signal)
      const asyncOk = await asyncFilter(card, signal)
      if (asyncOk && (!applyColorFilter || matchesColorCount(card)) && extraFilter(card)) {
        return card
      }
    }
    throw new Error(`No cards matched ${errorLabel}. Try another option.`)
  }

  const fetchPartnerForCard = async (
    primary: ScryfallCard,
    signal: AbortSignal,
    maxColors: number | null
  ) => {
    const partnerKind = getPartnerKind(primary)
    if (!partnerKind) return null
    if (partnerKind === 'partner_with') {
      const partnerName = getPartnerWithName(primary)
      if (!partnerName) {
        throw new Error('Unable to find a named partner for this commander.')
      }
      const partner = await fetchCardByExactName(partnerName, signal, cacheOptions.value)
      await passesDeckLimit(partner, signal)
      if (!isWithinMaxColors([primary, partner], maxColors) || !isWithinSelectedColors([primary, partner])) {
        throw new Error(`That partner pair exceeds ${colorFilterLabel.value} in total colors.`)
      }
      return partner
    }
    if (partnerKind === 'choose_background') {
      return fetchCardMatchingFilters(signal, backgroundQuery.value, {
        applyColorFilter: false,
        extraFilter: (card) =>
          isWithinMaxColors([primary, card], maxColors) &&
          isWithinSelectedColors([primary, card]),
      })
    }
    if (partnerKind === 'friends_forever') {
      return fetchCardMatchingFilters(signal, friendsForeverQuery.value, {
        applyColorFilter: false,
        extraFilter: (card) =>
          card.id !== primary.id &&
          isWithinMaxColors([primary, card], maxColors) &&
          isWithinSelectedColors([primary, card]),
        asyncFilter: passesDeckLimit,
      })
    }
    if (partnerKind === 'doctors_companion') {
      return fetchCardMatchingFilters(signal, doctorsQuery.value, {
        applyColorFilter: false,
        extraFilter: (card) =>
          card.id !== primary.id &&
          isWithinMaxColors([primary, card], maxColors) &&
          isWithinSelectedColors([primary, card]),
        asyncFilter: passesDeckLimit,
      })
    }
    return fetchCardMatchingFilters(signal, genericPartnerQuery.value, {
      applyColorFilter: false,
      extraFilter: (card) =>
        card.id !== primary.id &&
        getPartnerKind(card) === 'partner' &&
        isWithinMaxColors([primary, card], maxColors) &&
        isWithinSelectedColors([primary, card]),
      asyncFilter: passesDeckLimit,
    })
  }

  const fetchPartnerPair = async (signal: AbortSignal) => {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const primary = await fetchCardMatchingFilters(signal, partnerPoolQuery.value, {
        extraFilter: (card) => getPartnerKind(card) !== null,
        applyColorFilter: false,
        asyncFilter: passesDeckLimit,
        useRankedRandom: options.useRankCutoff,
      })
      try {
        const partner = await fetchPartnerForCard(primary, signal, colorCountNumber.value)
        if (
          partner &&
          isWithinMaxColors([primary, partner], colorCountNumber.value) &&
          isWithinSelectedColors([primary, partner])
        ) {
          return [primary, partner]
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw error
        }
      }
    }
    throw new Error(
      `Unable to find a compatible partner pair within ${colorFilterLabel.value}.`
    )
  }

  const buildRecord = (cardsToRecord: ScryfallCard[], choiceRecords?: CommanderChoice[]) => ({
    id: createId(),
    createdAt: new Date().toISOString(),
    mode: mode.value,
    options: { ...options },
    cards: cardsToRecord,
    choices: choiceRecords,
  })

  const addHistory = (record: PullRecord) => {
    history.value = [record, ...history.value].slice(0, MAX_HISTORY)
  }

  const saveRecord = (record: PullRecord) => {
    const exists = saved.value.some((item) => item.id === record.id)
    if (exists) return
    saved.value = [record, ...saved.value].slice(0, MAX_SAVED)
  }

  const saveCurrent = () => {
    if (!hasResults.value) return
    const record = buildRecord(cards.value, choices.value)
    saveRecord(record)
  }

  const loadRecord = (record: PullRecord) => {
    mode.value = record.mode
    Object.assign(options, record.options)
    cards.value = record.cards ?? []
    choices.value = record.choices ?? []
    view.value = 'draw'
  }

  const removeSaved = (id: string) => {
    saved.value = saved.value.filter((record) => record.id !== id)
  }

  const clearHistory = () => {
    history.value = []
  }

  const clearSaved = () => {
    saved.value = []
  }

  const resetOptions = () => {
    Object.assign(options, defaultOptions)
  }

  const randomize = async () => {
    errorMessage.value = ''
    const current = new AbortController()
    controller.value?.abort()
    controller.value = current
    isLoading.value = true
    const nextCards: ScryfallCard[] = []
    try {
      if (isChoiceMode.value) {
        const nextChoices: CommanderChoice[] = []
        const seenIds = new Set<string>()
        for (let i = 0; i < 2; i += 1) {
          if (mode.value === 'partner') {
            let pair = await fetchPartnerPair(current.signal)
            let guard = 0
            while (pair.some((card) => seenIds.has(card.id)) && guard < 6) {
              pair = await fetchPartnerPair(current.signal)
              guard += 1
            }
            pair.forEach((card) => seenIds.add(card.id))
            nextChoices.push({ id: createId(), cards: pair })
          } else {
            let card = await fetchCardMatchingFilters(current.signal, commanderQuery.value, {
              applyColorFilter: true,
              extraFilter: matchesSelectedColors,
              asyncFilter: passesDeckLimit,
              useRankedRandom: options.useRankCutoff,
            })
            let guard = 0
            while (seenIds.has(card.id) && guard < 6) {
              card = await fetchCardMatchingFilters(current.signal, commanderQuery.value, {
                applyColorFilter: true,
                extraFilter: matchesSelectedColors,
                asyncFilter: passesDeckLimit,
                useRankedRandom: options.useRankCutoff,
              })
              guard += 1
            }
            seenIds.add(card.id)
            nextChoices.push({ id: createId(), cards: [card] })
          }
        }
        choices.value = nextChoices
        cards.value = []
        addHistory(buildRecord([], nextChoices))
      } else if (mode.value === 'partner') {
        const pair = await fetchPartnerPair(current.signal)
        nextCards.push(...pair)
        cards.value = nextCards
        choices.value = []
        addHistory(buildRecord(nextCards))
      } else {
        const query = mode.value === 'commander' ? commanderQuery.value : sparkQuery.value
        const seenIds = new Set<string>()
        let sparkFilter: ((card: ScryfallCard) => boolean) | null = null
        let errorLabelOverride: string | undefined
        if (mode.value === 'spark' && colorCountNumber.value !== null) {
          const palette = pickRandomPalette(colorCountNumber.value, allowedColors.value)
          sparkPalette.value = palette
          sparkFilter = (card) =>
            isCardWithinPalette(card, palette) && matchesSelectedColors(card)
          errorLabelOverride = `the ${formatColorIdentity(palette)} palette`
        } else {
          sparkPalette.value = null
        }

        for (let i = 0; i < drawCount.value; i += 1) {
          let card = await fetchCardMatchingFilters(current.signal, query, {
            applyColorFilter: mode.value === 'commander',
            extraFilter: sparkFilter ?? matchesSelectedColors,
            errorLabel: errorLabelOverride,
            asyncFilter: mode.value === 'commander' ? passesDeckLimit : undefined,
            useRankedRandom: mode.value === 'commander' && options.useRankCutoff,
          })
          let guard = 0
          while (seenIds.has(card.id) && guard < 6) {
            card = await fetchCardMatchingFilters(current.signal, query, {
              applyColorFilter: mode.value === 'commander',
              extraFilter: sparkFilter ?? matchesSelectedColors,
              errorLabel: errorLabelOverride,
              asyncFilter: mode.value === 'commander' ? passesDeckLimit : undefined,
              useRankedRandom: mode.value === 'commander' && options.useRankCutoff,
            })
            guard += 1
          }
          seenIds.add(card.id)
          nextCards.push(card)
        }
        cards.value = nextCards
        choices.value = []
        addHistory(buildRecord(nextCards))
      }
      await nextTick()
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }
      errorMessage.value =
        error instanceof Error ? error.message : 'Unable to fetch a random card.'
    } finally {
      if (controller.value === current) {
        isLoading.value = false
      }
    }
  }

  const randomizePartnerForPrimary = async () => {
    const primary = primaryCard.value
    if (!primary) return
    errorMessage.value = ''
    const current = new AbortController()
    controller.value?.abort()
    controller.value = current
    isLoading.value = true
    try {
      const partner = await fetchPartnerForCard(
        primary,
        current.signal,
        colorCountNumber.value
      )
      if (!partner) {
        throw new Error("This commander doesn't have a compatible partner.")
      }
      cards.value = [primary, partner]
      choices.value = []
      addHistory(buildRecord(cards.value))
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }
      errorMessage.value =
        error instanceof Error ? error.message : 'Unable to fetch a partner.'
    } finally {
      if (controller.value === current) {
        isLoading.value = false
      }
    }
  }

  const randomizePartnerForChoice = async (index: number) => {
    const choice = choices.value[index]
    const primary = choice?.cards[0]
    if (!primary) return
    errorMessage.value = ''
    const current = new AbortController()
    controller.value?.abort()
    controller.value = current
    isLoading.value = true
    try {
      const partner = await fetchPartnerForCard(
        primary,
        current.signal,
        colorCountNumber.value
      )
      if (!partner) {
        throw new Error("This commander doesn't have a compatible partner.")
      }
      choices.value[index] = {
        ...choice,
        cards: [primary, partner],
      }
      addHistory(buildRecord([], choices.value))
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }
      errorMessage.value =
        error instanceof Error ? error.message : 'Unable to fetch a partner.'
    } finally {
      if (controller.value === current) {
        isLoading.value = false
      }
    }
  }

  const loadTagsForGroups = async (groups: ScryfallCard[][]) => {
    if (!display.showTags || mode.value === 'spark') return
    const targets = new Map<string, string[]>()
    groups.forEach((group) => {
      if (!group.length) return
      if (display.usePairTags && isPairGroup(group)) {
        if (group.some((card) => usesCommanderLink(card))) {
          const pairSlug = getPairSlug(group)
          const orderedSlug = group.map((card) => slugify(card.name)).join('-')
          const candidates = orderedSlug === pairSlug ? [pairSlug] : [pairSlug, orderedSlug]
          targets.set(pairSlug, candidates)
        }
        return
      }
      group.forEach((card) => {
        if (!shouldShowTags(card)) return
        const slug = slugify(card.name)
        targets.set(slug, [slug])
      })
    })
    if (targets.size === 0) return

    const missing = Array.from(targets.keys()).filter(
      (key) => !(key in tagLookup.value)
    )
    if (missing.length === 0) return

    const requestId = tagRequestId.value + 1
    tagRequestId.value = requestId
    const current = new AbortController()
    tagController.value?.abort()
    tagController.value = current

    await Promise.all(
      missing.map(async (slug) => {
        try {
          const candidates = targets.get(slug) ?? [slug]
          let tags: EdhrecTag[] | null = null
          for (const candidate of candidates) {
            try {
              const meta = await getEdhrecMeta(candidate, current.signal)
              tags = meta.tags
              break
            } catch (error) {
              if (error instanceof Error && error.name === 'AbortError') {
                throw error
              }
            }
          }
          if (tagRequestId.value !== requestId) return
          tagLookup.value = { ...tagLookup.value, [slug]: tags ?? [] }
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            return
          }
          if (tagRequestId.value !== requestId) return
          tagLookup.value = { ...tagLookup.value, [slug]: [] }
        }
      })
    )
  }

  const openOptions = () => {
    isOptionsOpen.value = true
  }

  const closeOptions = () => {
    isOptionsOpen.value = false
  }

  const clearNetworkCache = () => {
    clearCache()
  }

  watch(
    [
      () => mode.value,
      () => options.colorCount,
      () => options.excludeGameChangers,
      () => options.selectedColors,
      () => options.limitByDecks,
      () => options.maxDecks,
      () => options.twoChoices,
      () => options.useRankCutoff,
    ],
    () => {
      errorMessage.value = ''
    }
  )

  watch([() => mode.value, () => options.colorCount], () => {
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
  })

  watch(
    () => options.selectedColors,
    () => {
      sparkPalette.value = null
    },
    { deep: true }
  )

  watch(
    () => options.useRankCutoff,
    (value) => {
      if (value) {
        options.limitByDecks = false
      }
    }
  )

  watch(
    () => options.twoChoices,
    (value) => {
      if (value) {
        cards.value = []
      } else {
        choices.value = []
      }
    }
  )

  watch(
    [cards, choices, mode, () => display.showTags, () => display.usePairTags],
    () => {
      if (!display.showTags || mode.value === 'spark') return
      const groups = isChoiceMode.value
        ? choices.value.map((choice) => choice.cards)
        : cards.value.length > 0
          ? [cards.value]
          : []
      if (groups.length === 0) return
      loadTagsForGroups(groups)
    },
    { deep: true }
  )

  watch(
    [view, mode, options, display, cacheSettings, theme, history, saved],
    () => {
      const payload: PersistedState = {
        view: view.value,
        mode: mode.value,
        options: { ...options },
        display: { ...display },
        cache: { ...cacheSettings },
        theme: theme.value,
        history: history.value,
        saved: saved.value,
      }
      writeStorage(STORAGE_KEY, payload)
    },
    { deep: true }
  )

  const getColorOptionLabel = (option: { value: ColorCount; label: string }) => {
    if (mode.value === 'commander') return option.label
    if (option.value === 'any') return 'Any colors'
    const count = Number(option.value)
    if (count === 0) return 'Colorless only'
    return `Up to ${count} color${count === 1 ? '' : 's'}`
  }

  return {
    view,
    mode,
    options,
    display,
    cacheSettings,
    theme,
    history,
    saved,
    cards,
    choices,
    sparkPalette,
    isLoading,
    errorMessage,
    isOptionsOpen,
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
    getPartnerButtonLabel,
    getColorOptionLabel,
    randomize,
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
    openOptions,
    closeOptions,
    clearNetworkCache,
    formatColorIdentity,
    getTypeLine,
    getTagKeyForCard,
  }
})
