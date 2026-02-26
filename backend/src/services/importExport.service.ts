import { db } from '../config/database';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import {
  RecipeExportData,
  BulkExportData,
  RecipeImportInput,
  ExportIngredient,
  ExportSection,
  UrlImportResult,
  MarkdownExportResult,
  PdfExportResult,
  JsonLdExportResult,
} from '../models/importExport.model';
import { RecipeWithDetails } from '../models/recipe.model';

const AIBAKE_VERSION = '1.0.0';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchRecipeWithDetails(recipeId: string, userId: string): Promise<RecipeWithDetails> {
  const recipeRes = await db.query('SELECT * FROM recipes WHERE id = $1', [recipeId]);
  if (recipeRes.rowCount === 0) throw new NotFoundError('Recipe');
  const recipe = recipeRes.rows[0] as RecipeWithDetails;
  if (recipe.user_id !== userId) throw new NotFoundError('Recipe');

  const [ingredientsRes, sectionsRes, stepsRes] = await Promise.all([
    db.query('SELECT * FROM recipe_ingredients WHERE recipe_id = $1 ORDER BY position', [recipeId]),
    db.query('SELECT * FROM recipe_sections WHERE recipe_id = $1 ORDER BY position', [recipeId]),
    db.query('SELECT * FROM recipe_steps WHERE recipe_id = $1 ORDER BY position', [recipeId]),
  ]);

  recipe.ingredients = ingredientsRes.rows as any;
  recipe.sections = sectionsRes.rows.map((section: any) => ({
    ...section,
    steps: stepsRes.rows.filter((step: any) => step.section_id === section.id),
  }));

  return recipe;
}

function recipeToExportData(recipe: RecipeWithDetails): RecipeExportData['recipe'] {
  return {
    title: recipe.title,
    description: recipe.description,
    source_type: recipe.source_type,
    source_url: recipe.source_url,
    original_author: recipe.original_author,
    servings: recipe.servings,
    yield_weight_grams: recipe.yield_weight_grams,
    preferred_unit_system: recipe.preferred_unit_system,
    status: recipe.status,
    ingredients: recipe.ingredients.map((ing): ExportIngredient => ({
      display_name: ing.display_name,
      quantity_original: ing.quantity_original,
      unit_original: ing.unit_original,
      quantity_grams: ing.quantity_grams,
      position: ing.position,
      is_flour: ing.is_flour,
      is_liquid: ing.is_liquid,
    })),
    sections: recipe.sections.map((sec): ExportSection => ({
      type: sec.type,
      title: sec.title,
      position: sec.position,
      steps: (sec.steps || []).map((step) => ({
        instruction: step.instruction,
        duration_seconds: step.duration_seconds,
        temperature_celsius: step.temperature_celsius,
        position: step.position,
      })),
    })),
  };
}

async function matchIngredient(displayName: string): Promise<string | null> {
  try {
    const r = await db.query(
      'SELECT id FROM ingredient_master WHERE similarity(name, $1) > 0.2 ORDER BY similarity(name, $1) DESC LIMIT 1',
      [displayName.toLowerCase()],
    );
    if (r.rowCount && r.rowCount > 0) return r.rows[0].id;
  } catch {
    // Fallback to exact match if pg_trgm not available
    const r = await db.query(
      'SELECT id FROM ingredient_master WHERE LOWER(name) = LOWER($1) LIMIT 1',
      [displayName],
    );
    if (r.rowCount && r.rowCount > 0) return r.rows[0].id;
  }
  return null;
}

