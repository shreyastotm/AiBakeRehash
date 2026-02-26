import { useCallback } from 'react'
import { useRecipeStore } from '../store/recipeStore'
import { useInventoryStore } from '../store/inventoryStore'

/**
 * Hook for managing optimistic updates with automatic rollback on error
 * Provides a consistent pattern for optimistic UI updates across the app
 */
export const useOptimisticUpdate = () => {
  const recipeStore = useRecipeStore()
  const inventoryStore = useInventoryStore()

  /**
   * Execute an async operation with optimistic updates
   * @param type - Type of entity being updated ('recipe' | 'inventory')
   * @param id - ID of the entity
   * @param updates - Partial updates to apply optimistically
   * @param asyncOperation - Async function that performs the actual update
   */
  const executeOptimisticUpdate = useCallback(
    async <T,>(
      type: 'recipe' | 'inventory',
      id: string,
      updates: Partial<T>,
      asyncOperation: () => Promise<T>
    ): Promise<{ success: boolean; data?: T; error?: string }> => {
      try {
        // Apply optimistic update immediately
        if (type === 'recipe') {
          recipeStore.optimisticUpdateRecipe(id, updates as any)
        } else if (type === 'inventory') {
          inventoryStore.optimisticUpdateItem(id, updates as any)
        }

        // Execute the actual operation
        const result = await asyncOperation()

        // Commit the optimistic update
        if (type === 'recipe') {
          recipeStore.commitOptimisticUpdate(id)
        } else if (type === 'inventory') {
          inventoryStore.commitOptimisticUpdate(id)
        }

        return { success: true, data: result }
      } catch (error) {
        // Rollback on error
        if (type === 'recipe') {
          recipeStore.rollbackOptimisticUpdate(id)
        } else if (type === 'inventory') {
          inventoryStore.rollbackOptimisticUpdate(id)
        }

        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return { success: false, error: errorMessage }
      }
    },
    [recipeStore, inventoryStore]
  )

  return { executeOptimisticUpdate }
}
