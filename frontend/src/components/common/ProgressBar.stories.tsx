import type { Meta, StoryObj } from '@storybook/react'
import { ProgressBar } from './ProgressBar'

/**
 * `ProgressBar` visualises a value between 0 and 100. Used for inventory
 * stock levels, baking timers, and recipe completion indicators.
 *
 * **Accessibility notes:**
 * - Uses `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
 * - `aria-label` defaults to the `label` prop or "Progress"
 * - Values outside 0–100 are clamped automatically
 */
const meta: Meta<typeof ProgressBar> = {
  title: 'Common/ProgressBar',
  component: ProgressBar,
  tags: ['autodocs'],
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 100, step: 1 } },
    color: { control: 'select', options: ['primary', 'success', 'warning', 'error'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    label: { control: 'text' },
    showPercent: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof ProgressBar>

export const Default: Story = {
  args: { value: 60 },
}

export const WithLabel: Story = {
  args: { value: 75, label: 'Flour stock', showPercent: true },
}

export const LowStock: Story = {
  args: { value: 15, label: 'Butter', showPercent: true, color: 'error' },
}

export const Success: Story = {
  args: { value: 100, label: 'Recipe complete', showPercent: true, color: 'success' },
}

export const Warning: Story = {
  args: { value: 30, label: 'Sugar', showPercent: true, color: 'warning' },
}

export const Sizes: Story = {
  render: () => (
    <div className="space-y-4 w-64">
      <ProgressBar value={60} size="sm" label="Small" showPercent />
      <ProgressBar value={60} size="md" label="Medium" showPercent />
      <ProgressBar value={60} size="lg" label="Large" showPercent />
    </div>
  ),
}
