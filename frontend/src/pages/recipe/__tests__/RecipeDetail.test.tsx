import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { RecipeDetail } from '../RecipeDetail'

// Mock all recipe hooks
const mockUseRecipe = vi.fn()
const mockUseRecipeVersions = vi.fn()
const mockUseRecipeNutrition = vi.fn()
const mockUseDeleteRecipe = vi.fn()
const mockUseScaleRecipe = vi.fn()

vi.mock('../../../hooks/useRecipes', () => ({
  useRecipe: (id: string) => mockUseRecipe(id),
  useRecipeVersions: (id: string) => mockUseRecipeVersions(id),
  useRecipeNutrition: (id: string) => mockUseRecipeNutrition(id),
  useDeleteRecipe: () => mockUseDeleteRecipe(),
  useScaleRecipe: () => mockUseScaleRecipe(),
}))

// Mock useLocalization
vi.mock('../../../hooks/useLocalization', () => ({
  useLocalization: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    formatDate: (_date: string, _fmt: string) => '1 Jan 2024',
    formatNumber: (n: number) => String(n),
  }),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const makeRecipe = (overrides = {}) => ({
  id: 'recipe-1',
  title: 'Sourdough Bread',
  description: 'A classic sourdough loaf',
  servings: 8,
  yield_weight_grams: 800,
  status: 'active' as const,
  source_type: 'manual' as const,
  preferred_unit_system: 'metric',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ingredients: [
    {
      id: 'ing-1',
      recipe_id: 'recipe-1',
      ingredient_master_id: 'master-1',
      display_name: 'Bread Flour',
      quantity_original: 500,
      unit_original: 'g',
      quantity_grams: 500,
      position: 1,
    },
  ],
  sections: [
    {
      id: 'sec-1',
      recipe_id: 'recipe-1',
      type: 'prep' as const,
      title: 'Preparation',
      position: 1,
      steps: [
        {
          id: 'step-1',
          recipe_id: 'recipe-1',
          section_id: 'sec-1',
          instruction: 'Mix flour and water',
          position: 1,
        },
      ],
    },
  ],
  ...overrides,
})

const renderRecipeDetail = (id = 'recipe-1') =>
  render(
    <MemoryRouter initialEntries={[`/recipes/${id}`]}>
      <Routes>
        <Route path="/recipes/:id" element={<RecipeDetail />} />
      </Routes>
    </MemoryRouter>
  )

describe('RecipeDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseRecipeVersions.mockReturnValue({ data: [] })
    mockUseRecipeNutrition.mockReturnValue({ data: null })
    mockUseDeleteRecipe.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mockUseScaleRecipe.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  })

  // Req 29.2: recipe detail display
  it('renders recipe title and description', () => {
    mockUseRecipe.mockReturnValue({ data: makeRecipe(), isLoading: false, error: null })
    renderRecipeDetail()

    expect(screen.getByText('Sourdough Bread')).toBeInTheDocument()
    expect(screen.getByText('A classic sourdough loaf')).toBeInTheDocument()
  })

  it('renders servings and yield stats', () => {
    mockUseRecipe.mockReturnValue({ data: makeRecipe(), isLoading: false, error: null })
    renderRecipeDetail()

    expect(screen.getByText('8')).toBeInTheDocument()   // servings
    expect(screen.getByText('800g')).toBeInTheDocument() // yield
  })

  // Req 29.2: ingredient list
  it('renders ingredient list', () => {
    mockUseRecipe.mockReturnValue({ data: makeRecipe(), isLoading: false, error: null })
    renderRecipeDetail()

    expect(screen.getByText('Bread Flour')).toBeInTheDocument()
  })

  // Req 29.2: recipe sections and steps
  it('renders recipe sections and steps', () => {
    mockUseRecipe.mockReturnValue({ data: makeRecipe(), isLoading: false, error: null })
    renderRecipeDetail()

    expect(screen.getByText('Preparation')).toBeInTheDocument()
    expect(screen.getByText('Mix flour and water')).toBeInTheDocument()
  })

  // Req 29.3: loading state
  it('shows loading spinner while data is loading', () => {
    mockUseRecipe.mockReturnValue({ data: undefined, isLoading: true, error: null })
    renderRecipeDetail()

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  // Req 29.3: error state
  it('shows error state on API failure', () => {
    mockUseRecipe.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Recipe not found'),
    })
    renderRecipeDetail()

    expect(screen.getByText('Failed to load recipe')).toBeInTheDocument()
    expect(screen.getByText('Recipe not found')).toBeInTheDocument()
  })

  // Req 31.1: scaling control
  it('renders Scale button and shows scaling control when clicked', async () => {
    const user = userEvent.setup()
    mockUseRecipe.mockReturnValue({ data: makeRecipe(), isLoading: false, error: null })
    renderRecipeDetail()

    const scaleBtn = screen.getByRole('button', { name: /scale/i })
    expect(scaleBtn).toBeInTheDocument()

    await user.click(scaleBtn)

    // ScalingControl should appear with original yield info
    expect(screen.getByText(/800/)).toBeInTheDocument()
  })

  it('renders edit and delete buttons', () => {
    mockUseRecipe.mockReturnValue({ data: makeRecipe(), isLoading: false, error: null })
    renderRecipeDetail()

    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })

  it('renders Log Bake button and navigates to new journal entry page', async () => {
    const user = userEvent.setup()
    mockUseRecipe.mockReturnValue({ data: makeRecipe(), isLoading: false, error: null })
    // Mock useJournalEntries as well since it's used in BakeHistory
    vi.mock('../../../hooks/useJournalEntries', () => ({
      useJournalEntries: () => ({ data: [], isLoading: false }),
    }))

    renderRecipeDetail()

    const logBakeBtn = screen.getByRole('button', { name: /log bake/i })
    expect(logBakeBtn).toBeInTheDocument()

    await user.click(logBakeBtn)
    expect(mockNavigate).toHaveBeenCalledWith('/recipes/recipe-1/journal/new')
  })
})
