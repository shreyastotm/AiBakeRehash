import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface InventoryItem {
  id: string
  ingredient_master_id: string
  quantity_on_hand: number
  unit: string
  cost_per_unit: number
  currency: string
  _optimistic?: boolean
  _pendingChanges?: Partial<InventoryItem>
}

interface InventoryStore {
  items: InventoryItem[]
  isLoading: boolean
  error: string | null
  setItems: (items: InventoryItem[]) => void
  addItem: (item: InventoryItem) => void
  updateItem: (id: string, item: Partial<InventoryItem>) => void
  removeItem: (id: string) => void
  // Optimistic updates
  optimisticUpdateItem: (id: string, updates: Partial<InventoryItem>) => void
  commitOptimisticUpdate: (id: string) => void
  rollbackOptimisticUpdate: (id: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useInventoryStore = create<InventoryStore>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,
      error: null,
      setItems: (items) => set({ items }),
      addItem: (item) =>
        set((state) => ({
          items: [...state.items, item],
        })),
      updateItem: (id, updates) =>
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? { ...i, ...updates } : i)),
        })),
      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        })),
      // Optimistic updates for better UX
      optimisticUpdateItem: (id, updates) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id
              ? {
                  ...i,
                  ...updates,
                  _optimistic: true,
                  _pendingChanges: updates,
                }
              : i
          ),
        })),
      commitOptimisticUpdate: (id) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id
              ? {
                  ...i,
                  _optimistic: false,
                  _pendingChanges: undefined,
                }
              : i
          ),
        })),
      rollbackOptimisticUpdate: (id) => {
        const state = get()
        const item = state.items.find((i) => i.id === id)
        if (item && item._pendingChanges) {
          set((s) => ({
            items: s.items.map((i) =>
              i.id === id
                ? {
                    ...i,
                    _optimistic: false,
                    _pendingChanges: undefined,
                  }
                : i
            ),
          }))
        }
      },
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
    }),
    {
      name: 'aibake-inventory',
      version: 1,
      partialize: (state) => ({
        items: state.items.filter((i) => !i._optimistic),
      }),
      // Sync across tabs
      onRehydrateStorage: () => (state) => {
        if (state) {
          window.addEventListener('storage', (e) => {
            if (e.key === 'aibake-inventory') {
              const newState = JSON.parse(e.newValue || '{}')
              state.items = newState.state?.items || []
            }
          })
        }
      },
    }
  )
)