function parseIngredientText(text: string): { name: string; quantity: number; unit: string } {
  const trimmed = text.trim();
  const match = trimmed.match(
    /^([\d./]+)\s*(g|grams?|kg|ml|l|liters?|cups?|tbsp|tsp|oz|lb|pounds?|tablespoons?|teaspoons?)?\s+(.+)$/i,
  );
  if (match) {
    const qty = match[1].includes('/')
      ? parseFloat(match[1].split('/')[0]) / parseFloat(match[1].split('/')[1])
      : parseFloat(match[1]);
    return { name: match[3].trim(), quantity: isNaN(qty) ? 0 : qty, unit: (match[2] || 'unit').toLowerCase() };
  }
  return { name: trimmed, quantity: 0, unit: 'unit' };
}

// ---------------------------------------------------------------------------
// 19.1 — Export single recipe to JSON
// ---------------------------------------------------------------------------

export async function exportRecipe(recipeId: string, userId: string): Promise<RecipeExportData> {
  const recipe = await fetchRecipeWithDetails(recipeId, userId);
  return {
    aibake_version: AIBAKE_VERSION,
    exported_at: new Date().toISOString(),
    recipe: recipeToExportData(recipe),
  };
}

// ---------------------------------------------------------------------------
// 19.1 — Bulk export recipes
// ---------------------------------------------------------------------------

export async function bulkExportRecipes(recipeIds: string[], userId: string): Promise<BulkExportData> {
  const recipes: RecipeExportData['recipe'][] = [];
  for (const id of recipeIds) {
    const recipe = await fetchRecipeWithDetails(id, userId);
    recipes.push(recipeToExportData(recipe));
  }
  return {
    aibake_version: AIBAKE_VERSION,
    exported_at: new Date().toISOString(),
    count: recipes.length,
    recipes,
  };
}

// ---------------------------------------------------------------------------
// 19.1 — Validate import data
// ---------------------------------------------------------------------------

