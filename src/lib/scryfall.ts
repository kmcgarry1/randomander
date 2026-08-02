export type ScryfallImageUris = {
  normal?: string
  art_crop?: string
}

export type ScryfallCardFace = {
  type_line?: string
  oracle_text?: string
  image_uris?: ScryfallImageUris
  name?: string
}

export type ScryfallCard = {
  id: string
  name: string
  scryfall_uri: string
  layout?: string
  set?: string
  collector_number?: string
  type_line?: string
  oracle_text?: string
  keywords?: string[]
  color_identity?: string[]
  image_uris?: ScryfallImageUris
  card_faces?: ScryfallCardFace[]
  all_parts?: Array<{
    id: string
    name: string
    component: string
    uri: string
  }>
  prices?: {
    usd?: string | null
    usd_foil?: string | null
    usd_etched?: string | null
    eur?: string | null
    eur_foil?: string | null
    tix?: string | null
  }
  purchase_uris?: {
    cardmarket?: string
    tcgplayer?: string
    cardhoarder?: string
  }
  object?: string
  details?: string
}

export const PRICE_PROVIDERS = [
  { value: 'cardmarket', label: 'Cardmarket', unit: 'EUR' },
  { value: 'tcgplayer', label: 'TCGplayer', unit: 'USD' },
  { value: 'cardhoarder', label: 'Cardhoarder', unit: 'tix' },
] as const

export type PriceProvider = (typeof PRICE_PROVIDERS)[number]['value']
export type PriceFinish = 'regular' | 'foil' | 'etched'

export type CardPrice = {
  provider: PriceProvider
  providerLabel: string
  formatted: string
  finish: PriceFinish
  purchaseUrl: string | null
}

type PriceKey = keyof NonNullable<ScryfallCard['prices']>

const PRICE_FIELDS: Record<
  PriceProvider,
  Array<{ key: PriceKey; finish: PriceFinish }>
> = {
  cardmarket: [
    { key: 'eur', finish: 'regular' },
    { key: 'eur_foil', finish: 'foil' },
  ],
  tcgplayer: [
    { key: 'usd', finish: 'regular' },
    { key: 'usd_foil', finish: 'foil' },
    { key: 'usd_etched', finish: 'etched' },
  ],
  cardhoarder: [{ key: 'tix', finish: 'regular' }],
}

export const isPriceProvider = (value: unknown): value is PriceProvider =>
  PRICE_PROVIDERS.some((provider) => provider.value === value)

