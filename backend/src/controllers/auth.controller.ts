import { Request, Response, NextFunction } from 'express';
import {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  updateUserPreferences,
} from '../services/auth.service';
import { handleTokenRefresh } from '../middleware/auth';

// ---------------------------------------------------------------------------
// POST /api/v1/auth/register
// ---------------------------------------------------------------------------

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, display_name } = req.body;
    const { user, tokens } = await registerUser({ email, password, display_name });

    res.status(201).json({
      success: true,
      data: { user, ...tokens },
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/auth/login
// ---------------------------------------------------------------------------

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;
    const { user, tokens } = await loginUser({ email, password });

    res.json({
      success: true,
      data: { user, ...tokens },
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/auth/logout
// ---------------------------------------------------------------------------

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (token) {
      await logoutUser(token);
    }

    res.json({ success: true, data: { message: 'Logged out successfully' } });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/auth/refresh
// ---------------------------------------------------------------------------

export { handleTokenRefresh as refresh };

// ---------------------------------------------------------------------------
// GET /api/v1/users/me
// ---------------------------------------------------------------------------

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await getUserProfile(req.user!.userId);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/v1/users/me
// ---------------------------------------------------------------------------

export async function updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await updateUserPreferences(req.user!.userId, req.body);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}
