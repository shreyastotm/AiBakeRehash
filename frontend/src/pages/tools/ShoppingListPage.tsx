import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { recipeService } from '../../services/recipe.service'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { EmptyState } from '../../components/common/EmptyState'
import { Button } from '../../components/common/Button'
import { Link } from 'react-router-dom'

interface ShoppingItem {
  ingredient_name: string
  total_grams: number
  unit: string
  recipes: string[]
  checked: boolean
}

const CATEGORY_ORDER = ['Flour & Grains', 'Dairy', 'Sweeteners', 'Fats & Oils', 'Eggs', 'Leavening', 'Flavourings', 'Nuts & Seeds', 'Other']

function categorize(name: string): string {
  const n = name.toLowerCase()
  if (/flour|maida|atta|besan|sooji|semolina/.test(n)) return 'Flour & Grains'
  if (/milk|cream|butter|ghee|yogurt|curd|khoya|mawa|paneer|cheese/.test(n)) return 'Dairy'
  if (/sugar|jaggery|honey|syrup|palm sugar/.test(n)) return 'Sweeteners'
  if (/oil|fat|shortening/.test(n)) return 'Fats & Oils'
  if (/egg/.test(n)) return 'Eggs'
  if (/yeast|baking powder|baking soda|salt/.test(n)) return 'Leavening'
  if (/vanilla|cardamom|saffron|rose water|cinnamon|ginger|spice|elaichi|kesar/.test(n)) return 'Flavourings'
  if (/nut|almond|cashew|walnut|pistachio|seed|sesame/.test(n)) return 'Nuts & Seeds'
  return 'Other'
}

