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
  panels?: {
    links?: Array<{
      header?: string
      items?: Array<{ href?: string; value?: string }>
    }>
    taglinks?: Array<{ slug?: string; count?: number }>
  }
}

const extractTags = (data: EdhrecResponse): EdhrecTag[] => {
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

  return tagSection.items.reduce((acc: EdhrecTag[], item) => {
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
}

export const fetchCommanderMeta = async (
  slug: string,
  signal?: AbortSignal,
  cache?: CacheOptions
): Promise<EdhrecMeta> => {
  const url = `https://json.edhrec.com/pages/commanders/${slug}.json`
  const data = await fetchJson<EdhrecResponse>(url, { signal, cache })
  const deckCount =
    typeof data.num_decks === 'number'
      ? data.num_decks
      : typeof data.num_decks_avg === 'number'
        ? data.num_decks_avg
        : null
  return {
    deckCount,
    tags: extractTags(data),
  }
}
