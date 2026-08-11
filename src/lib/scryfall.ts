import {
  RuntimeDataError,
  isRecord,
  nonEmptyString,
  type RuntimeDataSource,
} from './runtimeValidation'

export type ScryfallImageUris = {
  small?: string
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
  oracle_id?: string
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
  related_uris?: {
    edhrec?: string
    [key: string]: string | undefined
  }
  object?: string
  details?: string
}

type DecodeScryfallCardOptions = {
  source?: RuntimeDataSource
  path?: string
  requireColorIdentity?: boolean
}

const optionalString = (value: unknown) =>
  typeof value === 'string' ? value : undefined

const decodeImageUris = (value: unknown): ScryfallImageUris | undefined => {
  if (!isRecord(value)) return undefined
  const small = optionalString(value.small)
  const normal = optionalString(value.normal)
  const artCrop = optionalString(value.art_crop)
  return small || normal || artCrop
    ? { small, normal, art_crop: artCrop }
    : undefined
}

const decodeStringArray = (value: unknown, maxItems: number) =>
  Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === 'string')
        .slice(0, maxItems)
    : undefined

const CARD_COLORS = new Set(['W', 'U', 'B', 'R', 'G'])

export const decodeScryfallCard = (
  value: unknown,
  {
    source = 'scryfall',
    path = 'card',
    requireColorIdentity = true,
  }: DecodeScryfallCardOptions = {}
): ScryfallCard => {
  if (!isRecord(value)) {
    throw new RuntimeDataError(source, path, 'expected an object')
  }
  const id = nonEmptyString(value.id)
  const name = nonEmptyString(value.name)
  const scryfallUri = nonEmptyString(value.scryfall_uri)
  if (!id) throw new RuntimeDataError(source, `${path}.id`, 'expected a string')
  if (!name) {
    throw new RuntimeDataError(source, `${path}.name`, 'expected a string')
  }
  if (!scryfallUri) {
    throw new RuntimeDataError(
      source,
      `${path}.scryfall_uri`,
      'expected a string'
    )
  }

  let colorIdentity: string[]
  if (value.color_identity === undefined && !requireColorIdentity) {
    colorIdentity = []
  } else if (
    !Array.isArray(value.color_identity) ||
    value.color_identity.some(
      (color) => typeof color !== 'string' || !CARD_COLORS.has(color.toUpperCase())
    )
  ) {
    throw new RuntimeDataError(
      source,
      `${path}.color_identity`,
      'expected an array of W, U, B, R, and G symbols'
    )
  } else {
    colorIdentity = [
      ...new Set(value.color_identity.map((color) => String(color).toUpperCase())),
    ]
  }

  const cardFaces = Array.isArray(value.card_faces)
    ? value.card_faces.slice(0, 4).flatMap((face): ScryfallCardFace[] => {
        if (!isRecord(face)) return []
        return [
          {
            name: optionalString(face.name),
            type_line: optionalString(face.type_line),
            oracle_text: optionalString(face.oracle_text),
            image_uris: decodeImageUris(face.image_uris),
          },
        ]
      })
    : undefined
  const allParts = Array.isArray(value.all_parts)
    ? value.all_parts.slice(0, 100).flatMap((part) => {
        if (!isRecord(part)) return []
        const partId = nonEmptyString(part.id)
        const partName = nonEmptyString(part.name)
        const component = nonEmptyString(part.component)
        const uri = nonEmptyString(part.uri)
        return partId && partName && component && uri
          ? [{ id: partId, name: partName, component, uri }]
          : []
      })
    : undefined

  const prices = isRecord(value.prices)
    ? {
        usd: optionalString(value.prices.usd) ?? null,
        usd_foil: optionalString(value.prices.usd_foil) ?? null,
        usd_etched: optionalString(value.prices.usd_etched) ?? null,
        eur: optionalString(value.prices.eur) ?? null,
        eur_foil: optionalString(value.prices.eur_foil) ?? null,
        tix: optionalString(value.prices.tix) ?? null,
      }
    : undefined
  const purchaseUris = isRecord(value.purchase_uris)
    ? {
        cardmarket: optionalString(value.purchase_uris.cardmarket),
        tcgplayer: optionalString(value.purchase_uris.tcgplayer),
        cardhoarder: optionalString(value.purchase_uris.cardhoarder),
      }
    : undefined
  const relatedUris = isRecord(value.related_uris)
    ? Object.fromEntries(
        Object.entries(value.related_uris).filter(
          (entry): entry is [string, string] => typeof entry[1] === 'string'
        )
      )
    : undefined

  return {
    id,
    name,
    scryfall_uri: scryfallUri,
    color_identity: colorIdentity,
    oracle_id: optionalString(value.oracle_id),
    layout: optionalString(value.layout),
    set: optionalString(value.set),
    collector_number: optionalString(value.collector_number),
    type_line: optionalString(value.type_line),
    oracle_text: optionalString(value.oracle_text),
    keywords: decodeStringArray(value.keywords, 100),
    image_uris: decodeImageUris(value.image_uris),
    card_faces: cardFaces,
    all_parts: allParts,
    prices,
    purchase_uris: purchaseUris,
    related_uris: relatedUris,
    object: optionalString(value.object),
    details: optionalString(value.details),
  }
}