export const ShoppingListPage: React.FC = () => {
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<Set<string>>(new Set())
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())
  const [scalingFactors, setScalingFactors] = useState<Record<string, number>>({})

  const { data: recipesData, isLoading } = useQuery({
    queryKey: ['recipes'],
    queryFn: () => recipeService.getRecipes(),
  })

  const recipes: any[] = recipesData?.recipes || []

  const { data: detailsData } = useQuery({
    queryKey: ['recipe-details-expanded', Array.from(selectedRecipeIds).sort().join(',')],
    queryFn: async () => {
      const results = await Promise.all(
        Array.from(selectedRecipeIds).map((id) => recipeService.getRecipeIngredientsExpanded(id))
      )
      // Flatten results and associate with recipe title
      const flattened: any[] = []
      Array.from(selectedRecipeIds).forEach((id, idx) => {
        const recipe = recipes.find(r => r.id === id)
        const ingredients = results[idx]
        ingredients.forEach(ing => {
          flattened.push({ ...ing, recipe_title: recipe?.title || 'Unknown' })
        })
      })
      return flattened
    },
    enabled: selectedRecipeIds.size > 0 && recipes.length > 0,
  })

  // Aggregate ingredients across selected recipes
  const aggregated = useMemo(() => {
    if (!detailsData) return []
    const map = new Map<string, ShoppingItem>()

    detailsData.forEach((ing: any) => {
      const factor = scalingFactors[ing.recipe_id] ?? 1
      
      // If it's a component of a composite, use component name. Otherwise use ingredient name.
      const name = (ing.component_ingredient_name || ing.ingredient_name || '').trim()
      if (!name) return
      
      const key = name.toLowerCase()
      // Use component quantity if available, otherwise ingredient quantity
      const grams = (ing.component_quantity_grams || ing.quantity_grams || 0) * factor
      
      if (map.has(key)) {
        const existing = map.get(key)!
        existing.total_grams += grams
        if (!existing.recipes.includes(ing.recipe_title)) {
          existing.recipes.push(ing.recipe_title)
        }
      } else {
        map.set(key, {
          ingredient_name: name,
          total_grams: grams,
          unit: 'g', // Standardized to grams for shopping
          recipes: [ing.recipe_title],
          checked: false,
        })
      }
    })

    return Array.from(map.values()).sort((a, b) => a.ingredient_name.localeCompare(b.ingredient_name))
  }, [detailsData, scalingFactors])

  const byCategory = useMemo(() => {
    const cats: Record<string, ShoppingItem[]> = {}
    aggregated.forEach((item) => {
      const cat = categorize(item.ingredient_name)
      if (!cats[cat]) cats[cat] = []
      cats[cat].push(item)
    })
    return cats
  }, [aggregated])

  const toggleCheck = (name: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const toggleRecipe = (id: string) => {
    setSelectedRecipeIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const exportText = () => {
    const lines = ['🛒 AiBake Shopping List\n']
    Object.entries(byCategory).forEach(([cat, items]) => {
      lines.push(`\n📦 ${cat}`)
      items.forEach((item) => {
        const qty = item.total_grams >= 1000 ? `${(item.total_grams / 1000).toFixed(2)} kg` : `${Math.ceil(item.total_grams)} g`
        lines.push(`${checkedItems.has(item.ingredient_name) ? '✅' : '⬜'} ${item.ingredient_name} — ${qty}`)
      })
    })
    const text = lines.join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'shopping-list.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handlePrint = () => {
    window.print()
  }

  const getCategoryEmoji = (cat: string) => {
    switch (cat) {
      case 'Flour & Grains': return '🌾'
      case 'Dairy': return '🥛'
      case 'Sweeteners': return '🍯'
      case 'Fats & Oils': return '🧈'
      case 'Eggs': return '🥚'
      case 'Leavening': return '🧬'
      case 'Flavourings': return '🧪'
      case 'Nuts & Seeds': return '🥜'
      default: return '📦'
    }
  }

  const shareWhatsApp = () => {
    const lines = ['🛒 *AIBAKE SHOPPING LIST*', `📅 _${new Date().toLocaleDateString('en-IN')}_\n`]
    
    Object.entries(byCategory).forEach(([cat, items]) => {
      const pendingItems = items.filter(i => !checkedItems.has(i.ingredient_name))
      if (pendingItems.length === 0) return

      const emoji = getCategoryEmoji(cat)
      lines.push(`*${emoji} ${cat.toUpperCase()}*`)
      
      pendingItems.forEach((item) => {
        const qty = item.total_grams >= 1000 ? `${(item.total_grams / 1000).toFixed(2)} kg` : `${Math.ceil(item.total_grams)} g`
        lines.push(`• ${item.ingredient_name} — *${qty}*`)
      })
      lines.push('') // Blank line between categories
    })
    
    if (selectedRecipeIds.size > 0) {
      lines.push(`\n_For ${selectedRecipeIds.size} recipe(s)_`)
    }

    const msg = encodeURIComponent(lines.join('\n'))
    window.open(`https://wa.me/?text=${msg}`, '_blank')
  }

  const checkedCount = aggregated.filter((i) => checkedItems.has(i.ingredient_name)).length

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 pb-20">
      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shopping List</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {selectedRecipeIds.size} recipe{selectedRecipeIds.size !== 1 ? 's' : ''} selected
            {aggregated.length > 0 && ` · ${aggregated.length} ingredients`}
            {checkedCount > 0 && ` · ${checkedCount} checked`}
          </p>
        </div>
        {aggregated.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <Button variant="secondary" size="sm" onClick={handlePrint}>🖨️ Print / PDF</Button>
            <Button variant="secondary" size="sm" onClick={exportText}>⬇️ Export .txt</Button>
            <Button variant="secondary" size="sm" onClick={shareWhatsApp}>💬 WhatsApp</Button>
            <Button variant="ghost" size="sm" onClick={() => setCheckedItems(new Set())}>Clear Checks</Button>
          </div>
        )}
      </div>

      <div className="hidden print:block text-center border-b pb-4 mb-6">
        <h1 className="text-3xl font-bold">🛒 AiBake Shopping List</h1>
        <p className="text-gray-500 mt-1">{new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
      </div>

      {/* Recipe Selector */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden print:hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800 text-sm">Select Recipes</h2>
        </div>
        {isLoading ? (
          <div className="p-4"><LoadingSpinner /></div>
        ) : recipes.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No recipes"
              description="Create recipes first to generate a shopping list."
              actionNode={<Link to="/recipes/new"><Button size="sm">Create Recipe</Button></Link>}
            />
          </div>
        ) : (
          <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
            {recipes.map((recipe: any) => {
              const isSelected = selectedRecipeIds.has(recipe.id)
              const factor = scalingFactors[recipe.id] ?? 1
              return (
                <div key={recipe.id} className={`flex items-center gap-3 px-4 py-3 transition-colors ${isSelected ? 'bg-amber-50' : 'hover:bg-gray-50'}`}>
                  <input
                    type="checkbox"
                    id={`recipe-${recipe.id}`}
                    checked={isSelected}
                    onChange={() => toggleRecipe(recipe.id)}
                    className="w-4 h-4 accent-amber-500"
                  />
                  <label htmlFor={`recipe-${recipe.id}`} className="flex-1 cursor-pointer">
                    <p className="font-medium text-gray-900 text-sm">{recipe.title}</p>
                    <p className="text-xs text-gray-400">{recipe.servings} servings · {recipe.ingredients?.length || 0} ingredients</p>
                  </label>
                  {isSelected && (
                    <div className="flex items-center gap-1">
                      <label className="text-xs text-gray-500">×</label>
                      <input
                        type="number"
                        min="0.25"
                        max="20"
                        step="0.25"
                        value={factor}
                        onChange={(e) => setScalingFactors((p) => ({ ...p, [recipe.id]: Number(e.target.value) }))}
                        className="w-14 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 text-center"
                        title="Scaling factor"
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Shopping List */}
      {selectedRecipeIds.size > 0 && aggregated.length > 0 && (
        <div className="space-y-4">
          {CATEGORY_ORDER.filter((cat) => byCategory[cat]?.length > 0).map((cat) => (
            <div key={cat} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h3 className="font-semibold text-gray-700 text-sm">{cat}</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {byCategory[cat].map((item) => {
                  const isChecked = checkedItems.has(item.ingredient_name)
                  const displayQty = item.total_grams >= 1000
                    ? `${(item.total_grams / 1000).toFixed(2)} kg`
                    : `${Math.ceil(item.total_grams)} g`
                  return (
                    <div
                      key={item.ingredient_name}
                      className={`flex items-center gap-3 px-4 py-3 transition-colors ${isChecked ? 'bg-green-50' : 'hover:bg-gray-50'}`}
                    >
                      <input
                        type="checkbox"
                        id={`item-${item.ingredient_name}`}
                        checked={isChecked}
                        onChange={() => toggleCheck(item.ingredient_name)}
                        className="w-4 h-4 accent-green-500 shrink-0"
                      />
                      <label
                        htmlFor={`item-${item.ingredient_name}`}
                        className={`flex-1 cursor-pointer ${isChecked ? 'line-through text-gray-400' : 'text-gray-900'}`}
                      >
                        <span className="font-medium text-sm">{item.ingredient_name}</span>
                        {item.recipes.length > 1 && (
                          <span className="text-xs text-gray-400 ml-2">({item.recipes.length} recipes)</span>
                        )}
                      </label>
                      <span className={`text-sm font-semibold shrink-0 ${isChecked ? 'text-gray-400' : 'text-amber-700'}`}>
                        {displayQty}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Uncategorized */}
          {byCategory['Other']?.length > 0 && !CATEGORY_ORDER.includes('Other') && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h3 className="font-semibold text-gray-700 text-sm">Other</h3>
              </div>
              {byCategory['Other'].map((item) => (
                <div key={item.ingredient_name} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0">
                  <input
                    type="checkbox"
                    checked={checkedItems.has(item.ingredient_name)}
                    onChange={() => toggleCheck(item.ingredient_name)}
                    className="w-4 h-4 accent-green-500"
                  />
                  <span className="flex-1 text-sm text-gray-900">{item.ingredient_name}</span>
                  <span className="text-sm font-semibold text-amber-700">
                    {item.total_grams >= 1000 ? `${(item.total_grams / 1000).toFixed(2)} kg` : `${Math.ceil(item.total_grams)} g`}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
            💡 <strong>Tip:</strong> Check off items as you shop. Scaling factor ×1 means original recipe quantity.
          </div>
        </div>
      )}

      {selectedRecipeIds.size > 0 && aggregated.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <LoadingSpinner />
          <p className="mt-2 text-sm">Loading ingredient data…</p>
        </div>
      )}
    </div>
  )
}
