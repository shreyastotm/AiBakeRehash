import { useParams, useNavigate } from 'react-router-dom';
import { JournalEntryForm } from '../../components/journal/JournalEntryForm';
import { ChevronLeft } from 'lucide-react';

export const JournalEntryNew = () => {
    const { recipeId } = useParams<{ recipeId: string }>();
    const navigate = useNavigate();

    if (!recipeId) {
        return <div>Recipe ID missing</div>;
    }

    return (
        <div className="container mx-auto px-4 py-6 max-w-4xl">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 transition-colors mb-6"
            >
                <ChevronLeft size={16} /> Back to Recipe
            </button>

            <h1 className="page-title mb-8">Log a Bake</h1>

            <JournalEntryForm recipeId={recipeId} />
        </div>
    );
};
