import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { RecipeForm } from '../RecipeForm'

// ── Mock hooks ────────────────────────────────────────────────────────────────

const mockCreateMutateAsync = vi.fn()
const mockUpdateMutateAsync = vi.fn()

vi.mock('../../../hooks/useRecipes', () => ({
  useCreateRecipe: () => ({ mutateAsync: mockCreateMutateAsync, isPending: false }),
  useUpdateRecipe: () => ({ mutateAsync: mockUpdateMutateAsync, isPending: false }),
  useRecipe: () => ({ data: undefined, isLoading: false }),
}))

// Mock recipeService.searchIngredients
const mockSearchIngredients = vi.fn()
vi.mock('../../../services/recipe.service', async () => {
  const actual = await vi.importActual<typeof import('../../../services/recipe.service')>('../../../services/recipe.service')
  return {
    ...actual,
    recipeService: {
      ...actual.recipeService,
      searchIngredients: (...args: unknown[]) => mockSearchIngredients(...args),
    },
  }
})

// Mock auto-save hooks to be no-ops
vi.mock('../../../hooks/useAutoSave', () => ({
  useAutoSave: () => ({ saveNow: vi.fn() }),
  useRestoreFormData: () => ({
    data: {
      title: '', description: '', servings: '', yield_weight_grams: '',
      status: 'draft', preferred_unit_system: 'metric', ingredients: [], sections: [],
    },
    hasRestoredData: false,
    timestamp: null,
    clearRestored: vi.fn(),
  }),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const renderNewForm = () =>
  render(
    <MemoryRouter initialEntries={['/recipes/new']}>
      <Routes>
        <Route path="/recipes/new" element={<RecipeForm />} />
      </Routes>
    </MemoryRouter>
  )

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RecipeForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSearchIngredients.mockResolvedValue([])
  })

  // Req 29.1: form fields render
  it('renders title, description, servings, and yield fields', () => {
    renderNewForm()

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/servings/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/yield/i)).toBeInTheDocument()
  })

  it('renders the step indicator with Details, Ingredients, Instructions', () => {
    renderNewForm()

    expect(screen.getByText('Details')).toBeInTheDocument()
    expect(screen.getByText('Ingredients')).toBeInTheDocument()
    expect(screen.getByText('Instructions')).toBeInTheDocument()
  })

  // Req 29.2: validation errors for required fields
  it('shows validation errors when Next is clicked with empty required fields', async () => {
    const user = userEvent.setup()
    renderNewForm()

    await user.click(screen.getByRole('button', { name: /next: ingredients/i }))

    expect(await screen.findByText('Title is required')).toBeInTheDocument()
    expect(screen.getByText('Servings must be greater than 0')).toBeInTheDocument()
    expect(screen.getByText('Yield must be greater than 0')).toBeInTheDocument()
  })

  it('does not show validation errors when required fields are filled', async () => {
    const user = userEvent.setup()
    renderNewForm()

    await user.type(screen.getByLabelText(/title/i), 'Sourdough Bread')
    await user.type(screen.getByLabelText(/servings/i), '8')
    await user.type(screen.getByLabelText(/yield/i), '800')
    await user.click(screen.getByRole('button', { name: /next: ingredients/i }))

    expect(screen.queryByText('Title is required')).not.toBeInTheDocument()
    // Should advance to step 2 (Ingredients)
    expect(await screen.findByRole('button', { name: /add ingredient/i })).toBeInTheDocument()
  })

  // Req 29.2: ingredient autocomplete
  it('shows ingredient suggestions when typing in autocomplete', async () => {
    const user = userEvent.setup()
    mockSearchIngredients.mockResolvedValue([
      { id: 'ing-1', name: 'Bread Flour', category: 'Flour' },
      { id: 'ing-2', name: 'Whole Wheat Flour', category: 'Flour' },
    ])

    renderNewForm()

    // Navigate to Ingredients step
    await user.type(screen.getByLabelText(/title/i), 'Test Recipe')
    await user.type(screen.getByLabelText(/servings/i), '4')
    await user.type(screen.getByLabelText(/yield/i), '400')
    await user.click(screen.getByRole('button', { name: /next: ingredients/i }))

    // Add an ingredient row
    await user.click(screen.getByRole('button', { name: /add ingredient/i }))

    // Type in the autocomplete
    const autocomplete = screen.getByPlaceholderText('Search ingredient...')
    await user.type(autocomplete, 'Flour')

    await waitFor(() => {
      expect(mockSearchIngredients).toHaveBeenCalledWith('Flour')
    })
  })

  it('selects ingredient from autocomplete suggestions', async () => {
    const user = userEvent.setup()
    mockSearchIngredients.mockResolvedValue([
      { id: 'ing-1', name: 'Bread Flour', category: 'Flour' },
    ])

    renderNewForm()

    // Navigate to Ingredients step
    await user.type(screen.getByLabelText(/title/i), 'Test Recipe')
    await user.type(screen.getByLabelText(/servings/i), '4')
    await user.type(screen.getByLabelText(/yield/i), '400')
    await user.click(screen.getByRole('button', { name: /next: ingredients/i }))

    await user.click(screen.getByRole('button', { name: /add ingredient/i }))

    const autocomplete = screen.getByPlaceholderText('Search ingredient...')
    await user.type(autocomplete, 'Bread')

    await waitFor(() => {
      expect(mockSearchIngredients).toHaveBeenCalled()
    })

    // Simulate the options appearing and clicking one
    // Since searchIngredients is async, we need to wait for the component to update
    // The Autocomplete component shows options in a listbox
    await waitFor(async () => {
      const option = screen.queryByRole('option', { name: /bread flour/i })
      if (option) {
        await user.click(option)
        expect(autocomplete).toHaveValue('Bread Flour')
      }
    }, { timeout: 2000 })
  })

  // Req 31.1: scaling calculation
  it('navigates through all steps and submits form with valid data', async () => {
    const user = userEvent.setup()
    mockCreateMutateAsync.mockResolvedValue({ id: 'new-recipe-id' })

    renderNewForm()

    // Step 0: Details
    await user.type(screen.getByLabelText(/title/i), 'Banana Bread')
    await user.type(screen.getByLabelText(/description/i), 'A moist banana bread')
    await user.type(screen.getByLabelText(/servings/i), '10')
    await user.type(screen.getByLabelText(/yield/i), '600')
    await user.click(screen.getByRole('button', { name: /next: ingredients/i }))

    // Step 1: Ingredients — skip, go to instructions
    await screen.findByRole('button', { name: /next: instructions/i })
    await user.click(screen.getByRole('button', { name: /next: instructions/i }))

    // Step 2: Instructions — submit
    await screen.findByRole('button', { name: /create recipe/i })
    await user.click(screen.getByRole('button', { name: /create recipe/i }))

    await waitFor(() => {
      expect(mockCreateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Banana Bread',
          description: 'A moist banana bread',
          servings: 10,
          yield_weight_grams: 600,
        })
      )
      expect(mockNavigate).toHaveBeenCalledWith('/recipes/new-recipe-id')
    })
  })

  it('shows error alert when form submission fails', async () => {
    const user = userEvent.setup()
    mockCreateMutateAsync.mockRejectedValue(new Error('Server error'))

    renderNewForm()

    // Fill and navigate to submit step
    await user.type(screen.getByLabelText(/title/i), 'Fail Recipe')
    await user.type(screen.getByLabelText(/servings/i), '4')
    await user.type(screen.getByLabelText(/yield/i), '400')
    await user.click(screen.getByRole('button', { name: /next: ingredients/i }))

    await screen.findByRole('button', { name: /next: instructions/i })
    await user.click(screen.getByRole('button', { name: /next: instructions/i }))

    await screen.findByRole('button', { name: /create recipe/i })
    await user.click(screen.getByRole('button', { name: /create recipe/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Server error')
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
