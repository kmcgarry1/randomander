export type ScryfallCard = {
  id: string
  name: string
  scryfall_uri: string
  set?: string
  collector_number?: string
  type_line?: string
  oracle_text?: string
  keywords?: string[]
  color_identity?: string[]
  image_uris?: {
    normal?: string
    art_crop?: string
  }
  card_faces?: Array<{
    type_line?: string
    oracle_text?: string
    image_uris?: {
      normal?: string
      art_crop?: string
    }
    name?: string
  }>
  all_parts?: Array<{
    id: string
    name: string
    component: string
    uri: string
  }>
  object?: string
  details?: string
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

export const getCardImageUrl = (card: ScryfallCard) =>
  card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal ?? ''

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
