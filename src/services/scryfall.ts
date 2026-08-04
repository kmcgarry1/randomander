import { decodeScryfallCard, type ScryfallCard } from '../lib/scryfall'
import { getCachedValue, setCachedValue } from '../lib/cache'
import { fetchJson, HttpError, type CacheOptions } from './http'
import {
  RuntimeDataError,
  finiteNumber,
  isRecord,
} from '../lib/runtimeValidation'

const PAGE_SIZE = 175
const REQUEST_INTERVAL_MS = 150
const RATE_LIMIT_COOLDOWN_MS = 60_000
const SCRYFALL_ACCEPT = 'application/json;q=0.9,*/*;q=0.8'

type ScryfallFailureKind = 'data' | 'rate-limit' | 'network' | 'request'

export class ScryfallRequestError extends Error {
  readonly kind: ScryfallFailureKind
  readonly cause: unknown
  readonly recoverable = true

  constructor(message: string, kind: ScryfallFailureKind, cause?: unknown) {
    super(message)
    this.name = 'ScryfallRequestError'
    this.kind = kind
    this.cause = cause
  }
}

export const isScryfallRequestError = (
  error: unknown
): error is ScryfallRequestError => error instanceof ScryfallRequestError

let requestQueue: Promise<void> = Promise.resolve()
let nextRequestAt = 0
let cooldownUntil = 0
let cooldownError: ScryfallRequestError | null = null

const abortError = () => new DOMException('The operation was aborted.', 'AbortError')

const throwIfAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) throw abortError()
}

const wait = (durationMs: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (durationMs <= 0) {
      resolve()
      return
    }
    if (signal?.aborted) {
      reject(abortError())
      return
    }

    const timeout = window.setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort)
      resolve()
    }, durationMs)
    const handleAbort = () => {
      window.clearTimeout(timeout)
      signal?.removeEventListener('abort', handleAbort)
      reject(abortError())
    }
    signal?.addEventListener('abort', handleAbort, { once: true })
  })

const rejectWhenAborted = <T>(promise: Promise<T>, signal?: AbortSignal) => {
  if (!signal) return promise
  if (signal.aborted) return Promise.reject<T>(abortError())

  return new Promise<T>((resolve, reject) => {
    const handleAbort = () => {
      signal.removeEventListener('abort', handleAbort)
      reject(abortError())
    }
    signal.addEventListener('abort', handleAbort, { once: true })
    promise.then(
      (value) => {
        signal.removeEventListener('abort', handleAbort)
        resolve(value)
      },
      (error) => {
        signal.removeEventListener('abort', handleAbort)
        reject(error)
      }
    )
  })
}

const activeCooldownError = () => {
  if (Date.now() >= cooldownUntil) {
    cooldownUntil = 0
    cooldownError = null
    return null
  }
  return cooldownError
}

const startCooldown = (error: ScryfallRequestError, durationMs: number) => {
  cooldownError = error
  cooldownUntil = Math.max(cooldownUntil, Date.now() + durationMs)
}

const scheduleScryfallRequest = <T>(
  request: () => Promise<T>,
  signal?: AbortSignal
) => {
  const run = async () => {
    throwIfAborted(signal)
    const blocked = activeCooldownError()
    if (blocked) throw blocked

    await wait(Math.max(0, nextRequestAt - Date.now()), signal)
    throwIfAborted(signal)
    const blockedAfterWait = activeCooldownError()
    if (blockedAfterWait) throw blockedAfterWait

    nextRequestAt = Date.now() + REQUEST_INTERVAL_MS
    return request()
  }

  const scheduled = requestQueue.then(run, run)
  requestQueue = scheduled.then(
    () => undefined,
    () => undefined
  )
  return rejectWhenAborted(scheduled, signal)
}

const decodeCardResponse = (value: unknown, path = 'card') => {
  if (isRecord(value) && value.object === 'error') {
    throw new RuntimeDataError(
      'scryfall',
      path,
      typeof value.details === 'string' ? value.details : 'returned an error object'
    )
  }
  return decodeScryfallCard(value, { source: 'scryfall', path })
}

