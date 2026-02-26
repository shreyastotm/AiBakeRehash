import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { recipeService, Recipe, RecipeCreateRequest } from '../services/recipe.service'

export const useRecipes = (page = 1, limit = 10) => {
  return useQuery({
    queryKey: ['recipes', page, limit],
    queryFn: () => recipeService.getRecipes(page, limit),
  })
}

export const useRecipe = (id: string) => {
  return useQuery({
    queryKey: ['recipe', id],
    queryFn: () => recipeService.getRecipe(id),
    enabled: !!id,
  })
}

export const useCreateRecipe = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: RecipeCreateRequest) => recipeService.createRecipe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}

export const useUpdateRecipe = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RecipeCreateRequest> }) =>
      recipeService.updateRecipe(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['recipe', id] })
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}

export const useDeleteRecipe = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => recipeService.deleteRecipe(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}

export const useScaleRecipe = () => {
  return useMutation({
    mutationFn: ({ id, targetYield }: { id: string; targetYield: number }) =>
      recipeService.scaleRecipe(id, targetYield),
  })
}
