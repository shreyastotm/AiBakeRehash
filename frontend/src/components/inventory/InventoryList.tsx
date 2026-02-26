import React from 'react'
import { ProgressBar } from '../common/ProgressBar'
import { EmptyState } from '../common/EmptyState'

export interface InventoryItem {
  id: string
  ingredient_name: string
  quantity_on_hand: number
  unit: string
  min_stock_level: number
  cost_per_unit: number
  expiration_date?: string
}

interface InventoryListProps {
  items: InventoryItem[]
  onAddPurchase?: (item: InventoryItem) => void
  className?: string
}

function stockPercent(item: InventoryItem): number {
  if (item.min_stock_level <= 0) return 100
  // Show 100% at 2× min level, 0% at 0
  return Math.min(100, (item.quantity_on_hand / (item.min_stock_level * 2)) * 100)
}

function stockColor(pct: number): 'error' | 'warning' | 'success' {
  if (pct <= 25) return 'error'
  if (pct <= 50) return 'warning'
  return 'success'
}

export const InventoryList: React.FC<InventoryListProps> = ({
  items,
  onAddPurchase,
  className = '',
}) => {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No inventory items"
        description="Add ingredients to start tracking your stock."
        className={className}
      />
    )
  }

  return (
    <div className={`space-y-3 ${className}`} role="list" aria-label="Inventory items">
      {items.map((item) => {
        const pct = stockPercent(item)
        const color = stockColor(pct)
        const isLow = item.quantity_on_hand <= item.min_stock_level

        return (
          <div
            key={item.id}
            role="listitem"
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate">{item.ingredient_name}</h3>
                <p className="text-sm text-gray-500">
                  {item.quantity_on_hand} {item.unit} on hand
                  {item.expiration_date && (
                    <span className="ml-2 text-xs text-gray-400">
                      · Expires {new Date(item.expiration_date).toLocaleDateString('en-IN')}
                    </span>
                  )}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-medium text-gray-700">
                  ₹{item.cost_per_unit.toFixed(2)}/{item.unit}
                </p>
                {isLow && (
                  <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                    Low stock
                  </span>
                )}
              </div>
            </div>

            <ProgressBar
              value={pct}
              color={color}
              size="sm"
              aria-label={`${item.ingredient_name} stock level`}
            />

            {onAddPurchase && (
              <button
                onClick={() => onAddPurchase(item)}
                className="mt-2 text-xs text-amber-600 hover:text-amber-700 font-medium focus:outline-none focus:underline"
                aria-label={`Add purchase for ${item.ingredient_name}`}
              >
                + Add purchase
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
