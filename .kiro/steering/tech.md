# Technology Stack

## Core Technologies

- **Database**: PostgreSQL 15+ with extensions (uuid-ossp, pgcrypto, pg_trgm)
- **Backend**: Node.js/Express with TypeScript (Node 18+)
- **Frontend**: React with TypeScript, Vite, and Tailwind CSS
- **Test Runner**: **Vitest** (not Jest) for backend and middleware; Playwright for E2E
- **Property Tests**: fast-check with minimum 100 iterations per property
- **State Management**: Zustand + TanStack Query (React Query)
- **Cache**: Redis 7+
- **Storage**: Cloud storage (AWS S3/Cloudflare R2) for images and audio
- **Authentication**: JWT with bcrypt password hashing (12 rounds)

## Development Tools

- **Container Platform**: Docker 20+ with Docker Compose
- **Package Manager**: npm 9+
- **Linting**: ESLint with TypeScript rules
- **Formatting**: Prettier

## Common Commands

### Docker Services

```bash
# Start all services
docker-compose up -d

# Start specific services
docker-compose up -d postgres redis

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Access PostgreSQL CLI
docker-compose exec postgres psql -U aibake_user -d aibake_db

# Access Redis CLI
docker-compose exec redis redis-cli
```

### Development Servers

```bash
# Backend (port 3000)
cd backend
npm run dev

# Frontend (port 5173)
cd frontend
npm run dev
```

### Testing

```bash
# Run all tests per module
cd backend && npm test          # Vitest unit + integration
cd middleware && npm test        # Vitest unit + property-based
cd frontend && npm test         # Vitest + React Testing Library
cd frontend && npx playwright test  # E2E tests

# With coverage
cd backend && npm run test:coverage   # Must be >80%
cd middleware && npm run test:coverage # Must be >90%
```

### Database Operations

```bash
# Run migrations
npm run migrate

# Rollback last migration
npm run migrate:rollback

# Seed database
npm run seed
```

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format

# Type check (TypeScript strict mode)
npm run type-check
```

## Service Ports

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- PostgreSQL: localhost:5432
- Redis: localhost:6379
- pgAdmin (optional): http://localhost:5050

## Testing Stack Details

| Layer | Framework | Location |
|-------|-----------|----------|
| Unit tests (middleware) | Vitest | `middleware/tests/unit/` |
| Property tests | fast-check via Vitest | `middleware/tests/property/` |
| Unit tests (backend) | Vitest | `backend/tests/unit/` |
| Integration tests | Vitest + supertest | `backend/tests/integration/` |
| Component tests | React Testing Library | `frontend/tests/unit/` |
| E2E tests | Playwright | `frontend/tests/e2e/` |

## Performance Targets (CI Enforced)

| Operation | Target |
|-----------|--------|
| Recipe scaling | <50ms |
| Nutrition calculation | <100ms |
| Ingredient search | <200ms |
| API GET requests | <200ms |
| API POST requests | <500ms |

## Redis Cache TTLs

| Data | TTL |
|------|-----|
| Nutrition calculations | 1 hour |
| Ingredient search results | 15 minutes |
| User preferences | 24 hours |

## Environment Configuration

Copy `.env.example` to `.env` and configure:
- Database credentials
- JWT secrets (use `openssl rand -base64 32`)
- Redis connection
- Cloud storage credentials (AWS_ACCESS_KEY_ID, etc.)
- External service keys (WhatsApp Business API, speech-to-text)
