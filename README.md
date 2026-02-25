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
- 19 tables across these domains:
  - Migration tracking: `schema_migrations` (tracks applied database migrations for version control)
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

### Seed Data (`database/02_seed_data.sql`)

- Uses transactions (`BEGIN`/`COMMIT`) and `TRUNCATE ... CASCADE` for safe, idempotent re-runs
- Individual `INSERT` statements per ingredient for easier maintenance
- **70+ common baking ingredients** with complete data:
  - Flours (10): all-purpose, bread, cake, whole wheat, maida, atta, besan, sooji, rice, cornstarch
  - Fats (8): butter, ghee, desi ghee, vegetable oil, coconut oil, olive oil, shortening, mawa
  - Sugars (6): granulated, brown, powdered, honey, jaggery, molasses
  - Leavening (5): baking powder, baking soda, instant yeast, active dry yeast, cream of tartar
  - Dairy (9): milk, buttermilk, yogurt, sour cream, cream cheese, paneer, khoya, condensed milk, egg
  - Liquids (5): water, apple juice, orange juice, lemon juice, rose water
  - Nuts (6): almond flour, almond, walnut, cashew, peanut, coconut
  - Spices (12): cardamom, cinnamon, vanilla extract, saffron, nutmeg, ginger powder, turmeric, clove, black pepper, salt, baking chocolate, cocoa powder
  - Fruits (8): raisin, date, banana, apple, blueberry, strawberry, cranberry, lemon
  - Other (4): vanilla bean, gelatin, cornmeal, tapioca starch

- **Density values** for volume-to-weight conversion (g/ml)
- **Nutrition data** per 100g: energy (kcal), protein (g), fat (g), carbs (g), fiber (g)
- **Allergen flags**: gluten, dairy, nuts, eggs
- **Indian ingredients**: maida, atta, besan, sooji, khoya, paneer, ghee, desi ghee, cardamom, saffron, rose water

### Ingredient Aliases (`database/02b_seed_ingredient_aliases.sql`)

- **Abbreviations**: AP flour, APF, BP, BS, VCO, EVOO, SCM
- **Regional variations**: plain flour (UK), wholemeal flour (UK), strong flour (UK), etc.
- **Brand names**: SAF yeast, Philadelphia cream cheese
- **Common names**: refined flour, white flour, cooking oil, etc.
- **Hindi transliterations**: मैदा (maida), आटा (atta), बेसन (besan), सूजी (sooji), घी (ghee), etc.

### Reference Data (`database/04_reference_data.sql`)

- **Common Issues** (10+): flat cookies, dense bread, cracked cakes, soggy bottoms, burnt edges, gummy bread, bread not rising, sunken center, dry cake, tough pastry, shrinking pastry
- **Water Activity Reference**: typical aw ranges for crackers, cookies, cakes, breads, pastries, confections, donuts, brownies, muffins, biscuits, scones, macarons, meringues, tarts, cheesecake, fudge, granola, bread pudding, custard tarts, soufflé

### Test Data (`database/03_test_data.sql` v1.1)

- Uses explicit enum casts for PostgreSQL compatibility
- Idempotent cleanup (DELETE cascade by user email) before insertion
- **3 test users** with different preferences (metric, hybrid, cups)
- **9 sample recipes** across categories (bread, cookies, cakes) with full relational data (ingredients, sections, steps, versions, journal entries, inventory, suppliers, purchases, audio notes, timers, nutrition cache)

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

## Database Functions

Custom PostgreSQL functions provide specialized business logic at the database layer:

### Core Functions

1. **`search_ingredient(query TEXT)`** - Fuzzy search for ingredients by name or alias using trigram matching
   - Searches both canonical names and aliases
   - Returns ranked results with similarity scores
   - Requirements: 48.1, 48.2

2. **`get_recipe_ingredients_expanded(recipe_id UUID)`** - Returns recipe ingredients with composite ingredient breakdowns
   - Shows component details for composite ingredients
   - Useful for shopping lists and nutrition calculation
   - Requirements: 48.2, 18.4

3. **`calculate_composite_nutrition(composite_ingredient_id UUID)`** - Calculates weighted average nutrition for composite ingredients
   - Validates component percentages sum to 100%
   - Returns energy, protein, fat, carbs, fiber per 100g
   - Requirements: 48.3, 18.5

4. **`calculate_hydration_percentage(recipe_id UUID)`** - Calculates baker's percentage (water-to-flour ratio) for dough recipes
   - Formula: (total_liquid / total_flour) × 100
   - Returns NULL for non-dough recipes
   - Requirements: 48.4, 16.5

5. **`get_recipe_with_details(recipe_id UUID)`** - Returns complete recipe as JSON with all related data
   - Includes ingredients, sections, steps, and metadata
   - Single query for full recipe retrieval
   - Requirements: 48.6, 23.8

All functions are located in `database/functions/` and documented in [docs/database/functions.md](docs/database/functions.md).

### Deploying Functions

