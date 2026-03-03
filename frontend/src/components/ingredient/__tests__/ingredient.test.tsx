import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IngredientSearch } from '../IngredientSearch'
import { CustomIngredientForm } from '../CustomIngredientForm'
import { IngredientDetailModal } from '../IngredientDetailModal'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockSearch = vi.fn()
const mockGetById = vi.fn()
const mockCreate = vi.fn()

vi.mock('../../../services/ingredient.service', () => ({
    ingredientService: {
        search: (...args: unknown[]) => mockSearch(...args),
        getById: (...args: unknown[]) => mockGetById(...args),
        create: (...args: unknown[]) => mockCreate(...args),
    },
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const FLOUR_RESULT = {
    id: 'ing-1',
    name: 'Bread Flour',
    category: 'flour' as const,
    default_density_g_per_ml: 0.6,
    allergen_flags: { gluten: true },
}

const WHEAT_RESULT = {
    id: 'ing-2',
    name: 'Whole Wheat Flour',
    category: 'flour' as const,
    default_density_g_per_ml: 0.58,
    allergen_flags: { gluten: true },
}

const INGREDIENT_DETAIL = {
    id: 'ing-1',
    name: 'Bread Flour',
    category: 'flour',
    default_density_g_per_ml: 0.6,
    allergen_flags: { gluten: true },
    nutrition_per_100g: {
        energy_kcal: 364,
        protein_g: 12,
        fat_g: 1.5,
        carbs_g: 72,
        fiber_g: 2.7,
    },
    aliases: [{ id: 'a1', alias_name: 'Strong Flour', alias_type: 'common', locale: 'en' }],
    substitutions: [
        { substitution_ingredient_id: 'ing-3', name: 'All Purpose Flour', ratio: 1, notes: 'May need more liquid' },
    ],
    is_composite: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
}

// ─────────────────────────────────────────────────────────────────────────────
// IngredientSearch — uses real timers + type delay to fire debounce naturally
// ─────────────────────────────────────────────────────────────────────────────

describe('IngredientSearch', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockSearch.mockResolvedValue([])
        // JSDOM does not implement scrollIntoView — mock it
        window.HTMLElement.prototype.scrollIntoView = vi.fn()
    })

    // Req 30.1: renders search input
    it('renders the search input', () => {
        render(<IngredientSearch onSelect={vi.fn()} />)
        expect(screen.getByRole('combobox', { name: /search ingredients/i })).toBeInTheDocument()
    })

    // Req 30.1: debounced search triggered after 300ms
    it('calls search after 300ms debounce', async () => {
        const user = userEvent.setup({ delay: 10 })
        mockSearch.mockResolvedValue([FLOUR_RESULT])

        render(<IngredientSearch onSelect={vi.fn()} />)
        await user.type(screen.getByRole('combobox', { name: /search ingredients/i }), 'Flour')

        await waitFor(() => expect(mockSearch).toHaveBeenCalledWith('Flour', 10), { timeout: 2000 })
    }, 10000)

    // Req 30.2: shows suggestions list with listbox role
    it('shows ingredient suggestions in a listbox', async () => {
        const user = userEvent.setup({ delay: 10 })
        mockSearch.mockResolvedValue([FLOUR_RESULT, WHEAT_RESULT])

        render(<IngredientSearch onSelect={vi.fn()} />)
        await user.type(screen.getByRole('combobox', { name: /search ingredients/i }), 'Flour')

        await waitFor(
            () => {
                expect(screen.getByRole('listbox')).toBeInTheDocument()
                expect(screen.getAllByRole('option')).toHaveLength(2)
            },
            { timeout: 3000 }
        )
    }, 10000)

    // Req 30.2: shows category badges
    it('shows category badges in suggestions', async () => {
        const user = userEvent.setup({ delay: 10 })
        mockSearch.mockResolvedValue([FLOUR_RESULT])

        render(<IngredientSearch onSelect={vi.fn()} />)
        await user.type(screen.getByRole('combobox', { name: /search ingredients/i }), 'Flour')

        await waitFor(() => expect(screen.getByText('flour')).toBeInTheDocument(), { timeout: 3000 })
    }, 10000)

    // Req 30.2: allergen flags shown as letter badges
    it('shows allergen badges for matching ingredients', async () => {
        const user = userEvent.setup({ delay: 10 })
        mockSearch.mockResolvedValue([FLOUR_RESULT])

        render(<IngredientSearch onSelect={vi.fn()} />)
        await user.type(screen.getByRole('combobox', { name: /search ingredients/i }), 'Flour')

        // G = gluten
        await waitFor(() => expect(screen.getByText('G')).toBeInTheDocument(), { timeout: 3000 })
    }, 10000)

    // Req 30.2: selects ingredient on click
    it('calls onSelect when an ingredient option is clicked', async () => {
        const user = userEvent.setup({ delay: 10 })
        const onSelect = vi.fn()
        mockSearch.mockResolvedValue([FLOUR_RESULT])

        render(<IngredientSearch onSelect={onSelect} />)
        await user.type(screen.getByRole('combobox', { name: /search ingredients/i }), 'Flour')

        await waitFor(() => expect(screen.getAllByRole('option').length).toBeGreaterThan(0), { timeout: 3000 })
        await user.click(screen.getAllByRole('option')[0])

        expect(onSelect).toHaveBeenCalledWith(FLOUR_RESULT)
    }, 10000)

    // Keyboard navigation: arrow down then enter selects first item
    it('navigates suggestions with arrow keys and selects with Enter', async () => {
        const user = userEvent.setup({ delay: 10 })
        const onSelect = vi.fn()
        mockSearch.mockResolvedValue([FLOUR_RESULT, WHEAT_RESULT])

        render(<IngredientSearch onSelect={onSelect} />)
        await user.type(screen.getByRole('combobox', { name: /search ingredients/i }), 'Flour')

        await waitFor(() => expect(screen.getAllByRole('option').length).toBeGreaterThan(0), { timeout: 3000 })
        await user.keyboard('{ArrowDown}')
        await user.keyboard('{Enter}')

        expect(onSelect).toHaveBeenCalledWith(FLOUR_RESULT)
    }, 10000)

    // Closes on Escape key
    it('closes the dropdown on Escape', async () => {
        const user = userEvent.setup({ delay: 10 })
        mockSearch.mockResolvedValue([FLOUR_RESULT])

        render(<IngredientSearch onSelect={vi.fn()} />)
        await user.type(screen.getByRole('combobox', { name: /search ingredients/i }), 'Flour')

        await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument(), { timeout: 3000 })
        await user.keyboard('{Escape}')

        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    }, 10000)
})

