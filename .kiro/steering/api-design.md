# API Design Conventions

All AiBake API endpoints follow these conventions. Deviations require explicit justification and documentation.

## Base URL and Versioning

- All routes: `/api/v1/{resource}`
- Version is part of the URL path — never use headers for versioning
- Breaking changes require a new version prefix (`/api/v2/`)
- Non-breaking additions (new optional fields, new endpoints) do not require a version bump

## HTTP Methods

| Method | Usage |
|--------|-------|
| `GET` | Read data (idempotent, no side effects) |
| `POST` | Create a resource or trigger an action |
| `PATCH` | Partial update of a resource |
| `PUT` | Full replacement (use sparingly; prefer PATCH) |
| `DELETE` | Remove a resource |

## Route Patterns

```
GET    /api/v1/recipes              → list all user recipes
GET    /api/v1/recipes/:id          → get single recipe
POST   /api/v1/recipes              → create recipe
PATCH  /api/v1/recipes/:id          → update recipe
DELETE /api/v1/recipes/:id          → delete recipe

# Sub-resources
GET    /api/v1/recipes/:id/journal  → recipe journal entries
POST   /api/v1/recipes/:id/journal  → add journal entry
POST   /api/v1/recipes/:id/scale    → trigger scaling (returns scaled recipe, does not save)
POST   /api/v1/recipes/:id/cost/calculate → calculate cost
```

## Authentication

All protected endpoints require:
```
Authorization: Bearer <jwt-token>
```

- JWT expiry: 24 hours
- Refresh via: `POST /api/v1/auth/refresh`
- Logout via: `POST /api/v1/auth/logout` (blacklists token)

**Every protected endpoint must validate user ownership** — never return or modify another user's data.

## Request Validation

- Use `express-validator` to validate all request fields
- Reject on first error (fail-fast)
- Return `400 Bad Request` with validation details for invalid input
- All numeric fields must include range constraints (min/max)

## Response Envelope

### Success — Single Resource
```json
{
  "data": { ... }
}
```

### Success — List (Paginated)
```json
{
  "data": [ ... ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 143,
    "totalPages": 8
  }
}
```

### Error
```json
{
  "error": "RECIPE_NOT_FOUND",
  "message": "Recipe with id '...' not found or does not belong to you",
  "statusCode": 404,
  "details": []
}
```

**Rules:**
- `error`: machine-readable error code in `UPPER_SNAKE_CASE`
- `message`: human-readable description safe to show in UI
- `statusCode`: matches the HTTP status code
- `details`: array of field-level validation errors (empty array if none)

## Standard Error Codes

| HTTP | Code | When |
|------|------|------|
| 400 | `VALIDATION_ERROR` | Invalid request body/params |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Valid JWT but wrong user |
| 404 | `NOT_FOUND` | Resource doesn't exist |
| 409 | `CONFLICT` | Duplicate resource (e.g., duplicate email) |
| 422 | `MISSING_DENSITY` | Ingredient density not available |
| 422 | `MISSING_INVENTORY_DATA` | Ingredient not in inventory |
| 422 | `INVALID_MARGIN` | Profit margin ≥ 100% |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## Pagination

All list endpoints support pagination via query params:
```
GET /api/v1/recipes?page=1&pageSize=20&sortBy=created_at&sortOrder=desc
```

| Param | Default | Max |
|-------|---------|-----|
| `page` | 1 | — |
| `pageSize` | 20 | 100 |
| `sortOrder` | `desc` | — |

## Filtering and Searching

```
GET /api/v1/recipes?status=published&sourceType=original&q=chocolate
GET /api/v1/ingredients/search?q=maida&limit=10
```

- `q` is the free-text search parameter
- Filters are AND-combined unless documented otherwise
- Fuzzy ingredient search uses `search_ingredient()` PostgreSQL function (pg_trgm)

## Currency Fields

Any endpoint returning cost, price, or monetary values must include:
```json
{
  "totalCost": 125.50,
  "currency": "INR",
  "costPerServing": 31.38,
  "suggestedPrice": 200
}
```

- `currency` field is always `"INR"` (future-proofing for multi-currency)
- Monetary numbers are stored and returned as decimals (not paise)
- Suggested prices are integers (rounded to nearest rupee)

## Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `POST /auth/login` | 5 failed attempts per 15 minutes per IP |
| All other endpoints | 100 req/min per user |
| Image/audio upload | 10 req/min per user |

## No Stack Traces in Production

`errorHandler.middleware.ts` must:
- Log full error server-side (with stack trace)
- Return only `error`, `message`, `statusCode`, `details` to client — no stack traces

## OpenAPI Documentation

Every new endpoint must be documented in `docs/api/openapi.yaml`:
- Request body schema
- Query parameters
- Response schemas (success and error)
- Authentication requirement
- Example request and response

Swagger UI is served at `GET /api/docs` in development.
