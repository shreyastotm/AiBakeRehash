import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import path from 'path';

// ---------------------------------------------------------------------------
// In-memory stores for mocking
// ---------------------------------------------------------------------------

interface MockUser {
  id: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  unit_preferences: Record<string, string>;
  default_currency: string;
  language: string;
  created_at: Date;
  updated_at: Date;
}

interface MockRecipe {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  source_type: string;
  source_url: string | null;
  original_author: string | null;
  original_author_url: string | null;
  servings: number;
  yield_weight_grams: number;
  preferred_unit_system: string;
  status: string;
  target_water_activity: number | null;
  min_safe_water_activity: number | null;
  estimated_shelf_life_days: number | null;
  total_hydration_percentage: number | null;
  created_at: Date;
  updated_at: Date;
}

interface MockVersion {
  id: string;
  recipe_id: string;
  version_number: number;
  change_summary: string | null;
  created_at: Date;
}

interface MockJournalEntry {
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

interface MockAudioNote {
  id: string;
  journal_entry_id: string;
  audio_url: string;
  duration_seconds: number | null;
  transcription_text: string | null;
  transcription_status: string;
  recorded_at_stage: string | null;
  created_at: Date;
}

let mockUsers: MockUser[] = [];
let mockRecipes: MockRecipe[] = [];
let mockVersions: MockVersion[] = [];
let mockJournalEntries: MockJournalEntry[] = [];
let mockAudioNotes: MockAudioNote[] = [];
let mockBlacklist: Set<string> = new Set();
let transactionRolledBack = false;

function uid(): string {
  const hex = () => Math.random().toString(16).slice(2, 6);
  return hex() + hex() + '-' + hex() + '-4' + hex().slice(1) + '-a' + hex().slice(1) + '-' + hex() + hex() + hex();
}

// ---------------------------------------------------------------------------
// Mock database query handler
// ---------------------------------------------------------------------------

function handleQuery(text: string, params?: unknown[]): { rows: unknown[]; rowCount: number } {
  // --- Users ---
  if (text.includes('FROM users WHERE email')) {
    const email = params?.[0] as string;
    const found = mockUsers.filter((u) => u.email === email);
    return { rows: found, rowCount: found.length };
  }
  if (text.includes('FROM users WHERE id')) {
    const id = params?.[0] as string;
    const found = mockUsers.filter((u) => u.id === id);
    return { rows: found, rowCount: found.length };
  }
  if (text.includes('INSERT INTO users')) {
    const newUser: MockUser = {
      id: uid(), email: params?.[0] as string, password_hash: params?.[1] as string,
      display_name: (params?.[2] as string) || null,
      unit_preferences: JSON.parse((params?.[3] as string) || '{}'),
      default_currency: (params?.[4] as string) || 'INR',
      language: (params?.[5] as string) || 'en',
      created_at: new Date(), updated_at: new Date(),
    };
    mockUsers.push(newUser);
    return { rows: [newUser], rowCount: 1 };
  }

  // --- Recipes ---
  if (text.includes('FROM recipes WHERE id')) {
    const id = params?.[0] as string;
    const found = mockRecipes.filter((r) => r.id === id);
    return { rows: found, rowCount: found.length };
  }

  // --- Recipe Versions ---
  if (text.includes('FROM recipe_versions WHERE recipe_id') && text.includes('ORDER BY version_number DESC LIMIT 1')) {
    const recipeId = params?.[0] as string;
    const versions = mockVersions.filter((v) => v.recipe_id === recipeId).sort((a, b) => b.version_number - a.version_number);
    return { rows: versions.length > 0 ? [versions[0]] : [], rowCount: versions.length > 0 ? 1 : 0 };
  }

  // --- Journal Entries ---
  if (text.includes('FROM recipe_journal_entries WHERE recipe_id') && text.includes('ORDER BY')) {
    const recipeId = params?.[0] as string;
    const found = mockJournalEntries.filter((j) => j.recipe_id === recipeId)
      .sort((a, b) => new Date(b.bake_date).getTime() - new Date(a.bake_date).getTime());
    return { rows: found, rowCount: found.length };
  }
  if (text.includes('DELETE') && text.includes('FROM recipe_journal_entries WHERE id')) {
    const id = params?.[0] as string;
    const idx = mockJournalEntries.findIndex((j) => j.id === id);
    if (idx >= 0) {
      mockJournalEntries.splice(idx, 1);
      mockAudioNotes = mockAudioNotes.filter((a) => a.journal_entry_id !== id);
    }
    return { rows: [], rowCount: idx >= 0 ? 1 : 0 };
  }
  if (text.includes('SELECT') && text.includes('FROM recipe_journal_entries WHERE id')) {
    const id = params?.[0] as string;
    const found = mockJournalEntries.filter((j) => j.id === id);
    return { rows: found, rowCount: found.length };
  }
  if (text.includes('INSERT INTO recipe_journal_entries')) {
    const newEntry: MockJournalEntry = {
      id: uid(),
      recipe_id: params?.[0] as string,
      user_id: params?.[1] as string,
      bake_date: params?.[2] as string,
      notes: params?.[3] as string | null,
      private_notes: params?.[4] as string | null,
      rating: params?.[5] as number | null,
      outcome_weight_grams: params?.[6] as number | null,
      pre_bake_weight_grams: params?.[7] as number | null,
      baking_loss_grams: params?.[8] as number | null,
      baking_loss_percentage: params?.[9] as number | null,
      measured_water_activity: params?.[10] as number | null,
      storage_days_achieved: params?.[11] as number | null,
      images: JSON.parse((params?.[12] as string) || '[]'),
      recipe_version_id: params?.[13] as string | null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    if (!transactionRolledBack) mockJournalEntries.push(newEntry);
    return { rows: [newEntry], rowCount: 1 };
  }
  if (text.includes('UPDATE recipe_journal_entries SET') && text.includes('images')) {
    const images = JSON.parse(params?.[0] as string);
    const id = params?.[1] as string;
    const entry = mockJournalEntries.find((j) => j.id === id);
    if (entry) {
      entry.images = images;
      entry.updated_at = new Date();
    }
    return { rows: entry ? [entry] : [], rowCount: entry ? 1 : 0 };
  }
  if (text.includes('UPDATE recipe_journal_entries SET')) {
    // Generic update — find the entry by the last param (id)
    const id = params?.[params!.length - 1] as string;
    const entry = mockJournalEntries.find((j) => j.id === id);
    if (entry) {
      // Parse SET clauses from params in order
      let pIdx = 0;
      if (text.includes('bake_date =')) entry.bake_date = params?.[pIdx++] as string;
      if (text.includes('notes =')) entry.notes = params?.[pIdx++] as string | null;
      if (text.includes('private_notes =')) entry.private_notes = params?.[pIdx++] as string | null;
      if (text.includes('rating =')) entry.rating = params?.[pIdx++] as number | null;
      if (text.includes('outcome_weight_grams =') && !text.includes('pre_bake_weight_grams =')) {
        entry.outcome_weight_grams = params?.[pIdx++] as number | null;
      }
      if (text.includes('pre_bake_weight_grams =')) {
        // Both weights might be updated
        if (text.includes('outcome_weight_grams =')) {
          entry.outcome_weight_grams = params?.[pIdx++] as number | null;
        }
        entry.pre_bake_weight_grams = params?.[pIdx++] as number | null;
      }
      if (text.includes('baking_loss_grams =')) entry.baking_loss_grams = params?.[pIdx++] as number | null;
      if (text.includes('baking_loss_percentage =')) entry.baking_loss_percentage = params?.[pIdx++] as number | null;
      entry.updated_at = new Date();
    }
    return { rows: entry ? [entry] : [], rowCount: entry ? 1 : 0 };
  }
  if (text.includes('DELETE') && text.includes('FROM recipe_journal_entries WHERE id')) {
    const id = params?.[0] as string;
    const idx = mockJournalEntries.findIndex((j) => j.id === id);
    if (idx >= 0) {
      mockJournalEntries.splice(idx, 1);
      mockAudioNotes = mockAudioNotes.filter((a) => a.journal_entry_id !== id);
    }
    return { rows: [], rowCount: idx >= 0 ? 1 : 0 };
  }

  // --- Audio Notes ---
  if (text.includes('FROM recipe_audio_notes WHERE journal_entry_id') && text.includes('ORDER BY')) {
    const journalId = params?.[0] as string;
    const found = mockAudioNotes.filter((a) => a.journal_entry_id === journalId);
    return { rows: found, rowCount: found.length };
  }
  if (text.includes('INSERT INTO recipe_audio_notes')) {
    const newAudio: MockAudioNote = {
      id: uid(),
      journal_entry_id: params?.[0] as string,
      audio_url: params?.[1] as string,
      duration_seconds: params?.[2] as number | null,
      transcription_text: null,
      transcription_status: 'pending',
      recorded_at_stage: params?.[3] as string | null,
      created_at: new Date(),
    };
    mockAudioNotes.push(newAudio);
    return { rows: [newAudio], rowCount: 1 };
  }

  // --- Transaction commands ---
  if (text === 'BEGIN' || text === 'COMMIT') return { rows: [], rowCount: 0 };
  if (text === 'ROLLBACK') { transactionRolledBack = true; return { rows: [], rowCount: 0 }; }

  return { rows: [], rowCount: 0 };
}

// ---------------------------------------------------------------------------
// Mock modules
// ---------------------------------------------------------------------------

vi.mock('../../src/config/database', () => ({
  db: {
    query: vi.fn(async (text: string, params?: unknown[]) => handleQuery(text, params)),
    getClient: vi.fn(async () => ({
      query: vi.fn(async (text: string, params?: unknown[]) => handleQuery(text, params)),
      release: vi.fn(),
    })),
    withTransaction: vi.fn(async (fn: (client: unknown) => Promise<unknown>) => {
      transactionRolledBack = false;
      const client = {
        query: vi.fn(async (text: string, params?: unknown[]) => {
          if (transactionRolledBack) return { rows: [], rowCount: 0 };
          return handleQuery(text, params);
        }),
        release: vi.fn(),
      };
      try {
        handleQuery('BEGIN');
        const result = await fn(client);
        handleQuery('COMMIT');
        return result;
      } catch (err) {
        handleQuery('ROLLBACK');
        throw err;
      }
    }),
    connect: vi.fn(),
    checkHealth: vi.fn(async () => ({ healthy: true, latencyMs: 1, pool: { total: 1, idle: 1, waiting: 0 } })),
    close: vi.fn(),
  },
}));

vi.mock('../../src/config/redis', () => ({
  redis: {
    getClient: vi.fn(async () => ({
      set: vi.fn(async (_key: string) => { mockBlacklist.add(_key.replace('token:blacklist:', '')); return 'OK'; }),
      get: vi.fn(async (key: string) => { const t = key.replace('token:blacklist:', ''); return mockBlacklist.has(t) ? '1' : null; }),
      ping: vi.fn(async () => 'PONG'),
    })),
    checkHealth: vi.fn(async () => ({ healthy: true, latencyMs: 1 })),
    close: vi.fn(),
  },
}));

vi.mock('../../src/config/storage', () => ({
  storage: { checkHealth: vi.fn(async () => ({ healthy: true, latencyMs: 1 })) },
}));

// Set env vars before importing app
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NODE_ENV = 'test';

import { app } from '../../src/app';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getAuthToken(): Promise<{ token: string; userId: string }> {
  const email = 'journal-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6) + '@example.com';
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password: 'StrongPass1', display_name: 'Test Baker' });
  const userId = mockUsers[mockUsers.length - 1].id;
  return { token: res.body.data.accessToken, userId };
}

