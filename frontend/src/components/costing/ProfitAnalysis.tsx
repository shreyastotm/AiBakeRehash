import React from 'react'
import { TrendingUp, BarChart3 } from 'lucide-react'
import { ProgressBar } from '../common/ProgressBar'
import { cn } from '../../utils/cn'

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
    <div className={cn('card mb-6 overflow-hidden', className)}>
      <h2 className="text-base font-semibold text-neutral-800 px-6 py-4 border-b border-neutral-100 flex items-center gap-2">
        <BarChart3 size={16} className="text-neutral-500" />
        Profit Analysis
      </h2>
      <p className="text-sm text-neutral-600 px-6 pt-3">{data.recipe_name}</p>

      <div className="p-6 space-y-4">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {[
            { label: 'Total Cost', value: fmt(data.total_cost) },
            { label: 'Revenue / Batch', value: fmt(revenuePerBatch) },
            { label: 'Profit / Batch', value: fmt(profitPerBatch) },
            { label: 'Cost / Serving', value: fmt(costPerServing) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-neutral-50 rounded-lg p-3">
              <dt className="text-xs text-neutral-500 mb-1">{label}</dt>
              <dd className="font-semibold text-neutral-900">{value}</dd>
            </div>
          ))}
        </dl>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-neutral-600 flex items-center gap-1.5">
              <TrendingUp size={14} className="text-neutral-400" />
              Profit Margin
            </span>
            <span
              className={cn(
                'font-bold text-lg',
                marginPct > 40
                  ? 'text-success'
                  : marginPct > 20
                  ? 'text-warning'
                  : 'text-error',
              )}
            >
              {marginPct.toFixed(1)}%
            </span>
          </div>
          <ProgressBar
            value={marginPct}
            showPercent={false}
            color={marginColor}
            size="lg"
          />
          {marginPct < 20 && (
            <p className="text-xs text-error mt-1" role="alert">
              Margin below 20% — consider adjusting your selling price.
            </p>
          )}
        </div>

        {monthlyProfit !== null && (
          <div className="bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-4 text-center">
            <p className="text-xs text-neutral-500 mb-1">
              Estimated monthly profit ({data.units_sold_per_month} units/month)
            </p>
            <p className="text-2xl font-bold text-success">{fmt(monthlyProfit)}</p>
          </div>
        )}
      </div>
    </div>
  )
}
