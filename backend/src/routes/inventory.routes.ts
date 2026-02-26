import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import * as inventoryController from '../controllers/inventory.controller';

const router = Router();

// ---------------------------------------------------------------------------
// Validation chains
// ---------------------------------------------------------------------------

const idParamValidation = [
  param('id').isUUID().withMessage('Invalid inventory item ID'),
];

const createItemValidation = [
  body('ingredient_master_id')
    .notEmpty().withMessage('Ingredient master ID is required')
    .isUUID().withMessage('Invalid ingredient master ID'),
  body('quantity_on_hand')
    .notEmpty().withMessage('Quantity is required')
    .isFloat({ min: 0 }).withMessage('Quantity must be non-negative'),
  body('unit')
    .notEmpty().withMessage('Unit is required')
    .isString().trim().isLength({ max: 50 }).withMessage('Unit must be 50 characters or less'),
  body('cost_per_unit')
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('Cost per unit must be non-negative'),
  body('currency')
    .optional()
    .isString().isLength({ min: 3, max: 3 }).withMessage('Currency must be a 3-letter code'),
  body('purchase_date')
    .optional({ nullable: true })
    .isISO8601().withMessage('Invalid purchase date format'),
  body('expiration_date')
    .optional({ nullable: true })
    .isISO8601().withMessage('Invalid expiration date format'),
  body('supplier_id')
    .optional({ nullable: true })
    .isUUID().withMessage('Invalid supplier ID'),
  body('min_stock_level')
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('Min stock level must be non-negative'),
  body('reorder_quantity')
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('Reorder quantity must be non-negative'),
  body('notes')
    .optional({ nullable: true })
    .isString(),
];

const updateItemValidation = [
  param('id').isUUID().withMessage('Invalid inventory item ID'),
  body('quantity_on_hand')
    .optional()
    .isFloat({ min: 0 }).withMessage('Quantity must be non-negative'),
  body('unit')
    .optional()
    .isString().trim().isLength({ max: 50 }).withMessage('Unit must be 50 characters or less'),
  body('cost_per_unit')
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('Cost per unit must be non-negative'),
  body('currency')
    .optional()
    .isString().isLength({ min: 3, max: 3 }).withMessage('Currency must be a 3-letter code'),
  body('purchase_date')
    .optional({ nullable: true })
    .isISO8601().withMessage('Invalid purchase date format'),
  body('expiration_date')
    .optional({ nullable: true })
    .isISO8601().withMessage('Invalid expiration date format'),
  body('supplier_id')
    .optional({ nullable: true })
    .isUUID().withMessage('Invalid supplier ID'),
  body('min_stock_level')
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('Min stock level must be non-negative'),
  body('reorder_quantity')
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('Reorder quantity must be non-negative'),
  body('notes')
    .optional({ nullable: true })
    .isString(),
];

const createPurchaseValidation = [
  body('ingredient_master_id')
    .notEmpty().withMessage('Ingredient master ID is required')
    .isUUID().withMessage('Invalid ingredient master ID'),
  body('quantity')
    .notEmpty().withMessage('Quantity is required')
    .isFloat({ min: 0.01 }).withMessage('Quantity must be positive'),
  body('unit')
    .notEmpty().withMessage('Unit is required')
    .isString().trim().isLength({ max: 50 }),
  body('cost')
    .notEmpty().withMessage('Cost is required')
    .isFloat({ min: 0 }).withMessage('Cost must be non-negative'),
  body('currency')
    .optional()
    .isString().isLength({ min: 3, max: 3 }).withMessage('Currency must be a 3-letter code'),
  body('supplier_id')
    .optional({ nullable: true })
    .isUUID().withMessage('Invalid supplier ID'),
  body('invoice_number')
    .optional({ nullable: true })
    .isString().isLength({ max: 200 }),
  body('purchase_date')
    .notEmpty().withMessage('Purchase date is required')
    .isISO8601().withMessage('Invalid purchase date format'),
  body('notes')
    .optional({ nullable: true })
    .isString(),
];

const deductValidation = [
  body('recipe_id')
    .notEmpty().withMessage('Recipe ID is required')
    .isUUID().withMessage('Invalid recipe ID'),
  body('scaling_factor')
    .optional()
    .isFloat({ min: 0.01 }).withMessage('Scaling factor must be positive'),
  body('confirm')
    .optional()
    .isBoolean().withMessage('Confirm must be a boolean'),
];

// ---------------------------------------------------------------------------
// Routes — order matters: specific paths before parameterized ones
// ---------------------------------------------------------------------------

// Alerts
router.get(
  '/inventory/alerts',
  requireAuth,
  inventoryController.getAlerts,
);

// Purchases
router.post(
  '/inventory/purchases',
  requireAuth,
  validate(createPurchaseValidation),
  inventoryController.logPurchase,
);

router.get(
  '/inventory/purchases',
  requireAuth,
  inventoryController.listPurchases,
);

// Deduction
router.post(
  '/inventory/deduct',
  requireAuth,
  validate(deductValidation),
  inventoryController.deduct,
);

// Reports
router.get(
  '/inventory/reports/usage',
  requireAuth,
  inventoryController.usageReport,
);

router.get(
  '/inventory/reports/value',
  requireAuth,
  inventoryController.valueReport,
);

// CRUD (parameterized routes last)
router.get(
  '/inventory',
  requireAuth,
  inventoryController.list,
);

router.get(
  '/inventory/:id',
  requireAuth,
  validate(idParamValidation),
  inventoryController.getById,
);

router.post(
  '/inventory',
  requireAuth,
  validate(createItemValidation),
  inventoryController.create,
);

router.patch(
  '/inventory/:id',
  requireAuth,
  validate(updateItemValidation),
  inventoryController.update,
);

router.delete(
  '/inventory/:id',
  requireAuth,
  validate(idParamValidation),
  inventoryController.remove,
);

export default router;
