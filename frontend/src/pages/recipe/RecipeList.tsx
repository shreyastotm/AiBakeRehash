import React, { useState, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { LayoutGrid, List, Plus, X } from 'lucide-react'

import { useRecipes } from '../../hooks/useRecipes'
import { recipeService, userTagService, type RecipeListParams, type UserTag } from '../../services/recipe.service'
import { useAuthStore } from '../../store/authStore'
import { cn } from '../../utils/cn'
import { Button } from '../../components/common/Button'
import { SearchInput } from '../../components/common/SearchInput'
import { Select, SelectOption } from '../../components/common/Select'

import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { EmptyState } from '../../components/common/EmptyState'
import { TagInput } from '../../components/common/TagInput'
import { SmartImportModal } from '../../components/recipe/SmartImportModal'
import { RecipeCard } from '../../components/recipe/RecipeCard'

// ─── Filter / sort options ────────────────────────────────────────────────────

const STATUS_OPTIONS: SelectOption[] = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Archived' },
]

const SOURCE_OPTIONS: SelectOption[] = [
  { value: '', label: 'All Sources' },
  { value: 'manual', label: 'Manual' },
  { value: 'image', label: 'Image' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'url', label: 'URL' },
]

const SORT_OPTIONS: SelectOption[] = [
  { value: 'updated_at', label: 'Last Updated' },
  { value: 'created_at', label: 'Date Created' },
  { value: 'title', label: 'Title' },
  { value: 'rating', label: 'Rating' },
]

const ORDER_OPTIONS: SelectOption[] = [
  { value: 'desc', label: 'Descending' },
  { value: 'asc', label: 'Ascending' },
]

const PAGE_LIMIT = 12

// ─── View toggle ─────────────────────────────────────────────────────────────

type ViewMode = 'grid' | 'list'

// ─── Skeleton card ────────────────────────────────────────────────────────────

const SkeletonCard = () => (
  <div className="bg-white rounded-xl border border-neutral-100 overflow-hidden animate-pulse">
    <div className="aspect-video bg-neutral-200" />
    <div className="p-4 space-y-2">
      <div className="h-4 bg-neutral-200 rounded w-3/4" />
      <div className="h-3 bg-neutral-100 rounded w-full" />
      <div className="h-3 bg-neutral-100 rounded w-2/3" />
    </div>
  </div>
)

// ─── Pagination ───────────────────────────────────────────────────────────────

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (p: number) => void
}

