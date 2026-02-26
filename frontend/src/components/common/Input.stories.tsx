import type { Meta, StoryObj } from '@storybook/react'
import { Input } from './Input'

/**
 * `Input` wraps a native `<input>` with a label, hint, and error message.
 * IDs are auto-generated via `useId` so multiple instances never clash.
 *
 * **Accessibility notes:**
 * - Label is associated via `htmlFor` / `id`
 * - Error message uses `role="alert"` and `aria-describedby`
 * - `aria-invalid` is set when an error is present
 * - Minimum height 44px for touch targets
 */
const meta: Meta<typeof Input> = {
  title: 'Common/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text', description: 'Visible label above the input' },
    error: { control: 'text', description: 'Error message shown below the input' },
    hint: { control: 'text', description: 'Helper text shown when there is no error' },
    success: { control: 'boolean', description: 'Green border indicating valid input' },
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof Input>

export const Default: Story = {
  args: { label: 'Recipe Title', placeholder: 'e.g. Eggless Chocolate Cake' },
}

export const WithHint: Story = {
  args: {
    label: 'Yield (grams)',
    placeholder: '500',
    hint: 'Total weight of the finished product',
    type: 'number',
  },
}

export const WithError: Story = {
  args: {
    label: 'Email',
    value: 'not-an-email',
    error: 'Please enter a valid email address',
  },
}

export const Success: Story = {
  args: { label: 'Display Name', value: 'Priya Sharma', success: true },
}

export const Disabled: Story = {
  args: { label: 'Ingredient', value: 'Maida', disabled: true },
}

export const Password: Story = {
  args: { label: 'Password', type: 'password', placeholder: '••••••••' },
}
