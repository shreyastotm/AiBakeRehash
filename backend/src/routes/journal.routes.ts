import { Router } from 'express';
import { body, param } from 'express-validator';
import multer from 'multer';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import * as journalController from '../controllers/journal.controller';
import * as recipeController from '../controllers/recipe.controller';

const router = Router();

// ---------------------------------------------------------------------------
// Multer configuration (memory storage for cloud upload)
// ---------------------------------------------------------------------------

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// ---------------------------------------------------------------------------
// Validation chains
// ---------------------------------------------------------------------------

const recipeIdValidation = [
  param('id').isUUID().withMessage('Invalid recipe ID'),
];

const journalIdValidation = [
  param('id').isUUID().withMessage('Invalid journal entry ID'),
];

const createJournalValidation = [
  param('id').isUUID().withMessage('Invalid recipe ID'),
  body('bake_date').notEmpty().withMessage('Bake date is required').isISO8601().withMessage('Invalid date format'),
  body('notes').optional({ nullable: true }).isString(),
  body('private_notes').optional({ nullable: true }).isString(),
  body('rating').optional({ nullable: true }).isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('outcome_weight_grams').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Outcome weight must be non-negative'),
  body('pre_bake_weight_grams').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Pre-bake weight must be non-negative'),
  body('measured_water_activity').optional({ nullable: true }).isFloat({ min: 0, max: 1 }).withMessage('Water activity must be between 0 and 1'),
  body('storage_days_achieved').optional({ nullable: true }).isInt({ min: 0 }).withMessage('Storage days must be non-negative'),
];

const updateJournalValidation = [
  param('id').isUUID().withMessage('Invalid journal entry ID'),
  body('bake_date').optional().isISO8601().withMessage('Invalid date format'),
  body('notes').optional({ nullable: true }).isString(),
  body('private_notes').optional({ nullable: true }).isString(),
  body('rating').optional({ nullable: true }).isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('outcome_weight_grams').optional({ nullable: true }).isFloat({ min: 0 }),
  body('pre_bake_weight_grams').optional({ nullable: true }).isFloat({ min: 0 }),
  body('measured_water_activity').optional({ nullable: true }).isFloat({ min: 0, max: 1 }),
  body('storage_days_achieved').optional({ nullable: true }).isInt({ min: 0 }),
];

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// Global journal entries
router.get(
  '/journal',
  requireAuth,
  journalController.listAll,
);

// Journal entries scoped to recipe
router.get(
  '/recipes/:id/journal',
  requireAuth,
  validate(recipeIdValidation),
  journalController.list,
);

router.post(
  '/recipes/:id/journal',
  requireAuth,
  validate(createJournalValidation),
  journalController.create,
);

router.post(
  '/recipes/:id/nutrition/calculate',
  requireAuth,
  validate(recipeIdValidation),
  recipeController.calculateNutrition,
);

// Journal entries by journal ID
router.patch(
  '/journal/:id',
  requireAuth,
  validate(updateJournalValidation),
  journalController.update,
);

router.delete(
  '/journal/:id',
  requireAuth,
  validate(journalIdValidation),
  journalController.remove,
);

// Image upload
router.post(
  '/journal/:id/images',
  requireAuth,
  imageUpload.array('images', 10),
  journalController.uploadImages,
);

// Audio upload
router.post(
  '/journal/:id/audio',
  requireAuth,
  audioUpload.single('audio'),
  journalController.uploadAudio,
);

export default router;