function createMockRecipe(userId: string): MockRecipe {
  const recipe: MockRecipe = {
    id: uid(), user_id: userId, title: 'Test Recipe', description: null,
    source_type: 'manual', source_url: null, original_author: null, original_author_url: null,
    servings: 12, yield_weight_grams: 500, preferred_unit_system: 'metric', status: 'active',
    target_water_activity: null, min_safe_water_activity: null, estimated_shelf_life_days: null,
    total_hydration_percentage: null, created_at: new Date(), updated_at: new Date(),
  };
  mockRecipes.push(recipe);

  const version: MockVersion = {
    id: uid(), recipe_id: recipe.id, version_number: 1, change_summary: 'Initial', created_at: new Date(),
  };
  mockVersions.push(version);

  return recipe;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Journal API', () => {
  beforeEach(() => {
    mockUsers = [];
    mockRecipes = [];
    mockVersions = [];
    mockJournalEntries = [];
    mockAudioNotes = [];
    mockBlacklist = new Set();
    transactionRolledBack = false;
  });

  // =========================================================================
  // POST /api/v1/recipes/:id/journal — Create
  // =========================================================================
  describe('POST /api/v1/recipes/:id/journal', () => {
    it('should create a journal entry', async () => {
      const { token, userId } = await getAuthToken();
      const recipe = createMockRecipe(userId);

      const res = await request(app)
        .post(`/api/v1/recipes/${recipe.id}/journal`)
        .set('Authorization', 'Bearer ' + token)
        .send({
          bake_date: '2024-06-15',
          notes: 'Great bake today',
          rating: 4,
          outcome_weight_grams: 450,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.recipe_id).toBe(recipe.id);
      expect(res.body.data.notes).toBe('Great bake today');
      expect(res.body.data.rating).toBe(4);
      expect(res.body.data.recipe_version_id).toBe(mockVersions[0].id);
      expect(res.body.data.audio_notes).toEqual([]);
    });

    it('should calculate baking loss when both weights provided', async () => {
      const { token, userId } = await getAuthToken();
      const recipe = createMockRecipe(userId);

      const res = await request(app)
        .post(`/api/v1/recipes/${recipe.id}/journal`)
        .set('Authorization', 'Bearer ' + token)
        .send({
          bake_date: '2024-06-15',
          pre_bake_weight_grams: 500,
          outcome_weight_grams: 420,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.baking_loss_grams).toBe(80);
      expect(res.body.data.baking_loss_percentage).toBeCloseTo(16, 0);
    });

    it('should reject invalid rating', async () => {
      const { token, userId } = await getAuthToken();
      const recipe = createMockRecipe(userId);

      const res = await request(app)
        .post(`/api/v1/recipes/${recipe.id}/journal`)
        .set('Authorization', 'Bearer ' + token)
        .send({ bake_date: '2024-06-15', rating: 6 });

      expect(res.status).toBe(400);
    });

    it('should reject missing bake_date', async () => {
      const { token, userId } = await getAuthToken();
      const recipe = createMockRecipe(userId);

      const res = await request(app)
        .post(`/api/v1/recipes/${recipe.id}/journal`)
        .set('Authorization', 'Bearer ' + token)
        .send({ notes: 'No date' });

      expect(res.status).toBe(400);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/v1/recipes/a0000000-0000-4000-a000-000000000001/journal')
        .send({ bake_date: '2024-06-15' });

      expect(res.status).toBe(401);
    });

    it('should reject non-existent recipe', async () => {
      const { token } = await getAuthToken();

      const res = await request(app)
        .post('/api/v1/recipes/a0000000-0000-4000-a000-000000000099/journal')
        .set('Authorization', 'Bearer ' + token)
        .send({ bake_date: '2024-06-15' });

      expect(res.status).toBe(404);
    });

    it('should reject recipe owned by another user', async () => {
      const { userId } = await getAuthToken();
      const { token: token2 } = await getAuthToken();
      const recipe = createMockRecipe(userId);

      const res = await request(app)
        .post(`/api/v1/recipes/${recipe.id}/journal`)
        .set('Authorization', 'Bearer ' + token2)
        .send({ bake_date: '2024-06-15' });

      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // GET /api/v1/recipes/:id/journal — List
  // =========================================================================
  describe('GET /api/v1/recipes/:id/journal', () => {
    it('should list journal entries for a recipe', async () => {
      const { token, userId } = await getAuthToken();
      const recipe = createMockRecipe(userId);

      await request(app)
        .post(`/api/v1/recipes/${recipe.id}/journal`)
        .set('Authorization', 'Bearer ' + token)
        .send({ bake_date: '2024-06-15', notes: 'First bake' });

      await request(app)
        .post(`/api/v1/recipes/${recipe.id}/journal`)
        .set('Authorization', 'Bearer ' + token)
        .send({ bake_date: '2024-06-16', notes: 'Second bake' });

      const res = await request(app)
        .get(`/api/v1/recipes/${recipe.id}/journal`)
        .set('Authorization', 'Bearer ' + token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
    });

    it('should return empty array for recipe with no entries', async () => {
      const { token, userId } = await getAuthToken();
      const recipe = createMockRecipe(userId);

      const res = await request(app)
        .get(`/api/v1/recipes/${recipe.id}/journal`)
        .set('Authorization', 'Bearer ' + token);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });
  });

  // =========================================================================
  // PATCH /api/v1/journal/:id — Update
  // =========================================================================
  describe('PATCH /api/v1/journal/:id', () => {
    it('should update a journal entry', async () => {
      const { token, userId } = await getAuthToken();
      const recipe = createMockRecipe(userId);

      const createRes = await request(app)
        .post(`/api/v1/recipes/${recipe.id}/journal`)
        .set('Authorization', 'Bearer ' + token)
        .send({ bake_date: '2024-06-15', notes: 'Original notes', rating: 3 });

      const journalId = createRes.body.data.id;

      const res = await request(app)
        .patch(`/api/v1/journal/${journalId}`)
        .set('Authorization', 'Bearer ' + token)
        .send({ notes: 'Updated notes', rating: 5 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.notes).toBe('Updated notes');
      expect(res.body.data.rating).toBe(5);
    });

    it('should reject update for non-existent entry', async () => {
      const { token } = await getAuthToken();

      const res = await request(app)
        .patch('/api/v1/journal/a0000000-0000-4000-a000-000000000099')
        .set('Authorization', 'Bearer ' + token)
        .send({ notes: 'Updated' });

      expect(res.status).toBe(404);
    });

    it('should reject update for entry owned by another user', async () => {
      const { token: token1, userId: userId1 } = await getAuthToken();
      const { token: token2 } = await getAuthToken();
      const recipe = createMockRecipe(userId1);

      const createRes = await request(app)
        .post(`/api/v1/recipes/${recipe.id}/journal`)
        .set('Authorization', 'Bearer ' + token1)
        .send({ bake_date: '2024-06-15' });

      const journalId = createRes.body.data.id;

      const res = await request(app)
        .patch(`/api/v1/journal/${journalId}`)
        .set('Authorization', 'Bearer ' + token2)
        .send({ notes: 'Hacked' });

      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // DELETE /api/v1/journal/:id — Delete
  // =========================================================================
  describe('DELETE /api/v1/journal/:id', () => {
    it('should delete a journal entry', async () => {
      const { token, userId } = await getAuthToken();
      const recipe = createMockRecipe(userId);

      const createRes = await request(app)
        .post(`/api/v1/recipes/${recipe.id}/journal`)
        .set('Authorization', 'Bearer ' + token)
        .send({ bake_date: '2024-06-15' });

      const journalId = createRes.body.data.id;

      const res = await request(app)
        .delete(`/api/v1/journal/${journalId}`)
        .set('Authorization', 'Bearer ' + token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockJournalEntries).toHaveLength(0);
    });

    it('should reject delete for non-existent entry', async () => {
      const { token } = await getAuthToken();

      const res = await request(app)
        .delete('/api/v1/journal/a0000000-0000-4000-a000-000000000099')
        .set('Authorization', 'Bearer ' + token);

      expect(res.status).toBe(404);
    });
  });

  // =========================================================================
  // POST /api/v1/journal/:id/images — Image Upload
  // =========================================================================
  describe('POST /api/v1/journal/:id/images', () => {
    it('should upload images to a journal entry', async () => {
      const { token, userId } = await getAuthToken();
      const recipe = createMockRecipe(userId);

      const createRes = await request(app)
        .post(`/api/v1/recipes/${recipe.id}/journal`)
        .set('Authorization', 'Bearer ' + token)
        .send({ bake_date: '2024-06-15' });

      const journalId = createRes.body.data.id;

      // Create a small valid JPEG buffer (minimal JPEG header)
      const jpegBuffer = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xD9,
      ]);

      const res = await request(app)
        .post(`/api/v1/journal/${journalId}/images`)
        .set('Authorization', 'Bearer ' + token)
        .attach('images', jpegBuffer, { filename: 'bake-photo.jpg', contentType: 'image/jpeg' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.images).toHaveLength(1);
      expect(res.body.data.images[0]).toContain('bake-photo.jpg');
    });

    it('should reject upload with no files', async () => {
      const { token, userId } = await getAuthToken();
      const recipe = createMockRecipe(userId);

      const createRes = await request(app)
        .post(`/api/v1/recipes/${recipe.id}/journal`)
        .set('Authorization', 'Bearer ' + token)
        .send({ bake_date: '2024-06-15' });

      const journalId = createRes.body.data.id;

      const res = await request(app)
        .post(`/api/v1/journal/${journalId}/images`)
        .set('Authorization', 'Bearer ' + token);

      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // POST /api/v1/journal/:id/audio — Audio Upload
  // =========================================================================
  describe('POST /api/v1/journal/:id/audio', () => {
    it('should upload audio to a journal entry', async () => {
      const { token, userId } = await getAuthToken();
      const recipe = createMockRecipe(userId);

      const createRes = await request(app)
        .post(`/api/v1/recipes/${recipe.id}/journal`)
        .set('Authorization', 'Bearer ' + token)
        .send({ bake_date: '2024-06-15' });

      const journalId = createRes.body.data.id;

      // Create a minimal MP3 buffer (ID3 header)
      const mp3Buffer = Buffer.from([
        0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0xFF, 0xFB, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      ]);

      const res = await request(app)
        .post(`/api/v1/journal/${journalId}/audio`)
        .set('Authorization', 'Bearer ' + token)
        .attach('audio', mp3Buffer, { filename: 'note.mp3', contentType: 'audio/mpeg' })
        .field('duration_seconds', '30')
        .field('recorded_at_stage', 'bake');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.audio_url).toContain('note.mp3');
      expect(res.body.data.duration_seconds).toBe(30);
      expect(res.body.data.recorded_at_stage).toBe('bake');
      expect(res.body.data.transcription_status).toBe('pending');
    });

    it('should reject upload with no audio file', async () => {
      const { token, userId } = await getAuthToken();
      const recipe = createMockRecipe(userId);

      const createRes = await request(app)
        .post(`/api/v1/recipes/${recipe.id}/journal`)
        .set('Authorization', 'Bearer ' + token)
        .send({ bake_date: '2024-06-15' });

      const journalId = createRes.body.data.id;

      const res = await request(app)
        .post(`/api/v1/journal/${journalId}/audio`)
        .set('Authorization', 'Bearer ' + token);

      expect(res.status).toBe(400);
    });
  });
});
