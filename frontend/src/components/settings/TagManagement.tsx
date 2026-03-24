import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import { Card } from '../common/Card'
import { Badge } from '../common/Badge'
import { userTagService, UserTag } from '../../services/recipe.service'
import { PlusIcon, TrashIcon, PencilIcon, XCircleIcon, CheckCircleIcon } from 'lucide-react'

const TAG_COLORS = [
    { name: 'Default', value: 'gray', bg: 'bg-gray-100', text: 'text-gray-700' },
    { name: 'Amber', value: 'amber', bg: 'bg-amber-100', text: 'text-amber-700' },
    { name: 'Blue', value: 'blue', bg: 'bg-blue-100', text: 'text-blue-700' },
    { name: 'Emerald', value: 'emerald', bg: 'bg-emerald-100', text: 'text-emerald-700' },
    { name: 'Rose', value: 'rose', bg: 'bg-rose-100', text: 'text-rose-700' },
    { name: 'Indigo', value: 'indigo', bg: 'bg-indigo-100', text: 'text-indigo-700' },
    { name: 'Orange', value: 'orange', bg: 'bg-orange-100', text: 'text-orange-700' },
    { name: 'Teal', value: 'teal', bg: 'bg-teal-100', text: 'text-teal-700' },
    { name: 'Violet', value: 'violet', bg: 'bg-violet-100', text: 'text-violet-700' },
]

export const TagManagement = () => {
    const queryClient = useQueryClient()
    const [newTagLabel, setNewTagLabel] = useState('')
    const [selectedColor, setSelectedColor] = useState('amber')
    const [editingTag, setEditingTag] = useState<UserTag | null>(null)
    const [editLabel, setEditLabel] = useState('')
    const [editColor, setEditColor] = useState('')

    const { data: tags = [], isLoading } = useQuery({
        queryKey: ['userTags'],
        queryFn: () => userTagService.getTags()
    })

    const createMutation = useMutation({
        mutationFn: (data: { label: string; color: string }) => userTagService.createTag(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['userTags'] })
            setNewTagLabel('')
            setSelectedColor('amber')
        }
    })

    const updateMutation = useMutation({
        mutationFn: (data: { id: string; label: string; color: string }) =>
            userTagService.updateTag(data.id, { label: data.label, color: data.color }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['userTags'] })
            setEditingTag(null)
        }
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) => userTagService.deleteTag(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['userTags'] })
        }
    })

    const handleCreate = () => {
        if (!newTagLabel.trim()) return
        createMutation.mutate({ label: newTagLabel.trim(), color: selectedColor })
    }

    const startEdit = (tag: UserTag) => {
        setEditingTag(tag)
        setEditLabel(tag.label)
        setEditColor(tag.color)
    }

    const handleUpdate = () => {
        if (!editingTag || !editLabel.trim()) return
        updateMutation.mutate({ id: editingTag.id, label: editLabel.trim(), color: editColor })
    }

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure you want to delete this tag? Recipes using this tag will keep the label, but it won\'t be in your suggested list.')) {
            deleteMutation.mutate(id)
        }
    }

    return (
        <Card>
            <header className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Manage Recipe Tags</h2>
                <p className="text-sm text-gray-500">Define custom tags and colors to organize your recipes. These will guide the AI during smart imports.</p>
            </header>

            {/* Add New Tag */}
            <div className="bg-gray-50 rounded-lg p-4 mb-8 border border-gray-100">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Add New Tag</h3>
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="flex-1">
                        <Input
                            value={newTagLabel}
                            onChange={(e) => setNewTagLabel(e.target.value)}
                            placeholder="Tag label (e.g. Vegan, Quick, Eggless)"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2 mb-1">
                        {TAG_COLORS.map(c => (
                            <button
                                key={c.value}
                                onClick={() => setSelectedColor(c.value)}
                                className={`w-8 h-8 rounded-full ${c.bg} border-2 transition-all ${selectedColor === c.value ? 'border-amber-500 scale-110 shadow-sm' : 'border-transparent hover:scale-105'}`}
                                title={c.name}
                            />
                        ))}
                    </div>
                    <Button onClick={handleCreate} disabled={!newTagLabel.trim() || createMutation.isPending}>
                        <PlusIcon className="w-4 h-4 mr-1" /> Add
                    </Button>
                </div>
            </div>

            {/* Tag List */}
            <div className="space-y-3">
                {isLoading ? (
                    <p className="text-sm text-gray-400 italic">Loading tags...</p>
                ) : tags.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No custom tags defined yet.</p>
                ) : (
                    <div className="grid grid-cols-1 gap-2">
                        {tags.map((tag) => (
                            <div
                                key={tag.id}
                                className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-white hover:border-gray-200 transition-colors group"
                            >
                                {editingTag?.id === tag.id ? (
                                    <div className="flex flex-1 items-center gap-3">
                                        <Input
                                            value={editLabel}
                                            onChange={(e) => setEditLabel(e.target.value)}
                                            className="max-w-[150px]"
                                        />
                                        <div className="flex gap-1.5">
                                            {TAG_COLORS.map(c => (
                                                <button
                                                    key={c.value}
                                                    onClick={() => setEditColor(c.value)}
                                                    className={`w-6 h-6 rounded-full ${c.bg} border-2 transition-all ${editColor === c.value ? 'border-amber-500' : 'border-transparent'}`}
                                                />
                                            ))}
                                        </div>
                                        <div className="flex gap-1 ml-auto">
                                            <button onClick={handleUpdate} className="text-green-600 hover:text-green-700 p-1" title="Save">
                                                <CheckCircleIcon className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => setEditingTag(null)} className="text-gray-400 hover:text-gray-600 p-1" title="Cancel">
                                                <XCircleIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-3">
                                            <Badge
                                                variant="default" // TagInput uses default, we'll need to update Badge or CSS to support colors
                                                className={`${TAG_COLORS.find(c => c.value === tag.color)?.bg || 'bg-gray-100'} ${TAG_COLORS.find(c => c.value === tag.color)?.text || 'text-gray-700'}`}
                                            >
                                                {tag.label}
                                            </Badge>
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => startEdit(tag)}
                                                className="text-gray-400 hover:text-amber-600 transition-colors p-1"
                                                title="Edit tag"
                                            >
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(tag.id)}
                                                className="text-gray-400 hover:text-red-600 transition-colors p-1"
                                                title="Delete tag"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Card>
    )
}
