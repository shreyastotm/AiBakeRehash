import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useJournalEntries } from '../../hooks/useJournalEntries';
import { JournalEntryForm } from '../../components/journal/JournalEntryForm';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { ChevronLeft } from 'lucide-react';

export const JournalEntryEdit = () => {
    const { recipeId, entryId } = useParams<{ recipeId: string; entryId: string }>();
    const navigate = useNavigate();

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
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 transition-colors mb-6"
            >
                <ChevronLeft size={16} /> Back to Entry
            </button>

            <h1 className="page-title mb-8">Edit Entry</h1>

            <JournalEntryForm recipeId={recipeId!} initialData={entry} />
        </div>
    );
};
