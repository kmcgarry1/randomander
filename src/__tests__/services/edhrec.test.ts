import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchCommanderMeta } from '../../services/edhrec'
import { clearCache, setCachedValue } from '../../lib/cache'

const mockResponse = (payload: unknown) =>
  ({
    ok: true,
    json: async () => payload,
  }) as Response

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

beforeEach(() => {
  localStorage.clear()
  clearCache()
})

describe('EDHREC commander metadata', () => {
  it('reads the modern deck count and returns only the first four modern themes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        mockResponse({
          num_decks: 1,
          container: {
            json_dict: {
              card: { num_decks: 43_271 },
            },
          },
          panels: {
            taglinks: [
              { slug: 'infect', value: 'Infect', count: 4_642 },
              { slug: 'planeswalkers', value: 'Planeswalkers', count: 2_571 },
              {
                slug: 'plus-1-plus-1-counters',
                value: '+1/+1 Counters',
                count: 2_408,
              },
              { slug: 'proliferate', value: 'Proliferate', count: 1_330 },
              { slug: 'phyrexians', value: 'Phyrexians', count: 1_270 },
            ],
            links: [
              {
                header: 'Tags',
                items: [{ href: '/tags/legacy/example', value: 'Legacy' }],
              },
            ],
          },
        })
      )
    )

    await expect(fetchCommanderMeta('atraxa-praetors-voice')).resolves.toEqual({
      deckCount: 43_271,
      tags: [
        {
          label: 'Infect',
          href: 'https://edhrec.com/tags/infect',
          slug: 'infect',
          count: 4_642,
        },
        {
          label: 'Planeswalkers',
          href: 'https://edhrec.com/tags/planeswalkers',
          slug: 'planeswalkers',
          count: 2_571,
        },
        {
          label: '+1/+1 Counters',
          href: 'https://edhrec.com/tags/plus-1-plus-1-counters',
          slug: 'plus-1-plus-1-counters',
          count: 2_408,
        },
        {
          label: 'Proliferate',
          href: 'https://edhrec.com/tags/proliferate',
          slug: 'proliferate',
          count: 1_330,
        },
      ],
    })
  })

  it('falls back to legacy theme links and top-level deck count', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        mockResponse({
          num_decks: 500,
          panels: {
            links: [
              {
                header: 'Tags',
                items: [
                  {
                    href: '/tags/infect/atraxa-praetors-voice',
                    value: 'Infect',
                  },
                ],
              },
            ],
            taglinks: [{ slug: 'infect', count: 1_000 }],
          },
        })
      )
    )

    await expect(fetchCommanderMeta('atraxa-praetors-voice')).resolves.toEqual({
      deckCount: 500,
      tags: [
        {
          label: 'Infect',
          href: 'https://edhrec.com/tags/infect/atraxa-praetors-voice',
          slug: 'infect',
          count: 1_000,
        },
      ],
    })
  })

  it('retains the legacy average deck-count fallback', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(mockResponse({ num_decks_avg: 275 }))
    )

    await expect(fetchCommanderMeta('legacy-commander')).resolves.toEqual({
      deckCount: 275,
      tags: [],
    })
  })

  it('caches only normalized metadata instead of the upstream document', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockResponse({
        container: { json_dict: { card: { num_decks: 12_345 } } },
        panels: {
          taglinks: [{ slug: 'tokens', value: 'Tokens', count: 100 }],
          large_unused_payload: 'x'.repeat(100_000),
        },
      })
    )
    vi.stubGlobal('fetch', fetchMock)
    const cache = { enabled: true, ttlMs: 60_000, maxEntries: 10 }

    await expect(fetchCommanderMeta('test-commander', undefined, cache)).resolves.toEqual({
      deckCount: 12_345,
      tags: [
        {
          label: 'Tokens',
          href: 'https://edhrec.com/tags/tokens',
          slug: 'tokens',
          count: 100,
        },
      ],
    })
    await fetchCommanderMeta('test-commander', undefined, cache)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const persisted = localStorage.getItem('randomander:cache:v1') ?? ''
    expect(persisted).toContain('"deckCount":12345')
    expect(persisted).not.toContain('large_unused_payload')
    expect(new TextEncoder().encode(persisted).byteLength).toBeLessThan(2_000)
  })

  it.each([
    ['non-object root', []],
    ['empty object', {}],
    ['wrong panel collection', { panels: { taglinks: 'not-an-array' } }],
    ['fractional deck count', { num_decks: 1.5 }],
  ])('returns a typed recoverable error for %s', async (_name, payload) => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse(payload))
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchCommanderMeta('invalid-fixture')).rejects.toMatchObject({
      name: 'RuntimeDataError',
      source: 'edhrec',
      recoverable: true,
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('drops malformed and deceptive upstream tag links before caching', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        mockResponse({
          num_decks: 100,
          panels: {
            taglinks: [
              { slug: '../../escape', value: 'Escape', count: 5 },
            ],
            links: [
              {
                header: 'Tags',
                items: [
                  { href: 'https://evil.example/tags/phishing', value: 'Phishing' },
                  { href: 'http://edhrec.com/tags/insecure', value: 'Insecure' },
                  { href: '/tags/tokens/example', value: 'Tokens' },
                  { href: '/tags/blank', value: '   ' },
                ],
              },
            ],
          },
        })
      )
    )

    await expect(fetchCommanderMeta('safe-tags')).resolves.toEqual({
      deckCount: 100,
      tags: [
        {
          label: 'Tokens',
          href: 'https://edhrec.com/tags/tokens/example',
          slug: 'tokens',
          count: undefined,
        },
      ],
    })
  })

  it('evicts malformed cached metadata and recovers from the network', async () => {
    const cache = {
      enabled: true,
      ttlMs: 60_000,
      maxEntries: 10,
      key: 'malformed-edhrec-cache',
    }
    setCachedValue(
      cache.key,
      {
        deckCount: 100,
        tags: [{ label: 'Unsafe', href: 'https://evil.example/tags/unsafe' }],
      },
      cache.ttlMs,
      cache.maxEntries
    )
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({ num_decks: 42 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      fetchCommanderMeta('recovered-cache', undefined, cache)
    ).resolves.toEqual({ deckCount: 42, tags: [] })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it.each(['', '東京', '../escape', '-leading']) (
    'rejects unavailable metadata identifier %j without a request',
    async (identifier) => {
      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)

      await expect(fetchCommanderMeta(identifier)).rejects.toMatchObject({
        name: 'RuntimeDataError',
        source: 'edhrec',
        path: 'identifier',
        recoverable: true,
      })
      expect(fetchMock).not.toHaveBeenCalled()
    }
  )
})
