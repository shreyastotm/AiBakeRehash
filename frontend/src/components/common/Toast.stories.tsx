import type { Meta, StoryObj } from '@storybook/react'
import type { ComponentType } from 'react'
import { ToastProvider, useToast } from './Toast'
import { Button } from './Button'

/**
 * `Toast` notifications appear in the bottom-right corner and auto-dismiss
 * after 4 seconds. Use `ToastProvider` at the app root and `useToast` hook
 * to trigger toasts from anywhere in the tree.
 *
 * **Accessibility notes:**
 * - Each toast has `role="alert"` and `aria-live="assertive"` for immediate
 *   screen-reader announcement
 * - Dismiss button has an explicit `aria-label`
 * - The container is labelled "Notifications" for landmark navigation
 */
const meta: Meta = {
  title: 'Common/Toast',
  tags: ['autodocs'],
  decorators: [
    (Story: ComponentType) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
  ],
}

export default meta
type Story = StoryObj

const ToastDemo = ({ type }: { type: 'success' | 'error' | 'warning' | 'info' }) => {
  const toast = useToast()
  const messages: Record<string, string> = {
    success: 'Recipe saved successfully!',
    error: 'Failed to save recipe. Please try again.',
    warning: 'Butter stock is running low.',
    info: 'Scaling factor applied to all ingredients.',
  }
  return (
    <Button variant="primary" onClick={() => toast[type](messages[type])}>
      Show {type} toast
    </Button>
  )
}

export const Success: Story = {
  render: () => <ToastDemo type="success" />,
}

export const Error: Story = {
  render: () => <ToastDemo type="error" />,
}

export const Warning: Story = {
  render: () => <ToastDemo type="warning" />,
}

export const Info: Story = {
  render: () => <ToastDemo type="info" />,
}

export const Multiple: Story = {
  render: () => {
    const toast = useToast()
    return (
      <Button
        variant="primary"
        onClick={() => {
          toast.success('Recipe saved!')
          setTimeout(() => toast.warning('Low butter stock'), 300)
          setTimeout(() => toast.info('3 timers running'), 600)
        }}
      >
        Show multiple toasts
      </Button>
    )
  },
  decorators: [
    (Story: ComponentType) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
  ],
}
