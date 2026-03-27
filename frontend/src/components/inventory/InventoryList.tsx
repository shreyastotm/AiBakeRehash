import React from 'react'
import { ProgressBar } from '../common/ProgressBar'
import { EmptyState } from '../common/EmptyState'
import { Badge } from '../common/Badge'
import { cn } from '../../utils/cn'

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
    <div className={cn('card overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full" role="table" aria-label="Inventory items">
          <thead>
            <tr className="border-b border-neutral-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                Ingredient
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                On Hand
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide hidden sm:table-cell">
                Cost/Unit
              </th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide hidden md:table-cell">
                Stock Level
              </th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                Status
              </th>
              {onAddPurchase && (
                <th className="px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide" />
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const pct = stockPercent(item)
              const color = stockColor(pct)
              const isLow = item.quantity_on_hand <= item.min_stock_level
              const isOut = item.quantity_on_hand === 0

              return (
                <tr
                  key={item.id}
                  className={cn(
                    'border-b border-neutral-100 last:border-0 transition-colors',
                    isOut ? 'bg-error-light/20' : isLow ? 'bg-warning-light/30' : 'hover:bg-neutral-50',
                  )}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-neutral-900 truncate max-w-[180px]">
                      {item.ingredient_name}
                    </p>
                    {item.expiration_date && (
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Expires {new Date(item.expiration_date).toLocaleDateString('en-IN')}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-medium text-neutral-800">
                      {item.quantity_on_hand} {item.unit}
                    </span>
                    <p className="text-xs text-neutral-400">min {item.min_stock_level} {item.unit}</p>
                  </td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">
                    <span className="text-sm text-neutral-700">
                      ₹{item.cost_per_unit.toFixed(2)}/{item.unit}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="w-24 mx-auto">
                      <ProgressBar
                        value={pct}
                        color={color}
                        size="sm"
                        aria-label={`${item.ingredient_name} stock level`}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isOut ? (
                      <Badge variant="danger" dot>Out of Stock</Badge>
                    ) : isLow ? (
                      <Badge variant="warning" dot>Low Stock</Badge>
                    ) : (
                      <Badge variant="success" dot>In Stock</Badge>
                    )}
                  </td>
                  {onAddPurchase && (
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onAddPurchase(item)}
                        className="text-xs text-primary-500 hover:text-primary-600 font-medium focus:outline-none focus:underline whitespace-nowrap"
                        aria-label={`Add purchase for ${item.ingredient_name}`}
                      >
                        + Add purchase
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
