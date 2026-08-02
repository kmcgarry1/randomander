import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchCommanderMeta } from '../../services/edhrec'

const mockResponse = (payload: unknown) =>
  ({
    ok: true,
    json: async () => payload,
  }) as Response

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
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
})
