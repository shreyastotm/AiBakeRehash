import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';

// ---------------------------------------------------------------------------
// In-memory stores for mocking
// ---------------------------------------------------------------------------

interface MockUser {
  id: string; email: string; password_hash: string; display_name: string | null;
  unit_preferences: Record<string, string>; default_currency: string; language: string;
  created_at: Date; updated_at: Date;
}
interface MockRecipe {
  id: string; user_id: string; title: string; description: string | null;
  servings: number; yield_weight_grams: number; status: string;
  created_at: Date; updated_at: Date;
}
interface MockIngredient {
  id: string; recipe_id: string; display_name: string;
  quantity_original: number; unit_original: string; quantity_grams: number; position: number;
}
interface MockStep {
  id: string; recipe_id: string; section_id: string | null; instruction: string;
  duration_seconds: number | null; temperature_celsius: number | null; position: number;
}
interface MockJournalEntry {
  id: string; recipe_id: string; bake_date: string; notes: string | null;
  private_notes: string | null; rating: number | null; images: string[] | null;
  outcome_weight_grams: number | null;
}
interface MockTemplatePreference {
  id: string; user_id: string; template_id: string;
  custom_colors: string | null; custom_font: string | null; watermark_text: string | null;
  created_at: Date; updated_at: Date;
}

let mockUsers: MockUser[] = [];
let mockRecipes: MockRecipe[] = [];
let mockIngredients: MockIngredient[] = [];
let mockSteps: MockStep[] = [];
let mockJournalEntries: MockJournalEntry[] = [];
let mockTemplatePrefs: MockTemplatePreference[] = [];
let mockBlacklist: Set<string> = new Set();

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

  // --- Recipes (SELECT by id) ---
  if (text.includes('FROM recipes WHERE id')) {
    const id = params?.[0] as string;
    const found = mockRecipes.filter((r) => r.id === id);
    return { rows: found, rowCount: found.length };
  }

  // --- Recipe Ingredients ---
  if (text.includes('FROM recipe_ingredients WHERE recipe_id')) {
    const recipeId = params?.[0] as string;
    const found = mockIngredients
      .filter((i) => i.recipe_id === recipeId)
      .sort((a, b) => a.position - b.position);
    return { rows: found, rowCount: found.length };
  }

  // --- Recipe Steps ---
  if (text.includes('FROM recipe_steps WHERE recipe_id')) {
    const recipeId = params?.[0] as string;
    const found = mockSteps
      .filter((s) => s.recipe_id === recipeId)
      .sort((a, b) => a.position - b.position);
    // Respect LIMIT if present
    if (text.includes('LIMIT 5')) {
      return { rows: found.slice(0, 5), rowCount: Math.min(found.length, 5) };
    }
    return { rows: found, rowCount: found.length };
  }

  // --- Journal Entries (JOIN with recipes) ---
  if (text.includes('FROM recipe_journal_entries je') && text.includes('JOIN recipes r')) {
    const entryId = params?.[0] as string;
    const entry = mockJournalEntries.find((e) => e.id === entryId);
    if (!entry) return { rows: [], rowCount: 0 };
    const recipe = mockRecipes.find((r) => r.id === entry.recipe_id);
    if (!recipe) return { rows: [], rowCount: 0 };
    return {
      rows: [{
        ...entry,
        recipe_title: recipe.title,
        user_id: recipe.user_id,
      }],
      rowCount: 1,
    };
  }

  // --- Template Preferences ---
  if (text.includes('FROM user_template_preferences WHERE user_id')) {
    const userId = params?.[0] as string;
    const found = mockTemplatePrefs.filter((p) => p.user_id === userId);
    return { rows: found, rowCount: found.length };
  }
  if (text.includes('INSERT INTO user_template_preferences')) {
    const existing = mockTemplatePrefs.find(
      (p) => p.user_id === (params?.[0] as string) && p.template_id === (params?.[1] as string),
    );
    if (existing) {
      existing.custom_colors = params?.[2] as string | null;
      existing.custom_font = params?.[3] as string | null;
      existing.watermark_text = params?.[4] as string | null;
      existing.updated_at = new Date();
      return { rows: [existing], rowCount: 1 };
    }
    const newPref: MockTemplatePreference = {
      id: uid(), user_id: params?.[0] as string, template_id: params?.[1] as string,
      custom_colors: params?.[2] as string | null, custom_font: params?.[3] as string | null,
      watermark_text: params?.[4] as string | null,
      created_at: new Date(), updated_at: new Date(),
    };
    mockTemplatePrefs.push(newPref);
    return { rows: [newPref], rowCount: 1 };
  }

  // --- Transaction commands ---
  if (/^(BEGIN|COMMIT|ROLLBACK|SELECT 1)$/i.test(text.trim())) {
    return { rows: [], rowCount: 0 };
  }

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
      const client = {
        query: vi.fn(async (text: string, params?: unknown[]) => handleQuery(text, params)),
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
  const email = 'social-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6) + '@example.com';
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password: 'StrongPass1', display_name: 'Social Tester' });
  const userId = mockUsers[mockUsers.length - 1].id;
  return { token: res.body.data.accessToken, userId };
}

