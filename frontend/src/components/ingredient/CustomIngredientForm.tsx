import React, { useState } from 'react'
import { ingredientService } from '../../services/ingredient.service'
import type { CreateIngredientInput, IngredientCategory } from '../../services/ingredient.service'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import { Select } from '../common/Select'
import { LoadingSpinner } from '../common/LoadingSpinner'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface CustomIngredientFormProps {
    /** Called after a successful ingredient creation with the new ingredient's id/name */
    onSuccess: (id: string, name: string) => void
    /** Optional cancel handler */
    onCancel?: () => void
}

// ─── Options ──────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
    { value: 'flour', label: 'Flour' },
    { value: 'fat', label: 'Fat' },
    { value: 'sugar', label: 'Sugar' },
    { value: 'leavening', label: 'Leavening' },
    { value: 'dairy', label: 'Dairy' },
    { value: 'liquid', label: 'Liquid' },
    { value: 'fruit', label: 'Fruit' },
    { value: 'nut', label: 'Nut' },
    { value: 'spice', label: 'Spice' },
    { value: 'other', label: 'Other' },
]

// ─── Local form state ─────────────────────────────────────────────────────────

interface FormState {
    name: string
    category: IngredientCategory
    density: string
    energy_kcal: string
    protein_g: string
    fat_g: string
    carbs_g: string
    fiber_g: string
    gluten: boolean
    dairy: boolean
    nuts: boolean
    eggs: boolean
}

interface FormErrors {
    name?: string
    category?: string
    density?: string
    energy_kcal?: string
    protein_g?: string
    fat_g?: string
    carbs_g?: string
}

