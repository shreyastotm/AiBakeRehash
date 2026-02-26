import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormRecoveryBanner } from '../FormRecoveryBanner'

describe('FormRecoveryBanner', () => {
  it('does not render when timestamp is null', () => {
    const { container } = render(
      <FormRecoveryBanner
        timestamp={null}
        onRestore={() => {}}
        onDiscard={() => {}}
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it('renders recovery banner with timestamp', () => {
    const timestamp = new Date().toISOString()

    render(
      <FormRecoveryBanner
        timestamp={timestamp}
        onRestore={() => {}}
        onDiscard={() => {}}
      />
    )

    expect(screen.getByText('Recovered form data')).toBeInTheDocument()
    expect(screen.getByText(/We found your unsaved changes/)).toBeInTheDocument()
  })

  it('displays time ago for recent recovery', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60000).toISOString()

    render(
      <FormRecoveryBanner
        timestamp={fiveMinutesAgo}
        onRestore={() => {}}
        onDiscard={() => {}}
      />
    )

    expect(screen.getByText(/5 minutes ago/)).toBeInTheDocument()
  })

  it('displays hour ago for older recovery', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3600000).toISOString()

    render(
      <FormRecoveryBanner
        timestamp={twoHoursAgo}
        onRestore={() => {}}
        onDiscard={() => {}}
      />
    )

    expect(screen.getByText(/2 hours ago/)).toBeInTheDocument()
  })

  it('displays day ago for old recovery', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString()

    render(
      <FormRecoveryBanner
        timestamp={threeDaysAgo}
        onRestore={() => {}}
        onDiscard={() => {}}
      />
    )

    expect(screen.getByText(/3 days ago/)).toBeInTheDocument()
  })

  it('calls onRestore when Restore button clicked', async () => {
    const user = userEvent.setup()
    const onRestore = vi.fn()
    const timestamp = new Date().toISOString()

    render(
      <FormRecoveryBanner
        timestamp={timestamp}
        onRestore={onRestore}
        onDiscard={() => {}}
      />
    )

    const restoreButton = screen.getByRole('button', { name: /Restore/i })
    await user.click(restoreButton)

    expect(onRestore).toHaveBeenCalled()
  })

  it('calls onDiscard when Discard button clicked', async () => {
    const user = userEvent.setup()
    const onDiscard = vi.fn()
    const timestamp = new Date().toISOString()

    render(
      <FormRecoveryBanner
        timestamp={timestamp}
        onRestore={() => {}}
        onDiscard={onDiscard}
      />
    )

    const discardButton = screen.getByRole('button', { name: /Discard/i })
    await user.click(discardButton)

    expect(onDiscard).toHaveBeenCalled()
  })

  it('hides banner when close button clicked', async () => {
    const user = userEvent.setup()
    const timestamp = new Date().toISOString()

    const { container } = render(
      <FormRecoveryBanner
        timestamp={timestamp}
        onRestore={() => {}}
        onDiscard={() => {}}
      />
    )

    expect(screen.getByText('Recovered form data')).toBeInTheDocument()

    const closeButton = screen.getByLabelText('Dismiss')
    await user.click(closeButton)

    expect(container.firstChild).toBeNull()
  })

  it('hides banner after discard action', async () => {
    const user = userEvent.setup()
    const timestamp = new Date().toISOString()

    const { container } = render(
      <FormRecoveryBanner
        timestamp={timestamp}
        onRestore={() => {}}
        onDiscard={() => {}}
      />
    )

    const discardButton = screen.getByRole('button', { name: /Discard/i })
    await user.click(discardButton)

    expect(container.firstChild).toBeNull()
  })

  it('displays "just now" for very recent recovery', () => {
    const justNow = new Date(Date.now() - 30000).toISOString()

    render(
      <FormRecoveryBanner
        timestamp={justNow}
        onRestore={() => {}}
        onDiscard={() => {}}
      />
    )

    expect(screen.getByText(/just now/)).toBeInTheDocument()
  })

  it('displays singular "minute" for single minute ago', () => {
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString()

    render(
      <FormRecoveryBanner
        timestamp={oneMinuteAgo}
        onRestore={() => {}}
        onDiscard={() => {}}
      />
    )

    expect(screen.getByText(/1 minute ago/)).toBeInTheDocument()
  })

  it('displays singular "hour" for single hour ago', () => {
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString()

    render(
      <FormRecoveryBanner
        timestamp={oneHourAgo}
        onRestore={() => {}}
        onDiscard={() => {}}
      />
    )

    expect(screen.getByText(/1 hour ago/)).toBeInTheDocument()
  })

  it('displays singular "day" for single day ago', () => {
    const oneDayAgo = new Date(Date.now() - 86400000).toISOString()

    render(
      <FormRecoveryBanner
        timestamp={oneDayAgo}
        onRestore={() => {}}
        onDiscard={() => {}}
      />
    )

    expect(screen.getByText(/1 day ago/)).toBeInTheDocument()
  })
})
