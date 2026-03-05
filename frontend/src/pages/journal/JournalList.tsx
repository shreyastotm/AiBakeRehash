import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useJournalEntries } from '../../hooks/useJournalEntries';
import { useRecipe } from '../../hooks/useRecipes';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { format } from 'date-fns';

export const JournalList = () => {
    const { id } = useParams<{ id: string }>();
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

    const { data: recipe, isLoading: isLoadingRecipe } = useRecipe(id!);
    const { data: entries, isLoading: isLoadingEntries, error } = useJournalEntries(id!);

    const sortedEntries = React.useMemo(() => {
        if (!entries) return [];
        return [...entries].sort((a, b) => {
            const dateA = new Date(a.bake_date).getTime();
            const dateB = new Date(b.bake_date).getTime();
            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });
    }, [entries, sortOrder]);

    const toggleSort = () => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');

    if (isLoadingRecipe || isLoadingEntries) {
        return (
            <div className="flex justify-center items-center min-h-[50vh]">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (error || !recipe) {
        return (
            <div className="container mx-auto px-4 py-6 max-w-4xl">
                <div className="p-4 bg-red-50 text-red-600 rounded-lg">
                    Failed to load journal entries. Please try again.
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-6 max-w-4xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <Link to={`/recipes/${id}`} className="text-sm text-gray-500 hover:text-gray-900 mb-2 inline-block">
                        ← Back to Recipe
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900">Baking Journal</h1>
                    <p className="text-gray-600 font-medium">For: {recipe.title}</p>
                </div>
                <Link to={`/recipes/${id}/journal/new`}>
                    <Button>+ New Entry</Button>
                </Link>
            </div>

            <div className="flex justify-end mb-4">
                <button
                    onClick={toggleSort}
                    className="text-sm flex items-center gap-1 text-gray-600 hover:text-gray-900"
                >
                    Sort by Date {sortOrder === 'desc' ? '↓' : '↑'}
                </button>
            </div>

            {sortedEntries.length === 0 ? (
                <EmptyState
                    icon={<span className="text-4xl">📝</span>}
                    title="No journal entries yet"
                    description="Log your first bake to start tracking progress, notes, and photos."
                    action={{
                        label: 'Add Journal Entry',
                        onClick: () => {
                            window.location.href = `/recipes/${id}/journal/new`;
                        }
                    }}
                />
            ) : (
                <div className="space-y-4">
                    {sortedEntries.map((entry) => (
                        <Link
                            key={entry.id}
                            to={`/journal/${entry.id}`}
                            className="block bg-white border border-gray-200 rounded-xl p-5 hover:border-amber-500 hover:shadow-sm transition-all"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-lg font-bold text-gray-900">
                                    {format(new Date(entry.bake_date), 'PPP')}
                                </h3>
                                {entry.rating && (
                                    <div className="flex items-center text-amber-500 text-sm font-medium bg-amber-50 px-2 py-1 rounded">
                                        ★ {entry.rating}/5
                                    </div>
                                )}
                            </div>

                            {entry.notes && (
                                <p className="text-gray-600 mb-4 line-clamp-2">
                                    {entry.notes}
                                </p>
                            )}

                            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                {entry.pre_bake_weight_grams && (
                                    <div>Pre-bake: <span className="font-medium text-gray-900">{entry.pre_bake_weight_grams}g</span></div>
                                )}
                                {entry.outcome_weight_grams && (
                                    <div>Outcome: <span className="font-medium text-gray-900">{entry.outcome_weight_grams}g</span></div>
                                )}
                                {entry.baking_loss_percentage && (
                                    <div>Loss: <span className="font-medium text-amber-600">{entry.baking_loss_percentage.toFixed(1)}%</span></div>
                                )}
                            </div>

                            {entry.images && entry.images.length > 0 && (
                                <div className="mt-4 flex gap-2">
                                    {entry.images.slice(0, 3).map((img, idx) => (
                                        <div key={idx} className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden border border-gray-200">
                                            <img src={img} alt="Bake thumbnail" className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                    {entry.images.length > 3 && (
                                        <div className="w-16 h-16 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500 font-medium text-xs border border-gray-200">
                                            +{entry.images.length - 3} more
                                        </div>
                                    )}
                                </div>
                            )}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};
