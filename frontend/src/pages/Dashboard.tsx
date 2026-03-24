import { useAuth } from '../hooks/useAuth'
import { Card } from '../components/common/Card'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { Link } from 'react-router-dom'
import { useRecipes } from '../hooks/useRecipes'
import { useAllJournalEntries } from '../hooks/useJournalEntries'

export const Dashboard = () => {
  const { currentUser, isLoading: isAuthLoading } = useAuth()
  const { data: recipesData, isLoading: isRecipesLoading } = useRecipes()
  const { data: journalData, isLoading: isJournalLoading } = useAllJournalEntries()

  if (isAuthLoading) return <LoadingSpinner />

  const recipesCount = recipesData?.recipes?.length || 0
  const journalCount = Array.isArray(journalData) ? journalData.length : 0
  
  // Placeholder since Inventory isn't fully built
  const inventoryAlertsCount = 0

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Welcome to AiBake</h1>

      {currentUser && (
        <p className="text-lg text-gray-600 mb-8">
          Hello, <span className="font-semibold text-gray-900">{currentUser.display_name}</span>! Ready for baking?
        </p>
      )}

      {/* KPI Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Recipes</p>
            <p className="text-3xl font-bold text-blue-600">{isRecipesLoading ? '-' : recipesCount}</p>
          </div>
          <div className="text-blue-200">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Journal Entries</p>
            <p className="text-3xl font-bold text-green-600">{isJournalLoading ? '-' : journalCount}</p>
          </div>
          <div className="text-green-200">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Inventory Alerts</p>
            <p className="text-3xl font-bold text-amber-600">{inventoryAlertsCount}</p>
          </div>
          <div className="text-amber-200">
             <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-semibold mb-4 text-gray-800">Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/recipes">
          <Card className="hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer bg-gradient-to-br from-blue-50 to-white text-blue-900 border-blue-100">
            <h2 className="text-xl font-semibold mb-2 flex items-center"><span className="mr-2">📖</span> Recipes</h2>
            <p className="text-blue-700/80">Manage your baking recipes</p>
          </Card>
        </Link>

        <Link to="/inventory">
          <Card className="hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer bg-gradient-to-br from-amber-50 to-white text-amber-900 border-amber-100">
            <h2 className="text-xl font-semibold mb-2 flex items-center"><span className="mr-2">📦</span> Inventory</h2>
            <p className="text-amber-700/80">Track your ingredients</p>
          </Card>
        </Link>

        <Link to="/costing">
          <Card className="hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer bg-gradient-to-br from-purple-50 to-white text-purple-900 border-purple-100">
            <h2 className="text-xl font-semibold mb-2 flex items-center"><span className="mr-2">💰</span> Costing</h2>
            <p className="text-purple-700/80">Calculate recipe costs</p>
          </Card>
        </Link>

        <Link to="/journal">
          <Card className="hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer bg-gradient-to-br from-green-50 to-white text-green-900 border-green-100">
            <h2 className="text-xl font-semibold mb-2 flex items-center"><span className="mr-2">📔</span> Journal</h2>
            <p className="text-green-700/80">Log your baking attempts</p>
          </Card>
        </Link>
      </div>
    </div>
  )
}
