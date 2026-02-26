import type { Meta, StoryObj } from '@storybook/react'
import type { ComponentProps } from 'react'
import { useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'

/**
 * `Modal` is a focus-trapped dialog overlay. It closes on Escape key or
 * backdrop click (configurable). Body scroll is locked while open.
 *
 * **Accessibility notes:**
 * - Uses `role="dialog"` and `aria-modal="true"`
 * - Title linked via `aria-labelledby`
 * - Escape key closes the modal
 * - Close button has an explicit `aria-label`
 * - Body scroll is locked while the modal is open
 */
const meta: Meta<typeof Modal> = {
  title: 'Common/Modal',
  component: Modal,
  tags: ['autodocs'],
  argTypes: {
    isOpen: { control: 'boolean' },
    title: { control: 'text' },
    size: { control: 'select', options: ['sm', 'md', 'lg', 'xl'] },
    closeOnBackdrop: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof Modal>
type ModalProps = ComponentProps<typeof Modal>

// Interactive wrapper so the modal can actually open/close in Storybook
const ModalDemo = (args: ModalProps) => {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open Modal</Button>
      <Modal {...args} isOpen={open} onClose={() => setOpen(false)} />
    </>
  )
}

export const Default: Story = {
  render: (args: ModalProps) => <ModalDemo {...args} />,
  args: {
    title: 'Delete Recipe',
    children: 'Are you sure you want to delete this recipe? This action cannot be undone.',
    size: 'md',
    closeOnBackdrop: true,
  },
}

export const WithFooter: Story = {
  render: (args: ModalProps) => {
    const [open, setOpen] = useState(false)
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open with Footer</Button>
        <Modal
          {...args}
          isOpen={open}
          onClose={() => setOpen(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="danger" onClick={() => setOpen(false)}>Delete</Button>
            </>
          }
        />
      </>
    )
  },
  args: {
    title: 'Confirm Delete',
    children: 'This will permanently remove the recipe and all journal entries.',
    size: 'md',
  },
}

export const Large: Story = {
  render: (args: ModalProps) => <ModalDemo {...args} />,
  args: {
    title: 'Recipe Details',
    size: 'xl',
    children: (
      <div className="space-y-4">
        <p>A large modal can hold complex content like forms or ingredient lists.</p>
        <p className="text-gray-500 text-sm">Scroll within the modal if content overflows.</p>
      </div>
    ),
  },
}
