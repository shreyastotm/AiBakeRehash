import type { Meta, StoryObj } from '@storybook/react'
import type { ComponentType } from 'react'
import { WhatsAppShare } from './WhatsAppShare'
import type { WhatsAppShareData } from './WhatsAppShare'

/**
 * `WhatsAppShare` generates a formatted WhatsApp message with bold/italic
 * markdown and opens the WhatsApp share sheet via `wa.me` deep link.
 * A live preview shows exactly what recipients will see.
 *
 * **Accessibility notes:**
 * - Preview region has `role="region"` and `aria-label`
 * - Share link has an explicit `aria-label` with the recipe name
 * - WhatsApp logo SVG is `aria-hidden`
 * - Link opens in a new tab with `rel="noopener noreferrer"`
 */
const meta: Meta<typeof WhatsAppShare> = {
  title: 'Social/WhatsAppShare',
  component: WhatsAppShare,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  decorators: [(Story: ComponentType) => <div className="w-80"><Story /></div>],
}

export default meta
type Story = StoryObj<typeof WhatsAppShare>

const base: WhatsAppShareData = {
  title: 'Eggless Chocolate Cake',
  servings: 8,
  yield_weight_grams: 600,
  key_ingredients: ['Maida', 'Cocoa Powder', 'Butter', 'Powdered Sugar'],
  baker_name: 'Priya Sharma',
}

export const Default: Story = {
  args: { recipe: base },
}

export const WithSteps: Story = {
  args: {
    recipe: {
      ...base,
      steps_summary: [
        'Preheat oven to 180°C',
        'Mix dry ingredients',
        'Cream butter and sugar',
        'Combine and bake 30 min',
      ],
    },
  },
}

export const WithCustomMessage: Story = {
  args: {
    recipe: {
      ...base,
      custom_message: 'Made this for Diwali — everyone loved it! 🪔',
    },
  },
}

export const MinimalData: Story = {
  args: {
    recipe: {
      title: 'Butter Naan',
      servings: 4,
      yield_weight_grams: 320,
      key_ingredients: ['Maida', 'Butter', 'Yeast'],
    },
  },
}
