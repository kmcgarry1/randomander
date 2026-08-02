import { fetchJson, type CacheOptions } from './http'

export type EdhrecTag = {
  label: string
  href: string
  slug?: string
  count?: number
}

export type EdhrecMeta = {
  deckCount: number | null
  tags: EdhrecTag[]
}

type EdhrecResponse = {
  num_decks?: number
  num_decks_avg?: number
  container?: {
    json_dict?: {
      card?: {
        num_decks?: number
      }
    }
  }
  panels?: {
    links?: Array<{
      header?: string
      items?: Array<{ href?: string; value?: string }>
    }>
    taglinks?: Array<{ slug?: string; count?: number; value?: string }>
  }
}

// Current responses include the full tag taxonomy; EDHREC highlights four themes.
const MAX_DECK_THEMES = 4

const extractTags = (data: EdhrecResponse): EdhrecTag[] => {
  const modernTags = (data.panels?.taglinks ?? []).reduce(
    (acc: EdhrecTag[], tag) => {
      if (!tag.slug || !tag.value) return acc
      acc.push({
        label: tag.value,
        href: `https://edhrec.com/tags/${tag.slug}`,
        slug: tag.slug,
        count: tag.count,
      })
      return acc
    },
    []
  )
  if (modernTags.length > 0) return modernTags.slice(0, MAX_DECK_THEMES)

  const tagSection = data.panels?.links?.find(
    (section) => section.header === 'Tags'
  )
  if (!tagSection?.items) return []
  const countMap = new Map<string, number>()
  data.panels?.taglinks?.forEach((tag) => {
    if (tag.slug && typeof tag.count === 'number') {
      countMap.set(tag.slug, tag.count)
    }
  })

  return tagSection.items
    .reduce((acc: EdhrecTag[], item) => {
      if (!item?.href || !item.value) return acc
      const href = item.href.startsWith('http')
        ? item.href
        : `https://edhrec.com${item.href}`
      const slugMatch = item.href.match(/\/tags\/([^/]+)/)
      const slug = slugMatch?.[1]
      acc.push({
        label: item.value,
        href,
        slug,
        count: slug ? countMap.get(slug) : undefined,
      })
      return acc
    }, [])
    .slice(0, MAX_DECK_THEMES)
}

export const fetchCommanderMeta = async (
  slug: string,
  signal?: AbortSignal,
  cache?: CacheOptions
): Promise<EdhrecMeta> => {
  const url = `https://json.edhrec.com/pages/commanders/${slug}.json`
  const data = await fetchJson<EdhrecResponse>(url, { signal, cache })
  const modernDeckCount = data.container?.json_dict?.card?.num_decks
  const deckCount =
    typeof modernDeckCount === 'number'
      ? modernDeckCount
      : typeof data.num_decks === 'number'
        ? data.num_decks
        : typeof data.num_decks_avg === 'number'
          ? data.num_decks_avg
          : null
  return {
    deckCount,
    tags: extractTags(data),
  }
}