const DEFAULT: FormState = {
    name: '',
    category: 'other',
    density: '',
    energy_kcal: '',
    protein_g: '',
    fat_g: '',
    carbs_g: '',
    fiber_g: '',
    gluten: false,
    dairy: false,
    nuts: false,
    eggs: false,
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validate(form: FormState): FormErrors {
    const errors: FormErrors = {}
    if (!form.name.trim()) errors.name = 'Name is required'
    if (!form.category) errors.category = 'Category is required'
    if (form.density && isNaN(parseFloat(form.density))) {
        errors.density = 'Must be a valid number'
    }
    if (form.density && parseFloat(form.density) <= 0) {
        errors.density = 'Density must be greater than 0'
    }
    // Validate nutrition fields if any are filled
    const hasNutrition = form.energy_kcal || form.protein_g || form.fat_g || form.carbs_g
    if (hasNutrition) {
        if (!form.energy_kcal || isNaN(parseFloat(form.energy_kcal)) || parseFloat(form.energy_kcal) < 0) {
            errors.energy_kcal = 'Required when entering nutrition'
        }
        if (!form.protein_g || isNaN(parseFloat(form.protein_g)) || parseFloat(form.protein_g) < 0) {
            errors.protein_g = 'Required when entering nutrition'
        }
        if (!form.fat_g || isNaN(parseFloat(form.fat_g)) || parseFloat(form.fat_g) < 0) {
            errors.fat_g = 'Required when entering nutrition'
        }
        if (!form.carbs_g || isNaN(parseFloat(form.carbs_g)) || parseFloat(form.carbs_g) < 0) {
            errors.carbs_g = 'Required when entering nutrition'
        }
    }
    return errors
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * Form for creating a custom ingredient.
 * Inline — embed inside a modal or panel.
 * Requirements: 24.3
 */
export const CustomIngredientForm: React.FC<CustomIngredientFormProps> = ({ onSuccess, onCancel }) => {
    const [form, setForm] = useState<FormState>(DEFAULT)
    const [errors, setErrors] = useState<FormErrors>({})
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [isPending, setIsPending] = useState(false)

    const update = <K extends keyof FormState>(field: K, value: FormState[K]) => {
        setForm((prev) => ({ ...prev, [field]: value }))
        setErrors((prev) => ({ ...prev, [field]: undefined }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitError(null)

        const errs = validate(form)
        if (Object.keys(errs).length > 0) {
            setErrors(errs)
            return
        }

        const hasNutrition = form.energy_kcal || form.protein_g || form.fat_g || form.carbs_g
        const hasAllergens = form.gluten || form.dairy || form.nuts || form.eggs

        const payload: CreateIngredientInput = {
            name: form.name.trim(),
            category: form.category,
            default_density_g_per_ml: form.density ? parseFloat(form.density) : null,
            nutrition_per_100g: hasNutrition
                ? {
                    energy_kcal: parseFloat(form.energy_kcal),
                    protein_g: parseFloat(form.protein_g),
                    fat_g: parseFloat(form.fat_g),
                    carbs_g: parseFloat(form.carbs_g),
                    fiber_g: form.fiber_g ? parseFloat(form.fiber_g) : undefined,
                }
                : null,
            allergen_flags: hasAllergens
                ? { gluten: form.gluten, dairy: form.dairy, nuts: form.nuts, eggs: form.eggs }
                : null,
        }

        setIsPending(true)
        try {
            const created = await ingredientService.create(payload)
            onSuccess(created.id, created.name)
        } catch (err) {
            setSubmitError(err instanceof Error ? err.message : 'Failed to create ingredient')
        } finally {
            setIsPending(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} noValidate className="space-y-5">

            {/* Name */}
            <div>
                <label htmlFor="ci-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Ingredient Name <span className="text-red-500">*</span>
                </label>
                <Input
                    id="ci-name"
                    aria-label="Ingredient name"
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    placeholder="e.g. Atta (Whole Wheat Flour)"
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? 'ci-name-error' : undefined}
                />
                {errors.name && (
                    <p id="ci-name-error" className="mt-1 text-xs text-red-600" role="alert">{errors.name}</p>
                )}
            </div>

            {/* Category */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category <span className="text-red-500">*</span>
                </label>
                <Select
                    options={CATEGORY_OPTIONS}
                    value={form.category}
                    onChange={(val) => update('category', val as IngredientCategory)}
                    aria-label="Category"
                />
                {errors.category && (
                    <p className="mt-1 text-xs text-red-600" role="alert">{errors.category}</p>
                )}
            </div>

            {/* Density */}
            <div>
                <label htmlFor="ci-density" className="block text-sm font-medium text-gray-700 mb-1">
                    Density (g/ml)
                </label>
                <Input
                    id="ci-density"
                    aria-label="Density in grams per millilitre"
                    type="number"
                    value={form.density}
                    onChange={(e) => update('density', e.target.value)}
                    placeholder="e.g. 0.8"
                    min="0"
                    step="any"
                    aria-invalid={!!errors.density}
                />
                {errors.density && (
                    <p className="mt-1 text-xs text-red-600" role="alert">{errors.density}</p>
                )}
                <p className="mt-1 text-xs text-gray-400">Used for cup/spoon to gram conversion</p>
            </div>

            {/* Allergens */}
            <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Allergens</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(['gluten', 'dairy', 'nuts', 'eggs'] as const).map((allergen) => (
                        <label key={allergen} className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={form[allergen]}
                                onChange={(e) => update(allergen, e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                aria-label={`Contains ${allergen}`}
                            />
                            <span className="text-sm text-gray-700 capitalize">{allergen}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Nutrition */}
            <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">
                    Nutrition per 100g <span className="text-gray-400 font-normal">(optional — all or none)</span>
                </p>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label htmlFor="ci-energy" className="block text-xs text-gray-500 mb-1">Energy (kcal)</label>
                        <Input
                            id="ci-energy"
                            aria-label="Energy in kilocalories per 100g"
                            type="number"
                            value={form.energy_kcal}
                            onChange={(e) => update('energy_kcal', e.target.value)}
                            placeholder="e.g. 350"
                            min="0"
                            step="any"
                            aria-invalid={!!errors.energy_kcal}
                        />
                        {errors.energy_kcal && (
                            <p className="mt-0.5 text-xs text-red-600">{errors.energy_kcal}</p>
                        )}
                    </div>
                    <div>
                        <label htmlFor="ci-protein" className="block text-xs text-gray-500 mb-1">Protein (g)</label>
                        <Input
                            id="ci-protein"
                            aria-label="Protein in grams per 100g"
                            type="number"
                            value={form.protein_g}
                            onChange={(e) => update('protein_g', e.target.value)}
                            placeholder="e.g. 12"
                            min="0"
                            step="any"
                            aria-invalid={!!errors.protein_g}
                        />
                        {errors.protein_g && (
                            <p className="mt-0.5 text-xs text-red-600">{errors.protein_g}</p>
                        )}
                    </div>
                    <div>
                        <label htmlFor="ci-fat" className="block text-xs text-gray-500 mb-1">Fat (g)</label>
                        <Input
                            id="ci-fat"
                            aria-label="Fat in grams per 100g"
                            type="number"
                            value={form.fat_g}
                            onChange={(e) => update('fat_g', e.target.value)}
                            placeholder="e.g. 2"
                            min="0"
                            step="any"
                            aria-invalid={!!errors.fat_g}
                        />
                        {errors.fat_g && (
                            <p className="mt-0.5 text-xs text-red-600">{errors.fat_g}</p>
                        )}
                    </div>
                    <div>
                        <label htmlFor="ci-carbs" className="block text-xs text-gray-500 mb-1">Carbohydrates (g)</label>
                        <Input
                            id="ci-carbs"
                            aria-label="Carbohydrates in grams per 100g"
                            type="number"
                            value={form.carbs_g}
                            onChange={(e) => update('carbs_g', e.target.value)}
                            placeholder="e.g. 72"
                            min="0"
                            step="any"
                            aria-invalid={!!errors.carbs_g}
                        />
                        {errors.carbs_g && (
                            <p className="mt-0.5 text-xs text-red-600">{errors.carbs_g}</p>
                        )}
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                        <label htmlFor="ci-fiber" className="block text-xs text-gray-500 mb-1">Dietary Fibre (g) <span className="text-gray-300">opt.</span></label>
                        <Input
                            id="ci-fiber"
                            aria-label="Dietary fibre in grams per 100g"
                            type="number"
                            value={form.fiber_g}
                            onChange={(e) => update('fiber_g', e.target.value)}
                            placeholder="e.g. 3"
                            min="0"
                            step="any"
                        />
                    </div>
                </div>
            </div>

            {/* Submit error */}
            {submitError && (
                <div role="alert" className="rounded-lg bg-red-50 border border-red-100 p-3 text-sm text-red-700">
                    {submitError}
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-1">
                {onCancel && (
                    <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
                        Cancel
                    </Button>
                )}
                <Button type="submit" disabled={isPending}>
                    {isPending ? (
                        <span className="flex items-center gap-2">
                            <LoadingSpinner size="sm" /> Creating…
                        </span>
                    ) : (
                        'Add Ingredient'
                    )}
                </Button>
            </div>
        </form>
    )
}
