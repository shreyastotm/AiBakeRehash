import { db } from '../config/database';
import { NotFoundError } from '../middleware/errorHandler';
import {
  RecipeCardRequest,
  RecipeCardResult,
  JournalCardRequest,
  JournalCardResult,
  WhatsAppFormatRequest,
  WhatsAppFormatResult,
  SocialTemplate,
  UserTemplatePreference,
  CreateTemplatePreferenceInput,
  CARD_DIMENSIONS,
  WHATSAPP_MAX_IMAGE_BYTES,
  CardFormat,
  CardLanguage,
  OpenGraphMetadata,
} from '../models/social.model';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_URL = process.env.APP_BASE_URL || 'https://aibake.app';

function estimateFileSize(format: CardFormat): number {
  const dims = CARD_DIMENSIONS[format];
  // Rough WebP estimate: ~0.5 bytes per pixel for compressed recipe cards
  const estimate = Math.round(dims.width * dims.height * 0.5);
  if (format === 'whatsapp') {
    return Math.min(estimate, WHATSAPP_MAX_IMAGE_BYTES);
  }
  return estimate;
}

function mockImageUrl(recipeId: string, format: CardFormat): string {
  return `${BASE_URL}/storage/cards/${recipeId}_${format}.webp`;
}

// ---------------------------------------------------------------------------
// Recipe Card Generation (18.1)
// ---------------------------------------------------------------------------

export async function generateRecipeCard(
  userId: string,
  input: RecipeCardRequest,
): Promise<RecipeCardResult> {
  // Fetch recipe and verify ownership
  const recipeRes = await db.query(
    'SELECT id, user_id, title, description, servings, yield_weight_grams FROM recipes WHERE id = $1',
    [input.recipe_id],
  );
  if (recipeRes.rowCount === 0) throw new NotFoundError('Recipe');
  const recipe = recipeRes.rows[0] as { id: string; user_id: string; title: string; description: string | null; servings: number; yield_weight_grams: number };
  if (recipe.user_id !== userId) throw new NotFoundError('Recipe');

  // Fetch ingredients
  const ingredientsRes = await db.query(
    'SELECT display_name, quantity_original, unit_original FROM recipe_ingredients WHERE recipe_id = $1 ORDER BY position',
    [input.recipe_id],
  );
  const ingredients = ingredientsRes.rows as { display_name: string; quantity_original: number; unit_original: string }[];

  // Fetch key steps (first 5)
  const stepsRes = await db.query(
    'SELECT instruction FROM recipe_steps WHERE recipe_id = $1 ORDER BY position LIMIT 5',
    [input.recipe_id],
  );
  const steps = stepsRes.rows as { instruction: string }[];

  const dims = CARD_DIMENSIONS[input.format];
  const fileSizeBytes = estimateFileSize(input.format);
  const imageUrl = mockImageUrl(input.recipe_id, input.format);

  // In production, this would render an actual image using node-canvas or Puppeteer.
  // For now, we build the card data structure and return metadata.

  return {
    image_url: imageUrl,
    width: dims.width,
    height: dims.height,
    format: 'webp',
    file_size_bytes: fileSizeBytes,
    recipe_title: recipe.title,
    language: input.language,
  };
}

// ---------------------------------------------------------------------------
// Journal Card Generation (18.2)
// ---------------------------------------------------------------------------

export async function generateJournalCard(
  userId: string,
  input: JournalCardRequest,
): Promise<JournalCardResult> {
  const entryRes = await db.query(
    `SELECT je.id, je.recipe_id, je.bake_date, je.notes, je.private_notes,
            je.rating, je.images, je.outcome_weight_grams,
            r.title AS recipe_title, r.user_id
     FROM recipe_journal_entries je
     JOIN recipes r ON r.id = je.recipe_id
     WHERE je.id = $1`,
    [input.journal_entry_id],
  );
  if (entryRes.rowCount === 0) throw new NotFoundError('Journal entry');
  const entry = entryRes.rows[0] as {
    id: string; recipe_id: string; bake_date: string; notes: string | null;
    private_notes: string | null; rating: number | null; images: string[] | null;
    outcome_weight_grams: number | null; recipe_title: string; user_id: string;
  };
  if (entry.user_id !== userId) throw new NotFoundError('Journal entry');

  const dims = CARD_DIMENSIONS.instagram_post; // journal cards use square format
  const shareId = entry.id.slice(0, 8);
  const shareableLink = `${BASE_URL}/share/journal/${shareId}`;

  const ogMeta: OpenGraphMetadata = {
    og_title: `Baking Journal: ${entry.recipe_title}`,
    og_description: input.hide_private_notes
      ? (entry.notes || 'A baking journal entry')
      : (entry.notes || entry.private_notes || 'A baking journal entry'),
    og_image: entry.images?.[0] || `${BASE_URL}/images/default-journal.webp`,
    og_url: shareableLink,
    og_type: 'article',
  };

  return {
    image_url: `${BASE_URL}/storage/journal-cards/${entry.id}.webp`,
    shareable_link: shareableLink,
    width: dims.width,
    height: dims.height,
    format: 'webp',
    file_size_bytes: estimateFileSize('instagram_post'),
    preview_metadata: ogMeta,
  };
}

