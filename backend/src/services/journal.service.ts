import { PoolClient } from 'pg';
import { db } from '../config/database';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '../middleware/errorHandler';
import {
  JournalEntry,
  JournalEntryWithAudio,
  AudioNote,
  CreateJournalEntryInput,
  UpdateJournalEntryInput,
} from '../models/journal.model';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calculateBakingLoss(
  preBakeWeight: number,
  outcomeWeight: number,
): { baking_loss_grams: number; baking_loss_percentage: number } {
  const baking_loss_grams = preBakeWeight - outcomeWeight;
  const baking_loss_percentage = (baking_loss_grams / preBakeWeight) * 100;
  return { baking_loss_grams, baking_loss_percentage };
}

async function assertRecipeOwnership(
  recipeId: string,
  userId: string,
  client?: PoolClient,
): Promise<void> {
  const queryFn = client
    ? (text: string, params: unknown[]) => client.query(text, params)
    : db.query.bind(db);

  const result = await queryFn('SELECT id, user_id FROM recipes WHERE id = $1', [recipeId]);

  if (!result.rows[0]) {
    throw new NotFoundError('Recipe');
  }
  if (result.rows[0].user_id !== userId) {
    throw new ForbiddenError('You do not own this recipe');
  }
}

async function assertJournalOwnership(
  journalId: string,
  userId: string,
  client?: PoolClient,
): Promise<JournalEntry> {
  const queryFn = client
    ? (text: string, params: unknown[]) => client.query(text, params)
    : db.query.bind(db);

  const result = await queryFn(
    'SELECT * FROM recipe_journal_entries WHERE id = $1',
    [journalId],
  );

  if (!result.rows[0]) {
    throw new NotFoundError('Journal entry');
  }

  const entry = result.rows[0] as JournalEntry;
  if (entry.user_id !== userId) {
    throw new ForbiddenError('You do not own this journal entry');
  }

  return entry;
}

async function getCurrentRecipeVersionId(
  recipeId: string,
  client?: PoolClient,
): Promise<string | null> {
  const queryFn = client
    ? (text: string, params: unknown[]) => client.query(text, params)
    : db.query.bind(db);

  const result = await queryFn(
    'SELECT id FROM recipe_versions WHERE recipe_id = $1 ORDER BY version_number DESC LIMIT 1',
    [recipeId],
  );

  return result.rows[0]?.id || null;
}

async function fetchEntryWithAudio(
  entryId: string,
  client?: PoolClient,
): Promise<JournalEntryWithAudio> {
  const queryFn = client
    ? (text: string, params: unknown[]) => client.query(text, params)
    : db.query.bind(db);

  const entryResult = await queryFn(
    'SELECT * FROM recipe_journal_entries WHERE id = $1',
    [entryId],
  );

  if (!entryResult.rows[0]) {
    throw new NotFoundError('Journal entry');
  }

  const entry = entryResult.rows[0] as JournalEntry;

  const audioResult = await queryFn(
    'SELECT * FROM recipe_audio_notes WHERE journal_entry_id = $1 ORDER BY created_at',
    [entryId],
  );

  return { ...entry, audio_notes: audioResult.rows as AudioNote[] };
}

// ---------------------------------------------------------------------------
// List journal entries for a recipe
// ---------------------------------------------------------------------------

