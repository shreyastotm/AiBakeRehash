import React, { useEffect, useState } from 'react'
import { ingredientService } from '../../services/ingredient.service'
import type { IngredientWithDetail } from '../../services/ingredient.service'
import { Modal } from '../common/Modal'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { Badge } from '../common/Badge'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface IngredientDetailModalProps {
    ingredientId: string | null
    onClose: () => void
}

// ─── Category label map ───────────────────────────────────────────────────────

const CATEGORY_LABEL: Record<string, string> = {
    flour: 'Flour',
    fat: 'Fat',
    sugar: 'Sugar',
    leavening: 'Leavening',
    dairy: 'Dairy',
    liquid: 'Liquid',
    fruit: 'Fruit',
    nut: 'Nut',
    spice: 'Spice',
    other: 'Other',
}

// ─── Nutrition row ────────────────────────────────────────────────────────────

const NutritionRow = ({ label, value, unit }: { label: string; value?: number; unit: string }) => (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-sm font-medium text-gray-900">
            {value !== undefined ? `${value} ${unit}` : '—'}
        </span>
    </div>
)

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * Modal showing full ingredient details: nutrition, density, allergens, aliases, substitutions.
 * Requirements: 30.8, 35.7
 */
export const IngredientDetailModal: React.FC<IngredientDetailModalProps> = ({
    ingredientId,
    onClose,
}) => {
    const [ingredient, setIngredient] = useState<IngredientWithDetail | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!ingredientId) {
            setIngredient(null)
            return
        }
        let cancelled = false
        setLoading(true)
        setError(null)
        ingredientService.getById(ingredientId).then((data) => {
            if (!cancelled) {
                setIngredient(data)
                setLoading(false)
            }
        }).catch((err) => {
            if (!cancelled) {
                setError(err instanceof Error ? err.message : 'Failed to load ingredient details')
                setLoading(false)
            }
        })
        return () => { cancelled = true }
    }, [ingredientId])

    const isOpen = !!ingredientId

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={ingredient?.name ?? 'Ingredient Details'}
        >
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <LoadingSpinner size="lg" />
                </div>
            ) : error ? (
                <div role="alert" className="rounded-lg bg-red-50 border border-red-100 p-4 text-sm text-red-700">
                    {error}
                </div>
            ) : ingredient ? (
                <div className="space-y-5">

                    {/* Header row */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <Badge variant="secondary">{CATEGORY_LABEL[ingredient.category] ?? ingredient.category}</Badge>
                        {ingredient.is_composite && <Badge variant="warning">Composite</Badge>}
                    </div>

                    {/* Density */}
                    {ingredient.default_density_g_per_ml && (
                        <div className="flex items-center justify-between text-sm bg-amber-50 rounded-lg px-4 py-3">
                            <span className="text-gray-600 font-medium">Density</span>
                            <span className="font-semibold text-amber-800">
                                {ingredient.default_density_g_per_ml} g/ml
                            </span>
                        </div>
                    )}

                    {/* Allergens */}
                    {ingredient.allergen_flags && Object.values(ingredient.allergen_flags).some(Boolean) && (
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                Allergens
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {ingredient.allergen_flags.gluten && (
                                    <span className="rounded-full bg-red-100 text-red-700 text-xs font-medium px-3 py-1">
                                        🌾 Gluten
                                    </span>
                                )}
                                {ingredient.allergen_flags.dairy && (
                                    <span className="rounded-full bg-blue-100 text-blue-700 text-xs font-medium px-3 py-1">
                                        🥛 Dairy
                                    </span>
                                )}
                                {ingredient.allergen_flags.nuts && (
                                    <span className="rounded-full bg-amber-100 text-amber-700 text-xs font-medium px-3 py-1">
                                        🥜 Nuts
                                    </span>
                                )}
                                {ingredient.allergen_flags.eggs && (
                                    <span className="rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium px-3 py-1">
                                        🥚 Eggs
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Nutrition facts */}
                    {ingredient.nutrition_per_100g && (
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                Nutrition (per 100g)
                            </h3>
                            <div className="rounded-lg border border-gray-100 px-4 py-1">
                                <NutritionRow label="Energy" value={ingredient.nutrition_per_100g.energy_kcal} unit="kcal" />
                                <NutritionRow label="Protein" value={ingredient.nutrition_per_100g.protein_g} unit="g" />
                                <NutritionRow label="Fat" value={ingredient.nutrition_per_100g.fat_g} unit="g" />
                                <NutritionRow label="Carbohydrates" value={ingredient.nutrition_per_100g.carbs_g} unit="g" />
                                {ingredient.nutrition_per_100g.fiber_g !== undefined && (
                                    <NutritionRow label="Dietary Fibre" value={ingredient.nutrition_per_100g.fiber_g} unit="g" />
                                )}
                            </div>
                        </div>
                    )}

                    {/* Aliases */}
                    {ingredient.aliases && ingredient.aliases.length > 0 && (
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                Also known as
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {ingredient.aliases.map((alias) => (
                                    <span
                                        key={alias.id}
                                        className="text-xs rounded-full bg-gray-100 text-gray-600 px-3 py-1"
                                        title={alias.alias_type}
                                    >
                                        {alias.alias_name}
                                        {alias.locale && alias.locale !== 'en' && (
                                            <span className="text-gray-400 ml-1">({alias.locale})</span>
                                        )}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Substitutions */}
                    {ingredient.substitutions && ingredient.substitutions.length > 0 && (
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                Substitutions
                            </h3>
                            <div className="space-y-2">
                                {ingredient.substitutions.map((sub) => (
                                    <div
                                        key={sub.substitution_ingredient_id}
                                        className="flex items-start gap-3 rounded-lg border border-gray-100 p-3"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900">{sub.name}</p>
                                            {sub.notes && (
                                                <p className="text-xs text-gray-500 mt-0.5">{sub.notes}</p>
                                            )}
                                        </div>
                                        <span className="shrink-0 text-xs font-semibold text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">
                                            {sub.ratio}×
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : null}
        </Modal>
    )
}
