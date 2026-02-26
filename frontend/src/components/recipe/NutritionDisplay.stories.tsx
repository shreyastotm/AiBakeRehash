import type { Meta, StoryObj } from '@storybook/react'
import type { ComponentType } from 'react'
import { NutritionDisplay } from './NutritionDisplay'
import type { RecipeNutrition } from './NutritionDisplay'

/**
 * `NutritionDisplay` renders a nutrition facts table with per-100g and
 * per-serving columns. Fiber row is conditionally shown when data is available.
 *
 * **Accessibility notes:**
 * - Uses a `<table>` with `<th scope="col">` and `<th scope="row">` for
 *   proper screen-reader column/row association
 * - Table has an `aria-label` matching the visible heading
 * - Disclaimer text is visible and not hidden from assistive technology
 */
const meta: Meta<typeof NutritionDisplay> = {
  title: 'Recipe/NutritionDisplay',
  component: NutritionDisplay,
  tags: ['autodocs'],
  argTypes: {
    nutrition: { control: 'object' },
  },
}

export default meta
type Story = StoryObj<typeof NutritionDisplay>

const fullNutrition: RecipeNutrition = {
  servings: 8,
  per_100g: { energy_kcal: 380, protein_g: 5.2, fat_g: 18.4, carbs_g: 50.1, fiber_g: 2.3 },
  per_serving: { energy_kcal: 285, protein_g: 3.9, fat_g: 13.8, carbs_g: 37.6, fiber_g: 1.7 },
}

export const Default: Story = {
  args: { nutrition: fullNutrition },
  decorators: [(Story: ComponentType) => <div className="w-80"><Story /></div>],
}

export const NoFiber: Story = {
  args: {
    nutrition: {
      servings: 12,
      per_100g: { energy_kcal: 420, protein_g: 4.1, fat_g: 22.0, carbs_g: 55.0 },
      per_serving: { energy_kcal: 210, protein_g: 2.0, fat_g: 11.0, carbs_g: 27.5 },
    },
  },
  decorators: [(Story: ComponentType) => <div className="w-80"><Story /></div>],
}

export const HighProtein: Story = {
  args: {
    nutrition: {
      servings: 6,
      per_100g: { energy_kcal: 310, protein_g: 18.0, fat_g: 10.0, carbs_g: 35.0, fiber_g: 4.5 },
      per_serving: { energy_kcal: 258, protein_g: 15.0, fat_g: 8.3, carbs_g: 29.2, fiber_g: 3.8 },
    },
  },
  decorators: [(Story: ComponentType) => <div className="w-80"><Story /></div>],
}
