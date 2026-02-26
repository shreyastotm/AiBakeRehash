import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import * as ingredientController from '../controllers/ingredient.controller';

const router = Router();

const validCategories = [
  'flour', 'fat', 'sugar', 'leavening', 'dairy',
  'liquid', 'fruit', 'nut', 'spice', 'other',
];

const createIngredientValidation = [
  body('name')
    .notEmpty().withMessage('Name is required')
    .trim()
    .isLength({ max: 200 }).withMessage('Name must be 200 characters or less'),
  body('category')
    .notEmpty().withMessage('Category is required')
    .isIn(validCategories).withMessage('Invalid category'),
  body('default_density_g_per_ml')
    .optional({ nullable: true })
    .isFloat({ min: 0.01 }).withMessage('Density must be positive'),
  body('nutrition_per_100g')
    .optional({ nullable: true })
    .isObject().withMessage('Nutrition must be an object'),
  body('allergen_flags')
    .optional({ nullable: true })
    .isObject().withMessage('Allergen flags must be an object'),
  body('is_composite')
    .optional()
    .isBoolean().withMessage('is_composite must be a boolean'),
];

const idParamValidation = [
  param('id').isUUID().withMessage('Invalid ingredient ID'),
];

const searchValidation = [
  query('q').notEmpty().withMessage('Search query is required'),
];

router.get('/ingredients/search', validate(searchValidation), ingredientController.search);
router.get('/ingredients', ingredientController.list);
router.get('/ingredients/:id', validate(idParamValidation), ingredientController.getById);
router.post('/ingredients', requireAuth, validate(createIngredientValidation), ingredientController.create);

export default router;
