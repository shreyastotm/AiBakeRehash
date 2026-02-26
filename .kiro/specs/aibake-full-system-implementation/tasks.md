# Implementation Plan: AiBake Full System Implementation

## Overview

This implementation plan covers the complete development of AiBake, a professional-grade baking recipe management platform for Indian home bakers. The system will be implemented in TypeScript with a PostgreSQL database, Node.js/Express backend, and React frontend.

The implementation follows a domain-driven approach, building from the database layer up through the backend API, middleware business logic, and frontend application. Each task builds incrementally, with checkpoints to ensure stability before proceeding.

## Implementation Language

**TypeScript** - Type-safe JavaScript for full-stack development with strong typing, excellent tooling, and broad ecosystem support.

## Project Folder Structure

```
aibake/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # CI pipeline (lint, test, build)
│       ├── deploy-staging.yml        # Auto-deploy to staging
│       └── deploy-production.yml     # Manual deploy to production
├── .husky/
│   ├── pre-commit                    # Lint and format code
│   └── pre-push                      # Run tests before push
├── database/
│   ├── migrations/
│   │   ├── 01_schema_init.sql       # Core schema with 15 tables
│   │   ├── 02_seed_data.sql         # 70+ ingredients with Indian items
│   │   ├── 03_test_data.sql         # Sample data for development
│   │   └── 04_mvp_extensions.sql    # Inventory, costing, social tables
│   ├── functions/
│   │   ├── search_ingredient.sql    # Fuzzy search function
│   │   ├── calculate_hydration.sql  # Hydration percentage
│   │   └── expand_composite.sql     # Composite ingredient expansion
│   ├── triggers/
│   │   ├── baking_loss.sql          # Auto-calculate baking loss
│   │   └── updated_at.sql           # Auto-update timestamps
│   └── rollback/
│       └── *.sql                     # Rollback scripts for each migration
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts          # DB connection pool
│   │   │   ├── redis.ts             # Redis cache config
│   │   │   └── storage.ts           # Cloud storage config
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts   # Authentication endpoints
│   │   │   ├── recipe.controller.ts # Recipe CRUD
│   │   │   ├── ingredient.controller.ts
│   │   │   ├── journal.controller.ts
│   │   │   ├── inventory.controller.ts
│   │   │   ├── costing.controller.ts
│   │   │   ├── social.controller.ts
│   │   │   └── supplier.controller.ts
│   │   ├── services/
│   │   │   ├── auth.service.ts      # Business logic for auth
│   │   │   ├── recipe.service.ts
│   │   │   ├── inventory.service.ts
│   │   │   ├── costing.service.ts
│   │   │   ├── transcription.service.ts
│   │   │   ├── whatsapp.service.ts
│   │   │   └── imageGen.service.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts   # JWT verification
│   │   │   ├── validation.middleware.ts
│   │   │   ├── errorHandler.middleware.ts
│   │   │   └── rateLimit.middleware.ts
│   │   ├── models/
│   │   │   ├── user.model.ts        # TypeScript interfaces
│   │   │   ├── recipe.model.ts
│   │   │   ├── ingredient.model.ts
│   │   │   ├── inventory.model.ts
│   │   │   └── cost.model.ts
│   │   ├── utils/
│   │   │   ├── jwt.ts               # Token generation/validation
│   │   │   ├── password.ts          # Bcrypt hashing
│   │   │   ├── logger.ts            # Structured logging
│   │   │   └── currency.ts          # INR formatting
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── recipe.routes.ts
│   │   │   ├── inventory.routes.ts
│   │   │   └── index.ts             # Route aggregation
│   │   ├── app.ts                   # Express app setup
│   │   └── index.ts                 # Entry point
│   ├── tests/
│   │   ├── unit/                    # Unit tests
│   │   ├── integration/             # API integration tests
│   │   └── fixtures/                # Test data
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── middleware/
│   ├── src/
│   │   ├── unitConverter.ts         # Volume/weight conversion
│   │   ├── recipeScaler.ts          # Recipe scaling logic
│   │   ├── nutritionCalculator.ts   # Nutrition aggregation
│   │   ├── hydrationCalculator.ts   # Baker's percentage
│   │   ├── costCalculator.ts        # Cost calculation
│   │   ├── pricingCalculator.ts     # Pricing with margins
│   │   ├── searchEngine.ts          # Fuzzy ingredient search
│   │   └── inventoryManager.ts      # Inventory deduction
│   ├── tests/
│   │   ├── unit/                    # Unit tests for each module
│   │   └── property/                # Property-based tests (fast-check)
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── public/
│   │   ├── icons/                   # App icons for PWA
│   │   ├── manifest.json            # PWA manifest
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/              # Reusable UI components
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   └── LoadingSpinner.tsx
│   │   │   ├── recipe/              # Recipe-specific components
│   │   │   │   ├── RecipeCard.tsx
│   │   │   │   ├── IngredientList.tsx
│   │   │   │   ├── StepList.tsx
│   │   │   │   ├── ScalingControl.tsx
│   │   │   │   └── NutritionDisplay.tsx
│   │   │   ├── inventory/           # Inventory components
│   │   │   │   ├── InventoryList.tsx
│   │   │   │   ├── InventoryAlerts.tsx
│   │   │   │   └── PurchaseForm.tsx
│   │   │   ├── costing/             # Costing components
│   │   │   │   ├── CostCalculator.tsx
│   │   │   │   ├── PricingCalculator.tsx
│   │   │   │   └── ProfitAnalysis.tsx
│   │   │   └── social/              # Social media components
│   │   │       ├── RecipeCardExport.tsx
│   │   │       └── WhatsAppShare.tsx
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   ├── Login.tsx
│   │   │   │   └── Register.tsx
│   │   │   ├── recipe/
│   │   │   │   ├── RecipeList.tsx
│   │   │   │   ├── RecipeDetail.tsx
│   │   │   │   └── RecipeForm.tsx
│   │   │   ├── inventory/
│   │   │   │   ├── InventoryList.tsx
│   │   │   │   └── InventoryAlerts.tsx
│   │   │   ├── costing/
│   │   │   │   ├── CostCalculator.tsx
│   │   │   │   └── ProfitAnalysis.tsx
│   │   │   ├── journal/
│   │   │   │   ├── JournalList.tsx
│   │   │   │   └── JournalDetail.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   └── Settings.tsx
│   │   ├── services/
│   │   │   ├── api.ts               # Axios instance
│   │   │   ├── auth.service.ts
│   │   │   ├── recipe.service.ts
│   │   │   ├── inventory.service.ts
│   │   │   └── costing.service.ts
│   │   ├── hooks/
│   │   │   ├── useAuth.ts           # Authentication hook
│   │   │   ├── useRecipes.ts        # Recipe data fetching
│   │   │   ├── useInventory.ts
│   │   │   └── useWakeLock.ts       # Screen wake lock
│   │   ├── store/
│   │   │   ├── authStore.ts         # Zustand auth store
│   │   │   ├── recipeStore.ts
│   │   │   ├── inventoryStore.ts
│   │   │   └── preferencesStore.ts
│   │   ├── utils/
│   │   │   ├── currency.ts          # INR formatting
│   │   │   ├── date.ts              # Date formatting
│   │   │   ├── units.ts             # Unit conversion helpers
│   │   │   └── validation.ts        # Form validation
│   │   ├── locales/
│   │   │   ├── en.json              # English translations
│   │   │   └── hi.json              # Hindi translations
│   │   ├── styles/
│   │   │   └── globals.css          # Tailwind CSS
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── vite-env.d.ts
│   ├── tests/
│   │   ├── unit/                    # Component unit tests
│   │   ├── integration/             # Integration tests
│   │   └── e2e/                     # Playwright E2E tests
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── Dockerfile
├── scripts/
│   ├── setup.sh                     # Development environment setup
│   ├── migrate.ts                   # Run database migrations
│   ├── rollback.ts                  # Rollback migrations
│   ├── backup.sh                    # Database backup
│   └── restore.sh                   # Database restore
├── k8s/
│   ├── backend-deployment.yaml      # Backend Kubernetes deployment
│   ├── frontend-deployment.yaml     # Frontend deployment
│   ├── postgres-statefulset.yaml    # PostgreSQL StatefulSet
│   ├── redis-deployment.yaml        # Redis deployment
│   ├── ingress.yaml                 # Ingress for external access
│   ├── configmap.yaml               # Configuration
│   └── secrets.yaml                 # Secrets (template)
├── docs/
│   ├── api/                         # API documentation
│   │   └── openapi.yaml             # OpenAPI specification
│   ├── architecture/                # Architecture diagrams
│   ├── user-guide/                  # User documentation
│   │   ├── en/                      # English
│   │   └── hi/                      # Hindi
│   └── deployment.md                # Deployment guide
├── .gitignore
├── .editorconfig
├── .env.example
├── docker-compose.yml               # Local development
├── README.md
├── LICENSE
└── package.json                     # Root package.json for monorepo
```

## Key Folder Explanations

- **`database/`**: All database-related files (migrations, functions, triggers, seed data)
- **`backend/`**: Node.js/Express API server with TypeScript
- **`middleware/`**: Business logic layer (unit conversion, scaling, costing, etc.) - can be imported by backend
- **`frontend/`**: React application with TypeScript and Tailwind CSS
- **`scripts/`**: Utility scripts for setup, migrations, backups
- **`k8s/`**: Kubernetes manifests for production deployment
- **`docs/`**: All documentation (API, architecture, user guides)
- **`.github/workflows/`**: CI/CD pipeline configurations

## Tasks

### 1. Project Setup and Repository Initialization

- [x] 1.1 Initialize Git repository with proper structure
  - Create root directory structure: `/database`, `/backend`, `/frontend`, `/middleware`, `/agent-hooks`
  - Initialize `.gitignore` excluding `node_modules`, `.env`, `dist`, `build`, `*.log`, `coverage`
  - Create `README.md` with project overview, architecture diagram, and setup instructions
  - Create `LICENSE` file (MIT or appropriate license)
  - Create `.editorconfig` for consistent formatting (indent: 2 spaces, charset: utf-8, trim trailing whitespace)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 1.2 Setup development environment configuration
  - Create `.env.example` with all required environment variables (DATABASE_URL, JWT_SECRET, REDIS_URL, etc.)
  - Create `docker-compose.yml` for local PostgreSQL, Redis, and development services
  - Document prerequisites (Node.js 18+, Docker, PostgreSQL 15+)
  - Create setup script `scripts/setup.sh` automating environment configuration
  - _Requirements: 45.1, 45.2, 45.4, 47.1, 47.2_


### 2. Database Layer - Core Schema

- [x] 2.1 Create database initialization script
  - Create `database/01_schema_init.sql` with PostgreSQL extensions (uuid-ossp, pgcrypto, pg_trgm)
  - Define 8 custom ENUM types (recipe_source_type, recipe_status, unit_system, section_type, ingredient_category, timer_status, substitution_moisture_impact, substitution_structural_impact)
  - Create `users` table with authentication fields and preferences (JSONB for unit_preferences)
  - Create `ingredient_master` table with name, category, density, nutrition (JSONB), allergen flags (JSONB)
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 2.2 Create recipe management tables
  - Create `recipes` table with title, description, servings, yield_weight_grams, status, source fields, timestamps
  - Create `recipe_ingredients` table with display_name, quantity_original, unit_original, quantity_grams, position
  - Create `recipe_sections` table with type, title, position
  - Create `recipe_steps` table with instruction, duration_seconds, temperature_celsius, position, dependency_step_id
  - Add foreign key constraints with CASCADE DELETE for recipe relationships
  - _Requirements: 2.1, 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 7.1, 7.2, 7.3_