export async function listJournalEntries(
  recipeId: string,
  userId: string,
): Promise<JournalEntryWithAudio[]> {
  await assertRecipeOwnership(recipeId, userId);

  const result = await db.query<JournalEntry>(
    'SELECT * FROM recipe_journal_entries WHERE recipe_id = $1 ORDER BY bake_date DESC, created_at DESC',
    [recipeId],
  );

  const entries: JournalEntryWithAudio[] = [];
  for (const entry of result.rows) {
    const audioResult = await db.query<AudioNote>(
      'SELECT * FROM recipe_audio_notes WHERE journal_entry_id = $1 ORDER BY created_at',
      [entry.id],
    );
    entries.push({ ...entry, audio_notes: audioResult.rows });
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Create journal entry
// ---------------------------------------------------------------------------

export async function createJournalEntry(
  recipeId: string,
  userId: string,
  input: CreateJournalEntryInput,
): Promise<JournalEntryWithAudio> {
  return db.withTransaction(async (client) => {
    await assertRecipeOwnership(recipeId, userId, client);

    // Validate rating
    if (input.rating !== undefined && input.rating !== null) {
      if (input.rating < 1 || input.rating > 5) {
        throw new ValidationError('Rating must be between 1 and 5');
      }
    }

    // Validate water activity
    if (input.measured_water_activity !== undefined && input.measured_water_activity !== null) {
      if (input.measured_water_activity < 0 || input.measured_water_activity > 1) {
        throw new ValidationError('Water activity must be between 0.00 and 1.00');
      }
    }

    // Calculate baking loss if both weights provided
    let bakingLossGrams: number | null = null;
    let bakingLossPercentage: number | null = null;

    if (
      input.pre_bake_weight_grams != null &&
      input.pre_bake_weight_grams > 0 &&
      input.outcome_weight_grams != null &&
      input.outcome_weight_grams > 0
    ) {
      const loss = calculateBakingLoss(input.pre_bake_weight_grams, input.outcome_weight_grams);
      bakingLossGrams = loss.baking_loss_grams;
      bakingLossPercentage = loss.baking_loss_percentage;
    }

    // Get current recipe version
    const recipeVersionId = await getCurrentRecipeVersionId(recipeId, client);

    const result = await client.query<JournalEntry>(
      `INSERT INTO recipe_journal_entries
        (recipe_id, user_id, bake_date, notes, private_notes, rating,
         outcome_weight_grams, pre_bake_weight_grams, baking_loss_grams,
         baking_loss_percentage, measured_water_activity, storage_days_achieved,
         images, recipe_version_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        recipeId,
        userId,
        input.bake_date,
        input.notes || null,
        input.private_notes || null,
        input.rating || null,
        input.outcome_weight_grams || null,
        input.pre_bake_weight_grams || null,
        bakingLossGrams,
        bakingLossPercentage,
        input.measured_water_activity || null,
        input.storage_days_achieved || null,
        JSON.stringify([]),
        recipeVersionId,
      ],
    );

    return { ...result.rows[0], audio_notes: [] };
  });
}

// ---------------------------------------------------------------------------
// Update journal entry
// ---------------------------------------------------------------------------

export async function updateJournalEntry(
  journalId: string,
  userId: string,
  input: UpdateJournalEntryInput,
): Promise<JournalEntryWithAudio> {
  return db.withTransaction(async (client) => {
    const existing = await assertJournalOwnership(journalId, userId, client);

    // Validate rating
    if (input.rating !== undefined && input.rating !== null) {
      if (input.rating < 1 || input.rating > 5) {
        throw new ValidationError('Rating must be between 1 and 5');
      }
    }

    // Validate water activity
    if (input.measured_water_activity !== undefined && input.measured_water_activity !== null) {
      if (input.measured_water_activity < 0 || input.measured_water_activity > 1) {
        throw new ValidationError('Water activity must be between 0.00 and 1.00');
      }
    }

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    const fields: Array<[string, unknown]> = [
      ['bake_date', input.bake_date],
      ['notes', input.notes],
      ['private_notes', input.private_notes],
      ['rating', input.rating],
      ['outcome_weight_grams', input.outcome_weight_grams],
      ['pre_bake_weight_grams', input.pre_bake_weight_grams],
      ['measured_water_activity', input.measured_water_activity],
      ['storage_days_achieved', input.storage_days_achieved],
    ];

    for (const [field, value] of fields) {
      if (value !== undefined) {
        setClauses.push(`${field} = $${paramIdx++}`);
        values.push(value);
      }
    }

    // Recalculate baking loss if weights changed
    const preBake = input.pre_bake_weight_grams !== undefined
      ? input.pre_bake_weight_grams
      : existing.pre_bake_weight_grams;
    const outcome = input.outcome_weight_grams !== undefined
      ? input.outcome_weight_grams
      : existing.outcome_weight_grams;

    if (preBake != null && preBake > 0 && outcome != null && outcome > 0) {
      const loss = calculateBakingLoss(preBake, outcome);
      setClauses.push(`baking_loss_grams = $${paramIdx++}`);
      values.push(loss.baking_loss_grams);
      setClauses.push(`baking_loss_percentage = $${paramIdx++}`);
      values.push(loss.baking_loss_percentage);
    }

    if (setClauses.length > 0) {
      setClauses.push('updated_at = NOW()');
      values.push(journalId);
      await client.query(
        `UPDATE recipe_journal_entries SET ${setClauses.join(', ')} WHERE id = $${paramIdx}`,
        values,
      );
    }

    return fetchEntryWithAudio(journalId, client);
  });
}

// ---------------------------------------------------------------------------
// Delete journal entry
// ---------------------------------------------------------------------------

export async function deleteJournalEntry(
  journalId: string,
  userId: string,
): Promise<void> {
  await assertJournalOwnership(journalId, userId);
  await db.query('DELETE FROM recipe_journal_entries WHERE id = $1', [journalId]);
}

// ---------------------------------------------------------------------------
// Add images to journal entry
// ---------------------------------------------------------------------------

export async function addImages(
  journalId: string,
  userId: string,
  imageUrls: string[],
): Promise<JournalEntryWithAudio> {
  const entry = await assertJournalOwnership(journalId, userId);

  const existingImages: string[] = Array.isArray(entry.images) ? entry.images : [];
  const updatedImages = [...existingImages, ...imageUrls];

  await db.query(
    'UPDATE recipe_journal_entries SET images = $1, updated_at = NOW() WHERE id = $2',
    [JSON.stringify(updatedImages), journalId],
  );

  return fetchEntryWithAudio(journalId);
}

// ---------------------------------------------------------------------------
// Add audio note to journal entry
// ---------------------------------------------------------------------------

export async function addAudioNote(
  journalId: string,
  userId: string,
  audioUrl: string,
  durationSeconds: number | null,
  recordedAtStage: string | null,
): Promise<AudioNote> {
  await assertJournalOwnership(journalId, userId);

  const result = await db.query<AudioNote>(
    `INSERT INTO recipe_audio_notes
      (journal_entry_id, audio_url, duration_seconds, transcription_text,
       transcription_status, recorded_at_stage)
     VALUES ($1, $2, $3, NULL, 'pending', $4)
     RETURNING *`,
    [journalId, audioUrl, durationSeconds, recordedAtStage],
  );

  return result.rows[0];
}

// Exported for testing
export { calculateBakingLoss };
