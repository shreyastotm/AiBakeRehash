import React from 'react'
import { Link } from 'react-router-dom'
import { useLocalization } from '../../hooks/useLocalization'

export interface RecipeCardData {
  id: string
  title: string
  description?: string
  servings: number
  yield_weight_grams: number
  status: 'draft' | 'active' | 'archived'
  thumbnail_url?: string
  created_at: string
  updated_at: string
}

interface RecipeCardProps {
  recipe: RecipeCardData
  className?: string
}

const statusColors: Record<'draft' | 'active' | 'archived', string> = {
  active: 'bg-green-100 text-green-700',
  draft: 'bg-yellow-100 text-yellow-700',
  archived: 'bg-gray-100 text-gray-500',
}

export function RecipeCard({ recipe, className = '' }: RecipeCardProps) {
  const { t, formatDate } = useLocalization()

  return (
    <Link
      to={`/recipes/${recipe.id}`}
      className={`group block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${className}`}
      aria-label={recipe.title}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-amber-50 overflow-hidden">
        {recipe.thumbnail_url ? (
          <img
            src={recipe.thumbnail_url}
            alt={recipe.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl" aria-hidden="true">
            🍞
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h2 className="font-semibold text-gray-900 text-base leading-snug line-clamp-2 flex-1">
            {recipe.title}
          </h2>
          <span
            className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusColors[recipe.status]}`}
          >
            {t(`recipes.${recipe.status}`, recipe.status)}
          </span>
        </div>

        {recipe.description && (
          <p className="text-gray-500 text-sm line-clamp-2 mb-3">{recipe.description}</p>
        )}

        <div className="flex items-center justify-between text-xs text-gray-400 mt-2 pt-2 border-t border-gray-50">
          <span>
            {recipe.servings} {t('recipes.servings', 'servings')}
          </span>
          <span>{recipe.yield_weight_grams}g</span>
          <span>{formatDate(recipe.updated_at, 'PP')}</span>
        </div>
      </div>
    </Link>
  )
}
