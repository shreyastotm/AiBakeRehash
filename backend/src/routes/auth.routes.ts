import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';
import * as authController from '../controllers/auth.controller';

const router = Router();

// ---------------------------------------------------------------------------
// Validation chains
// ---------------------------------------------------------------------------

const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[a-z]/)
    .withMessage('Password must contain a lowercase letter')
    .matches(/[A-Z]/)
    .withMessage('Password must contain an uppercase letter')
    .matches(/\d/)
    .withMessage('Password must contain a number'),
  body('display_name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Display name must be 1-100 characters'),
];

const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

const refreshValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required'),
];

const updatePreferencesValidation = [
  body('display_name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Display name must be 1-100 characters'),
  body('unit_preferences')
    .optional()
    .isObject()
    .withMessage('unit_preferences must be an object'),
  body('default_currency')
    .optional()
    .isString()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code'),
  body('language')
    .optional()
    .isIn(['en', 'hi'])
    .withMessage('Language must be "en" or "hi"'),
];

// ---------------------------------------------------------------------------
// Auth routes
// ---------------------------------------------------------------------------

router.post('/auth/register', validate(registerValidation), authController.register);
router.post('/auth/login', authRateLimiter, validate(loginValidation), authController.login);
router.post('/auth/logout', requireAuth, authController.logout);
router.post('/auth/refresh', validate(refreshValidation), authController.refresh);

// ---------------------------------------------------------------------------
// User profile routes
// ---------------------------------------------------------------------------

router.get('/users/me', requireAuth, authController.getMe);
router.patch('/users/me', requireAuth, validate(updatePreferencesValidation), authController.updateMe);

export default router;
