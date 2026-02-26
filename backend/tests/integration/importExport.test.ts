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
  source_type: string; source_url: string | null; original_author: string | null;
  original_author_url: string | null; servings: number; yield_weight_grams: number;
  preferred_unit_system: string; status: string;
  target_water_activity: number | null; min_safe_water_activity: number | null;
  estimated_shelf_life_days: number | null; total_hydration_percentage: number | null;
  created_at: Date; updated_at: Date;
}
interface MockIngredient {
  id: string; recipe_id: string; ingredient_master_id: string | null;
  display_name: string; quantity_original: number; unit_original: string;
  quantity_grams: number; position: number; is_flour: boolean; is_liquid: boolean;
}
interface MockSection {
  id: string; recipe_id: string; type: string; title: string | null; position: number;
}
interface MockStep {
  id: string; recipe_id: string; section_id: string | null; instruction: string;
  duration_seconds: number | null; temperature_celsius: number | null; position: number;
  dependency_step_id: string | null;
}
interface MockVersion {
  id: string; recipe_id: string; version_number: number; change_summary: string | null;
  created_at: Date;
}
interface MockSnapshot {
  id: string; version_id: string; snapshot_data: string;
}

let mockUsers: MockUser[] = [];
let mockRecipes: MockRecipe[] = [];
let mockIngredients: MockIngredient[] = [];
let mockSections: MockSection[] = [];
let mockSteps: MockStep[] = [];
let mockVersions: MockVersion[] = [];
let mockSnapshots: MockSnapshot[] = [];
let mockBlacklist: Set<string> = new Set();

function uid(): string {
  const hex = () => Math.random().toString(16).slice(2, 6);
  return hex() + hex() + '-' + hex() + '-4' + hex().slice(1) + '-a' + hex().slice(1) + '-' + hex() + hex() + hex();
}


// ---------------------------------------------------------------------------
// Mock database query handler
// ---------------------------------------------------------------------------

