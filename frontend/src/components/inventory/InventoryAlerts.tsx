import React from 'react'

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

const ALERT_CONFIG: Record<InventoryAlert['type'], { label: string; bg: string; text: string; icon: string }> = {
  low_stock: { label: 'Low Stock', bg: 'bg-red-50 border-red-200', text: 'text-red-700', icon: '⚠️' },
  expiring_soon: { label: 'Expiring Soon', bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700', icon: '⏰' },
  expired: { label: 'Expired', bg: 'bg-gray-50 border-gray-300', text: 'text-gray-600', icon: '🚫' },
}

export const InventoryAlerts: React.FC<InventoryAlertsProps> = ({
  alerts,
  onDismiss,
  className = '',
}) => {
  if (alerts.length === 0) return null

  return (
    <section aria-label="Inventory alerts" className={`space-y-2 ${className}`}>
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
        Alerts ({alerts.length})
      </h2>
      {alerts.map((alert) => {
        const cfg = ALERT_CONFIG[alert.type]
        return (
          <div
            key={alert.id}
            role="alert"
            className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg border ${cfg.bg}`}
          >
            <div className="flex items-center gap-2">
              <span aria-hidden="true">{cfg.icon}</span>
              <div>
                <span className={`text-sm font-medium ${cfg.text}`}>{cfg.label}: </span>
                <span className="text-sm text-gray-700">{alert.ingredient_name}</span>
                <p className="text-xs text-gray-500">
                  {alert.type === 'low_stock'
                    ? `${alert.quantity_on_hand} ${alert.unit} remaining (min: ${alert.min_stock_level} ${alert.unit})`
                    : alert.expiration_date
                    ? `Expires ${new Date(alert.expiration_date).toLocaleDateString('en-IN')}`
                    : ''}
                </p>
              </div>
            </div>
            {onDismiss && (
              <button
                onClick={() => onDismiss(alert.id)}
                aria-label={`Dismiss alert for ${alert.ingredient_name}`}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                ×
              </button>
            )}
          </div>
        )
      })}
    </section>
  )
}
