import React from 'react'
import { Badge } from '../common/Badge'
import { cn } from '../../utils/cn'

export interface InventoryAlert {
  id: string
  ingredient_name: string
  quantity_on_hand: number
  min_stock_level: number
  unit: string
  type: 'low_stock' | 'expiring_soon' | 'expired'
  expiration_date?: string
}

interface InventoryAlertsProps {
  alerts: InventoryAlert[]
  onDismiss?: (id: string) => void
  className?: string
}

export const InventoryAlerts: React.FC<InventoryAlertsProps> = ({
  alerts,
  onDismiss,
  className = '',
}) => {
  if (alerts.length === 0) return null

  return (
    <section aria-label="Inventory alerts" className={cn('card p-4', className)}>
      <h2 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide mb-3">
        Alerts ({alerts.length})
      </h2>
      <div>
        {alerts.map((alert) => (
          <div
            key={alert.id}
            role="alert"
            className="flex items-center gap-3 py-2.5 border-b border-neutral-100 last:border-0"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {alert.type === 'low_stock' && (
                  <Badge variant="warning" dot>Low Stock</Badge>
                )}
                {alert.type === 'expiring_soon' && (
                  <Badge variant="warning" dot>Expiring Soon</Badge>
                )}
                {alert.type === 'expired' && (
                  <Badge variant="danger" dot>Out of Stock</Badge>
                )}
                <span className="text-sm font-medium text-neutral-800 truncate">
                  {alert.ingredient_name}
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                {alert.type === 'low_stock'
                  ? `${alert.quantity_on_hand} ${alert.unit} remaining (min: ${alert.min_stock_level} ${alert.unit})`
                  : alert.expiration_date
                  ? `Expires ${new Date(alert.expiration_date).toLocaleDateString('en-IN')}`
                  : ''}
              </p>
            </div>
            {onDismiss && (
              <button
                onClick={() => onDismiss(alert.id)}
                aria-label={`Dismiss alert for ${alert.ingredient_name}`}
                className="text-neutral-400 hover:text-neutral-600 text-lg leading-none min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0 transition-colors"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
