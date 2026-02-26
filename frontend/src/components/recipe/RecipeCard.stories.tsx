import type { Meta, StoryObj } from '@storybook/react'
import type { ComponentType } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { RecipeCard } from './RecipeCard'
import type { RecipeCardData } from './RecipeCard'

/**
 * `RecipeCard` is the primary recipe list item. It links to the recipe detail
 * page and shows status, servings, yield weight, and last-updated date.
 *
 * **Accessibility notes:**
 * - Entire card is a focusable `<a>` with `aria-label` set to the recipe title
 * - Status badge is purely visual — screen readers read the title link
 * - Thumbnail `<img>` has a meaningful `alt` attribute
 * - Lazy-loaded image via `loading="lazy"`
 * - Focus ring visible on keyboard navigation
 */
const meta: Meta<typeof RecipeCard> = {
  title: 'Recipe/RecipeCard',
  component: RecipeCard,
  tags: ['autodocs'],
  decorators: [
    (Story: ComponentType) => (
      <MemoryRouter>
        <div className="w-72">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
  argTypes: {
    recipe: { control: 'object' },
  },
}

export default meta
type Story = StoryObj<typeof RecipeCard>

const baseRecipe: RecipeCardData = {
  id: '1',
  title: 'Eggless Chocolate Cake',
  description: 'A rich, moist chocolate cake made without eggs — perfect for vegetarians.',
  servings: 8,
  yield_weight_grams: 600,
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export const Active: Story = {
  args: { recipe: baseRecipe },
}

export const WithThumbnail: Story = {
  args: {
    recipe: {
      ...baseRecipe,
      thumbnail_url: 'https://placehold.co/400x225/FFF7ED/92400E?text=🍰',
    },
  },
}

export const Draft: Story = {
  args: {
    recipe: { ...baseRecipe, title: 'Butter Naan (WIP)', status: 'draft', description: undefined },
  },
}

export const Archived: Story = {
  args: {
    recipe: { ...baseRecipe, title: 'Old Gulab Jamun Recipe', status: 'archived' },
  },
}

export const Grid: Story = {
  decorators: [
    (Story: ComponentType) => (
      <MemoryRouter>
        <div className="grid grid-cols-2 gap-4 w-[600px]">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
  render: () => (
    <>
      {[
        { ...baseRecipe, id: '1', title: 'Chocolate Cake', status: 'active' as const },
        { ...baseRecipe, id: '2', title: 'Butter Cookies', status: 'draft' as const },
        { ...baseRecipe, id: '3', title: 'Mango Cheesecake', status: 'active' as const },
        { ...baseRecipe, id: '4', title: 'Old Brownie', status: 'archived' as const },
      ].map((r) => (
        <RecipeCard key={r.id} recipe={r} />
      ))}
    </>
  ),
}
