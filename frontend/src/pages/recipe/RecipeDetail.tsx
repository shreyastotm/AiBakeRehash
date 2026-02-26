import { useParams, useNavigate } from 'react-router-dom'
import { useRecipe, useDeleteRecipe } from '../../hooks/useRecipes'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'

export const RecipeDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: recipe, isLoading, error } = useRecipe(id || '')
  const deleteRecipe = useDeleteRecipe()

  if (isLoading) return <LoadingSpinner />

  if (error) return <div className="text-red-500">Error loading recipe</div>

  if (!recipe) return <div className="text-gray-500">Recipe not found</div>

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this recipe?')) {
      await deleteRecipe.mutateAsync(id || '')
      navigate('/recipes')
    }
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">{recipe.title}</h1>
          <p className="text-gray-600">{recipe.description}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate(`/recipes/${id}/edit`)}>
            Edit
          </Button>
          <Button variant="outline" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <p className="text-gray-600 text-sm">Servings</p>
          <p className="text-2xl font-bold">{recipe.servings}</p>
        </Card>
        <Card>
          <p className="text-gray-600 text-sm">Yield Weight</p>
          <p className="text-2xl font-bold">{recipe.yield_weight_grams}g</p>
        </Card>
        <Card>
          <p className="text-gray-600 text-sm">Status</p>
          <p className="text-2xl font-bold capitalize">{recipe.status}</p>
        </Card>
      </div>

      <Card>
        <h2 className="text-xl font-semibold mb-4">Ingredients</h2>
        <p className="text-gray-500">Ingredients will be displayed here</p>
      </Card>
    </div>
  )
}
