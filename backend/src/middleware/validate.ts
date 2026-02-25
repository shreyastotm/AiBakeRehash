import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';

/**
 * Middleware factory that runs an array of express-validator checks and
 * returns a 400 response with structured errors if validation fails.
 *
 * Usage:
 * ```ts
 * router.post('/recipes', validate([
 *   body('title').notEmpty().withMessage('Title is required'),
 *   body('servings').isInt({ min: 1 }),
 * ]), recipeController.create);
 * ```
 */
export function validate(validations: ValidationChain[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Run all validations
    await Promise.all(validations.map((v) => v.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      next();
      return;
    }

    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: errors.array().map((e) => ({
          field: 'path' in e ? e.path : undefined,
          message: e.msg,
          value: 'value' in e ? e.value : undefined,
        })),
        requestId: req.requestId,
      },
    });
  };
}
