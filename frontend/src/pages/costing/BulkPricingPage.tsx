import React, { useState } from 'react'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { Link } from 'react-router-dom'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n)

interface PricingTier {
  min_qty: number
  max_qty: number | null
  discount_pct: number
}

const DEFAULT_TIERS: PricingTier[] = [
  { min_qty: 1, max_qty: 9, discount_pct: 0 },
  { min_qty: 10, max_qty: 49, discount_pct: 5 },
  { min_qty: 50, max_qty: 99, discount_pct: 10 },
  { min_qty: 100, max_qty: null, discount_pct: 15 },
]

export const BulkPricingPage: React.FC = () => {
  const [basePrice, setBasePrice] = useState<string>('100')
  const [tiers, setTiers] = useState<PricingTier[]>(DEFAULT_TIERS)
  const [costPerUnit, setCostPerUnit] = useState<string>('60')

  const addTier = () => {
    setTiers((prev) => [...prev, { min_qty: (prev.at(-1)?.max_qty || 100) + 1, max_qty: null, discount_pct: 0 }])
  }

  const removeTier = (i: number) => setTiers((prev) => prev.filter((_, idx) => idx !== i))

  const setTierField = (i: number, field: keyof PricingTier, value: string) => {
    setTiers((prev) => prev.map((t, idx) => idx === i ? { ...t, [field]: value === '' ? null : Number(value) } : t))
  }

  const cost = Number(costPerUnit) || 0
  const base = Number(basePrice) || 0

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bulk Pricing</h1>
          <p className="text-sm text-gray-500 mt-0.5">Define quantity tiers with discount pricing</p>
        </div>
        <Link to="/costing"><Button variant="ghost" size="sm">← Costing</Button></Link>
      </div>

      {/* Base Pricing Inputs */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Base Pricing</h2>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Cost per Unit (₹)"
            type="number"
            min="0"
            step="0.01"
            value={costPerUnit}
            onChange={(e) => setCostPerUnit(e.target.value)}
            hint="Manufacturing cost per piece/serving"
          />
          <Input
            label="Base Selling Price (₹)"
            type="number"
            min="0"
            step="0.50"
            value={basePrice}
            onChange={(e) => setBasePrice(e.target.value)}
            hint="Full-price selling price"
          />
        </div>
        {base > 0 && cost > 0 && (
          <div className="bg-amber-50 rounded-lg px-4 py-3 text-sm text-amber-800">
            Base margin: <strong>{(((base - cost) / base) * 100).toFixed(1)}%</strong>
            {' · '}Profit per unit: <strong>{fmt(base - cost)}</strong>
          </div>
        )}
      </div>

      {/* Tier Builder */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Pricing Tiers</h2>
          <Button variant="secondary" size="sm" onClick={addTier}>+ Add Tier</Button>
        </div>
        <div className="divide-y divide-gray-100">
          <div className="grid grid-cols-4 px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50">
            <span>Min Qty</span>
            <span>Max Qty</span>
            <span>Discount %</span>
            <span>Price</span>
          </div>
          {tiers.map((tier, i) => {
            const tierPrice = base * (1 - tier.discount_pct / 100)
            const tierMargin = base > 0 ? (((tierPrice - cost) / tierPrice) * 100) : 0
            return (
              <div key={i} className="px-4 py-3 grid grid-cols-4 gap-3 items-center">
                <input
                  type="number"
                  className="border border-gray-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-amber-400"
                  value={tier.min_qty}
                  onChange={(e) => setTierField(i, 'min_qty', e.target.value)}
                />
                <input
                  type="number"
                  className="border border-gray-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-amber-400"
                  value={tier.max_qty ?? ''}
                  onChange={(e) => setTierField(i, 'max_qty', e.target.value)}
                  placeholder="∞"
                />
                <input
                  type="number"
                  min="0"
                  max="99"
                  className="border border-gray-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-amber-400"
                  value={tier.discount_pct}
                  onChange={(e) => setTierField(i, 'discount_pct', e.target.value)}
                />
                <div className="flex items-center gap-2">
                  <div>
                    <p className={`text-sm font-semibold ${tierMargin < 0 ? 'text-red-600' : 'text-gray-900'}`}>{fmt(tierPrice)}</p>
                    <p className={`text-xs ${tierMargin < 20 ? 'text-red-500' : 'text-gray-400'}`}>{tierMargin.toFixed(1)}% margin</p>
                  </div>
                  {tiers.length > 1 && (
                    <button
                      onClick={() => removeTier(i)}
                      className="text-red-400 hover:text-red-600 ml-auto text-lg leading-none min-h-[32px] min-w-[32px] flex items-center justify-center"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Pricing Table Preview */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">Pricing Table Preview</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-2 text-gray-500">Quantity</th>
              <th className="text-right px-4 py-2 text-gray-500">Price/Unit</th>
              <th className="text-right px-4 py-2 text-gray-500">Discount</th>
              <th className="text-right px-4 py-2 text-gray-500">Margin</th>
              <th className="text-right px-4 py-2 text-gray-500">You Earn</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tiers.map((tier, i) => {
              const tierPrice = base * (1 - tier.discount_pct / 100)
              const tierMargin = base > 0 ? (((tierPrice - cost) / tierPrice) * 100) : 0
              const midQty = tier.max_qty ? Math.round((tier.min_qty + tier.max_qty) / 2) : tier.min_qty * 2
              const earn = (tierPrice - cost) * midQty
              return (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-700">
                    {tier.min_qty}{tier.max_qty ? `–${tier.max_qty}` : '+'} units
                  </td>
                  <td className="px-4 py-2 text-right font-semibold text-gray-900">{fmt(tierPrice)}</td>
                  <td className="px-4 py-2 text-right text-green-600">{tier.discount_pct > 0 ? `-${tier.discount_pct}%` : '—'}</td>
                  <td className={`px-4 py-2 text-right font-medium ${tierMargin < 20 ? 'text-red-500' : 'text-green-600'}`}>
                    {tierMargin.toFixed(1)}%
                  </td>
                  <td className="px-4 py-2 text-right text-gray-600">{fmt(earn)} (est.)</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3">
        <Button onClick={() => window.print()}>🖨️ Print / PDF</Button>
        <Button variant="secondary">💾 Save Tiers</Button>
      </div>
    </div>
  )
}