- [x] 2.3 Create versioning and journal tables
  - Create `recipe_versions` table with version_number, change_summary, created_at
  - Create `recipe_version_snapshots` table with snapshot_data (JSONB)
  - Create `recipe_journal_entries` table with bake_date, notes, private_notes, rating, outcome_weight_grams, images (JSONB array)
  - Create `recipe_audio_notes` table with audio_url, duration_seconds, transcription_text, recorded_at_stage
  - _Requirements: 2.1, 8.1, 8.2, 8.3, 9.1, 9.2, 9.3, 9.4, 10.1, 10.2_

- [x] 2.4 Create advanced features tables
  - Create `ingredient_substitutions` table with original_ingredient_id, substitute_ingredient_id, ratio_multiplier, moisture_impact, structural_impact, flavor_impact
  - Create `timer_instances` table with recipe_id, step_id, duration_seconds, status, started_at
  - Create `recipe_nutrition_cache` table with nutrition_per_100g (JSONB), nutrition_per_serving (JSONB), calculated_at
  - Create `common_issues` table with issue_type, symptoms, solution, prevention_tip
  - Create `water_activity_reference` table with product_category, typical_aw_min, typical_aw_max, shelf_life_days
  - _Requirements: 2.1, 11.1, 11.2, 12.1, 12.2, 13.2, 13.3, 14.1, 15.4_

- [x] 2.5 Create ingredient alias and composite ingredient tables
  - Create `ingredient_aliases` table with ingredient_master_id, alias_name, alias_type, locale
  - Create `composite_ingredients` table with ingredient_master_id, is_user_defined
  - Create `composite_ingredient_components` table with composite_ingredient_id, component_ingredient_id, percentage, weight_grams_per_100g
  - Add unique constraints on alias_name and composite component relationships
  - _Requirements: 17.1, 17.2, 17.3, 18.1, 18.2_

- [x] 2.6 Create indexes for performance
  - Create indexes on all foreign key columns (user_id, recipe_id, ingredient_master_id, etc.)
  - Create indexes on frequently filtered columns (status, created_at, bake_date)
  - Create trigram indexes on text search fields (ingredient_master.name, ingredient_aliases.alias_name, recipes.title)
  - Create composite indexes for common query patterns (user_id + status, user_id + created_at)
  - Create partial indexes for active recipes and running timers
  - _Requirements: 2.5, 2.6, 95.1, 95.2, 95.3, 95.4, 95.5_


### 3. Database Layer - MVP Extensions (Inventory, Costing, Social)

- [x] 3.1 Create inventory management tables
  - Create `inventory_items` table with ingredient_master_id, quantity_on_hand, unit, cost_per_unit, currency (default 'INR'), purchase_date, expiration_date, supplier_id, min_stock_level, reorder_quantity
  - Create `inventory_purchases` table with ingredient_master_id, quantity, unit, cost, currency, supplier_id, invoice_number, purchase_date
  - Create `suppliers` table with name, contact_person, phone, email, address, notes
  - Add indexes on user_id, ingredient_master_id, expiration_date
  - _Requirements: 101.1, 113.1, 114.1_

- [x] 3.2 Create costing and pricing tables
  - Create `recipe_costs` table with recipe_id, ingredient_cost, overhead_cost, packaging_cost, labor_cost, total_cost, currency (default 'INR'), calculated_at
  - Create `packaging_items` table with name, cost_per_unit, currency, quantity_on_hand
  - Create `delivery_zones` table with zone_name, base_charge, per_km_charge, free_delivery_threshold, currency
  - Add indexes on recipe_id, user_id
  - _Requirements: 104.1, 104.3, 115.1, 116.1_

- [x] 3.3 Add advanced recipe fields for MVP features
  - Add columns to `recipes` table: target_water_activity, min_safe_water_activity, estimated_shelf_life_days, total_hydration_percentage
  - Add columns to `recipe_journal_entries` table: measured_water_activity, storage_days_achieved, pre_bake_weight_grams, baking_loss_grams, baking_loss_percentage
  - Add check constraints for water_activity (0.00 to 1.00) and positive weights
  - _Requirements: 15.1, 16.1_


### 4. Database Layer - Functions, Triggers, and Seed Data

- [x] 4.1 Create database functions
  - Create `search_ingredient(query TEXT)` function with trigram fuzzy matching, searching both canonical names and aliases, returning ranked results with similarity scores
  - Create `get_recipe_ingredients_expanded(recipe_id UUID)` function showing composite ingredient breakdowns
  - Create `calculate_composite_nutrition(composite_ingredient_id UUID)` function computing weighted average nutrition from components
  - Create `calculate_hydration_percentage(recipe_id UUID)` function computing water-to-flour ratio
  - Create `get_recipe_with_details(recipe_id UUID)` function returning complete recipe with ingredients, sections, steps
  - _Requirements: 48.1, 48.2, 48.3, 48.4, 48.6_

- [x] 4.2 Create database triggers
  - Create trigger on `recipe_journal_entries` to automatically calculate `baking_loss_grams` and `baking_loss_percentage` when pre_bake_weight_grams and outcome_weight_grams are set
  - Create trigger on `recipes` and `recipe_ingredients` to update `updated_at` timestamp
  - Create trigger to validate composite ingredient component percentages sum to 100
  - _Requirements: 16.2, 18.3, 48.5_

- [x] 4.3 Create seed data script
  - Create `database/02_seed_data.sql` with 70+ common baking ingredients (all-purpose flour, bread flour, butter, sugar, eggs, milk, yeast, etc.)
  - Include Indian ingredients (maida, atta, besan, sooji, khoya, mawa, paneer, ghee, desi ghee, cardamom, saffron, rose water)
  - Add density values (g/ml) for volume-to-weight conversion
  - Add nutrition data per 100g (energy_kcal, protein_g, fat_g, carbs_g, fiber_g)
  - Add ingredient categories and allergen flags
  - _Requirements: 3.2, 3.6, 4.1, 4.2, 4.3, 4.4, 4.5, 107.1_

- [x] 4.4 Create ingredient aliases seed data
  - Add ingredient aliases for abbreviations (AP flour → all-purpose flour, tbsp → tablespoon)
  - Add regional variations (maida → all-purpose flour, atta → whole wheat flour)
  - Add brand names and common misspellings
  - Add Hindi transliterations (elaichi → cardamom, kesar → saffron, gulab jal → rose water)
  - _Requirements: 17.1, 17.2, 107.2, 107.3, 107.6_

- [x] 4.5 Create reference data seed scripts
  - Seed `common_issues` table with 10+ common baking problems (flat cookies, dense bread, cracked cakes, soggy bottoms, burnt edges, etc.) with solutions and prevention tips
  - Seed `water_activity_reference` table with typical aw ranges for crackers, cookies, cakes, breads, pastries, and confections
  - _Requirements: 14.2, 15.5, 75.5_

- [x] 4.6 Create test data script
  - Create `database/03_test_data.sql` with sample users, recipes, journal entries for development
  - Include diverse recipe examples (bread, cookies, cakes, pastries)
  - Include inventory items with various stock levels
  - Include journal entries with photos and ratings
  - _Requirements: 3.3, 47.3_


### 5. Database Layer - Migrations and Validation

- [x] 5.1 Create migration management system
  - Create migration tracking table `schema_migrations` with version, name, applied_at
  - Create migration runner script `scripts/migrate.ts` executing migrations in order
  - Create rollback script `scripts/rollback.ts` for downgrade scenarios
  - Validate successful execution with table counts, index counts, data counts
  - _Requirements: 3.1, 3.5, 65.6_

- [x] 5.2 Create database validation scripts
  - Create validation script checking foreign key relationships
  - Create validation script checking for missing indexes on foreign keys
  - Create validation script validating enum type usage consistency
  - Create validation script generating database documentation from schema
  - _Requirements: 38.1, 38.3, 38.4, 38.5, 38.6_

- [x] 5.3 Create backup and restore scripts
  - Create backup script `scripts/backup.sh` creating full database dumps with timestamp
  - Create incremental backup script for WAL archiving
  - Create restore script `scripts/restore.sh` recovering from backup files
  - Add backup integrity validation
  - Document point-in-time recovery procedure
  - _Requirements: 40.1, 40.2, 40.3, 40.4, 40.5_

- [x] 5.4 Checkpoint - Database layer complete
  - Run all migrations successfully
  - Verify all tables created with correct schema
  - Verify all indexes created
  - Verify seed data loaded (70+ ingredients, 10+ common issues)
  - Verify test data loaded
  - Run database validation scripts
  - Ensure all tests pass, ask the user if questions arise.
  - _Direct psql migration scripts created for Windows and Linux_


### 6. Backend Setup and Core Infrastructure

- [x] 6.1 Initialize backend project structure
  - Create `backend/` directory with TypeScript configuration (`tsconfig.json`)
  - Initialize npm project with `package.json` including dependencies (express, pg, bcrypt, jsonwebtoken, dotenv, cors)
  - Setup ESLint and Prettier for code quality
  - Create directory structure: `/src/controllers`, `/src/services`, `/src/middleware`, `/src/models`, `/src/utils`, `/src/config`
  - Create `src/index.ts` as entry point
  - _Requirements: 21.1, 27.1, 36.1, 36.2_

- [x] 6.2 Setup database connection and pooling
  - Create `src/config/database.ts` with PostgreSQL connection pool configuration (pool size: 20)
  - Implement connection retry logic with exponential backoff
  - Add connection health check function
  - Add connection pool monitoring
  - Implement proper connection release after queries
  - _Requirements: 43.3, 66.1, 66.2, 66.3, 66.4, 66.5_

- [x] 6.3 Setup authentication infrastructure
  - Create `src/middleware/auth.ts` with JWT token verification middleware
  - Create `src/utils/jwt.ts` with token generation and validation functions
  - Create `src/utils/password.ts` with bcrypt hashing (12 rounds) and verification
  - Implement token expiration (24 hours) and refresh token mechanism
  - _Requirements: 21.2, 22.6, 22.7, 44.5_

- [x] 6.4 Setup error handling and logging
  - Create `src/middleware/errorHandler.ts` with consistent error response format
  - Create `src/utils/logger.ts` with structured logging (Winston or Pino)
  - Implement log levels (ERROR, WARN, INFO, DEBUG)
  - Add request ID generation and tracking across services
  - Implement sensitive data masking in logs (passwords, tokens, PII)
  - _Requirements: 42.1, 42.2, 42.3, 42.6_

- [x] 6.5 Setup API infrastructure
  - Create `src/app.ts` with Express application setup
  - Implement CORS configuration with whitelist
  - Implement rate limiting (express-rate-limit) per user and per IP
  - Add request validation middleware (express-validator)
  - Add security headers (helmet)
  - Implement request/response logging
  - _Requirements: 21.5, 21.7, 21.10, 44.1, 44.4, 44.6_

