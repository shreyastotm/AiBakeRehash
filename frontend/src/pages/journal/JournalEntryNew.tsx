import { useParams, Link } from 'react-router-dom';
import { JournalEntryForm } from '../../components/journal/JournalEntryForm';

export const JournalEntryNew = () => {
    const { recipeId } = useParams<{ recipeId: string }>();

    if (!recipeId) {
        return <div>Recipe ID missing</div>;
    }

    return (
        <div className="container mx-auto px-4 py-6 max-w-4xl">
            <Link to={`/recipes/${recipeId}`} className="text-sm text-gray-500 hover:text-amber-700 mb-6 inline-flex items-center gap-1 transition-colors">
                ← Back to Recipe
            </Link>

            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Log a Bake</h1>
                <p className="text-gray-600">Document your baking process, track metrics, and add notes for your recipe.</p>
            </div>

            <JournalEntryForm recipeId={recipeId} />
        </div>
    );
};