// ---------------------------------------------------------------------------
// WhatsApp Formatting (18.3)
// ---------------------------------------------------------------------------

const EMOJI: Record<string, string> = {
  title: '🍪',
  ingredients: '📊',
  time: '⏱️',
  temp: '🔥',
  link: '👉',
  heart: '❤️',
  shopping: '🛒',
  warning: '⚠️',
  check: '✅',
  bullet: '•',
};

function formatRecipeForWhatsApp(
  recipe: { title: string; servings: number; yield_weight_grams: number },
  ingredients: { display_name: string; quantity_original: number; unit_original: string }[],
  steps: { instruction: string; duration_seconds: number | null; temperature_celsius: number | null }[],
  language: CardLanguage,
): string {
  const lines: string[] = [];

  // Title
  lines.push(`${EMOJI.title} *AiBake Recipe: ${recipe.title}*`);
  lines.push('');

  // Ingredients
  const ingredientHeader = language === 'hi' ? 'सामग्री' : 'Ingredients';
  lines.push(`${EMOJI.ingredients} *${ingredientHeader}:*`);
  for (const ing of ingredients) {
    lines.push(`${EMOJI.bullet} ${ing.quantity_original}${ing.unit_original} ${ing.display_name}`);
  }
  lines.push('');

  // Time & temperature from steps
  const totalSeconds = steps.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
  if (totalSeconds > 0) {
    const mins = Math.ceil(totalSeconds / 60);
    lines.push(`${EMOJI.time} *${language === 'hi' ? 'समय' : 'Time'}:* ${mins} ${language === 'hi' ? 'मिनट' : 'minutes'}`);
  }
  const tempStep = steps.find((s) => s.temperature_celsius != null);
  if (tempStep?.temperature_celsius) {
    lines.push(`${EMOJI.temp} *${language === 'hi' ? 'तापमान' : 'Temp'}:* ${tempStep.temperature_celsius}°C`);
  }
  lines.push('');

  // Footer
  lines.push(`Made with ${EMOJI.heart} by AiBake`);

  return lines.join('\n');
}

function formatShoppingListForWhatsApp(
  ingredients: { display_name: string; quantity_original: number; unit_original: string }[],
  language: CardLanguage,
): string {
  const lines: string[] = [];
  const header = language === 'hi' ? 'खरीदारी सूची' : 'Shopping List';
  lines.push(`${EMOJI.shopping} *AiBake ${header}*`);
  lines.push('');
  for (const ing of ingredients) {
    lines.push(`${EMOJI.check} ${ing.quantity_original}${ing.unit_original} ${ing.display_name}`);
  }
  lines.push('');
  lines.push(`Made with ${EMOJI.heart} by AiBake`);
  return lines.join('\n');
}

export async function formatForWhatsApp(
  userId: string,
  input: WhatsAppFormatRequest,
): Promise<WhatsAppFormatResult> {
  // Fetch recipe
  const recipeRes = await db.query(
    'SELECT id, user_id, title, servings, yield_weight_grams FROM recipes WHERE id = $1',
    [input.recipe_id],
  );
  if (recipeRes.rowCount === 0) throw new NotFoundError('Recipe');
  const recipe = recipeRes.rows[0] as { id: string; user_id: string; title: string; servings: number; yield_weight_grams: number };
  if (recipe.user_id !== userId) throw new NotFoundError('Recipe');

  // Fetch ingredients
  const ingredientsRes = await db.query(
    'SELECT display_name, quantity_original, unit_original FROM recipe_ingredients WHERE recipe_id = $1 ORDER BY position',
    [input.recipe_id],
  );
  const ingredients = ingredientsRes.rows as { display_name: string; quantity_original: number; unit_original: string }[];

  // Fetch steps with timing info
  const stepsRes = await db.query(
    'SELECT instruction, duration_seconds, temperature_celsius FROM recipe_steps WHERE recipe_id = $1 ORDER BY position',
    [input.recipe_id],
  );
  const steps = stepsRes.rows as { instruction: string; duration_seconds: number | null; temperature_celsius: number | null }[];

  let formattedText: string;
  if (input.content_type === 'shopping_list') {
    formattedText = formatShoppingListForWhatsApp(ingredients, input.language);
  } else {
    formattedText = formatRecipeForWhatsApp(recipe, ingredients, steps, input.language);
  }

  const shareId = recipe.id.slice(0, 8);
  const shareableLink = `${BASE_URL}/r/${shareId}`;
  formattedText += `\n\n${EMOJI.link} ${shareableLink}`;

  const ogMeta: OpenGraphMetadata = {
    og_title: recipe.title,
    og_description: `${ingredients.length} ingredients | ${recipe.servings} servings`,
    og_image: input.include_image ? mockImageUrl(recipe.id, 'whatsapp') : `${BASE_URL}/images/default-recipe.webp`,
    og_url: shareableLink,
    og_type: 'article',
  };

  return {
    formatted_text: formattedText,
    shareable_link: shareableLink,
    image_url: input.include_image ? mockImageUrl(recipe.id, 'whatsapp') : null,
    image_compressed: input.include_image,
    preview_metadata: ogMeta,
  };
}

