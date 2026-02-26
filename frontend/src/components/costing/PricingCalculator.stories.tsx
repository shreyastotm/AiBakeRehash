import type { Meta, StoryObj } from '@storybook/react'
import type { ComponentType } from 'react'
import { PricingCalculator } from './PricingCalculator'

/**
 * `PricingCalculator` helps bakers set a selling price based on a target
 * profit margin or a custom price. Suggested price and effective margin
 * update live as inputs change.
 *
 * **Accessibility notes:**
 * - All inputs have associated labels
 * - Hint text is linked via `aria-describedby` (via `Input` component)
 * - Summary values use `<dl>` / `<dt>` / `<dd>` for semantic structure
 * - Recommended price is visually prominent and readable by screen readers
 */
const meta: Meta<typeof PricingCalculator> = {
  title: 'Costing/PricingCalculator',
  component: PricingCalculator,
  tags: ['autodocs'],
  decorators: [(Story: ComponentType) => <div className="w-80"><Story /></div>],
  argTypes: {
    totalCost: { control: { type: 'number', min: 0, step: 10 } },
    servings: { control: { type: 'number', min: 1 } },
  },
}

export default meta
type Story = StoryObj<typeof PricingCalculator>

export const Default: Story = {
  args: { totalCost: 215.75, servings: 8 },
}

export const HighCostRecipe: Story = {
  args: { totalCost: 615, servings: 6 },
}

export const LargeBatch: Story = {
  args: { totalCost: 1800, servings: 48 },
}
