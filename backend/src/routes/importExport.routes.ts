import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import * as importExportController from '../controllers/importExport.controller';

const router = Router();

// ---------------------------------------------------------------------------
// Validation chains
// ---------------------------------------------------------------------------

const exportValidation = [
  param('id').isUUID().withMessage('Valid recipe ID is required'),
];

const bulkExportValidation = [
  body('recipe_ids')
    .isArray({ min: 1, max: 50 })
    .withMessage('recipe_ids must be an array of 1-50 UUIDs'),
  body('recipe_ids.*').isUUID().withMessage('Each recipe_id must be a valid UUID'),
];

const importValidation = [
  body('recipe').isObject().withMessage('recipe object is required'),
  body('recipe.title').notEmpty().withMessage('Recipe title is required'),
  body('recipe.servings').isInt({ min: 1 }).withMessage('Servings must be a positive integer'),
  body('recipe.yield_weight_grams')
    .isFloat({ gt: 0 })
    .withMessage('yield_weight_grams must be a positive number'),
];

const urlImportValidation = [
  body('url').isURL().withMessage('Valid URL is required'),
  body('html_content').isString().notEmpty().withMessage('html_content is required'),
];

const formatExportValidation = [
  param('id').isUUID().withMessage('Valid recipe ID is required'),
];

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// Export single recipe to JSON
router.get(
  '/recipes/:id/export',
  requireAuth,
  validate(exportValidation),
  importExportController.exportRecipe,
);

// Bulk export recipes
router.post(
  '/recipes/export/bulk',
  requireAuth,
  validate(bulkExportValidation),
  importExportController.bulkExportRecipes,
);

// Import recipe from JSON
router.post(
  '/recipes/import',
  requireAuth,
  validate(importValidation),
  importExportController.importRecipe,
);

// Import recipe from URL
router.post(
  '/recipes/import-url',
  requireAuth,
  validate(urlImportValidation),
  importExportController.importFromUrl,
);

// Export to Markdown
router.get(
  '/recipes/:id/export/markdown',
  requireAuth,
  validate(formatExportValidation),
  importExportController.exportToMarkdown,
);

// Export to PDF (structured text)
router.get(
  '/recipes/:id/export/pdf',
  requireAuth,
  validate(formatExportValidation),
  importExportController.exportToPdf,
);

// Export to JSON-LD (schema.org)
router.get(
  '/recipes/:id/export/jsonld',
  requireAuth,
  validate(formatExportValidation),
  importExportController.exportToJsonLd,
);

export default router;
