import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorMessage } from '../ErrorMessage'

describe('ErrorMessage', () => {
  it('renders error message', () => {
    render(
      <ErrorMessage
        title="Error Title"
        message="This is an error message"
      />
    )

    expect(screen.getByText('Error Title')).toBeInTheDocument()
    expect(screen.getByText('This is an error message')).toBeInTheDocument()
  })

  it('renders with default title', () => {
    render(<ErrorMessage message="Error occurred" />)

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('displays details when provided', async () => {
    const user = userEvent.setup()

    render(
      <ErrorMessage
        message="Error message"
        details="Detailed error information"
      />
    )

    const summary = screen.getByText('Show details')
    await user.click(summary)

    expect(screen.getByText('Detailed error information')).toBeInTheDocument()
  })

  it('calls onDismiss when dismiss button clicked', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()

    render(
      <ErrorMessage
        message="Error message"
        onDismiss={onDismiss}
      />
    )

    const dismissButton = screen.getByLabelText('Dismiss')
    await user.click(dismissButton)

    expect(onDismiss).toHaveBeenCalled()
  })

  it('displays retry button when onRetry provided', () => {
    const onRetry = vi.fn()

    render(
      <ErrorMessage
        message="Error message"
        onRetry={onRetry}
      />
    )

    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument()
  })

  it('calls onRetry when retry button clicked', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()

    render(
      <ErrorMessage
        message="Error message"
        onRetry={onRetry}
      />
    )

    const retryButton = screen.getByRole('button', { name: /Retry/i })
    await user.click(retryButton)

    expect(onRetry).toHaveBeenCalled()
  })

  it('shows loading state when retrying', () => {
    render(
      <ErrorMessage
        message="Error message"
        onRetry={() => {}}
        isRetrying={true}
      />
    )

    expect(screen.getByRole('button', { name: /Retrying/i })).toBeInTheDocument()
  })

  it('disables retry button when retrying', () => {
    render(
      <ErrorMessage
        message="Error message"
        onRetry={() => {}}
        isRetrying={true}
      />
    )

    const retryButton = screen.getByRole('button', { name: /Retrying/i })
    expect(retryButton).toBeDisabled()
  })

  it('applies error variant styles', () => {
    const { container } = render(
      <ErrorMessage
        message="Error message"
        variant="error"
      />
    )

    const errorContainer = container.querySelector('.bg-red-50')
    expect(errorContainer).toBeInTheDocument()
  })

  it('applies warning variant styles', () => {
    const { container } = render(
      <ErrorMessage
        message="Warning message"
        variant="warning"
      />
    )

    const warningContainer = container.querySelector('.bg-yellow-50')
    expect(warningContainer).toBeInTheDocument()
  })

  it('applies info variant styles', () => {
    const { container } = render(
      <ErrorMessage
        message="Info message"
        variant="info"
      />
    )

    const infoContainer = container.querySelector('.bg-blue-50')
    expect(infoContainer).toBeInTheDocument()
  })

  it('does not show retry button when onRetry not provided', () => {
    render(
      <ErrorMessage
        message="Error message"
        onDismiss={() => {}}
      />
    )

    expect(screen.queryByRole('button', { name: /Retry/i })).not.toBeInTheDocument()
  })

  it('does not show dismiss button when onDismiss not provided', () => {
    render(
      <ErrorMessage
        message="Error message"
        onRetry={() => {}}
      />
    )

    expect(screen.queryByLabelText('Dismiss')).not.toBeInTheDocument()
  })

  it('renders both retry and dismiss buttons', () => {
    render(
      <ErrorMessage
        message="Error message"
        onRetry={() => {}}
        onDismiss={() => {}}
      />
    )

    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Dismiss/i })).toBeInTheDocument()
  })
})