// ---------------------------------------------------------------------------
// Social Media Templates (18.4)
// ---------------------------------------------------------------------------

const DEFAULT_TEMPLATES: SocialTemplate[] = [
  {
    id: 'tpl-light-story',
    name: 'Classic Light Story',
    description: 'Clean white background with warm accents for Instagram stories',
    format: 'instagram_story',
    color_scheme: 'light',
    colors: { background: '#FFFFFF', text: '#333333', accent: '#E8913A' },
    font: 'Playfair Display',
    layout: 'centered',
    is_default: true,
    preview_url: `${BASE_URL}/templates/light-story-preview.webp`,
  },
  {
    id: 'tpl-dark-story',
    name: 'Elegant Dark Story',
    description: 'Dark background with gold accents for Instagram stories',
    format: 'instagram_story',
    color_scheme: 'dark',
    colors: { background: '#1A1A2E', text: '#EAEAEA', accent: '#D4A574' },
    font: 'Montserrat',
    layout: 'centered',
    is_default: false,
    preview_url: `${BASE_URL}/templates/dark-story-preview.webp`,
  },
  {
    id: 'tpl-light-post',
    name: 'Classic Light Post',
    description: 'Clean square layout for Instagram posts',
    format: 'instagram_post',
    color_scheme: 'light',
    colors: { background: '#FFF8F0', text: '#333333', accent: '#C0392B' },
    font: 'Playfair Display',
    layout: 'grid',
    is_default: true,
    preview_url: `${BASE_URL}/templates/light-post-preview.webp`,
  },
  {
    id: 'tpl-whatsapp',
    name: 'WhatsApp Compact',
    description: 'Compact card optimized for WhatsApp sharing',
    format: 'whatsapp',
    color_scheme: 'light',
    colors: { background: '#FFFFFF', text: '#333333', accent: '#25D366' },
    font: 'Roboto',
    layout: 'compact',
    is_default: true,
    preview_url: `${BASE_URL}/templates/whatsapp-preview.webp`,
  },
];

export async function listTemplates(userId: string): Promise<{
  default_templates: SocialTemplate[];
  user_preferences: UserTemplatePreference[];
}> {
  // Fetch user template preferences
  const prefRes = await db.query(
    'SELECT id, user_id, template_id, custom_colors, custom_font, watermark_text, created_at, updated_at FROM user_template_preferences WHERE user_id = $1',
    [userId],
  );
  const preferences = (prefRes.rows as UserTemplatePreference[]) || [];

  return {
    default_templates: DEFAULT_TEMPLATES,
    user_preferences: preferences,
  };
}

export async function saveTemplatePreference(
  userId: string,
  input: CreateTemplatePreferenceInput,
): Promise<UserTemplatePreference> {
  // Validate template_id exists
  const templateExists = DEFAULT_TEMPLATES.some((t) => t.id === input.template_id);
  if (!templateExists) throw new NotFoundError('Template');

  // Upsert preference
  const res = await db.query(
    `INSERT INTO user_template_preferences (user_id, template_id, custom_colors, custom_font, watermark_text)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, template_id) DO UPDATE SET
       custom_colors = EXCLUDED.custom_colors,
       custom_font = EXCLUDED.custom_font,
       watermark_text = EXCLUDED.watermark_text,
       updated_at = NOW()
     RETURNING *`,
    [
      userId,
      input.template_id,
      input.custom_colors ? JSON.stringify(input.custom_colors) : null,
      input.custom_font || null,
      input.watermark_text || null,
    ],
  );

  return res.rows[0] as UserTemplatePreference;
}
