import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../common/Button'
import { Textarea } from '../common/Textarea'
import { Input } from '../common/Input'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { Tooltip } from '../common/Tooltip'
import { recipeService, RecipeCreateRequest } from '../../services/recipe.service'
import { normalizeUnit } from '../../utils/units';

interface SmartImportModalProps {
    isOpen: boolean
    onClose: () => void
}

type ImportTab = 'text' | 'url' | 'file'

export const SmartImportModal = ({ isOpen, onClose }: SmartImportModalProps) => {
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState<ImportTab>('text')

    // Form state
    const [textInput, setTextInput] = useState('')
    const [urlInput, setUrlInput] = useState('')
    const [fileInput, setFileInput] = useState<File | null>(null)

    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    if (!isOpen) return null

    const handleImportText = async () => {
        if (!textInput.trim()) return
        setIsLoading(true); setError(null)
        try {
            const result = await recipeService.importFromText(textInput)
            handleSuccess(result)
        } catch (err: any) {
            const errData = err.response?.data?.error;
            const msg = typeof errData === 'string' ? errData : errData?.message || err.message || 'Failed to parse text.';
            setError(msg)
        } finally {
            setIsLoading(false)
        }
    }

    const handleImportUrl = async () => {
        if (!urlInput.trim()) return
        setIsLoading(true); setError(null)
        try {
            const result = await recipeService.importFromUrl(urlInput)
            handleSuccess(result)
        } catch (err: any) {
            const errData = err.response?.data?.error;
            const msg = typeof errData === 'string' ? errData : errData?.message || err.message || 'Failed to parse URL.';
            setError(msg)
        } finally {
            setIsLoading(false)
        }
    }

    const handleImportFile = async () => {
        if (!fileInput) return
        setIsLoading(true); setError(null)
        try {
            const result = await recipeService.importFromFile(fileInput)
            handleSuccess(result)
        } catch (err: any) {
            const errData = err.response?.data?.error;
            const msg = typeof errData === 'string' ? errData : errData?.message || err.message || 'Failed to parse document.';
            setError(msg)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSuccess = (apiPayload: RecipeCreateRequest) => {
        // Map API payload back to the local `FormData` shape expected by RecipeForm's autosave
        const uid = (): string => Math.random().toString(36).slice(2)

        // Normalize units and ensure URL is captured if importing via URL
        const normalizedIngredients = (apiPayload.ingredients || []).map(ing => ({
            ...ing,
            unit_original: normalizeUnit(ing.unit_original || '')
        }));

        const mappedData = {
            title: apiPayload.title || 'Imported Recipe',
            description: apiPayload.description || '',
            servings: apiPayload.servings || 1,
            yield_weight_grams: apiPayload.yield_weight_grams || '',
            status: 'draft',
            preferred_unit_system: 'metric',
            original_author: apiPayload.original_author || '',
            original_author_url: activeTab === 'url'
                ? (apiPayload.original_author_url || urlInput)
                : apiPayload.original_author_url,
            tags: apiPayload.tags || [],
            ingredients: normalizedIngredients.map(ing => ({
                _key: uid(),
                ingredient_master_id: '',
                display_name: ing.display_name,
                quantity_original: ing.quantity_original,
                unit_original: ing.unit_original,
                inventory_item_id: ''
            })),
            sections: (apiPayload.sections || []).map(sec => ({
                _key: uid(),
                type: sec.type || 'prep',
                title: sec.title || '',
                steps: (sec.steps || []).map(step => ({
                    _key: uid(),
                    instruction: step.instruction,
                    duration_seconds: step.duration_seconds ?? '',
                    temperature_celsius: step.temperature_celsius ?? ''
                }))
            })),
            // Add source_url and source_type for tracking
            source_url: activeTab === 'url' ? urlInput : undefined,
            source_type: activeTab
        }

        console.log('✨ Smart Import: Mapped data for draft:', mappedData)

        // Save to AutoSave Key so the form picks it up as a draft
        localStorage.setItem('aibake_recipe_form_draft', JSON.stringify(mappedData))
        localStorage.setItem('aibake_recipe_form_draft__timestamp', Date.now().toString())

        onClose()
        navigate('/recipes/new')
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">✨ Recipe Smart Import</h2>
                        <p className="text-sm text-gray-500 mt-1">Let AI extract the ingredients and steps for you.</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
                </div>

                <div className="bg-blue-50/50 px-6 py-4 border-b border-blue-100 flex items-start gap-3 text-sm text-blue-700">
                    <span className="text-xl mt-0.5">💡</span>
                    <div className="space-y-2">
                        <p>
                            <strong>Pro Tip:</strong> AI is great at ingredients and steps, but some technical data needs your expert eye:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-xs opacity-90">
                            <li>
                                <Tooltip content="Mandatory for accurate nutrition labels and dietary info.">
                                    <span className="cursor-help border-b border-dotted border-blue-400"><strong>Servings:</strong></span>
                                </Tooltip> Mandatory for nutrition calculation.
                            </li>
                            <li>
                                <Tooltip content="Crucial for calculating cost per gram and accurate scaling.">
                                    <span className="cursor-help border-b border-dotted border-blue-400"><strong>Yield Weight:</strong></span>
                                </Tooltip> Crucial for accurate cost/weight analysis.
                            </li>
                            <li><strong>Inventory Mapping:</strong> You must link ingredients to your specific brands after import.</li>
                        </ul>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 flex-1 overflow-y-auto">

                    {/* Tabs */}
                    <div className="flex border-b border-gray-200 mb-6 font-medium text-sm">
                        <button
                            className={`px-4 py-3 -mb-px flex-1 border-b-2 text-center transition-colors ${activeTab === 'text' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setActiveTab('text')}
                        >
                            Paste Text
                        </button>
                        <button
                            className={`px-4 py-3 -mb-px flex-1 border-b-2 text-center transition-colors ${activeTab === 'url' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setActiveTab('url')}
                        >
                            Paste Link
                        </button>
                        <button
                            className={`px-4 py-3 -mb-px flex-1 border-b-2 text-center transition-colors ${activeTab === 'file' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setActiveTab('file')}
                        >
                            Upload File
                        </button>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 flex items-center gap-3">
                            <span className="text-xl">⚠️</span> {error}
                        </div>
                    )}

                    {/* Tab Contents */}
                    <div className="min-h-[250px] flex flex-col">
                        {activeTab === 'text' && (
                            <div className="flex-1 flex flex-col space-y-4">
                                <label className="text-sm font-medium text-gray-700">Recipe Text</label>
                                <Textarea
                                    className="flex-1 min-h-[200px]"
                                    placeholder="Paste the raw unstructured recipe text here..."
                                    value={textInput}
                                    onChange={e => setTextInput(e.target.value)}
                                    disabled={isLoading}
                                />
                                <Button className="w-full" disabled={!textInput.trim() || isLoading} onClick={handleImportText}>
                                    {isLoading ? <span className="flex items-center gap-2"><LoadingSpinner size="sm" /> Extracting...</span> : 'Extract Recipe'}
                                </Button>
                            </div>
                        )}

                        {activeTab === 'url' && (
                            <div className="flex-1 flex flex-col space-y-4">
                                <label className="text-sm font-medium text-gray-700">Recipe Browser Link</label>
                                <Input
                                    type="url"
                                    placeholder="https://example.com/recipe/..."
                                    value={urlInput}
                                    onChange={e => setUrlInput(e.target.value)}
                                    disabled={isLoading}
                                    className="py-3 text-lg"
                                />
                                <div className="bg-blue-50/50 p-4 rounded-xl text-xs text-blue-600 border border-blue-100/50">
                                    <strong>Note:</strong> Some websites block automated readers. If the link fails, try copy-pasting the text instead.
                                </div>
                                <div className="flex-1" />
                                <Button className="w-full" disabled={!urlInput.trim() || isLoading} onClick={handleImportUrl}>
                                    {isLoading ? <span className="flex items-center gap-2"><LoadingSpinner size="sm" /> Scrape & Extract...</span> : 'Extract Recipe'}
                                </Button>
                            </div>
                        )}

                        {activeTab === 'file' && (
                            <div className="flex-1 flex flex-col space-y-4">
                                <label className="text-sm font-medium text-gray-700">Document File (.pdf, .docx, .xlsx)</label>

                                <div className="flex-1 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center p-8 bg-gray-50/50 transition-colors hover:border-amber-300 hover:bg-amber-50">
                                    <span className="text-4xl mb-4">📄</span>
                                    <input
                                        type="file"
                                        accept=".pdf,.doc,.docx,.xls,.xlsx"
                                        id="file-upload"
                                        className="hidden"
                                        onChange={e => setFileInput(e.target.files?.[0] || null)}
                                        disabled={isLoading}
                                    />
                                    <label htmlFor="file-upload" className="cursor-pointer text-amber-600 hover:text-amber-800 font-semibold mb-2">
                                        Click to browse
                                    </label>
                                    <p className="text-xs text-gray-400">PDF, Word, or Excel</p>

                                    {fileInput && (
                                        <div className="mt-4 px-4 py-2 bg-white rounded-lg border border-gray-200 shadow-sm text-sm text-gray-700 font-medium">
                                            {fileInput.name}
                                        </div>
                                    )}
                                </div>

                                <Button className="w-full" disabled={!fileInput || isLoading} onClick={handleImportFile}>
                                    {isLoading ? <span className="flex items-center gap-2"><LoadingSpinner size="sm" /> Reading File...</span> : 'Extract Recipe'}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