function handleQuery(text: string, params?: unknown[]): { rows: unknown[]; rowCount: number } {
  const t = text.trim();

  // --- Users ---
  if (t.includes('FROM users WHERE email')) {
    const email = params?.[0] as string;
    const found = mockUsers.filter((u) => u.email === email);
    return { rows: found, rowCount: found.length };
  }
  if (t.includes('FROM users WHERE id')) {
    const id = params?.[0] as string;
    const found = mockUsers.filter((u) => u.id === id);
    return { rows: found, rowCount: found.length };
  }
  if (t.includes('INSERT INTO users')) {
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

  // --- Recipes SELECT ---
  if (t.includes('FROM recipes WHERE id')) {
    const id = params?.[0] as string;
    const found = mockRecipes.filter((r) => r.id === id);
    return { rows: found, rowCount: found.length };
  }

  // --- Recipe INSERT ---
  if (t.includes('INSERT INTO recipes')) {
    const newRecipe: MockRecipe = {
      id: uid(), user_id: params?.[0] as string, title: params?.[1] as string,
      description: params?.[2] as string | null, source_type: (params?.[3] as string) || 'manual',
      source_url: params?.[4] as string | null, original_author: params?.[5] as string | null,
      original_author_url: null, servings: params?.[6] as number,
      yield_weight_grams: params?.[7] as number,
      preferred_unit_system: (params?.[8] as string) || 'metric',
      status: (params?.[9] as string) || 'active',
      target_water_activity: null, min_safe_water_activity: null,
      estimated_shelf_life_days: null, total_hydration_percentage: null,
      created_at: new Date(), updated_at: new Date(),
    };
    mockRecipes.push(newRecipe);
    return { rows: [newRecipe], rowCount: 1 };
  }

  // --- Recipe Ingredients ---
  if (t.includes('FROM recipe_ingredients WHERE recipe_id')) {
    const recipeId = params?.[0] as string;
    const found = mockIngredients.filter((i) => i.recipe_id === recipeId).sort((a, b) => a.position - b.position);
    return { rows: found, rowCount: found.length };
  }
  if (t.includes('INSERT INTO recipe_ingredients')) {
    const newIng: MockIngredient = {
      id: uid(), recipe_id: params?.[0] as string,
      ingredient_master_id: params?.[1] as string | null,
      display_name: params?.[2] as string, quantity_original: params?.[3] as number,
      unit_original: params?.[4] as string, quantity_grams: params?.[5] as number,
      position: params?.[6] as number, is_flour: (params?.[7] as boolean) || false,
      is_liquid: (params?.[8] as boolean) || false,
    };
    mockIngredients.push(newIng);
    return { rows: [newIng], rowCount: 1 };
  }

  // --- Recipe Sections ---
  if (t.includes('FROM recipe_sections WHERE recipe_id')) {
    const recipeId = params?.[0] as string;
    const found = mockSections.filter((s) => s.recipe_id === recipeId).sort((a, b) => a.position - b.position);
    return { rows: found, rowCount: found.length };
  }
  if (t.includes('INSERT INTO recipe_sections')) {
    const newSec: MockSection = {
      id: uid(), recipe_id: params?.[0] as string, type: params?.[1] as string,
      title: params?.[2] as string | null, position: params?.[3] as number,
    };
    mockSections.push(newSec);
    return { rows: [newSec], rowCount: 1 };
  }

  // --- Recipe Steps ---
  if (t.includes('FROM recipe_steps WHERE recipe_id')) {
    const recipeId = params?.[0] as string;
    const found = mockSteps.filter((s) => s.recipe_id === recipeId).sort((a, b) => a.position - b.position);
    return { rows: found, rowCount: found.length };
  }
  if (t.includes('INSERT INTO recipe_steps')) {
    const newStep: MockStep = {
      id: uid(), recipe_id: params?.[0] as string, section_id: params?.[1] as string | null,
      instruction: params?.[2] as string, duration_seconds: params?.[3] as number | null,
      temperature_celsius: params?.[4] as number | null, position: params?.[5] as number,
      dependency_step_id: null,
    };
    mockSteps.push(newStep);
    return { rows: [newStep], rowCount: 1 };
  }

  // --- Recipe Versions ---
  if (t.includes('INSERT INTO recipe_versions')) {
    const newVersion: MockVersion = {
      id: uid(), recipe_id: params?.[0] as string,
      version_number: params?.[1] as number,
      change_summary: params?.[2] as string | null,
      created_at: new Date(),
    };
    mockVersions.push(newVersion);
    return { rows: [newVersion], rowCount: 1 };
  }

  // --- Version Snapshots ---
  if (t.includes('INSERT INTO recipe_version_snapshots')) {
    const newSnap: MockSnapshot = {
      id: uid(), version_id: params?.[0] as string,
      snapshot_data: params?.[1] as string,
    };
    mockSnapshots.push(newSnap);
    return { rows: [newSnap], rowCount: 1 };
  }

  // --- Ingredient fuzzy search (similarity) ---
  if (t.includes('similarity')) {
    return { rows: [], rowCount: 0 };
  }
  if (t.includes('FROM ingredient_master WHERE LOWER')) {
    return { rows: [], rowCount: 0 };
  }

  // --- Transaction commands ---
  if (/^(BEGIN|COMMIT|ROLLBACK|SELECT 1)$/i.test(t)) {
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
  const email = 'ie-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6) + '@example.com';
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password: 'StrongPass1', display_name: 'IE Tester' });
  const userId = mockUsers[mockUsers.length - 1].id;
  return { token: res.body.data.accessToken, userId };
}

