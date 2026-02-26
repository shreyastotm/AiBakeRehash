import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import * as socialController from '../controllers/social.controller';

const router = Router();

// ---------------------------------------------------------------------------
// Validation chains
// ---------------------------------------------------------------------------

const recipeCardValidation = [
  body('recipe_id').isUUID().withMessage('Valid recipe_id is required'),
  body('format')
    .isIn(['instagram_story', 'instagram_post', 'whatsapp'])
    .withMessage('Format must be instagram_story, instagram_post, or whatsapp'),
  body('language')
    .isIn(['en', 'hi', 'bilingual'])
    .withMessage('Language must be en, hi, or bilingual'),
  body('include_branding').isBoolean().withMessage('include_branding must be a boolean'),
  body('watermark_text')
    .optional({ nullable: true })
    .isString().trim().isLength({ max: 100 }).withMessage('Watermark text must be 100 characters or less'),
  body('color_scheme')
    .optional()
    .isIn(['light', 'dark', 'custom'])
    .withMessage('Color scheme must be light, dark, or custom'),
  body('custom_colors')
    .optional({ nullable: true })
    .isObject().withMessage('custom_colors must be an object'),
  body('custom_colors.background')
    .optional()
    .isString().withMessage('Background color must be a string'),
  body('custom_colors.text')
    .optional()
    .isString().withMessage('Text color must be a string'),
  body('custom_colors.accent')
    .optional()
    .isString().withMessage('Accent color must be a string'),
];

const journalCardValidation = [
  body('journal_entry_id').isUUID().withMessage('Valid journal_entry_id is required'),
  body('hide_private_notes').isBoolean().withMessage('hide_private_notes must be a boolean'),
  body('language')
    .isIn(['en', 'hi', 'bilingual'])
    .withMessage('Language must be en, hi, or bilingual'),
  body('color_scheme')
    .optional()
    .isIn(['light', 'dark', 'custom'])
    .withMessage('Color scheme must be light, dark, or custom'),
];

const whatsappFormatValidation = [
  body('recipe_id').isUUID().withMessage('Valid recipe_id is required'),
  body('content_type')
    .isIn(['recipe', 'shopping_list', 'inventory_reminder'])
    .withMessage('content_type must be recipe, shopping_list, or inventory_reminder'),
  body('language')
    .isIn(['en', 'hi', 'bilingual'])
    .withMessage('Language must be en, hi, or bilingual'),
  body('include_image').isBoolean().withMessage('include_image must be a boolean'),
];

const templatePreferenceValidation = [
  body('template_id').notEmpty().withMessage('template_id is required').isString(),
  body('custom_colors')
    .optional({ nullable: true })
    .isObject().withMessage('custom_colors must be an object'),
  body('custom_font')
    .optional({ nullable: true })
    .isString().isLength({ max: 100 }),
  body('watermark_text')
    .optional({ nullable: true })
    .isString().isLength({ max: 100 }),
];

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

router.post(
  '/social/recipe-card',
  requireAuth,
  validate(recipeCardValidation),
  socialController.generateRecipeCard,
);

router.post(
  '/social/journal-card',
  requireAuth,
  validate(journalCardValidation),
  socialController.generateJournalCard,
);

router.post(
  '/social/whatsapp-format',
  requireAuth,
  validate(whatsappFormatValidation),
  socialController.formatForWhatsApp,
);

router.get(
  '/social/templates',
  requireAuth,
  socialController.listTemplates,
);

router.post(
  '/social/templates/preferences',
  requireAuth,
  validate(templatePreferenceValidation),
  socialController.saveTemplatePreference,
);

export default router;
