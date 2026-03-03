# Coding Standards

This document defines the coding standards and patterns for AiBake. All contributors and AI agents must follow these conventions.

## TypeScript Rules

- **Strict mode is mandatory.** `tsconfig.json` must have `"strict": true` in all packages.
- **No `any` type.** Use `unknown` and narrow with type guards. Use `never` for exhaustive checks.
- **All exported functions must have explicit return types.** Inference is acceptable for private/inline expressions.
- **Use Zod for runtime validation** at API entry points (controllers). Do not trust raw `req.body`.
- **Avoid type assertions (`as`)** unless you have a documented reason. Prefer type guards.
- **Enums**: prefer `const` enums or string literal unions over TypeScript `enum` (avoids runtime artifacts).
- **Interface vs Type**: use `interface` for object shapes that may be extended; use `type` for unions, intersections, and aliases.

```typescript
// ✅ Good
function calculateHydration(recipe: Recipe): number | null { ... }

// ❌ Bad
function calculateHydration(recipe: any) { ... }
```

## Backend Patterns

### Controller → Service → Database

Controllers handle HTTP concerns only (parse request, call service, format response). Business logic belongs in services. Database access belongs in services or a dedicated db module.

```typescript
// ✅ Good — controller delegates to service
export async function scaleRecipe(req: Request, res: Response) {
  const scaled = await recipeService.scale(req.params.id, req.body);
  res.json({ data: scaled });
}

// ❌ Bad — business logic in controller
export async function scaleRecipe(req: Request, res: Response) {
  const factor = req.body.targetYield / recipe.yieldWeightGrams; // business logic!
  ...
}
```

### Middleware Layer is Pure

Files in `middleware/src/` (unitConverter, recipeScaler, costCalculator, etc.) must:
- Accept data as function arguments — **no direct database access**
- Return computed results or throw typed errors
- Be testable without a database connection

### Parameterized Queries Only

No string concatenation or template literals in SQL. Always use `$1, $2, ...` placeholders.

```typescript
// ✅ Good
const result = await db.query('SELECT * FROM recipes WHERE user_id = $1', [userId]);

// ❌ Bad — SQL injection risk
const result = await db.query(`SELECT * FROM recipes WHERE user_id = '${userId}'`);
```

### Error Handling

Use typed error classes for domain errors. All errors must be caught and transformed by `errorHandler.middleware.ts`.

```typescript
// Typed error classes (define in backend/src/utils/errors.ts)
class MissingDensityError extends Error { constructor(ingredientId: string) { super(`Density missing for ${ingredientId}`); } }
class MissingInventoryDataError extends Error { ... }
class InvalidUnitError extends Error { ... }
```

API error response shape — always consistent:
```json
{
  "error": "MISSING_DENSITY",
  "message": "Density data not found for ingredient: maida",
  "statusCode": 422,
  "details": []
}
```

## Frontend (React) Patterns

- **Functional components only.** No class components.
- **Custom hooks** go in `src/hooks/` and must be named with `use` prefix (e.g., `useRecipes`, `useInventory`).
- **State management**: Zustand for global state; React Query (TanStack Query) for server state. Do not use `useState` for data that comes from the API.
- **No inline styles.** Use Tailwind CSS classes or CSS modules.
- **No `dangerouslySetInnerHTML`.** React escapes by default — preserve this protection.
- **All form validation** uses `react-hook-form`. No manual onChange validation plumbing.
- **Touch targets**: all interactive elements must be minimum 44×44px (baking mode — users have floury hands).

## Currency (INR)

All monetary values must be processed and displayed through `currency.ts` utilities:

```typescript
// Always use the utility — never format INR ad-hoc
import { formatINR, parseINR } from '../utils/currency';

formatINR(1234.5)  // → "₹1,234.50"  (Indian number system)
```

- Store monetary values as `NUMERIC(12,2)` in the database (full rupees, 2 decimal places).
- Round suggested prices to the nearest rupee using `Math.round()`.
- All API responses that include cost/price fields must include `"currency": "INR"`.

## Dates

- **Database storage**: ISO 8601 UTC (`TIMESTAMPTZ`)
- **Display format**: `DD/MM/YYYY` (Indian convention) via `date.ts` utility
- **Time zone**: Indian Standard Time (IST, UTC+5:30) for user-facing display

```typescript
import { formatDisplayDate } from '../utils/date';
formatDisplayDate(isoString) // → "28/02/2026"
```

## Comments and Documentation

- **JSDoc on all exported functions** with `@param`, `@returns`, and a one-line description.
- **Inline comments for formulas** — explain the mathematical derivation, not just the code.

```typescript
/**
 * Calculates suggested selling price using markup pricing formula.
 * @param totalCost - Total production cost in INR
 * @param targetMarginPercent - Desired profit margin (0–99)
 * @returns Suggested price rounded to nearest ₹
 */
export function calculatePrice(totalCost: number, targetMarginPercent: number): number {
  // Price = Cost / (1 - margin/100)
  // This ensures actual_margin = (price - cost) / price × 100 equals targetMarginPercent
  return Math.round(totalCost / (1 - targetMarginPercent / 100));
}
```

## Import Order

Enforce consistent import ordering (via ESLint `import/order`):
1. Node built-ins (`path`, `fs`)
2. External packages (`express`, `react`, `zod`)
3. Internal aliases (`@/utils`, `@/types`)
4. Relative imports (`./service`, `../models`)

## File Naming Quick Reference

| Pattern | Convention | Example |
|---------|-----------|---------|
| Backend source files | `kebab-case` | `unit-converter.ts` |
| React components | `PascalCase` | `RecipeCard.tsx` |
| Test files | match source + `.test.ts` | `unit-converter.test.ts` |
| Hooks | `camelCase` + `use` prefix | `useRecipes.ts` |
| Zustand stores | `camelCase` + `Store` | `recipeStore.ts` |
| DB migrations | `NN_description.sql` | `05_add_packaging.sql` |
| Routes | `*.routes.ts` | `recipe.routes.ts` |
| Controllers | `*.controller.ts` | `recipe.controller.ts` |
| Services | `*.service.ts` | `recipe.service.ts` |
| Models/Interfaces | `*.model.ts` | `recipe.model.ts` |