export function validateImportData(input: RecipeImportInput): string[] {
  const errors: string[] = [];
  if (!input.recipe) {
    errors.push('Missing recipe object');
    return errors;
  }
  const r = input.recipe;
  if (!r.title || typeof r.title !== 'string' || r.title.trim().length === 0) errors.push('Recipe title is required');
  if (typeof r.servings !== 'number' || r.servings < 1) errors.push('Servings must be a positive number');
  if (typeof r.yield_weight_grams !== 'number' || r.yield_weight_grams <= 0) errors.push('yield_weight_grams must be positive');
  if (r.status && !['draft', 'active', 'archived'].includes(r.status)) errors.push('Invalid status');
  if (r.source_type && !['manual', 'image', 'whatsapp', 'url'].includes(r.source_type)) errors.push('Invalid source_type');

  if (r.ingredients) {
    for (let i = 0; i < r.ingredients.length; i++) {
      const ing = r.ingredients[i];
      if (!ing.display_name) errors.push(`Ingredient ${i + 1}: display_name required`);
      if (typeof ing.quantity_grams !== 'number' || ing.quantity_grams < 0) errors.push(`Ingredient ${i + 1}: quantity_grams invalid`);
    }
  }
  if (r.sections) {
    const validTypes = ['pre_prep', 'prep', 'bake', 'rest', 'notes'];
    for (let i = 0; i < r.sections.length; i++) {
      if (!validTypes.includes(r.sections[i].type)) errors.push(`Section ${i + 1}: invalid type`);
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// 19.1 — Import recipe from JSON
// ---------------------------------------------------------------------------

export async function importRecipe(userId: string, input: RecipeImportInput): Promise<RecipeWithDetails> {
  const errors = validateImportData(input);
  if (errors.length > 0) throw new ValidationError('Import validation failed', errors);

  const r = input.recipe;

  return db.withTransaction(async (client) => {
    const recipeRes = await client.query(
      `INSERT INTO recipes (user_id, title, description, source_type, source_url, original_author, servings, yield_weight_grams, preferred_unit_system, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [userId, r.title, r.description || null, r.source_type || 'manual', r.source_url || null, r.original_author || null, r.servings, r.yield_weight_grams, r.preferred_unit_system || 'metric', r.status || 'active'],
    );
    const recipe = recipeRes.rows[0];

    if (r.ingredients && r.ingredients.length > 0) {
      for (const ing of r.ingredients) {
        const mid = await matchIngredient(ing.display_name);
        await client.query(
          `INSERT INTO recipe_ingredients (recipe_id, ingredient_master_id, display_name, quantity_original, unit_original, quantity_grams, position, is_flour, is_liquid)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [recipe.id, mid, ing.display_name, ing.quantity_original, ing.unit_original, ing.quantity_grams, ing.position, ing.is_flour || false, ing.is_liquid || false],
        );
      }
    }

    if (r.sections && r.sections.length > 0) {
      for (const sec of r.sections) {
        const secRes = await client.query(
          'INSERT INTO recipe_sections (recipe_id, type, title, position) VALUES ($1,$2,$3,$4) RETURNING *',
          [recipe.id, sec.type, sec.title || null, sec.position],
        );
        const section = secRes.rows[0];
        if (sec.steps && sec.steps.length > 0) {
          for (const step of sec.steps) {
            await client.query(
              'INSERT INTO recipe_steps (recipe_id, section_id, instruction, duration_seconds, temperature_celsius, position) VALUES ($1,$2,$3,$4,$5,$6)',
              [recipe.id, section.id, step.instruction, step.duration_seconds ?? null, step.temperature_celsius ?? null, step.position],
            );
          }
        }
      }
    }

    // Create initial version
    const versionRes = await client.query(
      "INSERT INTO recipe_versions (recipe_id, version_number, change_summary) VALUES ($1, 1, 'Imported recipe') RETURNING *",
      [recipe.id],
    );

    // Fetch full recipe for snapshot and return
    const ingredientsRes = await client.query('SELECT * FROM recipe_ingredients WHERE recipe_id = $1 ORDER BY position', [recipe.id]);
    const sectionsRes = await client.query('SELECT * FROM recipe_sections WHERE recipe_id = $1 ORDER BY position', [recipe.id]);
    const stepsRes = await client.query('SELECT * FROM recipe_steps WHERE recipe_id = $1 ORDER BY position', [recipe.id]);
    const sections = sectionsRes.rows.map((s: any) => ({
      ...s,
      steps: stepsRes.rows.filter((st: any) => st.section_id === s.id),
    }));

    await client.query(
      'INSERT INTO recipe_version_snapshots (version_id, snapshot_data) VALUES ($1, $2)',
      [versionRes.rows[0].id, JSON.stringify({ ...recipe, ingredients: ingredientsRes.rows, sections })],
    );

    const fullRecipe = recipe as RecipeWithDetails;
    fullRecipe.ingredients = ingredientsRes.rows as any;
    fullRecipe.sections = sections as any;
    return fullRecipe;
  });
}

// ---------------------------------------------------------------------------
// 19.2 — Parse schema.org Recipe from HTML
// ---------------------------------------------------------------------------

export function parseSchemaOrgRecipe(html: string, sourceUrl: string): UrlImportResult {
  const warnings: string[] = [];
  let recipeData: any = null;

  // Extract JSON-LD blocks
  const jsonLdRegex = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;

  while ((m = jsonLdRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1]);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (item['@type'] === 'Recipe' || (Array.isArray(item['@type']) && item['@type'].includes('Recipe'))) {
          recipeData = item;
          break;
        }
        if (item['@graph'] && Array.isArray(item['@graph'])) {
          for (const gi of item['@graph']) {
            if (gi['@type'] === 'Recipe' || (Array.isArray(gi['@type']) && gi['@type'].includes('Recipe'))) {
              recipeData = gi;
              break;
            }
          }
          if (recipeData) break;
        }
      }
      if (recipeData) break;
    } catch {
      warnings.push('Failed to parse JSON-LD block');
    }
  }

  if (!recipeData) {
    throw new ValidationError('No schema.org Recipe markup found at URL', ['Could not find JSON-LD Recipe data']);
  }

  const title = recipeData.name || 'Untitled Recipe';
  const description = recipeData.description || null;
  const author = typeof recipeData.author === 'string'
    ? recipeData.author
    : recipeData.author?.name || null;

  let servings = 1;
  if (recipeData.recipeYield) {
    const yieldStr = Array.isArray(recipeData.recipeYield) ? recipeData.recipeYield[0] : recipeData.recipeYield;
    const p = parseInt(String(yieldStr), 10);
    if (!isNaN(p) && p > 0) servings = p;
  }

  const ingredients = (recipeData.recipeIngredient || []).map((text: string, idx: number) => {
    const parsed = parseIngredientText(text);
    return {
      display_name: parsed.name,
      quantity_original: parsed.quantity,
      unit_original: parsed.unit,
      quantity_grams: parsed.quantity,
      position: idx + 1,
      is_flour: false,
      is_liquid: false,
    };
  });

  const rawInstructions = recipeData.recipeInstructions || [];
  const steps: any[] = [];
  let stepPos = 0;

  if (Array.isArray(rawInstructions)) {
    for (const item of rawInstructions) {
      stepPos++;
      if (typeof item === 'string') {
        steps.push({ instruction: item, duration_seconds: null, temperature_celsius: null, position: stepPos });
      } else if (item['@type'] === 'HowToStep') {
        steps.push({ instruction: item.text || item.name || '', duration_seconds: null, temperature_celsius: null, position: stepPos });
      } else if (item['@type'] === 'HowToSection') {
        for (const s of (item.itemListElement || [])) {
          stepPos++;
          steps.push({ instruction: s.text || s.name || '', duration_seconds: null, temperature_celsius: null, position: stepPos });
        }
      }
    }
  }

  // Extract images
  const images: string[] = [];
  if (recipeData.image) {
    if (typeof recipeData.image === 'string') {
      images.push(recipeData.image);
    } else if (Array.isArray(recipeData.image)) {
      for (const img of recipeData.image) {
        if (typeof img === 'string') images.push(img);
        else if (img.url) images.push(img.url);
      }
    } else if (recipeData.image.url) {
      images.push(recipeData.image.url);
    }
  }

  return {
    recipe: {
      title,
      description,
      source_type: 'url' as const,
      source_url: sourceUrl,
      original_author: author,
      servings,
      yield_weight_grams: servings * 100,
      ingredients,
      sections: steps.length > 0
        ? [{ type: 'prep' as const, title: 'Instructions', position: 1, steps }]
        : [],
    },
    source_url: sourceUrl,
    source_author: author,
    images,
    parse_warnings: warnings,
  };
}

