import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import * as supplierController from '../controllers/supplier.controller';

const router = Router();

// ---------------------------------------------------------------------------
// Validation chains
// ---------------------------------------------------------------------------

const idParamValidation = [
  param('id').isUUID().withMessage('Invalid ID'),
];

const createSupplierValidation = [
  body('name')
    .notEmpty().withMessage('Supplier name is required')
    .isString().trim().isLength({ max: 200 }).withMessage('Name must be 200 characters or less'),
  body('contact_person')
    .optional({ nullable: true })
    .isString().trim().isLength({ max: 200 }),
  body('phone')
    .optional({ nullable: true })
    .isString().trim().isLength({ max: 50 }),
  body('email')
    .optional({ nullable: true })
    .isEmail().withMessage('Invalid email format'),
  body('address')
    .optional({ nullable: true })
    .isString(),
  body('notes')
    .optional({ nullable: true })
    .isString(),
];

const updateSupplierValidation = [
  param('id').isUUID().withMessage('Invalid supplier ID'),
  body('name')
    .optional()
    .isString().trim().isLength({ min: 1, max: 200 }).withMessage('Name must be 1-200 characters'),
  body('contact_person')
    .optional({ nullable: true })
    .isString().trim().isLength({ max: 200 }),
  body('phone')
    .optional({ nullable: true })
    .isString().trim().isLength({ max: 50 }),
  body('email')
    .optional({ nullable: true })
    .isEmail().withMessage('Invalid email format'),
  body('address')
    .optional({ nullable: true })
    .isString(),
  body('notes')
    .optional({ nullable: true })
    .isString(),
];

const createPackagingValidation = [
  body('name')
    .notEmpty().withMessage('Packaging name is required')
    .isString().trim().isLength({ max: 200 }).withMessage('Name must be 200 characters or less'),
  body('cost_per_unit')
    .notEmpty().withMessage('Cost per unit is required')
    .isFloat({ min: 0 }).withMessage('Cost per unit must be non-negative'),
  body('currency')
    .optional()
    .isString().isLength({ min: 3, max: 3 }).withMessage('Currency must be a 3-letter code'),
  body('quantity_on_hand')
    .optional({ nullable: true })
    .isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
  body('notes')
    .optional({ nullable: true })
    .isString(),
];

const updatePackagingValidation = [
  param('id').isUUID().withMessage('Invalid packaging item ID'),
  body('name')
    .optional()
    .isString().trim().isLength({ min: 1, max: 200 }),
  body('cost_per_unit')
    .optional()
    .isFloat({ min: 0 }).withMessage('Cost per unit must be non-negative'),
  body('currency')
    .optional()
    .isString().isLength({ min: 3, max: 3 }).withMessage('Currency must be a 3-letter code'),
  body('quantity_on_hand')
    .optional({ nullable: true })
    .isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
  body('notes')
    .optional({ nullable: true })
    .isString(),
];

const createDeliveryZoneValidation = [
  body('zone_name')
    .notEmpty().withMessage('Zone name is required')
    .isString().trim().isLength({ max: 200 }).withMessage('Zone name must be 200 characters or less'),
  body('base_charge')
    .notEmpty().withMessage('Base charge is required')
    .isFloat({ min: 0 }).withMessage('Base charge must be non-negative'),
  body('per_km_charge')
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('Per-km charge must be non-negative'),
  body('free_delivery_threshold')
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('Free delivery threshold must be non-negative'),
  body('currency')
    .optional()
    .isString().isLength({ min: 3, max: 3 }).withMessage('Currency must be a 3-letter code'),
];

const updateDeliveryZoneValidation = [
  param('id').isUUID().withMessage('Invalid delivery zone ID'),
  body('zone_name')
    .optional()
    .isString().trim().isLength({ min: 1, max: 200 }),
  body('base_charge')
    .optional()
    .isFloat({ min: 0 }).withMessage('Base charge must be non-negative'),
  body('per_km_charge')
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('Per-km charge must be non-negative'),
  body('free_delivery_threshold')
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('Free delivery threshold must be non-negative'),
  body('currency')
    .optional()
    .isString().isLength({ min: 3, max: 3 }).withMessage('Currency must be a 3-letter code'),
];

// ---------------------------------------------------------------------------
// Supplier routes
// ---------------------------------------------------------------------------

router.get('/suppliers', requireAuth, supplierController.listSuppliers);

router.get(
  '/suppliers/:id/ingredients',
  requireAuth,
  validate(idParamValidation),
  supplierController.getSupplierIngredients,
);

router.get(
  '/suppliers/:id',
  requireAuth,
  validate(idParamValidation),
  supplierController.getSupplier,
);

router.post(
  '/suppliers',
  requireAuth,
  validate(createSupplierValidation),
  supplierController.createSupplier,
);

router.patch(
  '/suppliers/:id',
  requireAuth,
  validate(updateSupplierValidation),
  supplierController.updateSupplier,
);

router.delete(
  '/suppliers/:id',
  requireAuth,
  validate(idParamValidation),
  supplierController.deleteSupplier,
);

// ---------------------------------------------------------------------------
// Packaging routes
// ---------------------------------------------------------------------------

router.get('/packaging', requireAuth, supplierController.listPackaging);

router.post(
  '/packaging',
  requireAuth,
  validate(createPackagingValidation),
  supplierController.createPackaging,
);

router.patch(
  '/packaging/:id',
  requireAuth,
  validate(updatePackagingValidation),
  supplierController.updatePackaging,
);

router.delete(
  '/packaging/:id',
  requireAuth,
  validate(idParamValidation),
  supplierController.deletePackaging,
);

// ---------------------------------------------------------------------------
// Delivery Zone routes
// ---------------------------------------------------------------------------

router.get('/delivery-zones', requireAuth, supplierController.listDeliveryZones);

router.post(
  '/delivery-zones',
  requireAuth,
  validate(createDeliveryZoneValidation),
  supplierController.createDeliveryZone,
);

router.patch(
  '/delivery-zones/:id',
  requireAuth,
  validate(updateDeliveryZoneValidation),
  supplierController.updateDeliveryZone,
);

router.delete(
  '/delivery-zones/:id',
  requireAuth,
  validate(idParamValidation),
  supplierController.deleteDeliveryZone,
);

export default router;
