import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { recipeService, RecipeCreateRequest, RecipeListParams } from '../services/recipe.service'

export const useRecipes = (params: RecipeListParams = {}) => {
  return useQuery({
    queryKey: ['recipes', params],
    queryFn: () => recipeService.getRecipes(params),
    placeholderData: (prev) => prev,
  })
}

export const useRecipe = (id: string) => {
  return useQuery({
    queryKey: ['recipe', id],
    queryFn: () => recipeService.getRecipe(id),
    enabled: !!id,
  })
}

export const useRecipeVersions = (id: string) => {
  return useQuery({
    queryKey: ['recipe-versions', id],
    queryFn: () => recipeService.getRecipeVersions(id),
    enabled: !!id,
  })
}

export const useRecipeNutrition = (id: string) => {
  return useQuery({
    queryKey: ['recipe-nutrition', id],
    queryFn: () => recipeService.getRecipeNutrition(id),
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
