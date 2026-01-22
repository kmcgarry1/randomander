import type { ScryfallCard } from '../lib/scryfall'
import { fetchJson, type CacheOptions } from './http'

const PAGE_SIZE = 175

export const fetchRandomCard = async (
  query: string,
  signal?: AbortSignal
): Promise<ScryfallCard> => {
  const url = `https://api.scryfall.com/cards/random?q=${encodeURIComponent(query)}`
  const data = await fetchJson<ScryfallCard>(url, { signal })
  if ((data as { object?: string }).object === 'error') {
    throw new Error((data as { details?: string }).details ?? 'Scryfall returned an error.')
  }
  return data
}

export const fetchCardByExactName = async (
  name: string,
  signal?: AbortSignal,
  cache?: CacheOptions
): Promise<ScryfallCard> => {
  const url = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`
  const data = await fetchJson<ScryfallCard>(url, { signal, cache })
  if ((data as { object?: string }).object === 'error') {
    throw new Error((data as { details?: string }).details ?? 'Scryfall returned an error.')
  }
  return data
}

const fetchSearchPage = async (
  url: string,
  signal?: AbortSignal
): Promise<{ data: ScryfallCard[]; total_cards?: number }> =>
  fetchJson(url, { signal })

export const fetchRankedRandomCard = async (
  query: string,
  signal?: AbortSignal
): Promise<ScryfallCard> => {
  const baseUrl = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=edhrec&dir=asc`
  const firstData = await fetchSearchPage(baseUrl, signal)
  const totalCards = firstData.total_cards ?? firstData.data.length
  if (!totalCards || totalCards <= 0) {
    throw new Error('No cards available for this filter.')
  }

  const totalPages = Math.max(1, Math.ceil(totalCards / PAGE_SIZE))
  const skipCount = Math.floor(totalCards * 0.1)
  let startPage = Math.floor(skipCount / PAGE_SIZE) + 1
  let startIndex = skipCount % PAGE_SIZE
  if (startPage > totalPages) {
    startPage = totalPages
    startIndex = 0
  }

  const randomPage =
    totalPages === startPage
      ? startPage
      : startPage + Math.floor(Math.random() * (totalPages - startPage + 1))

  const pageData =
    randomPage === 1
      ? firstData
      : await fetchSearchPage(`${baseUrl}&page=${randomPage}`, signal)

  let lowerBound = randomPage === startPage ? startIndex : 0
  if (lowerBound >= pageData.data.length) {
    lowerBound = 0
  }

  const index =
    lowerBound +
    Math.floor(Math.random() * Math.max(1, pageData.data.length - lowerBound))

  return pageData.data[index]
}
