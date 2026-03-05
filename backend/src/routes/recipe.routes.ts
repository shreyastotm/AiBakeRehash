import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import * as recipeController from '../controllers/recipe.controller';

const router = Router();

// ---------------------------------------------------------------------------
// Validation chains
// ---------------------------------------------------------------------------

const createRecipeValidation = [
  body('title').notEmpty().withMessage('Title is required').trim().isLength({ max: 500 }),
  body('servings').isInt({ min: 1 }).withMessage('Servings must be a positive integer'),
  body('yield_weight_grams')
    .isFloat({ min: 0.01 })
    .withMessage('Yield weight must be positive'),
  body('description').optional({ nullable: true }).isString(),
  body('source_type')
    .optional()
    .isIn(['manual', 'image', 'whatsapp', 'url'])
    .withMessage('Invalid source type'),
  body('status')
    .optional()
    .isIn(['draft', 'active', 'archived'])
    .withMessage('Invalid status'),
  body('ingredients').optional().isArray(),
  body('ingredients.*.ingredient_master_id').optional().isUUID(),
  body('ingredients.*.display_name').optional().notEmpty(),
  body('ingredients.*.quantity_original').optional().isFloat({ min: 0 }),
  body('ingredients.*.quantity_grams').optional().isFloat({ min: 0 }),
  body('ingredients.*.position').optional().isInt({ min: 0 }),
  body('sections').optional().isArray(),
  body('sections.*.type')
    .optional()
    .isIn(['pre_prep', 'prep', 'bake', 'rest', 'notes']),
  body('sections.*.position').optional().isInt({ min: 0 }),
];

const updateRecipeValidation = [
  param('id').isUUID().withMessage('Invalid recipe ID'),
  body('title').optional().notEmpty().trim().isLength({ max: 500 }),
  body('servings').optional().isInt({ min: 1 }),
  body('yield_weight_grams').optional().isFloat({ min: 0.01 }),
  body('status')
    .optional()
    .isIn(['draft', 'active', 'archived']),
  body('ingredients').optional().isArray(),
  body('sections').optional().isArray(),
];

const scaleValidation = [
  param('id').isUUID().withMessage('Invalid recipe ID'),
  body('targetYieldGrams').optional().isFloat({ min: 0.01 }),
  body('targetServings').optional().isInt({ min: 1 }),
];

const idParamValidation = [
  param('id').isUUID().withMessage('Invalid recipe ID'),
];

const compareVersionsValidation = [
  param('id').isUUID().withMessage('Invalid recipe ID'),
  query('a').isInt({ min: 1 }).withMessage('Version A must be a positive integer'),
  query('b').isInt({ min: 1 }).withMessage('Version B must be a positive integer'),
];

// ---------------------------------------------------------------------------
// Routes — all require authentication
// ---------------------------------------------------------------------------

// Search must come before :id to avoid matching "search" as a UUID
router.get('/recipes/search', requireAuth, recipeController.search);

router.get('/recipes', requireAuth, recipeController.list);
router.get('/recipes/:id/nutrition', requireAuth, validate(idParamValidation), recipeController.getNutrition);
router.get('/recipes/:id', requireAuth, validate(idParamValidation), recipeController.getById);
router.post('/recipes', requireAuth, validate(createRecipeValidation), recipeController.create);
router.patch('/recipes/:id', requireAuth, validate(updateRecipeValidation), recipeController.update);
router.delete('/recipes/:id', requireAuth, validate(idParamValidation), recipeController.remove);


// Scaling
router.post('/recipes/:id/scale', requireAuth, validate(scaleValidation), recipeController.scale);

// Versioning
router.get('/recipes/:id/versions', requireAuth, validate(idParamValidation), recipeController.listVersions);
router.post('/recipes/:id/versions', requireAuth, validate(idParamValidation), recipeController.createVersion);
router.get('/recipes/:id/versions/compare', requireAuth, validate(compareVersionsValidation), recipeController.compareVersions);

export default router;
