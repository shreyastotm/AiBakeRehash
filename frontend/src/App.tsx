import { BrowserRouter as Router, useRoutes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { I18nextProvider } from 'react-i18next'
import i18n from './i18n/config'
import { queryClient } from './services/queryClient'
import { routes } from './router/routes'
import { useCrossTabSync } from './hooks/useCrossTabSync'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ToastProvider } from './components/common'

function AppRoutes() {
  return useRoutes(routes)
}

function AppContent() {
  // Initialize cross-tab synchronization
  useCrossTabSync()

  return (
    <Router>
      <AppRoutes />
    </Router>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </QueryClientProvider>
      </I18nextProvider>
    </ErrorBoundary>
  )
}

export default App
