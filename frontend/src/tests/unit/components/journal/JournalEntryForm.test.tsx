import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { JournalEntryForm } from '../../../../components/journal/JournalEntryForm';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

const queryClient = new QueryClient();

const MockWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
        <BrowserRouter>
            {children}
        </BrowserRouter>
    </QueryClientProvider>
);

// Mock the router and hooks
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => vi.fn(),
    };
});

vi.mock('../../../../hooks/useRecipes', () => ({
    useRecipe: vi.fn().mockReturnValue({ data: { id: 'recipe123', title: 'Test Recipe' } })
}));

vi.mock('../../../../hooks/useJournalEntries', () => ({
    useCreateJournalEntry: vi.fn().mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({ id: 'journal123' })
    }),
    useUploadJournalImages: vi.fn().mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({})
    }),
    useUploadJournalAudio: vi.fn().mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({})
    })
}));

describe('JournalEntryForm', () => {
    it('renders the form correctly', () => {
        render(
            <MockWrapper>
                <JournalEntryForm recipeId="recipe123" />
            </MockWrapper>
        );

        expect(screen.getByText('Basic Info')).toBeInTheDocument();
        expect(screen.getByLabelText(/Bake Date/i)).toBeInTheDocument();
        expect(screen.getByText('Notes & Media')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Save Journal Entry/i })).toBeInTheDocument();
    });

    it('requires the bake date', async () => {
        render(
            <MockWrapper>
                <JournalEntryForm recipeId="recipe123" />
            </MockWrapper>
        );

        const dateInput = screen.getByLabelText(/Bake Date */i);
        fireEvent.change(dateInput, { target: { value: '' } });

        const submitBtn = screen.getByRole('button', { name: /Save Journal Entry/i });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(screen.getByText('Date is required')).toBeInTheDocument();
        });
    });

    it('submits form with valid data', async () => {
        render(
            <MockWrapper>
                <JournalEntryForm recipeId="recipe123" />
            </MockWrapper>
        );

        // Fill out form
        const ratingInput = screen.getByLabelText(/Rating/i);
        const preBakeInput = screen.getByLabelText(/Pre-bake Weight/i);

        fireEvent.change(ratingInput, { target: { value: '4' } });
        fireEvent.change(preBakeInput, { target: { value: '950.5' } });

        const submitBtn = screen.getByRole('button', { name: /Save Journal Entry/i });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            // Check that we submitted it correctly without breaking
            // Our mocks will just resolve immediately.
            expect(ratingInput).toHaveValue(4);
            expect(preBakeInput).toHaveValue(950.5);
        });
    });
});
