import { formatColorIdentity, type ScryfallCard } from './scryfall'

export type ColorFilterMode = 'commander' | 'partner' | 'spark'
export type ColorCount = 'any' | '0' | '1' | '2' | '3' | '4' | '5'
export type ColorCountMode = 'up-to' | 'exactly'
export type ColorSymbol = 'C' | 'W' | 'U' | 'B' | 'R' | 'G'

export type ColorFilterInput = Readonly<{
  mode: ColorFilterMode
  colorCount: ColorCount
  colorCountMode: ColorCountMode
  selectedColors: readonly string[]
}>

export type ColorFilterProblem = Readonly<{
  code:
    | 'colorless-mixed-with-colors'
    | 'colored-focus-with-zero-count'
    | 'exact-count-exceeds-focus'
    | 'invalid-color-focus'
  message: string
}>

export type CompiledColorFilter = Readonly<{
  mode: ColorFilterMode
  comparison: ColorCountMode
  count: number | null
  selectedColors: readonly ColorSymbol[]
  allowedColors: readonly Exclude<ColorSymbol, 'C'>[]
  problem: ColorFilterProblem | null
  ui: Readonly<{
    fieldLabel: string
    summary: string
    comparisonDescription: string
  }>
  getScryfallClause: (palette?: readonly string[] | null) => string
  matchesCandidate: (
    card: Pick<ScryfallCard, 'color_identity'>,
    palette?: readonly string[] | null
  ) => boolean
  matchesResult: (
    cards: ReadonlyArray<Pick<ScryfallCard, 'color_identity'>>,
    palette?: readonly string[] | null
  ) => boolean
  pickSparkPalette: (random?: () => number) => readonly string[] | null
}>

const COLOR_ORDER = ['C', 'W', 'U', 'B', 'R', 'G'] as const
const COLORED_SYMBOLS = ['W', 'U', 'B', 'R', 'G'] as const
const COLOR_SET = new Set<string>(COLOR_ORDER)

const normalizeSelectedColors = (colors: readonly string[]) => {
  const normalized = new Set<string>()
  let hasInvalidColor = false
  colors.forEach((color) => {
    const symbol = typeof color === 'string' ? color.toUpperCase() : ''
    if (!COLOR_SET.has(symbol)) {
      hasInvalidColor = true
      return
    }
    normalized.add(symbol)
  })
  return {
    colors: COLOR_ORDER.filter((color) => normalized.has(color)),
    hasInvalidColor,
  }
}

const normalizeCardColors = (colors: unknown): string[] | null => {
  if (!Array.isArray(colors)) return null
  const normalized = colors.map((color) =>
    typeof color === 'string' ? color.toUpperCase() : ''
  )
  if (normalized.some((color) => !COLORED_SYMBOLS.includes(color as never))) {
    return null
  }
  return [...new Set(normalized)]
}

const pluralizedColors = (count: number) =>
  `${count} ${count === 1 ? 'color' : 'colors'}`

export const formatColorCountLabel = (
  value: ColorCount,
  comparison: ColorCountMode
) => {
  if (value === 'any') return 'any colors'
  if (value === '0') return 'Colorless only'
  const count = Number(value)
  return `${comparison === 'exactly' ? 'Exactly' : 'Up to'} ${pluralizedColors(count)}`
}

const joinClauses = (...clauses: Array<string | null | undefined>) =>
  [...new Set(clauses.filter((clause): clause is string => Boolean(clause)))].join(
    ' '
  )

