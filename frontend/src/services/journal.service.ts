import api from './api';
import { TranscriptionStatus } from './api'; // Wait, let me just inline the types if they are only used here.

export type TranscriptionStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface JournalEntry {
    id: string;
    recipe_id: string;
    user_id: string;
    bake_date: string;
    notes: string | null;
    private_notes: string | null;
    rating: number | null;
    outcome_weight_grams: number | null;
    pre_bake_weight_grams: number | null;
    baking_loss_grams: number | null;
    baking_loss_percentage: number | null;
    measured_water_activity: number | null;
    storage_days_achieved: number | null;
    images: string[];
    recipe_version_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface AudioNote {
    id: string;
    journal_entry_id: string;
    audio_url: string;
    duration_seconds: number | null;
    transcription_text: string | null;
    transcription_status: TranscriptionStatus;
    recorded_at_stage: string | null;
    created_at: string;
}

export interface JournalEntryWithAudio extends JournalEntry {
    audio_notes: AudioNote[];
}

export interface CreateJournalEntryInput {
    bake_date: string;
    notes?: string | null;
    private_notes?: string | null;
    rating?: number | null;
    outcome_weight_grams?: number | null;
    pre_bake_weight_grams?: number | null;
    measured_water_activity?: number | null;
    storage_days_achieved?: number | null;
    deduct_inventory?: boolean;
}

export interface UpdateJournalEntryInput {
    bake_date?: string;
    notes?: string | null;
    private_notes?: string | null;
    rating?: number | null;
    outcome_weight_grams?: number | null;
    pre_bake_weight_grams?: number | null;
    measured_water_activity?: number | null;
    storage_days_achieved?: number | null;
}

export const journalService = {
    getJournalEntries: async (recipeId: string): Promise<JournalEntryWithAudio[]> => {
        const response = await api.get(`/recipes/${recipeId}/journal`);
        const payload = response.data?.data ?? response.data;
        return Array.isArray(payload) ? payload : [];
    },

    createJournalEntry: async (recipeId: string, data: CreateJournalEntryInput): Promise<JournalEntryWithAudio> => {
        const response = await api.post(`/recipes/${recipeId}/journal`, data);
        return response.data?.data ?? response.data;
    },

    updateJournalEntry: async (journalId: string, data: UpdateJournalEntryInput): Promise<JournalEntryWithAudio> => {
        const response = await api.patch(`/journal/${journalId}`, data);
        return response.data?.data ?? response.data;
    },

    deleteJournalEntry: async (journalId: string): Promise<void> => {
        await api.delete(`/journal/${journalId}`);
    },

    uploadImages: async (journalId: string, files: File[]): Promise<JournalEntryWithAudio> => {
        const formData = new FormData();
        files.forEach((file) => formData.append('images', file));
        const response = await api.post(`/journal/${journalId}/images`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data?.data ?? response.data;
    },

    uploadAudio: async (
        journalId: string,
        file: File,
        durationSeconds?: number,
        recordedAtStage?: string
    ): Promise<AudioNote> => {
        const formData = new FormData();
        formData.append('audio', file);
        if (durationSeconds) {
            formData.append('duration_seconds', durationSeconds.toString());
        }
        if (recordedAtStage) {
            formData.append('recorded_at_stage', recordedAtStage);
        }

        const response = await api.post(`/journal/${journalId}/audio`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data?.data ?? response.data;
    },
};
