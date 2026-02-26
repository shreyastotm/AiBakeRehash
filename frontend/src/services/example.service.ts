/**
 * Example Service - Demonstrates API client usage patterns
 * This file shows best practices for using the API client with React Query
 */

import { useApiQuery, useApiPost, useApiPatch, useApiDelete } from '@/hooks/useApi'
import { queryClient } from './queryClient'

// Example types
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
}

export interface RecipeUpdateRequest {
  title?: string
  description?: string
  servings?: number
  yield_weight_grams?: number
  status?: 'draft' | 'active' | 'archived'
}

/**
 * Hook to fetch all recipes
 * Usage: const { data, isLoading, error } = useRecipes()
 */
export const useRecipes = () => {
  return useApiQuery<Recipe[]>('recipes', '/recipes', {
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to fetch a single recipe by ID
 * Usage: const { data, isLoading, error } = useRecipe(recipeId)
 */
export const useRecipe = (recipeId: string) => {
  return useApiQuery<Recipe>(
    ['recipe', recipeId],
    `/recipes/${recipeId}`,
    {
      enabled: !!recipeId, // Only fetch if recipeId is provided
    }
  )
}

/**
 * Hook to create a new recipe
 * Usage: const { mutate, isPending } = useCreateRecipe()
 */
export const useCreateRecipe = () => {
  return useApiPost<Recipe, RecipeCreateRequest>('/recipes', {
    onSuccess: (newRecipe) => {
      // Invalidate recipes list to refetch
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      // Optionally add to cache
      queryClient.setQueryData(['recipe', newRecipe.id], newRecipe)
    },
  })
}

/**
 * Hook to update a recipe
 * Usage: const { mutate, isPending } = useUpdateRecipe(recipeId)
 */
export const useUpdateRecipe = (recipeId: string) => {
  return useApiPatch<Recipe, RecipeUpdateRequest>(
    `/recipes/${recipeId}`,
    {
      onMutate: async (updatedData) => {
        // Cancel ongoing queries
        await queryClient.cancelQueries({ queryKey: ['recipe', recipeId] })

        // Snapshot previous data
        const previousRecipe = queryClient.getQueryData<Recipe>([
          'recipe',
          recipeId,
        ])

        // Optimistically update cache
        if (previousRecipe) {
          queryClient.setQueryData(['recipe', recipeId], {
            ...previousRecipe,
            ...updatedData,
          })
        }

        return { previousRecipe }
      },
      onError: (error, variables, context) => {
        // Revert on error
        if (context?.previousRecipe) {
          queryClient.setQueryData(['recipe', recipeId], context.previousRecipe)
        }
      },
      onSuccess: (updatedRecipe) => {
        // Update cache with server response
        queryClient.setQueryData(['recipe', recipeId], updatedRecipe)
        // Invalidate list to ensure consistency
        queryClient.invalidateQueries({ queryKey: ['recipes'] })
      },
    }
  )
}

/**
 * Hook to delete a recipe
 * Usage: const { mutate, isPending } = useDeleteRecipe(recipeId)
 */
export const useDeleteRecipe = (recipeId: string) => {
  return useApiDelete<void>(`/recipes/${recipeId}`, {
    onSuccess: () => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['recipe', recipeId] })
      // Invalidate list
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}

/**
 * Hook to scale a recipe
 * Usage: const { mutate, isPending } = useScaleRecipe(recipeId)
 */
export const useScaleRecipe = (recipeId: string) => {
  return useApiPost<Recipe, { target_yield_grams: number }>(
    `/recipes/${recipeId}/scale`,
    {
      onSuccess: (scaledRecipe) => {
        // Update cache with scaled recipe
        queryClient.setQueryData(['recipe', recipeId], scaledRecipe)
      },
    }
  )
}

/**
 * Prefetch recipe data for faster navigation
 * Usage: prefetchRecipe(recipeId) when hovering over a link
 */
export const prefetchRecipe = (recipeId: string) => {
  queryClient.prefetchQuery({
    queryKey: ['recipe', recipeId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/recipes/${recipeId}`)
      return response.json()
    },
  })
}

/**
 * Invalidate all recipe-related queries
 * Usage: invalidateRecipes() after batch operations
 */
export const invalidateRecipes = () => {
  queryClient.invalidateQueries({ queryKey: ['recipes'] })
}

/**
 * Invalidate specific recipe
 * Usage: invalidateRecipe(recipeId) after updates
 */
export const invalidateRecipe = (recipeId: string) => {
  queryClient.invalidateQueries({ queryKey: ['recipe', recipeId] })
}
