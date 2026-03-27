import React from 'react'
import { Link } from 'react-router-dom'
import { Users, ChefHat, ChevronRight } from 'lucide-react'
import { cn } from '../../utils/cn'
import { Badge, BadgeVariant } from '../common/Badge'
import { Button } from '../common/Button'
import { MEDIA_BASE_URL } from '../../services/api'
import { UserTag } from '../../services/recipe.service'

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
  listMode?: boolean
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

type StatusVariant = 'draft' | 'active' | 'archived'

const statusBadgeVariant: Record<StatusVariant, BadgeVariant> = {
  active:   'active',
  draft:    'draft',
  archived: 'default',
}

export function RecipeCard({ recipe, userTags = [], className, listMode = false }: RecipeCardProps) {
  if (listMode) {
    return (
      <article className={cn('card flex items-center gap-4 p-4 hover:shadow-md transition-shadow group', className)}>
        <div className="h-14 w-14 rounded-lg bg-neutral-100 flex-shrink-0 overflow-hidden">
          {recipe.thumbnail_url
            ? <img
                src={recipe.thumbnail_url.startsWith('http') ? recipe.thumbnail_url : `${MEDIA_BASE_URL}${recipe.thumbnail_url}`}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            : <div className="w-full h-full flex items-center justify-center">
                <ChefHat size={18} className="text-neutral-300" aria-hidden="true" />
              </div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-neutral-900 truncate group-hover:text-primary-600 transition-colors">
            {recipe.title}
          </h3>
          <div className="flex items-center gap-3 text-xs text-neutral-500 mt-0.5">
            {recipe.servings > 0 && (
              <span className="flex items-center gap-1">
                <Users size={11} aria-hidden="true" />{recipe.servings} srv
              </span>
            )}
            {recipe.status !== 'active' && (
              <Badge variant={statusBadgeVariant[recipe.status]} dot>{recipe.status}</Badge>
            )}
            <span className="ml-auto text-2xs text-neutral-400">{formatRelativeDate(recipe.updated_at)}</span>
          </div>
        </div>
        <Link to={`/recipes/${recipe.id}`}>
          <Button variant="ghost" size="sm" rightIcon={<ChevronRight size={14} />}>View</Button>
        </Link>
      </article>
    )
  }

  return (
    <article className={cn('card-interactive group overflow-hidden flex flex-col', className)}>
      {/* Thumbnail */}
      <div className="aspect-[4/3] bg-gradient-to-br from-neutral-100 to-neutral-50 relative overflow-hidden flex-shrink-0">
        {recipe.thumbnail_url
          ? <img
              src={recipe.thumbnail_url.startsWith('http') ? recipe.thumbnail_url : `${MEDIA_BASE_URL}${recipe.thumbnail_url}`}
              alt={recipe.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-slow"
              loading="lazy"
            />
          : <div className="w-full h-full flex items-center justify-center">
              <ChefHat size={36} className="text-neutral-300" aria-hidden="true" />
            </div>
        }
        {recipe.status !== 'active' && (
          <div className="absolute top-2 left-2">
            <Badge variant={statusBadgeVariant[recipe.status]} dot>{recipe.status}</Badge>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-neutral-900 text-sm leading-snug line-clamp-2 mb-2 group-hover:text-primary-600 transition-colors">
          {recipe.title}
        </h3>

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-neutral-500">
          {recipe.servings > 0 && (
            <span className="flex items-center gap-1">
              <Users size={11} aria-hidden="true" />{recipe.servings} srv
            </span>
          )}
          {/* Tags */}
          {recipe.tags && recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 ml-auto">
              {recipe.tags.slice(0, 2).map(tag => (
                <Badge key={tag} variant="default" className="text-2xs">{tag}</Badge>
              ))}
              {recipe.tags.length > 2 && (
                <Badge variant="default" className="text-2xs">+{recipe.tags.length - 2}</Badge>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-neutral-100">
          <span className="text-2xs text-neutral-400">{formatRelativeDate(recipe.updated_at)}</span>
          <Link
            to={`/recipes/${recipe.id}`}
            className="text-xs text-primary-500 hover:text-primary-600 font-medium flex items-center gap-0.5 transition-colors"
            onClick={e => e.stopPropagation()}
          >
            Open <ChevronRight size={12} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  )
}
