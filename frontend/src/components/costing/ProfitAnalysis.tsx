import React from 'react'
import { ProgressBar } from '../common/ProgressBar'

export interface ProfitData {
  recipe_name: string
  total_cost: number
  selling_price_per_serving: number
  servings: number
  units_sold_per_month?: number
}

interface ProfitAnalysisProps {
  data: ProfitData
  className?: string
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n)

export const ProfitAnalysis: React.FC<ProfitAnalysisProps> = ({ data, className = '' }) => {
  const costPerServing = data.total_cost / data.servings
  const revenuePerBatch = data.selling_price_per_serving * data.servings
  const profitPerBatch = revenuePerBatch - data.total_cost
  const marginPct = (profitPerBatch / revenuePerBatch) * 100
  const monthlyProfit = data.units_sold_per_month
    ? (data.selling_price_per_serving - costPerServing) * data.units_sold_per_month
    : null

  const marginColor: 'error' | 'warning' | 'success' =
    marginPct < 20 ? 'error' : marginPct < 35 ? 'warning' : 'success'

  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      <div className="bg-amber-50 px-4 py-3 border-b border-amber-100">
        <h3 className="font-bold text-gray-900">Profit Analysis</h3>
        <p className="text-sm text-gray-600">{data.recipe_name}</p>
      </div>

      <div className="p-4 space-y-4">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {[
            { label: 'Total Cost', value: fmt(data.total_cost) },
            { label: 'Revenue / Batch', value: fmt(revenuePerBatch) },
            { label: 'Profit / Batch', value: fmt(profitPerBatch) },
            { label: 'Cost / Serving', value: fmt(costPerServing) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 rounded-lg p-3">
              <dt className="text-xs text-gray-500 mb-1">{label}</dt>
              <dd className="font-semibold text-gray-900">{value}</dd>
            </div>
          ))}
        </dl>

        <div>
          <ProgressBar
            value={marginPct}
            label={`Profit Margin: ${marginPct.toFixed(1)}%`}
            showPercent={false}
            color={marginColor}
            size="lg"
          />
          {marginPct < 20 && (
            <p className="text-xs text-red-600 mt-1" role="alert">
              Margin below 20% — consider adjusting your selling price.
            </p>
          )}
        </div>

        {monthlyProfit !== null && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-center">
            <p className="text-xs text-gray-500 mb-0.5">
              Estimated monthly profit ({data.units_sold_per_month} units/month)
            </p>
            <p className="text-2xl font-bold text-green-700">{fmt(monthlyProfit)}</p>
          </div>
        )}
      </div>
    </div>
  )
}