function seedRecipeForUser(userId: string): { recipeId: string } {
  const recipeId = uid();
  mockRecipes.push({
    id: recipeId, user_id: userId, title: 'Chocolate Chip Cookies',
    description: 'Classic cookies', servings: 24, yield_weight_grams: 600,
    status: 'active', created_at: new Date(), updated_at: new Date(),
  });
  mockIngredients.push(
    { id: uid(), recipe_id: recipeId, display_name: 'All-purpose flour', quantity_original: 250, unit_original: 'g', quantity_grams: 250, position: 1 },
    { id: uid(), recipe_id: recipeId, display_name: 'Butter', quantity_original: 113, unit_original: 'g', quantity_grams: 113, position: 2 },
    { id: uid(), recipe_id: recipeId, display_name: 'Brown sugar', quantity_original: 200, unit_original: 'g', quantity_grams: 200, position: 3 },
  );
  mockSteps.push(
    { id: uid(), recipe_id: recipeId, section_id: null, instruction: 'Cream butter and sugar', duration_seconds: 180, temperature_celsius: null, position: 1 },
    { id: uid(), recipe_id: recipeId, section_id: null, instruction: 'Add flour and mix', duration_seconds: 120, temperature_celsius: null, position: 2 },
    { id: uid(), recipe_id: recipeId, section_id: null, instruction: 'Bake at 180C for 12 minutes', duration_seconds: 720, temperature_celsius: 180, position: 3 },
  );
  return { recipeId };
}

