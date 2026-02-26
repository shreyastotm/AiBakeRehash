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

  const formatQuantity = (qty: number): string => {
    const scaled = qty * scalingFactor
    // Show up to 2 decimal places, trim trailing zeros
    return formatNumber(parseFloat(scaled.toFixed(2)))
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {sorted.length === 0 ? (
        <p className="text-gray-500 text-sm">{t('recipes.noIngredients', 'No ingredients added yet')}</p>
      ) : (
        <ul className="divide-y divide-gray-100" role="list" aria-label={t('recipes.ingredients')}>
          {sorted.map((ingredient) => (
            <li
              key={ingredient.id}
              className="flex items-center justify-between py-2.5 gap-3"
            >
              <span className="text-gray-800 flex-1 min-w-0 truncate">
                {ingredient.display_name}
              </span>
              <div className="flex items-center gap-2 shrink-0 text-right">
                <span className="font-medium text-gray-900">
                  {formatQuantity(ingredient.quantity_original)}{' '}
                  <span className="text-gray-500 text-sm">{ingredient.unit_original}</span>
                </span>
                {showGrams && ingredient.unit_original !== 'g' && (
                  <span className="text-xs text-gray-400">
                    ({formatQuantity(ingredient.quantity_grams)}{t('units.grams', 'g')})
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
