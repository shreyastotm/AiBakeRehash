import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Recipe {
  id: string
  title: string
  description: string
  servings: number
  yield_weight_grams: number
  status: 'draft' | 'active' | 'archived'
  _optimistic?: boolean
  _pendingChanges?: Partial<Recipe>
}

interface RecipeStore {
  recipes: Recipe[]
  selectedRecipe: Recipe | null
  isLoading: boolean
  error: string | null
  setRecipes: (recipes: Recipe[]) => void
  setSelectedRecipe: (recipe: Recipe | null) => void
  addRecipe: (recipe: Recipe) => void
  updateRecipe: (id: string, recipe: Partial<Recipe>) => void
  removeRecipe: (id: string) => void
  // Optimistic updates
  optimisticUpdateRecipe: (id: string, updates: Partial<Recipe>) => void
  commitOptimisticUpdate: (id: string) => void
  rollbackOptimisticUpdate: (id: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useRecipeStore = create<RecipeStore>()(
  persist(
    (set, get) => ({
      recipes: [],
      selectedRecipe: null,
      isLoading: false,
      error: null,
      setRecipes: (recipes) => set({ recipes }),
      setSelectedRecipe: (recipe) => set({ selectedRecipe: recipe }),
      addRecipe: (recipe) =>
        set((state) => ({
          recipes: [...state.recipes, recipe],
        })),
      updateRecipe: (id, updates) =>
        set((state) => ({
          recipes: state.recipes.map((r) => (r.id === id ? { ...r, ...updates } : r)),
          selectedRecipe:
            state.selectedRecipe?.id === id
              ? { ...state.selectedRecipe, ...updates }
              : state.selectedRecipe,
        })),
      removeRecipe: (id) =>
        set((state) => ({
          recipes: state.recipes.filter((r) => r.id !== id),
          selectedRecipe: state.selectedRecipe?.id === id ? null : state.selectedRecipe,
        })),
      // Optimistic updates for better UX
      optimisticUpdateRecipe: (id, updates) =>
        set((state) => ({
          recipes: state.recipes.map((r) =>
            r.id === id
              ? {
                  ...r,
                  ...updates,
                  _optimistic: true,
                  _pendingChanges: updates,
                }
              : r
          ),
          selectedRecipe:
            state.selectedRecipe?.id === id
              ? {
                  ...state.selectedRecipe,
                  ...updates,
                  _optimistic: true,
                  _pendingChanges: updates,
                }
              : state.selectedRecipe,
        })),
      commitOptimisticUpdate: (id) =>
        set((state) => ({
          recipes: state.recipes.map((r) =>
            r.id === id
              ? {
                  ...r,
                  _optimistic: false,
                  _pendingChanges: undefined,
                }
              : r
          ),
          selectedRecipe:
            state.selectedRecipe?.id === id
              ? {
                  ...state.selectedRecipe,
                  _optimistic: false,
                  _pendingChanges: undefined,
                }
              : state.selectedRecipe,
        })),
      rollbackOptimisticUpdate: (id) => {
        const state = get()
        const recipe = state.recipes.find((r) => r.id === id)
        if (recipe && recipe._pendingChanges) {
          // Revert to previous state by removing optimistic changes
          set((s) => ({
            recipes: s.recipes.map((r) =>
              r.id === id
                ? {
                    ...r,
                    _optimistic: false,
                    _pendingChanges: undefined,
                  }
                : r
            ),
          }))
        }
      },
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
    }),
    {
      name: 'aibake-recipes',
      version: 1,
      partialize: (state) => ({
        recipes: state.recipes.filter((r) => !r._optimistic),
        selectedRecipe: state.selectedRecipe,
      }),
      // Sync across tabs
      onRehydrateStorage: () => (state) => {
        if (state) {
          window.addEventListener('storage', (e) => {
            if (e.key === 'aibake-recipes') {
              const newState = JSON.parse(e.newValue || '{}')
              state.recipes = newState.state?.recipes || []
              state.selectedRecipe = newState.state?.selectedRecipe || null
            }
          })
        }
      },
    }
  )
)
