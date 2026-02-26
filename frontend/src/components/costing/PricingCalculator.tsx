import React, { useState } from 'react'
import { Input } from '../common/Input'

interface PricingCalculatorProps {
  totalCost: number
  servings: number
  className?: string
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n)

export const PricingCalculator: React.FC<PricingCalculatorProps> = ({
  totalCost,
  servings,
  className = '',
}) => {
  const [marginPct, setMarginPct] = useState(40)
  const [sellingPrice, setSellingPrice] = useState<number | null>(null)

  const costPerServing = totalCost / servings
  const suggestedPrice = costPerServing / (1 - marginPct / 100)
  const effectivePrice = sellingPrice ?? suggestedPrice
  const effectiveMargin = ((effectivePrice - costPerServing) / effectivePrice) * 100
  const profit = effectivePrice - costPerServing

  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      <div className="bg-amber-50 px-4 py-3 border-b border-amber-100">
        <h3 className="font-bold text-gray-900">Pricing Calculator</h3>
        <p className="text-xs text-gray-500 mt-0.5">Set your selling price and margin</p>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Target Margin (%)"
            type="number"
            min="0"
            max="99"
            value={String(marginPct)}
            onChange={(e) => setMarginPct(Number(e.target.value))}
          />
          <Input
            label="Selling Price (₹)"
            type="number"
            min="0"
            step="0.50"
            placeholder={suggestedPrice.toFixed(2)}
            value={sellingPrice !== null ? String(sellingPrice) : ''}
            onChange={(e) => setSellingPrice(e.target.value ? Number(e.target.value) : null)}
            hint="Leave blank to use suggested"
          />
        </div>

        <dl className="space-y-2 text-sm">
          {[
            { label: 'Cost per serving', value: fmt(costPerServing) },
            { label: 'Suggested price', value: fmt(suggestedPrice) },
            { label: 'Effective margin', value: `${effectiveMargin.toFixed(1)}%` },
            { label: 'Profit per serving', value: fmt(profit) },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <dt className="text-gray-600">{label}</dt>
              <dd className="font-medium text-gray-900">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="bg-amber-50 rounded-lg px-4 py-3 text-center">
          <p className="text-xs text-gray-500 mb-0.5">Recommended selling price</p>
          <p className="text-2xl font-bold text-amber-700">{fmt(effectivePrice)}</p>
          <p className="text-xs text-gray-500">per serving</p>
        </div>
      </div>
    </div>
  )
}
