import type { Meta, StoryObj } from '@storybook/react'
import { Skeleton, RecipeCardSkeleton } from './Skeleton'

/**
 * `Skeleton` provides loading placeholders that match the shape of real content,
 * reducing perceived load time. `RecipeCardSkeleton` is a pre-composed variant
 * for the recipe list.
 *
 * **Accessibility notes:**
 * - `role="status"` and `aria-label="Loading content"` on container elements
 * - Individual skeleton bars are `aria-hidden` to avoid noise for screen readers
 * - Pulse animation respects `prefers-reduced-motion` via Tailwind's `animate-pulse`
 */
const meta: Meta<typeof Skeleton> = {
  title: 'Common/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['text', 'rect', 'circle'] },
    lines: { control: { type: 'number', min: 1, max: 6 } },
    width: { control: 'text' },
    height: { control: 'text' },
  },
}

export default meta
type Story = StoryObj<typeof Skeleton>

export const Text: Story = {
  args: { variant: 'text', lines: 3 },
}

export const Rectangle: Story = {
  args: { variant: 'rect', width: 300, height: 160 },
}

export const Circle: Story = {
  args: { variant: 'circle', width: 48, height: 48 },
}

export const RecipeCard: Story = {
  render: () => (
    <div className="w-72">
      <RecipeCardSkeleton />
    </div>
  ),
}

export const RecipeGrid: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 w-[600px]">
      {Array.from({ length: 4 }).map((_, i) => (
        <RecipeCardSkeleton key={i} />
      ))}
    </div>
  ),
}
