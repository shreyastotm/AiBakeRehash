import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { costingService } from '../../services/costing.service'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { EmptyState } from '../../components/common/EmptyState'
import { ProfitAnalysis } from '../../components/costing/ProfitAnalysis'
import { Button } from '../../components/common/Button'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n)

export const ProfitAnalysisPage: React.FC = () => {
  const [sortBy, setSortBy] = useState<'margin' | 'profit' | 'name'>('margin')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['profit-margins'],
    queryFn: () => costingService.getProfitMargins(),
  })

  const recipes: any[] = data?.data || data || []

  const sorted = [...recipes].sort((a, b) => {
    if (sortBy === 'margin') return (b.margin_pct || 0) - (a.margin_pct || 0)
    if (sortBy === 'profit') return (b.profit_per_batch || 0) - (a.profit_per_batch || 0)
    return (a.recipe_name || '').localeCompare(b.recipe_name || '')
  })

  const selected = sorted.find((r) => r.id === selectedId)

  const avgMargin = recipes.length
    ? recipes.reduce((s, r) => s + (r.margin_pct || 0), 0) / recipes.length
    : 0

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profit Analysis</h1>
          <p className="text-sm text-gray-500 mt-0.5">Profitability ranking across all recipes</p>
        </div>
        <Link to="/costing"><Button variant="ghost" size="sm">← Cost Calculator</Button></Link>
      </div>

      {/* Summary KPIs */}
      {recipes.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Recipes Priced', value: recipes.length, color: 'text-blue-700', bg: 'bg-blue-50' },
            { label: 'Avg Margin', value: `${avgMargin.toFixed(1)}%`, color: 'text-green-700', bg: 'bg-green-50' },
            { label: 'Best Recipe', value: sorted[0]?.recipe_name || '—', color: 'text-amber-700', bg: 'bg-amber-50', small: true },
            { label: 'Lowest Margin', value: sorted[sorted.length - 1]?.recipe_name || '—', color: 'text-red-700', bg: 'bg-red-50', small: true },
          ].map((kpi) => (
            <div key={kpi.label} className={`${kpi.bg} rounded-xl p-4`}>
              <p className="text-xs text-gray-500 mb-1">{kpi.label}</p>
              <p className={`font-bold ${kpi.color} ${kpi.small ? 'text-sm truncate' : 'text-xl'}`}>{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Sort Controls */}
      <div className="flex gap-2 items-center">
        <span className="text-sm text-gray-500">Sort by:</span>
        {(['margin', 'profit', 'name'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSortBy(s)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              sortBy === s ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s === 'margin' ? 'Margin %' : s === 'profit' ? 'Profit ₹' : 'Name'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : recipes.length === 0 ? (
        <EmptyState
          title="No pricing data"
          description="Calculate costs and pricing for your recipes first."
          actionNode={<Link to="/recipes"><Button>Go to Recipes</Button></Link>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Rankings Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h2 className="font-semibold text-gray-800">Profitability Rankings</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {sorted.map((recipe: any, i: number) => {
                const margin = recipe.margin_pct || 0
                const isSelected = selectedId === recipe.id
                return (
                  <button
                    key={recipe.id}
                    onClick={() => setSelectedId(isSelected ? null : recipe.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-amber-50 border-l-4 border-amber-500' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-xs font-bold w-5 ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-700' : 'text-gray-400'}`}>
                          #{i + 1}
                        </span>
                        <span className="text-sm font-medium text-gray-900 truncate">{recipe.recipe_name}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-bold ${margin < 20 ? 'text-red-600' : margin < 35 ? 'text-yellow-600' : 'text-green-600'}`}>
                          {margin.toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-400">{fmt(recipe.profit_per_batch || 0)}/batch</p>
                      </div>
                    </div>
                    {/* Mini margin bar */}
                    <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${margin < 20 ? 'bg-red-400' : margin < 35 ? 'bg-yellow-400' : 'bg-green-400'}`}
                        style={{ width: `${Math.min(100, margin)}%` }}
                      />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Detail Panel */}
          <div>
            {selected ? (
              <ProfitAnalysis
                data={{
                  recipe_name: selected.recipe_name,
                  total_cost: selected.total_cost || 0,
                  selling_price_per_serving: selected.selling_price_per_serving || 0,
                  servings: selected.servings || 1,
                  units_sold_per_month: selected.units_sold_per_month,
                }}
              />
            ) : (
              <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
                <p className="text-gray-400 text-sm">Select a recipe to see detailed analysis</p>
              </div>
            )}

            {/* Optimization Suggestions */}
            {selected && (
              <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4 space-y-3 shadow-sm">
                <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                  <span>💡</span> Optimization Suggestions
                </h3>
                <div className="space-y-3">
                  {(selected.margin_pct || 0) < 30 ? (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                      <p className="text-xs text-red-800 font-bold mb-1">Low Margin Warning</p>
                      <p className="text-[11px] text-red-700 leading-relaxed">
                        This recipe is below the 30% healthy margin target. Consider increasing the price to 
                        <strong> {fmt((selected.total_cost / selected.servings) / 0.6)}</strong> (40% margin) 
                        or finding cheaper suppliers for top ingredients.
                      </p>
                    </div>
                  ) : (selected.margin_pct || 0) > 50 ? (
                    <div className="p-3 bg-green-50 border border-green-100 rounded-lg">
                      <p className="text-xs text-green-800 font-bold mb-1">High Margin Opportunity</p>
                      <p className="text-[11px] text-green-700 leading-relaxed">
                        Excellent profitability! Focus your marketing efforts on this recipe to maximize overall profit. 
                        Consider a small 5% promotion to drive higher volume.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                      <p className="text-xs text-blue-800 font-bold mb-1">Healthy Margin</p>
                      <p className="text-[11px] text-blue-700 leading-relaxed">
                        This recipe is within the target range. Maintain current pricing and monitor ingredient 
                        cost fluctuations monthly.
                      </p>
                    </div>
                  )}
                  
                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                    <p className="text-xs text-amber-800 font-bold mb-1">Break-Even Analysis</p>
                    <p className="text-[11px] text-amber-700 leading-relaxed">
                      You need to sell <strong>{Math.ceil(selected.total_cost / ((selected.selling_price_per_serving || 1) - ((selected.total_cost / selected.servings) || 0)))} servings</strong> 
                      to cover the batch cost of {fmt(selected.total_cost)}.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
