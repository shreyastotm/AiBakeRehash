import type { Meta, StoryObj } from '@storybook/react'
import { InventoryAlerts } from './InventoryAlerts'
import type { InventoryAlert } from './InventoryAlerts'

/**
 * `InventoryAlerts` surfaces actionable warnings: low stock, expiring soon,
 * and expired items. Each alert can be individually dismissed.
 *
 * **Accessibility notes:**
 * - Each alert has `role="alert"` for immediate screen-reader announcement
 * - Section has `aria-label="Inventory alerts"`
 * - Dismiss button has an explicit `aria-label` per ingredient
 * - Icons are `aria-hidden` — meaning is conveyed by the label text
 */
const meta: Meta<typeof InventoryAlerts> = {
  title: 'Inventory/InventoryAlerts',
  component: InventoryAlerts,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof InventoryAlerts>

const alerts: InventoryAlert[] = [
  { id: '1', ingredient_name: 'Unsalted Butter', quantity_on_hand: 50, min_stock_level: 200, unit: 'g', type: 'low_stock' },
  { id: '2', ingredient_name: 'Fresh Cream', quantity_on_hand: 100, min_stock_level: 50, unit: 'ml', type: 'expiring_soon', expiration_date: '2025-01-20' },
  { id: '3', ingredient_name: 'Yeast (Active Dry)', quantity_on_hand: 10, min_stock_level: 20, unit: 'g', type: 'expired', expiration_date: '2025-01-01' },
]

export const Default: Story = {
  args: { alerts },
}

export const WithDismiss: Story = {
  args: {
    alerts,
    onDismiss: (id: string) => alert(`Dismissed alert: ${id}`),
  },
}

export const LowStockOnly: Story = {
  args: {
    alerts: alerts.filter((a) => a.type === 'low_stock'),
  },
}

export const NoAlerts: Story = {
  args: { alerts: [] },
}
