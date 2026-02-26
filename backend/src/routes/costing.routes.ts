import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import * as costingController from '../controllers/costing.controller';

const router = Router();

// ---------------------------------------------------------------------------
// Validation chains
// ---------------------------------------------------------------------------

const recipeIdValidation = [
  param('id').isUUID().withMessage('Invalid recipe ID'),
];

const calculateCostValidation = [
  param('id').isUUID().withMessage('Invalid recipe ID'),
  body('overhead_cost')
    .optional()
    .isFloat({ min: 0 }).withMessage('Overhead cost must be non-negative'),
  body('packaging_cost')
    .optional()
    .isFloat({ min: 0 }).withMessage('Packaging cost must be non-negative'),
  body('labor_cost')
    .optional()
    .isFloat({ min: 0 }).withMessage('Labor cost must be non-negative'),
  body('currency')
    .optional()
    .isString().isLength({ min: 3, max: 3 }).withMessage('Currency must be a 3-letter code'),
];

const calculatePricingValidation = [
  param('id').isUUID().withMessage('Invalid recipe ID'),
  body('target_profit_margin_percent')
    .notEmpty().withMessage('Target profit margin is required')
    .isFloat({ min: 0, max: 99.99 }).withMessage('Profit margin must be between 0 and 99.99'),
  body('custom_selling_price')
    .optional()
    .isFloat({ min: 0.01 }).withMessage('Custom selling price must be positive'),
];

// ---------------------------------------------------------------------------
// Routes — specific paths before parameterized ones
// ---------------------------------------------------------------------------

// Reports (must come before :id routes)
router.get(
  '/costing/reports/profit-margins',
  requireAuth,
  costingController.profitMarginReport,
);

router.get(
  '/costing/reports/cost-trends',
  requireAuth,
  costingController.costTrendReport,
);

// Recipe cost calculation
router.post(
  '/recipes/:id/cost/calculate',
  requireAuth,
  validate(calculateCostValidation),
  costingController.calculateCost,
);

// Cost history (must come before GET /recipes/:id/cost)
router.get(
  '/recipes/:id/cost/history',
  requireAuth,
  validate(recipeIdValidation),
  costingController.getCostHistory,
);

// Current cost
router.get(
  '/recipes/:id/cost',
  requireAuth,
  validate(recipeIdValidation),
  costingController.getCurrentCost,
);

// Pricing
router.post(
  '/recipes/:id/pricing',
  requireAuth,
  validate(calculatePricingValidation),
  costingController.calculatePricing,
);

export default router;
