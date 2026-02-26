import type { Meta, StoryObj } from '@storybook/react'
import { PurchaseForm } from './PurchaseForm'
import type { PurchaseFormData } from './PurchaseForm'

/**
 * `PurchaseForm` records a new ingredient purchase — quantity, unit, cost (INR),
 * supplier, and date. Validates before submission.
 *
 * **Accessibility notes:**
 * - Form has `aria-label="Record purchase"`
 * - All inputs have associated `<label>` elements
 * - Required fields have `aria-required="true"`
 * - Validation errors use `role="alert"` via the `Input` component
 * - Submit button shows a loading spinner during async save
 */
const meta: Meta<typeof PurchaseForm> = {
  title: 'Inventory/PurchaseForm',
  component: PurchaseForm,
  tags: ['autodocs'],
  argTypes: {
    loading: { control: 'boolean' },
    ingredientName: { control: 'text' },
  },
}

export default meta
type Story = StoryObj<typeof PurchaseForm>

export const Default: Story = {
  args: {
    onSubmit: (data: PurchaseFormData) => console.log('Purchase submitted:', data),
    onCancel: () => {},
  },
}

export const PrefilledIngredient: Story = {
  args: {
    ingredientName: 'Unsalted Butter',
    onSubmit: (data: PurchaseFormData) => console.log('Purchase submitted:', data),
    onCancel: () => {},
  },
}

export const Loading: Story = {
  args: {
    ingredientName: 'Maida',
    loading: true,
    onSubmit: () => {},
    onCancel: () => {},
  },
}