export const compileColorFilter = (
  input: ColorFilterInput
): CompiledColorFilter => {
  const normalized = normalizeSelectedColors(input.selectedColors)
  const selectedColors = Object.freeze([...normalized.colors])
  const hasColorlessFocus = selectedColors.includes('C')
  const coloredFocus = selectedColors.filter(
    (color): color is Exclude<ColorSymbol, 'C'> => color !== 'C'
  )
  const count = input.colorCount === 'any' ? null : Number(input.colorCount)

  let problem: ColorFilterProblem | null = null
  if (normalized.hasInvalidColor) {
    problem = {
      code: 'invalid-color-focus',
      message: 'One or more selected colors are invalid. Clear the color focus and try again.',
    }
  } else if (hasColorlessFocus && coloredFocus.length > 0) {
    problem = {
      code: 'colorless-mixed-with-colors',
      message:
        'Colorless cannot be combined with colored focus selections. Choose Colorless alone or remove it.',
    }
  } else if (coloredFocus.length > 0 && count === 0) {
    problem = {
      code: 'colored-focus-with-zero-count',
      message:
        'A zero-color result cannot use a colored focus. Remove the color focus or increase the color count.',
    }
  } else if (
    input.colorCountMode === 'exactly' &&
    count !== null &&
    ((hasColorlessFocus && count > 0) ||
      (coloredFocus.length > 0 && count > coloredFocus.length))
  ) {
    problem = {
      code: 'exact-count-exceeds-focus',
      message: hasColorlessFocus
        ? `Exactly ${pluralizedColors(count)} cannot be produced by a Colorless focus.`
        : `Exactly ${pluralizedColors(count)} needs at least ${count} focused colors. Choose more colors or lower the count.`,
    }
  }

  const fieldLabel =
    input.mode === 'commander'
      ? 'Color identity'
      : input.mode === 'partner'
        ? 'Combined pair color identity'
        : 'Combined spark color identity'
  const focusLabel =
    selectedColors.length > 0
      ? ` within ${formatColorIdentity([...selectedColors])}`
      : ''
  const summary = `${formatColorCountLabel(
    input.colorCount,
    input.colorCountMode
  )}${focusLabel}`
  const comparisonDescription =
    count === null
      ? 'Any color count is allowed; the comparison setting has no effect.'
      : input.colorCountMode === 'exactly'
        ? `Require exactly ${pluralizedColors(count)} across the ${
            input.mode === 'commander'
              ? 'commander'
              : input.mode === 'partner'
                ? 'completed pair'
                : 'three-card spark'
          }.`
        : `Allow up to ${pluralizedColors(count)} across the ${
            input.mode === 'commander'
              ? 'commander'
              : input.mode === 'partner'
                ? 'completed pair'
                : 'three-card spark'
          }.`

  const effectivePalette = (palette?: readonly string[] | null) => {
    if (hasColorlessFocus) return []
    if (palette !== undefined && palette !== null) {
      const normalizedPalette = normalizeSelectedColors(palette)
      if (
        normalizedPalette.hasInvalidColor ||
        normalizedPalette.colors.includes('C')
      ) {
        return null
      }
      return normalizedPalette.colors.filter(
        (color): color is Exclude<ColorSymbol, 'C'> => color !== 'C'
      )
    }
    return coloredFocus.length > 0 ? coloredFocus : null
  }

  const getScryfallClause = (palette?: readonly string[] | null) => {
    if (problem) return ''
    const constrainedPalette = effectivePalette(palette)
    const hasExplicitEmptyPalette =
      hasColorlessFocus ||
      (palette !== undefined && palette !== null && constrainedPalette?.length === 0)
    if (count === 0 || hasExplicitEmptyPalette) return 'ci=c'

    const paletteClause = constrainedPalette?.length
      ? `ci<=${constrainedPalette.join('').toLowerCase()}`
      : ''
    const countClause =
      count === null
        ? ''
        : input.mode === 'commander' && input.colorCountMode === 'exactly'
          ? `ci=${count}`
          : `ci<=${count}`
    const excludeColorlessClause =
      input.mode === 'commander' && coloredFocus.length > 0 ? 'ci>0' : ''

    return joinClauses(paletteClause, countClause, excludeColorlessClause)
  }

  const matchesPalette = (
    colors: readonly string[],
    palette?: readonly string[] | null
  ) => {
    const constrainedPalette = effectivePalette(palette)
    if (constrainedPalette === null) return palette == null && !hasColorlessFocus
    if (constrainedPalette.length === 0) return colors.length === 0
    return colors.every((color) => constrainedPalette.includes(color as never))
  }

  const matchesCandidate = (
    card: Pick<ScryfallCard, 'color_identity'>,
    palette?: readonly string[] | null
  ) => {
    if (problem) return false
    const colors = normalizeCardColors(card.color_identity)
    if (!colors || !matchesPalette(colors, palette)) return false
    if (input.mode === 'commander' && coloredFocus.length > 0 && colors.length === 0) {
      return false
    }
    if (count === null) return true
    return input.mode === 'commander' && input.colorCountMode === 'exactly'
      ? colors.length === count
      : colors.length <= count
  }

  const matchesResult = (
    cards: ReadonlyArray<Pick<ScryfallCard, 'color_identity'>>,
    palette?: readonly string[] | null
  ) => {
    if (problem || cards.length === 0) return false
    const identities = cards.map((card) => normalizeCardColors(card.color_identity))
    if (identities.some((identity) => identity === null)) return false
    const combined = [
      ...new Set(identities.flatMap((identity) => identity ?? [])),
    ]
    if (!matchesPalette(combined, palette)) return false
    if (coloredFocus.length > 0 && combined.length === 0) return false
    if (count === null) return true
    return input.colorCountMode === 'exactly'
      ? combined.length === count
      : combined.length <= count
  }

  const pickSparkPalette = (random: () => number = Math.random) => {
    if (input.mode !== 'spark' || count === null || problem) return null
    if (hasColorlessFocus || count === 0) return Object.freeze([])

    const pool = [...(coloredFocus.length > 0 ? coloredFocus : COLORED_SYMBOLS)]
    const maximum = Math.min(count, pool.length)
    const minimum =
      input.colorCountMode === 'exactly' ? maximum : coloredFocus.length > 0 ? 1 : 0
    const range = maximum - minimum + 1
    const boundedRandom = Math.min(0.999999999, Math.max(0, random()))
    const target = minimum + Math.floor(boundedRandom * range)
    const picked: string[] = []
    for (let index = 0; index < target; index += 1) {
      const candidateRandom = Math.min(0.999999999, Math.max(0, random()))
      const candidateIndex = Math.floor(candidateRandom * pool.length)
      picked.push(pool.splice(candidateIndex, 1)[0]!)
    }
    return Object.freeze(picked)
  }

  return Object.freeze({
    mode: input.mode,
    comparison: input.colorCountMode,
    count,
    selectedColors,
    allowedColors: Object.freeze([...coloredFocus]),
    problem: problem ? Object.freeze(problem) : null,
    ui: Object.freeze({ fieldLabel, summary, comparisonDescription }),
    getScryfallClause,
    matchesCandidate,
    matchesResult,
    pickSparkPalette,
  })
}