// ─────────────────────────────────────────────────────────────────────────────
// CustomIngredientForm tests
// ─────────────────────────────────────────────────────────────────────────────

describe('CustomIngredientForm', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('renders name, category, and density fields', () => {
        render(<CustomIngredientForm onSuccess={vi.fn()} />)
        expect(screen.getByLabelText(/ingredient name/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/density/i)).toBeInTheDocument()
    })

    it('shows validation error when name is empty on submit', async () => {
        const user = userEvent.setup()
        render(<CustomIngredientForm onSuccess={vi.fn()} />)

        await user.click(screen.getByRole('button', { name: /add ingredient/i }))
        expect(await screen.findByText('Name is required')).toBeInTheDocument()
    })

    it('submits with valid data and calls onSuccess', async () => {
        const user = userEvent.setup()
        const onSuccess = vi.fn()
        mockCreate.mockResolvedValue({ id: 'new-id', name: 'Atta' })

        render(<CustomIngredientForm onSuccess={onSuccess} />)
        await user.type(screen.getByLabelText(/ingredient name/i), 'Atta')
        await user.click(screen.getByRole('button', { name: /add ingredient/i }))

        await waitFor(() => {
            expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ name: 'Atta', category: 'other' }))
            expect(onSuccess).toHaveBeenCalledWith('new-id', 'Atta')
        })
    })

    it('shows error alert when create fails', async () => {
        const user = userEvent.setup()
        mockCreate.mockRejectedValue(new Error('Ingredient already exists'))

        render(<CustomIngredientForm onSuccess={vi.fn()} />)
        await user.type(screen.getByLabelText(/ingredient name/i), 'Atta')
        await user.click(screen.getByRole('button', { name: /add ingredient/i }))

        expect(await screen.findByRole('alert')).toHaveTextContent('Ingredient already exists')
    })

    it('validates density must be positive', async () => {
        const user = userEvent.setup()
        render(<CustomIngredientForm onSuccess={vi.fn()} />)

        await user.type(screen.getByLabelText(/ingredient name/i), 'Test')
        await user.type(screen.getByLabelText(/density/i), '-5')
        await user.click(screen.getByRole('button', { name: /add ingredient/i }))

        expect(await screen.findByText(/density must be greater than 0/i)).toBeInTheDocument()
    })

    it('calls onCancel when Cancel is clicked', async () => {
        const user = userEvent.setup()
        const onCancel = vi.fn()
        render(<CustomIngredientForm onSuccess={vi.fn()} onCancel={onCancel} />)

        await user.click(screen.getByRole('button', { name: /cancel/i }))
        expect(onCancel).toHaveBeenCalled()
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// IngredientDetailModal tests
// ─────────────────────────────────────────────────────────────────────────────

describe('IngredientDetailModal', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('does not render a dialog when ingredientId is null', () => {
        render(<IngredientDetailModal ingredientId={null} onClose={vi.fn()} />)
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('opens the dialog when ingredientId is provided', async () => {
        mockGetById.mockReturnValue(new Promise(() => { })) // never resolves
        render(<IngredientDetailModal ingredientId="ing-1" onClose={vi.fn()} />)
        expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('displays ingredient details after successful fetch', async () => {
        mockGetById.mockResolvedValue(INGREDIENT_DETAIL)

        render(<IngredientDetailModal ingredientId="ing-1" onClose={vi.fn()} />)

        await waitFor(() => expect(screen.getByText('Bread Flour')).toBeInTheDocument())
        // Nutrition
        expect(screen.getByText('364 kcal')).toBeInTheDocument()
        // Aliases
        expect(screen.getByText('Strong Flour')).toBeInTheDocument()
        // Substitutions
        expect(screen.getByText('All Purpose Flour')).toBeInTheDocument()
    })

    it('shows allergen badges for the ingredient', async () => {
        mockGetById.mockResolvedValue(INGREDIENT_DETAIL)

        render(<IngredientDetailModal ingredientId="ing-1" onClose={vi.fn()} />)

        expect(await screen.findByText('🌾 Gluten')).toBeInTheDocument()
    })

    it('shows error message when fetch fails', async () => {
        mockGetById.mockRejectedValue(new Error('Not found'))

        render(<IngredientDetailModal ingredientId="bad-id" onClose={vi.fn()} />)

        expect(await screen.findByRole('alert')).toHaveTextContent('Not found')
    })

    it('calls onClose when close button is clicked', async () => {
        const user = userEvent.setup()
        const onClose = vi.fn()
        mockGetById.mockResolvedValue(INGREDIENT_DETAIL)

        render(<IngredientDetailModal ingredientId="ing-1" onClose={onClose} />)

        await waitFor(() => screen.getByText('Bread Flour'))
        await user.click(screen.getByRole('button', { name: /close modal/i }))

        expect(onClose).toHaveBeenCalled()
    })
})
