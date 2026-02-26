import React, { useRef } from 'react'

export interface RecipeExportData {
  title: string
  description?: string
  servings: number
  yield_weight_grams: number
  thumbnail_url?: string
  key_ingredients: string[]
  baker_name?: string
  instagram_handle?: string
}

interface RecipeCardExportProps {
  recipe: RecipeExportData
  onDownload?: () => void
  className?: string
}

/**
 * A visually styled card designed for Instagram export (1:1 ratio).
 * Renders recipe title, key ingredients, and branding in an amber theme.
 */
export const RecipeCardExport: React.FC<RecipeCardExportProps> = ({
  recipe,
  onDownload,
  className = '',
}) => {
  const cardRef = useRef<HTMLDivElement>(null)

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Export card — 1:1 aspect ratio for Instagram */}
      <div
        ref={cardRef}
        aria-label={`Instagram export card for ${recipe.title}`}
        className="w-80 h-80 bg-gradient-to-br from-amber-50 to-orange-100 rounded-2xl p-6 flex flex-col justify-between border-2 border-amber-200 shadow-lg"
      >
        {/* Header */}
        <div>
          <div className="w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center mb-3" aria-hidden="true">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 leading-tight line-clamp-2">{recipe.title}</h2>
          {recipe.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{recipe.description}</p>
          )}
        </div>

        {/* Key ingredients */}
        {recipe.key_ingredients.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1.5">
              Key Ingredients
            </p>
            <div className="flex flex-wrap gap-1.5">
              {recipe.key_ingredients.slice(0, 5).map((ing) => (
                <span
                  key={ing}
                  className="text-xs bg-white/70 text-gray-700 px-2 py-0.5 rounded-full border border-amber-200"
                >
                  {ing}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{recipe.servings} servings · {recipe.yield_weight_grams}g</span>
          {recipe.instagram_handle && (
            <span className="font-medium text-amber-700">@{recipe.instagram_handle}</span>
          )}
        </div>
      </div>

      {onDownload && (
        <button
          onClick={onDownload}
          className="w-80 py-2.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
          aria-label={`Download Instagram card for ${recipe.title}`}
        >
          Download for Instagram
        </button>
      )}
    </div>
  )
}
