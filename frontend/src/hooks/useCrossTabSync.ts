import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useRecipeStore } from '../store/recipeStore'
import { useInventoryStore } from '../store/inventoryStore'
import { usePreferencesStore } from '../store/preferencesStore'

/**
 * Hook for synchronizing state across multiple browser tabs
 * Listens for storage events and updates local state accordingly
 */
export const useCrossTabSync = () => {
  const setUser = useAuthStore(s => s.setUser)
  const setToken = useAuthStore(s => s.setToken)
  const setRecipes = useRecipeStore(s => s.setRecipes)
  const setSelectedRecipe = useRecipeStore(s => s.setSelectedRecipe)
  const setItems = useInventoryStore(s => s.setItems)
  const setPreferences = usePreferencesStore(s => s.setPreferences)

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (!e.key) return

      // Handle auth store changes
      if (e.key === 'aibake-auth' && e.newValue) {
        try {
          const newState = JSON.parse(e.newValue)
          if (newState.state) {
            if (newState.state.user) {
              setUser(newState.state.user)
            }
            if (newState.state.token) {
              setToken(newState.state.token)
            }
          }
        } catch (error) {
          console.error('Failed to sync auth state:', error)
        }
      }

      // Handle recipe store changes
      if (e.key === 'aibake-recipes' && e.newValue) {
        try {
          const newState = JSON.parse(e.newValue)
          if (newState.state) {
            if (newState.state.recipes) {
              setRecipes(newState.state.recipes)
            }
            if (newState.state.selectedRecipe) {
              setSelectedRecipe(newState.state.selectedRecipe)
            }
          }
        } catch (error) {
          console.error('Failed to sync recipe state:', error)
        }
      }

      // Handle inventory store changes
      if (e.key === 'aibake-inventory' && e.newValue) {
        try {
          const newState = JSON.parse(e.newValue)
          if (newState.state && newState.state.items) {
            setItems(newState.state.items)
          }
        } catch (error) {
          console.error('Failed to sync inventory state:', error)
        }
      }

      // Handle preferences store changes
      if (e.key === 'aibake-preferences' && e.newValue) {
        try {
          const newState = JSON.parse(e.newValue)
          if (newState.state && newState.state.preferences) {
            setPreferences(newState.state.preferences)
          }
        } catch (error) {
          console.error('Failed to sync preferences state:', error)
        }
      }
    }

    // Listen for storage changes from other tabs
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [setUser, setToken, setRecipes, setSelectedRecipe, setItems, setPreferences])
}
