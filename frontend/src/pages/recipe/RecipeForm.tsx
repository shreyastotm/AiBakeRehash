import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useCreateRecipe, useUpdateRecipe, useRecipe } from '../../hooks/useRecipes'
import { recipeService } from '../../services/recipe.service'
import type { RecipeCreateRequest, IngredientSearchResult, RecipeIngredient, RecipeSection } from '../../services/recipe.service'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { Textarea } from '../../components/common/Textarea'
import { Select } from '../../components/common/Select'
import { Autocomplete } from '../../components/common/Autocomplete'
import type { AutocompleteOption } from '../../components/common/Autocomplete'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { FormRecoveryBanner } from '../../components/FormRecoveryBanner'
import { useAutoSave, useRestoreFormData } from '../../hooks/useAutoSave'

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionType = 'pre_prep' | 'prep' | 'bake' | 'rest' | 'notes'

interface FormIngredient {
    _key: string
    ingredient_master_id: string
    display_name: string
    quantity_original: number
    unit_original: string
}

interface FormStep {
    _key: string
    instruction: string
    duration_seconds: number | ''
    temperature_celsius: number | ''
}

interface FormSection {
    _key: string
    type: SectionType
    title: string
    steps: FormStep[]
}

interface FormData {
    title: string
    description: string
    servings: number | ''
    yield_weight_grams: number | ''
    status: 'draft' | 'active' | 'archived'
    preferred_unit_system: string
    ingredients: FormIngredient[]
    sections: FormSection[]
}

interface FieldErrors {
    title?: string
    servings?: string
    yield_weight_grams?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = ['Details', 'Ingredients', 'Instructions'] as const

const UNIT_OPTIONS = [
    { value: 'g', label: 'grams (g)' },
    { value: 'kg', label: 'kilograms (kg)' },
    { value: 'ml', label: 'millilitres (ml)' },
    { value: 'l', label: 'litres (l)' },
    { value: 'cup', label: 'cup' },
    { value: 'tbsp', label: 'tablespoon (tbsp)' },
    { value: 'tsp', label: 'teaspoon (tsp)' },
    { value: 'oz', label: 'ounces (oz)' },
    { value: 'lb', label: 'pounds (lb)' },
    { value: 'piece', label: 'piece' },
    { value: 'pinch', label: 'pinch' },
]

const SECTION_TYPE_OPTIONS = [
    { value: 'pre_prep', label: 'Pre-Prep' },
    { value: 'prep', label: 'Prep' },
    { value: 'bake', label: 'Bake' },
    { value: 'rest', label: 'Rest' },
    { value: 'notes', label: 'Notes' },
]

const STATUS_OPTIONS = [
    { value: 'draft', label: 'Draft' },
    { value: 'active', label: 'Active' },
    { value: 'archived', label: 'Archived' },
]

const UNIT_SYSTEM_OPTIONS = [
    { value: 'metric', label: 'Metric (g, ml)' },
    { value: 'cups', label: 'Cups & spoons' },
    { value: 'hybrid', label: 'Hybrid' },
    { value: 'bakers_percent', label: "Baker's %" },
]

const DEFAULT_FORM: FormData = {
    title: '',
    description: '',
    servings: '',
    yield_weight_grams: '',
    status: 'draft',
    preferred_unit_system: 'metric',
    ingredients: [],
    sections: [],
}

const AUTOSAVE_KEY = 'aibake_recipe_form_draft'

/** Generate a short unique key for local tracking of draggable rows */
const uid = (): string => Math.random().toString(36).slice(2)

// ─── Step indicator ──────────────────────────────────────────────────────────

interface StepIndicatorProps {
    steps: readonly string[]
    current: number
    onStepClick: (i: number) => void
}

const StepIndicator = ({ steps, current, onStepClick }: StepIndicatorProps) => (
    <nav aria-label="Form steps" className="flex items-center gap-0 mb-8">
        {steps.map((label, i) => {
            const done = i < current
            const active = i === current
            return (
                <React.Fragment key={label}>
                    <button
                        type="button"
                        onClick={() => onStepClick(i)}
                        disabled={i > current}
                        aria-current={active ? 'step' : undefined}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:cursor-not-allowed ${active
                            ? 'bg-amber-600 text-white'
                            : done
                                ? 'text-amber-700 hover:bg-amber-50'
                                : 'text-gray-400'
                            }`}
                    >
                        <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${active ? 'bg-white text-amber-600' : done ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400'
                                }`}
                        >
                            {done ? '✓' : i + 1}
                        </span>
                        {label}
                    </button>
                    {i < steps.length - 1 && (
                        <span className="flex-1 h-px bg-gray-200 mx-1" aria-hidden="true" />
                    )}
                </React.Fragment>
            )
        })}
    </nav>
)

