# State Management Usage Examples

This document provides practical examples of using the AiBake state management system in components.

## Authentication Example

### Login Component with Auth Store

```typescript
import { useState } from 'react'
import { useAuthStore } from '@/store'
import { authService } from '@/services/auth.service'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { setUser, setToken, setLoading, setError, isLoading, error } = useAuthStore()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await authService.login(email, password)
      setUser(response.user)
      setToken(response.token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  )
}
```

## Recipe Management Example

### Recipe List with Optimistic Updates

```typescript
import { useRecipeStore } from '@/store'
import { useOptimisticUpdate } from '@/hooks/useOptimisticUpdate'
import { recipeService } from '@/services/recipe.service'

export function RecipeList() {
  const { recipes, isLoading, error } = useRecipeStore()
  const { executeOptimisticUpdate } = useOptimisticUpdate()

  const handleStatusChange = async (recipeId: string, newStatus: string) => {
    const result = await executeOptimisticUpdate(
      'recipe',
      recipeId,
      { status: newStatus as any },
      () => recipeService.updateRecipe(recipeId, { status: newStatus })
    )

    if (!result.success) {
      alert(`Failed to update recipe: ${result.error}`)
    }
  }

  if (isLoading) return <div>Loading recipes...</div>
  if (error) return <div className="error">{error}</div>

  return (
    <div className="recipe-list">
      {recipes.map((recipe) => (
        <div key={recipe.id} className="recipe-card">
          <h3>{recipe.title}</h3>
          <p>{recipe.description}</p>
          <select
            value={recipe.status}
            onChange={(e) => handleStatusChange(recipe.id, e.target.value)}
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      ))}
    </div>
  )
}
```

## Inventory Management Example

### Inventory Item Update with Optimistic UI

```typescript
import { useInventoryStore } from '@/store'
import { useOptimisticUpdate } from '@/hooks/useOptimisticUpdate'
import { inventoryService } from '@/services/inventory.service'

export function InventoryItem({ itemId }: { itemId: string }) {
  const { items } = useInventoryStore()
  const { executeOptimisticUpdate } = useOptimisticUpdate()

  const item = items.find((i) => i.id === itemId)

  const handleQuantityChange = async (newQuantity: number) => {
    if (!item) return

    const result = await executeOptimisticUpdate(
      'inventory',
      itemId,
      { quantity_on_hand: newQuantity },
      () => inventoryService.updateItem(itemId, { quantity_on_hand: newQuantity })
    )

    if (!result.success) {
      alert(`Failed to update quantity: ${result.error}`)
    }
  }

  if (!item) return <div>Item not found</div>

  return (
    <div className="inventory-item">
      <h4>{item.ingredient_master_id}</h4>
      <p>Quantity: {item.quantity_on_hand} {item.unit}</p>
      <p>Cost per unit: ₹{item.cost_per_unit}</p>
      <input
        type="number"
        value={item.quantity_on_hand}
        onChange={(e) => handleQuantityChange(parseFloat(e.target.value))}
        placeholder="Quantity"
      />
      {item._optimistic && <span className="badge">Updating...</span>}
    </div>
  )
}
```

## User Preferences Example

### Settings Component with Preferences Store

