import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'

/**
 * The `Button` component is the primary interactive element across AiBake.
 * All variants meet WCAG 2.1 AA contrast requirements and have a minimum
 * 44×44px touch target for mobile/hands-free baking mode.
 *
 * **Accessibility notes:**
 * - Uses native `<button>` element for keyboard and screen-reader support
 * - `disabled` state communicated via `aria-disabled` and visual opacity
 * - Loading state disables the button and shows a spinner with implicit label
 * - Focus ring visible on keyboard navigation (`focus:ring-2`)
 */
const meta: Meta<typeof Button> = {
  title: 'Common/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger', 'outline', 'ghost'],
      description: 'Visual style of the button',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size — all sizes enforce a 44px minimum touch target',
    },
    loading: {
      control: 'boolean',
      description: 'Shows a spinner and disables the button while an async action is in progress',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables the button',
    },
    children: {
      control: 'text',
      description: 'Button label',
    },
  },
}

export default meta
type Story = StoryObj<typeof Button>

export const Primary: Story = {
  args: { variant: 'primary', children: 'Save Recipe' },
}

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'Cancel' },
}

export const Danger: Story = {
  args: { variant: 'danger', children: 'Delete Recipe' },
}

export const Outline: Story = {
  args: { variant: 'outline', children: 'View Details' },
}

export const Ghost: Story = {
  args: { variant: 'ghost', children: 'More Options' },
}

export const Loading: Story = {
  args: { variant: 'primary', loading: true, children: 'Saving…' },
}

export const Disabled: Story = {
  args: { variant: 'primary', disabled: true, children: 'Unavailable' },
}

export const Small: Story = {
  args: { variant: 'primary', size: 'sm', children: 'Small' },
}

export const Large: Story = {
  args: { variant: 'primary', size: 'lg', children: 'Large' },
}