- [x] 6.6 Setup health check and monitoring endpoints
  - Create `/health` endpoint checking database, Redis, and storage connectivity
  - Create `/ready` endpoint for Kubernetes readiness probe
  - Create `/metrics` endpoint exposing Prometheus-compatible metrics
  - Track request latency, error rates, throughput
  - _Requirements: 58.1, 58.2, 58.3_


### 7. Middleware Layer - Unit Conversion and Recipe Scaling

- [x] 7.1 Implement unit conversion system
  - Create `middleware/src/unitConverter.ts` with conversion functions
  - Implement `convertToGrams(ingredientId, quantity, fromUnit)` converting volume to weight using density
  - Implement `convertFromGrams(ingredientId, grams, toUnit)` converting weight to volume
  - Support volume units (ml, l, cup=240ml, tbsp=15ml, tsp=5ml)
  - Support weight units (g, kg, oz, lb)
  - Throw `MissingDensityError` when density data unavailable
  - Throw `InvalidUnitError` for unsupported units
  - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

- [x] 7.2 Write property tests for unit conversion
  - **Property 1: Unit Conversion Round-Trip**
  - **Validates: Requirements 6.5, 19.4**
  - Test that converting volume→weight→volume produces original value within 0.1% tolerance
  - Generate random ingredients with known density, quantities (0.1-10000), and volume units
  - Use fast-check with minimum 100 iterations

- [x] 7.3 Write unit tests for unit converter
  - Test all volume-to-weight conversions with known densities
  - Test all weight-to-weight conversions
  - Test missing density error handling
  - Test invalid unit error handling
  - Test edge cases (zero quantity, very large quantities)
  - _Requirements: 19.1, 19.2, 19.3_

- [x] 7.4 Implement recipe scaling system
  - Create `middleware/src/recipeScaler.ts` with scaling functions
  - Implement `scaleRecipe(recipe, targetYieldGrams)` calculating scaling factor and multiplying all ingredient quantities
  - Implement `scaleRecipe(recipe, targetServings)` scaling by servings count
  - Validate scaling factor and generate warnings for >3x or <0.25x
  - Preserve ingredient ratios during scaling
  - Return scaled recipe with warnings array
  - _Requirements: 20.1, 20.2, 20.3, 20.4, 82.4_

- [x] 7.5 Write property tests for recipe scaling
  - **Property 3: Recipe Scaling Proportionality**
  - **Validates: Requirements 20.2, 20.3, 31.4, 82.4**
  - Test that all ingredient quantities scale by same factor, preserving ratios
  - Generate random recipes with multiple ingredients and random scaling factors (0.1-10)
  - Verify ratio(ingredient_a, ingredient_b) remains constant after scaling
  - Use fast-check with minimum 100 iterations

- [x] 7.6 Write unit tests for recipe scaler
  - Test scaling up (2x, 3x, 10x)
  - Test scaling down (0.5x, 0.25x, 0.1x)
  - Test scaling factor warnings (>3x, <0.25x)
  - Test edge cases (single ingredient, 100 ingredients)
  - _Requirements: 20.1, 20.2, 20.3_


### 8. Middleware Layer - Nutrition and Hydration Calculators

- [x] 8.1 Implement nutrition calculator
  - Create `middleware/src/nutritionCalculator.ts` with calculation functions
  - Implement `calculateNutrition(ingredients)` summing ingredient nutrition weighted by quantity
  - Calculate total nutrition, per-100g nutrition, and per-serving nutrition
  - Handle missing nutrition data gracefully (skip ingredients without data)
  - Return nutrition object with energy_kcal, protein_g, fat_g, carbs_g, fiber_g
  - _Requirements: 13.1, 67.1, 67.2, 67.3, 67.4_

- [x] 8.2 Write property tests for nutrition calculator
  - **Property 4: Nutrition Calculation Consistency**
  - **Validates: Requirements 13.5, 20.5, 67.5**
  - Test that total nutrition equals sum of individual ingredient contributions weighted by quantity
  - Generate random recipes with ingredients having nutrition data
  - Verify sum(ingredient_nutrition × quantity_factor) = total_nutrition
  - Use fast-check with minimum 100 iterations

- [x] 8.3 Write unit tests for nutrition calculator
  - Test with complete nutrition data
  - Test with missing nutrition data for some ingredients
  - Test with zero-quantity ingredients
  - Test per-serving calculation
  - Test per-100g calculation
  - _Requirements: 13.1, 67.1, 67.2, 67.3_

- [x] 8.4 Implement hydration calculator
  - Create `middleware/src/hydrationCalculator.ts` with calculation functions
  - Implement `calculateHydrationPercentage(recipe)` computing (total_liquid / total_flour) × 100
  - Sum all ingredients in 'flour' category for total flour
  - Sum all ingredients in 'liquid' and 'dairy' categories for total liquid
  - Return null for non-dough recipes (zero flour)
  - _Requirements: 16.5, 48.4_

- [x] 8.5 Write property tests for hydration calculator
  - **Property 9: Hydration Percentage Calculation**
  - **Validates: Requirements 16.5, 48.4**
  - Test that hydration = (liquid_weight / flour_weight) × 100
  - Generate random dough recipes with flour and liquid ingredients
  - Verify calculation accuracy within 0.01% tolerance
  - Use fast-check with minimum 100 iterations

- [x] 8.6 Write unit tests for hydration calculator
  - Test with various flour and liquid combinations
  - Test with zero flour (should return null)
  - Test with zero liquid (should return 0%)
  - Test with multiple flour types
  - Test with dairy ingredients counted as liquid
  - _Requirements: 16.5, 48.4_


### 9. Middleware Layer - Cost Calculation and Pricing

- [x] 9.1 Implement cost calculator
  - Create `middleware/src/costCalculator.ts` with calculation functions
  - Implement `calculateRecipeCost(recipe, overheadCost, packagingCost, laborCost)` summing ingredient costs
  - For each ingredient, get inventory item and calculate cost = quantity × cost_per_unit (with unit conversion)
  - Throw `MissingInventoryDataError` if ingredient not in inventory
  - Calculate total cost, cost per serving, cost per 100g
  - Return cost breakdown with ingredient-level details
  - _Requirements: 104.1, 104.2, 104.3, 104.4, 104.5, 104.6, 104.7, 72.2_

- [x] 9.2 Write property tests for cost calculator
  - **Property 22: Recipe Cost Calculation**
  - **Validates: Requirements 104.1, 72.3**
  - Test that total ingredient cost equals sum of (quantity × cost_per_unit) for all ingredients
  - Generate random recipes with ingredients having cost data
  - Verify sum(ingredient_cost) = total_ingredient_cost
  - Use fast-check with minimum 100 iterations

- [x] 9.3 Write unit tests for cost calculator
  - Test with all cost components (ingredient, overhead, packaging, labor)
  - Test with missing inventory data (should throw error)
  - Test with zero costs
  - Test with very large numbers
  - Test cost per serving and cost per 100g calculations
  - _Requirements: 104.1, 104.2, 104.3, 72.2_

- [x] 9.4 Implement pricing calculator
  - Create `middleware/src/pricingCalculator.ts` with pricing functions
  - Implement `calculatePricing(totalCost, targetProfitMarginPercent)` using formula: price = cost / (1 - margin/100)
  - Round to nearest rupee for INR currency
  - Calculate actual profit margin = ((price - cost) / price) × 100
  - Validate margin < 100%
  - Return suggested price, profit amount, target margin, actual margin
  - _Requirements: 105.1, 105.2, 105.3, 105.4_

- [x] 9.5 Write property tests for pricing calculator
  - **Property 25: Pricing Formula Correctness**
  - **Validates: Requirements 105.2**
  - Test that price = cost / (1 - margin/100) and actual_margin = ((price - cost) / price) × 100
  - Generate random costs (₹10-₹10000) and margins (1-99%)
  - Verify formula accuracy within 0.01% tolerance
  - Use fast-check with minimum 100 iterations

- [x] 9.6 Write unit tests for pricing calculator
  - Test with various cost and margin combinations
  - Test with 0% margin (price = cost)
  - Test with 99% margin (very high price)
  - Test with invalid margin (≥100%, should throw error)
  - Test INR rounding to nearest rupee
  - _Requirements: 105.1, 105.2, 105.3_


### 10. Middleware Layer - Search and Inventory

- [x] 10.1 Implement fuzzy search engine
  - Create `middleware/src/searchEngine.ts` with search functions
  - Implement `searchIngredient(query)` using database trigram matching
  - Search both canonical names and aliases
  - Return results ranked by similarity score (highest first)
  - Indicate whether match came from canonical name or alias
  - _Requirements: 17.6, 17.7, 48.1_

- [x] 10.2 Write property tests for fuzzy search
  - **Property 6: Fuzzy Ingredient Search Ranking**
  - **Validates: Requirements 4.7, 17.6, 48.1**
  - Test that results are ranked by similarity score in descending order
  - Generate random search queries and verify ranking consistency
  - Verify all results have similarity scores
  - Use fast-check with minimum 100 iterations

- [x] 10.3 Write unit tests for fuzzy search
  - Test exact matches (should rank highest)
  - Test partial matches (should rank by similarity)
  - Test alias matches (should indicate alias source)
  - Test no matches (should return empty array)
  - Test case-insensitive matching
  - _Requirements: 4.7, 17.6, 17.7_

- [x] 10.4 Implement inventory deduction system
  - Create `middleware/src/inventoryManager.ts` with deduction functions
  - Implement `calculateDeductions(recipe, scalingFactor)` computing quantities to deduct
  - For each ingredient, get inventory item and convert quantity to inventory unit
  - Check if sufficient stock available, generate warnings if insufficient
  - Return deductions array with ingredient name, quantity, current stock, new stock
  - Implement `applyDeductions(deductions, journalEntryId)` updating inventory in transaction
  - Check for low stock alerts after deduction
  - Log inventory transactions with reference to journal entry
  - _Requirements: 103.1, 103.2, 103.3, 103.4, 103.5, 103.6_

- [x] 10.5 Write property tests for inventory deduction
  - **Property 20: Inventory Deduction on Bake Logging**
  - **Validates: Requirements 103.1**
  - Test that logging a bake deducts correct ingredient quantities from inventory
  - Generate random recipes and inventory states
  - Verify new_quantity = old_quantity - deducted_quantity
  - Use fast-check with minimum 100 iterations

- [x] 10.6 Write unit tests for inventory manager
  - Test deduction calculation with unit conversion
  - Test insufficient stock warning generation
  - Test low stock alert triggering
  - Test transaction rollback on error
  - Test inventory transaction logging
  - _Requirements: 103.1, 103.2, 103.3, 103.6_

- [x] 10.7 Checkpoint - Middleware layer complete
  - All middleware functions implemented
  - All property-based tests passing (minimum 100 iterations each)
  - All unit tests passing with >90% coverage
  - Integration tests with database passing
  - Ensure all tests pass, ask the user if questions arise.


### 11. Backend API - Authentication Service

