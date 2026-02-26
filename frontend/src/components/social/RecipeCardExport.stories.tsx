import type { Meta, StoryObj } from '@storybook/react'
import { RecipeCardExport } from './RecipeCardExport'
import type { RecipeExportData } from './RecipeCardExport'

/**
 * `RecipeCardExport` renders a 1:1 aspect-ratio card styled for Instagram.
 * The amber gradient, ingredient tags, and baker handle make it shareable
 * without any additional editing.
 *
 * **Accessibility notes:**
 * - Card `div` has `aria-label` describing its purpose
 * - Download button has an explicit `aria-label` with the recipe name
 * - Decorative logo icon is `aria-hidden`
 * - Text contrast meets WCAG AA on the amber gradient background
 */
const meta: Meta<typeof RecipeCardExport> = {
  title: 'Social/RecipeCardExport',
  component: RecipeCardExport,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
}

export default meta
type Story = StoryObj<typeof RecipeCardExport>

const base: RecipeExportData = {
  title: 'Eggless Chocolate Cake',
  description: 'Rich, moist, and completely egg-free.',
  servings: 8,
  yield_weight_grams: 600,
  key_ingredients: ['Maida', 'Cocoa Powder', 'Butter', 'Powdered Sugar', 'Baking Soda'],
  baker_name: 'Priya Sharma',
  instagram_handle: 'priyabakes',
}

export const Default: Story = {
  args: { recipe: base },
}

export const WithDownload: Story = {
  args: {
    recipe: base,
    onDownload: () => alert('Downloading card…'),
  },
}

export const NoHandle: Story = {
  args: {
    recipe: { ...base, instagram_handle: undefined, baker_name: undefined },
  },
}

export const LongTitle: Story = {
  args: {
    recipe: {
      ...base,
      title: 'Mawa Cake with Cardamom & Rose Water Glaze',
      key_ingredients: ['Mawa (Khoya)', 'Maida', 'Ghee', 'Cardamom', 'Rose Water'],
    },
  },
}
