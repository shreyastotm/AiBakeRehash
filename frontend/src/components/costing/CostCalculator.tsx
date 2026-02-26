import React from 'react'

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
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      <div className="bg-amber-50 px-4 py-3 border-b border-amber-100">
        <h3 className="font-bold text-gray-900">Cost Breakdown</h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Ingredient costs */}
        <section aria-label="Ingredient costs">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ingredients</h4>
          <ul className="space-y-1" role="list">
            {breakdown.ingredients.map((item, i) => (
              <li key={i} className="flex justify-between text-sm">
                <span className="text-gray-700 truncate flex-1 mr-2">{item.ingredient_name}</span>
                <span className="text-gray-900 font-medium shrink-0">{fmt(item.cost)}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between text-sm font-semibold border-t border-gray-100 pt-2 mt-2">
            <span>Ingredient subtotal</span>
            <span>{fmt(ingredientTotal)}</span>
          </div>
        </section>

        {/* Other costs */}
        <section aria-label="Other costs">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Other Costs</h4>
          <ul className="space-y-1" role="list">
            {[
              { label: 'Overhead', value: breakdown.overhead_cost },
              { label: 'Packaging', value: breakdown.packaging_cost },
              { label: 'Labour', value: breakdown.labor_cost },
            ].map(({ label, value }) => (
              <li key={label} className="flex justify-between text-sm">
                <span className="text-gray-700">{label}</span>
                <span className="text-gray-900">{fmt(value)}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Totals */}
        <div className="border-t-2 border-gray-200 pt-3 space-y-1">
          <div className="flex justify-between font-bold text-base">
            <span>Total Cost</span>
            <span className="text-amber-700">{fmt(breakdown.total_cost)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>Per serving ({breakdown.servings} servings)</span>
            <span>{fmt(breakdown.cost_per_serving)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
