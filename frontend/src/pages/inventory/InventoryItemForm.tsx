import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { inventoryService, InventoryItem } from '../../services/inventory.service'
import { ingredientService } from '../../services/ingredient.service'
import { Input } from '../../components/common/Input'
import { Button } from '../../components/common/Button'
import { Autocomplete } from '../../components/common/Autocomplete'
import { useNavigate, useParams } from 'react-router-dom'

interface InventoryItemFormProps {
  itemId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

const UNIT_OPTIONS = [
  { value: 'g', label: 'Grams (g)' },
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'ml', label: 'Millilitres (ml)' },
  { value: 'l', label: 'Litres (l)' },
  { value: 'cup', label: 'Cup' },
  { value: 'tbsp', label: 'Tablespoon (tbsp)' },
  { value: 'tsp', label: 'Teaspoon (tsp)' },
  { value: 'piece', label: 'Piece' },
  { value: 'dozen', label: 'Dozen' },
]

export const InventoryItemForm: React.FC<InventoryItemFormProps> = ({ itemId: propItemId, onSuccess, onCancel }) => {
  const { id: routeId } = useParams<{ id: string }>()
  const itemId = propItemId || routeId
  const isEdit = !!itemId
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [ingredientOptions, setIngredientOptions] = useState<any[]>([])
  const [searching, setSearching] = useState(false)

  const handleSearch = async (q: string) => {
    if (!q) return
    setSearching(true)
    try {
      const results = await ingredientService.search(q)
      setIngredientOptions(results.map((i: any) => ({
        value: i.ingredient_id || i.id,
        label: i.ingredient_name || i.name
      })))
    } finally {
      setSearching(false)
    }
  }

  const [form, setForm] = useState({
    ingredient_master_id: '',
    ingredient_name: '',
    quantity_on_hand: '',
    unit: 'g',
    cost_per_unit: '',
    brand_name: '',
    moisture_content: '',
    nutrition_overrides: '',
    purchase_date: new Date().toISOString().split('T')[0],
    expiration_date: '',
    min_stock_level: '',
    reorder_quantity: '',
    supplier_id: '',
  })

  const { data: existingItem } = useQuery({
    queryKey: ['inventory-item', itemId],
    queryFn: () => inventoryService.getInventoryItem(itemId!),
    enabled: isEdit,
  })

  useEffect(() => {
    if (existingItem) {
      setForm({
        ingredient_master_id: (existingItem as any).ingredient_master_id || '',
        ingredient_name: (existingItem as any).ingredient_name || '',
        quantity_on_hand: String((existingItem as any).quantity_on_hand || ''),
        unit: (existingItem as any).unit || 'g',
        cost_per_unit: String((existingItem as any).cost_per_unit || ''),
        brand_name: (existingItem as any).brand_name || '',
        moisture_content: String((existingItem as any).moisture_content || ''),
        nutrition_overrides: (existingItem as any).nutrition_overrides ? JSON.stringify((existingItem as any).nutrition_overrides) : '',
        purchase_date: (existingItem as any).purchase_date?.split('T')[0] || new Date().toISOString().split('T')[0],
        expiration_date: (existingItem as any).expiration_date?.split('T')[0] || '',
        min_stock_level: String((existingItem as any).min_stock_level || ''),
        reorder_quantity: String((existingItem as any).reorder_quantity || ''),
        supplier_id: (existingItem as any).supplier_id || '',
      })
    }
  }, [existingItem])

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.ingredient_master_id && !form.ingredient_name) errs.ingredient = 'Select an ingredient'
    if (!form.quantity_on_hand || isNaN(Number(form.quantity_on_hand))) errs.quantity_on_hand = 'Valid quantity required'
    if (!form.cost_per_unit || isNaN(Number(form.cost_per_unit))) errs.cost_per_unit = 'Valid cost required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const payload: Partial<InventoryItem> = {
        ingredient_master_id: form.ingredient_master_id,
        quantity_on_hand: Number(form.quantity_on_hand),
        unit: form.unit,
        cost_per_unit: Number(form.cost_per_unit),
        brand_name: form.brand_name || undefined,
        moisture_content: form.moisture_content ? Number(form.moisture_content) : undefined,
        expiration_date: form.expiration_date || undefined,
        min_stock_level: form.min_stock_level ? Number(form.min_stock_level) : undefined,
      }
      if (isEdit) {
        await inventoryService.updateInventoryItem(itemId, payload)
      } else {
        await inventoryService.createInventoryItem(payload)
      }
      if (onSuccess) onSuccess()
      else navigate('/inventory')
    } catch (err) {
      setErrors({ form: 'Failed to save item. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    if (onCancel) onCancel()
    else navigate('/inventory')
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {errors.form && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{errors.form}</p>}

      {/* Ingredient selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Ingredient *</label>
        <Autocomplete
          options={ingredientOptions}
          value={form.ingredient_master_id}
          displayLabel={form.ingredient_name}
          onInputChange={handleSearch}
          onChange={(val, opt) => setForm((p) => ({ ...p, ingredient_master_id: val, ingredient_name: opt.label }))}
          loading={searching}
          placeholder="Search ingredient..."
        />
        {errors.ingredient && <p className="text-red-500 text-xs mt-1">{errors.ingredient}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Quantity on Hand *"
          type="number"
          min="0"
          step="0.01"
          value={form.quantity_on_hand}
          onChange={set('quantity_on_hand')}
          error={errors.quantity_on_hand}
          required
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
          <select
            value={form.unit}
            onChange={set('unit')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {UNIT_OPTIONS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
        </div>
      </div>

      <Input
        label="Cost per Unit (₹) *"
        type="number"
        min="0"
        step="0.01"
        value={form.cost_per_unit}
        onChange={set('cost_per_unit')}
        error={errors.cost_per_unit}
        hint="e.g. cost per gram, per ml, etc."
        required
      />

      {/* Brand Onboarding */}
      <div className="border border-dashed border-gray-300 rounded-lg p-4 space-y-3">
        <h4 className="text-sm font-semibold text-gray-600">Brand Details (Optional)</h4>
        <Input
          label="Brand Name"
          value={form.brand_name}
          onChange={set('brand_name')}
          placeholder="e.g. Amul, Tata, Local"
        />
        <Input
          label="Moisture Content (%)"
          type="number"
          min="0"
          max="100"
          value={form.moisture_content}
          onChange={set('moisture_content')}
          hint="Used for accurate water activity estimation"
        />
        <Input
          label="Nutrition Overrides (JSON)"
          value={form.nutrition_overrides}
          onChange={set('nutrition_overrides')}
          placeholder='{"energy_kcal": 350, "protein_g": 8}'
          hint="Override master nutrition data for this brand"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Purchase Date"
          type="date"
          value={form.purchase_date}
          onChange={set('purchase_date')}
        />
        <Input
          label="Expiration Date"
          type="date"
          value={form.expiration_date}
          onChange={set('expiration_date')}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Min Stock Level"
          type="number"
          min="0"
          value={form.min_stock_level}
          onChange={set('min_stock_level')}
          hint="Alert when below this"
        />
        <Input
          label="Reorder Quantity"
          type="number"
          min="0"
          value={form.reorder_quantity}
          onChange={set('reorder_quantity')}
          hint="Suggested reorder amount"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading}>{isEdit ? 'Save Changes' : 'Add Item'}</Button>
        <Button type="button" variant="ghost" onClick={handleCancel} disabled={loading}>Cancel</Button>
      </div>
    </form>
  )
}
