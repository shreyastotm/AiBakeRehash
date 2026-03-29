import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { inventoryService } from '../../services/inventory.service'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { EmptyState } from '../../components/common/EmptyState'
import { Button } from '../../components/common/Button'
import { Badge } from '../../components/common/Badge'
import { Modal } from '../../components/common/Modal'
import { InventoryAlerts } from '../../components/inventory/InventoryAlerts'
import { PurchaseForm } from '../../components/inventory/PurchaseForm'
import { InventoryItemForm } from './InventoryItemForm'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n)

type SortKey = 'name' | 'quantity' | 'expiration'
type CategoryFilter = 'all' | string

export const InventoryListPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [sortBy, setSortBy] = useState<SortKey>('name')
  const [category] = useState<CategoryFilter>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showPurchaseModal, setShowPurchaseModal] = useState<{ id: string; name: string } | null>(null)
  const [editItem, setEditItem] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => inventoryService.getInventory(1, 100),
  })
  const { data: alertsData } = useQuery({
    queryKey: ['inventory-alerts'],
    queryFn: () => inventoryService.getAlerts(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => inventoryService.deleteInventoryItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-alerts'] })
    },
  })

  const purchaseMutation = useMutation({
    mutationFn: (data: { ingredient_master_id: string; quantity: number; unit: string; cost: number; supplier?: string; purchase_date: string }) =>
      inventoryService.logPurchase(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      setShowPurchaseModal(null)
    },
  })

  const items: any[] = data?.data?.items || data?.items || []
  const alerts: any[] = alertsData?.data || alertsData || []

  const days7 = Date.now() + 7 * 24 * 60 * 60 * 1000

  const enrichedItems = items.map((item: any) => {
    const isLow = item.min_stock_level && item.quantity_on_hand <= item.min_stock_level
    const expDate = item.expiration_date ? new Date(item.expiration_date).getTime() : null
    const isExpiringSoon = expDate && expDate <= days7 && expDate > Date.now()
    const isExpired = expDate && expDate < Date.now()
    return { ...item, isLow, isExpiringSoon, isExpired }
  })

  const sorted = [...enrichedItems].sort((a, b) => {
    if (sortBy === 'name') return (a.ingredient_name || '').localeCompare(b.ingredient_name || '')
    if (sortBy === 'quantity') return a.quantity_on_hand - b.quantity_on_hand
    if (sortBy === 'expiration') {
      const da = a.expiration_date ? new Date(a.expiration_date).getTime() : Infinity
      const db = b.expiration_date ? new Date(b.expiration_date).getTime() : Infinity
      return da - db
    }
    return 0
  })

  const filtered = category === 'all' ? sorted : sorted.filter((i) => i.category === category)

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500 mt-0.5">{items.length} items tracked</p>
        </div>
        <div className="flex gap-2">
          <Link to="/inventory/purchase-log">
            <Button variant="secondary" size="sm">📋 Purchases</Button>
          </Link>
          <Link to="/inventory/reports">
            <Button variant="secondary" size="sm">📊 Reports</Button>
          </Link>
          <Link to="/inventory/alerts">
            <Button variant="secondary" size="sm">
              🔔 Alerts {alerts.length > 0 && <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5">{alerts.length}</span>}
            </Button>
          </Link>
          <Button onClick={() => setShowAddModal(true)} size="sm">+ Add Item</Button>
        </div>
      </div>

      {/* Inline alerts summary */}
      {alerts.length > 0 && (
        <InventoryAlerts
          alerts={alerts.slice(0, 3)}
          className="bg-white rounded-xl p-4 border border-red-100"
        />
      )}

      {/* Filters & Sort */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-gray-500">Sort:</span>
        {(['name', 'quantity', 'expiration'] as SortKey[]).map((s) => (
          <button
            key={s}
            onClick={() => setSortBy(s)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              sortBy === s ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s === 'name' ? 'Name' : s === 'quantity' ? 'Quantity' : 'Expiry'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No inventory items"
          description="Add ingredients to start tracking your stock levels and costs."
          actionNode={<Button onClick={() => setShowAddModal(true)}>Add First Item</Button>}
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Ingredient</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">On Hand</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Cost/Unit</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Expiry</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{item.ingredient_name || item.name}</p>
                      {item.brand_name && <p className="text-xs text-gray-400">{item.brand_name}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={item.isLow ? 'text-red-600 font-semibold' : 'text-gray-700'}>
                      {item.quantity_on_hand} {item.unit}
                    </span>
                    {item.min_stock_level && (
                      <p className="text-xs text-gray-400">min: {item.min_stock_level}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell text-gray-700">
                    {fmt(item.cost_per_unit)}/{item.unit}
                  </td>
                  <td className="px-4 py-3 text-center hidden md:table-cell">
                    {item.expiration_date ? (
                      <span className={`text-xs ${item.isExpired ? 'text-red-600 font-semibold' : item.isExpiringSoon ? 'text-yellow-600 font-semibold' : 'text-gray-500'}`}>
                        {new Date(item.expiration_date).toLocaleDateString('en-IN')}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.isExpired ? (
                      <Badge variant="danger">Expired</Badge>
                    ) : item.isExpiringSoon ? (
                      <Badge variant="warning">Expiring</Badge>
                    ) : item.isLow ? (
                      <Badge variant="danger">Low</Badge>
                    ) : (
                      <Badge variant="success">OK</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setShowPurchaseModal({ id: item.ingredient_master_id, name: item.ingredient_name || item.name })}
                        className="text-xs text-amber-600 hover:text-amber-700 font-medium px-2 py-1 rounded hover:bg-amber-50 min-h-[32px]"
                        title="Log Purchase"
                      >
                        + Buy
                      </button>
                      <button
                        onClick={() => setEditItem(item.id)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded hover:bg-blue-50 min-h-[32px]"
                        title="Edit"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete ${item.ingredient_name}?`)) deleteMutation.mutate(item.id)
                        }}
                        className="text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1 rounded hover:bg-red-50 min-h-[32px]"
                        title="Delete"
                      >
                        Del
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Item Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Inventory Item"
      >
        <InventoryItemForm
          onSuccess={() => {
            setShowAddModal(false)
            queryClient.invalidateQueries({ queryKey: ['inventory'] })
          }}
          onCancel={() => setShowAddModal(false)}
        />
      </Modal>

      {/* Edit Item Modal */}
      <Modal
        isOpen={!!editItem}
        onClose={() => setEditItem(null)}
        title="Edit Inventory Item"
      >
        <InventoryItemForm
          itemId={editItem!}
          onSuccess={() => {
            setEditItem(null)
            queryClient.invalidateQueries({ queryKey: ['inventory'] })
          }}
          onCancel={() => setEditItem(null)}
        />
      </Modal>

      {/* Purchase Modal */}
      <Modal
        isOpen={!!showPurchaseModal}
        onClose={() => setShowPurchaseModal(null)}
        title={`Log Purchase: ${showPurchaseModal?.name}`}
      >
        <PurchaseForm
          ingredientName={showPurchaseModal?.name}
          onSubmit={(formData) => {
            purchaseMutation.mutate({
              ingredient_master_id: showPurchaseModal!.id,
              quantity: formData.quantity,
              unit: formData.unit,
              cost: formData.cost,
              supplier: formData.supplier,
              purchase_date: formData.purchase_date,
            })
          }}
          onCancel={() => setShowPurchaseModal(null)}
          loading={purchaseMutation.isPending}
        />
      </Modal>
    </div>
  )
}
