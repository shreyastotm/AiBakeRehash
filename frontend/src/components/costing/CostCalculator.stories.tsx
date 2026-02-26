import type { Meta, StoryObj } from '@storybook/react'
import type { ComponentType } from 'react'
import { CostCalculator } from './CostCalculator'
import type { CostBreakdown } from './CostCalculator'

/**
 * `CostCalculator` displays a full cost breakdown for a recipe — ingredient
 * costs, overhead, packaging, labour, and per-serving cost — all in INR.
 *
 * **Accessibility notes:**
 * - Ingredient and other-cost sections use `<section>` with `aria-label`
 * - Lists use `role="list"` / `role="listitem"`
 * - Currency values are formatted for Indian locale (en-IN)
 */
const meta: Meta<typeof CostCalculator> = {
  title: 'Costing/CostCalculator',
  component: CostCalculator,
  tags: ['autodocs'],
  decorators: [(Story: ComponentType) => <div className="w-80"><Story /></div>],
}

export default meta
type Story = StoryObj<typeof CostCalculator>

const breakdown: CostBreakdown = {
  ingredients: [
    { ingredient_name: 'Maida', quantity_grams: 240, cost: 9.60 },
    { ingredient_name: 'Unsalted Butter', quantity_grams: 100, cost: 85.00 },
    { ingredient_name: 'Powdered Sugar', quantity_grams: 150, cost: 9.00 },
    { ingredient_name: 'Cocoa Powder', quantity_grams: 22, cost: 26.40 },
    { ingredient_name: 'Baking Soda', quantity_grams: 5, cost: 0.75 },
  ],
  overhead_cost: 20,
  packaging_cost: 15,
  labor_cost: 50,
  total_cost: 215.75,
  cost_per_serving: 26.97,
  servings: 8,
}

export const Default: Story = {
  args: { breakdown },
}

export const HighCost: Story = {
  args: {
    breakdown: {
      ...breakdown,
      ingredients: [
        { ingredient_name: 'Dark Chocolate (70%)', quantity_grams: 200, cost: 320 },
        { ingredient_name: 'Fresh Cream', quantity_grams: 150, cost: 75 },
        { ingredient_name: 'Unsalted Butter', quantity_grams: 100, cost: 85 },
      ],
      overhead_cost: 30,
      packaging_cost: 25,
      labor_cost: 80,
      total_cost: 615,
      cost_per_serving: 102.5,
      servings: 6,
    },
  },
}
