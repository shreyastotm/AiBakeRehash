import { Link } from 'react-router-dom'

import { useLocalization } from '../../hooks/useLocalization'
import { Badge } from '../common/Badge'
import { MEDIA_BASE_URL } from '../../services/api'
import { UserTag } from '../../services/recipe.service'

const TAG_COLORS: Record<string, { bg: string, text: string }> = {
  gray: { bg: 'bg-gray-100', text: 'text-gray-700' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-700' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-700' },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  rose: { bg: 'bg-rose-100', text: 'text-rose-700' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-700' },
  teal: { bg: 'bg-teal-100', text: 'text-teal-700' },
  violet: { bg: 'bg-violet-100', text: 'text-violet-700' },
}

export interface RecipeCardData {
  id: string
  title: string
  description?: string
  servings: number
  yield_weight_grams: number
  status: 'draft' | 'active' | 'archived'
  thumbnail_url?: string
  tags?: string[]
  created_at: string
  updated_at: string
}

interface RecipeCardProps {
  recipe: RecipeCardData
  userTags?: UserTag[]
  className?: string
}

const statusColors: Record<'draft' | 'active' | 'archived', string> = {
  active: 'bg-green-100 text-green-700',
  draft: 'bg-yellow-100 text-yellow-700',
  archived: 'bg-gray-100 text-gray-500',
}

export function RecipeCard({ recipe, userTags = [], className = '' }: RecipeCardProps) {
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
            src={recipe.thumbnail_url.startsWith('http') ? recipe.thumbnail_url : `${MEDIA_BASE_URL}${recipe.thumbnail_url}`}
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

        {/* Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {recipe.tags.slice(0, 3).map(tag => {
              const userTag = userTags.find(ut => ut.label.toLowerCase() === tag.toLowerCase())
              const colorConfig = TAG_COLORS[userTag?.color || 'gray'] || TAG_COLORS.gray
              return (
                <Badge
                  key={tag}
                  variant="default"
                  className={`text-[10px] px-1.5 py-0 border-none shadow-sm ${colorConfig.bg} ${colorConfig.text}`}
                >
                  {tag}
                </Badge>
              )
            })}
            {recipe.tags.length > 3 && (
              <span className="text-[10px] text-gray-400 font-medium ml-0.5">+{recipe.tags.length - 3}</span>
            )}
          </div>
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
