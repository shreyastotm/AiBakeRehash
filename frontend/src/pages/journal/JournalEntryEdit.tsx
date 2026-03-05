import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useJournalEntries } from '../../hooks/useJournalEntries';
import { JournalEntryForm } from '../../components/journal/JournalEntryForm';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';

export const JournalEntryEdit = () => {
    const { recipeId, entryId } = useParams<{ recipeId: string; entryId: string }>();

    const { data: entries, isLoading, error } = useJournalEntries(recipeId!);

    const entry = useMemo(() => {
        return entries?.find(e => e.id === entryId);
    }, [entries, entryId]);

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
            <Link to={`/recipes/${recipeId}/journal/${entryId}`} className="text-sm text-gray-500 hover:text-amber-700 mb-6 inline-flex items-center gap-1 transition-colors">
                ← Back to Entry
            </Link>

            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Edit Journal Entry</h1>
                <p className="text-gray-600">Update your baking notes, metrics, and media for this session.</p>
            </div>

            <JournalEntryForm recipeId={recipeId!} initialData={entry} />
        </div>
    );
};
