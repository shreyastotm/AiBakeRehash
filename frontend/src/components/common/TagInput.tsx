import React, { useState, useRef, KeyboardEvent, useId, useEffect } from 'react'
import { X, Tag as TagIcon } from 'lucide-react'
import { Badge } from './Badge'
import { UserTag } from '../../services/recipe.service'

const TAG_COLORS: Record<string, { bg: string, text: string }> = {
    gray: { bg: 'bg-gray-100', text: 'text-gray-700' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-700' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-700' },
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    rose: { bg: 'bg-rose-100', text: 'text-rose-700' },
    indigo: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-700' },
    teal: { bg: 'bg-teal-100', text: 'text-teal-700' },
    violet: { bg: 'bg-violet-100', text: 'text-violet-700' },
}

export interface TagInputProps {
    value: string[]
    onChange: (tags: string[]) => void
    suggestions?: string[]
    userTags?: UserTag[]
    placeholder?: string
    label?: string
    error?: string
    hint?: string
    disabled?: boolean
    className?: string
}

export const TagInput: React.FC<TagInputProps> = ({
    value = [],
    onChange,
    suggestions = [],
    userTags = [],
    placeholder = 'Add a tag...',
    label,
    error,
    hint,
    disabled = false,
    className = '',
}) => {
    const [inputValue, setInputValue] = useState('')
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [activeIndex, setActiveIndex] = useState(-1)

    const inputRef = useRef<HTMLInputElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const inputId = useId()

    const filteredSuggestions = suggestions.filter(
        (s) =>
            s.toLowerCase().includes(inputValue.toLowerCase()) &&
            !value.map(v => v.toLowerCase()).includes(s.toLowerCase())
    )

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowSuggestions(false)
                setActiveIndex(-1)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const addTag = (tagText: string) => {
        const trimmed = tagText.trim()
        if (!trimmed) return

        // Prevent duplicates (case-insensitive)
        if (!value.find((t) => t.toLowerCase() === trimmed.toLowerCase())) {
            onChange([...value, trimmed])
        }
        setInputValue('')
        setShowSuggestions(false)
        setActiveIndex(-1)
        inputRef.current?.focus()
    }

    const removeTag = (tagToRemove: string) => {
        onChange(value.filter((t) => t !== tagToRemove))
    }

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (disabled) return

        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            if (activeIndex >= 0 && filteredSuggestions[activeIndex]) {
                addTag(filteredSuggestions[activeIndex])
            } else {
                addTag(inputValue)
            }
        } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
            removeTag(value[value.length - 1])
        } else if (e.key === 'Escape') {
            setShowSuggestions(false)
            setActiveIndex(-1)
        } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            setShowSuggestions(true)
            setActiveIndex((prev) => Math.min(prev + 1, filteredSuggestions.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActiveIndex((prev) => Math.max(prev - 1, 0))
        }
    }

    const borderClass = error
        ? 'border-red-500 focus-within:ring-red-500 focus-within:border-red-500'
        : 'border-gray-300 focus-within:ring-amber-500 focus-within:border-amber-500'

    return (
        <div className={`w-full ${className}`} ref={containerRef}>
            {label && (
                <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <TagIcon className="w-4 h-4 text-gray-500" />
                    {label}
                </label>
            )}

            <div className="relative">
                <div
                    className={`flex flex-wrap items-center gap-2 p-2 w-full min-h-[44px] bg-white border rounded-md shadow-sm transition-shadow focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-0 disabled:bg-gray-50 ${borderClass} ${disabled ? 'opacity-75 cursor-not-allowed bg-gray-50' : 'cursor-text'}`}
                    onClick={() => !disabled && inputRef.current?.focus()}
                >
                    {value.map((tag) => {
                        const userTag = userTags.find(ut => ut.label.toLowerCase() === tag.toLowerCase())
                        const colorConfig = TAG_COLORS[userTag?.color || 'gray'] || TAG_COLORS.gray

                        return (
                            <Badge
                                key={tag}
                                variant="default"
                                className={`flex items-center gap-1 group py-1 border-none shadow-sm ${colorConfig.bg} ${colorConfig.text} hover:opacity-90 transition-opacity`}
                            >
                                {tag}
                                {!disabled && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            removeTag(tag)
                                        }}
                                        className="p-0.5 rounded-full hover:bg-black/5 text-current opacity-60 hover:opacity-100 transition-all focus:outline-none focus:ring-1 focus:ring-current"
                                        aria-label={`Remove tag ${tag}`}
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </Badge>
                        )
                    })}

                    <input
                        ref={inputRef}
                        id={inputId}
                        type="text"
                        value={inputValue}
                        onChange={(e) => {
                            setInputValue(e.target.value)
                            if (e.target.value.trim() || filteredSuggestions.length > 0) {
                                setShowSuggestions(true)
                            }
                        }}
                        onKeyDown={handleKeyDown}
                        onFocus={() => {
                            if (filteredSuggestions.length > 0) {
                                setShowSuggestions(true)
                            }
                        }}
                        placeholder={value.length === 0 ? placeholder : ''}
                        disabled={disabled}
                        className="flex-1 min-w-[120px] bg-transparent outline-none p-1 text-sm text-gray-900 placeholder-gray-400"
                        autoComplete="off"
                    />
                </div>

                {/* Suggestions dropdown */}
                {showSuggestions && filteredSuggestions.length > 0 && !disabled && (
                    <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredSuggestions.map((suggestion, index) => (
                            <li
                                key={suggestion}
                                className={`px-3 py-2 cursor-pointer text-sm flex items-center justify-between ${index === activeIndex ? 'bg-amber-50 text-amber-700' : 'text-gray-900 hover:bg-gray-50'
                                    }`}
                                onMouseDown={(e) => {
                                    e.preventDefault()
                                    addTag(suggestion)
                                }}
                                onMouseEnter={() => setActiveIndex(index)}
                            >
                                <span>{suggestion}</span>
                                {userTags.find(ut => ut.label.toLowerCase() === suggestion.toLowerCase()) && (
                                    <div
                                        className={`w-2 h-2 rounded-full ${TAG_COLORS[userTags.find(ut => ut.label.toLowerCase() === suggestion.toLowerCase())!.color]?.bg}`}
                                    />
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {hint && !error && <p className="text-gray-500 text-sm mt-1">{hint}</p>}
            {error && <p role="alert" className="text-red-600 text-sm mt-1">{error}</p>}
        </div>
    )
}
