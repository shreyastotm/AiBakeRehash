import React, { useState } from 'react'
import { Input } from '../common/Input'
import { Button } from '../common/Button'

export interface PurchaseFormData {
  ingredient_name: string
  quantity: number
  unit: string
  cost: number
  supplier?: string
  purchase_date: string
}

interface PurchaseFormProps {
  ingredientName?: string
  onSubmit: (data: PurchaseFormData) => void
  onCancel?: () => void
  loading?: boolean
}

export const PurchaseForm: React.FC<PurchaseFormProps> = ({
  ingredientName = '',
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [form, setForm] = useState<PurchaseFormData>({
    ingredient_name: ingredientName,
    quantity: 0,
    unit: 'g',
    cost: 0,
    supplier: '',
    purchase_date: new Date().toISOString().split('T')[0],
  })
  const [errors, setErrors] = useState<Partial<Record<keyof PurchaseFormData, string>>>({})

  const set = (field: keyof PurchaseFormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const validate = (): boolean => {
    const errs: typeof errors = {}
    if (!form.ingredient_name.trim()) errs.ingredient_name = 'Ingredient name is required'
    if (form.quantity <= 0) errs.quantity = 'Quantity must be greater than 0'
    if (form.cost < 0) errs.cost = 'Cost cannot be negative'
    if (!form.unit.trim()) errs.unit = 'Unit is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) onSubmit({ ...form, quantity: Number(form.quantity), cost: Number(form.cost) })
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Record purchase" className="space-y-4">
      <Input
        label="Ingredient"
        value={form.ingredient_name}
        onChange={set('ingredient_name')}
        error={errors.ingredient_name}
        required
        aria-required="true"
      />
      <div className="flex gap-3">
        <Input
          label="Quantity"
          type="number"
          min="0"
          step="0.01"
          value={String(form.quantity)}
          onChange={set('quantity')}
          error={errors.quantity}
          className="flex-1"
          required
        />
        <Input
          label="Unit"
          value={form.unit}
          onChange={set('unit')}
          error={errors.unit}
          className="w-24"
          placeholder="g, kg, ml…"
          required
        />
      </div>
      <Input
        label="Cost (₹)"
        type="number"
        min="0"
        step="0.01"
        value={String(form.cost)}
        onChange={set('cost')}
        error={errors.cost}
        hint="Total cost for the quantity purchased"
      />
      <Input
        label="Supplier (optional)"
        value={form.supplier}
        onChange={set('supplier')}
        placeholder="e.g. Local market"
      />
      <Input
        label="Purchase Date"
        type="date"
        value={form.purchase_date}
        onChange={set('purchase_date')}
      />
      <div className="flex gap-3 pt-2">
        <Button type="submit" variant="primary" loading={loading}>
          Record Purchase
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
