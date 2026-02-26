import { Request, Response, NextFunction } from 'express';
import * as inventoryService from '../services/inventory.service';
import { InventoryListQuery, PurchaseListQuery } from '../models/inventory.model';

/** Extract a single string param (Express v5 params can be string | string[]) */
function paramStr(val: string | string[]): string {
  return Array.isArray(val) ? val[0] : val;
}

// ---------------------------------------------------------------------------
// GET /api/v1/inventory
// ---------------------------------------------------------------------------

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query: InventoryListQuery = {
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      category: req.query.category as string | undefined,
      low_stock: req.query.low_stock === 'true',
      expiring_soon: req.query.expiring_soon === 'true',
    };

    const result = await inventoryService.listInventoryItems(req.user!.userId, query);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/inventory/:id
// ---------------------------------------------------------------------------

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await inventoryService.getInventoryItem(
      paramStr(req.params.id),
      req.user!.userId,
    );
    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/inventory
// ---------------------------------------------------------------------------

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await inventoryService.createInventoryItem(req.user!.userId, req.body);
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/v1/inventory/:id
// ---------------------------------------------------------------------------

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await inventoryService.updateInventoryItem(
      paramStr(req.params.id),
      req.user!.userId,
      req.body,
    );
    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/v1/inventory/:id
// ---------------------------------------------------------------------------

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await inventoryService.deleteInventoryItem(
      paramStr(req.params.id),
      req.user!.userId,
    );
    res.json({ success: true, data: { message: 'Inventory item deleted successfully' } });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/inventory/purchases
// ---------------------------------------------------------------------------

export async function logPurchase(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await inventoryService.logPurchase(req.user!.userId, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/inventory/purchases
// ---------------------------------------------------------------------------

export async function listPurchases(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query: PurchaseListQuery = {
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      ingredient_master_id: req.query.ingredient_master_id as string | undefined,
      supplier_id: req.query.supplier_id as string | undefined,
      from_date: req.query.from_date as string | undefined,
      to_date: req.query.to_date as string | undefined,
    };

    const result = await inventoryService.listPurchases(req.user!.userId, query);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/inventory/alerts
// ---------------------------------------------------------------------------

export async function getAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const alerts = await inventoryService.getAlerts(req.user!.userId);
    res.json({ success: true, data: alerts });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/inventory/deduct
// ---------------------------------------------------------------------------

export async function deduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { recipe_id, scaling_factor, confirm } = req.body;
    const result = await inventoryService.deductInventory(
      req.user!.userId,
      recipe_id,
      scaling_factor ?? 1,
      confirm ?? false,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/inventory/reports/usage
// ---------------------------------------------------------------------------

export async function usageReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const fromDate = req.query.from_date as string | undefined;
    const toDate = req.query.to_date as string | undefined;
    const report = await inventoryService.getUsageReport(req.user!.userId, fromDate, toDate);
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/inventory/reports/value
// ---------------------------------------------------------------------------

export async function valueReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const report = await inventoryService.getValueReport(req.user!.userId);
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
}