export const PRICE_PROVIDERS = [
  { value: 'cardmarket', label: 'Cardmarket', unit: 'EUR' },
  { value: 'tcgplayer', label: 'TCGplayer', unit: 'USD' },
  { value: 'cardhoarder', label: 'Cardhoarder', unit: 'tix' },
] as const

export type PriceProvider = (typeof PRICE_PROVIDERS)[number]['value']
export type PriceFinish = 'regular' | 'foil' | 'etched'

const SCRYFALL_LINK_HOSTS = new Set(['scryfall.com', 'www.scryfall.com'])
const EDHREC_LINK_HOSTS = new Set(['edhrec.com', 'www.edhrec.com'])
const PURCHASE_LINK_HOSTS: Record<PriceProvider, ReadonlySet<string>> = {
  cardmarket: new Set(['cardmarket.com', 'www.cardmarket.com']),
  tcgplayer: new Set([
    'tcgplayer.com',
    'www.tcgplayer.com',
    'partner.tcgplayer.com',
    'tcgplayer.pxf.io',
  ]),
  cardhoarder: new Set(['cardhoarder.com', 'www.cardhoarder.com']),
}

const validateHttpsUrl = (
  value: string | null | undefined,
  allowedHosts: ReadonlySet<string>
) => {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const parsed = new URL(value.trim())
    const usesDefaultPort = parsed.port === '' || parsed.port === '443'
    if (
      parsed.protocol !== 'https:' ||
      !allowedHosts.has(parsed.hostname.toLowerCase()) ||
      !usesDefaultPort ||
      parsed.username ||
      parsed.password
    ) {
      return null
    }
    return parsed.href
  } catch {
    return null
  }
}

export const getSafeScryfallUrl = (card: ScryfallCard) =>
  validateHttpsUrl(card.scryfall_uri, SCRYFALL_LINK_HOSTS)

export const getSafeEdhrecUrl = (value: string | null | undefined) =>
  validateHttpsUrl(value, EDHREC_LINK_HOSTS)

export const getSafePurchaseUrl = (
  value: string | null | undefined,
  provider: PriceProvider
) => validateHttpsUrl(value, PURCHASE_LINK_HOSTS[provider])

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
    purchaseUrl: getSafePurchaseUrl(card.purchase_uris?.[provider], provider),
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

export const getCardThumbnailUrl = (card: ScryfallCard) =>
  card.image_uris?.small ??
  card.card_faces?.[0]?.image_uris?.small ??
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
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
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

const EDHREC_IDENTIFIER_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const isValidEdhrecIdentifier = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length <= 240 &&
  EDHREC_IDENTIFIER_PATTERN.test(value)

