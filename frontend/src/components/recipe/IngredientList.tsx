import React from 'react'
import { useLocalization } from '../../hooks/useLocalization'

export interface RecipeIngredient {
  id: string
  display_name: string
  quantity_original: number
  unit_original: string
  quantity_grams: number
  position: number
}

interface IngredientListProps {
  ingredients: RecipeIngredient[]
  scalingFactor?: number
  showGrams?: boolean
  className?: string
}

export const IngredientList: React.FC<IngredientListProps> = ({
  ingredients,
  scalingFactor = 1,
  showGrams = false,
  className = '',
}) => {
  const { t, formatNumber } = useLocalization()

  const sorted = [...ingredients].sort((a, b) => a.position - b.position)
  const isScaled = Math.abs(scalingFactor - 1) > 0.001

  const fmt = (qty: number): string =>
    formatNumber(parseFloat(qty.toFixed(2)))

  return (
    <div className={`space-y-2 ${className}`}>
      {sorted.length === 0 ? (
        <p className="text-gray-500 text-sm">{t('recipes.noIngredients', 'No ingredients added yet')}</p>
      ) : (
        <>
          {isScaled && (
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 pb-1 border-b border-gray-100 text-xs font-medium text-gray-400 uppercase tracking-wide">
              <span>{t('recipes.ingredient', 'Ingredient')}</span>
              <span className="text-right">{t('recipes.original', 'Original')}</span>
              <span className="text-right text-amber-600">{t('recipes.scaled', 'Scaled')}</span>
            </div>
          )}
          <ul className="divide-y divide-gray-100" role="list" aria-label={t('recipes.ingredients')}>
            {sorted.map((ingredient) => {
              const scaledQty = ingredient.quantity_original * scalingFactor
              const scaledGrams = ingredient.quantity_grams * scalingFactor

              return (
                <li
                  key={ingredient.id}
                  className={`py-2.5 gap-3 ${isScaled ? 'grid grid-cols-[1fr_auto_auto]' : 'flex items-center justify-between'}`}
                >
                  <span className="text-gray-800 min-w-0 truncate">
                    {ingredient.display_name}
                  </span>

                  {isScaled ? (
                    <>
                      {/* Original quantity */}
                      <span className="text-gray-400 text-sm text-right shrink-0">
                        {fmt(ingredient.quantity_original)}{' '}
                        <span className="text-gray-300">{ingredient.unit_original}</span>
                      </span>
                      {/* Scaled quantity */}
                      <span className="font-medium text-amber-700 text-right shrink-0">
                        {fmt(scaledQty)}{' '}
                        <span className="text-amber-500 text-sm">{ingredient.unit_original}</span>
                        {showGrams && ingredient.unit_original !== 'g' && (
                          <span className="block text-xs text-gray-400">
                            ({fmt(scaledGrams)}{t('units.grams', 'g')})
                          </span>
                        )}
                      </span>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 shrink-0 text-right">
                      <span className="font-medium text-gray-900">
                        {fmt(ingredient.quantity_original)}{' '}
                        <span className="text-gray-500 text-sm">{ingredient.unit_original}</span>
                      </span>
                      {showGrams && ingredient.unit_original !== 'g' && (
                        <span className="text-xs text-gray-400">
                          ({fmt(ingredient.quantity_grams)}{t('units.grams', 'g')})
                        </span>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