function seedRecipe(userId: string): string {
  const recipeId = uid();
  mockRecipes.push({
    id: recipeId, user_id: userId, title: 'Naan Bread',
    description: 'Soft Indian flatbread', source_type: 'manual',
    source_url: null, original_author: 'Chef Ravi',
    original_author_url: null, servings: 8, yield_weight_grams: 400,
    preferred_unit_system: 'metric', status: 'active',
    target_water_activity: null, min_safe_water_activity: null,
    estimated_shelf_life_days: null, total_hydration_percentage: null,
    created_at: new Date(), updated_at: new Date(),
  });
  mockIngredients.push(
    { id: uid(), recipe_id: recipeId, ingredient_master_id: null, display_name: 'Maida (all-purpose flour)', quantity_original: 300, unit_original: 'g', quantity_grams: 300, position: 1, is_flour: true, is_liquid: false },
    { id: uid(), recipe_id: recipeId, ingredient_master_id: null, display_name: 'Yogurt', quantity_original: 100, unit_original: 'g', quantity_grams: 100, position: 2, is_flour: false, is_liquid: true },
    { id: uid(), recipe_id: recipeId, ingredient_master_id: null, display_name: 'Ghee', quantity_original: 30, unit_original: 'g', quantity_grams: 30, position: 3, is_flour: false, is_liquid: false },
  );
  const sectionId = uid();
  mockSections.push({ id: sectionId, recipe_id: recipeId, type: 'prep', title: 'Make Dough', position: 1 });
  mockSteps.push(
    { id: uid(), recipe_id: recipeId, section_id: sectionId, instruction: 'Mix flour, yogurt, and salt', duration_seconds: 300, temperature_celsius: null, position: 1, dependency_step_id: null },
    { id: uid(), recipe_id: recipeId, section_id: sectionId, instruction: 'Knead for 10 minutes', duration_seconds: 600, temperature_celsius: null, position: 2, dependency_step_id: null },
    { id: uid(), recipe_id: recipeId, section_id: sectionId, instruction: 'Cook on tawa at high heat', duration_seconds: 180, temperature_celsius: 250, position: 3, dependency_step_id: null },
  );
  return recipeId;
}


// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Import/Export API', () => {
  beforeEach(() => {
    mockUsers = [];
    mockRecipes = [];
    mockIngredients = [];
    mockSections = [];
    mockSteps = [];
    mockVersions = [];
    mockSnapshots = [];
    mockBlacklist = new Set();
  });

  // =========================================================================
  // Export to JSON (19.1)
  // =========================================================================
  describe('GET /api/v1/recipes/:id/export', () => {
    it('should export a recipe to JSON format', async () => {
      const { token, userId } = await getAuthToken();
      const recipeId = seedRecipe(userId);

      const res = await request(app)
        .get(`/api/v1/recipes/${recipeId}/export`)
        .set('Authorization', 'Bearer ' + token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.aibake_version).toBe('1.0.0');
      expect(res.body.data.exported_at).toBeTruthy();
      expect(res.body.data.recipe.title).toBe('Naan Bread');
      expect(res.body.data.recipe.servings).toBe(8);
      expect(res.body.data.recipe.yield_weight_grams).toBe(400);
      expect(res.body.data.recipe.ingredients).toHaveLength(3);
      expect(res.body.data.recipe.ingredients[0].display_name).toBe('Maida (all-purpose flour)');
      expect(res.body.data.recipe.sections).toHaveLength(1);
      expect(res.body.data.recipe.sections[0].steps).toHaveLength(3);
    });

    it('should preserve all recipe metadata during export', async () => {
      const { token, userId } = await getAuthToken();
      const recipeId = seedRecipe(userId);

      const res = await request(app)
        .get(`/api/v1/recipes/${recipeId}/export`)
        .set('Authorization', 'Bearer ' + token);

      const recipe = res.body.data.recipe;
      expect(recipe.description).toBe('Soft Indian flatbread');
      expect(recipe.original_author).toBe('Chef Ravi');
      expect(recipe.source_type).toBe('manual');
      expect(recipe.preferred_unit_system).toBe('metric');
      expect(recipe.status).toBe('active');
    });

    it('should return 404 for non-existent recipe', async () => {
      const { token } = await getAuthToken();
      const res = await request(app)
        .get(`/api/v1/recipes/${uid()}/export`)
        .set('Authorization', 'Bearer ' + token);
      expect(res.status).toBe(404);
    });

    it('should return 404 for another user recipe', async () => {
      const { userId: user1Id } = await getAuthToken();
      const { token: token2 } = await getAuthToken();
      const recipeId = seedRecipe(user1Id);

      const res = await request(app)
        .get(`/api/v1/recipes/${recipeId}/export`)
        .set('Authorization', 'Bearer ' + token2);
      expect(res.status).toBe(404);
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app).get(`/api/v1/recipes/${uid()}/export`);
      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // Import from JSON (19.1)
  // =========================================================================
  describe('POST /api/v1/recipes/import', () => {
    it('should import a recipe from JSON', async () => {
      const { token } = await getAuthToken();

      const res = await request(app)
        .post('/api/v1/recipes/import')
        .set('Authorization', 'Bearer ' + token)
        .send({
          recipe: {
            title: 'Imported Gulab Jamun',
            description: 'Sweet Indian dessert',
            servings: 12,
            yield_weight_grams: 500,
            ingredients: [
              { display_name: 'Khoya', quantity_original: 200, unit_original: 'g', quantity_grams: 200, position: 1 },
              { display_name: 'Maida', quantity_original: 50, unit_original: 'g', quantity_grams: 50, position: 2 },
            ],
            sections: [
              {
                type: 'prep', title: 'Make Dough', position: 1,
                steps: [
                  { instruction: 'Mix khoya and maida', position: 1 },
                  { instruction: 'Shape into balls', position: 2 },
                ],
              },
            ],
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Imported Gulab Jamun');
      expect(res.body.data.ingredients).toHaveLength(2);
      expect(res.body.data.sections).toHaveLength(1);
    });

    it('should return 400 for missing required fields', async () => {
      const { token } = await getAuthToken();

      const res = await request(app)
        .post('/api/v1/recipes/import')
        .set('Authorization', 'Bearer ' + token)
        .send({ recipe: { title: '' } });

      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid servings', async () => {
      const { token } = await getAuthToken();

      const res = await request(app)
        .post('/api/v1/recipes/import')
        .set('Authorization', 'Bearer ' + token)
        .send({ recipe: { title: 'Test', servings: -1, yield_weight_grams: 100 } });

      expect(res.status).toBe(400);
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app)
        .post('/api/v1/recipes/import')
        .send({ recipe: { title: 'Test', servings: 1, yield_weight_grams: 100 } });
      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // URL Import (19.2)
  // =========================================================================
  describe('POST /api/v1/recipes/import-url', () => {
    const schemaOrgHtml = `
      <html><head>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Recipe",
        "name": "Eggless Chocolate Cake",
        "description": "Rich chocolate cake without eggs",
        "author": { "@type": "Person", "name": "Priya" },
        "recipeYield": "8",
        "recipeIngredient": [
          "200 grams maida",
          "150 grams sugar",
          "50 ml oil"
        ],
        "recipeInstructions": [
          { "@type": "HowToStep", "text": "Mix dry ingredients" },
          { "@type": "HowToStep", "text": "Add wet ingredients" },
          { "@type": "HowToStep", "text": "Bake at 180C for 30 minutes" }
        ],
        "image": "https://example.com/cake.jpg"
      }
      </script>
      </head><body></body></html>
    `;

    it('should parse schema.org Recipe from HTML', async () => {
      const { token } = await getAuthToken();

      const res = await request(app)
        .post('/api/v1/recipes/import-url')
        .set('Authorization', 'Bearer ' + token)
        .send({ url: 'https://example.com/recipe', html_content: schemaOrgHtml });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.recipe.title).toBe('Eggless Chocolate Cake');
      expect(res.body.data.recipe.servings).toBe(8);
      expect(res.body.data.recipe.ingredients).toHaveLength(3);
      expect(res.body.data.recipe.ingredients[0].display_name).toBe('maida');
      expect(res.body.data.source_url).toBe('https://example.com/recipe');
      expect(res.body.data.source_author).toBe('Priya');
      expect(res.body.data.images).toContain('https://example.com/cake.jpg');
    });

    it('should handle @graph format', async () => {
      const { token } = await getAuthToken();
      const graphHtml = `<html><head>
        <script type="application/ld+json">
        { "@context": "https://schema.org", "@graph": [
          { "@type": "WebPage", "name": "Page" },
          { "@type": "Recipe", "name": "Graph Recipe", "recipeYield": "4", "recipeIngredient": ["100 g flour"] }
        ]}
        </script></head><body></body></html>`;

      const res = await request(app)
        .post('/api/v1/recipes/import-url')
        .set('Authorization', 'Bearer ' + token)
        .send({ url: 'https://example.com/graph', html_content: graphHtml });

      expect(res.status).toBe(200);
      expect(res.body.data.recipe.title).toBe('Graph Recipe');
    });

    it('should return 400 when no recipe markup found', async () => {
      const { token } = await getAuthToken();

      const res = await request(app)
        .post('/api/v1/recipes/import-url')
        .set('Authorization', 'Bearer ' + token)
        .send({ url: 'https://example.com/no-recipe', html_content: '<html><body>No recipe here</body></html>' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for missing url', async () => {
      const { token } = await getAuthToken();

      const res = await request(app)
        .post('/api/v1/recipes/import-url')
        .set('Authorization', 'Bearer ' + token)
        .send({ html_content: '<html></html>' });

      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // Export Formats (19.3)
  // =========================================================================
  describe('GET /api/v1/recipes/:id/export/markdown', () => {
    it('should export recipe to Markdown', async () => {
      const { token, userId } = await getAuthToken();
      const recipeId = seedRecipe(userId);

      const res = await request(app)
        .get(`/api/v1/recipes/${recipeId}/export/markdown`)
        .set('Authorization', 'Bearer ' + token);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/markdown');
      expect(res.text).toContain('# Naan Bread');
      expect(res.text).toContain('## Ingredients');
      expect(res.text).toContain('Maida (all-purpose flour)');
      expect(res.text).toContain('## Instructions');
      expect(res.text).toContain('**Servings:** 8');
    });
  });

  describe('GET /api/v1/recipes/:id/export/pdf', () => {
    it('should export recipe to structured text for PDF', async () => {
      const { token, userId } = await getAuthToken();
      const recipeId = seedRecipe(userId);

      const res = await request(app)
        .get(`/api/v1/recipes/${recipeId}/export/pdf`)
        .set('Authorization', 'Bearer ' + token);

      expect(res.status).toBe(200);
      expect(res.text).toContain('NAAN BREAD');
      expect(res.text).toContain('INGREDIENTS');
      expect(res.text).toContain('INSTRUCTIONS');
      expect(res.text).toContain('Maida (all-purpose flour)');
      expect(res.text).toContain('Servings: 8');
    });
  });

  describe('GET /api/v1/recipes/:id/export/jsonld', () => {
    it('should export recipe to schema.org JSON-LD', async () => {
      const { token, userId } = await getAuthToken();
      const recipeId = seedRecipe(userId);

      const res = await request(app)
        .get(`/api/v1/recipes/${recipeId}/export/jsonld`)
        .set('Authorization', 'Bearer ' + token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const ld = res.body.data;
      expect(ld['@context']).toBe('https://schema.org');
      expect(ld['@type']).toBe('Recipe');
      expect(ld.name).toBe('Naan Bread');
      expect(ld.recipeYield).toBe('8');
      expect(ld.recipeIngredient).toHaveLength(3);
      expect(ld.recipeInstructions).toHaveLength(3);
      expect(ld.recipeInstructions[0]['@type']).toBe('HowToStep');
    });
  });

  // =========================================================================
  // Bulk Export (19.1)
  // =========================================================================
  describe('POST /api/v1/recipes/export/bulk', () => {
    it('should bulk export multiple recipes', async () => {
      const { token, userId } = await getAuthToken();
      const id1 = seedRecipe(userId);
      const id2 = seedRecipe(userId);
      // Rename second recipe for distinction
      const r2 = mockRecipes.find((r) => r.id === id2);
      if (r2) r2.title = 'Paratha';

      const res = await request(app)
        .post('/api/v1/recipes/export/bulk')
        .set('Authorization', 'Bearer ' + token)
        .send({ recipe_ids: [id1, id2] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.count).toBe(2);
      expect(res.body.data.recipes).toHaveLength(2);
    });

    it('should return 400 for empty recipe_ids', async () => {
      const { token } = await getAuthToken();

      const res = await request(app)
        .post('/api/v1/recipes/export/bulk')
        .set('Authorization', 'Bearer ' + token)
        .send({ recipe_ids: [] });

      expect(res.status).toBe(400);
    });
  });
});
