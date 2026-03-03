import React, { useState, useCallback, useRef } from 'react'
import { ingredientService } from '../../services/ingredient.service'
import type { IngredientSearchResult, IngredientCategory } from '../../services/ingredient.service'
import { LoadingSpinner } from '../common/LoadingSpinner'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IngredientSearchProps {
    /** Called when user selects an ingredient from the dropdown */
    onSelect: (ingredient: IngredientSearchResult) => void
    /** Optional placeholder override */
    placeholder?: string
    /** Optional class for the root container */
    className?: string
    /** Disable the input */
    disabled?: boolean
    /** If provided, show this as the pre-filled value label */
    initialLabel?: string
}

// ─── Category badge styles ────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<IngredientCategory, string> = {
    flour: 'bg-amber-100 text-amber-800',
    fat: 'bg-yellow-100 text-yellow-800',
    sugar: 'bg-pink-100 text-pink-800',
    leavening: 'bg-blue-100 text-blue-800',
    dairy: 'bg-indigo-100 text-indigo-800',
    liquid: 'bg-cyan-100 text-cyan-800',
    fruit: 'bg-rose-100 text-rose-800',
    nut: 'bg-orange-100 text-orange-800',
    spice: 'bg-red-100 text-red-800',
    other: 'bg-gray-100 text-gray-600',
}

// ─── Allergen icons ───────────────────────────────────────────────────────────

const ALLERGEN_LABELS: Record<string, string> = {
    gluten: 'G',
    dairy: 'D',
    nuts: 'N',
    eggs: 'E',
}

// ─── Highlight matching text ──────────────────────────────────────────────────

/**
 * Wrap matching substring in a <mark> element for visual highlight.
 */
