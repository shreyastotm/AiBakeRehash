import api from './api'

export interface CostCalculation {
  recipe_id: string
  ingredient_cost: number
  overhead_cost: number
  packaging_cost: number
  labor_cost: number
  total_cost: number
  cost_per_serving: number
  cost_per_100g: number
  currency: string
}

export interface CostCalculationRequest {
  overhead_cost?: number
  packaging_cost?: number
  labor_cost?: number
  currency?: string
}

export const costingService = {
  calculateRecipeCost: async (
    recipeId: string,
    data: CostCalculationRequest
  ): Promise<CostCalculation> => {
    const response = await api.post(`/recipes/${recipeId}/cost/calculate`, data)
    return response.data
  },

  getRecipeCost: async (recipeId: string): Promise<CostCalculation> => {
    const response = await api.get(`/recipes/${recipeId}/cost`)
    return response.data
  },

  getCostHistory: async (recipeId: string) => {
    const response = await api.get(`/recipes/${recipeId}/cost/history`)
    return response.data
  },

  calculatePricing: async (recipeId: string, profitMargin: number) => {
    const response = await api.post(`/recipes/${recipeId}/pricing`, { target_profit_margin: profitMargin })
    return response.data
  },
}
