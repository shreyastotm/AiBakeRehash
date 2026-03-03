# Project Structure

## Directory Organization

```
aibake/
├── database/          # Database migrations, functions, triggers, seed data
│   ├── migrations/    # Sequential SQL migrations (01_xxx.sql)
│   ├── functions/     # PostgreSQL stored functions
│   ├── triggers/      # PostgreSQL triggers
│   └── rollback/      # Rollback scripts (paired with each migration)
├── backend/           # Node.js/Express API server with TypeScript
│   └── src/
│       ├── controllers/  # HTTP layer only (parse request, call service, respond)
│       ├── services/     # Business logic and DB access
│       ├── middleware/   # Express middleware (auth, validation, errors)
│       ├── models/       # TypeScript interfaces/types
│       ├── routes/       # Route definitions
│       ├── config/       # DB pool, Redis, storage config
│       └── utils/        # jwt.ts, password.ts, logger.ts, currency.ts, date.ts
├── middleware/        # Pure business logic layer (no DB access)
│   └── src/
│       ├── unitConverter.ts
│       ├── recipeScaler.ts
│       ├── nutritionCalculator.ts
│       ├── hydrationCalculator.ts
│       ├── costCalculator.ts
│       ├── pricingCalculator.ts
│       ├── searchEngine.ts
│       └── inventoryManager.ts
├── frontend/          # React application with TypeScript
│   └── src/
│       ├── components/   # Reusable UI components
│       ├── pages/        # Page-level components
│       ├── hooks/        # Custom React hooks (useXxx.ts)
│       ├── store/        # Zustand stores (xxxStore.ts)
│       ├── services/     # API client functions
│       ├── utils/        # currency.ts, date.ts, units.ts, validation.ts
│       └── locales/      # en.json and hi.json (must have identical keys)
├── agent-hooks/       # Reserved for automation scripts (currently empty)
├── scripts/           # Utility scripts (setup.sh, migrate.ts, backup.sh)
├── AiBakeKickstart/   # Database setup guides and bootstrap SQL scripts
├── .kiro/             # Kiro configuration
│   ├── specs/         # Feature specifications
│   ├── steering/      # Project steering rules (this directory)
│   └── hooks/         # Agent hooks (automated quality checks)
└── docs/              # Documentation (API, architecture, user guides)
    └── api/
        └── openapi.yaml  # OpenAPI spec (kept in sync with controllers)
```

## Architecture Layers and Boundaries

### Layer Import Rules

```
Frontend → Backend API (HTTP only — never direct DB or middleware imports)
Backend → Middleware (module imports — middleware receives data as arguments)
Backend → Database (via pg pool in services — never in controllers)
Middleware → (nothing) — pure functions, no external dependencies
```

**Violations of these boundaries are architecture bugs:**
- Frontend must not import from `middleware/` directly
- Controllers must not contain business logic — delegate to services
- Middleware modules must not import from `backend/` or make DB calls

### Middleware Layer — Pure Functions

The `middleware/` package contains pure business logic:
- Accepts data as function arguments
- Returns computed results
- Throws typed errors (`MissingDensityError`, `MissingInventoryDataError`, etc.)
- Has no database connections or external API calls
- Fully testable without any infrastructure

### Backend Layer — Service Pattern

```
Request → Route → Controller → Service → Database
                       ↓
                  Middleware (calculator, converter, etc.)
```

### Frontend Layer — State Management

```
API (React Query) ↔ Zustand Store ↔ React Components
```

## Key Conventions

### Database
- All quantities stored in **grams** (weight) and **ml** (volume) — canonical format
- Original display units preserved separately for UI rendering
- Full-text search on recipe titles via pg_trgm
- Fuzzy search on ingredient names and aliases via `search_ingredient()` function
- All user data queries MUST include `user_id` filter (security requirement)

### API
- All routes prefixed `/api/v1/` — version in URL path
- Consistent response envelope: `{ data }` or `{ data, meta }` or `{ error, message, statusCode }`
- All authenticated endpoints validate JWT via `auth.middleware.ts`

### Code Organization
- TypeScript strict mode in all packages
- Service-based architecture in backend
- Component-based architecture in frontend
- Shared TypeScript interfaces in `models/` (backend) — consider a shared `types/` package for frontend reuse

### File Naming
- Backend source files: `kebab-case.ts` (e.g., `unit-converter.ts`)
- React components: `PascalCase.tsx` (e.g., `RecipeCard.tsx`)
- Test files: match source with `.test.ts` or `.spec.ts` suffix
- Database files: snake_case with numeric prefix (e.g., `01_schema_init.sql`)
- Zustand stores: `camelCaseStore.ts` (e.g., `recipeStore.ts`)
- Custom hooks: `useCamelCase.ts` (e.g., `useRecipes.ts`)

## Database Schema

15 core tables:
- `users` — User accounts and preferences
- `ingredient_master` — Global ingredient database (70+ entries)
- `ingredient_aliases` — Regional/Hindi/abbreviation aliases
- `composite_ingredients` — Multi-ingredient master items
- `recipes` — Recipe master records
- `recipe_ingredients` — Ingredients per recipe (with original + grams columns)
- `recipe_sections` — Prep, bake, rest sections
- `recipe_steps` — Individual instructions with timing and temperature
- `recipe_versions` — Version history
- `recipe_version_snapshots` — Full JSONB snapshots per version
- `recipe_journal_entries` — Baking journal with photos, ratings, weights
- `recipe_audio_notes` — Voice notes with transcription
- `ingredient_substitutions` — Substitution rules with impact ratings
- `timer_instances` — Active/completed timers
- `recipe_nutrition_cache` — Calculated nutrition (invalidated on ingredient change)
- `common_issues` — Emergency baking help database

MVP extension tables:
- `inventory_items` — Current stock levels
- `inventory_purchases` — Purchase history
- `suppliers` — Supplier contact information
- `recipe_costs` — Calculated cost history
- `packaging_items` — Packaging with per-unit cost
- `delivery_zones` — Delivery pricing zones

## Setup Files

Located in `AiBakeKickstart/`:
- `00_SETUP_GUIDE.md` — Complete setup instructions
- `01_schema_init.sql` — Database schema initialization
- `02_seed_data.sql` — Seed data (70+ ingredients with Indian items)
- `03_test_data.sql` — Test data for development
- `04_schema_enhancements.sql` — Additional schema features