- [x] 11.1 Implement user registration endpoint
  - Create `POST /api/v1/auth/register` endpoint
  - Validate email format, password strength (min 8 chars, mixed case, numbers)
  - Hash password with bcrypt (12 rounds)
  - Create user record with default preferences (currency: INR, language: en)
  - Return user object (without password hash)
  - _Requirements: 22.1, 22.6, 44.5_

- [x] 11.2 Implement user login endpoint
  - Create `POST /api/v1/auth/login` endpoint
  - Validate email and password
  - Verify password with bcrypt
  - Generate JWT token (24-hour expiration)
  - Return token and user object
  - Implement rate limiting (5 failed attempts per 15 minutes)
  - _Requirements: 22.2, 22.7, 44.6_

- [x] 11.3 Implement logout and token refresh endpoints
  - Create `POST /api/v1/auth/logout` endpoint clearing session
  - Create `POST /api/v1/auth/refresh` endpoint generating new token from refresh token
  - Implement token blacklist for logout
  - _Requirements: 22.3_

- [x] 11.4 Implement user profile endpoints
  - Create `GET /api/v1/users/me` endpoint returning current user profile
  - Create `PATCH /api/v1/users/me` endpoint updating user preferences (unit_preferences, default_currency, language)
  - Validate preference updates
  - _Requirements: 22.4, 22.5, 50.1, 50.2, 50.3, 50.4_

- [x] 11.5 Write integration tests for authentication
  - Test user registration with valid and invalid data
  - Test login with correct and incorrect credentials
  - Test JWT token validation
  - Test rate limiting on failed login attempts
  - Test user profile retrieval and updates
  - _Requirements: 22.1, 22.2, 22.6, 22.7_


### 12. Backend API - Recipe Service

- [x] 12.1 Implement recipe CRUD endpoints
  - Create `GET /api/v1/recipes` endpoint listing user recipes with pagination, filtering (status, source_type), and sorting
  - Create `GET /api/v1/recipes/:id` endpoint retrieving single recipe with all ingredients, sections, steps
  - Create `POST /api/v1/recipes` endpoint creating recipe with ingredients, sections, steps in transaction
  - Create `PATCH /api/v1/recipes/:id` endpoint updating recipe and creating new version
  - Create `DELETE /api/v1/recipes/:id` endpoint deleting recipe with cascade
  - Validate user owns recipe for all operations
  - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 23.8_

- [x] 12.2 Implement recipe scaling endpoint
  - Create `POST /api/v1/recipes/:id/scale` endpoint
  - Accept targetYieldGrams or targetServings parameter
  - Call recipe scaler middleware
  - Recalculate nutrition for scaled recipe
  - Return scaled recipe with warnings
  - _Requirements: 23.7, 20.1, 20.5_

- [x] 12.3 Implement recipe versioning endpoints
  - Create `GET /api/v1/recipes/:id/versions` endpoint listing all versions
  - Create `POST /api/v1/recipes/:id/versions` endpoint creating new version with snapshot
  - Implement version comparison endpoint showing differences
  - _Requirements: 8.5, 56.1, 56.2_

- [x] 12.4 Implement recipe search and filtering
  - Create `GET /api/v1/recipes/search` endpoint with full-text search on title and description
  - Support filtering by status, source_type, ingredient presence
  - Support sorting by created_at, updated_at, title, rating
  - Support combining multiple filters
  - _Requirements: 51.1, 51.2, 51.3, 51.4, 51.5, 51.6_

- [x] 12.5 Write integration tests for recipe service
  - Test recipe creation with ingredients, sections, steps
  - Test recipe retrieval with all related data
  - Test recipe update and version creation
  - Test recipe deletion and cascade
  - Test recipe scaling with nutrition recalculation
  - Test recipe search and filtering
  - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 23.7_

- [x] 12.6 Write property tests for recipe operations
  - **Property 11: Recipe Versioning on Modification**
  - **Validates: Requirements 8.5**
  - Test that every recipe modification creates new version with incremented version_number
  - **Property 15: Transaction Atomicity for Recipe Creation**
  - **Validates: Requirements 88.6**
  - Test that recipe creation with multiple ingredients is atomic (all or nothing)
  - Use fast-check with minimum 100 iterations


### 13. Backend API - Ingredient Service

- [x] 13.1 Implement ingredient endpoints
  - Create `GET /api/v1/ingredients` endpoint listing all ingredients with pagination
  - Create `GET /api/v1/ingredients/:id` endpoint retrieving ingredient details with nutrition and density
  - Create `POST /api/v1/ingredients` endpoint for creating custom ingredients
  - Create `GET /api/v1/ingredients/search?q=:query` endpoint with fuzzy matching
  - Call search engine middleware for fuzzy search
  - Return results with similarity scores and alias indicators
  - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5_

- [x] 13.2 Write integration tests for ingredient service
  - Test ingredient listing with pagination
  - Test ingredient retrieval with details
  - Test custom ingredient creation
  - Test fuzzy search with various queries
  - Test search ranking by similarity
  - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5_

### 14. Backend API - Journal Service

- [x] 14.1 Implement journal CRUD endpoints
  - Create `GET /api/v1/recipes/:id/journal` endpoint listing journal entries for recipe
  - Create `POST /api/v1/recipes/:id/journal` endpoint creating journal entry with optional inventory deduction
  - Create `PATCH /api/v1/journal/:id` endpoint updating journal entry
  - Create `DELETE /api/v1/journal/:id` endpoint deleting journal entry
  - Validate user owns recipe and journal entry
  - _Requirements: 25.1, 25.2, 25.3, 25.4_

- [x] 14.2 Implement journal image upload
  - Create `POST /api/v1/journal/:id/images` endpoint accepting image uploads
  - Validate image format (JPEG, PNG, WebP) and size (max 10MB)
  - Resize images to multiple sizes (thumbnail, medium, full)
  - Upload to cloud storage (AWS S3 or Cloudflare R2)
  - Return image URLs
  - _Requirements: 25.5, 25.6, 52.1, 52.2, 52.3, 52.4, 52.5, 52.6, 52.7_

- [x] 14.3 Implement audio note upload and transcription
  - Create `POST /api/v1/journal/:id/audio` endpoint accepting audio uploads
  - Validate audio format (MP3, WAV, M4A) and size
  - Upload to cloud storage
  - Queue transcription job with speech-to-text service
  - Store audio metadata with pending transcription status
  - Implement webhook for transcription completion
  - _Requirements: 53.1, 53.2, 53.3, 53.4, 53.5, 53.6, 53.7_

- [x] 14.4 Write integration tests for journal service
  - Test journal entry creation with and without inventory deduction
  - Test journal entry updates
  - Test journal entry deletion
  - Test image upload and storage
  - Test audio upload and transcription queueing
  - _Requirements: 25.1, 25.2, 25.3, 25.4, 25.5_

- [x] 14.5 Write property tests for journal operations
  - **Property 10: Baking Loss Calculation**
  - **Validates: Requirements 16.2**
  - Test that baking_loss_grams = pre_bake_weight - outcome_weight and baking_loss_percentage = (loss / pre_bake) × 100
  - **Property 12: Journal Entry Version Association**
  - **Validates: Requirements 9.6**
  - Test that journal entries reference current recipe version at creation time
  - Use fast-check with minimum 100 iterations


### 15. Backend API - Inventory Service

- [x] 15.1 Implement inventory CRUD endpoints
  - Create `GET /api/v1/inventory` endpoint listing all inventory items with current stock levels
  - Create `GET /api/v1/inventory/:id` endpoint retrieving inventory item details
  - Create `POST /api/v1/inventory` endpoint adding new inventory item
  - Create `PATCH /api/v1/inventory/:id` endpoint updating inventory item (quantity, cost, expiration)
  - Create `DELETE /api/v1/inventory/:id` endpoint deleting inventory item
  - _Requirements: 101.2, 101.3, 101.4_

- [x] 15.2 Implement inventory purchase tracking
  - Create `POST /api/v1/inventory/purchases` endpoint logging ingredient purchase
  - Automatically update inventory quantity_on_hand when purchase logged
  - Track purchase history with supplier, invoice, cost
  - Create `GET /api/v1/inventory/purchases` endpoint listing purchase history
  - _Requirements: 113.1, 113.2, 113.3_

- [x] 15.3 Implement inventory alerts
  - Create `GET /api/v1/inventory/alerts` endpoint listing low stock and expiring items
  - Check for items below min_stock_level
  - Check for items expiring within 7 days
  - Return alerts with ingredient name, current quantity, min level, expiration date
  - _Requirements: 102.1, 102.2, 102.3, 102.4, 102.5, 102.6_

- [x] 15.4 Implement inventory deduction endpoint
  - Create `POST /api/v1/inventory/deduct` endpoint for manual or automatic deduction
  - Accept recipe_id and scaling_factor
  - Call inventory manager middleware to calculate deductions
  - Display confirmation dialog data (ingredients to deduct, current stock, warnings)
  - Apply deductions in transaction when confirmed
  - Create low stock alerts if thresholds crossed
  - _Requirements: 103.1, 103.2, 103.3, 103.4, 103.5, 103.6_

- [x] 15.5 Implement inventory reports
  - Create `GET /api/v1/inventory/reports/usage` endpoint showing consumption over time
  - Create `GET /api/v1/inventory/reports/value` endpoint calculating total inventory value
  - Group by ingredient category
  - Support date range filtering
  - _Requirements: 101.6, 101.7, 103.7_

- [x] 15.6 Write integration tests for inventory service
  - Test inventory item creation and updates
  - Test purchase logging and quantity updates
  - Test low stock alert generation
  - Test expiration warning generation
  - Test inventory deduction with transaction rollback on error
  - _Requirements: 101.2, 101.3, 113.2, 102.3, 103.1_

- [x] 15.7 Write property tests for inventory operations
  - **Property 18: Inventory Transaction Completeness**
  - **Validates: Requirements 101.7**
  - Test that current_quantity = sum(purchases) - sum(deductions)
  - **Property 19: Low Stock Alert Triggering**
  - **Validates: Requirements 102.3**
  - Test that alert created when quantity < min_stock_level
  - **Property 21: Inventory Sufficiency Warning**
  - **Validates: Requirements 103.6**
  - Test that warning shown when recipe quantity > available inventory
  - Use fast-check with minimum 100 iterations


### 16. Backend API - Costing and Pricing Service

- [x] 16.1 Implement recipe cost calculation endpoint
  - Create `POST /api/v1/recipes/:id/cost/calculate` endpoint
  - Accept overhead_cost, packaging_cost, labor_cost parameters
  - Call cost calculator middleware
  - Handle missing inventory data errors gracefully
  - Return cost breakdown with ingredient-level details
  - Store cost in recipe_costs table with timestamp
  - _Requirements: 104.1, 104.2, 104.3, 104.4, 104.5, 104.6, 104.7_

- [x] 16.2 Implement cost history and tracking
  - Create `GET /api/v1/recipes/:id/cost` endpoint retrieving current cost
  - Create `GET /api/v1/recipes/:id/cost/history` endpoint listing historical costs
  - Display cost trends over time
  - Highlight significant cost changes (>10%)
  - _Requirements: 118.1, 118.2, 118.3, 118.4, 118.5_

