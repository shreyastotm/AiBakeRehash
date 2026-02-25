# Technology Stack

## Core Technologies

- **Database**: PostgreSQL 15+ with extensions (uuid-ossp, pgcrypto, pg_trgm)
- **Backend**: Node.js/Express with TypeScript
- **Frontend**: React with TypeScript and Tailwind CSS
- **Cache**: Redis 7+
- **Storage**: Cloud storage (AWS S3/Cloudflare R2) for images and audio
- **Authentication**: JWT-based with bcrypt password hashing

## Development Tools

- **Container Platform**: Docker 20+ with Docker Compose
- **Node Version**: 18+
- **Package Manager**: npm 9+

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
# Run all tests
npm test

# Run specific module tests
cd backend && npm test
cd frontend && npm test
cd middleware && npm test
```

### Database Operations

```bash
# Run migrations
npm run migrate

# Rollback last migration
npm run migrate:rollback

# Create new migration
npm run migrate:create <migration-name>

# Seed database
npm run seed
```

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run type-check
```

## Service Ports

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- PostgreSQL: localhost:5432
- Redis: localhost:6379
- pgAdmin (optional): http://localhost:5050

## Environment Configuration

Copy `.env.example` to `.env` and configure:
- Database credentials
- JWT secrets (use `openssl rand -base64 32`)
- Redis connection
- Cloud storage credentials