// ─── Auto-save indicator ──────────────────────────────────────────────────────

const AutoSaveIndicator = ({ lastSaved }: { lastSaved: Date | null }) => {
    if (!lastSaved) return null
    return (
        <span className="text-xs text-gray-400" aria-live="polite">
            Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
    )
}

// ─── Ingredient row ───────────────────────────────────────────────────────────

interface IngredientRowProps {
    ingredient: FormIngredient
    index: number
    isDragging: boolean
    onDragStart: (i: number) => void
    onDragOver: (i: number) => void
    onDrop: () => void
    onChange: (index: number, field: keyof FormIngredient, value: string | number) => void
    onRemove: (index: number) => void
    searchOptions: AutocompleteOption[]
    searchLoading: boolean
    onIngredientSearch: (query: string) => void
    onIngredientSelect: (index: number, value: string, option: AutocompleteOption) => void
}

const IngredientRow = ({
    ingredient,
    index,
    isDragging,
    onDragStart,
    onDragOver,
    onDrop,
    onChange,
    onRemove,
    searchOptions,
    searchLoading,
    onIngredientSearch,
    onIngredientSelect,
}: IngredientRowProps) => (
    <div
        draggable
        onDragStart={() => onDragStart(index)}
        onDragOver={(e) => { e.preventDefault(); onDragOver(index) }}
        onDrop={onDrop}
        className={`flex gap-2 items-start p-3 rounded-lg border transition-colors ${isDragging ? 'border-amber-400 bg-amber-50' : 'border-gray-100 bg-gray-50'
            }`}
        aria-label={`Ingredient ${index + 1}`}
    >
        {/* Drag handle */}
        <button
            type="button"
            aria-label="Drag to reorder"
            className="mt-3 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 shrink-0"
        >
            ⠿
        </button>

        {/* Ingredient autocomplete search */}
        <div className="flex-1 min-w-0">
            <Autocomplete
                options={searchOptions}
                value={ingredient.ingredient_master_id}
                displayLabel={ingredient.display_name}
                onInputChange={onIngredientSearch}
                onChange={(val, opt) => onIngredientSelect(index, val, opt)}
                placeholder="Search ingredient..."
                loading={searchLoading}
                noOptionsText="No ingredients found"
                allowCustomValue
            />
        </div>

        {/* Quantity */}
        <div className="w-24 shrink-0">
            <Input
                type="number"
                value={ingredient.quantity_original}
                onChange={(e) => onChange(index, 'quantity_original', parseFloat(e.target.value) || 0)}
                placeholder="Qty"
                min="0"
                step="any"
                aria-label="Quantity"
            />
        </div>

        {/* Unit */}
        <div className="w-32 shrink-0">
            <Select
                options={UNIT_OPTIONS}
                value={ingredient.unit_original}
                onChange={(val) => onChange(index, 'unit_original', val)}
                placeholder="Unit"
            />
        </div>

        {/* Remove */}
        <button
            type="button"
            onClick={() => onRemove(index)}
            aria-label={`Remove ingredient ${index + 1}`}
            className="mt-2 text-gray-300 hover:text-red-500 transition-colors shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
            ✕
        </button>
    </div>
)