- [x] 16.3 Implement pricing calculator endpoint
  - Create `POST /api/v1/recipes/:id/pricing` endpoint
  - Accept target_profit_margin_percent parameter
  - Call pricing calculator middleware
  - Return suggested_selling_price, profit_amount, actual_profit_margin
  - Support custom selling price input with actual margin calculation
  - _Requirements: 105.1, 105.2, 105.3, 105.4_

- [x] 16.4 Implement profit margin analysis
  - Create `GET /api/v1/costing/reports/profit-margins` endpoint
  - Calculate profit margin for each recipe
  - Rank recipes by profitability
  - Group by product category
  - Calculate break-even quantities
  - _Requirements: 119.1, 119.2, 119.3, 119.4_

- [x] 16.5 Implement cost trend reports
  - Create `GET /api/v1/costing/reports/cost-trends` endpoint
  - Show cost changes over time with charts
  - Compare costs across different time periods
  - Generate cost change notifications
  - Suggest pricing adjustments when costs change significantly
  - _Requirements: 118.1, 118.2, 118.3, 118.4, 118.5, 118.6_

- [x] 16.6 Write integration tests for costing service
  - Test cost calculation with all components
  - Test cost calculation with missing inventory data (should error)
  - Test cost history tracking
  - Test pricing calculation with various margins
  - Test profit margin analysis
  - _Requirements: 104.1, 105.2, 119.1_

- [x] 16.7 Write property tests for costing operations
  - **Property 23: Cost Recalculation on Price Change**
  - **Validates: Requirements 104.8**
  - Test that recipe cost updates when ingredient prices change
  - **Property 24: Packaging Cost Inclusion**
  - **Validates: Requirements 115.4**
  - Test that packaging costs included in total cost
  - **Property 28: Profit Margin Calculation**
  - **Validates: Requirements 119.1**
  - Test that profit_margin = ((price - cost) / price) × 100
  - Use fast-check with minimum 100 iterations


### 17. Backend API - Supplier and Packaging Management

- [x] 17.1 Implement supplier CRUD endpoints
  - Create `GET /api/v1/suppliers` endpoint listing all suppliers
  - Create `GET /api/v1/suppliers/:id` endpoint retrieving supplier details
  - Create `POST /api/v1/suppliers` endpoint adding new supplier
  - Create `PATCH /api/v1/suppliers/:id` endpoint updating supplier information
  - Create `DELETE /api/v1/suppliers/:id` endpoint deleting supplier
  - Create `GET /api/v1/suppliers/:id/ingredients` endpoint listing ingredients from supplier
  - _Requirements: 114.1, 114.2, 114.3, 114.4, 114.5_

- [x] 17.2 Implement packaging management endpoints
  - Create `GET /api/v1/packaging` endpoint listing packaging items
  - Create `POST /api/v1/packaging` endpoint adding packaging item with cost
  - Create `PATCH /api/v1/packaging/:id` endpoint updating packaging item
  - Create `DELETE /api/v1/packaging/:id` endpoint deleting packaging item
  - Associate packaging items with recipes
  - _Requirements: 115.1, 115.2, 115.3, 115.7_

- [x] 17.3 Implement delivery zone management
  - Create `GET /api/v1/delivery-zones` endpoint listing delivery zones
  - Create `POST /api/v1/delivery-zones` endpoint adding delivery zone with pricing
  - Create `PATCH /api/v1/delivery-zones/:id` endpoint updating zone pricing
  - Create `DELETE /api/v1/delivery-zones/:id` endpoint deleting zone
  - _Requirements: 116.1, 116.2, 116.3_

- [x] 17.4 Write integration tests for supplier and packaging
  - Test supplier CRUD operations
  - Test packaging item management
  - Test delivery zone management
  - Test supplier-ingredient associations
  - _Requirements: 114.1, 114.2, 115.1, 116.1_

- [x] 17.5 Write property tests for delivery and bulk pricing
  - **Property 26: Delivery Charge Calculation**
  - **Validates: Requirements 116.4**
  - Test delivery charge calculation with base charge, per-km charge, and free delivery threshold
  - **Property 27: Bulk Pricing Discount**
  - **Validates: Requirements 117.2**
  - Test that correct pricing tier applied based on order quantity
  - Use fast-check with minimum 100 iterations


### 18. Backend API - Social Media Service

- [~] 18.1 Implement recipe card generation
  - Create `POST /api/v1/social/recipe-card` endpoint
  - Accept format (instagram_story, instagram_post, whatsapp), language (en, hi, bilingual), color scheme
  - Use image generation service (node-canvas or Puppeteer) to render recipe card
  - Include recipe title, ingredients, key instructions, user branding, watermark
  - Generate image in specified dimensions (1080x1920 for story, 1080x1080 for post, 800x800 for WhatsApp)
  - Optimize image (WebP with JPEG fallback, compress for WhatsApp <500KB)
  - Upload to cloud storage and return URL
  - _Requirements: 108.1, 108.2, 108.3, 108.4, 108.5, 108.6, 108.7, 108.8_

- [~] 18.2 Implement journal entry sharing
  - Create `POST /api/v1/social/journal-card` endpoint
  - Generate shareable card with journal photos, notes, rating
  - Support hiding private notes when sharing publicly
  - Generate shareable link with preview metadata
  - _Requirements: 109.1, 109.2, 109.3, 109.7_

- [~] 18.3 Implement WhatsApp formatting
  - Create `POST /api/v1/social/whatsapp-format` endpoint
  - Format recipe text for WhatsApp with proper line breaks, emojis, and structure
  - Generate shareable link with preview metadata (Open Graph tags)
  - Compress images for WhatsApp sharing
  - Support shopping list and inventory reminder formatting
  - _Requirements: 110.1, 110.2, 110.3, 110.4, 110.5_

- [~] 18.4 Implement social media templates
  - Create `GET /api/v1/social/templates` endpoint listing available templates
  - Support custom templates with user-defined colors, fonts, layouts
  - Store template preferences per user
  - _Requirements: 108.5_

- [~] 18.5 Write integration tests for social media service
  - Test recipe card generation for all formats
  - Test bilingual card generation
  - Test WhatsApp message formatting
  - Test image optimization and compression
  - Test shareable link generation
  - _Requirements: 108.1, 108.2, 108.3, 110.1, 110.2_


### 19. Backend API - Import/Export and Documentation

- [~] 19.1 Implement recipe import/export
  - Create `GET /api/v1/recipes/:id/export` endpoint exporting recipe to JSON format
  - Create `POST /api/v1/recipes/import` endpoint importing recipe from JSON
  - Support bulk export of multiple recipes
  - Validate imported recipe data before insertion
  - Handle ingredient matching using fuzzy search
  - Preserve all recipe metadata during export/import
  - _Requirements: 49.1, 49.2, 49.3, 49.4, 49.5, 49.6_

- [~] 19.2 Implement recipe URL import
  - Create `POST /api/v1/recipes/import-url` endpoint
  - Extract recipe data from URLs using schema.org Recipe markup
  - Parse common recipe website formats
  - Extract recipe images from source
  - Preserve source attribution with original URL and author
  - Handle parsing failures with manual entry fallback
  - _Requirements: 76.1, 76.2, 76.3, 76.4, 76.5, 76.6_

- [~] 19.3 Implement recipe export formats
  - Create endpoints for PDF, Markdown, and schema.org JSON-LD export
  - Include all recipe metadata, ingredients, instructions
  - Format for printing (PDF) and documentation (Markdown)
  - _Requirements: 77.1, 77.2, 77.3, 77.4, 77.5_

- [~] 19.4 Generate API documentation
  - Create OpenAPI/Swagger specification for all endpoints
  - Document all request parameters, headers, body schemas
  - Document all response schemas and status codes
  - Provide example requests and responses
  - Document authentication requirements
  - Setup Swagger UI for interactive documentation
  - _Requirements: 41.1, 41.2, 41.3, 41.4, 41.5, 41.6_

- [~] 19.5 Write integration tests for import/export
  - Test recipe export to JSON
  - Test recipe import from JSON
  - Test recipe URL import with schema.org markup
  - Test export to PDF, Markdown, JSON-LD
  - _Requirements: 49.1, 49.2, 76.1, 77.1, 77.2_

- [~] 19.6 Write property tests for import/export
  - **Property 13: Recipe Export-Import Round-Trip**
  - **Validates: Requirements 49.5, 63.6**
  - Test that export(import(recipe)) produces equivalent recipe
  - Generate random recipes, export to JSON, import, and compare
  - Use fast-check with minimum 100 iterations

- [~] 19.7 Checkpoint - Backend API complete
  - All API endpoints implemented and documented
  - All integration tests passing
  - All property-based tests passing
  - API documentation generated and accessible
  - Postman/Insomnia collection created for manual testing
  - Ensure all tests pass, ask the user if questions arise.


### 20. Frontend Setup and Core Infrastructure

- [ ] 20.1 Initialize frontend project
  - Create `frontend/` directory with React + TypeScript + Vite setup
  - Initialize npm project with dependencies (react, react-router-dom, axios, react-query, zustand)
  - Setup Tailwind CSS for styling
  - Setup ESLint and Prettier
  - Create directory structure: `/src/components`, `/src/pages`, `/src/services`, `/src/hooks`, `/src/store`, `/src/utils`
  - _Requirements: 27.1, 27.2, 27.3_

- [ ] 20.2 Setup routing and navigation
  - Create React Router configuration with routes for all pages
  - Implement protected routes requiring authentication
  - Create navigation component with mobile-responsive menu
  - Implement breadcrumb navigation
  - _Requirements: 27.4, 28.5_

- [ ] 20.3 Setup state management
  - Create Zustand stores for authentication, recipes, inventory, user preferences
  - Implement state persistence for user preferences (localStorage)
  - Implement optimistic updates for better UX
  - Handle state synchronization across multiple tabs
  - _Requirements: 27.5, 90.1, 90.2, 90.3, 90.4, 90.5_

- [ ] 20.4 Setup API client
  - Create Axios instance with base URL configuration
  - Implement request interceptor adding authentication token
  - Implement response interceptor handling errors
  - Implement retry logic with exponential backoff
  - Setup React Query for data fetching and caching
  - _Requirements: 21.10, 94.3_

- [ ] 20.5 Setup error handling and recovery
  - Create error boundary component catching React errors
  - Implement auto-save for form data (localStorage, 30-second interval)
  - Implement form data restoration on page reload
  - Create user-friendly error messages
  - Implement manual retry buttons for failed operations
  - _Requirements: 94.1, 94.2, 94.5, 94.6_

- [ ] 20.6 Setup internationalization
  - Install and configure i18n library (react-i18next)
  - Create translation files for English and Hindi
  - Implement language switcher component
  - Detect browser language for default selection
  - Support locale-specific date and number formatting
  - _Requirements: 59.1, 59.2, 59.3, 59.4, 59.5, 120.1_


### 21. Frontend - Component Library