// ---------------------------------------------------------------------------
// 19.2 — Import recipe from URL (receives pre-fetched HTML)
// ---------------------------------------------------------------------------

export async function importFromUrl(_userId: string, url: string, htmlContent: string): Promise<UrlImportResult> {
  return parseSchemaOrgRecipe(htmlContent, url);
}

// ---------------------------------------------------------------------------
// 19.3 — Export to Markdown
// ---------------------------------------------------------------------------

export async function exportToMarkdown(recipeId: string, userId: string): Promise<MarkdownExportResult> {
  const recipe = await fetchRecipeWithDetails(recipeId, userId);
  const lines: string[] = [];

  lines.push(`# ${recipe.title}`, '');
  if (recipe.description) lines.push(recipe.description, '');
  lines.push(`**Servings:** ${recipe.servings}`, `**Yield:** ${recipe.yield_weight_grams}g`);
  if (recipe.original_author) lines.push(`**Author:** ${recipe.original_author}`);
  if (recipe.source_url) lines.push(`**Source:** ${recipe.source_url}`);
  lines.push('');

  if (recipe.ingredients.length > 0) {
    lines.push('## Ingredients', '');
    for (const ing of recipe.ingredients) {
      lines.push(`- ${ing.quantity_original} ${ing.unit_original} ${ing.display_name}`);
    }
    lines.push('');
  }

  if (recipe.sections.length > 0) {
    lines.push('## Instructions', '');
    for (const sec of recipe.sections) {
      if (sec.title) lines.push(`### ${sec.title}`);
      lines.push('');
      for (const step of sec.steps || []) {
        let t = `${step.position}. ${step.instruction}`;
        if (step.duration_seconds) t += ` *(${Math.ceil(step.duration_seconds / 60)} min)*`;
        if (step.temperature_celsius) t += ` *at ${step.temperature_celsius}\u00B0C*`;
        lines.push(t);
      }
      lines.push('');
    }
  }

  lines.push('---', `*Exported from AiBake on ${new Date().toISOString().split('T')[0]}*`);

  const slug = recipe.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return { content: lines.join('\n'), filename: `${slug}.md` };
}

