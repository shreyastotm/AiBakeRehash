import React from 'react'
import { useLocalization } from '../../hooks/useLocalization'

export interface NutritionData {
  energy_kcal: number
  protein_g: number
  fat_g: number
  carbs_g: number
  fiber_g?: number
}

export interface RecipeNutrition {
  per_100g: NutritionData
  per_serving: NutritionData
  servings: number
}

interface NutritionDisplayProps {
  nutrition: RecipeNutrition
  className?: string
}

interface NutritionRowProps {
  label: string
  per100g: number
  perServing: number
  unit: string
  bold?: boolean
}

function NutritionRow({ label, per100g, perServing, unit, bold }: NutritionRowProps) {
  return (
    <tr className={`border-b border-gray-100 ${bold ? 'font-semibold' : ''}`}>
      <th scope="row" className="py-2 text-left text-gray-700 font-normal">{label}</th>
      <td className="py-2 text-right text-gray-900">
        {per100g.toFixed(1)}{unit}
      </td>
      <td className="py-2 text-right text-gray-900">
        {perServing.toFixed(1)}{unit}
      </td>
    </tr>
  )
}

export function NutritionDisplay({ nutrition, className = '' }: NutritionDisplayProps) {
  const { t } = useLocalization()

  if (!nutrition || !nutrition.per_100g || !nutrition.per_serving) {
    return null;
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h3 className="font-bold text-gray-900 text-base">
          {t('recipes.nutritionFacts', 'Nutrition Facts')}
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {t('recipes.servings')}: {nutrition.servings}
        </p>
      </div>

      <div className="px-4 py-2">
        <table className="w-full text-sm" aria-label={t('recipes.nutritionFacts', 'Nutrition Facts')}>
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th scope="col" className="py-2 text-left text-gray-600 font-medium text-xs uppercase tracking-wide">
                {t('recipes.nutrient', 'Nutrient')}
              </th>
              <th scope="col" className="py-2 text-right text-gray-600 font-medium text-xs uppercase tracking-wide">
                {t('recipes.per100g', 'Per 100g')}
              </th>
              <th scope="col" className="py-2 text-right text-gray-600 font-medium text-xs uppercase tracking-wide">
                {t('recipes.perServing', 'Per Serving')}
              </th>
            </tr>
          </thead>
          <tbody>
            <NutritionRow
              label={t('recipes.energy', 'Energy')}
              per100g={nutrition.per_100g.energy_kcal}
              perServing={nutrition.per_serving.energy_kcal}
              unit=" kcal"
              bold
            />
            <NutritionRow
              label={t('recipes.protein', 'Protein')}
              per100g={nutrition.per_100g.protein_g}
              perServing={nutrition.per_serving.protein_g}
              unit="g"
            />
            <NutritionRow
              label={t('recipes.fat', 'Fat')}
              per100g={nutrition.per_100g.fat_g}
              perServing={nutrition.per_serving.fat_g}
              unit="g"
            />
            <NutritionRow
              label={t('recipes.carbohydrates', 'Carbohydrates')}
              per100g={nutrition.per_100g.carbs_g}
              perServing={nutrition.per_serving.carbs_g}
              unit="g"
            />
            {nutrition.per_100g.fiber_g !== undefined && (
              <NutritionRow
                label={t('recipes.fiber', 'Fiber')}
                per100g={nutrition.per_100g.fiber_g}
                perServing={nutrition.per_serving.fiber_g ?? 0}
                unit="g"
              />
            )}
          </tbody>
        </table>
      </div>

      <p className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100">
        {t('recipes.nutritionDisclaimer', 'Values are approximate and calculated from ingredient data.')}
      </p>
    </div>
  )
}
