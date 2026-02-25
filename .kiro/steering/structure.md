# Project Structure

## Directory Organization

```
aibake/
├── database/          # Database migrations, functions, triggers, seed data
├── backend/           # Node.js/Express API server with TypeScript
├── frontend/          # React application with TypeScript
├── middleware/        # Business logic layer (conversions, calculations, validations)
├── agent-hooks/       # Automated scripts for code quality
├── scripts/           # Utility scripts (setup.sh, setup.ps1)
├── AiBakeKickstart/   # Database setup guides and SQL scripts
├── .kiro/             # Kiro configuration
│   ├── specs/         # Feature specifications
│   ├── steering/      # Project steering rules
│   └── hooks/         # Agent hooks
└── docs/              # Documentation (API, architecture, user guides)
```

## Architecture Layers

### Frontend Layer
- React components with TypeScript
- Tailwind CSS for styling
- PWA capabilities for mobile
- Hands-free baking mode UI

### Backend Layer
- Express API with TypeScript
- Service modules: Auth, Recipe, Inventory, Costing, Social
- RESTful API endpoints
- JWT authentication middleware

### Middleware Layer
- Unit conversion engine
- Recipe scaling logic
- Nutrition calculator
- Hydration calculator
- Search engine

### Data Layer
- PostgreSQL for relational data
- Redis for caching
- Cloud storage for media files

## Key Conventions

### Database
- All quantities stored in grams (canonical format)
- Original display units preserved for UI
- Full-text search enabled on recipes
- Fuzzy search on ingredients using pg_trgm

### Code Organization
- TypeScript for type safety
- Service-based architecture in backend
- Component-based architecture in frontend
- Shared types between frontend and backend

### File Naming
- Use kebab-case for directories and files
- TypeScript files: `.ts` for backend, `.tsx` for React components
- Test files: `*.test.ts` or `*.spec.ts`

## Database Schema

15 core tables:
- `users` - User accounts
- `ingredient_master` - Global ingredient database (70+ entries)
- `recipes` - Recipe master records
- `recipe_ingredients` - Ingredients per recipe
- `recipe_sections` - Prep, bake, rest sections
- `recipe_steps` - Individual instructions
- `recipe_versions` - Version history
- `recipe_version_snapshots` - Full snapshots
- `recipe_journal_entries` - Baking journal with photos
- `recipe_audio_notes` - Voice notes with transcription
- `ingredient_substitutions` - Substitution rules
- `timer_instances` - Active/completed timers
- `recipe_nutrition_cache` - Calculated nutrition
- `common_issues` - Emergency help database

## Setup Files

Located in `AiBakeKickstart/`:
- `00_SETUP_GUIDE.md` - Complete setup instructions
- `01_schema_init.sql` - Database schema initialization
- `02_seed_data.sql` - Seed data (70+ ingredients)
- `03_test_data.sql` - Test data for development
- `04_schema_enhancements.sql` - Additional schema features
