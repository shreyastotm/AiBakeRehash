# Testing Strategy

AiBake requires comprehensive, layered testing. This document defines the testing approach, directory structure, coverage targets, and the catalogue of 30 required property-based tests.

## Testing Framework Stack

| Framework | Purpose | Packages |
|-----------|---------|----------|
| **Vitest** | Unit & integration tests (backend, middleware) | `vitest`, `@vitest/coverage-v8` |
| **fast-check** | Property-based tests | `fast-check` |
| **React Testing Library** | Component tests (frontend) | `@testing-library/react` |
| **Playwright** | End-to-end tests | `@playwright/test` |

> Note: The backend uses **Vitest** (confirmed by `backend/vitest.config.ts`), not Jest.

## Coverage Targets

| Layer | Minimum Coverage |
|-------|----------------|
| `middleware/src/` | **>90%** (business logic — highest priority) |
| `backend/src/` | **>80%** |
| `frontend/src/` | **>80%** |

CI pipeline must fail if coverage drops below these thresholds.

## Test Layer Responsibilities

### 1. Unit Tests (`tests/unit/`)

Test pure functions and isolated modules in isolation.

- **Who**: All middleware modules, utility functions, helper functions
- **Database**: No database — mock or stub if needed
- **Speed**: Must run in <5 seconds total per module
- **Examples**:
  - `unitConverter.test.ts` — all conversion paths
  - `pricingCalculator.test.ts` — formula edge cases
  - `currency.test.ts` — INR formatting edge cases

### 2. Property-Based Tests (`tests/property/`)

Validate mathematical invariants and universal correctness using **fast-check** with **minimum 100 iterations** per property.

- **Who**: All middleware calculation modules (converters, calculators, scalers)
- **Database**: No database
- See the **30 Property Catalogue** below

### 3. Integration Tests (`tests/integration/`)

Test API endpoints against a real test database. Each test runs inside a transaction that is **rolled back** after the test.

- **Who**: All backend controllers and services
- **Setup**: Dedicated test database seeded via `tests/fixtures/`
- **Coverage**: Every API endpoint must have at least one integration test

### 4. Component Tests (`frontend/tests/unit/`)

Test React components in isolation using React Testing Library.

- **Who**: All components in `frontend/src/components/` and pages in `frontend/src/pages/`
- **Approach**: Render → interact → assert DOM state
- **No**: No snapshot tests — behavior tests only

### 5. End-to-End Tests (`frontend/tests/e2e/`)

Playwright tests covering critical user workflows. Must run against a fully running local stack.

**5 Required E2E Workflows:**
1. **User Registration & Login** — register, verify, login, set preferences, view dashboard
2. **Create & Scale Recipe** — login, create recipe with ingredients/steps, scale 2x, verify quantities and nutrition
3. **Log Bake with Inventory Deduction** — add inventory, create recipe, log bake, verify inventory updated and alerts created
4. **Calculate Cost & Pricing** — create recipe, add inventory with costs, calculate total cost + overhead, set 40% margin, verify suggested price
5. **Export Recipe Card** — create recipe, export as Instagram post, verify image generated and downloadable

## Test Fixtures and Utilities

Located in `tests/fixtures/`:
- **Factory functions**: generate test data without hardcoded UUIDs (`createUser()`, `createRecipe()`, `createIngredient()`)
- **Mock services**: mock cloud storage, speech-to-text, WhatsApp API
- **Database helpers**: `setupTestDb()`, `teardownTestDb()`, `seedTestData()`
- **No shared mutable state** between tests — each test is independent

## Performance Benchmarks (CI Enforced)

| Operation | Target |
|-----------|--------|
| Recipe scaling | <50ms |
| Nutrition calculation | <100ms |
| Ingredient fuzzy search | <200ms |
| API GET endpoints | <200ms |
| API POST endpoints | <500ms |

Benchmark tests live in `tests/benchmarks/` and are measured in CI.

---

## 30 Property-Based Test Catalogue

All properties use fast-check with `fc.check(() => ..., { numRuns: 100 })` minimum.

### Unit Conversion Properties (middleware/unitConverter)

