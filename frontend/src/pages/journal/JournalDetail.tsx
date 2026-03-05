import React, { useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useJournalEntries, useDeleteJournalEntry } from '../../hooks/useJournalEntries';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { format } from 'date-fns';

export const JournalDetail = () => {
    const { recipeId, entryId } = useParams<{ recipeId: string; entryId: string }>();
    const navigate = useNavigate();

    // If we only have entryId, we might need a way to look it up, 
    // but if we enforce routing like `/recipes/:recipeId/journal/:entryId` it is easier.
    // Assuming route is `/recipes/:recipeId/journal/:entryId`
    const { data: entries, isLoading, error } = useJournalEntries(recipeId!);
    const deleteMutation = useDeleteJournalEntry();

    const entry = useMemo(() => {
        return entries?.find(e => e.id === entryId);
    }, [entries, entryId]);

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this journal entry?')) {
            try {
                await deleteMutation.mutateAsync({ journalId: entryId!, recipeId: recipeId! });
                navigate(`/recipes/${recipeId}/journal`);
            } catch (e) {
                console.error('Failed to delete', e);
            }
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-12">
                <LoadingSpinner />
            </div>
        );
    }

    if (error || !entry) {
        return <EmptyState title="Entry not found" description="The journal entry you are looking for does not exist." />;
    }

    return (
        <div className="container mx-auto px-4 py-6 max-w-4xl">
            <Link to={`/recipes/${recipeId}/journal`} className="text-sm text-gray-500 hover:text-gray-900 mb-6 inline-block">
                ← Back to Journal List
            </Link>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-1">
                            Bake Session: {format(new Date(entry.bake_date), 'PPP')}
                        </h1>
                        <div className="flex items-center gap-3 mt-2">
                            {entry.rating && (
                                <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded text-sm font-semibold">
                                    ★ {entry.rating} / 5
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Link to={`/recipes/${recipeId}/journal/${entryId}/edit`}>
                            <Button variant="secondary">Edit Entry</Button>
                        </Link>
                        <Button variant="danger" disabled={deleteMutation.isPending} onClick={handleDelete}>
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                        </Button>
                    </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-6">
                        <section>
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Metrics</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                                <div>
                                    <div className="text-xs text-gray-500 mb-1">Pre-bake</div>
                                    <div className="font-semibold text-gray-900">{entry.pre_bake_weight_grams ? `${entry.pre_bake_weight_grams}g` : '-'}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 mb-1">Outcome</div>
                                    <div className="font-semibold text-gray-900">{entry.outcome_weight_grams ? `${entry.outcome_weight_grams}g` : '-'}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 mb-1">Baking Loss</div>
                                    <div className="font-semibold text-amber-600">{entry.baking_loss_percentage != null ? `${Number(entry.baking_loss_percentage).toFixed(1)}%` : '-'}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 mb-1">Water Activity</div>
                                    <div className="font-semibold text-gray-900">{entry.measured_water_activity ?? '-'}</div>
                                </div>
                            </div>
                        </section>

                        {entry.notes && (
                            <section>
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Notes</h3>
                                <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                                    {entry.notes}
                                </div>
                            </section>
                        )}

                        {entry.private_notes && (
                            <section>
                                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Private Notes</h3>
                                <div className="text-gray-600 italic whitespace-pre-wrap leading-relaxed bg-gray-50 p-4 rounded-lg border border-gray-100">
                                    {entry.private_notes}
                                </div>
                            </section>
                        )}

                        {entry.audio_notes && entry.audio_notes.length > 0 && (
                            <section>
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Audio Notes</h3>
                                <div className="space-y-3">
                                    {entry.audio_notes.map((audio) => (
                                        <div key={audio.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex flex-col gap-2">
                                            <audio controls src={audio.audio_url} className="w-full" />
                                            {audio.transcription_text ? (
                                                <p className="text-sm text-gray-700 italic border-l-2 border-amber-400 pl-3">
                                                    "{audio.transcription_text}"
                                                </p>
                                            ) : (
                                                <p className="text-xs text-gray-500">Transcription {audio.transcription_status}...</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>

                    <div className="md:col-span-1 border-t md:border-t-0 md:border-l border-gray-100 pt-6 md:pt-0 md:pl-6 space-y-6">
                        <section>
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Photos</h3>
                            {entry.images && entry.images.length > 0 ? (
                                <div className="grid grid-cols-2 gap-2">
                                    {entry.images.map((img, i) => (
                                        <a href={img} target="_blank" rel="noreferrer" key={i} className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200 hover:border-amber-400 transition-colors">
                                            <img src={img} alt={`Journal entry snapshot ${i}`} className="w-full h-full object-cover" />
                                        </a>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-gray-400 text-sm py-4 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                    No photos attached
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
};
