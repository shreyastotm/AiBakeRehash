import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useJournalEntries, useAllJournalEntries } from '../../hooks/useJournalEntries';
import { useRecipe } from '../../hooks/useRecipes';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { SearchInput } from '../../components/common/SearchInput';
import { format } from 'date-fns';
import { Plus, Star, Camera } from 'lucide-react';

export const JournalList = () => {
    const { recipeId } = useParams<{ recipeId: string }>();
    const navigate = useNavigate();
    const isGlobal = !recipeId;
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
    const [search, setSearch] = useState('');

    const { data: recipe, isLoading: isLoadingRecipe } = useRecipe(recipeId || '');

    const allEntriesQuery = useAllJournalEntries({ enabled: isGlobal });
    const recipeEntriesQuery = useJournalEntries(recipeId || '', { enabled: !isGlobal });

    const entries = isGlobal ? allEntriesQuery.data : recipeEntriesQuery.data;
    const isLoadingEntries = isGlobal ? allEntriesQuery.isLoading : recipeEntriesQuery.isLoading;
    const error = isGlobal ? allEntriesQuery.error : recipeEntriesQuery.error;

    const handleSearch = (value: string) => setSearch(value);

    const sortedEntries = React.useMemo(() => {
        if (!entries) return [];
        const filtered = search.trim()
            ? entries.filter(e =>
                (e.recipe_title ?? '').toLowerCase().includes(search.toLowerCase()) ||
                (e.notes ?? '').toLowerCase().includes(search.toLowerCase())
            )
            : entries;
        return [...filtered].sort((a, b) => {
            const dateA = new Date(a.bake_date).getTime();
            const dateB = new Date(b.bake_date).getTime();
            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });
    }, [entries, sortOrder, search]);

    const toggleSort = () => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');

    if ((!isGlobal && isLoadingRecipe) || isLoadingEntries) {
        return (
            <div className="flex justify-center items-center min-h-[50vh]">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (error || (!isGlobal && !recipe)) {
        return (
            <div className="container mx-auto px-4 py-6 max-w-4xl">
                <div className="p-4 bg-red-50 text-red-600 rounded-lg">
                    {error instanceof Error ? error.message : 'Failed to load journal entries. Please try again.'}
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-6 max-w-4xl">
            {/* Header */}
            <div className="page-header">
                <div>
                    {!isGlobal && (
                        <Link to={`/recipes/${recipeId}`} className="text-sm text-neutral-500 hover:text-neutral-900 mb-2 inline-block">
                            ← Back to Recipe
                        </Link>
                    )}
                    {isGlobal && (
                        <Link to="/dashboard" className="text-sm text-neutral-500 hover:text-neutral-900 mb-2 inline-block">
                            ← Back to Dashboard
                        </Link>
                    )}
                    <h1 className="page-title">Baking Journal</h1>
                    <p className="page-subtitle">
                        {!isGlobal && recipe ? `For: ${recipe.title}` : 'Log and review your baking sessions'}
                    </p>
                </div>
                {!isGlobal && (
                    <Link to={`/recipes/${recipeId}/journal/new`}>
                        <Button leftIcon={<Plus size={16} />}>Log a Bake</Button>
                    </Link>
                )}
            </div>

            {/* Search bar */}
            <div className="card p-4 mb-6">
                <SearchInput
                    value={search}
                    onSearch={handleSearch}
                    placeholder="Search journal entries…"
                />
            </div>

            {/* Sort toggle */}
            <div className="flex justify-end mb-4">
                <button
                    onClick={toggleSort}
                    className="text-sm flex items-center gap-1 text-neutral-600 hover:text-neutral-900"
                >
                    Sort by Date {sortOrder === 'desc' ? '↓' : '↑'}
                </button>
            </div>

            {sortedEntries.length === 0 ? (
                <EmptyState
                    title="No journal entries yet"
                    description={
                        search.trim()
                            ? 'No entries match your search. Try a different term.'
                            : isGlobal
                            ? "You haven't logged any bakes yet. Go to a recipe to start your journal."
                            : 'Log your first baking session to track your progress'
                    }
                    action={{
                        label: isGlobal ? 'View Recipes' : 'Log a Bake',
                        onClick: () => navigate(isGlobal ? '/recipes' : `/recipes/${recipeId}/journal/new`)
                    }}
                />
            ) : (
                <div className="space-y-3">
                    {sortedEntries.map(entry => (
                        <Link key={entry.id} to={`/recipes/${entry.recipe_id}/journal/${entry.id}`} className="block group">
                            <article className="card p-5 hover:shadow-md transition-all hover:-translate-y-0.5 group-hover:border-primary-100">
                                {/* Date + recipe name header */}
                                <div className="flex items-start justify-between gap-4 mb-3">
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-neutral-900 text-sm group-hover:text-primary-600 transition-colors truncate">
                                            {entry.recipe_title ?? 'Untitled Bake'}
                                        </h3>
                                        <p className="text-xs text-neutral-500 mt-0.5">
                                            {format(new Date(entry.bake_date), 'PPP')}
                                        </p>
                                    </div>
                                    {/* Star rating */}
                                    {entry.rating != null && (
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            {Array.from({ length: 5 }).map((_, i) => (
                                                <Star
                                                    key={i}
                                                    size={13}
                                                    className={i < entry.rating! ? 'text-accent-500 fill-accent-500' : 'text-neutral-200 fill-neutral-200'}
                                                    aria-hidden="true"
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Notes preview */}
                                {entry.notes && (
                                    <p className="text-sm text-neutral-600 line-clamp-2 leading-relaxed">{entry.notes}</p>
                                )}

                                {/* Footer: metrics + photo count */}
                                <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-neutral-100 text-xs text-neutral-500">
                                    {entry.pre_bake_weight_grams && (
                                        <span>Pre-bake: <span className="font-medium text-neutral-900">{entry.pre_bake_weight_grams}g</span></span>
                                    )}
                                    {entry.outcome_weight_grams && (
                                        <span>Outcome: <span className="font-medium text-neutral-900">{entry.outcome_weight_grams}g</span></span>
                                    )}
                                    {entry.baking_loss_percentage != null && (
                                        <span>Loss: <span className="font-medium text-accent-600">{Number(entry.baking_loss_percentage).toFixed(1)}%</span></span>
                                    )}
                                    {entry.images && entry.images.length > 0 && (
                                        <span className="flex items-center gap-1 ml-auto">
                                            <Camera size={12} aria-hidden="true" />{entry.images.length} photo{entry.images.length > 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>
                            </article>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};
