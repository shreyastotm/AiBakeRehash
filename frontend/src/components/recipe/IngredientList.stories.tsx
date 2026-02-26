import type { Meta, StoryObj } from '@storybook/react'
import { IngredientList } from './IngredientList'
import type { RecipeIngredient } from './IngredientList'

/**
 * `IngredientList` renders a sorted list of recipe ingredients with optional
 * gram equivalents and scaling support.
 *
 * **Accessibility notes:**
 * - Rendered as a `<ul>` with `role="list"` and `aria-label`
 * - Each `<li>` contains the ingredient name and quantity
 * - Gram equivalents are visually de-emphasised but still readable by screen readers
 */
const meta: Meta<typeof IngredientList> = {
  title: 'Recipe/IngredientList',
  component: IngredientList,
  tags: ['autodocs'],
  argTypes: {
    scalingFactor: { control: { type: 'number', min: 0.1, max: 10, step: 0.1 } },
    showGrams: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof IngredientList>

const ingredients: RecipeIngredient[] = [
  { id: '1', display_name: 'Maida (All-purpose flour)', quantity_original: 2, unit_original: 'cups', quantity_grams: 240, position: 1 },
  { id: '2', display_name: 'Unsalted Butter', quantity_original: 100, unit_original: 'g', quantity_grams: 100, position: 2 },
  { id: '3', display_name: 'Powdered Sugar', quantity_original: 150, unit_original: 'g', quantity_grams: 150, position: 3 },
  { id: '4', display_name: 'Cocoa Powder', quantity_original: 3, unit_original: 'tbsp', quantity_grams: 22, position: 4 },
  { id: '5', display_name: 'Baking Soda', quantity_original: 1, unit_original: 'tsp', quantity_grams: 5, position: 5 },
]

export const Default: Story = {
  args: { ingredients },
}

export const WithGrams: Story = {
  args: { ingredients, showGrams: true },
}

export const Scaled2x: Story = {
  args: { ingredients, scalingFactor: 2, showGrams: true },
}

export const Empty: Story = {
  args: { ingredients: [] },
}
