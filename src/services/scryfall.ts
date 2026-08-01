import type { ScryfallCard } from '../lib/scryfall'
import { getCachedValue } from '../lib/cache'
import { fetchJson, HttpError, type CacheOptions } from './http'

const PAGE_SIZE = 175
const REQUEST_INTERVAL_MS = 150
const RATE_LIMIT_COOLDOWN_MS = 60_000
const NETWORK_COOLDOWN_MS = 60_000
const SCRYFALL_ACCEPT = 'application/json;q=0.9,*/*;q=0.8'

type ScryfallFailureKind = 'rate-limit' | 'network' | 'request'

export class ScryfallRequestError extends Error {
  readonly kind: ScryfallFailureKind
  readonly cause: unknown

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

const fetchScryfallJson = async <T>(
  url: string,
  options: { signal?: AbortSignal; cache?: CacheOptions } = {}
) => {
  throwIfAborted(options.signal)
  if (options.cache?.enabled) {
    const cached = getCachedValue<T>(options.cache.key ?? url)
    if (cached !== null) return cached
  }

  return scheduleScryfallRequest(async () => {
    try {
      return await fetchJson<T>(url, {
        ...options,
        headers: { Accept: SCRYFALL_ACCEPT },
      })
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw error

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
        const wrapped = new ScryfallRequestError(
          'Scryfall could not be reached. It may be rate-limiting this connection; wait before trying again and check your connection.',
          'network',
          error
        )
        startCooldown(wrapped, NETWORK_COOLDOWN_MS)
        throw wrapped
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
  const data = await fetchScryfallJson<ScryfallCard>(url, { signal })
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
  const data = await fetchScryfallJson<ScryfallCard>(url, { signal, cache })
  if ((data as { object?: string }).object === 'error') {
    throw new Error((data as { details?: string }).details ?? 'Scryfall returned an error.')
  }
  return data
}

const fetchSearchPage = async (
  url: string,
  signal?: AbortSignal
): Promise<{ data: ScryfallCard[]; total_cards?: number }> =>
  fetchScryfallJson(url, { signal })

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

  const card = pageData.data[index]
  if (!card) {
    throw new Error('No card found at the selected index.')
  }
  return card
}
