import React, { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useRecipes } from '../../hooks/useRecipes'
import { RecipeCard } from '../../components/recipe/RecipeCard'
import { SearchInput } from '../../components/common/SearchInput'
import { Select, SelectOption } from '../../components/common/Select'
import { Button } from '../../components/common/Button'
import { EmptyState } from '../../components/common/EmptyState'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import type { RecipeListParams } from '../../services/recipe.service'

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

const GridIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
)

const ListIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M4 6h16M4 10h16M4 14h16M4 18h16" />
  </svg>
)

// ─── Skeleton card ────────────────────────────────────────────────────────────

const SkeletonCard = () => (
  <div className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
    <div className="aspect-video bg-gray-200" />
    <div className="p-4 space-y-2">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-3 bg-gray-100 rounded w-full" />
      <div className="h-3 bg-gray-100 rounded w-2/3" />
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
              <span className="px-2 text-gray-400 select-none">…</span>
            )}
            <button
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
              className={`min-w-[36px] h-9 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                p === page
                  ? 'bg-amber-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
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
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<RecipeListParams['status']>('')
  const [sourceType, setSourceType] = useState<RecipeListParams['source_type']>('')
  const [sortBy, setSortBy] = useState<RecipeListParams['sort_by']>('updated_at')
  const [sortOrder, setSortOrder] = useState<RecipeListParams['sort_order']>('desc')
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  const params: RecipeListParams = {
    search: search || undefined,
    status: status || undefined,
    source_type: sourceType || undefined,
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

  const hasActiveFilters = !!(search || status || sourceType)

  const clearFilters = () => {
    setSearch('')
    setStatus('')
    setSourceType('')
    setPage(1)
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Recipes</h1>
          {!isLoading && (
            <p className="text-sm text-gray-500 mt-0.5">
              {total} {total === 1 ? 'recipe' : 'recipes'}
            </p>
          )}
        </div>
        <Link to="/recipes/new">
          <Button>+ New Recipe</Button>
        </Link>
      </div>

      {/* Search + Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 space-y-3">
        <SearchInput
          value={search}
          onSearch={handleSearch}
          onChange={setSearch}
          placeholder="Search recipes by title..."
          debounceMs={300}
          loading={isFetching && !!search}
        />

        <div className="flex flex-wrap gap-3 items-end">
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

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}

          {/* View toggle */}
          <div className="ml-auto flex items-center gap-1 border border-gray-200 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'grid' ? 'bg-amber-100 text-amber-700' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <GridIcon />
            </button>
            <button
              onClick={() => setViewMode('list')}
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'list' ? 'bg-amber-100 text-amber-700' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <ListIcon />
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
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                : 'flex flex-col gap-3'
            }
            aria-label="Recipe list"
          >
            {recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                className={viewMode === 'list' ? 'flex-row' : ''}
              />
            ))}
          </div>

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {/* Subtle fetching indicator (not full spinner) */}
      {isFetching && !isLoading && (
        <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-full px-4 py-2 text-sm text-gray-600 flex items-center gap-2 border border-gray-100">
          <LoadingSpinner size="sm" />
          Updating…
        </div>
      )}
    </div>
  )
}
