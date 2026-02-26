import type { Meta, StoryObj } from '@storybook/react'
import { LoadingSpinner } from './LoadingSpinner'

/**
 * `LoadingSpinner` indicates async activity. The `fullScreen` variant overlays
 * the entire viewport — used during initial page loads.
 *
 * **Accessibility notes:**
 * - Spinner element has `role="status"` and `aria-label`
 * - Optional visible label provides additional context
 * - Decorative animation is `aria-hidden` on the SVG path
 */
const meta: Meta<typeof LoadingSpinner> = {
  title: 'Common/LoadingSpinner',
  component: LoadingSpinner,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    label: { control: 'text', description: 'Visible label shown below the spinner' },
    fullScreen: { control: 'boolean', description: 'Overlays the full viewport' },
  },
}

export default meta
type Story = StoryObj<typeof LoadingSpinner>

export const Default: Story = {
  args: { size: 'md' },
}

export const WithLabel: Story = {
  args: { size: 'md', label: 'Loading recipes…' },
}

export const Small: Story = {
  args: { size: 'sm', label: 'Saving' },
}

export const Large: Story = {
  args: { size: 'lg', label: 'Calculating costs…' },
}
