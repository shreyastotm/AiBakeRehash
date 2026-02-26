import { Request, Response, NextFunction } from 'express';
import * as socialService from '../services/social.service';

// ---------------------------------------------------------------------------
// Recipe Card
// ---------------------------------------------------------------------------

export async function generateRecipeCard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await socialService.generateRecipeCard(req.user!.userId, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Journal Card
// ---------------------------------------------------------------------------

export async function generateJournalCard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await socialService.generateJournalCard(req.user!.userId, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// WhatsApp Format
// ---------------------------------------------------------------------------

export async function formatForWhatsApp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await socialService.formatForWhatsApp(req.user!.userId, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export async function listTemplates(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await socialService.listTemplates(req.user!.userId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function saveTemplatePreference(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await socialService.saveTemplatePreference(req.user!.userId, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
