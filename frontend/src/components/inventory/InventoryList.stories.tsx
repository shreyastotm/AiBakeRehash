import type { Meta, StoryObj } from '@storybook/react'
import { InventoryList } from './InventoryList'
import type { InventoryItem } from './InventoryList'

/**
 * `InventoryList` shows all tracked ingredients with stock levels visualised
 * as progress bars and INR cost-per-unit. Low-stock items are flagged.
 *
 * **Accessibility notes:**
 * - Container has `role="list"` and `aria-label="Inventory items"`
 * - Each item is `role="listitem"`
 * - Progress bars have `aria-label` with the ingredient name
 * - "Add purchase" button has an explicit `aria-label` per item
 */
const meta: Meta<typeof InventoryList> = {
  title: 'Inventory/InventoryList',
  component: InventoryList,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof InventoryList>

const items: InventoryItem[] = [
  { id: '1', ingredient_name: 'Maida (All-purpose flour)', quantity_on_hand: 2000, unit: 'g', min_stock_level: 500, cost_per_unit: 0.04 },
  { id: '2', ingredient_name: 'Unsalted Butter', quantity_on_hand: 150, unit: 'g', min_stock_level: 200, cost_per_unit: 0.85, expiration_date: '2025-02-15' },
  { id: '3', ingredient_name: 'Powdered Sugar', quantity_on_hand: 800, unit: 'g', min_stock_level: 300, cost_per_unit: 0.06 },
  { id: '4', ingredient_name: 'Cocoa Powder', quantity_on_hand: 50, unit: 'g', min_stock_level: 100, cost_per_unit: 1.20 },
  { id: '5', ingredient_name: 'Baking Soda', quantity_on_hand: 200, unit: 'g', min_stock_level: 50, cost_per_unit: 0.15 },
]

export const Default: Story = {
  args: { items },
}

export const WithPurchaseAction: Story = {
  args: {
    items,
    onAddPurchase: (item: import('./InventoryList').InventoryItem) => alert(`Add purchase for: ${item.ingredient_name}`),
  },
}

export const LowStock: Story = {
  args: {
    items: items.filter((i) => i.quantity_on_hand <= i.min_stock_level),
    onAddPurchase: () => {},
  },
}

export const Empty: Story = {
  args: { items: [] },
}
