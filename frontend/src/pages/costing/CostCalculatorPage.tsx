import React, { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { costingService } from '../../services/costing.service'
import { recipeService } from '../../services/recipe.service'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { CostCalculator } from '../../components/costing/CostCalculator'
import { PricingCalculator } from '../../components/costing/PricingCalculator'

interface CostInputs {
  overhead_cost: string
  packaging_cost: string
  labor_cost: string
}

export const CostCalculatorPage: React.FC = () => {
  const { recipeId } = useParams<{ recipeId: string }>()
  const [inputs, setInputs] = useState<CostInputs>({
    overhead_cost: '0',
    packaging_cost: '0',
    labor_cost: '0',
  })

  const { data: costData, isLoading, refetch } = useQuery({
    queryKey: ['recipe-cost', recipeId],
    queryFn: async () => {
      try {
        const res = await costingService.getRecipeCost(recipeId!)
        return res
      } catch (err: any) {
        if (err.response?.status === 404) return null
        throw err
      }
    },
    enabled: !!recipeId,
    retry: false, // Don't retry on 404
  })

  const { data: historyData } = useQuery({
    queryKey: ['recipe-cost-history', recipeId],
    queryFn: () => costingService.getCostHistory(recipeId!),
    enabled: !!recipeId,
  })

  const { data: recipeData } = useQuery({
    queryKey: ['recipe', recipeId],
    queryFn: async () => {
      const res = await recipeService.getRecipe(recipeId!)
      return res
    },
    enabled: !!recipeId,
  })

  const calculateMutation = useMutation({
    mutationFn: () =>
      costingService.calculateRecipeCost(recipeId!, {
        overhead_cost: Number(inputs.overhead_cost),
        packaging_cost: Number(inputs.packaging_cost),
        labor_cost: Number(inputs.labor_cost),
      }),
    onSuccess: () => {
      refetch()
    },
  })

  const set = (field: keyof CostInputs) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setInputs((p: CostInputs) => ({ ...p, [field]: e.target.value }))

  const breakdown = costData
    ? {
        ingredients: (costData as any).ingredient_breakdown || [],
        overhead_cost: (costData as any).overhead_cost || Number(inputs.overhead_cost),
        packaging_cost: (costData as any).packaging_cost || Number(inputs.packaging_cost),
        labor_cost: (costData as any).labor_cost || Number(inputs.labor_cost),
        total_cost: (costData as any).total_cost || 0,
        cost_per_serving: (costData as any).cost_per_serving || 0,
        servings: (costData as any).servings || 1,
      }
    : null

  const totalWeightGrams = recipeData?.ingredients?.reduce((acc: number, ing: any) => acc + (ing.quantity_grams || 0), 0) || 0
  const costPer100g = totalWeightGrams > 0 ? (breakdown?.total_cost || 0) / (totalWeightGrams / 100) : 0

  const history: any[] = historyData?.data || historyData || []

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n)

  if (!recipeId) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center">
          <p className="text-amber-700 font-medium mb-3">Select a recipe to calculate costs</p>
          <Link to="/recipes?select=costing"><Button variant="secondary">Browse Recipes</Button></Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cost Calculator</h1>
          <p className="text-sm text-gray-500 mt-0.5">Calculate recipe cost and suggest pricing</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/recipes/${recipeId}`}><Button variant="ghost" size="sm">← Recipe</Button></Link>
          <Link to="/costing/profit-analysis"><Button variant="secondary" size="sm">📊 Profit Analysis</Button></Link>
        </div>
      </div>

      {/* Stats row */}
      {breakdown && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase font-bold">Total Cost</p>
            <p className="text-lg font-bold text-gray-900">{fmt(breakdown.total_cost)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase font-bold">Per Serving</p>
            <p className="text-lg font-bold text-gray-900">{fmt(breakdown.cost_per_serving)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase font-bold">Cost per 100g</p>
            <p className="text-lg font-bold text-amber-700">{fmt(costPer100g)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase font-bold">Total Weight</p>
            <p className="text-lg font-bold text-gray-900">{totalWeightGrams}g</p>
          </div>
        </div>
      )}

      {/* Cost Inputs */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Cost Inputs</h2>
        <p className="text-sm text-gray-500">
          Ingredient costs come from your inventory. Add overhead, packaging, and labour below.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Overhead Cost (₹)"
            type="number"
            min="0"
            step="1"
            value={inputs.overhead_cost}
            onChange={set('overhead_cost')}
            hint="Electricity, rent, etc."
          />
          <Input
            label="Packaging Cost (₹)"
            type="number"
            min="0"
            step="1"
            value={inputs.packaging_cost}
            onChange={set('packaging_cost')}
            hint="Box, bag, wrap, etc."
          />
          <Input
            label="Labor Cost (₹)"
            type="number"
            min="0"
            step="1"
            value={inputs.labor_cost}
            onChange={set('labor_cost')}
            hint="Your time valuation"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Button
            onClick={() => calculateMutation.mutate()}
            loading={calculateMutation.isPending}
            disabled={!recipeData || recipeData.ingredients?.length === 0 || recipeData.servings <= 0}
          >
            Calculate Cost
          </Button>
          {calculateMutation.isError && (
            <p className="text-sm text-red-600 font-medium">
              Error: {(calculateMutation.error as any)?.response?.data?.error?.message || (calculateMutation.error as any)?.message || 'Calculation failed'}
            </p>
          )}
          {recipeData && (recipeData.servings <= 0 || recipeData.yield_weight_grams <= 0) && (
            <p className="text-sm text-amber-600 font-medium">
              ⚠️ This recipe has zero servings or yield. Please edit the recipe details first.
            </p>
          )}
        </div>
      </div>

      {isLoading && <LoadingSpinner />}

      {/* Cost Breakdown */}
      {breakdown && (
        <CostCalculator breakdown={breakdown} />
      )}

      {/* Pricing Calculator */}
      {breakdown && breakdown.total_cost > 0 && (
        <PricingCalculator 
          totalCost={breakdown.total_cost} 
          servings={breakdown.servings} 
          overheadCost={breakdown.overhead_cost}
        />
      )}

      {/* Cost History */}
      {history.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Cost History</h3>
            {history.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 uppercase font-bold">Trend</span>
                <svg width="80" height="20" className="overflow-visible">
                  {(() => {
                    const costs = history.map(h => h.total_cost).reverse()
                    const min = Math.min(...costs)
                    const max = Math.max(...costs)
                    const range = max - min || 1
                    const points = costs.map((c, i) => {
                      const x = (i / (costs.length - 1)) * 80
                      const y = 20 - ((c - min) / range) * 20
                      return `${x},${y}`
                    }).join(' ')
                    return (
                      <>
                        <polyline
                          fill="none"
                          stroke="#F59E0B"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={points}
                        />
                        <circle cx="80" cy={20 - ((costs[costs.length-1] - min)/range)*20} r="3" fill="#F59E0B" />
                      </>
                    )
                  })()}
                </svg>
              </div>
            )}
          </div>
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-2 text-gray-500">Date</th>
                <th className="text-right px-4 py-2 text-gray-500">Total Cost</th>
                <th className="text-right px-4 py-2 text-gray-500">Per Serving</th>
                <th className="text-right px-4 py-2 text-gray-500 hidden sm:table-cell">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.map((h: any, i: number) => {
                const prev = history[i + 1]
                const changePct = prev ? ((h.total_cost - prev.total_cost) / prev.total_cost) * 100 : null
                return (
                  <tr key={h.id || i} className={`hover:bg-gray-50 ${i === 0 ? 'bg-amber-50' : ''}`}>
                    <td className="px-4 py-2 text-gray-700">
                      {new Date(h.calculated_at).toLocaleDateString('en-IN')}
                      {i === 0 && <span className="ml-2 text-xs bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded">Latest</span>}
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-gray-900">{fmt(h.total_cost)}</td>
                    <td className="px-4 py-2 text-right text-gray-700">{fmt(h.cost_per_serving)}</td>
                    <td className="px-4 py-2 text-right hidden sm:table-cell">
                      {changePct !== null && (
                        <span className={`text-xs font-medium ${Math.abs(changePct) > 10 ? changePct > 0 ? 'text-red-600' : 'text-green-600' : 'text-gray-500'}`}>
                          {changePct > 0 ? '↑' : '↓'} {Math.abs(changePct).toFixed(1)}%
                          {Math.abs(changePct) > 10 && ' ⚠️'}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
