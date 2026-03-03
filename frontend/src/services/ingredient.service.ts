import api from './api'

// ─── Types ────────────────────────────────────────────────────────────────────

export type IngredientCategory =
    | 'flour'
    | 'fat'
    | 'sugar'
    | 'leavening'
    | 'dairy'
    | 'liquid'
    | 'fruit'
    | 'nut'
    | 'spice'
    | 'other'

export interface NutritionPer100g {
    energy_kcal: number
    protein_g: number
    fat_g: number
    carbs_g: number
    fiber_g?: number
}

export interface AllergenFlags {
    gluten?: boolean
    dairy?: boolean
    nuts?: boolean
    eggs?: boolean
}

export interface IngredientAlias {
    id: string
    alias_name: string
    alias_type: 'abbreviation' | 'regional' | 'brand' | 'common'
    locale: string | null
}

export interface IngredientMaster {
    id: string
    name: string
    category: IngredientCategory
    default_density_g_per_ml: number | null
    nutrition_per_100g: NutritionPer100g | null
    allergen_flags: AllergenFlags | null
    is_composite: boolean
    aliases?: IngredientAlias[]
    created_at: string
    updated_at: string
}

export interface IngredientSearchResult {
    id: string
    name: string
    category: IngredientCategory
    default_density_g_per_ml: number | null
    allergen_flags: AllergenFlags | null
}

export interface IngredientSubstitution {
    substitution_ingredient_id: string
    name: string
    ratio: number
    notes: string | null
}

export interface IngredientWithDetail extends IngredientMaster {
    substitutions?: IngredientSubstitution[]
}

export interface CreateIngredientInput {
    name: string
    category: IngredientCategory
    default_density_g_per_ml?: number | null
    nutrition_per_100g?: NutritionPer100g | null
    allergen_flags?: AllergenFlags | null
}

export interface IngredientListParams {
    page?: number
    limit?: number
    category?: IngredientCategory
}

export interface IngredientListResponse {
    ingredients: IngredientMaster[]
    total: number
    page: number
    limit: number
    total_pages: number
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const ingredientService = {
    /**
     * Search ingredients by name (debounced on caller side).
     * GET /api/v1/ingredients/search?q=:query&limit=:limit
     */
    search: async (query: string, limit = 10): Promise<IngredientSearchResult[]> => {
        if (!query.trim()) return []
        try {
            const response = await api.get('/ingredients/search', { params: { q: query, limit } })
            const payload = response.data?.data ?? response.data
            return Array.isArray(payload) ? payload : []
        } catch {
            return []
        }
    },

    /**
     * Get a single ingredient with full detail (nutrition, aliases, substitutions).
     * GET /api/v1/ingredients/:id
     */
    getById: async (id: string): Promise<IngredientWithDetail> => {
        const response = await api.get(`/ingredients/${id}`)
        return response.data?.data ?? response.data
    },

    /**
     * List all ingredients with optional category filter.
     * GET /api/v1/ingredients
     */
    list: async (params: IngredientListParams = {}): Promise<IngredientListResponse> => {
        const response = await api.get('/ingredients', { params })
        const payload = response.data?.data ?? response.data
        return {
            ingredients: payload?.ingredients ?? payload?.data ?? [],
            total: payload?.total ?? 0,
            page: payload?.page ?? params.page ?? 1,
            limit: payload?.limit ?? params.limit ?? 20,
            total_pages: payload?.total_pages ?? 1,
        }
    },

    /**
     * Create a new custom ingredient.
     * POST /api/v1/ingredients
     */
    create: async (data: CreateIngredientInput): Promise<IngredientMaster> => {
        const response = await api.post('/ingredients', data)
        return response.data?.data ?? response.data
    },
}
