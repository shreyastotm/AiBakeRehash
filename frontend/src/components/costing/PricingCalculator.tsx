import React, { useState } from 'react'
import { Calculator } from 'lucide-react'
import { Input } from '../common/Input'
import { cn } from '../../utils/cn'

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
    <div className={cn('card mb-6 overflow-hidden', className)}>
      <h2 className="text-base font-semibold text-neutral-800 px-6 py-4 border-b border-neutral-100 flex items-center gap-2">
        <Calculator size={16} className="text-neutral-500" />
        Pricing Calculator
      </h2>
      <p className="text-xs text-neutral-500 px-6 pt-3">Set your selling price and margin</p>

      <div className="p-6 space-y-4">
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

        <dl>
          {[
            { label: 'Cost per serving', value: fmt(costPerServing) },
            { label: 'Suggested price', value: fmt(suggestedPrice) },
            { label: 'Effective margin', value: `${effectiveMargin.toFixed(1)}%` },
            { label: 'Profit per serving', value: fmt(profit) },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="flex items-center justify-between py-2.5 border-b border-neutral-100 last:border-0 text-sm"
            >
              <dt className="text-neutral-600">{label}</dt>
              <dd className="font-medium text-neutral-900">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="bg-neutral-50 rounded-xl px-4 py-4 text-center border border-neutral-100">
          <p className="text-xs text-neutral-500 mb-1">Recommended selling price</p>
          <p className="text-2xl font-bold text-primary-500">{fmt(effectivePrice)}</p>
          <p className="text-xs text-neutral-500 mt-0.5">per serving</p>
        </div>
      </div>
    </div>
  )
}
