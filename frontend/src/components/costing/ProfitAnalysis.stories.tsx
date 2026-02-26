import type { Meta, StoryObj } from '@storybook/react'
import type { ComponentType } from 'react'
import { ProfitAnalysis } from './ProfitAnalysis'
import type { ProfitData } from './ProfitAnalysis'

/**
 * `ProfitAnalysis` gives a high-level view of profitability: cost vs revenue,
 * margin visualised as a progress bar, and optional monthly profit projection.
 *
 * **Accessibility notes:**
 * - Metric cards use `<dl>` / `<dt>` / `<dd>` for semantic key-value pairs
 * - Margin progress bar has `role="progressbar"` with `aria-valuenow`
 * - Low-margin warning uses `role="alert"` for immediate announcement
 * - Monthly projection section is visually distinct and screen-reader readable
 */
const meta: Meta<typeof ProfitAnalysis> = {
  title: 'Costing/ProfitAnalysis',
  component: ProfitAnalysis,
  tags: ['autodocs'],
  decorators: [(Story: ComponentType) => <div className="w-80"><Story /></div>],
}

export default meta
type Story = StoryObj<typeof ProfitAnalysis>

const base: ProfitData = {
  recipe_name: 'Eggless Chocolate Cake',
  total_cost: 215.75,
  selling_price_per_serving: 80,
  servings: 8,
}

export const HealthyMargin: Story = {
  args: { data: base },
}

export const WithMonthlyProjection: Story = {
  args: { data: { ...base, units_sold_per_month: 60 } },
}

export const LowMargin: Story = {
  args: {
    data: {
      recipe_name: 'Premium Truffle Cake',
      total_cost: 615,
      selling_price_per_serving: 110,
      servings: 6,
    },
  },
}

export const HighVolume: Story = {
  args: {
    data: {
      recipe_name: 'Butter Cookies (Batch of 48)',
      total_cost: 480,
      selling_price_per_serving: 25,
      servings: 48,
      units_sold_per_month: 200,
    },
  },
}
