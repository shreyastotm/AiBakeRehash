import { Request, Response, NextFunction } from 'express';
import * as importExportService from '../services/importExport.service';

// ---------------------------------------------------------------------------
// Export single recipe to JSON (19.1)
// ---------------------------------------------------------------------------

export async function exportRecipe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await importExportService.exportRecipe(req.params.id as string, req.user!.userId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Bulk export recipes (19.1)
// ---------------------------------------------------------------------------

export async function bulkExportRecipes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { recipe_ids } = req.body as { recipe_ids: string[] };
    const result = await importExportService.bulkExportRecipes(recipe_ids, req.user!.userId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Import recipe from JSON (19.1)
// ---------------------------------------------------------------------------

export async function importRecipe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await importExportService.importRecipe(req.user!.userId, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Import recipe from URL (19.2)
// ---------------------------------------------------------------------------

export async function importFromUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { url, html_content } = req.body as { url: string; html_content: string };
    const result = await importExportService.importFromUrl(req.user!.userId, url, html_content);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Export formats (19.3)
// ---------------------------------------------------------------------------

export async function exportToMarkdown(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await importExportService.exportToMarkdown(req.params.id as string, req.user!.userId);
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.content);
  } catch (err) {
    next(err);
  }
}

export async function exportToPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await importExportService.exportToPdf(req.params.id as string, req.user!.userId);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.content);
  } catch (err) {
    next(err);
  }
}

export async function exportToJsonLd(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await importExportService.exportToJsonLd(req.params.id as string, req.user!.userId);
    res.json({ success: true, data: result.data });
  } catch (err) {
    next(err);
  }
}
