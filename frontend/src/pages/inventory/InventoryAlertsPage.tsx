import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { inventoryService } from '../../services/inventory.service'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { EmptyState } from '../../components/common/EmptyState'
import { Link } from 'react-router-dom'
import { Button } from '../../components/common/Button'

export const InventoryAlertsPage: React.FC = () => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['inventory-alerts'],
    queryFn: () => inventoryService.getAlerts(),
    refetchInterval: 60000, // refresh every minute
  })

  const alerts: any[] = data?.data || data || []

  const low = alerts.filter((a: any) => a.type === 'low_stock')
  const expiringSoon = alerts.filter((a: any) => a.type === 'expiring_soon')
  const expired = alerts.filter((a: any) => a.type === 'expired')

  const handleWhatsApp = (alert: any) => {
    const isLow = alert.type === 'low_stock'
    const title = isLow ? '📢 *INVENTORY REORDER ALERT*' : '⏳ *EXPIRATION ALERT*'
    
    const lines = [
      title,
      `*Item:* ${alert.ingredient_name}`,
      `*Current Stock:* ${alert.quantity_on_hand} ${alert.unit}`,
      isLow 
        ? `*Threshold:* ${alert.min_stock_level} ${alert.unit}\n*Action:* Please reorder ${alert.reorder_quantity || 'stock'} immediately.` 
        : `*Expiry Date:* ${new Date(alert.expiration_date).toLocaleDateString('en-IN')}\n*Action:* Use this item before it expires or discard if necessary.`
    ]

    const msg = encodeURIComponent(lines.join('\n'))
    window.open(`https://wa.me/?text=${msg}`, '_blank')
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Alerts</h1>
          <p className="text-sm text-gray-500 mt-0.5">{alerts.length} active alert{alerts.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => refetch()}>🔄 Refresh</Button>
          <Link to="/inventory"><Button variant="ghost" size="sm">← Inventory</Button></Link>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : alerts.length === 0 ? (
        <EmptyState
          title="No alerts"
          description="All inventory items are well-stocked and not expiring soon. 🎉"
        />
      ) : (
        <div className="space-y-6">
          {/* Low Stock Section */}
          {low.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-red-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span>⚠️</span> Low Stock ({low.length})
              </h2>
              <div className="space-y-2">
                {low.map((alert: any) => (
                  <div key={alert.id} className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-red-800">{alert.ingredient_name}</p>
                      <p className="text-sm text-red-600">
                        {alert.quantity_on_hand} {alert.unit} remaining · Min: {alert.min_stock_level} {alert.unit}
                      </p>
                      {alert.reorder_quantity && (
                        <p className="text-xs text-red-500 mt-0.5">Suggested reorder: {alert.reorder_quantity} {alert.unit}</p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleWhatsApp(alert)}
                        className="text-xs text-green-700 bg-green-100 hover:bg-green-200 font-medium px-3 py-1.5 rounded-lg min-h-[36px] transition-colors"
                        title="Send WhatsApp reminder"
                      >
                        📱 WhatsApp
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Expiring Soon Section */}
          {expiringSoon.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-yellow-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span>⏰</span> Expiring Soon ({expiringSoon.length})
              </h2>
              <div className="space-y-2">
                {expiringSoon.map((alert: any) => (
                  <div key={alert.id} className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-yellow-800">{alert.ingredient_name}</p>
                      <p className="text-sm text-yellow-600">
                        Expires: {alert.expiration_date ? new Date(alert.expiration_date).toLocaleDateString('en-IN') : 'Soon'}
                        {' · '}{alert.quantity_on_hand} {alert.unit} on hand
                      </p>
                    </div>
                    <button
                      onClick={() => handleWhatsApp(alert)}
                      className="text-xs text-green-700 bg-green-100 hover:bg-green-200 font-medium px-3 py-1.5 rounded-lg min-h-[36px] transition-colors shrink-0"
                    >
                      📱 WhatsApp
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Expired Section */}
          {expired.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span>🚫</span> Expired ({expired.length})
              </h2>
              <div className="space-y-2">
                {expired.map((alert: any) => (
                  <div key={alert.id} className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3">
                    <p className="font-semibold text-gray-600">{alert.ingredient_name}</p>
                    <p className="text-sm text-gray-500">
                      Expired: {alert.expiration_date ? new Date(alert.expiration_date).toLocaleDateString('en-IN') : 'Unknown'}
                      {' · '}{alert.quantity_on_hand} {alert.unit} remaining
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
