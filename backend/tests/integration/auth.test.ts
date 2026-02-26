import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';

// ---------------------------------------------------------------------------
// Mock database and Redis BEFORE importing app
// ---------------------------------------------------------------------------

// In-memory user store for testing
interface MockUser {
  id: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  unit_preferences: Record<string, string>;
  default_currency: string;
  language: string;
  created_at: Date;
  updated_at: Date;
}

let mockUsers: MockUser[] = [];
let mockBlacklist: Set<string> = new Set();

vi.mock('../../src/config/database', () => {
  return {
    db: {
      query: vi.fn(async (text: string, params?: unknown[]) => {
        // SELECT by email
        if (text.includes('SELECT') && text.includes('FROM users WHERE email')) {
          const email = params?.[0] as string;
          const found = mockUsers.filter((u) => u.email === email);
          return { rows: found, rowCount: found.length };
        }
        // SELECT by id
        if (text.includes('SELECT') && text.includes('FROM users WHERE id')) {
          const id = params?.[0] as string;
          const found = mockUsers.filter((u) => u.id === id);
          return { rows: found, rowCount: found.length };
        }
        // INSERT
        if (text.includes('INSERT INTO users')) {
          const newUser: MockUser = {
            id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            email: params?.[0] as string,
            password_hash: params?.[1] as string,
            display_name: (params?.[2] as string) || null,
            unit_preferences: JSON.parse((params?.[3] as string) || '{}'),
            default_currency: (params?.[4] as string) || 'INR',
            language: (params?.[5] as string) || 'en',
            created_at: new Date(),
            updated_at: new Date(),
          };
          mockUsers.push(newUser);
          return { rows: [newUser], rowCount: 1 };
        }
        // UPDATE
        if (text.includes('UPDATE users SET')) {
          const userId = params?.[params.length - 1] as string;
          const user = mockUsers.find((u) => u.id === userId);
          if (!user) return { rows: [], rowCount: 0 };

          // Parse SET clause to update fields
          const setMatch = text.match(/SET (.+) WHERE/);
          if (setMatch) {
            const assignments = setMatch[1].split(',').map((s) => s.trim());
            let paramIdx = 0;
            for (const assignment of assignments) {
              const fieldMatch = assignment.match(/^(\w+)\s*=/);
              if (!fieldMatch) continue;
              const field = fieldMatch[1];
              if (assignment.includes('NOW()')) {
                (user as any)[field] = new Date();
                continue;
              }
              const value = params?.[paramIdx];
              if (field === 'unit_preferences') {
                user.unit_preferences = typeof value === 'string' ? JSON.parse(value) : (value as Record<string, string>);
              } else {
                (user as any)[field] = value;
              }
              paramIdx++;
            }
          }
          user.updated_at = new Date();
          return { rows: [user], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }),
      connect: vi.fn(),
      checkHealth: vi.fn(async () => ({ healthy: true, latencyMs: 1, pool: { total: 1, idle: 1, waiting: 0 } })),
      close: vi.fn(),
    },
  };
});

vi.mock('../../src/config/redis', () => {
  return {
    redis: {
      getClient: vi.fn(async () => ({
        set: vi.fn(async (_key: string, _val: string, _ex: string, _ttl: number) => {
          mockBlacklist.add(_key.replace('token:blacklist:', ''));
          return 'OK';
        }),
        get: vi.fn(async (key: string) => {
          const token = key.replace('token:blacklist:', '');
          return mockBlacklist.has(token) ? '1' : null;
        }),
        ping: vi.fn(async () => 'PONG'),
      })),
      checkHealth: vi.fn(async () => ({ healthy: true, latencyMs: 1 })),
      close: vi.fn(),
    },
  };
});

vi.mock('../../src/config/storage', () => ({
  storage: {
    checkHealth: vi.fn(async () => ({ healthy: true, latencyMs: 1 })),
  },
}));


// Set env vars before importing app
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NODE_ENV = 'test';

import { app } from '../../src/app';

describe('Authentication API', () => {
  beforeEach(() => {
    mockUsers = [];
    mockBlacklist = new Set();
  });

  // =========================================================================
  // POST /api/v1/auth/register
  // =========================================================================
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'baker@example.com',
          password: 'StrongPass1',
          display_name: 'Test Baker',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('baker@example.com');
      expect(res.body.data.user.display_name).toBe('Test Baker');
      expect(res.body.data.user.default_currency).toBe('INR');
      expect(res.body.data.user.language).toBe('en');
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      // Must NOT return password_hash
      expect(res.body.data.user.password_hash).toBeUndefined();
    });

    it('should register without display_name', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'baker2@example.com',
          password: 'StrongPass1',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.user.display_name).toBeNull();
    });

    it('should reject invalid email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'not-an-email',
          password: 'StrongPass1',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject short password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'baker@example.com',
          password: 'Ab1',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'password' }),
        ]),
      );
    });

    it('should reject password without uppercase', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'baker@example.com',
          password: 'alllowercase1',
        });

      expect(res.status).toBe(400);
    });

    it('should reject password without number', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'baker@example.com',
          password: 'NoNumberHere',
        });

      expect(res.status).toBe(400);
    });

    it('should reject duplicate email', async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'dup@example.com', password: 'StrongPass1' });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'dup@example.com', password: 'StrongPass1' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });
  });

  // =========================================================================
  // POST /api/v1/auth/login
  // =========================================================================
  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'login@example.com', password: 'StrongPass1', display_name: 'Login User' });
    });

    it('should login with correct credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'login@example.com', password: 'StrongPass1' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('login@example.com');
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user.password_hash).toBeUndefined();
    });

    it('should reject wrong password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'login@example.com', password: 'WrongPass1' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@example.com', password: 'StrongPass1' });

      expect(res.status).toBe(401);
    });

    it('should reject missing password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'login@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // =========================================================================
  // POST /api/v1/auth/logout
  // =========================================================================
  describe('POST /api/v1/auth/logout', () => {
    it('should logout with valid token', async () => {
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'logout@example.com', password: 'StrongPass1' });

      const token = regRes.body.data.accessToken;

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject logout without token', async () => {
      const res = await request(app).post('/api/v1/auth/logout');

      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // POST /api/v1/auth/refresh
  // =========================================================================
  describe('POST /api/v1/auth/refresh', () => {
    it('should return new access token with valid refresh token', async () => {
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'refresh@example.com', password: 'StrongPass1' });

      const refreshToken = regRes.body.data.refreshToken;

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('should reject missing refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({});

      expect(res.status).toBe(400);
    });

    it('should reject invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // GET /api/v1/users/me
  // =========================================================================
  describe('GET /api/v1/users/me', () => {
    it('should return current user profile', async () => {
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'me@example.com', password: 'StrongPass1', display_name: 'Me User' });

      const token = regRes.body.data.accessToken;

      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('me@example.com');
      expect(res.body.data.display_name).toBe('Me User');
      expect(res.body.data.default_currency).toBe('INR');
      expect(res.body.data.password_hash).toBeUndefined();
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/v1/users/me');

      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // PATCH /api/v1/users/me
  // =========================================================================
  describe('PATCH /api/v1/users/me', () => {
    let token: string;

    beforeEach(async () => {
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'update@example.com', password: 'StrongPass1' });
      token = regRes.body.data.accessToken;
    });

    it('should update display_name', async () => {
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ display_name: 'New Name' });

      expect(res.status).toBe(200);
      expect(res.body.data.display_name).toBe('New Name');
    });

    it('should update language to Hindi', async () => {
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ language: 'hi' });

      expect(res.status).toBe(200);
      expect(res.body.data.language).toBe('hi');
    });

    it('should update default_currency', async () => {
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ default_currency: 'USD' });

      expect(res.status).toBe(200);
      expect(res.body.data.default_currency).toBe('USD');
    });

    it('should update unit_preferences', async () => {
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ unit_preferences: { sugar: 'cups', flour: 'grams' } });

      expect(res.status).toBe(200);
      expect(res.body.data.unit_preferences).toEqual({ sugar: 'cups', flour: 'grams' });
    });

    it('should reject invalid language', async () => {
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ language: 'fr' });

      expect(res.status).toBe(400);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .patch('/api/v1/users/me')
        .send({ display_name: 'Hacker' });

      expect(res.status).toBe(401);
    });
  });
});
