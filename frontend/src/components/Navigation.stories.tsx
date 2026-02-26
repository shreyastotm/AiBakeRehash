import type { Meta, StoryObj } from '@storybook/react'
import { Navigation } from './Navigation'

/**
 * `Navigation` is the sticky top nav bar. It adapts between authenticated
 * and unauthenticated states and collapses to a hamburger menu on mobile.
 *
 * **Accessibility notes:**
 * - `<nav>` has `aria-label="Main navigation"`
 * - Active link has `aria-current="page"`
 * - Mobile toggle button has `aria-expanded` and `aria-controls`
 * - Logo link has `aria-label="AiBake home"`
 * - All interactive elements meet 44px minimum touch target
 *
 * **Note:** Stories use `localStorage` to simulate auth state.
 * The `Authenticated` story sets a fake token; `Unauthenticated` clears it.
 */
const meta: Meta<typeof Navigation> = {
  title: 'Navigation/Navigation',
  component: Navigation,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta
type Story = StoryObj<typeof Navigation>

export const Authenticated: Story = {
  beforeEach: () => {
    localStorage.setItem('auth_token', 'fake-token-for-storybook')
  },
}

export const Unauthenticated: Story = {
  beforeEach: () => {
    localStorage.removeItem('auth_token')
  },
}