const formatMarketplacePrice = (amount: number, provider: PriceProvider) => {
  if (provider === 'cardhoarder') return `${amount.toFixed(2)} tix`
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: provider === 'cardmarket' ? 'EUR' : 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export const getCardPrice = (
  card: ScryfallCard,
  provider: PriceProvider
): CardPrice | null => {
  const fields = PRICE_FIELDS[provider]
  const selected = fields.find(({ key }) => {
    const raw = card.prices?.[key]
    if (typeof raw !== 'string' || raw.trim() === '') return false
    const amount = Number(raw)
    return Number.isFinite(amount) && amount > 0
  })
  if (!selected) return null

  const amount = Number(card.prices?.[selected.key])
  const providerLabel =
    PRICE_PROVIDERS.find((option) => option.value === provider)?.label ?? provider

  return {
    provider,
    providerLabel,
    formatted: formatMarketplacePrice(amount, provider),
    finish: selected.finish,
    purchaseUrl: card.purchase_uris?.[provider] ?? null,
  }
}

const COLOR_ORDER = ['C', 'W', 'U', 'B', 'R', 'G']
const COLOR_NAMES: Record<string, string> = {
  C: 'Colorless',
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
}

const TURNABLE_CARD_LAYOUTS = new Set([
  'transform',
  'modal_dfc',
  'double_faced_token',
  'reversible_card',
])

export type TurnableCardFace = {
  index: number
  name: string
  imageUrl: string
}

export const getTurnableCardFaces = (
  card: ScryfallCard
): TurnableCardFace[] => {
  if (!card.layout || !TURNABLE_CARD_LAYOUTS.has(card.layout)) return []
  if (card.card_faces?.length !== 2) return []

  const faces: TurnableCardFace[] = []
  for (const [index, face] of card.card_faces.entries()) {
    const imageUrl = face.image_uris?.normal?.trim()
    if (!imageUrl) return []
    const fallbackName = card.name.split(/\s*\/\/\s*/)[index]?.trim()
    faces.push({
      index,
      name: face.name?.trim() || fallbackName || `Face ${index + 1}`,
      imageUrl,
    })
  }

  return new Set(faces.map((face) => face.imageUrl)).size === 2 ? faces : []
}

export const getCardImageUrl = (card: ScryfallCard) =>
  getTurnableCardFaces(card)[0]?.imageUrl ??
  card.image_uris?.normal ??
  card.card_faces?.[0]?.image_uris?.normal ??
  ''

export const getCardArtUrl = (card: ScryfallCard) =>
  card.image_uris?.art_crop ??
  card.card_faces?.[0]?.image_uris?.art_crop ??
  getCardImageUrl(card)

export const getOracleText = (card: ScryfallCard) => {
  if (card.oracle_text) return card.oracle_text
  return (
    card.card_faces
      ?.map((face) => face.oracle_text)
      .filter(Boolean)
      .join('\n') ?? ''
  )
}

export const getTypeLine = (card: ScryfallCard) => {
  if (card.type_line) return card.type_line
  return (
    card.card_faces
      ?.map((face) => face.type_line)
      .filter(Boolean)
      .join(' // ') ?? ''
  )
}

export const isBackgroundCard = (
  card: ScryfallCard | null | undefined
): card is ScryfallCard =>
  Boolean(card && /\bbackground\b/i.test(getTypeLine(card)))

export const formatColorIdentity = (colors?: string[]) => {
  if (!colors || colors.length === 0) {
    return 'Colorless'
  }
  const ordered = COLOR_ORDER.filter((color) => colors.includes(color))
  const names = ordered.map((color) => COLOR_NAMES[color] ?? color)
  return names.join(', ')
}

export const slugify = (name: string) => {
  const baseName = name.split(/\s*\/\/\s*/)[0] ?? ''
  return baseName
    .toLowerCase()
    .replace(/[\u2019']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

const getNameBeforeSlash = (name: string) => {
  const [first = ''] = name.split('//')
  return first.trim()
}

export const getCanonicalName = (card: ScryfallCard) => {
  const frontFaceName = card.card_faces?.[0]?.name
  if (frontFaceName) return frontFaceName
  return getNameBeforeSlash(card.name)
}

export const getCardSlug = (card: ScryfallCard) => slugify(getCanonicalName(card))

export const getEdhrecCommanderUrl = (card: ScryfallCard) =>
  `https://edhrec.com/commanders/${getCardSlug(card)}`

export const getEdhrecCardUrl = (card: ScryfallCard) =>
  `https://edhrec.com/cards/${getCardSlug(card)}`

export type PartnerKind =
  | 'partner_with'
  | 'choose_background'
  | 'friends_forever'
  | 'doctors_companion'
  | 'partner'
  | null

const normalizeKeyword = (keyword: string) => keyword.toLowerCase()

export const getPartnerKind = (card: ScryfallCard): PartnerKind => {
  const oracle = getOracleText(card).toLowerCase()
  if (oracle.includes('partner with')) return 'partner_with'
  if (oracle.includes('choose a background')) return 'choose_background'
  if (oracle.includes('friends forever')) return 'friends_forever'
  if (oracle.includes("doctor's companion")) return 'doctors_companion'
  if (oracle.includes('partner')) return 'partner'
  if (card.keywords?.map(normalizeKeyword).includes('partner')) return 'partner'
  return null
}

export const getPartnerWithName = (card: ScryfallCard) => {
  const related = card.all_parts?.find(
    (part) => part.component === 'related_card' && part.name !== card.name
  )
  if (related?.name) return related.name
  const oracle = getOracleText(card)
  const match = oracle.match(/Partner with ([^(.\n]+)/i)
  return match?.[1]?.trim() ?? null
}

const normalizePartnerVariant = (variant: string) =>
  variant
    .toLowerCase()
    .trim()
    .replace(/[.,:;]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()

// Match "partner—<variant>" allowing one or more dash-like characters (hyphen, en, em)
// to be robust to minor formatting differences in oracle text.
const PARTNER_VARIANT_REGEX = /partner\s*[-—–]+\s*([^\n(]+)/i

export const getPartnerVariant = (card: ScryfallCard) => {
  const oracle = getOracleText(card)
  const match = oracle.match(PARTNER_VARIANT_REGEX)
  if (!match?.[1]) return null
  const normalized = normalizePartnerVariant(match[1])
  return normalized.length > 0 ? normalized : null
}
