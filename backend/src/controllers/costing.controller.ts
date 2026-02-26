import { Request, Response, NextFunction } from 'express';
import * as costingService from '../services/costing.service';

/** Extract a single string param (Express v5 params can be string | string[]) */
function paramStr(val: string | string[]): string {
  return Array.isArray(val) ? val[0] : val;
}

// ---------------------------------------------------------------------------
// POST /api/v1/recipes/:id/cost/calculate
// ---------------------------------------------------------------------------

export async function calculateCost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await costingService.calculateCost(
      req.user!.userId,
      paramStr(req.params.id),
      req.body,
    );
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/recipes/:id/cost
// ---------------------------------------------------------------------------

export async function getCurrentCost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const cost = await costingService.getCurrentCost(
      req.user!.userId,
      paramStr(req.params.id),
    );
    res.json({ success: true, data: cost });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/recipes/:id/cost/history
// ---------------------------------------------------------------------------

export async function getCostHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const history = await costingService.getCostHistory(
      req.user!.userId,
      paramStr(req.params.id),
    );
    res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/recipes/:id/pricing
// ---------------------------------------------------------------------------

export async function calculatePricing(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { target_profit_margin_percent, custom_selling_price } = req.body;
    const result = await costingService.calculatePricingForRecipe(
      req.user!.userId,
      paramStr(req.params.id),
      target_profit_margin_percent,
      custom_selling_price,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/costing/reports/profit-margins
// ---------------------------------------------------------------------------

export async function profitMarginReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const report = await costingService.getProfitMarginReport(req.user!.userId);
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/costing/reports/cost-trends
// ---------------------------------------------------------------------------

export async function costTrendReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const fromDate = req.query.from_date as string | undefined;
    const toDate = req.query.to_date as string | undefined;
    const report = await costingService.getCostTrendReport(req.user!.userId, {
      from_date: fromDate,
      to_date: toDate,
    });
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
}
