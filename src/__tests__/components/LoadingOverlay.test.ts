import { render, screen, waitFor, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import LoadingOverlay from '../../components/layout/LoadingOverlay.vue'

describe('LoadingOverlay', () => {
  it('presents one named modal announcement and focuses Cancel', async () => {
    const { emitted } = render(LoadingOverlay, {
      props: {
        isLoading: true,
      },
    })
    const user = userEvent.setup()

    const loadingOverlay = screen.getByRole('dialog', {
      name: /shuffling cards/i,
    })
    expect(loadingOverlay).toBeInTheDocument()
    expect(loadingOverlay).toHaveAttribute('aria-modal', 'true')
    expect(loadingOverlay).not.toHaveAttribute('aria-live')
    expect(loadingOverlay).toHaveTextContent(/shuffling cards/i)
    const cancel = within(loadingOverlay).getByRole('button', {
      name: /cancel draw/i,
    })
    await waitFor(() => expect(cancel).toHaveFocus())

    await user.click(cancel)
    expect(emitted().cancel).toHaveLength(1)
  })

  it('hides loading overlay when isLoading is false', () => {
    render(LoadingOverlay, {
      props: {
        isLoading: false,
      },
    })

    const loadingOverlay = screen.queryByRole('dialog')
    expect(loadingOverlay).not.toBeInTheDocument()
  })
})
