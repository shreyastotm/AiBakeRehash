import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryService } from '../../services/inventory.service'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { EmptyState } from '../../components/common/EmptyState'
import { Button } from '../../components/common/Button'
import { Modal } from '../../components/common/Modal'
import { PurchaseForm } from '../../components/inventory/PurchaseForm'

export const PurchaseLogPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['inventory-purchases'],
    queryFn: () => inventoryService.getPurchases(),
  })

  const purchaseMutation = useMutation({
    mutationFn: (data: any) => inventoryService.logPurchase(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-purchases'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      setShowForm(false)
    },
  })

  const purchases: any[] = data?.data?.purchases || data?.data?.items || data?.data || data || []

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n)

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase History</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track all ingredient purchases</p>
        </div>
        <Button onClick={() => setShowForm(true)}>+ Log Purchase</Button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : purchases.length === 0 ? (
        <EmptyState
          title="No purchases logged"
          description="Log your ingredient purchases to track spending and update inventory."
          actionNode={<Button onClick={() => setShowForm(true)}>Log First Purchase</Button>}
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Ingredient</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Quantity</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Cost</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Supplier</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {purchases.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.ingredient_name}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{p.quantity} {p.unit}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{fmt(p.cost)}</td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{p.supplier_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(p.purchase_date || p.created_at).toLocaleDateString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-amber-50 border-t border-amber-100">
              <tr>
                <td colSpan={2} className="px-4 py-3 font-semibold text-gray-700">Total Spent</td>
                <td className="px-4 py-3 text-right font-bold text-amber-700">
                  {fmt(purchases.reduce((s: number, p: any) => s + (p.cost || 0), 0))}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Log Purchase">
        <PurchaseForm
          onSubmit={(data) => purchaseMutation.mutate(data)}
          onCancel={() => setShowForm(false)}
          loading={purchaseMutation.isPending}
        />
      </Modal>
    </div>
  )
}
