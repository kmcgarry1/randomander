import { describe, expect, it } from 'vitest'
import {
  getCardPrice,
  getSafeEdhrecUrl,
  getSafeScryfallUrl,
  type ScryfallCard,
} from '../../lib/scryfall'

const cardWithUrl = (scryfall_uri: string): ScryfallCard => ({
  id: 'persisted-card',
  name: 'Persisted Card',
  scryfall_uri,
})

describe('external navigation allowlists', () => {
  it('allows expected HTTPS Scryfall and EDHREC hosts', () => {
    expect(
      getSafeScryfallUrl(cardWithUrl('https://scryfall.com/card/c21/1/example'))
    ).toBe('https://scryfall.com/card/c21/1/example')
    expect(getSafeEdhrecUrl('https://www.edhrec.com/commanders/example')).toBe(
      'https://www.edhrec.com/commanders/example'
    )
  })

  it.each([
    'javascript:alert(1)',
    'data:text/html,unsafe',
    '//scryfall.com/card/example',
    'http://scryfall.com/card/example',
    'https://scryfall.com.evil.test/card/example',
    'https://scryfall.com@evil.test/card/example',
    'https://user:password@scryfall.com/card/example',
    'https://scryfall.com:444/card/example',
    'not a URL',
  ])('rejects an unsafe persisted Scryfall URL: %s', (url) => {
    expect(getSafeScryfallUrl(cardWithUrl(url))).toBeNull()
  })

  it.each([
    'javascript:alert(1)',
    'https://edhrec.com.evil.test/commanders/example',
    'https://user@edhrec.com/commanders/example',
    'https://edhrec.com:8443/commanders/example',
  ])('rejects an unsafe EDHREC URL: %s', (url) => {
    expect(getSafeEdhrecUrl(url)).toBeNull()
  })

  it('allows the expected TCGplayer affiliate host', () => {
    const price = getCardPrice(
      {
        ...cardWithUrl('https://scryfall.com/card/example'),
        prices: { usd: '2.50' },
        purchase_uris: { tcgplayer: 'https://tcgplayer.pxf.io/c/example' },
      },
      'tcgplayer'
    )

    expect(price?.purchaseUrl).toBe('https://tcgplayer.pxf.io/c/example')
  })

  it('retains a price but removes an untrusted marketplace link', () => {
    const price = getCardPrice(
      {
        ...cardWithUrl('https://scryfall.com/card/example'),
        prices: { eur: '3.75' },
        purchase_uris: { cardmarket: 'https://evil.test/steal' },
      },
      'cardmarket'
    )

    expect(price).toMatchObject({ formatted: '€3.75', purchaseUrl: null })
  })
})