| # | Property | Validates |
|---|---------|-----------|
| 1 | **Round-trip**: converting volume→weight→volume yields original ±0.1% | Req 19.4 |
| 2 | **Unit equivalence**: 1 kg = 1000g, 1 L = 1000ml | Req 19.1 |
| 3 | **Density linearity**: converting 2× quantity yields 2× grams | Req 19.2 |
| 4 | **Missing density throws**: `MissingDensityError` when density is null | Req 19.5 |
| 5 | **Invalid unit throws**: `InvalidUnitError` for unknown unit strings | Req 19.5 |

### Recipe Scaling Properties (middleware/recipeScaler)

| # | Property | Validates |
|---|---------|-----------|
| 6 | **Proportionality**: all ingredients scale by same factor (ratios preserved) | Req 20.2 |
| 7 | **Scale identity**: scaling by 1.0 returns identical recipe | Req 20.1 |
| 8 | **Scale commutativity**: scale(2x) then scale(0.5x) = original | Req 20.3 |
| 9 | **Large factor warning**: factor >3x produces warning in result | Req 82.4 |
| 10 | **Small factor warning**: factor <0.25x produces warning in result | Req 82.4 |

### Nutrition Calculation Properties (middleware/nutritionCalculator)

| # | Property | Validates |
|---|---------|-----------|
| 11 | **Additivity**: total nutrition = Σ(ingredient_nutrition × quantity_factor) | Req 67.5 |
| 12 | **Per-serving consistency**: per_serving × servings = total | Req 13.5 |
| 13 | **Per-100g consistency**: per_100g × (total_weight/100) = total | Req 20.5 |
| 14 | **Missing data graceful**: skips ingredients without nutrition data | Req 67.4 |

### Hydration Calculation Properties (middleware/hydrationCalculator)

| # | Property | Validates |
|---|---------|-----------|
| 15 | **Formula correctness**: hydration = (liquid_weight / flour_weight) × 100 ±0.01% | Req 16.5, 48.4 |
| 16 | **Zero flour**: returns null (not 0 or Infinity) when no flour | Req 48.4 |
| 17 | **Zero liquid**: returns 0% when flour > 0 and liquid = 0 | Req 16.5 |

### Cost Calculation Properties (middleware/costCalculator)

| # | Property | Validates |
|---|---------|-----------|
| 18 | **Cost additivity**: total ingredient cost = Σ(quantity × cost_per_unit) | Req 104.1 |
| 19 | **Zero cost components**: total = ingredient_cost when overhead/packaging/labor = 0 | Req 104.3 |
| 20 | **Missing inventory throws**: `MissingInventoryDataError` for unlisted ingredient | Req 104.6 |

### Pricing Calculation Properties (middleware/pricingCalculator)

| # | Property | Validates |
|---|---------|-----------|
| 21 | **Formula correctness**: price = cost / (1 - margin/100) ±0.01% | Req 105.2 |
| 22 | **Actual margin**: (price - cost) / price × 100 = target_margin ±0.01% | Req 105.3 |
| 23 | **INR rounding**: price is always integer (rounded to nearest rupee) | Req 105.4 |
| 24 | **Invalid margin throws**: margin ≥100% throws error | Req 105.1 |

### Inventory Properties (middleware/inventoryManager)

| # | Property | Validates |
|---|---------|-----------|
| 25 | **Deduction correctness**: new_qty = old_qty - deducted_qty | Req 103.1 |
| 26 | **Insufficient stock warning**: warning generated when recipe_qty > inventory_qty | Req 103.6 |
| 27 | **Quantity balance**: current_qty = Σ(purchases) - Σ(deductions) | Req 101.7 |
| 28 | **Low-stock alert**: alert created when qty < min_stock_level after deduction | Req 102.3 |

### Fuzzy Search Properties (middleware/searchEngine)

| # | Property | Validates |
|---|---------|-----------|
| 29 | **Ranking order**: results sorted by similarity score descending | Req 17.6, 48.1 |
| 30 | **Exact match priority**: exact name match ranked >= partial match | Req 4.7 |

---

## Running Tests

```bash
# All tests
npm test

# Per layer
cd middleware && npm test              # unit + property tests
cd backend && npm test                 # unit + integration tests
cd frontend && npm test               # component tests
cd frontend && npx playwright test    # E2E tests

# Coverage
cd backend && npm run test:coverage
cd middleware && npm run test:coverage

# Benchmarks
cd middleware && npm run test:bench
```
