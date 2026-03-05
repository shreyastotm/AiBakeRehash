import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { journalService, CreateJournalEntryInput, UpdateJournalEntryInput, JournalEntryWithAudio } from '../services/journal.service';

export const useJournalEntries = (recipeId: string) => {
    return useQuery({
        queryKey: ['journal-entries', recipeId],
        queryFn: () => journalService.getJournalEntries(recipeId),
        enabled: !!recipeId,
    });
};

export const useCreateJournalEntry = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ recipeId, data }: { recipeId: string; data: CreateJournalEntryInput }) =>
            journalService.createJournalEntry(recipeId, data),
        onSuccess: (_, { recipeId }) => {
            queryClient.invalidateQueries({ queryKey: ['journal-entries', recipeId] });
        },
    });
};

export const useUpdateJournalEntry = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ journalId, data }: { journalId: string; data: UpdateJournalEntryInput }) =>
            journalService.updateJournalEntry(journalId, data),
        onSuccess: (updatedEntry) => {
            // Invalidate the list for the recipe this entry belongs to
            queryClient.invalidateQueries({ queryKey: ['journal-entries', updatedEntry.recipe_id] });
        },
    });
};

export const useDeleteJournalEntry = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ journalId, recipeId }: { journalId: string; recipeId: string }) =>
            journalService.deleteJournalEntry(journalId).then(() => recipeId),
        onSuccess: (recipeId) => {
            queryClient.invalidateQueries({ queryKey: ['journal-entries', recipeId] });
        },
    });
};

export const useUploadJournalImages = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ journalId, files }: { journalId: string; files: File[] }) =>
            journalService.uploadImages(journalId, files),
        onSuccess: (updatedEntry) => {
            queryClient.invalidateQueries({ queryKey: ['journal-entries', updatedEntry.recipe_id] });
        },
    });
};

export const useUploadJournalAudio = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            journalId,
            file,
            durationSeconds,
            recordedAtStage,
        }: {
            journalId: string;
            file: File;
            durationSeconds?: number;
            recordedAtStage?: string;
        }) => journalService.uploadAudio(journalId, file, durationSeconds, recordedAtStage),
        onSuccess: () => {
            // We don't have the full entry returned here (just AudioNote), so we invalidate all journal entries
            // Or we could pass recipeId if we had it. Let's invalidate globally or by a known pattern.
            // Easiest is to invalidate all journal entries to guarantee freshness.
            queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
        },
    });
};
