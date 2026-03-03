import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { RecipeList } from '../RecipeList'

// Mock useRecipes hook
const mockUseRecipes = vi.fn()
vi.mock('../../../hooks/useRecipes', () => ({
  useRecipes: (params: unknown) => mockUseRecipes(params),
}))

// Mock useLocalization
vi.mock('../../../hooks/useLocalization', () => ({
  useLocalization: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    formatDate: (_date: string, _fmt: string) => '1 Jan 2024',
  }),
}))

const makeRecipe = (overrides = {}) => ({
  id: '1',
  title: 'Chocolate Cake',
  description: 'A rich chocolate cake',
  servings: 8,
  yield_weight_grams: 500,
  status: 'active' as const,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

const renderRecipeList = () =>
  render(
    <MemoryRouter>
      <RecipeList />
    </MemoryRouter>
  )

describe('RecipeList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Req 29.1: recipe list with loading state
  it('renders loading skeleton when data is loading', () => {
    mockUseRecipes.mockReturnValue({ data: undefined, isLoading: true, isFetching: false, error: null })
    renderRecipeList()

    expect(screen.getByLabelText('Loading recipes')).toBeInTheDocument()
  })

  it('renders list of recipes when data loads', () => {
    mockUseRecipes.mockReturnValue({
      data: {
        recipes: [
          makeRecipe({ id: '1', title: 'Chocolate Cake' }),
          makeRecipe({ id: '2', title: 'Banana Bread' }),
        ],
        total: 2,
        total_pages: 1,
        page: 1,
        limit: 12,
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })
    renderRecipeList()

    expect(screen.getByText('Chocolate Cake')).toBeInTheDocument()
    expect(screen.getByText('Banana Bread')).toBeInTheDocument()
  })

  // Req 29.2: empty state when no recipes
  it('renders empty state when no recipes exist', () => {
    mockUseRecipes.mockReturnValue({
      data: { recipes: [], total: 0, total_pages: 1, page: 1, limit: 12 },
      isLoading: false,
      isFetching: false,
      error: null,
    })
    renderRecipeList()

    expect(screen.getByText('No recipes yet')).toBeInTheDocument()
  })

  // Req 29.1: search filtering
  it('filters recipes by search term', async () => {
    const user = userEvent.setup()
    mockUseRecipes.mockReturnValue({
      data: { recipes: [makeRecipe()], total: 1, total_pages: 1, page: 1, limit: 12 },
      isLoading: false,
      isFetching: false,
      error: null,
    })
    renderRecipeList()

    const searchInput = screen.getByPlaceholderText('Search recipes by title...')
    await user.type(searchInput, 'Chocolate')

    // useRecipes should be called with the search param
    await waitFor(() => {
      const calls = mockUseRecipes.mock.calls
      const lastCall = calls[calls.length - 1][0]
      expect(lastCall.search).toBe('Chocolate')
    })
  })

  // Req 29.1: navigate to recipe detail on card click
  it('renders recipe cards as links to recipe detail', () => {
    mockUseRecipes.mockReturnValue({
      data: {
        recipes: [makeRecipe({ id: 'abc123', title: 'Sourdough Loaf' })],
        total: 1,
        total_pages: 1,
        page: 1,
        limit: 12,
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })
    renderRecipeList()

    const link = screen.getByRole('link', { name: 'Sourdough Loaf' })
    expect(link).toHaveAttribute('href', '/recipes/abc123')
  })

  // Req 29.3: error state on API failure
  it('shows error state on API failure', () => {
    mockUseRecipes.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: new Error('Network error'),
    })
    renderRecipeList()

    expect(screen.getByText('Failed to load recipes')).toBeInTheDocument()
    expect(screen.getByText('Network error')).toBeInTheDocument()
  })

  it('shows "New Recipe" link', () => {
    mockUseRecipes.mockReturnValue({
      data: { recipes: [], total: 0, total_pages: 1, page: 1, limit: 12 },
      isLoading: false,
      isFetching: false,
      error: null,
    })
    renderRecipeList()

    expect(screen.getByRole('link', { name: /new recipe/i })).toHaveAttribute('href', '/recipes/new')
  })
})
