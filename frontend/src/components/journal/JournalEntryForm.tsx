import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRecipe } from '../../hooks/useRecipes';
import {
    useCreateJournalEntry,
    useUploadJournalImages,
    useUploadJournalAudio
} from '../../hooks/useJournalEntries';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { ImageUpload } from './ImageUpload';
import { AudioRecorder } from './AudioRecorder';
import { useNavigate } from 'react-router-dom';

interface JournalFormValues {
    bake_date: string;
    notes: string;
    private_notes: string;
    rating: number | '';
    outcome_weight_grams: number | '';
    pre_bake_weight_grams: number | '';
    measured_water_activity: number | '';
    storage_days_achieved: number | '';
    deduct_inventory: boolean;
}

interface JournalEntryFormProps {
    recipeId: string;
}

export const JournalEntryForm: React.FC<JournalEntryFormProps> = ({ recipeId }) => {
    const navigate = useNavigate();
    const { data: recipe } = useRecipe(recipeId);
    // recipe data is currently just used for routing verification or header, maybe remove if not used here
    console.log(recipe?.title);
    const createMutation = useCreateJournalEntry();
    const uploadImagesMutation = useUploadJournalImages();
    const uploadAudioMutation = useUploadJournalAudio();

    const [images, setImages] = useState<File[]>([]);
    const [audioFile, setAudioFile] = useState<{ file: File, duration: number } | null>(null);

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<JournalFormValues>({
        defaultValues: {
            bake_date: new Date().toISOString().split('T')[0],
            notes: '',
            private_notes: '',
            rating: '',
            outcome_weight_grams: '',
            pre_bake_weight_grams: '',
            measured_water_activity: '',
            storage_days_achieved: '',
            deduct_inventory: false,
        }
    });

    const onSubmit = async (data: JournalFormValues) => {
        try {
            const payload = {
                bake_date: new Date(data.bake_date).toISOString(),
                notes: data.notes || null,
                private_notes: data.private_notes || null,
                rating: data.rating !== '' ? Number(data.rating) : null,
                outcome_weight_grams: data.outcome_weight_grams !== '' ? Number(data.outcome_weight_grams) : null,
                pre_bake_weight_grams: data.pre_bake_weight_grams !== '' ? Number(data.pre_bake_weight_grams) : null,
                measured_water_activity: data.measured_water_activity !== '' ? Number(data.measured_water_activity) : null,
                storage_days_achieved: data.storage_days_achieved !== '' ? Number(data.storage_days_achieved) : null,
                deduct_inventory: data.deduct_inventory
            };

            const entry = await createMutation.mutateAsync({ recipeId, data: payload });

            if (images.length > 0) {
                await uploadImagesMutation.mutateAsync({ journalId: entry.id, files: images });
            }

            if (audioFile) {
                await uploadAudioMutation.mutateAsync({
                    journalId: entry.id,
                    file: audioFile.file,
                    durationSeconds: audioFile.duration
                });
            }

            navigate(`/recipes/${recipeId}/journal/${entry.id}`);
        } catch (error) {
            console.error('Failed to create journal entry:', error);
            alert('An error occurred while saving the journal entry.');
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 bg-white p-6 rounded-xl border border-gray-200">

            <section className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2">Basic Info</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Bake Date *"
                        type="date"
                        {...register('bake_date', { required: 'Date is required' })}
                        error={errors.bake_date?.message}
                    />
                    <Input
                        label="Rating (1-5)"
                        type="number"
                        min="1" max="5"
                        {...register('rating', { min: { value: 1, message: 'Min 1' }, max: { value: 5, message: 'Max 5' } })}
                        error={errors.rating?.message}
                    />
                </div>
            </section>

            <section className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2">Metrics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                        label="Pre-bake Weight (g)"
                        type="number"
                        step="0.1"
                        min="0"
                        {...register('pre_bake_weight_grams', { min: 0 })}
                        error={errors.pre_bake_weight_grams?.message}
                    />
                    <Input
                        label="Outcome Weight (g)"
                        type="number"
                        step="0.1"
                        min="0"
                        {...register('outcome_weight_grams', { min: 0 })}
                        error={errors.outcome_weight_grams?.message}
                    />
                    <Input
                        label="Water Activity (Aw)"
                        type="number"
                        step="0.01"
                        min="0" max="1"
                        {...register('measured_water_activity', { min: 0, max: 1 })}
                        error={errors.measured_water_activity?.message}
                    />
                </div>
            </section>

            <section className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2">Notes & Media</h3>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Public Notes</label>
                    <textarea
                        className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        rows={3}
                        placeholder="How did the bake turn out? Any modifications?"
                        {...register('notes')}
                    />
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Private Notes</label>
                    <textarea
                        className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        rows={2}
                        placeholder="Costing notes, secret adjustments, etc..."
                        {...register('private_notes')}
                    />
                </div>

                <div className="pt-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Photos</label>
                    <ImageUpload
                        images={[]}
                        onFilesSelect={(files) => setImages(prev => [...prev, ...files])}
                        disabled={isSubmitting}
                    />
                </div>

                <div className="pt-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Audio Note</label>
                    <AudioRecorder
                        onRecordingComplete={(file, duration) => setAudioFile({ file, duration })}
                        disabled={isSubmitting}
                    />
                </div>
            </section>

            <section className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        className="w-5 h-5 text-amber-600 rounded border-amber-300 focus:ring-amber-500"
                        {...register('deduct_inventory')}
                    />
                    <div>
                        <span className="block text-sm font-medium text-amber-900">Deduct from inventory</span>
                        <span className="block text-xs text-amber-700 mt-0.5">Automatically subtract these ingredients from your stock.</span>
                    </div>
                </label>
            </section>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button variant="ghost" type="button" onClick={() => navigate(-1)} disabled={isSubmitting}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} loading={isSubmitting}>
                    Save Journal Entry
                </Button>
            </div>

        </form>
    )
}
