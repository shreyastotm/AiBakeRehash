import type { Meta, StoryObj } from '@storybook/react'
import { EmptyState } from './EmptyState'

/**
 * `EmptyState` is shown when a list or section has no content yet.
 * It can include an icon, description, and a primary call-to-action.
 *
 * **Accessibility notes:**
 * - Container has `role="status"` so screen readers announce the empty state
 * - Action button meets 44px minimum touch target
 * - Default icon is `aria-hidden` (decorative)
 */
const meta: Meta<typeof EmptyState> = {
  title: 'Common/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text' },
    description: { control: 'text' },
  },
}

export default meta
type Story = StoryObj<typeof EmptyState>

export const Default: Story = {
  args: {
    title: 'No recipes yet',
    description: 'Create your first recipe to get started.',
  },
}

export const WithAction: Story = {
  args: {
    title: 'No recipes yet',
    description: 'Start building your recipe collection.',
    action: { label: 'Create Recipe', onClick: () => {} },
  },
}

export const CustomIcon: Story = {
  args: {
    title: 'Inventory is empty',
    description: 'Add ingredients to track your stock levels.',
    icon: <span className="text-5xl" aria-hidden="true">🧂</span>,
    action: { label: 'Add Ingredient', onClick: () => {} },
  },
}

export const NoDescription: Story = {
  args: {
    title: 'No journal entries',
    action: { label: 'Log a Bake', onClick: () => {} },
  },
}
