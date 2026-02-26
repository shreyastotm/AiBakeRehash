import api from './api'

export interface Recipe {
  id: string
  title: string
  description: string
  servings: number
  yield_weight_grams: number
  status: 'draft' | 'active' | 'archived'
  created_at: string
  updated_at: string
}

export interface RecipeCreateRequest {
  title: string
  description: string
  servings: number
  yield_weight_grams: number
  status?: 'draft' | 'active' | 'archived'
}

export const recipeService = {
  getRecipes: async (page = 1, limit = 10) => {
    const response = await api.get('/recipes', { params: { page, limit } })
    return response.data
  },

  getRecipe: async (id: string): Promise<Recipe> => {
    const response = await api.get(`/recipes/${id}`)
    return response.data
  },

  createRecipe: async (data: RecipeCreateRequest): Promise<Recipe> => {
    const response = await api.post('/recipes', data)
    return response.data
  },

  updateRecipe: async (id: string, data: Partial<RecipeCreateRequest>): Promise<Recipe> => {
    const response = await api.patch(`/recipes/${id}`, data)
    return response.data
  },

  deleteRecipe: async (id: string): Promise<void> => {
    await api.delete(`/recipes/${id}`)
  },

  scaleRecipe: async (id: string, targetYield: number) => {
    const response = await api.post(`/recipes/${id}/scale`, { target_yield_grams: targetYield })
    return response.data
  },
}
