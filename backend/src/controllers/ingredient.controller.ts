import { Request, Response, NextFunction } from 'express';
import * as ingredientService from '../services/ingredient.service';
import { IngredientListQuery } from '../models/ingredient.model';
import { logger } from '../utils/logger';
import { ValidationError } from '../middleware/errorHandler';

/** Extract a single string param (Express v5 params can be string | string[]) */
function paramStr(val: string | string[]): string {
  return Array.isArray(val) ? val[0] : val;
}

// ---------------------------------------------------------------------------
// GET /api/v1/ingredients
// ---------------------------------------------------------------------------

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query: IngredientListQuery = {
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      category: req.query.category as IngredientListQuery['category'],
    };

    const userId = (req.user as any)?.userId || (req.user as any)?.id;
    const result = await ingredientService.listIngredients(userId, query);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/ingredients/search?q=:query
// ---------------------------------------------------------------------------

export async function search(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const q = (req.query.q as string) || '';
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    const userId = (req.user as any)?.userId || (req.user as any)?.id;
    const results = await ingredientService.searchIngredients(q, userId, limit);
    res.json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/ingredients/:id
// ---------------------------------------------------------------------------

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req.user as any)?.userId || (req.user as any)?.id;
    const ingredient = await ingredientService.getIngredient(paramStr(req.params.id), userId);
    res.json({ success: true, data: ingredient });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/ingredients
// ---------------------------------------------------------------------------

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req.user as any)?.userId || (req.user as any)?.id;
    const ingredient = await ingredientService.createIngredient({
      ...req.body,
      user_id: userId,
    });
    res.status(201).json({ success: true, data: ingredient });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/ingredients/merge
// ---------------------------------------------------------------------------

export async function merge(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { source_id, target_id } = req.body;
    const userId = (req.user as any)?.userId || (req.user as any)?.id;

    if (!source_id || !target_id) {
       res.status(400).json({ success: false, error: 'source_id and target_id are required' });
       return;
    }

    await ingredientService.mergeIngredients(source_id as string, target_id as string, userId);

    res.json({
      success: true,
      message: 'Ingredients successfully merged.'
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/ingredients/suggestions
// ---------------------------------------------------------------------------

export async function getSuggestions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req.user as any)?.userId || (req.user as any)?.id;
    logger.info({ userId, url: req.url }, 'GET /ingredients/suggestions called');
    
    if (!userId) {
      throw new ValidationError('User ID not found in token');
    }

    const suggestions = await ingredientService.getDuplicateSuggestions(userId);
    res.json({ success: true, data: suggestions, _debug: 're-routed' });
  } catch (err) {
    logger.error({ err }, 'Error in getSuggestions controller');
    next(err);
  }
}
// ---------------------------------------------------------------------------
// POST /api/v1/ingredients/suggestions/ignore
// ---------------------------------------------------------------------------

export async function ignoreSuggestion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { source_id, target_id } = req.body;
    const userId = (req.user as any)?.userId || (req.user as any)?.id;

    if (!source_id || !target_id) {
       res.status(400).json({ success: false, error: 'source_id and target_id are required' });
       return;
    }

    await ingredientService.ignoreDuplicateSuggestion(userId, source_id, target_id);

    res.json({
      success: true,
      message: 'Suggestion ignored successfully.'
    });
  } catch (err) {
    next(err);
  }
}
