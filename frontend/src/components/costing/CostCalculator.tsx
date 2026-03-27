import React from 'react'
import { IndianRupee } from 'lucide-react'
import { ProgressBar } from '../common/ProgressBar'
import { cn } from '../../utils/cn'

export interface IngredientCost {
  ingredient_name: string
  quantity_grams: number
  cost: number
}

export interface CostBreakdown {
  ingredients: IngredientCost[]
  overhead_cost: number
  packaging_cost: number
  labor_cost: number
  total_cost: number
  cost_per_serving: number
  servings: number
}

interface CostCalculatorProps {
  breakdown: CostBreakdown
  className?: string
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n)

export const CostCalculator: React.FC<CostCalculatorProps> = ({ breakdown, className = '' }) => {
  const ingredientTotal = breakdown.ingredients.reduce((s, i) => s + i.cost, 0)

  return (
    <div className={cn('card mb-6 overflow-hidden', className)}>
      <h2 className="text-base font-semibold text-neutral-800 px-6 py-4 border-b border-neutral-100 flex items-center gap-2">
        <IndianRupee size={16} className="text-neutral-500" />
        Cost Breakdown
      </h2>

      <div className="p-6 space-y-4">
        {/* Ingredient costs */}
        <section aria-label="Ingredient costs">
          <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
            Ingredients
          </h4>
          <ul role="list">
            {breakdown.ingredients.map((item, i) => (
              <li
                key={i}
                className="flex items-center justify-between py-2.5 border-b border-neutral-100 last:border-0 text-sm"
              >
                <span className="text-neutral-700 truncate flex-1 mr-2">{item.ingredient_name}</span>
                <span className="text-neutral-900 font-medium shrink-0">{fmt(item.cost)}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between pt-3 font-semibold text-neutral-900">
            <span>Ingredient subtotal</span>
            <span>{fmt(ingredientTotal)}</span>
          </div>
        </section>

        {/* Other costs */}
        <section aria-label="Other costs">
          <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
            Other Costs
          </h4>
          <ul role="list">
            {[
              { label: 'Overhead', value: breakdown.overhead_cost },
              { label: 'Packaging', value: breakdown.packaging_cost },
              { label: 'Labour', value: breakdown.labor_cost },
            ].map(({ label, value }) => (
              <li
                key={label}
                className="flex items-center justify-between py-2.5 border-b border-neutral-100 last:border-0 text-sm"
              >
                <span className="text-neutral-700">{label}</span>
                <span className="text-neutral-900">{fmt(value)}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Totals */}
        <div className="border-t-2 border-neutral-200 pt-3 space-y-1">
          <div className="flex items-center justify-between pt-3 font-semibold text-neutral-900">
            <span>Total Cost</span>
            <span className="text-primary-500">{fmt(breakdown.total_cost)}</span>
          </div>
          <div className="flex justify-between text-sm text-neutral-500">
            <span>Per serving ({breakdown.servings} servings)</span>
            <span>{fmt(breakdown.cost_per_serving)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