- [ ] 21.1 Create base UI components
  - Create Button component with variants (primary, secondary, danger) and sizes
  - Create Input component with validation states and error messages
  - Create Select component with search/filter capability
  - Create Textarea component with auto-resize
  - Create Checkbox and Radio components
  - Create Modal component with backdrop and close handlers
  - Create Card component for content containers
  - Create Badge component for status indicators
  - All components must have minimum 44x44px touch targets for mobile
  - _Requirements: 93.1, 93.4, 93.5, 112.1_

- [ ] 21.2 Create form components
  - Create Form component with validation using react-hook-form
  - Create FormField component wrapping inputs with labels and errors
  - Create SearchInput component with debouncing (300ms)
  - Create Autocomplete component for ingredient search
  - Create DatePicker component with Indian date format (DD/MM/YYYY)
  - Create CurrencyInput component with INR formatting (₹1,234.56)
  - _Requirements: 27.6, 43.6, 106.2, 120.2_

- [ ] 21.3 Create recipe-specific components
  - Create IngredientList component displaying ingredients with quantities and units
  - Create StepList component displaying numbered instructions
  - Create NutritionDisplay component showing nutrition facts table
  - Create RecipeCard component for recipe list view with thumbnail, title, metadata
  - Create ScalingControl component with target yield/servings input
  - _Requirements: 29.7, 30.4, 34.1, 93.2_

- [ ] 21.4 Create loading and feedback components
  - Create LoadingSpinner component for async operations
  - Create Skeleton component for content loading states
  - Create Toast/Notification component for success/error messages
  - Create ProgressBar component for upload progress
  - Create EmptyState component for empty lists
  - _Requirements: 27.7_

- [ ] 21.5 Implement accessibility features
  - Add semantic HTML to all components
  - Add ARIA labels for complex interactions
  - Implement keyboard navigation (Tab, Enter, Escape)
  - Ensure 4.5:1 color contrast ratios
  - Add alt text support for images
  - Test with screen reader
  - _Requirements: 61.1, 61.2, 61.3, 61.4, 61.5, 93.6_

- [ ] 21.6 Document component library
  - Create Storybook setup for component documentation
  - Add stories for all components with usage examples
  - Document props and variants
  - Add accessibility notes
  - _Requirements: 93.3_


### 22. Frontend - Authentication and User Management

- [ ] 22.1 Create authentication pages
  - Create Login page with email and password fields
  - Create Registration page with email, password, display name fields
  - Implement form validation with user-friendly error messages
  - Display loading states during authentication
  - Redirect to dashboard after successful login
  - _Requirements: 28.1, 28.2, 28.5_

- [ ] 22.2 Implement authentication flow
  - Store JWT token securely (httpOnly cookie or secure localStorage)
  - Include token in all API requests via interceptor
  - Implement automatic token refresh before expiration
  - Redirect unauthenticated users to login page
  - Clear token and redirect on logout
  - _Requirements: 28.3, 28.4, 28.6_