// ---------------------------------------------------------------------------
// 19.3 — Export to PDF (structured text stub)
// ---------------------------------------------------------------------------

export async function exportToPdf(recipeId: string, userId: string): Promise<PdfExportResult> {
  const recipe = await fetchRecipeWithDetails(recipeId, userId);
  const lines: string[] = [];

  lines.push('============================================================');
  lines.push(recipe.title.toUpperCase());
  lines.push('============================================================', '');
  if (recipe.description) lines.push(recipe.description, '');
  lines.push(`Servings: ${recipe.servings}    Yield: ${recipe.yield_weight_grams}g`);
  if (recipe.original_author) lines.push(`Author: ${recipe.original_author}`);
  lines.push('------------------------------------------------------------', '');

  if (recipe.ingredients.length > 0) {
    lines.push('INGREDIENTS', '----------------------------------------');
    for (const ing of recipe.ingredients) {
      const qty = `${ing.quantity_original} ${ing.unit_original}`.padEnd(20);
      lines.push(`  ${qty} ${ing.display_name}`);
    }
    lines.push('');
  }

  if (recipe.sections.length > 0) {
    lines.push('INSTRUCTIONS', '----------------------------------------');
    for (const sec of recipe.sections) {
      if (sec.title) lines.push('', `  ${sec.title.toUpperCase()}`);
      for (const step of sec.steps || []) {
        let t = `  ${step.position}. ${step.instruction}`;
        if (step.duration_seconds) t += ` (${Math.ceil(step.duration_seconds / 60)} min)`;
        if (step.temperature_celsius) t += ` at ${step.temperature_celsius}\u00B0C`;
        lines.push(t);
      }
    }
    lines.push('');
  }

  lines.push('------------------------------------------------------------');
  lines.push(`Exported from AiBake - ${new Date().toISOString().split('T')[0]}`);

  const slug = recipe.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return { content: lines.join('\n'), filename: `${slug}.pdf` };
}

// ---------------------------------------------------------------------------
// 19.3 — Export to JSON-LD (schema.org)
// ---------------------------------------------------------------------------

export async function exportToJsonLd(recipeId: string, userId: string): Promise<JsonLdExportResult> {
  const recipe = await fetchRecipeWithDetails(recipeId, userId);

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.title,
    description: recipe.description || undefined,
    author: recipe.original_author
      ? { '@type': 'Person', name: recipe.original_author }
      : undefined,
    recipeYield: String(recipe.servings),
    recipeIngredient: recipe.ingredients.map(
      (ing) => `${ing.quantity_original} ${ing.unit_original} ${ing.display_name}`,
    ),
    recipeInstructions: recipe.sections.flatMap((sec) =>
      (sec.steps || []).map((step) => ({
        '@type': 'HowToStep',
        text: step.instruction,
      })),
    ),
  };

  if (recipe.source_url) jsonLd.url = recipe.source_url;

  const slug = recipe.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return { data: jsonLd, filename: `${slug}.jsonld` };
}