```typescript
import { usePreferencesStore } from '@/store'

export function SettingsPage() {
  const { preferences, setPreferences } = usePreferencesStore()

  return (
    <div className="settings">
      <h2>Settings</h2>

      <div className="setting-group">
        <label>Unit System</label>
        <select
          value={preferences.unit_system}
          onChange={(e) =>
            setPreferences({ unit_system: e.target.value as any })
          }
        >
          <option value="metric">Metric (grams, ml)</option>
          <option value="cups">Cups & Ounces</option>
          <option value="hybrid">Hybrid</option>
          <option value="bakers_percent">Baker's Percentage</option>
        </select>
      </div>

      <div className="setting-group">
        <label>Language</label>
        <select
          value={preferences.language}
          onChange={(e) => setPreferences({ language: e.target.value as any })}
        >
          <option value="en">English</option>
          <option value="hi">हिंदी (Hindi)</option>
        </select>
      </div>

      <div className="setting-group">
        <label>Currency</label>
        <select
          value={preferences.currency}
          onChange={(e) => setPreferences({ currency: e.target.value })}
        >
          <option value="INR">₹ Indian Rupee</option>
          <option value="USD">$ US Dollar</option>
        </select>
      </div>

      <div className="setting-group">
        <label>Theme</label>
        <select
          value={preferences.theme}
          onChange={(e) => setPreferences({ theme: e.target.value as any })}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="auto">Auto</option>
        </select>
      </div>

      <div className="setting-group">
        <label>
          <input
            type="checkbox"
            checked={preferences.notifications_enabled}
            onChange={(e) =>
              setPreferences({ notifications_enabled: e.target.checked })
            }
          />
          Enable Notifications
        </label>
      </div>

      <div className="setting-group">
        <label>
          <input
            type="checkbox"
            checked={preferences.auto_save_enabled}
            onChange={(e) =>
              setPreferences({ auto_save_enabled: e.target.checked })
            }
          />
          Auto-save Recipes
        </label>
      </div>
    </div>
  )
}
```

## Cross-Tab Synchronization Example

### Logout Synchronization

When a user logs out in one tab, they're automatically logged out in all tabs:

```typescript
// Tab 1: User clicks logout
const { clearAuth } = useAuthStore()
clearAuth() // Clears auth state and updates localStorage

// Tab 2: Automatically detects the change
// The useCrossTabSync hook listens for storage events
// and automatically updates the auth store
// User is logged out in Tab 2 without page refresh
```

## Advanced: Custom Hook for Recipe Operations

```typescript
import { useRecipeStore } from '@/store'
import { useOptimisticUpdate } from '@/hooks/useOptimisticUpdate'
import { recipeService } from '@/services/recipe.service'

export function useRecipeOperations() {
  const { addRecipe, updateRecipe, removeRecipe, setError } = useRecipeStore()
  const { executeOptimisticUpdate } = useOptimisticUpdate()

  const createRecipe = async (data: any) => {
    try {
      const recipe = await recipeService.createRecipe(data)
      addRecipe(recipe)
      return recipe
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create recipe')
      throw error
    }
  }

  const updateRecipeWithOptimism = async (id: string, updates: any) => {
    return executeOptimisticUpdate(
      'recipe',
      id,
      updates,
      () => recipeService.updateRecipe(id, updates)
    )
  }

  const deleteRecipe = async (id: string) => {
    try {
      await recipeService.deleteRecipe(id)
      removeRecipe(id)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete recipe')
      throw error
    }
  }

  return {
    createRecipe,
    updateRecipeWithOptimism,
    deleteRecipe,
  }
}

// Usage in component
export function RecipeEditor() {
  const { createRecipe, updateRecipeWithOptimism } = useRecipeOperations()

  const handleSave = async (recipeData: any) => {
    if (recipeData.id) {
      await updateRecipeWithOptimism(recipeData.id, recipeData)
    } else {
      await createRecipe(recipeData)
    }
  }

  return <form onSubmit={(e) => handleSave(e.target.value)} />
}
```

## Error Handling Pattern

```typescript
import { useRecipeStore } from '@/store'

export function RecipeForm() {
  const { error, setError } = useRecipeStore()

  const handleSubmit = async (data: any) => {
    setError(null) // Clear previous errors

    try {
      // Perform operation
      await recipeService.createRecipe(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
    }
  }

  return (
    <div>
      {error && (
        <div className="error-banner" role="alert">
          {error}
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
      <form onSubmit={(e) => handleSubmit(e.target.value)} />
    </div>
  )
}
```

## Loading State Pattern

```typescript
import { useRecipeStore } from '@/store'

export function RecipeList() {
  const { recipes, isLoading, setLoading } = useRecipeStore()

  const handleRefresh = async () => {
    setLoading(true)
    try {
      const recipes = await recipeService.getRecipes()
      setRecipes(recipes)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button onClick={handleRefresh} disabled={isLoading}>
        {isLoading ? 'Loading...' : 'Refresh'}
      </button>
      {isLoading && <div className="spinner" />}
      {recipes.map((recipe) => (
        <div key={recipe.id}>{recipe.title}</div>
      ))}
    </div>
  )
}
```