export const getEdhrecPairIdentifier = (cards: ScryfallCard[]) => {
  const identifiers = cards.map((card) => getCardSlug(card))
  if (
    identifiers.length < 2 ||
    identifiers.some((identifier) => !isValidEdhrecIdentifier(identifier))
  ) {
    return null
  }
  const combined = identifiers.sort((a, b) => a.localeCompare(b)).join('-')
  return isValidEdhrecIdentifier(combined) ? combined : null
}

const getValidatedRelatedEdhrecUrl = (card: ScryfallCard) => {
  const relatedUrl = card.related_uris?.edhrec?.trim()
  if (!relatedUrl) return null
  return getSafeEdhrecUrl(relatedUrl)
}

export const getEdhrecCommanderUrl = (card: ScryfallCard) => {
  const related = getValidatedRelatedEdhrecUrl(card)
  if (related) return related
  const identifier = getCardSlug(card)
  return isValidEdhrecIdentifier(identifier)
    ? `https://edhrec.com/commanders/${identifier}`
    : null
}

export const getEdhrecCardUrl = (card: ScryfallCard) => {
  const related = getValidatedRelatedEdhrecUrl(card)
  if (related) return related
  const identifier = getCardSlug(card)
  return isValidEdhrecIdentifier(identifier)
    ? `https://edhrec.com/cards/${identifier}`
    : null
}

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

const normalizeCardName = (name: string) =>
  name.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim()

const isSameCard = (first: ScryfallCard, second: ScryfallCard) =>
  first.id === second.id ||
  Boolean(first.oracle_id && first.oracle_id === second.oracle_id) ||
  normalizeCardName(getCanonicalName(first)) ===
    normalizeCardName(getCanonicalName(second))

export const isDoctorCommander = (card: ScryfallCard) => {
  const typeLineMatch = getTypeLine(card).match(/^(.+?)\s+[\u2013\u2014-]\s+(.+)$/)
  if (!typeLineMatch) return false

  const cardTypes = typeLineMatch[1] ?? ''
  const creatureTypes = (typeLineMatch[2] ?? '').replace(/\s+/g, ' ').trim()
  const oracle = getOracleText(card)
  return (
    /\blegendary\b/i.test(cardTypes) &&
    /\bcreature\b/i.test(cardTypes) &&
    creatureTypes.toLowerCase() === 'time lord doctor' &&
    !/\bchangeling\b|\bevery creature type\b/i.test(oracle)
  )
}

const namesMatch = (expected: string | null, card: ScryfallCard) =>
  Boolean(
    expected &&
      normalizeCardName(expected) === normalizeCardName(getCanonicalName(card))
  )

const isNamedPartnerPair = (first: ScryfallCard, second: ScryfallCard) =>
  getPartnerKind(first) === 'partner_with' &&
  getPartnerKind(second) === 'partner_with' &&
  namesMatch(getPartnerWithName(first), second) &&
  namesMatch(getPartnerWithName(second), first)

/** Pure final rules invariant for every completed two-commander pairing. */
export const isLegalPartnerPair = (
  first: ScryfallCard,
  second: ScryfallCard
) => {
  if (isSameCard(first, second)) return false
  if (isNamedPartnerPair(first, second)) return true

  const firstKind = getPartnerKind(first)
  const secondKind = getPartnerKind(second)
  if (firstKind === 'friends_forever' && secondKind === 'friends_forever') {
    return true
  }
  if (
    (firstKind === 'choose_background' && isBackgroundCard(second)) ||
    (secondKind === 'choose_background' && isBackgroundCard(first))
  ) {
    return true
  }
  if (
    (firstKind === 'doctors_companion' && isDoctorCommander(second)) ||
    (secondKind === 'doctors_companion' && isDoctorCommander(first))
  ) {
    return true
  }
  if (firstKind === 'partner' && secondKind === 'partner') {
    return getPartnerVariant(first) === getPartnerVariant(second)
  }
  return false
}