type SearchPage = { data: ScryfallCard[]; total_cards?: number }

const decodeSearchPage = (value: unknown): SearchPage => {
  if (!isRecord(value)) {
    throw new RuntimeDataError('scryfall', 'search', 'expected an object')
  }
  if (!Array.isArray(value.data)) {
    throw new RuntimeDataError('scryfall', 'search.data', 'expected an array')
  }
  let totalCards: number | undefined
  if (value.total_cards !== undefined) {
    const decodedTotal = finiteNumber(value.total_cards)
    if (
      decodedTotal === null ||
      decodedTotal < 0 ||
      !Number.isInteger(decodedTotal)
    ) {
      throw new RuntimeDataError(
        'scryfall',
        'search.total_cards',
        'expected a non-negative integer'
      )
    }
    totalCards = decodedTotal
  }
  return {
    total_cards: totalCards,
    data: value.data.map((card, index) =>
      decodeCardResponse(card, `search.data[${index}]`)
    ),
  }
}

const fetchScryfallJson = async <T>(
  url: string,
  decode: (value: unknown) => T,
  options: { signal?: AbortSignal; cache?: CacheOptions } = {}
) => {
  throwIfAborted(options.signal)
  const cacheKey = options.cache?.key ?? url
  if (options.cache?.enabled) {
    const cached = getCachedValue(cacheKey, decode)
    if (cached !== null) return cached
  }

  return scheduleScryfallRequest(async () => {
    try {
      const raw = await fetchJson<unknown>(url, {
        signal: options.signal,
        headers: { Accept: SCRYFALL_ACCEPT },
      })
      const decoded = decode(raw)
      if (options.cache?.enabled) {
        setCachedValue(
          cacheKey,
          decoded,
          options.cache.ttlMs,
          options.cache.maxEntries
        )
      }
      return decoded
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw error

      if (error instanceof RuntimeDataError) {
        throw new ScryfallRequestError(error.message, 'data', error)
      }

      if (error instanceof HttpError && error.status === 429) {
        const wrapped = new ScryfallRequestError(
          'Scryfall is rate-limiting this connection. Wait before trying again.',
          'rate-limit',
          error
        )
        startCooldown(
          wrapped,
          Math.max(RATE_LIMIT_COOLDOWN_MS, error.retryAfterMs ?? 0)
        )
        throw wrapped
      }

      if (error instanceof TypeError) {
        throw new ScryfallRequestError(
          'Scryfall could not be reached. Check your connection and try again.',
          'network',
          error
        )
      }

      throw new ScryfallRequestError(
        error instanceof Error ? error.message : 'Scryfall request failed.',
        'request',
        error
      )
    }
  }, options.signal)
}

export const fetchRandomCard = async (
  query: string,
  signal?: AbortSignal
): Promise<ScryfallCard> => {
  const url = `https://api.scryfall.com/cards/random?q=${encodeURIComponent(query)}`
  return fetchScryfallJson(url, decodeCardResponse, { signal })
}

export const fetchCardByExactName = async (
  name: string,
  signal?: AbortSignal,
  cache?: CacheOptions
): Promise<ScryfallCard> => {
  const url = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`
  return fetchScryfallJson(url, decodeCardResponse, { signal, cache })
}

const fetchSearchPage = async (
  url: string,
  signal?: AbortSignal
): Promise<SearchPage> => fetchScryfallJson(url, decodeSearchPage, { signal })

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

  const skipCount = Math.floor(totalCards * 0.1)
  const eligibleCount = totalCards - skipCount
  const globalIndex = skipCount + Math.floor(Math.random() * eligibleCount)
  const randomPage = Math.floor(globalIndex / PAGE_SIZE) + 1
  const pageIndex = globalIndex % PAGE_SIZE

  const pageData =
    randomPage === 1
      ? firstData
      : await fetchSearchPage(`${baseUrl}&page=${randomPage}`, signal)

  const card = pageData.data[pageIndex]
  if (!card) {
    throw new Error('No card found at the selected index.')
  }
  return card
}