function HighlightMatch({ text, query }: { text: string; query: string }) {
    if (!query.trim()) return <span>{text}</span>
    const idx = text.toLowerCase().indexOf(query.toLowerCase())
    if (idx === -1) return <span>{text}</span>
    return (
        <span>
            {text.slice(0, idx)}
            <mark className="bg-amber-200 text-amber-900 rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
            {text.slice(idx + query.length)}
        </span>
    )
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * Ingredient search autocomplete with:
 * - Debounced 300ms search
 * - Category badge + allergen flags in suggestions
 * - Highlighted matching text
 * - Full keyboard navigation (↑ ↓ Enter Esc)
 * Requirements: 30.1, 30.2
 */
export const IngredientSearch: React.FC<IngredientSearchProps> = ({
    onSelect,
    placeholder = 'Search ingredients...',
    className = '',
    disabled = false,
    initialLabel = '',
}) => {
    const [inputValue, setInputValue] = useState(initialLabel)
    const [results, setResults] = useState<IngredientSearchResult[]>([])
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)
    const [activeIndex, setActiveIndex] = useState(-1)

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const listRef = useRef<HTMLUListElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const queryRef = useRef('')

    // Close on outside click
    React.useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false)
                setActiveIndex(-1)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    // Scroll active item into view
    React.useEffect(() => {
        if (activeIndex >= 0 && listRef.current) {
            const item = listRef.current.children[activeIndex] as HTMLElement
            item?.scrollIntoView({ block: 'nearest' })
        }
    }, [activeIndex])

    const runSearch = useCallback(async (q: string) => {
        if (!q.trim()) {
            setResults([])
            setOpen(false)
            return
        }
        setLoading(true)
        try {
            const data = await ingredientService.search(q, 10)
            setResults(data)
            setOpen(true)
            setActiveIndex(-1)
        } catch {
            setResults([])
        } finally {
            setLoading(false)
        }
    }, [])

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const val = e.target.value
            setInputValue(val)
            queryRef.current = val
            if (debounceRef.current) clearTimeout(debounceRef.current)
            debounceRef.current = setTimeout(() => runSearch(val), 300)
        },
        [runSearch]
    )

    const handleSelect = useCallback(
        (ingredient: IngredientSearchResult) => {
            setInputValue(ingredient.name)
            setOpen(false)
            setActiveIndex(-1)
            onSelect(ingredient)
        },
        [onSelect]
    )

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!open && e.key === 'ArrowDown') {
            setOpen(results.length > 0)
            return
        }
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                setActiveIndex((i) => Math.min(i + 1, results.length - 1))
                break
            case 'ArrowUp':
                e.preventDefault()
                setActiveIndex((i) => Math.max(i - 1, 0))
                break
            case 'Enter':
                e.preventDefault()
                if (activeIndex >= 0 && results[activeIndex]) {
                    handleSelect(results[activeIndex])
                }
                break
            case 'Escape':
                setOpen(false)
                setActiveIndex(-1)
                inputRef.current?.blur()
                break
            case 'Tab':
                setOpen(false)
                setActiveIndex(-1)
                break
        }
    }

    const listboxId = 'ingredient-search-listbox'

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {/* Search input */}
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    role="combobox"
                    aria-expanded={open}
                    aria-haspopup="listbox"
                    aria-controls={listboxId}
                    aria-activedescendant={activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
                    aria-label="Search ingredients"
                    autoComplete="off"
                    disabled={disabled}
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => { if (results.length > 0) setOpen(true) }}
                    placeholder={placeholder}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent min-h-[44px] text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {/* Search icon */}
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none" aria-hidden="true">
                    {loading ? (
                        <LoadingSpinner size="sm" />
                    ) : (
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    )}
                </div>
            </div>

            {/* Suggestions dropdown */}
            {open && (
                <ul
                    ref={listRef}
                    id={listboxId}
                    role="listbox"
                    aria-label="Ingredient suggestions"
                    className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-auto"
                >
                    {results.length === 0 ? (
                        <li className="px-4 py-3 text-sm text-gray-500 text-center">
                            {loading ? 'Searching…' : `No ingredients found for "${queryRef.current}"`}
                        </li>
                    ) : (
                        results.map((ing, idx) => {
                            const allergens = ing.allergen_flags
                                ? Object.entries(ing.allergen_flags)
                                    .filter(([, v]) => v)
                                    .map(([k]) => ALLERGEN_LABELS[k])
                                : []

                            return (
                                <li
                                    key={ing.id}
                                    id={`${listboxId}-opt-${idx}`}
                                    role="option"
                                    aria-selected={idx === activeIndex}
                                    onMouseDown={(e) => {
                                        e.preventDefault()
                                        handleSelect(ing)
                                    }}
                                    onMouseEnter={() => setActiveIndex(idx)}
                                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer min-h-[44px] transition-colors ${idx === activeIndex ? 'bg-amber-50' : 'hover:bg-gray-50'
                                        }`}
                                >
                                    {/* Main name with highlight */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            <HighlightMatch text={ing.name} query={queryRef.current} />
                                        </p>
                                        {ing.default_density_g_per_ml && (
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {ing.default_density_g_per_ml} g/ml
                                            </p>
                                        )}
                                    </div>

                                    {/* Category badge */}
                                    <span
                                        className={`shrink-0 text-xs font-medium rounded-full px-2 py-0.5 ${CATEGORY_COLORS[ing.category]}`}
                                    >
                                        {ing.category}
                                    </span>

                                    {/* Allergen flags */}
                                    {allergens.length > 0 && (
                                        <div className="shrink-0 flex gap-1" aria-label={`Allergens: ${allergens.join(', ')}`}>
                                            {allergens.map((a) => (
                                                <span
                                                    key={a}
                                                    className="w-5 h-5 rounded-full bg-red-100 text-red-700 text-xs font-bold flex items-center justify-center"
                                                    title={`Contains ${a}`}
                                                >
                                                    {a}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </li>
                            )
                        })
                    )}
                </ul>
            )}
        </div>
    )
}
