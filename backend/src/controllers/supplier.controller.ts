import { Request, Response, NextFunction } from 'express';
import * as supplierService from '../services/supplier.service';

/** Extract a single string param (Express v5 params can be string | string[]) */
function paramStr(val: string | string[]): string {
  return Array.isArray(val) ? val[0] : val;
}

// ---------------------------------------------------------------------------
// Supplier endpoints
// ---------------------------------------------------------------------------

export async function listSuppliers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const suppliers = await supplierService.listSuppliers(req.user!.userId);
    res.json({ success: true, data: suppliers });
  } catch (err) {
    next(err);
  }
}

export async function getSupplier(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const supplier = await supplierService.getSupplier(paramStr(req.params.id), req.user!.userId);
    res.json({ success: true, data: supplier });
  } catch (err) {
    next(err);
  }
}

export async function createSupplier(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const supplier = await supplierService.createSupplier(req.user!.userId, req.body);
    res.status(201).json({ success: true, data: supplier });
  } catch (err) {
    next(err);
  }
}

export async function updateSupplier(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const supplier = await supplierService.updateSupplier(
      paramStr(req.params.id),
      req.user!.userId,
      req.body,
    );
    res.json({ success: true, data: supplier });
  } catch (err) {
    next(err);
  }
}

export async function deleteSupplier(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await supplierService.deleteSupplier(paramStr(req.params.id), req.user!.userId);
    res.json({ success: true, data: { message: 'Supplier deleted successfully' } });
  } catch (err) {
    next(err);
  }
}

export async function getSupplierIngredients(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ingredients = await supplierService.getSupplierIngredients(
      paramStr(req.params.id),
      req.user!.userId,
    );
    res.json({ success: true, data: ingredients });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Packaging endpoints
// ---------------------------------------------------------------------------

export async function listPackaging(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const items = await supplierService.listPackagingItems(req.user!.userId);
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
}

export async function createPackaging(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await supplierService.createPackagingItem(req.user!.userId, req.body);
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
}

export async function updatePackaging(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await supplierService.updatePackagingItem(
      paramStr(req.params.id),
      req.user!.userId,
      req.body,
    );
    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
}

export async function deletePackaging(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await supplierService.deletePackagingItem(paramStr(req.params.id), req.user!.userId);
    res.json({ success: true, data: { message: 'Packaging item deleted successfully' } });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Delivery Zone endpoints
// ---------------------------------------------------------------------------

export async function listDeliveryZones(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const zones = await supplierService.listDeliveryZones(req.user!.userId);
    res.json({ success: true, data: zones });
  } catch (err) {
    next(err);
  }
}

export async function createDeliveryZone(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const zone = await supplierService.createDeliveryZone(req.user!.userId, req.body);
    res.status(201).json({ success: true, data: zone });
  } catch (err) {
    next(err);
  }
}

export async function updateDeliveryZone(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const zone = await supplierService.updateDeliveryZone(
      paramStr(req.params.id),
      req.user!.userId,
      req.body,
    );
    res.json({ success: true, data: zone });
  } catch (err) {
    next(err);
  }
}

export async function deleteDeliveryZone(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await supplierService.deleteDeliveryZone(paramStr(req.params.id), req.user!.userId);
    res.json({ success: true, data: { message: 'Delivery zone deleted successfully' } });
  } catch (err) {
    next(err);
  }
}
