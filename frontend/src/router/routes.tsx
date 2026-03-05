import { RouteObject } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { Login } from '../pages/auth/Login'
import { Register } from '../pages/auth/Register'
import { Dashboard } from '../pages/Dashboard'
import { RecipeList } from '../pages/recipe/RecipeList'
import { RecipeDetail } from '../pages/recipe/RecipeDetail'
import { RecipeForm } from '../pages/recipe/RecipeForm'
import { Settings } from '../pages/Settings'
import { JournalList } from '../pages/journal/JournalList'
import { JournalEntryNew } from '../pages/journal/JournalEntryNew'
import { JournalDetail } from '../pages/journal/JournalDetail'

export const routes: RouteObject[] = [
  // Auth routes (no layout)
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },

  // Protected routes with layout
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout>
          <Dashboard />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <Layout>
          <Dashboard />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/recipes',
    element: (
      <ProtectedRoute>
        <Layout>
          <RecipeList />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/recipes/new',
    element: (
      <ProtectedRoute>
        <Layout>
          <RecipeForm />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/recipes/:id',
    element: (
      <ProtectedRoute>
        <Layout>
          <RecipeDetail />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/recipes/:id/edit',
    element: (
      <ProtectedRoute>
        <Layout>
          <RecipeForm />
        </Layout>
      </ProtectedRoute>
    ),
  },

  // Inventory routes (placeholder for future implementation)
  {
    path: '/inventory',
    element: (
      <ProtectedRoute>
        <Layout>
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
            <p className="text-gray-600 mt-2">Coming soon...</p>
          </div>
        </Layout>
      </ProtectedRoute>
    ),
  },

  // Costing routes (placeholder for future implementation)
  {
    path: '/costing',
    element: (
      <ProtectedRoute>
        <Layout>
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900">Costing & Pricing</h1>
            <p className="text-gray-600 mt-2">Coming soon...</p>
          </div>
        </Layout>
      </ProtectedRoute>
    ),
  },

  // Journal routes
  {
    path: '/recipes/:id/journal',
    element: (
      <ProtectedRoute>
        <Layout>
          <JournalList />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/recipes/:recipeId/journal/new',
    element: (
      <ProtectedRoute>
        <Layout>
          <JournalEntryNew />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/recipes/:recipeId/journal/:entryId',
    element: (
      <ProtectedRoute>
        <Layout>
          <JournalDetail />
        </Layout>
      </ProtectedRoute>
    ),
  },

  // Settings
  {
    path: '/settings',
    element: (
      <ProtectedRoute>
        <Layout>
          <Settings />
        </Layout>
      </ProtectedRoute>
    ),
  },

  // Catch-all redirect to home
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]

// Import Navigate for catch-all route
import { Navigate } from 'react-router-dom'
