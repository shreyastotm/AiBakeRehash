import { useAuth } from '../hooks/useAuth'
import { Card } from '../components/common/Card'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { Link } from 'react-router-dom'

export const Dashboard = () => {
  const { currentUser, isLoading } = useAuth()

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Welcome to AiBake</h1>

      {currentUser && (
        <p className="text-lg text-gray-600 mb-8">
          Hello, <span className="font-semibold">{currentUser.display_name}</span>!
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/recipes">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <h2 className="text-xl font-semibold mb-2">📖 Recipes</h2>
            <p className="text-gray-600">Manage your baking recipes</p>
          </Card>
        </Link>

        <Link to="/inventory">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <h2 className="text-xl font-semibold mb-2">📦 Inventory</h2>
            <p className="text-gray-600">Track your ingredients</p>
          </Card>
        </Link>

        <Link to="/costing">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <h2 className="text-xl font-semibold mb-2">💰 Costing</h2>
            <p className="text-gray-600">Calculate recipe costs</p>
          </Card>
        </Link>

        <Link to="/journal">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <h2 className="text-xl font-semibold mb-2">📔 Journal</h2>
            <p className="text-gray-600">Log your baking attempts</p>
          </Card>
        </Link>
      </div>
    </div>
  )
}
