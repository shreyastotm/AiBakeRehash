import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateRecipe } from '../../hooks/useRecipes'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { Card } from '../../components/common/Card'

export const RecipeForm = () => {
  const navigate = useNavigate()
  const createRecipe = useCreateRecipe()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    servings: 1,
    yield_weight_grams: 0,
    status: 'draft' as const,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'servings' || name === 'yield_weight_grams' ? parseFloat(value) : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const result = await createRecipe.mutateAsync(formData)
      navigate(`/recipes/${result.id}`)
    } catch (error) {
      console.error('Failed to create recipe:', error)
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Create New Recipe</h1>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Recipe Title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <Input
            label="Servings"
            name="servings"
            type="number"
            value={formData.servings}
            onChange={handleChange}
            min="1"
            required
          />

          <Input
            label="Yield Weight (grams)"
            name="yield_weight_grams"
            type="number"
            value={formData.yield_weight_grams}
            onChange={handleChange}
            min="0"
            required
          />

          <div className="flex gap-4">
            <Button type="submit" className="flex-1">
              Create Recipe
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => navigate('/recipes')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
