import { useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useJournalEntries, useDeleteJournalEntry } from '../../hooks/useJournalEntries';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { format } from 'date-fns';
import { ChevronLeft, Star, Pencil } from 'lucide-react';
import { MEDIA_BASE_URL } from '../../services/api';

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
            {/* Page header */}
            <div className="page-header">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 transition-colors mb-4"
                >
                    <ChevronLeft size={16} /> Back to Journal
                </button>
                <div className="flex items-center justify-between">
                    <h1 className="page-title">
                        {entry.recipe_title ?? 'Baking Session'}
                    </h1>
                    <div className="flex gap-2">
                        <Link to={`/recipes/${recipeId}/journal/${entryId}/edit`}>
                            <Button variant="outline" size="sm" leftIcon={<Pencil size={14} />}>Edit</Button>
                        </Link>
                        <Button variant="danger" size="sm" disabled={deleteMutation.isPending} onClick={handleDelete}>
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Meta section: date, rating */}
            <div className="card p-6 mb-6">
                <div className="flex flex-wrap gap-6">
                    <div>
                        <p className="text-xs text-neutral-500 font-medium uppercase tracking-wide mb-1">Date</p>
                        <p className="text-sm font-semibold text-neutral-800">
                            {format(new Date(entry.bake_date), 'PPPP')}
                        </p>
                    </div>
                    {entry.rating != null && (
                        <div>
                            <p className="text-xs text-neutral-500 font-medium uppercase tracking-wide mb-1">Rating</p>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                        key={i}
                                        size={16}
                                        className={i < entry.rating! ? 'text-accent-500 fill-accent-500' : 'text-neutral-200 fill-neutral-200'}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    {/* Metrics */}
                    <section className="card">
                        <div className="card-header">
                            <h2 className="text-base font-semibold text-neutral-800">Metrics</h2>
                        </div>
                        <div className="card-body">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-neutral-50 p-4 rounded-lg border border-neutral-100">
                                <div>
                                    <div className="text-xs text-neutral-500 mb-1">Pre-bake</div>
                                    <div className="font-semibold text-neutral-900">{entry.pre_bake_weight_grams ? `${entry.pre_bake_weight_grams}g` : '-'}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-neutral-500 mb-1">Outcome</div>
                                    <div className="font-semibold text-neutral-900">{entry.outcome_weight_grams ? `${entry.outcome_weight_grams}g` : '-'}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-neutral-500 mb-1">Baking Loss</div>
                                    <div className="font-semibold text-accent-600">{entry.baking_loss_percentage != null ? `${Number(entry.baking_loss_percentage).toFixed(1)}%` : '-'}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-neutral-500 mb-1">Water Activity</div>
                                    <div className="font-semibold text-neutral-900">{entry.measured_water_activity ?? '-'}</div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Notes */}
                    {entry.notes && (
                        <section className="card mb-6">
                            <div className="card-header"><h2 className="text-base font-semibold text-neutral-800">Notes</h2></div>
                            <div className="card-body">
                                <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">{entry.notes}</p>
                            </div>
                        </section>
                    )}

                    {/* Private Notes */}
                    {entry.private_notes && (
                        <section className="card mb-6">
                            <div className="card-header"><h2 className="text-base font-semibold text-neutral-500">Private Notes</h2></div>
                            <div className="card-body">
                                <p className="text-sm text-neutral-600 italic leading-relaxed whitespace-pre-wrap bg-neutral-50 p-4 rounded-lg border border-neutral-100">
                                    {entry.private_notes}
                                </p>
                            </div>
                        </section>
                    )}

                    {/* Audio Notes */}
                    {entry.audio_notes && entry.audio_notes.length > 0 && (
                        <section className="card">
                            <div className="card-header">
                                <h2 className="text-base font-semibold text-neutral-800">Audio Notes</h2>
                            </div>
                            <div className="card-body space-y-3">
                                {entry.audio_notes.map((audio) => (
                                    <div key={audio.id} className="border border-neutral-200 rounded-lg p-4 bg-neutral-50 flex flex-col gap-2">
                                        <audio controls src={audio.audio_url.startsWith('http') ? audio.audio_url : `${MEDIA_BASE_URL}${audio.audio_url}`} className="w-full" />
                                        {audio.transcription_text ? (
                                            <p className="text-sm text-neutral-700 italic border-l-2 border-accent-400 pl-3">
                                                "{audio.transcription_text}"
                                            </p>
                                        ) : (
                                            <p className="text-xs text-neutral-500">Transcription {audio.transcription_status}...</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                {/* Photos sidebar */}
                <div className="md:col-span-1">
                    <section className="card">
                        <div className="card-header">
                            <h2 className="text-base font-semibold text-neutral-800">Photos</h2>
                        </div>
                        <div className="card-body">
                            {entry.images && entry.images.length > 0 ? (
                                <div className="grid grid-cols-2 gap-2">
                                    {entry.images.map((img, i) => (
                                        <a
                                            href={img.startsWith('http') ? img : `${MEDIA_BASE_URL}${img}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            key={i}
                                            className="aspect-square bg-neutral-100 rounded-lg overflow-hidden border border-neutral-200 hover:border-primary-400 transition-colors"
                                        >
                                            <img
                                                src={img.startsWith('http') ? img : `${MEDIA_BASE_URL}${img}`}
                                                alt={`Journal entry snapshot ${i}`}
                                                className="w-full h-full object-cover"
                                            />
                                        </a>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-neutral-400 text-sm py-4 text-center bg-neutral-50 rounded-lg border border-dashed border-neutral-200">
                                    No photos attached
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};
