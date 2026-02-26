import { useRecipes } from '../../hooks/useRecipes'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import { Link } from 'react-router-dom'

export const RecipeList = () => {
  const { data, isLoading, error } = useRecipes()

  if (isLoading) return <LoadingSpinner />

  if (error) return <div className="text-red-500">Error loading recipes</div>

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Recipes</h1>
        <Link to="/recipes/new">
          <Button>Create Recipe</Button>
        </Link>
      </div>

      {data?.recipes?.length === 0 ? (
        <Card>
          <p className="text-center text-gray-500">No recipes yet. Create your first recipe!</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.recipes?.map((recipe: any) => (
            <Link key={recipe.id} to={`/recipes/${recipe.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <h2 className="text-xl font-semibold mb-2">{recipe.title}</h2>
                <p className="text-gray-600 mb-4">{recipe.description}</p>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>{recipe.servings} servings</span>
                  <span>{recipe.yield_weight_grams}g</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
