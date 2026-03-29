import api from './api'

export interface InventoryItem {
  id: string
  ingredient_master_id: string
  quantity_on_hand: number
  unit: string
  cost_per_unit: number
  currency: string
  brand_name?: string
  moisture_content?: number
  expiration_date?: string
  min_stock_level?: number
}

export const inventoryService = {
  getInventory: async (page = 1, limit = 10) => {
    const response = await api.get('/inventory', { params: { page, limit } })
    return response.data
  },

  getInventoryItem: async (id: string): Promise<InventoryItem> => {
    const response = await api.get(`/inventory/${id}`)
    return response.data
  },

  createInventoryItem: async (data: Partial<InventoryItem>): Promise<InventoryItem> => {
    const response = await api.post('/inventory', data)
    return response.data
  },

  updateInventoryItem: async (id: string, data: Partial<InventoryItem>): Promise<InventoryItem> => {
    const response = await api.patch(`/inventory/${id}`, data)
    return response.data
  },

  deleteInventoryItem: async (id: string): Promise<void> => {
    await api.delete(`/inventory/${id}`)
  },

  getAlerts: async () => {
    const response = await api.get('/inventory/alerts')
    return response.data
  },

  getInventoryByIngredient: async (ingredientId: string): Promise<InventoryItem[]> => {
    const response = await api.get(`/inventory/by-ingredient/${ingredientId}`)
    return response.data.data
  },

  logPurchase: async (data: {
    ingredient_master_id?: string
    ingredient_name?: string
    quantity: number
    unit: string
    cost: number
    supplier?: string
    purchase_date: string
    invoice_number?: string
  }) => {
    const response = await api.post('/inventory/purchases', data)
    return response.data
  },

  getPurchases: async (page = 1, limit = 50) => {
    const response = await api.get('/inventory/purchases', { params: { page, limit } })
    return response.data
  },

  getUsageReport: async (from?: string, to?: string) => {
    const response = await api.get('/inventory/reports/usage', { params: { from, to } })
    return response.data
  },

  getValueReport: async () => {
    const response = await api.get('/inventory/reports/value')
    return response.data
  },
}
