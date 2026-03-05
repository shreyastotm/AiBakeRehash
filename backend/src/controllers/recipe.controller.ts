import { Request, Response, NextFunction } from 'express';
import * as recipeService from '../services/recipe.service';
import * as journalService from '../services/journal.service';
import { RecipeListQuery, RecipeSearchQuery } from '../models/recipe.model';

/** Extract a single string param (Express v5 params can be string | string[]) */
function paramStr(val: string | string[]): string {
  return Array.isArray(val) ? val[0] : val;
}

// ---------------------------------------------------------------------------
// GET /api/v1/recipes
// ---------------------------------------------------------------------------

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query: RecipeListQuery = {
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      status: req.query.status as RecipeListQuery['status'],
      source_type: req.query.source_type as RecipeListQuery['source_type'],
      sort_by: req.query.sort_by as RecipeListQuery['sort_by'],
      sort_order: req.query.sort_order as RecipeListQuery['sort_order'],
    };

    const result = await recipeService.listRecipes(req.user!.userId, query);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/recipes/search
// ---------------------------------------------------------------------------

export async function search(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query: RecipeSearchQuery = {
      q: (req.query.q as string) || '',
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      status: req.query.status as RecipeSearchQuery['status'],
      source_type: req.query.source_type as RecipeSearchQuery['source_type'],
      ingredient: req.query.ingredient as string | undefined,
      sort_by: req.query.sort_by as RecipeSearchQuery['sort_by'],
      sort_order: req.query.sort_order as RecipeSearchQuery['sort_order'],
    };

    const result = await recipeService.searchRecipes(req.user!.userId, query);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}


// ---------------------------------------------------------------------------
// GET /api/v1/recipes/:id
// ---------------------------------------------------------------------------

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const recipe = await recipeService.getRecipe(paramStr(req.params.id), req.user!.userId);
    res.json({ success: true, data: recipe });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/recipes/:id/nutrition
// ---------------------------------------------------------------------------

export async function getNutrition(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const nutrition = await recipeService.getRecipeNutrition(paramStr(req.params.id), req.user!.userId);
    res.json({ success: true, data: nutrition });
  } catch (err) {
    next(err);
  }
}

export async function calculateNutrition(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const nutrition = await recipeService.calculateRecipeNutrition(paramStr(req.params.id), req.user!.userId);
    res.json({ success: true, data: nutrition });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/recipes
// ---------------------------------------------------------------------------

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const recipe = await recipeService.createRecipe(req.user!.userId, req.body);
    res.status(201).json({ success: true, data: recipe });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/v1/recipes/:id
// ---------------------------------------------------------------------------

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const recipe = await recipeService.updateRecipe(paramStr(req.params.id), req.user!.userId, req.body);
    res.json({ success: true, data: recipe });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/v1/recipes/:id
// ---------------------------------------------------------------------------

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await recipeService.deleteRecipe(paramStr(req.params.id), req.user!.userId);
    res.json({ success: true, data: { message: 'Recipe deleted successfully' } });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/recipes/:id/scale
// ---------------------------------------------------------------------------

export async function scale(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await recipeService.scaleRecipe(paramStr(req.params.id), req.user!.userId, {
      targetYieldGrams: req.body.targetYieldGrams,
      targetServings: req.body.targetServings,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/recipes/:id/versions
// ---------------------------------------------------------------------------

export async function listVersions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const versions = await recipeService.listVersions(paramStr(req.params.id), req.user!.userId);
    res.json({ success: true, data: versions });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/recipes/:id/versions
// ---------------------------------------------------------------------------

export async function createVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const version = await recipeService.createVersion(
      paramStr(req.params.id),
      req.user!.userId,
      req.body.change_summary,
    );
    res.status(201).json({ success: true, data: version });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/recipes/:id/versions/compare
// ---------------------------------------------------------------------------

export async function compareVersions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const versionA = parseInt(req.query.a as string, 10);
    const versionB = parseInt(req.query.b as string, 10);
    const result = await recipeService.compareVersions(
      paramStr(req.params.id),
      req.user!.userId,
      versionA,
      versionB,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// AI Estimation
// ---------------------------------------------------------------------------

export async function estimateWaterActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await journalService.getWaterActivityEstimate(
      paramStr(req.params.id),
      req.user!.userId,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
