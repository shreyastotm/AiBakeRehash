import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../common/Button'
import { Card } from '../common/Card'
import { Autocomplete } from '../common/Autocomplete'
import { ingredientService, IngredientMaster } from '../../services/ingredient.service'

export const IngredientManagement = () => {
    const queryClient = useQueryClient()
    const [selectedSource, setSelectedSource] = useState<IngredientMaster | null>(null)
    const [selectedTargetId, setSelectedTargetId] = useState<string | undefined>(undefined)
    const [targetSearchLabel, setTargetSearchLabel] = useState('')

    // 1. Fetch user's custom ingredients
    const { data: ingredientsData, isLoading } = useQuery({
        queryKey: ['ingredients', 'list', 'all'],
        queryFn: () => ingredientService.list({ limit: 1000 }),
    })

    const customIngredients = ingredientsData?.ingredients.filter(ing => ing.user_id !== null) ?? []

    // 2. Search for target ingredient
    const [targetOptions, setTargetOptions] = useState<{ value: string; label: string; sublabel?: string }[]>([])
    const [targetLoading, setTargetLoading] = useState(false)

    const handleTargetSearch = async (val: string) => {
        setTargetSearchLabel(val)
        if (val.length < 2) {
            setTargetOptions([])
            return
        }
        setTargetLoading(true)
        try {
            const results = await ingredientService.search(val)
            setTargetOptions(results.map(r => ({
                value: r.id,
                label: r.name,
                sublabel: r.user_id === null ? '(System)' : '(Custom)'
            })))
        } finally {
            setTargetLoading(false)
        }
    }

    const { data: suggestions, isLoading: suggestionsLoading } = useQuery({
        queryKey: ['ingredients', 'suggestions'],
        queryFn: () => ingredientService.getSuggestions(),
    })

    const filteredSuggestions = suggestions ?? []

    // 4. Merge Mutation
    const mergeMutation = useMutation({
        mutationFn: (payload: { source_id: string; target_id: string }) =>
            ingredientService.merge(payload),
        onSuccess: () => {
            alert('Ingredients merged successfully!')
            setSelectedSource(null)
            setSelectedTargetId(undefined)
            setTargetSearchLabel('')
            queryClient.invalidateQueries({ queryKey: ['ingredients'] })
        },
        onError: (err: any) => {
            alert(`Merge failed: ${err.response?.data?.error || err.message}`)
        }
    })

    // 5. Ignore Mutation
    const ignoreMutation = useMutation({
        mutationFn: (payload: { source_id: string; target_id: string }) =>
            ingredientService.ignoreSuggestion(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ingredients', 'suggestions'] })
        }
    })

    const handleQuickMerge = (sourceId: string, targetId: string, sourceName: string, targetName: string) => {
        if (window.confirm(`Merge "${sourceName}" into "${targetName}"?`)) {
            mergeMutation.mutate({ source_id: sourceId, target_id: targetId })
        }
    }

    const handleMerge = () => {
        if (!selectedSource || !selectedTargetId) return
        if (selectedSource.id === selectedTargetId) {
            alert('Source and target must be different.')
            return
        }

        if (window.confirm(`Are you sure you want to merge "${selectedSource.name}" into your target ingredient? This cannot be undone.`)) {
            mergeMutation.mutate({
                source_id: selectedSource.id,
                target_id: selectedTargetId
            })
        }
    }

    return (
        <div className="space-y-6">
            <Card className="border-amber-200 bg-amber-50/30 overflow-hidden">
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-amber-600">✨</span>
                    <h3 className="text-sm font-bold text-amber-900 uppercase tracking-tight">Smart Suggestions</h3>
                    {suggestionsLoading && <span className="animate-spin text-amber-600 text-xs text-[10px]">◌</span>}
                </div>
                {filteredSuggestions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {filteredSuggestions.map((s) => (
                            <div key={s.custom_id + s.target_id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-100 shadow-sm animate-in fade-in slide-in-from-left-4">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-red-600 line-through truncate max-w-[100px]">{s.custom_name}</span>
                                        <span className="text-gray-400 text-[10px]">➔</span>
                                        <span className="text-xs font-bold text-green-700 truncate max-w-[100px]">{s.target_name}</span>
                                    </div>
                                    <div className="text-[10px] text-gray-500 mt-0.5">
                                        {Math.round(s.similarity * 100)}% match • {s.match_type === 'system' ? 'System Item' : 'Your Item'}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0 ml-2">
                                    <button
                                        onClick={() => handleQuickMerge(s.custom_id, s.target_id, s.custom_name, s.target_name)}
                                        className="px-2 py-1 bg-amber-600 text-white text-[11px] font-bold rounded-md hover:bg-amber-700 transition-colors shadow-sm"
                                    >
                                        Merge
                                    </button>
                                    <button
                                        onClick={() => ignoreMutation.mutate({ source_id: s.custom_id, target_id: s.target_id })}
                                        className="p-1 px-2 text-gray-400 hover:text-gray-600 text-[11px]"
                                        title="Dismiss permanently"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-4 bg-white/50 rounded-lg border border-dashed border-amber-200">
                        <p className="text-xs text-amber-800/60 font-medium">No potential duplicates detected at this time.</p>
                    </div>
                )}
            </Card>

            <Card>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Ingredient Deduplication <span className="text-[9px] text-amber-500 ml-2 bg-amber-50 px-1 rounded border border-amber-100">v1.2-persistent</span></h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Merge duplicates (including system items) to keep your database clean.
                            All linked recipes and inventory will be updated automatically.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-4 bg-gray-50 rounded-lg border border-gray-100">
                    {/* Source Selection */}
                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-700">
                            1. Select Your Custom Ingredient (to be removed)
                        </label>
                        <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded bg-white p-2 shadow-inner">
                            {isLoading ? (
                                <p className="text-sm text-gray-500 p-4">Loading your ingredients...</p>
                            ) : customIngredients.length === 0 ? (
                                <p className="text-sm text-gray-500 p-4">No custom ingredients found to merge.</p>
                            ) : (
                                customIngredients.map(ing => (
                                    <button
                                        key={ing.id}
                                        onClick={() => setSelectedSource(ing)}
                                        className={`w-full text-left px-3 py-2 rounded text-sm transition-all duration-200 ${selectedSource?.id === ing.id
                                            ? 'bg-amber-100 border border-amber-300 text-amber-900 font-medium shadow-sm ring-1 ring-amber-400/20'
                                            : 'hover:bg-gray-100 text-gray-700 border border-transparent'
                                            }`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span>{ing.name}</span>
                                            <span className="text-[10px] uppercase text-gray-400 font-semibold tracking-wider">{ing.category}</span>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Target Selection */}
                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-700">
                            2. Select Target Ingredient (to keep)
                        </label>
                        <div className="bg-white rounded border border-gray-200 p-4 min-h-[120px] flex flex-col justify-center shadow-sm">
                            <Autocomplete
                                options={targetOptions}
                                value={selectedTargetId}
                                displayLabel={targetSearchLabel}
                                onInputChange={handleTargetSearch}
                                onChange={(val, opt) => {
                                    setSelectedTargetId(val)
                                    setTargetSearchLabel(opt?.label || '')
                                }}
                                placeholder="Search target ingredient..."
                                loading={targetLoading}
                                noOptionsText="No match found"
                            />
                            <p className="text-[11px] text-gray-400 mt-2 italic px-1">
                                Search for a verified system ingredient or another of your custom items.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Final Action */}
                <div className="mt-8 flex flex-col items-center border-t border-gray-100 pt-8">
                    {selectedSource && selectedTargetId && (
                        <div className="text-center mb-6 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex items-center justify-center gap-4 text-sm font-medium">
                                <div className="flex flex-col items-center">
                                    <span className="px-3 py-1.5 bg-red-50 text-red-700 rounded-md border border-red-100 line-through decoration-red-400/50 shadow-sm">
                                        {selectedSource.name}
                                    </span>
                                    <span className="text-[9px] text-red-500 mt-1 font-bold uppercase tracking-tight">Deletes</span>
                                </div>
                                <div className="text-gray-400 flex flex-col items-center mb-4">
                                    <span className="text-xl">➔</span>
                                    <span className="text-[9px] font-bold uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded-full text-gray-500">MAPPING</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="px-3 py-1.5 bg-green-50 text-green-700 rounded-md border border-green-200 shadow-sm font-semibold ring-1 ring-green-500/10">
                                        {targetSearchLabel}
                                    </span>
                                    <span className="text-[9px] text-green-600 mt-1 font-bold uppercase tracking-tight">Maintains</span>
                                </div>
                            </div>
                            <div className="max-w-md mx-auto p-3 bg-amber-50 rounded-lg border border-amber-100 text-amber-800 text-xs leading-relaxed">
                                <strong>⚠️ Irreversible Action:</strong> "{selectedSource.name}" will be purged. All existing recipes using it will be re-mapped to use "{targetSearchLabel}". A permanent alias will be created to handle future imports of "{selectedSource.name}".
                            </div>
                        </div>
                    )}

                    <Button
                        variant="primary"
                        size="lg"
                        disabled={!selectedSource || !selectedTargetId || mergeMutation.isPending}
                        onClick={handleMerge}
                        loading={mergeMutation.isPending}
                        className={`w-full md:w-64 shadow-lg transform transition-all active:scale-95 ${!selectedSource || !selectedTargetId
                            ? 'bg-gray-400 opacity-50'
                            : 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 ring-2 ring-amber-600/20'
                            }`}
                    >
                        {mergeMutation.isPending ? (
                            <div className="flex items-center gap-2">
                                <span className="animate-spin">◌</span>
                                Merging Data...
                            </div>
                        ) : (
                            'Execute Database Merge'
                        )}
                    </Button>
                </div>
            </Card>
        </div>
    )
}
