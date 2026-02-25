# AiBake - Professional Baking Recipe Management Platform

AiBake is a comprehensive baking recipe management platform designed specifically for Indian home bakers and small-scale baking businesses. The system provides recipe management, ingredient tracking, unit conversion, recipe scaling, baking journal, inventory management, product costing, and social media integration optimized for the Indian market.

## Features

- **Recipe Management**: Create, version, and scale recipes with precise ingredient tracking
- **Inventory Management**: Track ingredient stock, costs, and expiration dates with automated deductions
- **Product Costing & Pricing**: Calculate recipe costs including overhead, packaging, and delivery charges with profit margin analysis
- **Social Media Integration**: Export recipe cards and journal entries optimized for Instagram and WhatsApp
- **Indian Market Localization**: INR currency, Hindi/English bilingual interface, Indian ingredients and measurement units
- **Hands-Free Baking**: Screen wake lock, large touch controls, and voice commands for timer management
- **Advanced Baking Features**: Water activity tracking, hydration loss calculation, ingredient aliases, and composite ingredients

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                            │
│              (Web Browser / Mobile PWA)                     │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                  Frontend Application                       │
│         (React/Vue + TypeScript + Tailwind CSS)            │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                   Backend Services                          │
│              (Node.js/Express + TypeScript)                 │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │   Auth   │  Recipe  │Inventory │ Costing  │  Social  │  │
│  │ Service  │ Service  │ Service  │ Service  │ Service  │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                  Middleware Layer                           │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │   Unit   │  Recipe  │Nutrition │Hydration │  Search  │  │
│  │Converter │  Scaler  │Calculator│Calculator│  Engine  │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                     Data Layer                              │
│         PostgreSQL 15+ │ Redis Cache │ Cloud Storage       │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

- **Database**: PostgreSQL 15+ with extensions (uuid-ossp, pgcrypto, pg_trgm)
- **Backend**: Node.js/Express with TypeScript
- **Frontend**: React with TypeScript and Tailwind CSS
- **Middleware**: Business logic layer for conversions, calculations, and validations
- **Storage**: Cloud storage (AWS S3/Cloudflare R2) for images and audio files
- **Authentication**: JWT-based authentication with bcrypt password hashing
- **Deployment**: Docker containers with Kubernetes orchestration

## Project Structure

```
aibake/
├── database/          # Database migrations, functions, triggers, seed data
├── backend/           # Node.js/Express API server
├── frontend/          # React application
├── middleware/        # Business logic layer
├── agent-hooks/       # Automated scripts for code quality
├── scripts/           # Utility scripts
├── k8s/              # Kubernetes manifests
└── docs/             # Documentation
```

## Prerequisites

- Node.js 18+
- Docker and Docker Compose
- PostgreSQL 15+
- Redis (optional, for caching)

## Setup Instructions

### 1. Clone the repository

```bash
git clone <repository-url>
cd aibake
```

### 2. Install dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Install middleware dependencies
cd ../middleware
npm install
```

### 3. Setup environment variables

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your configuration
# Required variables:
# - DATABASE_URL
# - JWT_SECRET
# - REDIS_URL (optional)
# - STORAGE_BUCKET (for cloud storage)
```

### 4. Start local development environment

```bash
# Start PostgreSQL and Redis using Docker Compose
docker-compose up -d

# Run database migrations
npm run migrate

# Seed database with initial data
npm run seed
```

### 5. Start development servers

```bash
# Start backend server (port 3000)
cd backend
npm run dev

# Start frontend server (port 5173)
cd frontend
npm run dev
```

### 6. Access the application

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- API Documentation: http://localhost:3000/api-docs

## Development

### Running tests

```bash
# Run all tests
npm test

# Run backend tests
cd backend
npm test

# Run frontend tests
cd frontend
npm test

# Run middleware tests
cd middleware
npm test
```

### Database migrations

```bash
# Run migrations
npm run migrate

# Rollback last migration
npm run migrate:rollback

# Create new migration
npm run migrate:create <migration-name>
```

### Code quality

```bash
# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run type-check
```

## Deployment

See [docs/deployment.md](docs/deployment.md) for detailed deployment instructions.

## Documentation

- [API Documentation](docs/api/openapi.yaml)
- [Architecture Guide](docs/architecture/)
- [User Guide (English)](docs/user-guide/en/)
- [User Guide (Hindi)](docs/user-guide/hi/)

## License

See [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting pull requests.

## Support

For issues and questions, please open an issue on GitHub or contact the development team.
