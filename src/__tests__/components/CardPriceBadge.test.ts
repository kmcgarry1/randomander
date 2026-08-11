import { render, screen } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import CardPriceBadge from '../../features/draw/components/CardPriceBadge.vue'
import type { ScryfallCard } from '../../lib/scryfall'

const createCard = (overrides: Partial<ScryfallCard> = {}): ScryfallCard => ({
  id: 'price-card',
  name: 'Atraxa, Praetors Voice',
  scryfall_uri: 'https://scryfall.com/card/example/atraxa',
  ...overrides,
})

describe('CardPriceBadge', () => {
  it('labels a foil fallback when no regular Cardmarket price exists', () => {
    render(CardPriceBadge, {
      props: {
        card: createCard({ prices: { eur: null, eur_foil: '4.20' } }),
        provider: 'cardmarket',
      },
    })

    expect(screen.getByText('€4.20')).toBeInTheDocument()
    expect(screen.getByText('· foil')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('labels an etched fallback and links it when a purchase URI exists', () => {
    render(CardPriceBadge, {
      props: {
        card: createCard({
          prices: { usd: null, usd_foil: null, usd_etched: '5.50' },
          purchase_uris: { tcgplayer: 'https://www.tcgplayer.com/product/example' },
        }),
        provider: 'tcgplayer',
      },
    })

    expect(
      screen.getByRole('link', {
        name: /tcgplayer price for atraxa.*\$5\.50, etched \(opens in a new tab\)/i,
      })
    ).toHaveAttribute('href', 'https://www.tcgplayer.com/product/example')
    expect(screen.getByText('· etched')).toBeInTheDocument()
  })

  it('renders nothing when the selected marketplace has no usable price', () => {
    const { container } = render(CardPriceBadge, {
      props: {
        card: createCard({ prices: { usd: '2.50' } }),
        provider: 'cardmarket',
      },
    })

    expect(container).toBeEmptyDOMElement()
  })

  it('renders an untrusted purchase URI as non-link price text', () => {
    render(CardPriceBadge, {
      props: {
        card: createCard({
          prices: { eur: '1.25' },
          purchase_uris: { cardmarket: 'javascript:alert(1)' },
        }),
        provider: 'cardmarket',
      },
    })

    expect(screen.getByText('€1.25')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it.each([
    {
      label: 'the purchase URI is absent',
      showLink: true,
      purchase_uris: undefined,
    },
    {
      label: 'external links are disabled',
      showLink: false,
      purchase_uris: { cardmarket: 'https://www.cardmarket.com/example' },
    },
  ])('keeps the price as text when $label', ({ showLink, purchase_uris }) => {
    render(CardPriceBadge, {
      props: {
        card: createCard({ prices: { eur: '1.25' }, purchase_uris }),
        provider: 'cardmarket',
        showLink,
      },
    })

    expect(screen.getByText('€1.25')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