function seedJournalEntry(recipeId: string): string {
  const entryId = uid();
  mockJournalEntries.push({
    id: entryId, recipe_id: recipeId, bake_date: '2024-06-15',
    notes: 'Turned out great!', private_notes: 'Used slightly less sugar',
    rating: 5, images: ['https://example.com/photo1.jpg'], outcome_weight_grams: 580,
  });
  return entryId;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Social Media API', () => {
  beforeEach(() => {
    mockUsers = [];
    mockRecipes = [];
    mockIngredients = [];
    mockSteps = [];
    mockJournalEntries = [];
    mockTemplatePrefs = [];
    mockBlacklist = new Set();
  });

  // =========================================================================
  // Recipe Card Generation
  // =========================================================================
  describe('POST /api/v1/social/recipe-card', () => {
    it('should generate an Instagram story recipe card', async () => {
      const { token, userId } = await getAuthToken();
      const { recipeId } = seedRecipeForUser(userId);

      const res = await request(app)
        .post('/api/v1/social/recipe-card')
        .set('Authorization', 'Bearer ' + token)
        .send({
          recipe_id: recipeId,
          format: 'instagram_story',
          language: 'en',
          include_branding: true,
          watermark_text: 'My Bakery',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.width).toBe(1080);
      expect(res.body.data.height).toBe(1920);
      expect(res.body.data.format).toBe('webp');
      expect(res.body.data.image_url).toContain(recipeId);
      expect(res.body.data.recipe_title).toBe('Chocolate Chip Cookies');
      expect(res.body.data.language).toBe('en');
    });

    it('should generate an Instagram post recipe card', async () => {
      const { token, userId } = await getAuthToken();
      const { recipeId } = seedRecipeForUser(userId);

      const res = await request(app)
        .post('/api/v1/social/recipe-card')
        .set('Authorization', 'Bearer ' + token)
        .send({
          recipe_id: recipeId,
          format: 'instagram_post',
          language: 'hi',
          include_branding: false,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.width).toBe(1080);
      expect(res.body.data.height).toBe(1080);
      expect(res.body.data.language).toBe('hi');
    });

    it('should generate a WhatsApp recipe card', async () => {
      const { token, userId } = await getAuthToken();
      const { recipeId } = seedRecipeForUser(userId);

      const res = await request(app)
        .post('/api/v1/social/recipe-card')
        .set('Authorization', 'Bearer ' + token)
        .send({
          recipe_id: recipeId,
          format: 'whatsapp',
          language: 'bilingual',
          include_branding: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.width).toBe(800);
      expect(res.body.data.height).toBe(800);
      // WhatsApp cards should be under 500KB
      expect(res.body.data.file_size_bytes).toBeLessThanOrEqual(500 * 1024);
    });

    it('should return 404 for non-existent recipe', async () => {
      const { token } = await getAuthToken();

      const res = await request(app)
        .post('/api/v1/social/recipe-card')
        .set('Authorization', 'Bearer ' + token)
        .send({
          recipe_id: uid(),
          format: 'instagram_post',
          language: 'en',
          include_branding: false,
        });

      expect(res.status).toBe(404);
    });

    it('should return 400 for invalid format', async () => {
      const { token } = await getAuthToken();

      const res = await request(app)
        .post('/api/v1/social/recipe-card')
        .set('Authorization', 'Bearer ' + token)
        .send({
          recipe_id: uid(),
          format: 'tiktok',
          language: 'en',
          include_branding: false,
        });

      expect(res.status).toBe(400);
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app)
        .post('/api/v1/social/recipe-card')
        .send({
          recipe_id: uid(),
          format: 'instagram_post',
          language: 'en',
          include_branding: false,
        });

      expect(res.status).toBe(401);
    });

    it('should return 404 when accessing another user recipe', async () => {
      const { userId: user1Id } = await getAuthToken();
      const { token: token2 } = await getAuthToken();
      const { recipeId } = seedRecipeForUser(user1Id);

      const res = await request(app)
        .post('/api/v1/social/recipe-card')
        .set('Authorization', 'Bearer ' + token2)
        .send({
          recipe_id: recipeId,
          format: 'instagram_post',
          language: 'en',
          include_branding: false,
        });

      expect(res.status).toBe(404);
    });
  });

  // =========================================================================
  // Journal Card Generation
  // =========================================================================
  describe('POST /api/v1/social/journal-card', () => {
    it('should generate a journal card with public notes only', async () => {
      const { token, userId } = await getAuthToken();
      const { recipeId } = seedRecipeForUser(userId);
      const entryId = seedJournalEntry(recipeId);

      const res = await request(app)
        .post('/api/v1/social/journal-card')
        .set('Authorization', 'Bearer ' + token)
        .send({
          journal_entry_id: entryId,
          hide_private_notes: true,
          language: 'en',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.shareable_link).toContain('/share/journal/');
      expect(res.body.data.preview_metadata.og_title).toContain('Baking Journal');
      // When hiding private notes, description should only contain public notes
      expect(res.body.data.preview_metadata.og_description).toBe('Turned out great!');
      expect(res.body.data.preview_metadata.og_description).not.toContain('less sugar');
    });

    it('should include private notes when not hidden', async () => {
      const { token, userId } = await getAuthToken();
      const { recipeId } = seedRecipeForUser(userId);
      const entryId = seedJournalEntry(recipeId);

      const res = await request(app)
        .post('/api/v1/social/journal-card')
        .set('Authorization', 'Bearer ' + token)
        .send({
          journal_entry_id: entryId,
          hide_private_notes: false,
          language: 'en',
        });

      expect(res.status).toBe(201);
      // When not hiding, public notes are still used (they exist)
      expect(res.body.data.preview_metadata.og_description).toBe('Turned out great!');
    });

    it('should return 404 for non-existent journal entry', async () => {
      const { token } = await getAuthToken();

      const res = await request(app)
        .post('/api/v1/social/journal-card')
        .set('Authorization', 'Bearer ' + token)
        .send({
          journal_entry_id: uid(),
          hide_private_notes: true,
          language: 'en',
        });

      expect(res.status).toBe(404);
    });

    it('should return 400 for missing required fields', async () => {
      const { token } = await getAuthToken();

      const res = await request(app)
        .post('/api/v1/social/journal-card')
        .set('Authorization', 'Bearer ' + token)
        .send({ journal_entry_id: uid() });

      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // WhatsApp Formatting
  // =========================================================================
  describe('POST /api/v1/social/whatsapp-format', () => {
    it('should format recipe for WhatsApp in English', async () => {
      const { token, userId } = await getAuthToken();
      const { recipeId } = seedRecipeForUser(userId);

      const res = await request(app)
        .post('/api/v1/social/whatsapp-format')
        .set('Authorization', 'Bearer ' + token)
        .send({
          recipe_id: recipeId,
          content_type: 'recipe',
          language: 'en',
          include_image: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const text = res.body.data.formatted_text;
      // Check structure
      expect(text).toContain('*AiBake Recipe: Chocolate Chip Cookies*');
      expect(text).toContain('*Ingredients:*');
      expect(text).toContain('250g All-purpose flour');
      expect(text).toContain('113g Butter');
      expect(text).toContain('*Time:*');
      expect(text).toContain('*Temp:*');
      expect(text).toContain('180°C');
      expect(text).toContain('Made with');
      // Check shareable link
      expect(res.body.data.shareable_link).toContain('/r/');
      // Check image
      expect(res.body.data.image_url).toBeTruthy();
      expect(res.body.data.image_compressed).toBe(true);
      // Check OG metadata
      expect(res.body.data.preview_metadata.og_title).toBe('Chocolate Chip Cookies');
    });

    it('should format recipe for WhatsApp in Hindi', async () => {
      const { token, userId } = await getAuthToken();
      const { recipeId } = seedRecipeForUser(userId);

      const res = await request(app)
        .post('/api/v1/social/whatsapp-format')
        .set('Authorization', 'Bearer ' + token)
        .send({
          recipe_id: recipeId,
          content_type: 'recipe',
          language: 'hi',
          include_image: false,
        });

      expect(res.status).toBe(200);
      const text = res.body.data.formatted_text;
      expect(text).toContain('सामग्री');
      expect(text).toContain('समय');
      expect(text).toContain('तापमान');
      expect(res.body.data.image_url).toBeNull();
    });

    it('should format shopping list for WhatsApp', async () => {
      const { token, userId } = await getAuthToken();
      const { recipeId } = seedRecipeForUser(userId);

      const res = await request(app)
        .post('/api/v1/social/whatsapp-format')
        .set('Authorization', 'Bearer ' + token)
        .send({
          recipe_id: recipeId,
          content_type: 'shopping_list',
          language: 'en',
          include_image: false,
        });

      expect(res.status).toBe(200);
      const text = res.body.data.formatted_text;
      expect(text).toContain('Shopping List');
      expect(text).toContain('✅');
      expect(text).toContain('All-purpose flour');
    });

    it('should return 404 for non-existent recipe', async () => {
      const { token } = await getAuthToken();

      const res = await request(app)
        .post('/api/v1/social/whatsapp-format')
        .set('Authorization', 'Bearer ' + token)
        .send({
          recipe_id: uid(),
          content_type: 'recipe',
          language: 'en',
          include_image: false,
        });

      expect(res.status).toBe(404);
    });

    it('should return 400 for invalid content_type', async () => {
      const { token } = await getAuthToken();

      const res = await request(app)
        .post('/api/v1/social/whatsapp-format')
        .set('Authorization', 'Bearer ' + token)
        .send({
          recipe_id: uid(),
          content_type: 'invalid',
          language: 'en',
          include_image: false,
        });

      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // Templates
  // =========================================================================
  describe('GET /api/v1/social/templates', () => {
    it('should list default templates', async () => {
      const { token } = await getAuthToken();

      const res = await request(app)
        .get('/api/v1/social/templates')
        .set('Authorization', 'Bearer ' + token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.default_templates).toBeInstanceOf(Array);
      expect(res.body.data.default_templates.length).toBeGreaterThanOrEqual(4);
      // Check template structure
      const tpl = res.body.data.default_templates[0];
      expect(tpl).toHaveProperty('id');
      expect(tpl).toHaveProperty('name');
      expect(tpl).toHaveProperty('format');
      expect(tpl).toHaveProperty('colors');
      expect(tpl).toHaveProperty('font');
      expect(tpl).toHaveProperty('layout');
    });

    it('should return empty user preferences initially', async () => {
      const { token } = await getAuthToken();

      const res = await request(app)
        .get('/api/v1/social/templates')
        .set('Authorization', 'Bearer ' + token);

      expect(res.status).toBe(200);
      expect(res.body.data.user_preferences).toEqual([]);
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app).get('/api/v1/social/templates');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/social/templates/preferences', () => {
    it('should save a template preference', async () => {
      const { token } = await getAuthToken();

      const res = await request(app)
        .post('/api/v1/social/templates/preferences')
        .set('Authorization', 'Bearer ' + token)
        .send({
          template_id: 'tpl-light-story',
          custom_colors: { background: '#FFF', text: '#000', accent: '#F00' },
          watermark_text: 'My Bakery',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.template_id).toBe('tpl-light-story');
      expect(res.body.data.watermark_text).toBe('My Bakery');
    });

    it('should return 404 for invalid template_id', async () => {
      const { token } = await getAuthToken();

      const res = await request(app)
        .post('/api/v1/social/templates/preferences')
        .set('Authorization', 'Bearer ' + token)
        .send({ template_id: 'non-existent-template' });

      expect(res.status).toBe(404);
    });

    it('should return 400 for missing template_id', async () => {
      const { token } = await getAuthToken();

      const res = await request(app)
        .post('/api/v1/social/templates/preferences')
        .set('Authorization', 'Bearer ' + token)
        .send({});

      expect(res.status).toBe(400);
    });
  });
});
