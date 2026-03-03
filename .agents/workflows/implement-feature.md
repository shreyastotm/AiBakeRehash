---
description: Standard implementation workflow for any AiBake feature task
---

# AiBake Feature Implementation Workflow

This workflow is followed automatically for every implementation task in AiBake. It incorporates all steering document rules and hook checks inline so no manual invocation is needed.

## Phase 1 — Context Load (Before Writing Any Code)

Before implementing, read the relevant steering documents silently:

- `product.md` — domain rules (hydration formula, pricing formula, scaling warnings, etc.)
- `structure.md` — layer boundaries (controller → service → middleware, no cross-layer imports)
- `coding-standards.md` — TypeScript rules, INR utility, JSDoc requirements
- `security-guidelines.md` — user_id isolation, parameterized queries, secrets policy
- `api-design.md` — if writing backend routes or controllers
- `database-conventions.md` — if writing SQL migrations or DB functions
- `testing-strategy.md` — test requirements for the layer being implemented
- `indian-localization.md` — if writing frontend components with text or currency

## Phase 2 — Implementation (Writing Code)

Apply rules from steering documents while writing:

**Architecture check (from `structure.md` + `coding-standards.md`):**
- [ ] Controllers contain only HTTP logic — all business logic delegated to services
- [ ] Middleware modules are pure functions — no DB calls inside `middleware/src/`
- [ ] No `any` TypeScript type — use specific types or `unknown`
- [ ] All exported functions have explicit return types
- [ ] Zod used for runtime validation at API boundaries

**Security check (from `security-guidelines.md`):**
- [ ] Every user-data DB query includes `WHERE user_id = $N`
- [ ] All SQL uses parameterized queries only — no string concatenation
- [ ] No secrets, API keys, or passwords in source code
- [ ] Rate limiting applied to auth endpoints
- [ ] Input ranges validated (costs ≥ 0, margin 0–99%, water activity 0–1)

**Domain formula check (from `product.md`):**
- [ ] Hydration = `(liquid_weight / flour_weight) × 100`, null when no flour
- [ ] Price = `cost / (1 - margin/100)`, rounded to nearest ₹
- [ ] Baking loss = `pre_bake - outcome`, expressed as %
- [ ] Scaling warnings generated for factor >3x or <0.25x
- [ ] All quantities in grams/ml canonical — display units stored separately

**INR / Localization check (from `indian-localization.md` + `coding-standards.md`):**
- [ ] Monetary values formatted via `currency.ts` utility only
- [ ] Monetary API responses include `"currency": "INR"`
- [ ] Dates formatted `DD/MM/YYYY` via `date.ts` utility
- [ ] All UI strings use `t()` — no hardcoded English in JSX
- [ ] New translation keys added to BOTH `en.json` AND `hi.json`

**API contract check (from `api-design.md`):**
- [ ] Routes follow `/api/v1/{resource}` pattern
- [ ] Response wrapped in `{ data }` or `{ data, meta }` or `{ error, message, statusCode }`
- [ ] List endpoints have pagination (`page`, `pageSize`, `total`)
- [ ] New endpoints documented in `docs/api/openapi.yaml`

**Naming check (from `coding-standards.md`):**
- [ ] Backend files: `kebab-case.ts` with role suffix (`.controller.ts`, `.service.ts`)
- [ ] React components: `PascalCase.tsx`
- [ ] Hooks: `useCamelCase.ts`
- [ ] DB tables: `snake_case` plural, columns: `snake_case`

## Phase 3 — Migration Safety (Only When Writing SQL)

Before finalizing any migration file:
- [ ] Filename uses next sequential number (`NN_description.sql`)
- [ ] Migration is wrapped in `BEGIN; ... COMMIT;`
- [ ] Paired rollback script created in `database/rollback/`
- [ ] Every new FK column has an index (`CREATE INDEX idx_{table}_{col}`)
- [ ] New tables include `id UUID`, `created_at`, `updated_at`
- [ ] Monetary columns use `NUMERIC(12,2)` with INR comment
- [ ] Destructive changes (DROP, ALTER type) have explanation comment

## Phase 4 — Test Creation

After implementing code, create the corresponding tests:

**For middleware calculator/converter files:**
- [ ] Unit tests: `middleware/tests/unit/{module}.test.ts`
- [ ] Property tests: `middleware/tests/property/{module}.property.test.ts`
- [ ] Property tests use `fast-check` with `numRuns: 100` minimum
- [ ] Cover all properties from the 30-property catalogue in `testing-strategy.md`

**For backend service/controller files:**
- [ ] Unit tests: `backend/tests/unit/{name}.test.ts`
- [ ] Integration tests: `backend/tests/integration/{name}.test.ts`
- [ ] Every API endpoint covered by at least one integration test

**For React components:**
- [ ] Component tests: `frontend/tests/unit/{ComponentName}.test.tsx`
- [ ] Tests use React Testing Library
- [ ] Cover: renders correctly, user interactions, error/empty states

## Phase 5 — Code Review Before Presenting

Self-review the completed code before submitting:

- [ ] No N+1 query patterns (DB calls inside loops)
- [ ] No missing error handling on async functions
- [ ] JSDoc on all exported functions
- [ ] No functions longer than ~50 lines without good reason
- [ ] No magic numbers — use named constants
- [ ] Redis caching suggested for expensive deterministic calculations (nutrition, search)
- [ ] Performance targets respected: scaling <50ms, nutrition <100ms, search <200ms

## Quick Reference — Layer Rules

```
Request → Route → Controller → Service → DB
                       ↓
                  Middleware (pure calculators — no DB)

Frontend → API only (never import backend or middleware directly)
```

## Running Verification Commands

```bash
# After implementing backend
cd backend && npm run type-check && npm run lint && npm test

# After implementing middleware
cd middleware && npm run type-check && npm test

# After implementing frontend
cd frontend && npm run type-check && npm run lint && npm test
```
