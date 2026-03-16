import { render, screen } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import LoadingOverlay from '../../components/layout/LoadingOverlay.vue'

describe('LoadingOverlay', () => {
  it('shows loading overlay when isLoading is true', () => {
    render(LoadingOverlay, {
      props: {
        isLoading: true,
      },
    })

    const loadingOverlay = screen.getByRole('status', { name: /loading cards/i })
    expect(loadingOverlay).toBeInTheDocument()
    expect(loadingOverlay).toHaveAttribute('aria-label', 'Loading cards')
    expect(loadingOverlay).toHaveTextContent(/shuffling cards/i)
  })

  it('hides loading overlay when isLoading is false', () => {
    render(LoadingOverlay, {
      props: {
        isLoading: false,
      },
    })

    const loadingOverlay = screen.queryByRole('status')
    expect(loadingOverlay).not.toBeInTheDocument()
  })
})