const Pagination = ({ page, totalPages, onPageChange }: PaginationProps) => {
  if (totalPages <= 1) return null

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
  // Show at most 5 page buttons around current
  const visible = pages.filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2
  )

  return (
    <nav className="flex items-center justify-center gap-1 mt-8" aria-label="Pagination">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
      >
        ‹
      </Button>

      {visible.map((p, idx) => {
        const prev = visible[idx - 1]
        const showEllipsis = prev && p - prev > 1
        return (
          <React.Fragment key={p}>
            {showEllipsis && (
              <span className="px-2 text-neutral-400 select-none">…</span>
            )}
            <button
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
              className={cn(
                'min-w-[36px] h-9 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500',
                p === page
                  ? 'bg-primary-600 text-white'
                  : 'text-neutral-700 hover:bg-neutral-100'
              )}
            >
              {p}
            </button>
          </React.Fragment>
        )
      })}

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        aria-label="Next page"
      >
        ›
      </Button>
    </nav>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export const RecipeList = () => {
  const { user } = useAuthStore()
  const defaultMode = user?.default_recipe_creation_mode ?? 'manual'

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<RecipeListParams['status']>('')
  const [sourceType, setSourceType] = useState<RecipeListParams['source_type']>('')
  const [sortBy, setSortBy] = useState<RecipeListParams['sort_by']>('updated_at')
  const [sortOrder, setSortOrder] = useState<RecipeListParams['sort_order']>('desc')
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  const [tags, setTags] = useState<string[]>([])
  const [userTags, setUserTags] = useState<UserTag[]>([])
  const [suggestedLabels, setSuggestedLabels] = useState<string[]>([])

  useEffect(() => {
    userTagService.getTags()
      .then(t => setUserTags(t))
      .catch(console.error)

    recipeService.getUserTags()
      .then(labels => setSuggestedLabels(labels))
      .catch(console.error)
  }, [])

  const params: RecipeListParams = {
    search: search || undefined,
    status: status || undefined,
    source_type: sourceType || undefined,
    tags: tags.length > 0 ? tags : undefined,
    sort_by: sortBy,
    sort_order: sortOrder,
    page,
    limit: PAGE_LIMIT,
  }

  const { data, isLoading, isFetching, error } = useRecipes(params)

  const recipes = data?.recipes ?? []
  const totalPages = data?.total_pages ?? 1
  const total = data?.total ?? 0

  // Reset to page 1 when filters change
  const handleSearch = useCallback((val: string) => {
    setSearch(val)
    setPage(1)
  }, [])

  const handleStatus = (val: string) => {
    setStatus(val as RecipeListParams['status'])
    setPage(1)
  }

  const handleSource = (val: string) => {
    setSourceType(val as RecipeListParams['source_type'])
    setPage(1)
  }

  const handleSort = (val: string) => {
    setSortBy(val as RecipeListParams['sort_by'])
    setPage(1)
  }

  const handleOrder = (val: string) => {
    setSortOrder(val as RecipeListParams['sort_order'])
    setPage(1)
  }

  const hasActiveFilters = !!(search || status || sourceType || tags.length > 0)

  const clearFilters = () => {
    setSearch('')
    setStatus('')
    setSourceType('')
    setTags([])
    setPage(1)
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="page-header mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Recipes</h1>
          {!isLoading && (
            <p className="text-sm text-neutral-500 mt-0.5">
              {total} {total === 1 ? 'recipe' : 'recipes'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {defaultMode === 'smart' ? (
            <>
              <Link to="/recipes/new">
                <Button variant="outline" size="sm" leftIcon={<Plus size={14} />}>Manual Recipe</Button>
              </Link>
              <Button onClick={() => setIsImportModalOpen(true)} variant="primary" size="sm">
                Smart Import
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setIsImportModalOpen(true)} variant="outline" size="sm">
                Smart Import
              </Button>
              <Link to="/recipes/new">
                <Button variant="primary" size="sm" leftIcon={<Plus size={14} />}>New Recipe</Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Search + Filters */}
      <div className="card p-4 mb-6">
        <SearchInput
          value={search}
          onSearch={handleSearch}
          onChange={setSearch}
          placeholder="Search recipes by title..."
          debounceMs={300}
          loading={isFetching && !!search}
        />

        <div className="flex flex-wrap gap-3 items-end mt-3">
          <div className="w-40">
            <Select
              options={STATUS_OPTIONS}
              value={status}
              onChange={handleStatus}
              placeholder="Status"
            />
          </div>
          <div className="w-40">
            <Select
              options={SOURCE_OPTIONS}
              value={sourceType}
              onChange={handleSource}
              placeholder="Source"
            />
          </div>
          <div className="w-44">
            <Select
              options={SORT_OPTIONS}
              value={sortBy}
              onChange={handleSort}
              placeholder="Sort by"
            />
          </div>
          <div className="w-36">
            <Select
              options={ORDER_OPTIONS}
              value={sortOrder}
              onChange={handleOrder}
            />
          </div>
          <div className="w-64">
            <TagInput
              value={tags}
              onChange={(t) => { setTags(t); setPage(1); }}
              suggestions={suggestedLabels}
              userTags={userTags}
              placeholder="Filter by tags"
            />
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} leftIcon={<X size={14} />}>
              Clear filters
            </Button>
          )}

          {/* View toggle */}
          <div className="ml-auto flex items-center gap-1 border border-neutral-200 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
              className={cn('p-1.5 rounded transition-colors', viewMode === 'grid' ? 'bg-white shadow-xs text-primary-500' : 'text-neutral-400 hover:text-neutral-600')}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
              className={cn('p-1.5 rounded transition-colors', viewMode === 'list' ? 'bg-white shadow-xs text-primary-500' : 'text-neutral-400 hover:text-neutral-600')}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center">
          <p className="text-red-600 font-medium">Failed to load recipes</p>
          <p className="text-red-400 text-sm mt-1">
            {(error as Error)?.message ?? 'Please try again later.'}
          </p>
        </div>
      ) : isLoading ? (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
              : 'flex flex-col gap-3'
          }
          aria-busy="true"
          aria-label="Loading recipes"
        >
          {Array.from({ length: PAGE_LIMIT }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : recipes.length === 0 ? (
        <EmptyState
          icon={<span className="text-5xl">🍞</span>}
          title={hasActiveFilters ? 'No recipes match your filters' : 'No recipes yet'}
          description={
            hasActiveFilters
              ? 'Try adjusting your search or filters.'
              : 'Create your first recipe to get started!'
          }
          action={
            hasActiveFilters
              ? { label: 'Clear filters', onClick: clearFilters }
              : undefined
          }
        />
      ) : (
        <>
          <section aria-label="Recipe list">
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                  : 'flex flex-col gap-3'
              }
            >
              {recipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  userTags={userTags}
                  listMode={viewMode === 'list'}
                />
              ))}
            </div>
          </section>

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {/* Subtle fetching indicator (not full spinner) */}
      {isFetching && !isLoading && (
        <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-full px-4 py-2 text-sm text-neutral-600 flex items-center gap-2 border border-neutral-100">
          <LoadingSpinner size="sm" />
          Updating…
        </div>
      )}

      <SmartImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  )
}
