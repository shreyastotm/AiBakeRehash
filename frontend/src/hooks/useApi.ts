import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import api from '../services/api'

/**
 * Custom hook for GET requests with React Query
 * Handles data fetching, caching, and error handling
 */
export const useApiQuery = <TData = unknown>(
  key: string | string[],
  url: string,
  options?: Omit<UseQueryOptions<TData, AxiosError>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<TData, AxiosError>({
    queryKey: Array.isArray(key) ? key : [key],
    queryFn: async () => {
      const response = await api.get<TData>(url)
      return response.data
    },
    ...options,
  })
}

/**
 * Custom hook for POST requests with React Query
 * Handles data mutation, caching invalidation, and error handling
 */
export const useApiMutation = <TData = unknown, TVariables = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: Omit<UseMutationOptions<TData, AxiosError, TVariables>, 'mutationFn'>
) => {
  return useMutation<TData, AxiosError, TVariables>({
    mutationFn,
    ...options,
  })
}

/**
 * Custom hook for POST requests
 */
export const useApiPost = <TData = unknown, TVariables = unknown>(
  url: string,
  options?: Omit<UseMutationOptions<TData, AxiosError, TVariables>, 'mutationFn'>
) => {
  return useMutation<TData, AxiosError, TVariables>({
    mutationFn: async (variables: TVariables) => {
      const response = await api.post<TData>(url, variables)
      return response.data
    },
    ...options,
  })
}

/**
 * Custom hook for PATCH requests
 */
export const useApiPatch = <TData = unknown, TVariables = unknown>(
  url: string,
  options?: Omit<UseMutationOptions<TData, AxiosError, TVariables>, 'mutationFn'>
) => {
  return useMutation<TData, AxiosError, TVariables>({
    mutationFn: async (variables: TVariables) => {
      const response = await api.patch<TData>(url, variables)
      return response.data
    },
    ...options,
  })
}

/**
 * Custom hook for DELETE requests
 */
export const useApiDelete = <TData = unknown>(
  url: string,
  options?: Omit<UseMutationOptions<TData, AxiosError, void>, 'mutationFn'>
) => {
  return useMutation<TData, AxiosError, void>({
    mutationFn: async () => {
      const response = await api.delete<TData>(url)
      return response.data
    },
    ...options,
  })
}
