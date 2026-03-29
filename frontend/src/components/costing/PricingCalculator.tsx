import React, { useState } from 'react'
import { Calculator } from 'lucide-react'
import { Input } from '../common/Input'
import { cn } from '../../utils/cn'

interface PricingCalculatorProps {
  totalCost: number
  servings: number
  overheadCost?: number
  className?: string
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n)

export const PricingCalculator: React.FC<PricingCalculatorProps> = ({
  totalCost,
  servings,
  overheadCost = 0,
  className = '',
}) => {
  const [marginPct, setMarginPct] = useState(40)
  const [sellingPrice, setSellingPrice] = useState<number | null>(null)

  const costPerServing = totalCost / servings
  const suggestedPrice = costPerServing / (1 - marginPct / 100)
  const effectivePrice = sellingPrice ?? suggestedPrice
  const effectiveMargin = effectivePrice > 0 ? ((effectivePrice - costPerServing) / effectivePrice) * 100 : 0
  const profit = effectivePrice - costPerServing
  
  // Break-even is traditionally Fixed Costs / (Price - Variable Cost)
  // If we treat overhead as fixed and (ingredients + labor + packaging) as variable:
  // Here totalCost includes all three. 
  // Let's assume variableCost = totalCost - overheadCost
  const variableCostPerServing = (totalCost - overheadCost) / servings
  const contributionMargin = effectivePrice - variableCostPerServing
  const breakEvenUnits = contributionMargin > 0 ? Math.ceil(overheadCost / contributionMargin) : '—'

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
            { label: 'Break-even quantity (units)', value: breakEvenUnits },
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
        
        {overheadCost > 0 && (
          <p className="text-[10px] text-gray-400 text-center italic">
            *Break-even calculated assuming ₹{overheadCost} as fixed cost.
          </p>
        )}

        {/* Bulk Tiers */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Bulk Pricing Tiers</h4>
          <div className="space-y-2">
            {[5, 10, 25].map(qty => {
              const tierDiscount = qty >= 25 ? 0.15 : qty >= 10 ? 0.10 : 0.05
              const tierPrice = (effectivePrice * (1 - tierDiscount)) * qty
              const tierProfit = tierPrice - (costPerServing * qty)
              return (
                <div key={qty} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 text-xs">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-700">{qty} Units</span>
                    <span className="text-[10px] text-gray-500">{(tierDiscount * 100).toFixed(0)}% discount</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{fmt(tierPrice)}</p>
                    <p className="text-[10px] text-green-600">Profit: {fmt(tierProfit)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