// ─── Step row ─────────────────────────────────────────────────────────────────

interface StepRowProps {
    step: FormStep
    stepIndex: number
    sectionIndex: number
    onChange: (si: number, ti: number, field: keyof FormStep, value: string | number) => void
    onRemove: (si: number, ti: number) => void
}

const StepRow = ({ step, stepIndex, sectionIndex, onChange, onRemove }: StepRowProps) => (
    <div className="flex gap-2 items-start p-3 rounded-lg border border-gray-100 bg-gray-50">
        <span className="mt-3 w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center shrink-0">
            {stepIndex + 1}
        </span>

        <div className="flex-1 space-y-2">
            <Textarea
                value={step.instruction}
                onChange={(e) => onChange(sectionIndex, stepIndex, 'instruction', e.target.value)}
                placeholder="Describe this step..."
                rows={2}
                aria-label={`Step ${stepIndex + 1} instruction`}
            />
            <div className="flex gap-2">
                <Input
                    type="number"
                    value={step.duration_seconds}
                    onChange={(e) =>
                        onChange(sectionIndex, stepIndex, 'duration_seconds', e.target.value === '' ? '' : parseInt(e.target.value))
                    }
                    placeholder="Duration (sec)"
                    min="0"
                    aria-label="Duration in seconds"
                    className="w-40"
                />
                <Input
                    type="number"
                    value={step.temperature_celsius}
                    onChange={(e) =>
                        onChange(sectionIndex, stepIndex, 'temperature_celsius', e.target.value === '' ? '' : parseInt(e.target.value))
                    }
                    placeholder="Temp (°C)"
                    min="0"
                    max="500"
                    aria-label="Temperature in Celsius"
                    className="w-36"
                />
            </div>
        </div>

        <button
            type="button"
            onClick={() => onRemove(sectionIndex, stepIndex)}
            aria-label={`Remove step ${stepIndex + 1}`}
            className="mt-2 text-gray-300 hover:text-red-500 transition-colors shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
            ✕
        </button>
    </div>
)

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validates the Details step fields.
 * @returns FieldErrors object — empty means valid.
 */
function validateDetails(form: FormData): FieldErrors {
    const errors: FieldErrors = {}
    if (!form.title.trim()) {
        errors.title = 'Title is required'
    }
    if (!form.servings || Number(form.servings) <= 0) {
        errors.servings = 'Servings must be greater than 0'
    }
    if (!form.yield_weight_grams || Number(form.yield_weight_grams) <= 0) {
        errors.yield_weight_grams = 'Yield must be greater than 0'
    }
    return errors
}

// ─── Main RecipeForm ──────────────────────────────────────────────────────────

/**
 * Multi-step recipe creation/editing form.
 * Req 29.3, 29.4, 30.1–30.6, 94.1
 */
