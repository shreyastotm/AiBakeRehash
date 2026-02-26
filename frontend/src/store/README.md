# State Management

This directory contains all Zustand stores for the AiBake frontend application. The state management system is designed with persistence, optimistic updates, and cross-tab synchronization.

## Stores

### authStore
Manages user authentication state including user profile and JWT token.

**Features:**
- Persistent token storage in localStorage
- Cross-tab synchronization for logout/login
- Loading and error states
- Automatic token persistence

**Usage:**
```typescript
import { useAuthStore } from '@/store'

function MyComponent() {
  const { user, token, setUser, setToken, clearAuth } = useAuthStore()
  
  return (
    <div>
      {user && <p>Welcome, {user.display_name}</p>}
    </div>
  )
}
```

### recipeStore
Manages recipe data including list, selected recipe, and optimistic updates.

**Features:**
- Persistent recipe cache in localStorage
- Optimistic updates for better UX
- Automatic rollback on errors
- Loading and error states
- Cross-tab synchronization

**Usage:**
```typescript
import { useRecipeStore } from '@/store'

function RecipeList() {
  const { recipes, addRecipe, updateRecipe, removeRecipe } = useRecipeStore()
  
  return (
    <div>
      {recipes.map(recipe => (
        <div key={recipe.id}>{recipe.title}</div>
      ))}
    </div>
  )
}
```

### inventoryStore
Manages inventory items with costs and stock levels.

**Features:**
- Persistent inventory cache in localStorage
- Optimistic updates for stock changes
- Automatic rollback on errors
- Loading and error states
- Cross-tab synchronization

**Usage:**
```typescript
import { useInventoryStore } from '@/store'

function InventoryList() {
  const { items, updateItem, removeItem } = useInventoryStore()
  
  return (
    <div>
      {items.map(item => (
        <div key={item.id}>{item.ingredient_master_id}</div>
      ))}
    </div>
  )
}
```

### preferencesStore
Manages user preferences including unit system, language, and theme.

**Features:**
- Persistent preferences in localStorage
- Cross-tab synchronization
- Default preferences fallback
- Easy preference updates

**Usage:**
```typescript
import { usePreferencesStore } from '@/store'

function Settings() {
  const { preferences, setPreferences } = usePreferencesStore()
  
  return (
    <div>
      <select 
        value={preferences.unit_system}
        onChange={(e) => setPreferences({ unit_system: e.target.value as any })}
      >
        <option value="metric">Metric</option>
        <option value="cups">Cups</option>
      </select>
    </div>
  )
}
```

## Optimistic Updates

Optimistic updates provide immediate UI feedback while the server processes the request. If the server request fails, the UI automatically reverts to the previous state.

### Using Optimistic Updates

Use the `useOptimisticUpdate` hook for consistent optimistic update handling:

```typescript
import { useOptimisticUpdate } from '@/hooks/useOptimisticUpdate'
import { recipeService } from '@/services/recipe.service'

function RecipeEditor() {
  const { executeOptimisticUpdate } = useOptimisticUpdate()
  
  const handleUpdate = async (recipeId: string, updates: Partial<Recipe>) => {
    const result = await executeOptimisticUpdate(
      'recipe',
      recipeId,
      updates,
      () => recipeService.updateRecipe(recipeId, updates)
    )
    
    if (!result.success) {
      console.error('Update failed:', result.error)
    }
  }
  
  return <button onClick={() => handleUpdate('123', { title: 'New Title' })}>Update</button>
}
```

### Manual Optimistic Updates

For more control, use store methods directly:

```typescript
const { optimisticUpdateRecipe, commitOptimisticUpdate, rollbackOptimisticUpdate } = useRecipeStore()

// Apply optimistic update
optimisticUpdateRecipe(recipeId, { title: 'New Title' })

// After successful API call
commitOptimisticUpdate(recipeId)

// On error
rollbackOptimisticUpdate(recipeId)
```

## Cross-Tab Synchronization

The `useCrossTabSync` hook automatically synchronizes state across multiple browser tabs. When a user logs out in one tab, they're automatically logged out in all tabs. Recipe updates in one tab are reflected in others.

### How It Works

1. Each store uses Zustand's `persist` middleware to save state to localStorage
2. The `useCrossTabSync` hook listens for `storage` events from other tabs
3. When storage changes are detected, the local stores are updated
4. The hook is automatically initialized in `App.tsx`

### Storage Keys

- `aibake-auth` - Authentication state
- `aibake-recipes` - Recipe data
- `aibake-inventory` - Inventory data
- `aibake-preferences` - User preferences

## State Persistence

All stores automatically persist their state to localStorage. The persistence configuration:

- **Storage Key**: Unique key per store (e.g., `aibake-recipes`)
- **Version**: Version number for migration support
- **Partialize**: Selective persistence (e.g., excluding optimistic flags)

### Clearing Persisted State

To clear all persisted state:

```typescript
// Clear individual stores
localStorage.removeItem('aibake-auth')
localStorage.removeItem('aibake-recipes')
localStorage.removeItem('aibake-inventory')
localStorage.removeItem('aibake-preferences')

// Or clear all
localStorage.clear()
```

## Best Practices

1. **Use hooks for state access**: Always use the store hooks, not direct store access
2. **Leverage optimistic updates**: Use `useOptimisticUpdate` for better UX
3. **Handle loading states**: Check `isLoading` before rendering
4. **Handle errors gracefully**: Display error messages from `error` state
5. **Keep stores focused**: Each store manages a specific domain
6. **Use TypeScript**: Leverage type safety for store actions

## Requirements Mapping

This implementation satisfies the following requirements:

- **Requirement 27.5**: State management for application data
- **Requirement 90.1**: Zustand stores for authentication, recipes, inventory, preferences
- **Requirement 90.2**: State persistence for user preferences in localStorage
- **Requirement 90.3**: Optimistic updates for better UX
- **Requirement 90.4**: State synchronization across multiple tabs
- **Requirement 90.5**: Loading and error state management

## Testing

When testing components that use stores, mock the stores:

```typescript
import { useRecipeStore } from '@/store'

jest.mock('@/store', () => ({
  useRecipeStore: jest.fn(),
}))

test('renders recipes', () => {
  (useRecipeStore as jest.Mock).mockReturnValue({
    recipes: [{ id: '1', title: 'Test Recipe' }],
    setRecipes: jest.fn(),
  })
  
  // Test component
})
```
