import { fetchJson, type CacheOptions } from './http'
import { getCachedValue, setCachedValue } from '../lib/cache'
import {
  getSafeEdhrecUrl,
  isValidEdhrecIdentifier,
} from '../lib/scryfall'
import {
  RuntimeDataError,
  finiteNumber,
  isRecord,
} from '../lib/runtimeValidation'

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

// Current responses include the full tag taxonomy; EDHREC highlights four themes.
const MAX_DECK_THEMES = 4

export const decodeEdhrecMeta = (value: unknown): EdhrecMeta => {
  if (!isRecord(value)) {
    throw new RuntimeDataError('cache', 'edhrec', 'expected an object')
  }
  const deckCount = value.deckCount === null ? null : finiteNumber(value.deckCount)
  if (deckCount === null && value.deckCount !== null) {
    throw new RuntimeDataError(
      'cache',
      'edhrec.deckCount',
      'expected null or a finite number'
    )
  }
  if (deckCount !== null && (deckCount < 0 || !Number.isInteger(deckCount))) {
    throw new RuntimeDataError(
      'cache',
      'edhrec.deckCount',
      'expected a non-negative number'
    )
  }
  if (!Array.isArray(value.tags)) {
    throw new RuntimeDataError('cache', 'edhrec.tags', 'expected an array')
  }
  const tags = value.tags.slice(0, MAX_DECK_THEMES).map((tag, index): EdhrecTag => {
    const label = isRecord(tag) ? tag.label : undefined
    const safeHref = isRecord(tag) ? getSafeEdhrecUrl(String(tag.href ?? '')) : null
    if (
      !isRecord(tag) ||
      typeof label !== 'string' ||
      !label.trim() ||
      !safeHref
    ) {
      throw new RuntimeDataError(
        'cache',
        `edhrec.tags[${index}]`,
        'expected label and href strings'
      )
    }
    let count: number | undefined
    if (tag.count !== undefined) {
      const decodedCount = finiteNumber(tag.count)
      if (
        decodedCount === null ||
        decodedCount < 0 ||
        !Number.isInteger(decodedCount)
      ) {
        throw new RuntimeDataError(
          'cache',
          `edhrec.tags[${index}].count`,
          'expected a non-negative number'
        )
      }
      count = decodedCount
    }
    return {
      label: label.trim(),
      href: safeHref,
      slug:
        tag.slug === undefined
          ? undefined
          : isValidEdhrecIdentifier(tag.slug)
            ? tag.slug
            : undefined,
      count,
    }
  })
  return { deckCount, tags }
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

const optionalFiniteCount = (
  value: unknown,
  path: string
): number | undefined => {
  if (value === undefined) return undefined
  const decoded = finiteNumber(value)
  if (decoded === null || decoded < 0 || !Number.isInteger(decoded)) {
    throw new RuntimeDataError(
      'edhrec',
      path,
      'expected a non-negative finite number'
    )
  }
  return decoded
}

export const decodeEdhrecResponse = (value: unknown): EdhrecResponse => {
  if (!isRecord(value)) {
    throw new RuntimeDataError('edhrec', 'response', 'expected an object')
  }
  if (
    value.num_decks === undefined &&
    value.num_decks_avg === undefined &&
    value.container === undefined &&
    value.panels === undefined
  ) {
    throw new RuntimeDataError(
      'edhrec',
      'response',
      'expected deck-count or panel data'
    )
  }

  let modernDeckCount: number | undefined
  if (value.container !== undefined) {
    if (!isRecord(value.container)) {
      throw new RuntimeDataError('edhrec', 'container', 'expected an object')
    }
    if (value.container.json_dict !== undefined) {
      if (!isRecord(value.container.json_dict)) {
        throw new RuntimeDataError(
          'edhrec',
          'container.json_dict',
          'expected an object'
        )
      }
      if (value.container.json_dict.card !== undefined) {
        if (!isRecord(value.container.json_dict.card)) {
          throw new RuntimeDataError(
            'edhrec',
            'container.json_dict.card',
            'expected an object'
          )
        }
        modernDeckCount = optionalFiniteCount(
          value.container.json_dict.card.num_decks,
          'container.json_dict.card.num_decks'
        )
      }
    }
  }

  let panels: EdhrecResponse['panels']
  if (value.panels !== undefined) {
    if (!isRecord(value.panels)) {
      throw new RuntimeDataError('edhrec', 'panels', 'expected an object')
    }
    let taglinks: NonNullable<EdhrecResponse['panels']>['taglinks']
    if (value.panels.taglinks !== undefined) {
      if (!Array.isArray(value.panels.taglinks)) {
        throw new RuntimeDataError('edhrec', 'panels.taglinks', 'expected an array')
      }
      taglinks = value.panels.taglinks.flatMap((tag) => {
        if (!isRecord(tag)) return []
        return [
          {
            slug: typeof tag.slug === 'string' ? tag.slug : undefined,
            value: typeof tag.value === 'string' ? tag.value : undefined,
            count: optionalFiniteCount(tag.count, 'panels.taglinks[].count'),
          },
        ]
      })
    }
    let links: NonNullable<EdhrecResponse['panels']>['links']
    if (value.panels.links !== undefined) {
      if (!Array.isArray(value.panels.links)) {
        throw new RuntimeDataError('edhrec', 'panels.links', 'expected an array')
      }
      links = value.panels.links.flatMap((section) => {
        if (!isRecord(section)) return []
        if (section.items !== undefined && !Array.isArray(section.items)) {
          throw new RuntimeDataError(
            'edhrec',
            'panels.links[].items',
            'expected an array'
          )
        }
        return [
          {
            header: typeof section.header === 'string' ? section.header : undefined,
            items: Array.isArray(section.items)
              ? section.items.flatMap((item) =>
                  isRecord(item)
                    ? [
                        {
                          href: typeof item.href === 'string' ? item.href : undefined,
                          value: typeof item.value === 'string' ? item.value : undefined,
                        },
                      ]
                    : []
                )
              : undefined,
          },
        ]
      })
    }
    panels = { taglinks, links }
  }

  return {
    num_decks: optionalFiniteCount(value.num_decks, 'num_decks'),
    num_decks_avg: optionalFiniteCount(value.num_decks_avg, 'num_decks_avg'),
    container:
      value.container === undefined
        ? undefined
        : { json_dict: { card: { num_decks: modernDeckCount } } },
    panels,
  }
}

const extractTags = (data: EdhrecResponse): EdhrecTag[] => {
  const modernTags = (data.panels?.taglinks ?? []).reduce(
    (acc: EdhrecTag[], tag) => {
      const label = tag.value?.trim()
      if (!isValidEdhrecIdentifier(tag.slug) || !label) return acc
      const href = getSafeEdhrecUrl(`https://edhrec.com/tags/${tag.slug}`)
      if (!href) return acc
      acc.push({
        label,
        href,
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
      const label = item?.value?.trim()
      if (!item?.href || !label) return acc
      const href = getSafeEdhrecUrl(
        item.href.startsWith('http')
          ? item.href
          : `https://edhrec.com${item.href}`
      )
      if (!href) return acc
      const slugMatch = item.href.match(/\/tags\/([^/]+)/)
      const slug = isValidEdhrecIdentifier(slugMatch?.[1])
        ? slugMatch?.[1]
        : undefined
      acc.push({
        label,
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
  if (!isValidEdhrecIdentifier(slug)) {
    throw new RuntimeDataError(
      'edhrec',
      'identifier',
      'metadata is unavailable because no safe EDHREC identifier could be derived'
    )
  }
  const url = `https://json.edhrec.com/pages/commanders/${slug}.json`
  const cacheKey = cache?.key ?? url
  if (cache?.enabled) {
    const cached = getCachedValue(cacheKey, decodeEdhrecMeta)
    if (cached !== null) return cached
  }

  // Normalize the large upstream document before it reaches persistent cache.
  const data = decodeEdhrecResponse(await fetchJson<unknown>(url, { signal }))
  const modernDeckCount = data.container?.json_dict?.card?.num_decks
  const deckCount =
    typeof modernDeckCount === 'number'
      ? modernDeckCount
      : typeof data.num_decks === 'number'
        ? data.num_decks
        : typeof data.num_decks_avg === 'number'
          ? data.num_decks_avg
          : null
  const meta: EdhrecMeta = {
    deckCount,
    tags: extractTags(data),
  }
  if (cache?.enabled) {
    setCachedValue(cacheKey, meta, cache.ttlMs, cache.maxEntries)
  }
  return meta
}
