import type { Meta, StoryObj } from '@storybook/react'
import { Card } from './Card'

/**
 * `Card` is a surface container with optional padding and click interaction.
 * When `onClick` is provided it becomes keyboard-accessible via Enter/Space.
 *
 * **Accessibility notes:**
 * - Interactive cards get `role="button"` and `tabIndex={0}`
 * - Enter and Space keys trigger the click handler
 * - `aria-label` can be set for screen-reader context
 */
const meta: Meta<typeof Card> = {
  title: 'Common/Card',
  component: Card,
  tags: ['autodocs'],
  argTypes: {
    padding: { control: 'select', options: ['none', 'sm', 'md', 'lg'] },
    as: { control: 'select', options: ['div', 'article', 'section'] },
    'aria-label': { control: 'text' },
  },
}

export default meta
type Story = StoryObj<typeof Card>

export const Default: Story = {
  args: {
    padding: 'md',
    children: <p className="text-gray-700">A simple card with default padding.</p>,
  },
}

export const Interactive: Story = {
  args: {
    padding: 'md',
    'aria-label': 'Open Chocolate Cake recipe',
    onClick: () => alert('Card clicked'),
    children: (
      <div>
        <h3 className="font-semibold text-gray-900">Chocolate Cake</h3>
        <p className="text-sm text-gray-500 mt-1">Click to open recipe</p>
      </div>
    ),
  },
}

export const AsArticle: Story = {
  args: {
    as: 'article',
    padding: 'md',
    children: (
      <div>
        <h3 className="font-semibold text-gray-900">Butter Naan</h3>
        <p className="text-sm text-gray-500 mt-1">Soft Indian flatbread</p>
      </div>
    ),
  },
}

export const NoPadding: Story = {
  args: {
    padding: 'none',
    children: (
      <img
        src="https://placehold.co/400x200/FFF7ED/92400E?text=Recipe+Image"
        alt="Recipe thumbnail"
        className="w-full rounded-lg"
      />
    ),
  },
}