- [ ] 22.3 Create user settings page
  - Create Settings page with tabs for preferences, profile, security
  - Implement unit system preference selector (metric, cups, hybrid, baker's percent)
  - Implement temperature unit selector (Celsius, Fahrenheit)
  - Implement currency selector (INR, USD, EUR)
  - Implement language selector (English, Hindi)
  - Implement date format selector
  - Save preferences and apply immediately across app
  - _Requirements: 50.1, 50.2, 50.3, 50.4, 50.5, 50.6_

- [ ] 22.4 Write component tests for authentication
  - Test login form validation
  - Test registration form validation
  - Test authentication flow (login, token storage, redirect)
  - Test logout flow (token clearing, redirect)
  - Test protected route access
  - _Requirements: 28.1, 28.2, 28.5, 28.6_


### 23. Frontend - Recipe Management Interface

- [ ] 23.1 Create recipe list page
  - Create RecipeList page displaying all user recipes in grid/list view
  - Implement search bar with debounced input
  - Implement filters (status, source type, tags)
  - Implement sorting (created date, updated date, title, rating)
  - Implement pagination or infinite scroll
  - Display recipe cards with thumbnail, title, servings, rating
  - _Requirements: 29.1, 29.6, 29.7, 51.1, 51.2, 51.3, 51.4, 51.5_

- [ ] 23.2 Create recipe detail page
  - Create RecipeDetail page showing full recipe information
  - Display recipe title, description, servings, yield, source
  - Display ingredient list with quantities in user's preferred units
  - Display sections and steps in order
  - Display nutrition information (per serving and per 100g)
  - Display water activity and hydration percentage if available
  - Show recipe version history
  - _Requirements: 29.2, 30.4, 34.1, 35.1, 35.5_

- [ ] 23.3 Create recipe creation/editing form
  - Create RecipeForm page with multi-step form (details, ingredients, instructions)
  - Implement recipe details section (title, description, servings, yield)
  - Implement ingredient section with autocomplete search, quantity, unit inputs
  - Support drag-and-drop reordering of ingredients
  - Implement sections and steps with rich text editor for instructions
  - Implement duration and temperature inputs for steps
  - Auto-save form data every 30 seconds
  - _Requirements: 29.3, 29.4, 30.1, 30.2, 30.3, 30.5, 30.6, 94.1_

- [ ] 23.4 Implement recipe scaling interface
  - Add scaling control to recipe detail page
  - Display original and scaled quantities side-by-side
  - Update all quantities when scaling factor changes
  - Display warnings for extreme scaling factors
  - Allow saving scaled version as new recipe
  - _Requirements: 31.1, 31.2, 31.3, 31.4, 31.5_

- [ ] 23.5 Implement recipe deletion
  - Add delete button with confirmation dialog
  - Display warning about cascade deletion (journal entries, versions)
  - Redirect to recipe list after deletion
  - _Requirements: 29.5_

- [ ] 23.6 Write component tests for recipe management
  - Test recipe list rendering and filtering
  - Test recipe detail display
  - Test recipe form validation
  - Test ingredient autocomplete
  - Test recipe scaling calculations
  - _Requirements: 29.1, 29.2, 29.3, 31.1_


### 24. Frontend - Ingredient Management Interface

- [ ] 24.1 Create ingredient search interface
  - Create IngredientSearch component with autocomplete
  - Display suggestions as user types (debounced 300ms)
  - Show ingredient category, density, allergen flags in suggestions
  - Highlight matching text in suggestions
  - Support keyboard navigation (arrow keys, enter)
  - _Requirements: 30.1, 30.2_

- [ ] 24.2 Create ingredient detail modal
  - Display ingredient name, category, density, nutrition facts
  - Show available substitutions with impact warnings
  - Display ingredient aliases
  - Show composite ingredient breakdown if applicable
  - _Requirements: 30.8, 35.7_

- [ ] 24.3 Create custom ingredient form
  - Allow users to add custom ingredients
  - Input fields for name, category, density, nutrition
  - Validate required fields
  - _Requirements: 24.3_

- [ ] 24.4 Write component tests for ingredient management
  - Test ingredient search autocomplete
  - Test ingredient detail display
  - Test custom ingredient creation
  - Test substitution display
  - _Requirements: 30.1, 30.2, 30.8_

### 25. Frontend - Baking Journal Interface

- [ ] 25.1 Create journal entry list
  - Create JournalList page displaying entries in chronological order
  - Display entry date, rating, outcome weight, thumbnail
  - Filter by recipe
  - Sort by date
  - _Requirements: 32.3_

- [ ] 25.2 Create journal entry form
  - Create JournalEntryForm with date picker, notes, rating, outcome weight inputs
  - Add pre-bake weight input for hydration loss tracking
  - Add measured water activity input
  - Add image upload with preview (multiple images)
  - Add audio recording button with waveform visualization
  - Add "Deduct from inventory" checkbox with ingredient preview
  - _Requirements: 32.1, 32.2, 35.3, 35.4_

- [ ] 25.3 Create journal entry detail view
  - Display all entry details (date, notes, rating, weights)
  - Display photo gallery with lightbox
  - Display calculated baking loss percentage
  - Display audio notes with playback and transcription
  - Show inventory deductions if applicable
  - _Requirements: 32.4, 35.4_

- [ ] 25.4 Implement image upload
  - Support drag-and-drop and file picker
  - Validate image format (JPEG, PNG, WebP) and size (max 10MB)
  - Show upload progress
  - Display thumbnails after upload
  - Allow image deletion
  - _Requirements: 32.2, 52.1, 52.2_

- [ ] 25.5 Implement audio recording
  - Use browser MediaRecorder API for recording
  - Display recording duration and waveform
  - Support pause/resume
  - Upload audio file after recording
  - Display transcription when available
  - _Requirements: 53.1, 53.2_

- [ ] 25.6 Write component tests for journal
  - Test journal entry form validation
  - Test image upload and preview
  - Test audio recording interface
  - Test baking loss calculation display
  - _Requirements: 32.1, 32.2, 53.1_


### 26. Frontend - Inventory Management Interface

- [ ] 26.1 Create inventory list page
  - Create InventoryList page displaying all inventory items
  - Show ingredient name, quantity on hand, unit, cost per unit, expiration date
  - Display low stock indicators (red badge when below min level)
  - Display expiration warnings (yellow badge when <7 days)
  - Filter by category
  - Sort by name, quantity, expiration date
  - _Requirements: 101.4, 102.3, 102.6_

- [ ] 26.2 Create inventory item form
  - Create form for adding/editing inventory items
  - Ingredient selector with autocomplete
  - Quantity, unit, cost per unit inputs with INR formatting
  - Purchase date and expiration date pickers
  - Supplier selector
  - Min stock level and reorder quantity inputs
  - _Requirements: 101.2, 101.3_

- [ ] 26.3 Create purchase logging interface
  - Create PurchaseForm for logging ingredient purchases
  - Ingredient selector, quantity, cost, supplier, invoice number inputs
  - Automatically update inventory quantity on save
  - Display purchase history table
  - _Requirements: 113.1, 113.2, 113.3_

- [ ] 26.4 Create inventory alerts page
  - Create InventoryAlerts page listing low stock and expiring items
  - Group by alert type (low stock, expiring soon, expired)
  - Display reorder quantities for low stock items
  - Show supplier contact info for reordering
  - Support WhatsApp reminder sending
  - _Requirements: 102.3, 102.4, 102.5, 102.6, 102.7_

- [ ] 26.5 Create inventory reports
  - Create InventoryReports page with usage and value reports
  - Display consumption over time with charts
  - Display total inventory value by category
  - Support date range filtering
  - Export reports to CSV/PDF
  - _Requirements: 101.6, 101.7, 103.7_

- [ ] 26.6 Write component tests for inventory
  - Test inventory list rendering and filtering
  - Test inventory item form validation
  - Test purchase logging
  - Test low stock alert display
  - Test inventory reports
  - _Requirements: 101.2, 101.4, 102.3, 113.2_


### 27. Frontend - Costing and Pricing Interface

- [ ] 27.1 Create cost calculator page
  - Create CostCalculator page for recipe cost calculation
  - Display ingredient cost breakdown table
  - Input fields for overhead, packaging, labor costs
  - Display total cost, cost per serving, cost per 100g
  - Show warnings for missing inventory data
  - Save calculated cost to history
  - _Requirements: 104.1, 104.2, 104.3, 104.4, 104.5, 104.6, 104.7_

- [ ] 27.2 Create pricing calculator interface
  - Add pricing section to cost calculator page
  - Input field for target profit margin percentage
  - Display suggested selling price with INR formatting
  - Display profit amount and actual margin
  - Support custom selling price input with margin calculation
  - Display break-even quantity
  - _Requirements: 105.1, 105.2, 105.3, 105.4, 105.7_

- [ ] 27.3 Create cost history view
  - Display cost history table with timestamps
  - Show cost trends over time with line chart
  - Highlight significant cost changes (>10%)
  - Compare costs across time periods
  - _Requirements: 118.1, 118.2, 118.3, 118.4_

- [ ] 27.4 Create profit margin analysis page
  - Create ProfitAnalysis page with profitability dashboard
  - Display profit margin rankings by recipe
  - Group by product category
  - Show break-even analysis
  - Display pricing optimization suggestions
  - _Requirements: 119.1, 119.2, 119.3, 119.4, 119.5_

- [ ] 27.5 Create bulk pricing interface
  - Add bulk pricing section to pricing calculator
  - Define quantity tiers with prices/discounts
  - Display pricing table for different quantities
  - Calculate profit margins for each tier
  - _Requirements: 117.1, 117.2, 117.3, 117.4, 117.5_

- [ ] 27.6 Write component tests for costing
  - Test cost calculator with all components
  - Test pricing calculator with various margins
  - Test cost history display
  - Test profit margin analysis
  - Test bulk pricing tiers
  - _Requirements: 104.1, 105.2, 119.1_


### 28. Frontend - Social Media and Sharing

- [ ] 28.1 Create recipe card export interface
  - Create RecipeCardExport modal/page
  - Format selector (Instagram Story, Instagram Post, WhatsApp)
  - Language selector (English, Hindi, Bilingual)
  - Color scheme selector with preview
  - Branding options (logo upload, watermark text)
  - Generate button triggering API call
  - Display preview of generated image
  - Download button for generated image
  - _Requirements: 108.1, 108.2, 108.3, 108.4, 108.5, 108.6, 108.7_

- [ ] 28.2 Create journal sharing interface
  - Add share button to journal entry detail
  - Generate shareable card with photos and notes
  - Option to hide private notes
  - Generate shareable link
  - Copy link to clipboard
  - Share via WhatsApp button
  - _Requirements: 109.1, 109.2, 109.3, 109.4, 109.7_

- [ ] 28.3 Implement WhatsApp sharing
  - Format recipe text for WhatsApp with emojis and structure
  - Generate shareable link with preview metadata
  - Open WhatsApp with pre-filled message using `whatsapp://send` URL scheme
  - Support sharing shopping lists and inventory reminders
  - _Requirements: 110.1, 110.2, 110.3, 110.4_

- [ ] 28.4 Create social media templates
  - Display available templates gallery
  - Allow custom template creation with color/font/layout editor
  - Save template preferences per user
  - _Requirements: 108.5_

- [ ] 28.5 Write component tests for social media
  - Test recipe card export with different formats
  - Test WhatsApp message formatting
  - Test shareable link generation
  - Test template selection
  - _Requirements: 108.1, 108.2, 110.1_


### 29. Frontend - Timer and Hands-Free Features

- [ ] 29.1 Create timer interface
  - Create Timer component displaying active timers
  - Show countdown time remaining for each timer
  - Support starting timers from recipe steps
  - Support pause/resume functionality
  - Play alert sound when timer completes
  - Support multiple simultaneous timers
  - Persist timer state in localStorage across page refreshes
  - _Requirements: 33.1, 33.2, 33.3, 33.4, 33.5, 33.6, 33.7_

- [ ] 29.2 Implement screen wake lock
  - Use browser Wake Lock API to prevent screen sleep
  - Add toggle button to enable/disable wake lock
  - Automatically enable wake lock when viewing recipe or running timer
  - Display wake lock status indicator
  - Release wake lock when navigating away
  - Handle wake lock errors gracefully with fallback message
  - _Requirements: 111.1, 111.2, 111.3, 111.4, 111.5, 111.6, 111.7_

- [ ] 29.3 Implement touch-friendly controls
  - Ensure all interactive elements have minimum 44x44px touch targets
  - Create large, clearly labeled buttons for common actions
  - Implement swipe gestures for navigation between recipe steps
  - Add auto-scroll for recipe steps during active baking
  - _Requirements: 112.1, 112.2, 112.3, 112.6_

- [ ] 29.4 Implement voice commands (optional)
  - Integrate Web Speech API for voice recognition
  - Support simple voice commands for timer operations (start, pause, stop)
  - Display voice command status indicator
  - Provide fallback for browsers without speech API support
  - _Requirements: 112.4, 112.7_

- [ ] 29.5 Write component tests for timer and hands-free
  - Test timer countdown and completion
  - Test multiple simultaneous timers
  - Test wake lock activation and release
  - Test touch target sizes
  - _Requirements: 33.1, 33.2, 111.1, 112.1_


### 30. Frontend - Dashboard and Additional Features

- [ ] 30.1 Create dashboard page
  - Create Dashboard page as landing page after login
  - Display recent recipes
  - Display upcoming timers
  - Display low stock alerts
  - Display recent journal entries
  - Display baking statistics (total bakes, success rate, favorite recipes)
  - Display recommended recipes
  - _Requirements: 73.3, 73.4, 98.6_

- [ ] 30.2 Create emergency help interface
  - Create EmergencyHelp page with prominent access button
  - Search interface for common baking issues
  - Display solutions with step-by-step instructions
  - Display prevention tips
  - _Requirements: 75.1, 75.2, 75.3, 75.4_

- [ ] 30.3 Create shopping list generator
  - Create ShoppingList page generating list from selected recipes
  - Aggregate duplicate ingredients across recipes
  - Expand composite ingredients into base components
  - Organize by ingredient category
  - Support checking off purchased items
  - Export to text or PDF
  - Share via WhatsApp
  - _Requirements: 71.1, 71.2, 71.3, 71.4, 71.5, 71.6_

- [ ] 30.4 Implement responsive design
  - Ensure all pages work on screen sizes 320px to 2560px
  - Optimize layouts for mobile, tablet, desktop
  - Use responsive images with srcset
  - Implement mobile-friendly navigation (hamburger menu)
  - Test on various devices and browsers
  - _Requirements: 60.1, 60.2, 60.3, 60.4_

- [ ] 30.5 Implement PWA features
  - Create service worker for offline support
  - Cache critical assets and API responses
  - Create manifest.json for mobile installation
  - Add app icons for various platforms
  - Implement offline indicator
  - Queue operations when offline, sync when online
  - _Requirements: 60.5, 60.6, 87.6, 94.4_

- [ ] 30.6 Write component tests for dashboard and features
  - Test dashboard rendering with data
  - Test emergency help search
  - Test shopping list generation and aggregation
  - Test responsive layouts at different breakpoints
  - _Requirements: 73.3, 75.1, 71.1, 60.1_

- [ ] 30.7 Checkpoint - Frontend application complete
  - All pages and components implemented
  - All component tests passing
  - Responsive design verified on multiple devices
  - Accessibility compliance verified
  - PWA features working (offline support, installable)
  - Internationalization working (English and Hindi)
  - Ensure all tests pass, ask the user if questions arise.


### 31. External Service Integrations

- [ ] 31.1 Implement cloud storage integration
  - Setup AWS S3 or Cloudflare R2 for image and audio storage
  - Create storage service module with upload, download, delete functions
  - Implement signed URL generation for secure access
  - Configure CORS for browser uploads
  - Implement image optimization (resize, compress, WebP conversion)
  - _Requirements: 52.4, 52.5, 52.6, 53.4_

- [ ] 31.2 Implement speech-to-text integration
  - Integrate with Google Cloud Speech-to-Text, AWS Transcribe, or OpenAI Whisper API
  - Create transcription service module
  - Implement job queueing for async transcription
  - Implement webhook handler for transcription completion
  - Store transcription results in database
  - Handle transcription failures gracefully
  - _Requirements: 53.5, 53.6, 53.7_

- [ ] 31.3 Implement WhatsApp Business API integration
  - Setup WhatsApp Business API account
  - Create WhatsApp service module for sending messages
  - Implement message formatting for recipes, reminders, alerts
  - Implement webhook handler for message status updates
  - Handle API rate limits and errors
  - _Requirements: 110.6, 102.7_

- [ ] 31.4 Implement image generation service
  - Setup image generation using node-canvas or Puppeteer
  - Create templates for Instagram Story, Post, and WhatsApp formats
  - Implement text rendering with custom fonts and colors
  - Implement image composition with recipe data
  - Optimize generated images (compression, format conversion)
  - _Requirements: 108.1, 108.2, 108.3_

- [ ] 31.5 Write integration tests for external services
  - Test cloud storage upload and download
  - Test speech-to-text transcription (with mock service)
  - Test WhatsApp message sending (with mock API)
  - Test image generation for all formats
  - _Requirements: 52.4, 53.5, 110.6, 108.1_


### 32. Testing Infrastructure and Coverage

- [ ] 32.1 Setup testing frameworks
  - Install and configure Jest for unit and integration tests
  - Install and configure fast-check for property-based tests
  - Install and configure React Testing Library for component tests
  - Install and configure Playwright or Cypress for E2E tests
  - Configure test coverage reporting (Istanbul/nyc)
  - _Requirements: 46.1, 46.2, 46.3_

- [ ] 32.2 Create test fixtures and utilities
  - Create test database setup and teardown scripts
  - Create seed data for test database
  - Create factory functions for generating test data
  - Create mock functions for external services
  - Create test utilities for common assertions
  - _Requirements: 46.7, 47.3_

- [ ] 32.3 Write end-to-end tests
  - **E2E Test 1: User Registration and Login**
    - Register new account, verify email, log in, set preferences, view dashboard
  - **E2E Test 2: Create and Scale Recipe**
    - Log in, create recipe with ingredients and steps, scale to 2x, verify quantities and nutrition
  - **E2E Test 3: Log Bake with Inventory Deduction**
    - Add inventory, create recipe, log bake with deduction, verify inventory updated and alerts
  - **E2E Test 4: Calculate Cost and Pricing**
    - Create recipe, add inventory with costs, calculate cost with overhead, set profit margin, verify pricing
  - **E2E Test 5: Export Recipe Card**
    - Create recipe, export as Instagram post, verify image generated and downloadable
  - _Requirements: 46.4_

- [ ] 32.4 Verify test coverage
  - Run all unit tests and verify >90% coverage for middleware
  - Run all property-based tests and verify 100 iterations each
  - Run all integration tests and verify API endpoints covered
  - Run all E2E tests and verify critical workflows covered
  - Generate coverage report and identify gaps
  - _Requirements: 46.1, 46.2, 46.3, 46.4_

- [ ] 32.5 Checkpoint - Testing complete
  - All unit tests passing (>90% coverage)
  - All property-based tests passing (30 properties, 100 iterations each)
  - All integration tests passing
  - All E2E tests passing
  - Coverage report generated and reviewed
  - Ensure all tests pass, ask the user if questions arise.


### 33. Agent Hooks and Automation

- [ ] 33.1 Create pre-commit hook for code quality
  - Create `.husky/pre-commit` hook running ESLint on staged files
  - Run Prettier to format code automatically
  - Check for common security issues (hardcoded secrets, SQL injection patterns)
  - Validate commit message format (conventional commits)
  - Prevent commit if linting errors detected
  - _Requirements: 36.1, 36.2, 36.3, 36.4, 36.5, 36.6_

- [ ] 33.2 Create pre-push hook for testing
  - Create `.husky/pre-push` hook running unit tests
  - Run integration tests
  - Generate test coverage report
  - Enforce minimum coverage threshold (80%)
  - Prevent push if tests fail
  - _Requirements: 37.1, 37.2, 37.3, 37.4, 37.5_

- [ ] 33.3 Create database validation hook
  - Create hook validating migration scripts before execution
  - Check for breaking schema changes
  - Validate foreign key relationships
  - Check for missing indexes on foreign keys
  - Validate enum type usage consistency
  - _Requirements: 38.1, 38.2, 38.3, 38.4, 38.5_

- [ ] 33.4 Create deployment validation hook
  - Create pre-deployment hook running all tests
  - Validate environment configuration
  - Check database migration compatibility
  - Verify API endpoint availability after deployment
  - Create deployment rollback scripts automatically
  - _Requirements: 39.1, 39.2, 39.3, 39.4, 39.5_

- [ ] 33.5 Write tests for agent hooks
  - Test pre-commit hook with linting errors
  - Test pre-push hook with failing tests
  - Test database validation with invalid migrations
  - Test deployment validation with missing config
  - _Requirements: 36.1, 37.1, 38.1, 39.1_


### 34. Deployment and DevOps

- [ ] 34.1 Create Docker containers
  - Create `Dockerfile` for backend with multi-stage build
  - Create `Dockerfile` for frontend with Nginx serving static files
  - Create `docker-compose.yml` for local development with PostgreSQL, Redis, backend, frontend
  - Optimize Docker images for size and security
  - _Requirements: 47.2_

- [ ] 34.2 Create Kubernetes manifests
  - Create Deployment manifests for backend (3 replicas) and frontend
  - Create Service manifests for load balancing
  - Create ConfigMap for environment configuration
  - Create Secret for sensitive data (database credentials, JWT secret)
  - Create Ingress for external access with TLS
  - Configure resource requests and limits
  - Configure liveness and readiness probes
  - _Requirements: 58.1_

- [ ] 34.3 Setup CI/CD pipeline
  - Create GitHub Actions workflow for CI (lint, test, build)
  - Run linting, type checking, unit tests, integration tests on every push
  - Generate and upload coverage reports
  - Enforce minimum coverage threshold (80%)
  - Build Docker images on main branch
  - Push images to container registry
  - _Requirements: 65.1, 65.2, 65.3_

- [ ] 34.4 Setup deployment automation
  - Create deployment workflow for staging (auto-deploy on main branch)
  - Create deployment workflow for production (manual approval required)
  - Run database migrations automatically during deployment
  - Implement blue-green deployment strategy
  - Create rollback procedure
  - _Requirements: 65.4, 65.5, 65.6_

- [ ] 34.5 Setup monitoring and alerting
  - Configure Prometheus for metrics collection
  - Configure Grafana for metrics visualization
  - Setup alerts for error rate >5%, response time >1000ms, high resource usage
  - Configure log aggregation (ELK stack or CloudWatch)
  - Setup error tracking (Sentry or similar)
  - _Requirements: 58.1, 58.2, 58.3, 58.5, 58.6_

- [ ] 34.6 Create deployment documentation
  - Document deployment process step-by-step
  - Document environment configuration requirements
  - Document rollback procedure
  - Document monitoring and alerting setup
  - Document disaster recovery plan
  - _Requirements: 47.4, 99.6_

- [ ] 34.7 Checkpoint - Deployment ready
  - Docker containers built and tested
  - Kubernetes manifests validated
  - CI/CD pipeline running successfully
  - Staging environment deployed and functional
  - Monitoring and alerting configured
  - Documentation complete
  - Ensure all tests pass, ask the user if questions arise.


### 35. Security Hardening and Performance Optimization

- [ ] 35.1 Implement security hardening
  - Configure HTTPS/TLS 1.3 for all communications
  - Implement HSTS headers with long max-age
  - Configure Content Security Policy headers
  - Implement rate limiting per user and per IP (express-rate-limit)
  - Setup secrets management (AWS Secrets Manager or HashiCorp Vault)
  - Configure database encryption at rest
  - Implement SQL injection prevention (parameterized queries)
  - Implement XSS prevention (output encoding, CSP)
  - Implement CSRF protection (double-submit cookie)
  - _Requirements: 44.1, 44.2, 44.3, 44.4, 44.6, 44.7_

- [ ] 35.2 Implement performance optimizations
  - Setup Redis caching for nutrition calculations, ingredient search results, user preferences
  - Implement database query optimization with EXPLAIN ANALYZE
  - Configure connection pooling (20 connections per instance)
  - Implement API response caching with appropriate TTLs
  - Optimize frontend bundle size with code splitting and lazy loading
  - Implement image optimization (WebP format, responsive images)
  - Implement debouncing for search inputs (300ms)
  - Implement virtual scrolling for long lists
  - _Requirements: 43.1, 43.2, 43.3, 43.4, 43.5, 43.6, 43.7_

- [ ] 35.3 Run performance benchmarks
  - Benchmark recipe scaling operations (target: <50ms)
  - Benchmark nutrition calculation (target: <100ms)
  - Benchmark ingredient search (target: <200ms)
  - Benchmark API endpoints (GET <200ms, POST <500ms)
  - Track benchmark results over time
  - Fail CI if performance degrades beyond thresholds
  - _Requirements: 92.1, 92.2, 92.3, 92.4, 92.5, 92.6_

- [ ] 35.4 Conduct security audit
  - Run dependency vulnerability scanning (npm audit, Snyk)
  - Test for SQL injection vulnerabilities
  - Test for XSS vulnerabilities
  - Test authentication and authorization flows
  - Test rate limiting effectiveness
  - Review and fix identified vulnerabilities
  - _Requirements: 44.1, 44.2, 44.3, 44.6_

- [ ] 35.5 Write security and performance tests
  - Test rate limiting enforcement
  - Test CSRF protection
  - Test SQL injection prevention
  - Test XSS prevention
  - Test performance benchmarks
  - _Requirements: 44.2, 44.3, 44.4, 44.6, 92.1_


### 36. Final Integration and User Acceptance

- [ ] 36.1 Conduct system integration testing
  - Test complete user workflows end-to-end
  - Test all API integrations (cloud storage, speech-to-text, WhatsApp)
  - Test database migrations and rollbacks
  - Test backup and restore procedures
  - Test disaster recovery plan
  - Verify all features working together
  - _Requirements: 46.4_

- [ ] 36.2 Conduct user acceptance testing
  - Deploy to staging environment
  - Invite beta users (Indian home bakers) for testing
  - Collect feedback on usability, features, performance
  - Test with real recipes, ingredients, and workflows
  - Verify Indian localization (INR, Hindi, Indian ingredients)
  - Verify mobile responsiveness on actual devices
  - _Requirements: 120.1, 120.2, 120.3, 120.4, 120.5, 120.6, 120.7_

- [ ] 36.3 Fix bugs and polish
  - Address all critical and high-priority bugs from testing
  - Improve UI/UX based on user feedback
  - Optimize performance bottlenecks
  - Improve error messages and help text
  - Add missing translations
  - Polish visual design and animations
  - _Requirements: 27.7, 42.2_

- [ ] 36.4 Create user documentation
  - Write user guide covering all features
  - Create video tutorials for key workflows
  - Document Indian-specific features (INR, Hindi, WhatsApp)
  - Create FAQ for common questions
  - Document troubleshooting steps
  - Translate documentation to Hindi
  - _Requirements: 120.5, 120.7_

- [ ] 36.5 Prepare for production launch
  - Finalize production environment configuration
  - Setup production database with backups
  - Configure production monitoring and alerting
  - Setup production logging and error tracking
  - Configure CDN for static assets
  - Setup SSL certificates
  - Configure domain and DNS
  - _Requirements: 45.2, 40.1, 58.1, 58.5_

- [ ] 36.6 Final checkpoint - Production ready
  - All features implemented and tested
  - All bugs fixed
  - User documentation complete
  - Production environment configured
  - Monitoring and alerting active
  - Backup and disaster recovery tested
  - Security audit passed
  - Performance benchmarks met
  - Ready for production launch
  - Ensure all tests pass, ask the user if questions arise.


## Notes

- **Implementation Language**: TypeScript for full-stack development (backend and frontend)
- **All tasks are required**: All test-related sub-tasks are now marked as required to ensure production quality and comprehensive test coverage
- **Each task references specific requirements**: Use requirement numbers to trace back to detailed acceptance criteria
- **Checkpoints ensure incremental validation**: Stop at each checkpoint to verify all tests pass and functionality works before proceeding
- **Property-based tests validate universal correctness**: 30 properties defined in design document, each tested with minimum 100 iterations
- **MVP focus for Indian home bakers**: Prioritizes inventory management, cost tracking, pricing calculators, social media tools, and Indian localization

## Implementation Strategy

1. **Bottom-up approach**: Start with database layer, then middleware, then backend API, then frontend
2. **Incremental development**: Each task builds on previous tasks with clear dependencies
3. **Test-driven development**: Write tests alongside implementation for high confidence
4. **Continuous integration**: Run tests on every commit to catch issues early
5. **User feedback loops**: Conduct user testing at checkpoints to validate features

## Key Milestones

- **Milestone 1 (Tasks 1-5)**: Database layer complete with schema, migrations, seed data
- **Milestone 2 (Tasks 6-10)**: Backend infrastructure and middleware complete with all business logic
- **Milestone 3 (Tasks 11-19)**: Backend API complete with all endpoints and documentation
- **Milestone 4 (Tasks 20-30)**: Frontend application complete with all pages and features
- **Milestone 5 (Tasks 31-32)**: External integrations and comprehensive testing complete
- **Milestone 6 (Tasks 33-36)**: Deployment, security, and production readiness complete

## Technology Stack Summary

- **Database**: PostgreSQL 15+ with extensions (uuid-ossp, pgcrypto, pg_trgm)
- **Backend**: Node.js + Express + TypeScript
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **State Management**: Zustand + React Query
- **Testing**: Jest + fast-check + React Testing Library + Playwright
- **Deployment**: Docker + Kubernetes
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana
- **Cloud Services**: AWS S3/Cloudflare R2 (storage), Google Cloud Speech-to-Text/OpenAI Whisper (transcription), WhatsApp Business API

## Estimated Effort

- **Database Layer**: 2-3 weeks
- **Middleware Layer**: 2-3 weeks
- **Backend API**: 4-5 weeks
- **Frontend Application**: 6-8 weeks
- **Testing & Integration**: 2-3 weeks
- **Deployment & DevOps**: 1-2 weeks
- **Total**: 17-24 weeks (4-6 months) for complete implementation

This is a comprehensive, production-ready implementation plan covering all 120 requirements with proper testing, security, performance optimization, and deployment automation.

