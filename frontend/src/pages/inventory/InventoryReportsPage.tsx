import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { inventoryService } from '../../services/inventory.service'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { Button } from '../../components/common/Button'
import { Link } from 'react-router-dom'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n)

export const InventoryReportsPage: React.FC = () => {
  const [dateRange, setDateRange] = useState({ from: '', to: '' })

  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ['inventory-usage', dateRange],
    queryFn: () => inventoryService.getUsageReport(dateRange.from, dateRange.to),
  })

  const { data: valueData, isLoading: valueLoading } = useQuery({
    queryKey: ['inventory-value'],
    queryFn: () => inventoryService.getValueReport(),
  })

  const usageItems: any[] = usageData?.data || usageData || []
  const valueItems: any[] = valueData?.data || valueData || []
  const totalValue = valueItems.reduce((s: number, i: any) => s + (i.total_value || 0), 0)

  const exportCSV = (items: any[], filename: string) => {
    if (!items.length) return
    const headers = Object.keys(items[0]).join(',')
    const rows = items.map((i) => Object.values(i).join(','))
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const DonutChart = ({ data }: { data: { label: string; value: number; color: string }[] }) => {
    const total = data.reduce((s, d) => s + d.value, 0)
    let cumulativePercent = 0

    return (
      <svg viewBox="0 0 100 100" className="w-48 h-48 mx-auto">
        {data.map((d, i) => {
          const startPercent = cumulativePercent
          const endPercent = cumulativePercent + (d.value / total)
          cumulativePercent = endPercent

          const startX = Math.cos(2 * Math.PI * startPercent)
          const startY = Math.sin(2 * Math.PI * startPercent)
          const endX = Math.cos(2 * Math.PI * endPercent)
          const endY = Math.sin(2 * Math.PI * endPercent)

          const largeArcFlag = d.value / total > 0.5 ? 1 : 0
          const pathData = [
            `M 50 50`,
            `L ${50 + 40 * startX} ${50 + 40 * startY}`,
            `A 40 40 0 ${largeArcFlag} 1 ${50 + 40 * endX} ${50 + 40 * endY}`,
            `Z`
          ].join(' ')

          return <path key={i} d={pathData} fill={d.color} stroke="white" strokeWidth="1" />
        })}
        <circle cx="50" cy="50" r="25" fill="white" />
      </svg>
    )
  }

  const BarChart = ({ data }: { data: { label: string; value: number }[] }) => {
    const max = Math.max(...data.map(d => d.value), 1)
    return (
      <div className="space-y-3">
        {data.map((d, i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between text-xs font-medium text-gray-600">
              <span>{d.label}</span>
              <span>{fmt(d.value)}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-amber-500 rounded-full transition-all duration-1000" 
                style={{ width: `${(d.value / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    )
  }

  const categories = [
    '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899', '#6B7280'
  ]

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Usage consumption and value analysis</p>
        </div>
        <Link to="/inventory"><Button variant="ghost" size="sm">← Inventory</Button></Link>
      </div>

      {/* Inventory Value by Category */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">📦 Inventory Value</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">Total: <strong className="text-amber-700">{fmt(totalValue)}</strong></span>
            <Button variant="secondary" size="sm" onClick={() => exportCSV(valueItems, 'inventory-value')}>
              ↓ Export CSV
            </Button>
          </div>
        </div>
        {valueLoading ? (
          <LoadingSpinner />
        ) : valueItems.length === 0 ? (
          <p className="text-gray-500 text-sm">No data available. Add inventory items first.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Category</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Items</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Total Value</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">% of Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {valueItems.map((item: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: categories[i % categories.length] }} />
                        {item.category || 'Uncategorized'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">{item.item_count || 0}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{fmt(item.total_value || 0)}</td>
                      <td className="px-4 py-3 text-right text-gray-500">
                        {totalValue > 0 ? `${((item.total_value / totalValue) * 100).toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-amber-50 border-t border-amber-100 font-bold">
                  <tr>
                    <td className="px-4 py-3 text-gray-700">Total</td>
                    <td className="px-4 py-3 text-right text-gray-700">{valueItems.reduce((s: number, i: any) => s + (i.item_count || 0), 0)}</td>
                    <td className="px-4 py-3 text-right text-amber-700">{fmt(totalValue)}</td>
                    <td className="px-4 py-3 text-right text-gray-500">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center justify-center shadow-sm">
              <h3 className="text-sm font-semibold text-gray-600 mb-4 self-start">Value Distribution</h3>
              <DonutChart 
                data={valueItems.map((item, i) => ({
                  label: item.category || 'Other',
                  value: item.total_value || 0,
                  color: categories[i % categories.length]
                }))} 
              />
              <div className="mt-6 w-full grid grid-cols-2 gap-2">
                {valueItems.slice(0, 4).map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[10px] text-gray-500">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: categories[i % categories.length] }} />
                    <span className="truncate">{item.category || 'Other'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Usage Report */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <h2 className="text-lg font-semibold text-gray-800">📈 Usage Consumption</h2>
          <div className="flex gap-2 items-center flex-wrap">
            <div className="flex gap-2 items-center">
              <label className="text-xs text-gray-500 font-medium">From</label>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange((p) => ({ ...p, from: e.target.value }))}
                className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <span className="text-gray-300">|</span>
              <label className="text-xs text-gray-500 font-medium">To</label>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange((p) => ({ ...p, to: e.target.value }))}
                className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <Button variant="secondary" size="sm" onClick={() => exportCSV(usageItems, 'inventory-usage')}>
              ↓ Export CSV
            </Button>
          </div>
        </div>
        {usageLoading ? (
          <LoadingSpinner />
        ) : usageItems.length === 0 ? (
          <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 p-8 text-center text-gray-500 text-sm">
            No usage data found for this period.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-600 mb-4">Top Costs</h3>
              <BarChart 
                data={usageItems.slice(0, 5).map(item => ({
                  label: item.ingredient_name,
                  value: item.total_cost || 0
                }))} 
              />
            </div>
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Ingredient</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Used</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Bakes</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {usageItems.map((item: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{item.ingredient_name}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{item.total_used} {item.unit}</td>
                      <td className="px-4 py-3 text-right text-gray-500 hidden sm:table-cell">{item.bake_count || 0}</td>
                      <td className="px-4 py-3 text-right font-bold text-amber-700">{fmt(item.total_cost || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
