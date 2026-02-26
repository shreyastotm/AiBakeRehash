import { Request, Response, NextFunction } from 'express';
import * as journalService from '../services/journal.service';
import { ValidationError } from '../middleware/errorHandler';

/** Extract a single string param (Express v5 params can be string | string[]) */
function paramStr(val: string | string[]): string {
  return Array.isArray(val) ? val[0] : val;
}

// ---------------------------------------------------------------------------
// GET /api/v1/recipes/:id/journal
// ---------------------------------------------------------------------------

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const entries = await journalService.listJournalEntries(
      paramStr(req.params.id),
      req.user!.userId,
    );
    res.json({ success: true, data: entries });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/recipes/:id/journal
// ---------------------------------------------------------------------------

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const entry = await journalService.createJournalEntry(
      paramStr(req.params.id),
      req.user!.userId,
      req.body,
    );
    res.status(201).json({ success: true, data: entry });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/v1/journal/:id
// ---------------------------------------------------------------------------

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const entry = await journalService.updateJournalEntry(
      paramStr(req.params.id),
      req.user!.userId,
      req.body,
    );
    res.json({ success: true, data: entry });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/v1/journal/:id
// ---------------------------------------------------------------------------

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await journalService.deleteJournalEntry(
      paramStr(req.params.id),
      req.user!.userId,
    );
    res.json({ success: true, data: { message: 'Journal entry deleted successfully' } });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/journal/:id/images
// ---------------------------------------------------------------------------

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

export async function uploadImages(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files || files.length === 0) {
      throw new ValidationError('At least one image file is required');
    }

    // Validate each file
    for (const file of files) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
        throw new ValidationError(
          `Invalid image format: ${file.mimetype}. Allowed: JPEG, PNG, WebP`,
        );
      }
      if (file.size > MAX_IMAGE_SIZE) {
        throw new ValidationError(
          `Image too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 10MB`,
        );
      }
    }

    // In production, upload to cloud storage. For now, generate URLs from filenames.
    const imageUrls = files.map((file) => {
      const timestamp = Date.now();
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      return `/uploads/journal/${timestamp}-${safeName}`;
    });

    const entry = await journalService.addImages(
      paramStr(req.params.id),
      req.user!.userId,
      imageUrls,
    );

    res.status(201).json({ success: true, data: entry });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/journal/:id/audio
// ---------------------------------------------------------------------------

const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a', 'audio/m4a'];
const MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50MB

export async function uploadAudio(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const file = req.file as Express.Multer.File | undefined;

    if (!file) {
      throw new ValidationError('An audio file is required');
    }

    if (!ALLOWED_AUDIO_TYPES.includes(file.mimetype)) {
      throw new ValidationError(
        `Invalid audio format: ${file.mimetype}. Allowed: MP3, WAV, M4A`,
      );
    }
    if (file.size > MAX_AUDIO_SIZE) {
      throw new ValidationError(
        `Audio too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 50MB`,
      );
    }

    // Generate URL (in production, upload to cloud storage)
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const audioUrl = `/uploads/audio/${timestamp}-${safeName}`;

    const durationSeconds = req.body.duration_seconds
      ? parseFloat(req.body.duration_seconds)
      : null;
    const recordedAtStage = req.body.recorded_at_stage || null;

    const audioNote = await journalService.addAudioNote(
      paramStr(req.params.id),
      req.user!.userId,
      audioUrl,
      durationSeconds,
      recordedAtStage,
    );

    res.status(201).json({ success: true, data: audioNote });
  } catch (err) {
    next(err);
  }
}
