import api from './api'

export interface Recipe {
  id: string
  title: string
  description?: string
  servings: number
  yield_weight_grams: number
  status: 'draft' | 'active' | 'archived'
  source_type?: 'manual' | 'image' | 'whatsapp' | 'url'
  source_url?: string
  original_author?: string
  original_author_url?: string
  preferred_unit_system?: string
  target_water_activity?: number | null
  min_safe_water_activity?: number | null
  estimated_shelf_life_days?: number | null
  total_hydration_percentage?: number | null
  thumbnail_url?: string
  tags?: string[]
  rating?: number
  created_at: string
  updated_at: string
}

export interface RecipeIngredient {
  id: string
  recipe_id: string
  ingredient_master_id: string
  display_name: string
  quantity_original: number
  unit_original: string
  quantity_grams: number
  position: number
  is_flour?: boolean
  is_liquid?: boolean
}

export interface RecipeStep {
  id: string
  recipe_id: string
  section_id?: string | null
  instruction: string
  duration_seconds?: number | null
  temperature_celsius?: number | null
  position: number
  dependency_step_id?: string | null
}

export interface RecipeSection {
  id: string
  recipe_id: string
  type: 'pre_prep' | 'prep' | 'bake' | 'rest' | 'notes'
  title?: string | null
  position: number
  steps: RecipeStep[]
}

export interface RecipeVersion {
  id: string
  recipe_id: string
  version_number: number
  change_summary?: string | null
  created_at: string
}

export interface RecipeWithDetails extends Recipe {
  ingredients: RecipeIngredient[]
  sections: RecipeSection[]
}

export interface RecipeNutritionCache {
  per_100g: {
    energy_kcal: number
    protein_g: number
    fat_g: number
    carbs_g: number
    fiber_g?: number
  }
  per_serving: {
    energy_kcal: number
    protein_g: number
    fat_g: number
    carbs_g: number
    fiber_g?: number
  }
  servings: number
  calculated_at?: string
}

export interface RecipeListParams {
  search?: string
  status?: 'draft' | 'active' | 'archived' | ''
  source_type?: 'manual' | 'image' | 'whatsapp' | 'url' | ''
  sort_by?: 'created_at' | 'updated_at' | 'title' | 'rating'
  sort_order?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export interface RecipeListResponse {
  recipes: Recipe[]
  total: number
  page: number
  limit: number
  total_pages: number
}

export interface IngredientSearchResult {
  ingredient_id: string
  ingredient_name: string
  category: string
  match_type: 'canonical' | 'alias'
  similarity_score: number
  density_g_per_ml: number | null
  matched_alias?: string
}

export interface RecipeCreateRequest {
  title: string
  description?: string
  servings: number
  yield_weight_grams: number
  status?: 'draft' | 'active' | 'archived'
  source_type?: 'manual' | 'image' | 'whatsapp' | 'url'
  preferred_unit_system?: string
  ingredients?: Array<{
    ingredient_master_id: string
    display_name: string
    quantity_original: number
    unit_original: string
    position: number
  }>
  sections?: Array<{
    type: 'pre_prep' | 'prep' | 'bake' | 'rest' | 'notes'
    title?: string
    position: number
    steps: Array<{
      instruction: string
      duration_seconds?: number
      temperature_celsius?: number
      position: number
    }>
  }>
}

export const recipeService = {
  getRecipes: async (params: RecipeListParams = {}): Promise<RecipeListResponse> => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== '' && v !== undefined)
    )
    const response = await api.get('/recipes', { params: cleanParams })
    // Normalise response shape — backend may return { data: { recipes, total, ... } } or flat
    const payload = response.data?.data ?? response.data;
    const recipes = payload?.recipes ?? payload?.data ?? [];
    return {
      recipes: Array.isArray(recipes) ? recipes : [],
      total: payload?.total ?? 0,
      page: payload?.page ?? params.page ?? 1,
      limit: payload?.limit ?? params.limit ?? 12,
      total_pages: payload?.total_pages ?? Math.ceil((payload?.total ?? 0) / (params.limit ?? 12)),
    }
  },

  getRecipe: async (id: string): Promise<RecipeWithDetails> => {
    const response = await api.get(`/recipes/${id}`)
    return response.data.hasOwnProperty('data') ? response.data.data : response.data
  },

  getRecipeVersions: async (id: string): Promise<RecipeVersion[]> => {
    const response = await api.get(`/recipes/${id}/versions`)
    const payload = response.data.hasOwnProperty('data') ? response.data.data : response.data
    return Array.isArray(payload) ? payload : []
  },

  getRecipeNutrition: async (id: string): Promise<RecipeNutritionCache | null> => {
    try {
      const response = await api.get(`/recipes/${id}/nutrition`)
      // Use hasOwnProperty to distinguish between "data is null" and "data field missing"
      if (response.data && typeof response.data === 'object' && 'data' in response.data) {
        return response.data.data;
      }
      return response.data ?? null;
    } catch {
      return null
    }
  },

  calculateRecipeNutrition: async (id: string): Promise<RecipeNutritionCache> => {
    const response = await api.post(`/recipes/${id}/nutrition/calculate`)
    return response.data.hasOwnProperty('data') ? response.data.data : response.data
  },

  createRecipe: async (data: RecipeCreateRequest): Promise<Recipe> => {
    const response = await api.post('/recipes', data)
    return response.data?.data ?? response.data
  },

  updateRecipe: async (id: string, data: Partial<RecipeCreateRequest>): Promise<Recipe> => {
    const response = await api.patch(`/recipes/${id}`, data)
    return response.data?.data ?? response.data
  },

  deleteRecipe: async (id: string): Promise<void> => {
    await api.delete(`/recipes/${id}`)
  },

  scaleRecipe: async (id: string, targetYield: number) => {
    const response = await api.post(`/recipes/${id}/scale`, { target_yield_grams: targetYield })
    return response.data?.data ?? response.data
  },

  searchIngredients: async (query: string): Promise<IngredientSearchResult[]> => {
    if (!query.trim()) return []
    try {
      const response = await api.get('/ingredients/search', { params: { q: query, limit: 10 } })
      const payload = response.data?.data ?? response.data
      return Array.isArray(payload) ? payload : []
    } catch {
      return []
    }
  },

  updateRecipeIngredients: async (
    id: string,
    ingredients: RecipeCreateRequest['ingredients']
  ) => {
    const response = await api.put(`/recipes/${id}/ingredients`, { ingredients })
    return response.data?.data ?? response.data
  },

  updateRecipeSections: async (
    id: string,
    sections: RecipeCreateRequest['sections']
  ) => {
    const response = await api.put(`/recipes/${id}/sections`, { sections })
    return response.data?.data ?? response.data
  },
}
