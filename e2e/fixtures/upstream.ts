import type { Page } from '@playwright/test'
import type { ScryfallCard } from '../../src/lib/scryfall'

type CardResponse = {
  kind: 'card'
  card: ScryfallCard
  delayMs?: number
}

type ErrorResponse = {
  kind: 'error'
  status: number
  delayMs?: number
  retryAfter?: string
}

export type PlannedScryfallResponse = CardResponse | ErrorResponse

export type MockedUpstream = {
  scryfallRequests: string[]
  edhrecRequests: string[]
  externalAssetRequests: string[]
  unexpectedExternalRequests: string[]
  remainingScryfallResponses: () => number
}

const svgDataUrl = (label: string, hue: number) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 680"><rect width="488" height="680" rx="28" fill="hsl(${hue} 45% 28%)"/><rect x="24" y="24" width="440" height="632" rx="20" fill="none" stroke="white" stroke-width="8"/><text x="244" y="340" fill="white" font-family="sans-serif" font-size="34" text-anchor="middle">${label}</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const idFor = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export const createCard = (
  name: string,
  overrides: Partial<ScryfallCard> = {},
): ScryfallCard => {
  const id = overrides.id ?? idFor(name)
  return {
    id,
    oracle_id: `${id}-oracle`,
    name,
    scryfall_uri: `https://scryfall.com/card/e2e/${id}`,
    type_line: 'Legendary Creature — Test Pilot',
    oracle_text: 'A deterministic browser-test fixture.',
    color_identity: [],
    image_uris: {
      normal: svgDataUrl(name, (id.length * 37) % 360),
    },
    ...overrides,
  }
}

export const createDoubleFacedCard = (
  id: string,
  frontName: string,
  backName: string,
): ScryfallCard =>
  createCard(`${frontName} // ${backName}`, {
    id,
    layout: 'modal_dfc',
    image_uris: undefined,
    card_faces: [
      {
        name: frontName,
        type_line: 'Legendary Creature — Test Front',
        oracle_text: 'Front-face browser fixture.',
        image_uris: { normal: svgDataUrl(frontName, 215) },
      },
      {
        name: backName,
        type_line: 'Legendary Planeswalker — Test Back',
        oracle_text: 'Back-face browser fixture.',
        image_uris: { normal: svgDataUrl(backName, 325) },
      },
    ],
  })

export const cardResponse = (
  card: ScryfallCard,
  delayMs?: number,
): PlannedScryfallResponse => ({ kind: 'card', card, delayMs })

export const errorResponse = (
  status: number,
  retryAfter?: string,
): PlannedScryfallResponse => ({ kind: 'error', status, retryAfter })

const sleep = (durationMs: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, durationMs))

const jsonBody = (value: unknown) => JSON.stringify(value)

const isLocalRequest = (url: URL) =>
  url.hostname === '127.0.0.1' || url.hostname === 'localhost'

export const installMockedUpstream = async (
  page: Page,
  responses: PlannedScryfallResponse[],
): Promise<MockedUpstream> => {
  const queue = [...responses]
  const scryfallRequests: string[] = []
  const edhrecRequests: string[] = []
  const externalAssetRequests: string[] = []
  const unexpectedExternalRequests: string[] = []

  await page.route('**/*', async (route) => {
    const requestUrl = route.request().url()
    const url = new URL(requestUrl)

    if (isLocalRequest(url)) {
      await route.continue()
      return
    }

    if (url.hostname === 'api.scryfall.com') {
      scryfallRequests.push(requestUrl)
      const planned = queue.shift()
      if (!planned) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: jsonBody({ object: 'error', details: 'Mock Scryfall queue exhausted.' }),
        })
        return
      }
      if (planned.delayMs) await sleep(planned.delayMs)
      if (planned.kind === 'card') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: jsonBody(planned.card),
        })
        return
      }
      await route.fulfill({
        status: planned.status,
        headers: planned.retryAfter
          ? { 'Retry-After': planned.retryAfter }
          : undefined,
        contentType: 'application/json',
        body: jsonBody({ object: 'error', details: `Mock failure ${planned.status}.` }),
      })
      return
    }

    if (url.hostname === 'json.edhrec.com') {
      edhrecRequests.push(requestUrl)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: jsonBody({
          container: { json_dict: { card: { num_decks: 321 } } },
          panels: {
            taglinks: [
              { slug: 'browser-tested', value: 'Browser tested', count: 42 },
            ],
          },
        }),
      })
      return
    }

    if (url.hostname === 'svgs.scryfall.io' || url.hostname === 'cards.scryfall.io') {
      externalAssetRequests.push(requestUrl)
      await route.fulfill({
        status: 200,
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="#777"/></svg>',
      })
      return
    }

    if (url.hostname === 'fonts.googleapis.com') {
      externalAssetRequests.push(requestUrl)
      await route.fulfill({ status: 200, contentType: 'text/css', body: '' })
      return
    }

    if (
      url.hostname === 'fonts.gstatic.com' ||
      url.hostname === 'va.vercel-scripts.com' ||
      url.hostname === 'vitals.vercel-insights.com'
    ) {
      externalAssetRequests.push(requestUrl)
      await route.fulfill({ status: 204, body: '' })
      return
    }

    unexpectedExternalRequests.push(requestUrl)
    await route.abort('blockedbyclient')
  })

  return {
    scryfallRequests,
    edhrecRequests,
    externalAssetRequests,
    unexpectedExternalRequests,
    remainingScryfallResponses: () => queue.length,
  }
}
