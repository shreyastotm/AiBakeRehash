// ---------------------------------------------------------------------------
// Journal model types — mirrors recipe_journal_entries and recipe_audio_notes
// ---------------------------------------------------------------------------

export type TranscriptionStatus = 'pending' | 'processing' | 'completed' | 'failed';

// ---------------------------------------------------------------------------
// Core interfaces
// ---------------------------------------------------------------------------

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
  created_at: Date;
  updated_at: Date;
}

export interface AudioNote {
  id: string;
  journal_entry_id: string;
  audio_url: string;
  duration_seconds: number | null;
  transcription_text: string | null;
  transcription_status: TranscriptionStatus;
  recorded_at_stage: string | null;
  created_at: Date;
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Full journal entry with audio notes
// ---------------------------------------------------------------------------

export interface JournalEntryWithAudio extends JournalEntry {
  audio_notes: AudioNote[];
}
