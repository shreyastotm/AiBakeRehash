import { RouteObject, Navigate } from 'react-router-dom'
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
import { JournalEntryEdit } from '../pages/journal/JournalEntryEdit'
import { InventoryListPage } from '../pages/inventory/InventoryListPage'
import { InventoryItemForm } from '../pages/inventory/InventoryItemForm'
import { PurchaseLogPage } from '../pages/inventory/PurchaseLogPage'
import { InventoryAlertsPage } from '../pages/inventory/InventoryAlertsPage'
import { InventoryReportsPage } from '../pages/inventory/InventoryReportsPage'
import { CostCalculatorPage } from '../pages/costing/CostCalculatorPage'
import { ProfitAnalysisPage } from '../pages/costing/ProfitAnalysisPage'
import { BulkPricingPage } from '../pages/costing/BulkPricingPage'
import { ShoppingListPage } from '../pages/tools/ShoppingListPage'
import { EmergencyHelpPage } from '../pages/help/EmergencyHelpPage'
import { TimerPage } from '../pages/timer/TimerPage'

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

  // Inventory routes
  {
    path: '/inventory',
    element: (
      <ProtectedRoute>
        <Layout>
          <InventoryListPage />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/inventory/items/new',
    element: (
      <ProtectedRoute>
        <Layout>
          <InventoryItemForm />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/inventory/items/:id/edit',
    element: (
      <ProtectedRoute>
        <Layout>
          <InventoryItemForm />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/inventory/purchase-log',
    element: (
      <ProtectedRoute>
        <Layout>
          <PurchaseLogPage />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/inventory/alerts',
    element: (
      <ProtectedRoute>
        <Layout>
          <InventoryAlertsPage />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/inventory/reports',
    element: (
      <ProtectedRoute>
        <Layout>
          <InventoryReportsPage />
        </Layout>
      </ProtectedRoute>
    ),
  },

  // Costing routes
  {
    path: '/costing',
    element: (
      <ProtectedRoute>
        <Layout>
          <CostCalculatorPage />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/costing/recipes/:recipeId',
    element: (
      <ProtectedRoute>
        <Layout>
          <CostCalculatorPage />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/costing/profit-analysis',
    element: (
      <ProtectedRoute>
        <Layout>
          <ProfitAnalysisPage />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/costing/bulk-pricing',
    element: (
      <ProtectedRoute>
        <Layout>
          <BulkPricingPage />
        </Layout>
      </ProtectedRoute>
    ),
  },

  // Journal routes
  {
    path: '/journal',
    element: (
      <ProtectedRoute>
        <Layout>
          <JournalList />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/recipes/:recipeId/journal',
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
  {
    path: '/recipes/:recipeId/journal/:entryId/edit',
    element: (
      <ProtectedRoute>
        <Layout>
          <JournalEntryEdit />
        </Layout>
      </ProtectedRoute>
    ),
  },

  // Tools & Help
  {
    path: '/timer',
    element: (
      <ProtectedRoute>
        <Layout>
          <TimerPage />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/timer/:recipeId',
    element: (
      <ProtectedRoute>
        <Layout>
          <TimerPage />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/tools/shopping-list',
    element: (
      <ProtectedRoute>
        <Layout>
          <ShoppingListPage />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/help/emergency',
    element: (
      <ProtectedRoute>
        <Layout>
          <EmergencyHelpPage />
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

  // Catch-all
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]