export const RecipeForm = () => {
    const { id } = useParams<{ id: string }>()
    const isEditing = !!id
    const navigate = useNavigate()

    // ── Remote data (edit mode) ──────────────────────────────────────────────
    const { data: existingRecipe, isLoading: loadingExisting } = useRecipe(id ?? '')

    // ── Mutations ────────────────────────────────────────────────────────────
    const createRecipeMutation = useCreateRecipe()
    const updateRecipeMutation = useUpdateRecipe()
    const isPending = createRecipeMutation.isPending || updateRecipeMutation.isPending

    // ── Auto-save restore (new recipe only) ──────────────────────────────────
    const { data: restoredData, hasRestoredData, timestamp: restoreTimestamp, clearRestored } =
        useRestoreFormData<FormData>(AUTOSAVE_KEY, DEFAULT_FORM)

    // ── Local form state ─────────────────────────────────────────────────────
    const [form, setForm] = useState<FormData>(DEFAULT_FORM)
    const [step, setStep] = useState(0)
    const [errors, setErrors] = useState<FieldErrors>({})
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [showRecoveryBanner, setShowRecoveryBanner] = useState(false)
    const [lastSaved, setLastSaved] = useState<Date | null>(null)
    const [dragIndex, setDragIndex] = useState<number | null>(null)

    // ── Ingredient search state ──────────────────────────────────────────────
    const [ingredientOptions, setIngredientOptions] = useState<AutocompleteOption[]>([])
    const [ingredientSearchLoading, setIngredientSearchLoading] = useState(false)
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // ── Seed form from restore or existing recipe ────────────────────────────
    useEffect(() => {
        if (isEditing && existingRecipe) {
            // Map API shape → local form shape
            setForm({
                title: existingRecipe.title ?? '',
                description: existingRecipe.description ?? '',
                servings: existingRecipe.servings ?? '',
                yield_weight_grams: existingRecipe.yield_weight_grams ?? '',
                status: (existingRecipe.status as FormData['status']) ?? 'draft',
                preferred_unit_system: existingRecipe.preferred_unit_system ?? 'metric',
                ingredients: (existingRecipe.ingredients ?? []).map((ing: RecipeIngredient) => ({
                    _key: uid(),
                    ingredient_master_id: ing.ingredient_master_id ?? '',
                    display_name: ing.display_name ?? '',
                    quantity_original: ing.quantity_original ?? 0,
                    unit_original: ing.unit_original ?? 'g',
                })),
                sections: (existingRecipe.sections ?? []).map((sec: RecipeSection) => ({
                    _key: uid(),
                    type: sec.type ?? 'prep',
                    title: sec.title ?? '',
                    steps: (sec.steps ?? []).map((s) => ({
                        _key: uid(),
                        instruction: s.instruction ?? '',
                        duration_seconds: (s.duration_seconds ?? '') as number | '',
                        temperature_celsius: (s.temperature_celsius ?? '') as number | '',
                    })),
                })),
            })
        } else if (!isEditing && hasRestoredData) {
            setForm(restoredData)
            setShowRecoveryBanner(true)
        }
    }, [isEditing, existingRecipe, hasRestoredData, restoredData])

    // ── Auto-save (new recipe only, every 30s) ───────────────────────────────
    useAutoSave(form, {
        key: AUTOSAVE_KEY,
        interval: 30_000,
        enabled: !isEditing,
    })

    // Track last-saved time for indicator
    useEffect(() => {
        if (!isEditing) {
            const handler = () => setLastSaved(new Date())
            window.addEventListener('autoSaveComplete', handler)
            return () => window.removeEventListener('autoSaveComplete', handler)
        }
    }, [isEditing])

    // ── Helpers — form field update ──────────────────────────────────────────

    const updateField = useCallback(<K extends keyof FormData>(field: K, value: FormData[K]) => {
        setForm((prev) => ({ ...prev, [field]: value }))
        // Clear field error on edit
        setErrors((prev) => ({ ...prev, [field]: undefined }))
    }, [])

    // ── Helpers — ingredients ────────────────────────────────────────────────

    const addIngredient = useCallback(() => {
        setForm((prev) => ({
            ...prev,
            ingredients: [
                ...prev.ingredients,
                { _key: uid(), ingredient_master_id: '', display_name: '', quantity_original: 0, unit_original: 'g' },
            ],
        }))
    }, [])

    const removeIngredient = useCallback((index: number) => {
        setForm((prev) => ({
            ...prev,
            ingredients: prev.ingredients.filter((_, i) => i !== index),
        }))
    }, [])

    const updateIngredient = useCallback(
        (index: number, field: keyof FormIngredient, value: string | number) => {
            setForm((prev) => {
                const updated = [...prev.ingredients]
                updated[index] = { ...updated[index], [field]: value }
                return { ...prev, ingredients: updated }
            })
        },
        []
    )

    const handleIngredientSelect = useCallback(
        (index: number, value: string, option: AutocompleteOption) => {
            setForm((prev) => {
                const updated = [...prev.ingredients]
                // When allowCustomValue fires, value === option.label (the typed text)
                // For list selections, value is the UUID ingredient_master_id
                const isCustom = value === option.label
                updated[index] = {
                    ...updated[index],
                    ingredient_master_id: isCustom ? '' : value,
                    display_name: option.label,
                }
                return { ...prev, ingredients: updated }
            })
        },
        []
    )

    // Debounced ingredient search
    const handleIngredientSearch = useCallback((query: string) => {
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
        if (!query.trim()) {
            setIngredientOptions([])
            return
        }
        searchDebounceRef.current = setTimeout(async () => {
            setIngredientSearchLoading(true)
            try {
                const results: IngredientSearchResult[] = await recipeService.searchIngredients(query)
                setIngredientOptions(
                    results.map((r) => ({
                        value: r.ingredient_id,
                        label: r.ingredient_name,
                        sublabel: r.category,
                    }))
                )
            } catch {
                setIngredientOptions([])
            } finally {
                setIngredientSearchLoading(false)
            }
        }, 300)
    }, [])

    // ── Helpers — drag-and-drop reorder (ingredients) ────────────────────────

    const handleDragOver = useCallback((targetIndex: number) => {
        setDragIndex(targetIndex)
    }, [])

    const handleDrop = useCallback(() => {
        setDragIndex(null)
    }, [])

    const handleDragStart = useCallback((index: number) => {
        setDragIndex(index)
    }, [])

    // ── Helpers — sections & steps ───────────────────────────────────────────

    const addSection = useCallback(() => {
        setForm((prev) => ({
            ...prev,
            sections: [
                ...prev.sections,
                { _key: uid(), type: 'prep', title: '', steps: [] },
            ],
        }))
    }, [])

    const removeSection = useCallback((sectionIndex: number) => {
        setForm((prev) => ({
            ...prev,
            sections: prev.sections.filter((_, i) => i !== sectionIndex),
        }))
    }, [])

    const updateSection = useCallback(
        (sectionIndex: number, field: keyof FormSection, value: string) => {
            setForm((prev) => {
                const updated = [...prev.sections]
                updated[sectionIndex] = { ...updated[sectionIndex], [field]: value }
                return { ...prev, sections: updated }
            })
        },
        []
    )

    const addStep = useCallback((sectionIndex: number) => {
        setForm((prev) => {
            const updatedSections = [...prev.sections]
            updatedSections[sectionIndex] = {
                ...updatedSections[sectionIndex],
                steps: [
                    ...updatedSections[sectionIndex].steps,
                    { _key: uid(), instruction: '', duration_seconds: '', temperature_celsius: '' },
                ],
            }
            return { ...prev, sections: updatedSections }
        })
    }, [])

    const removeStep = useCallback((sectionIndex: number, stepIndex: number) => {
        setForm((prev) => {
            const updatedSections = [...prev.sections]
            updatedSections[sectionIndex] = {
                ...updatedSections[sectionIndex],
                steps: updatedSections[sectionIndex].steps.filter((_, i) => i !== stepIndex),
            }
            return { ...prev, sections: updatedSections }
        })
    }, [])

    const updateStep = useCallback(
        (sectionIndex: number, stepIndex: number, field: keyof FormStep, value: string | number) => {
            setForm((prev) => {
                const updatedSections = [...prev.sections]
                const updatedSteps = [...updatedSections[sectionIndex].steps]
                updatedSteps[stepIndex] = { ...updatedSteps[stepIndex], [field]: value }
                updatedSections[sectionIndex] = { ...updatedSections[sectionIndex], steps: updatedSteps }
                return { ...prev, sections: updatedSections }
            })
        },
        []
    )

    // ── Navigation between wizard steps ──────────────────────────────────────

    const goToStep = useCallback(
        (targetStep: number) => {
            if (targetStep < step) {
                setStep(targetStep)
                return
            }
            // Validate current step before advancing
            if (step === 0) {
                const errs = validateDetails(form)
                if (Object.keys(errs).length > 0) {
                    setErrors(errs)
                    return
                }
            }
            setErrors({})
            setStep(targetStep)
        },
        [step, form]
    )

    const goNext = useCallback(() => goToStep(step + 1), [goToStep, step])

    // ── Form submission ───────────────────────────────────────────────────────

    const handleSubmit = useCallback(async () => {
        setSubmitError(null)

        // Build API payload — quantities passed as-is (canonical conversion happens in backend)
        const payload: RecipeCreateRequest = {
            title: form.title.trim(),
            description: form.description.trim(),
            servings: Number(form.servings),
            yield_weight_grams: Number(form.yield_weight_grams),
            status: form.status,
            preferred_unit_system: form.preferred_unit_system,
            source_type: 'manual',
            ingredients: form.ingredients
                .filter((ing) => ing.ingredient_master_id)
                .map((ing, i) => ({
                    ingredient_master_id: ing.ingredient_master_id,
                    display_name: ing.display_name,
                    quantity_original: ing.quantity_original,
                    unit_original: ing.unit_original,
                    position: i,
                })),
            sections: form.sections.map((sec, si) => ({
                type: sec.type,
                title: sec.title || undefined,
                position: si,
                steps: sec.steps.map((s, ti) => ({
                    instruction: s.instruction,
                    duration_seconds: s.duration_seconds === '' ? undefined : Number(s.duration_seconds),
                    temperature_celsius: s.temperature_celsius === '' ? undefined : Number(s.temperature_celsius),
                    position: ti,
                })),
            })),
        }

        try {
            if (isEditing && id) {
                await updateRecipeMutation.mutateAsync({ id, data: payload })
                navigate(`/recipes/${id}`)
            } else {
                const result = await createRecipeMutation.mutateAsync(payload)
                // Clear auto-save draft after successful creation
                clearRestored()
                localStorage.removeItem(AUTOSAVE_KEY)
                localStorage.removeItem(`${AUTOSAVE_KEY}__timestamp`)
                navigate(`/recipes/${result.id}`)
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to save recipe. Please try again.'
            setSubmitError(message)
        }
    }, [form, isEditing, id, createRecipeMutation, updateRecipeMutation, navigate, clearRestored])

    // ── Loading state (edit mode) ─────────────────────────────────────────────

    if (isEditing && loadingExisting) {
        return (
            <div className="flex items-center justify-center py-24">
                <LoadingSpinner size="lg" />
            </div>
        )
    }

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="container mx-auto px-4 py-6 max-w-3xl">
            {/* Page header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isEditing ? 'Edit Recipe' : 'New Recipe'}
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {isEditing ? 'Update your recipe details below' : 'Fill in the details to create your recipe'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <AutoSaveIndicator lastSaved={lastSaved} />
                    <Link to={isEditing && id ? `/recipes/${id}` : '/recipes'}>
                        <Button variant="ghost" size="sm">Cancel</Button>
                    </Link>
                </div>
            </div>

            {/* Recovery banner */}
            {showRecoveryBanner && !isEditing && (
                <FormRecoveryBanner
                    timestamp={restoreTimestamp}
                    onRestore={() => setShowRecoveryBanner(false)}
                    onDiscard={() => {
                        clearRestored()
                        setForm(DEFAULT_FORM)
                        setShowRecoveryBanner(false)
                    }}
                />
            )}

            {/* Step indicator */}
            <StepIndicator steps={STEPS} current={step} onStepClick={goToStep} />

            {/* Step content */}
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">

                {/* ── Step 0: Details ─────────────────────────────────────────── */}
                {step === 0 && (
                    <div className="space-y-5">
                        <div>
                            <label htmlFor="recipe-title" className="block text-sm font-medium text-gray-700 mb-1">
                                Recipe Title <span className="text-red-500">*</span>
                            </label>
                            <Input
                                id="recipe-title"
                                aria-label="Title"
                                value={form.title}
                                onChange={(e) => updateField('title', e.target.value)}
                                placeholder="e.g. Sourdough Bread, Chocolate Cake"
                                aria-invalid={!!errors.title}
                                aria-describedby={errors.title ? 'title-error' : undefined}
                            />
                            {errors.title && (
                                <p id="title-error" className="mt-1 text-sm text-red-600" role="alert">
                                    {errors.title}
                                </p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="recipe-description" className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <Textarea
                                id="recipe-description"
                                aria-label="Description"
                                value={form.description}
                                onChange={(e) => updateField('description', e.target.value)}
                                placeholder="Briefly describe your recipe..."
                                rows={3}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="recipe-servings" className="block text-sm font-medium text-gray-700 mb-1">
                                    Servings <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    id="recipe-servings"
                                    aria-label="Servings"
                                    type="number"
                                    value={form.servings}
                                    onChange={(e) => updateField('servings', e.target.value === '' ? '' : parseInt(e.target.value))}
                                    placeholder="e.g. 8"
                                    min="1"
                                    aria-invalid={!!errors.servings}
                                    aria-describedby={errors.servings ? 'servings-error' : undefined}
                                />
                                {errors.servings && (
                                    <p id="servings-error" className="mt-1 text-sm text-red-600" role="alert">
                                        {errors.servings}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="recipe-yield" className="block text-sm font-medium text-gray-700 mb-1">
                                    Yield Weight (g) <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    id="recipe-yield"
                                    aria-label="Yield weight in grams"
                                    type="number"
                                    value={form.yield_weight_grams}
                                    onChange={(e) =>
                                        updateField('yield_weight_grams', e.target.value === '' ? '' : parseFloat(e.target.value))
                                    }
                                    placeholder="e.g. 800"
                                    min="1"
                                    aria-invalid={!!errors.yield_weight_grams}
                                    aria-describedby={errors.yield_weight_grams ? 'yield-error' : undefined}
                                />
                                {errors.yield_weight_grams && (
                                    <p id="yield-error" className="mt-1 text-sm text-red-600" role="alert">
                                        {errors.yield_weight_grams}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <Select
                                    options={STATUS_OPTIONS}
                                    value={form.status}
                                    onChange={(val) => updateField('status', val as FormData['status'])}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Unit System</label>
                                <Select
                                    options={UNIT_SYSTEM_OPTIONS}
                                    value={form.preferred_unit_system}
                                    onChange={(val) => updateField('preferred_unit_system', val)}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Step 1: Ingredients ─────────────────────────────────────── */}
                {step === 1 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-base font-semibold text-gray-800">Ingredients</h2>
                            <span className="text-sm text-gray-400">{form.ingredients.length} added</span>
                        </div>

                        {form.ingredients.length === 0 && (
                            <div className="text-center py-10 text-gray-400">
                                <p className="text-4xl mb-3">🧂</p>
                                <p className="text-sm">No ingredients yet. Add your first one below.</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            {form.ingredients.map((ing, idx) => (
                                <IngredientRow
                                    key={ing._key}
                                    ingredient={ing}
                                    index={idx}
                                    isDragging={dragIndex === idx}
                                    onDragStart={handleDragStart}
                                    onDragOver={handleDragOver}
                                    onDrop={handleDrop}
                                    onChange={updateIngredient}
                                    onRemove={removeIngredient}
                                    searchOptions={ingredientOptions}
                                    searchLoading={ingredientSearchLoading}
                                    onIngredientSearch={handleIngredientSearch}
                                    onIngredientSelect={handleIngredientSelect}
                                />
                            ))}
                        </div>

                        <Button
                            type="button"
                            variant="ghost"
                            onClick={addIngredient}
                            className="w-full border-2 border-dashed border-gray-200 hover:border-amber-300 hover:bg-amber-50"
                            aria-label="Add ingredient"
                        >
                            + Add Ingredient
                        </Button>
                    </div>
                )}

                {/* ── Step 2: Instructions ────────────────────────────────────── */}
                {step === 2 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-base font-semibold text-gray-800">Instructions</h2>
                            <span className="text-sm text-gray-400">{form.sections.length} section{form.sections.length !== 1 ? 's' : ''}</span>
                        </div>

                        {form.sections.length === 0 && (
                            <div className="text-center py-10 text-gray-400">
                                <p className="text-4xl mb-3">📋</p>
                                <p className="text-sm">No sections yet. Add a section to start writing instructions.</p>
                            </div>
                        )}

                        <div className="space-y-6">
                            {form.sections.map((section, si) => (
                                <div key={section._key} className="rounded-xl border border-gray-200 p-4 space-y-3">
                                    {/* Section header */}
                                    <div className="flex items-center gap-3">
                                        <div className="w-36 shrink-0">
                                            <Select
                                                options={SECTION_TYPE_OPTIONS}
                                                value={section.type}
                                                onChange={(val) => updateSection(si, 'type', val)}
                                                aria-label={`Section ${si + 1} type`}
                                            />
                                        </div>
                                        <Input
                                            value={section.title}
                                            onChange={(e) => updateSection(si, 'title', e.target.value)}
                                            placeholder="Section title (optional)"
                                            aria-label={`Section ${si + 1} title`}
                                            className="flex-1"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeSection(si)}
                                            aria-label={`Remove section ${si + 1}`}
                                            className="text-gray-300 hover:text-red-500 transition-colors shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    {/* Steps */}
                                    <div className="space-y-2 ml-2">
                                        {section.steps.map((stepItem, ti) => (
                                            <StepRow
                                                key={stepItem._key}
                                                step={stepItem}
                                                stepIndex={ti}
                                                sectionIndex={si}
                                                onChange={updateStep}
                                                onRemove={removeStep}
                                            />
                                        ))}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => addStep(si)}
                                        className="w-full text-sm text-amber-700 hover:bg-amber-50 rounded-lg py-2 px-3 text-left transition-colors border border-dashed border-amber-200 hover:border-amber-400"
                                        aria-label={`Add step to section ${si + 1}`}
                                    >
                                        + Add Step
                                    </button>
                                </div>
                            ))}
                        </div>

                        <Button
                            type="button"
                            variant="ghost"
                            onClick={addSection}
                            className="w-full border-2 border-dashed border-gray-200 hover:border-amber-300 hover:bg-amber-50"
                        >
                            + Add Section
                        </Button>

                        {/* Submit error */}
                        {submitError && (
                            <div role="alert" className="rounded-lg bg-red-50 border border-red-100 p-4 text-sm text-red-700">
                                {submitError}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between mt-6">
                {step > 0 ? (
                    <Button variant="ghost" onClick={() => goToStep(step - 1)}>
                        ← Back
                    </Button>
                ) : (
                    <div />
                )}

                {step < STEPS.length - 1 ? (
                    <Button onClick={goNext} disabled={isPending}>
                        Next: {STEPS[step + 1]} →
                    </Button>
                ) : (
                    <Button onClick={handleSubmit} disabled={isPending}>
                        {isPending ? (
                            <span className="flex items-center gap-2">
                                <LoadingSpinner size="sm" />
                                {isEditing ? 'Saving…' : 'Creating…'}
                            </span>
                        ) : (
                            isEditing ? 'Save Changes' : 'Create Recipe'
                        )}
                    </Button>
                )}
            </div>
        </div>
    )
}