```bash
# Deploy all functions at once
psql -U aibake_user -d aibake_db -f database/functions/all_functions.sql

# Or deploy individual functions
psql -U aibake_user -d aibake_db -f database/functions/search_ingredient.sql
psql -U aibake_user -d aibake_db -f database/functions/get_recipe_ingredients_expanded.sql
# ... etc
```

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

## Database Layer - Complete ✓

The entire database layer is now complete and ready for backend implementation:

### ✅ Schema & Migrations
- Core schema with 18 tables, 44 indexes, 9 triggers
- MVP inventory management tables
- MVP costing and pricing tables
- Advanced recipe fields for water activity and hydration tracking

### ✅ Seed Data (70+ Ingredients)
- **Flours**: all-purpose, bread, cake, whole wheat, maida, atta, besan, sooji, rice, cornstarch
- **Fats**: butter, ghee, desi ghee, vegetable oil, coconut oil, olive oil, shortening, mawa
- **Sugars**: granulated, brown, powdered, honey, jaggery, molasses
- **Leavening**: baking powder, baking soda, instant yeast, active dry yeast, cream of tartar
- **Dairy**: milk, buttermilk, yogurt, sour cream, cream cheese, paneer, khoya, condensed milk, egg
- **Liquids**: water, apple juice, orange juice, lemon juice, rose water
- **Nuts**: almond flour, almond, walnut, cashew, peanut, coconut
- **Spices**: cardamom, cinnamon, vanilla extract, saffron, nutmeg, ginger powder, turmeric, clove, black pepper, salt, baking chocolate, cocoa powder
- **Fruits**: raisin, date, banana, apple, blueberry, strawberry, cranberry, lemon
- **Other**: vanilla bean, gelatin, cornmeal, tapioca starch

Each ingredient includes:
- Density values for volume-to-weight conversion
- Nutrition data per 100g (energy, protein, fat, carbs, fiber)
- Allergen flags (gluten, dairy, nuts, eggs)

### ✅ Ingredient Aliases
- Abbreviations (AP flour, BP, BS, VCO, EVOO, SCM)
- Regional variations (plain flour, wholemeal flour, strong flour)
- Brand names (SAF yeast, Philadelphia cream cheese)
- Common names (refined flour, white flour, cooking oil)
- Hindi transliterations (मैदा, आटा, बेसन, सूजी, घी, etc.)

### ✅ Reference Data
- Common baking issues (10+) with solutions and prevention tips
- Water activity reference ranges for 20+ product categories

### ✅ Test Data
- 3 test users with different preferences (metric, hybrid, cups)
- 9 sample recipes across categories (bread, cookies, cakes)
- Recipe ingredients for Whole Wheat Bread, Chocolate Chip Cookies, and Vanilla Sponge Cake
- Recipe sections and steps for Chocolate Chip Cookies (prep, bake, cool)
- Recipe versions and journal entries with photos and ratings
- Inventory items (10 entries across all users) and suppliers (4 entries)
- Purchase history (4 entries) and audio notes (2 entries)
- Timer instances (2 completed timers) and nutrition cache (2 recipes)
- Verification query for all entity counts
- Idempotent cleanup with DELETE cascade by user email
- Explicit enum casts for PostgreSQL compatibility

### ✅ Database Functions
- `search_ingredient()` - Fuzzy ingredient search with trigram matching
- `get_recipe_ingredients_expanded()` - Recipe ingredient expansion with composite breakdown
- `calculate_composite_nutrition()` - Weighted nutrition calculation
- `calculate_hydration_percentage()` - Baker's percentage calculation
- `get_recipe_with_details()` - Complete recipe retrieval as JSON

### ✅ Database Triggers
- `calculate_baking_loss_on_insert/update` - Auto-calculate baking loss
- `update_*_timestamp` - Auto-update timestamps (9 triggers)
- `validate_composite_percentages_*` - Validate composite ingredient percentages
- `cascade_recipe_update_on_ingredient_*` - Cascade updates to parent recipe

## Next Steps: Backend Implementation

The database layer is complete. You can now begin implementing the backend API server:

1. **Open the implementation plan**: `.kiro/specs/aibake-full-system-implementation/tasks.md`
2. **Start with Phase 6**: Backend Setup and Core Infrastructure
3. **Follow the task sequence**: Each task builds on previous ones
4. **Reference requirements**: Each task includes specific requirement numbers

### Quick Database Setup

```bash
# Start PostgreSQL
docker-compose up -d postgres

# Run migrations
npm run migrate

# Seed ingredients
npm run seed

# Load test data
npm run seed:test

# Verify database
docker-compose exec postgres psql -U aibake_user -d aibake_db -c "SELECT COUNT(*) FROM ingredient_master;"
# Should return: 70+
```

---

**Database Status**: ✅ Complete and Ready for Backend Integration

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

- [Database Schema Migrations](docs/database/schema-migrations.md) - Migration system for version control of database changes
- [Database Functions](docs/database/functions.md) - Custom PostgreSQL functions for ingredient search, recipe expansion, nutrition calculation, and hydration analysis
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
