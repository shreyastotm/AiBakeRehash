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
│   ├── 01_schema_init.sql      # Core schema v1.1 (extensions, ENUMs, 18 tables, indexes, triggers)
│   ├── 04_mvp_inventory.sql    # Inventory management tables (inventory_items, purchases, suppliers)
│   ├── 05_mvp_costing.sql      # Costing & pricing tables (recipe_costs, packaging_items, delivery_zones)
│   └── 06_mvp_advanced_recipe_fields.sql  # Water activity, hydration loss, baking loss columns
├── backend/           # Node.js/Express API server
├── frontend/          # React application
├── middleware/        # Business logic layer
├── agent-hooks/       # Automated scripts for code quality
├── scripts/           # Utility scripts
├── k8s/              # Kubernetes manifests
└── docs/             # Documentation
```

## Database Schema

The database is built across multiple migration scripts:

### Core Schema (`database/01_schema_init.sql` v1.1)

- 3 PostgreSQL extensions: uuid-ossp, pgcrypto, pg_trgm
- 8 custom ENUM types
- 18 tables across these domains:
  - User management: `users`
  - Ingredient data: `ingredient_master`, `ingredient_aliases`, `composite_ingredients`, `composite_ingredient_components`, `ingredient_substitutions`
  - Recipe management: `recipes`, `recipe_ingredients`, `recipe_sections`, `recipe_steps`, `recipe_versions`, `recipe_version_snapshots`
  - Baking journal: `recipe_journal_entries`, `recipe_audio_notes`
  - Advanced features: `timer_instances`, `recipe_nutrition_cache`, `common_issues`, `water_activity_reference`
- 44 indexes (including trigram, composite, and partial indexes)
- 9 `updated_at` auto-timestamp triggers

### MVP Inventory (`database/04_mvp_inventory.sql`)

- `inventory_items`: Ingredient stock tracking with costs, expiration dates, and reorder levels
- `inventory_purchases`: Purchase history with supplier and invoice tracking
- `suppliers`: Supplier contact information and notes

### MVP Costing & Pricing (`database/05_mvp_costing.sql`)

- `recipe_costs`: Historical cost tracking (ingredient, overhead, packaging, labor costs in INR)
- `packaging_items`: Packaging materials with per-unit costs and stock levels
- `delivery_zones`: Delivery pricing by zone with base charge, per-km rates, and free delivery thresholds
- 5 indexes (including composite index for latest cost lookup)
- 2 `updated_at` triggers
- All monetary columns default to INR with non-negative check constraints

### Advanced Recipe Fields (`database/06_mvp_advanced_recipe_fields.sql`)

- Adds water activity tracking to `recipes`: `target_water_activity`, `min_safe_water_activity`, `estimated_shelf_life_days`
- Adds baker's hydration percentage to `recipes`: `total_hydration_percentage`
- Adds baking loss tracking to `recipe_journal_entries`: `pre_bake_weight_grams`, `baking_loss_grams`, `baking_loss_percentage`
- Adds measured water activity and storage tracking to `recipe_journal_entries`: `measured_water_activity`, `storage_days_achieved`
- 9 check constraints ensuring valid ranges (water activity 0.00–1.00, positive weights, percentage 0–100)

## Prerequisites

Before setting up AiBake, ensure you have the following installed:

### Required

- **Node.js 18+**: JavaScript runtime for backend and build tools
  - Download from [nodejs.org](https://nodejs.org/)
  - Verify installation: `node --version` (should be 18.0.0 or higher)
  
- **npm 9+**: Package manager (comes with Node.js)
  - Verify installation: `npm --version`

- **Docker 20+**: Container platform for running services
  - Download from [docker.com](https://www.docker.com/)
  - Verify installation: `docker --version`
  
- **Docker Compose**: Multi-container orchestration (included with Docker Desktop)
  - Verify installation: `docker-compose --version` or `docker compose version`

### Optional

- **PostgreSQL 15+**: If running database locally without Docker
  - Download from [postgresql.org](https://www.postgresql.org/)
  
- **Redis 7+**: If running cache locally without Docker
  - Download from [redis.io](https://redis.io/)

- **Git**: Version control system
  - Download from [git-scm.com](https://git-scm.com/)

## Quick Start

### Automated Setup (Recommended)

The fastest way to get started is using our automated setup script:

**Linux/macOS:**
```bash
# Clone the repository
git clone <repository-url>
cd aibake

# Run automated setup script
bash scripts/setup.sh
```

**Windows (PowerShell):**
```powershell
# Clone the repository
git clone <repository-url>
cd aibake

# Run automated setup script
.\scripts\setup.ps1
```

The setup script will:
- ✓ Check all prerequisites
- ✓ Create `.env` file with generated secrets
- ✓ Create necessary project directories
- ✓ Install all dependencies
- ✓ Start Docker services (PostgreSQL, Redis)
- ✓ Run database migrations (optional)

After setup completes, start the development servers:

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev
```

### Manual Setup

If you prefer manual setup or need more control:

#### 1. Clone the repository

```bash
git clone <repository-url>
cd aibake
```

#### 2. Setup environment variables

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your configuration
# The setup script generates JWT secrets automatically,
# but for manual setup you should generate secure secrets:
# JWT_SECRET=$(openssl rand -base64 32)
# JWT_REFRESH_SECRET=$(openssl rand -base64 32)
```

#### 3. Create project directories

```bash
mkdir -p database/{migrations,functions,triggers,rollback}
mkdir -p backend/{src,tests}
mkdir -p frontend/{src,public}
mkdir -p middleware/{src,tests}
mkdir -p scripts docs/api docs/architecture
```

#### 4. Install dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Install middleware dependencies
cd ../middleware
npm install
cd ..
```

#### 5. Start Docker services

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Verify services are running
docker-compose ps

# Check logs if needed
docker-compose logs -f postgres redis
```

#### 6. Run database migrations

```bash
# Run migrations (once migration scripts are created)
npm run migrate

# Seed database with initial data
npm run seed
```

#### 7. Start development servers

```bash
# Terminal 1: Start backend (port 3000)
cd backend
npm run dev

# Terminal 2: Start frontend (port 5173)
cd frontend
npm run dev
```

#### 8. Access the application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api-docs
- **pgAdmin** (optional): http://localhost:5050
  - Start with: `docker-compose --profile tools up -d pgadmin`
  - Login: admin@aibake.local / admin

## Development

### Docker Services Management

```bash
# Start all services
docker-compose up -d

# Start specific services
docker-compose up -d postgres redis

# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f postgres

# Restart services
docker-compose restart

# Check service status
docker-compose ps

# Access PostgreSQL CLI
docker-compose exec postgres psql -U aibake_user -d aibake_db

# Access Redis CLI
docker-compose exec redis redis-cli

# Start optional tools (pgAdmin)
docker-compose --profile tools up -d pgadmin
```

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
