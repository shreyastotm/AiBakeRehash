import { Request, Response, NextFunction } from 'express';
import * as ingredientService from '../services/ingredient.service';
import { IngredientListQuery } from '../models/ingredient.model';

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

    const result = await ingredientService.listIngredients(query);
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

    const results = await ingredientService.searchIngredients(q, limit);
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
    const ingredient = await ingredientService.getIngredient(paramStr(req.params.id));
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
    const ingredient = await ingredientService.createIngredient(req.body);
    res.status(201).json({ success: true, data: ingredient });
  } catch (err) {
    next(err);
  }
}
