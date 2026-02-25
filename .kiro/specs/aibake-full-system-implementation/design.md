# Design Document: AiBake Full System Implementation

## Overview

AiBake is a professional-grade baking recipe management platform specifically designed for Indian home bakers and small-scale baking businesses. The system provides comprehensive recipe management, ingredient tracking, unit conversion, recipe scaling, baking journal, inventory management, product costing, pricing calculators, and social media integration optimized for the Indian market.

### System Purpose

The AiBake system addresses the unique needs of Indian home bakers by providing:

1. **Recipe Management**: Create, version, and scale recipes with precise ingredient tracking
2. **Inventory Management**: Track ingredient stock, costs, expiration dates with automated deductions
3. **Product Costing & Pricing**: Calculate recipe costs including overhead, packaging, and delivery charges with profit margin analysis
4. **Social Media Integration**: Export recipe cards and journal entries optimized for Instagram and WhatsApp
5. **Indian Market Localization**: INR currency, Hindi/English bilingual interface, Indian ingredients and measurement units
6. **Hands-Free Baking**: Screen wake lock, large touch controls, and voice commands for timer management
7. **Advanced Baking Features**: Water activity tracking, hydration loss calculation, ingredient aliases, and composite ingredients

### Key Design Principles

1. **Separation of Concerns**: Clear boundaries between database, backend API, middleware business logic, and frontend presentation
2. **Data Integrity**: All calculations use canonical grams; display units preserved for user experience
3. **Scalability**: Horizontal scaling support for backend services with connection pooling and caching
4. **Localization-First**: Indian market features integrated throughout, not bolted on
5. **Mobile-First**: Responsive design optimized for mobile devices with touch-friendly controls
6. **Testability**: Property-based testing for mathematical operations, unit tests for business logic
7. **Progressive Enhancement**: Core features work offline; advanced features enhance experience when available

### Technology Stack

- **Database**: PostgreSQL 15+ with extensions (uuid-ossp, pgcrypto, pg_trgm)
- **Backend**: Node.js/Express or Python/FastAPI with RESTful API architecture
- **Frontend**: React or Vue.js with responsive design and PWA capabilities
- **Middleware**: Business logic layer for conversions, calculations, and validations
- **Storage**: Cloud storage (AWS S3/Cloudflare R2) for images and audio files
- **Authentication**: JWT-based authentication with bcrypt password hashing
- **Deployment**: Docker containers with Kubernetes orchestration

## Architecture

### High-Level System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Browser]
        MOBILE[Mobile Browser/PWA]
    end
    
    subgraph "Frontend Application"
        UI[React/Vue UI Components]
        STATE[State Management]
        API_CLIENT[API Client]
        CACHE[Local Storage/Cache]
    end
    
    subgraph "Backend Services"
        API[API Gateway/Load Balancer]
        AUTH[Authentication Service]
        RECIPE[Recipe Service]
        INVENTORY[Inventory Service]
        COSTING[Costing Service]
        SOCIAL[Social Media Service]
    end
    
    subgraph "Middleware Layer"
        CONVERTER[Unit Converter]
        SCALER[Recipe Scaler]
        NUTRITION[Nutrition Calculator]
        HYDRATION[Hydration Calculator]
        SEARCH[Fuzzy Search Engine]
    end
    
    subgraph "Data Layer"
        DB[(PostgreSQL Database)]
        STORAGE[Cloud Storage]
        CACHE_DB[(Redis Cache)]
    end
    
    subgraph "External Services"
        WHATSAPP[WhatsApp Business API]
        TRANSCRIBE[Speech-to-Text Service]
        IMAGE_GEN[Image Generation Service]
    end
    
    WEB --> UI
    MOBILE --> UI
    UI --> STATE
    STATE --> API_CLIENT
    API_CLIENT --> API
    
    API --> AUTH
    API --> RECIPE
    API --> INVENTORY
    API --> COSTING
    API --> SOCIAL
    
    RECIPE --> CONVERTER
    RECIPE --> SCALER
    RECIPE --> NUTRITION
    RECIPE --> HYDRATION
    RECIPE --> SEARCH
    
    RECIPE --> DB
    INVENTORY --> DB
    COSTING --> DB
    AUTH --> DB
    
    RECIPE --> CACHE_DB
    INVENTORY --> CACHE_DB
    
    RECIPE --> STORAGE
    SOCIAL --> STORAGE
    
    SOCIAL --> WHATSAPP
    RECIPE --> TRANSCRIBE
    SOCIAL --> IMAGE_GEN
```

### Component Responsibilities

#### Frontend Application
- **UI Components**: Reusable React/Vue components for forms, lists, cards, and specialized recipe interfaces
- **State Management**: Centralized state using Redux/Vuex for global application state
- **API Client**: Axios-based HTTP client with request/response interceptors for authentication and error handling
- **Local Cache**: IndexedDB for offline recipe access and form auto-save

#### Backend Services

**API Gateway/Load Balancer**
- Route requests to appropriate services
- Rate limiting and request throttling
- CORS handling and security headers
- Health check aggregation

**Authentication Service**
- User registration and login
- JWT token generation and validation
- Password hashing with bcrypt
- Session management

**Recipe Service**
- Recipe CRUD operations
- Recipe versioning and snapshots
- Recipe scaling and unit conversion
- Ingredient management
- Baking journal entries
- Audio note transcription

**Inventory Service**
- Inventory item tracking
- Stock level monitoring
- Low stock alerts
- Purchase tracking
- Supplier management
- Automatic inventory deduction on bake logging

**Costing Service**
- Recipe cost calculation
- Overhead cost management
- Pricing calculator with profit margins
- Bulk pricing support
- Cost history tracking
- Delivery charge calculation

**Social Media Service**
- Recipe card image generation
- Journal entry sharing
- WhatsApp message formatting
- Instagram story/post format export
- Watermark application

#### Middleware Layer

**Unit Converter**
- Volume to weight conversion using ingredient densities
- Support for metric, imperial, and Indian measurement units
- Preservation of original display units

**Recipe Scaler**
- Proportional ingredient scaling
- Validation of scaling factors
- Nutrition recalculation after scaling

**Nutrition Calculator**
- Aggregate ingredient nutrition data
- Calculate per-serving and per-100g nutrition
- Cache results for performance

**Hydration Calculator**
- Calculate baker's percentage (water-to-flour ratio)
- Track hydration loss during baking
- Provide hydration recommendations

**Fuzzy Search Engine**
- Trigram-based fuzzy matching
- Search across canonical names and aliases
- Ranked results by similarity score

### Data Flow Patterns

#### Recipe Creation Flow
1. User enters recipe details in frontend form
2. Frontend validates required fields and data types
3. API client sends POST request to Recipe Service
4. Recipe Service validates business rules (at least one ingredient, positive quantities)
5. Middleware converts all ingredient quantities to canonical grams
6. Recipe Service creates database transaction
7. Insert recipe record, ingredients, sections, and steps
8. Commit transaction or rollback on error
9. Nutrition Calculator queues cache calculation
10. Return created recipe with generated ID to frontend

#### Inventory Deduction Flow
1. User logs bake in journal with "deduct from inventory" option
2. Frontend displays confirmation dialog with ingredients to deduct
3. User confirms or adjusts quantities
4. API client sends POST request to Inventory Service
5. Inventory Service starts database transaction
6. Create journal entry record
7. For each ingredient, update inventory quantity
8. Check if quantity falls below minimum stock level
9. Create low stock alert if threshold crossed
10. Commit transaction
11. Return updated inventory status to frontend

#### Recipe Scaling Flow
1. User enters target yield or servings in scaling interface
2. Frontend calculates scaling factor (target / original)
3. Frontend displays preview of scaled quantities
4. User confirms scaling
5. API client sends POST request to Recipe Service
6. Recipe Scaler multiplies all ingredient quantities by scaling factor
7. Recipe Scaler validates scaled quantities are practical
8. Recipe Scaler warns if scaling factor exceeds safe limits (>3x or <0.25x)
9. Nutrition Calculator recalculates nutrition for scaled recipe
10. Return scaled recipe to frontend

### Security Architecture

#### Authentication & Authorization
- JWT tokens with 24-hour expiration
- Refresh token mechanism for extended sessions
- Password requirements: minimum 8 characters, mixed case, numbers
- Bcrypt hashing with 12 rounds
- Rate limiting: 5 failed login attempts per 15 minutes

#### Data Protection
- HTTPS/TLS 1.3 for all communications
- Database connection encryption
- Sensitive data (passwords, tokens) never logged
- User data isolation: all queries filtered by user_id
- SQL injection prevention through parameterized queries
- XSS prevention through input sanitization and output encoding
- CSRF protection using double-submit cookie pattern

#### API Security
- API key authentication for service-to-service communication
- Request signing for webhook callbacks
- CORS whitelist for allowed origins
- Content Security Policy headers
- Rate limiting per user and per IP
- Request size limits to prevent DoS

### Performance Architecture

#### Caching Strategy
- **Redis Cache**: Recipe nutrition calculations, ingredient search results, user preferences
- **Browser Cache**: Static assets (images, CSS, JS) with versioned URLs
- **Service Worker**: Offline recipe access and form data persistence
- **Database Query Cache**: PostgreSQL query result caching for read-heavy operations

#### Database Optimization
- Connection pooling: 20 connections per backend instance
- Read replicas for reporting and analytics queries
- Indexes on all foreign keys and frequently filtered columns
- Trigram indexes for fuzzy text search
- Partial indexes for active recipes and running timers
- Query optimization with EXPLAIN ANALYZE

#### Frontend Optimization
- Code splitting and lazy loading
- Image optimization: WebP format with fallbacks
- Debounced search inputs (300ms delay)
- Virtual scrolling for long lists
- Optimistic UI updates
- Progressive image loading

## Components and Interfaces

### Database Schema

The database consists of 15+ core tables organized into logical domains:

#### User Management Domain
- `users`: User accounts with authentication and preferences

#### Recipe Management Domain
- `recipes`: Recipe master records with metadata
- `recipe_ingredients`: Ingredients with quantities in canonical grams
- `recipe_sections`: Organizational sections (prep, bake, rest)
- `recipe_steps`: Individual instructions with timing and temperature
- `recipe_versions`: Version history tracking
- `recipe_version_snapshots`: Full JSON snapshots at each version

#### Ingredient Domain
- `ingredient_master`: Global ingredient database with nutrition and density
- `ingredient_aliases`: Alternative names and regional variations
- `ingredient_substitutions`: Substitution rules with impact warnings
- `composite_ingredients`: Complex ingredient blends
- `composite_ingredient_components`: Components of composite ingredients

#### Journal Domain
- `recipe_journal_entries`: Baking logs with photos, notes, and ratings
- `recipe_audio_notes`: Voice notes with transcription

#### Advanced Features Domain
- `water_activity_reference`: Water activity ranges for product categories
- `timer_instances`: Active and completed timers
- `recipe_nutrition_cache`: Cached nutrition calculations
- `common_issues`: Emergency help database

#### Inventory Domain (MVP Features)
- `inventory_items`: Ingredient stock tracking with costs and expiration
- `inventory_purchases`: Purchase history with supplier information
- `suppliers`: Supplier contact and pricing information

#### Costing Domain (MVP Features)
- `recipe_costs`: Historical cost tracking
- `packaging_items`: Packaging materials with costs
- `delivery_zones`: Delivery pricing by zone

### Database Schema Extensions for MVP Features

```sql
-- Inventory Management Tables
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ingredient_master_id UUID NOT NULL REFERENCES ingredient_master(id),
  quantity_on_hand NUMERIC(12,4) NOT NULL,
  unit TEXT NOT NULL,
  cost_per_unit NUMERIC(10,2),
  currency VARCHAR(3) DEFAULT 'INR',
  purchase_date DATE,
  expiration_date DATE,
  supplier_id UUID REFERENCES suppliers(id),
  min_stock_level NUMERIC(12,4),
  reorder_quantity NUMERIC(12,4),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE inventory_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ingredient_master_id UUID NOT NULL REFERENCES ingredient_master(id),
  quantity NUMERIC(12,4) NOT NULL,
  unit TEXT NOT NULL,
  cost NUMERIC(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  supplier_id UUID REFERENCES suppliers(id),
  invoice_number TEXT,
  purchase_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Costing and Pricing Tables
CREATE TABLE recipe_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_cost NUMERIC(10,2) NOT NULL,
  overhead_cost NUMERIC(10,2) DEFAULT 0,
  packaging_cost NUMERIC(10,2) DEFAULT 0,
  labor_cost NUMERIC(10,2) DEFAULT 0,
  total_cost NUMERIC(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  calculated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE packaging_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cost_per_unit NUMERIC(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  quantity_on_hand INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE delivery_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  zone_name TEXT NOT NULL,
  base_charge NUMERIC(10,2) NOT NULL,
  per_km_charge NUMERIC(10,2),
  free_delivery_threshold NUMERIC(10,2),
  currency VARCHAR(3) DEFAULT 'INR',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for MVP tables
CREATE INDEX idx_inventory_items_user ON inventory_items(user_id);
CREATE INDEX idx_inventory_items_ingredient ON inventory_items(ingredient_master_id);
CREATE INDEX idx_inventory_items_expiration ON inventory_items(expiration_date) 
  WHERE expiration_date IS NOT NULL;
CREATE INDEX idx_inventory_purchases_user ON inventory_purchases(user_id);
CREATE INDEX idx_suppliers_user ON suppliers(user_id);
CREATE INDEX idx_recipe_costs_recipe ON recipe_costs(recipe_id);
CREATE INDEX idx_packaging_items_user ON packaging_items(user_id);
CREATE INDEX idx_delivery_zones_user ON delivery_zones(user_id);
```

### API Endpoints

#### Authentication Endpoints

```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh
GET    /api/v1/users/me
PATCH  /api/v1/users/me
```

#### Recipe Endpoints

```
GET    /api/v1/recipes
GET    /api/v1/recipes/:id
POST   /api/v1/recipes
PATCH  /api/v1/recipes/:id
DELETE /api/v1/recipes/:id
POST   /api/v1/recipes/:id/scale
GET    /api/v1/recipes/:id/versions
POST   /api/v1/recipes/:id/versions
GET    /api/v1/recipes/:id/export
POST   /api/v1/recipes/import
```

#### Ingredient Endpoints

```
GET    /api/v1/ingredients
GET    /api/v1/ingredients/:id
POST   /api/v1/ingredients
GET    /api/v1/ingredients/search?q=:query
```

#### Journal Endpoints

```
GET    /api/v1/recipes/:id/journal
POST   /api/v1/recipes/:id/journal
PATCH  /api/v1/journal/:id
DELETE /api/v1/journal/:id
POST   /api/v1/journal/:id/images
POST   /api/v1/journal/:id/audio
```

#### Inventory Endpoints (MVP)

```
GET    /api/v1/inventory
GET    /api/v1/inventory/:id
POST   /api/v1/inventory
PATCH  /api/v1/inventory/:id
DELETE /api/v1/inventory/:id
GET    /api/v1/inventory/alerts
POST   /api/v1/inventory/purchases
GET    /api/v1/inventory/purchases
POST   /api/v1/inventory/deduct
GET    /api/v1/inventory/reports/usage
GET    /api/v1/inventory/reports/value
```

#### Supplier Endpoints (MVP)

```
GET    /api/v1/suppliers
GET    /api/v1/suppliers/:id
POST   /api/v1/suppliers
PATCH  /api/v1/suppliers/:id
DELETE /api/v1/suppliers/:id
GET    /api/v1/suppliers/:id/ingredients
```

#### Costing Endpoints (MVP)

```
GET    /api/v1/recipes/:id/cost
POST   /api/v1/recipes/:id/cost/calculate
GET    /api/v1/recipes/:id/cost/history
POST   /api/v1/recipes/:id/pricing
GET    /api/v1/costing/reports/profit-margins
GET    /api/v1/costing/reports/cost-trends
```

#### Social Media Endpoints (MVP)

```
POST   /api/v1/social/recipe-card
POST   /api/v1/social/journal-card
POST   /api/v1/social/whatsapp-format
GET    /api/v1/social/templates
```

### API Request/Response Examples

#### Create Recipe

**Request:**
```json
POST /api/v1/recipes
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "title": "Classic Chocolate Chip Cookies",
  "description": "Soft and chewy cookies with chocolate chips",
  "source_type": "manual",
  "servings": 24,
  "yield_weight_grams": 600,
  "preferred_unit_system": "metric",
  "status": "active",
  "ingredients": [
    {
      "ingredient_master_id": "uuid-for-all-purpose-flour",
      "display_name": "All-purpose flour",
      "quantity_original": 250,
      "unit_original": "grams",
      "position": 1
    },
    {
      "ingredient_master_id": "uuid-for-butter",
      "display_name": "Butter (softened)",
      "quantity_original": 113,
      "unit_original": "grams",
      "position": 2
    }
  ],
  "sections": [
    {
      "type": "prep",
      "title": "Prepare Dough",
      "position": 1,
      "steps": [
        {
          "instruction": "Cream butter and sugar until light and fluffy",
          "duration_seconds": 180,
          "position": 1
        }
      ]
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "recipe-uuid",
    "title": "Classic Chocolate Chip Cookies",
    "user_id": "user-uuid",
    "servings": 24,
    "yield_weight_grams": 600,
    "status": "active",
    "created_at": "2024-01-15T10:30:00Z",
    "ingredients": [...],
    "sections": [...]
  }
}
```

#### Calculate Recipe Cost

**Request:**
```json
POST /api/v1/recipes/:id/cost/calculate
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "overhead_cost": 50.00,
  "packaging_cost": 25.00,
  "labor_cost": 100.00,
  "currency": "INR"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recipe_id": "recipe-uuid",
    "ingredient_cost": 245.50,
    "overhead_cost": 50.00,
    "packaging_cost": 25.00,
    "labor_cost": 100.00,
    "total_cost": 420.50,
    "cost_per_serving": 17.52,
    "cost_per_100g": 70.08,
    "currency": "INR",
    "breakdown": [
      {
        "ingredient": "All-purpose flour",
        "quantity_grams": 250,
        "cost_per_unit": 0.40,
        "total_cost": 100.00
      }
    ]
  }
}
```

## Data Models

### Core Data Models

#### User Model
```typescript
interface User {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  unit_preferences: {
    [ingredient_id: string]: string; // e.g., {"sugar": "cups"}
  };
  default_currency: string; // "INR"
  language: string; // "en" | "hi"
  created_at: Date;
  updated_at: Date;
}
```

#### Recipe Model
```typescript
interface Recipe {
  id: string;
  user_id: string;
  title: string;
  description: string;
  source_type: 'manual' | 'image' | 'whatsapp' | 'url';
  source_url?: string;
  original_author?: string;
  servings: number;
  yield_weight_grams: number;
  preferred_unit_system: 'metric' | 'cups' | 'hybrid' | 'bakers_percent';
  status: 'draft' | 'active' | 'archived';
  target_water_activity?: number;
  total_hydration_percentage?: number;
  created_at: Date;
  updated_at: Date;
  ingredients: RecipeIngredient[];
  sections: RecipeSection[];
}
```

#### RecipeIngredient Model
```typescript
interface RecipeIngredient {
  id: string;
  recipe_id: string;
  ingredient_master_id: string;
  display_name: string;
  quantity_original: number;
  unit_original: string;
  quantity_grams: number; // CANONICAL VALUE
  position: number;
  ingredient_master: IngredientMaster;
}
```

#### IngredientMaster Model
```typescript
interface IngredientMaster {
  id: string;
  name: string; // lowercase, singular
  category: 'flour' | 'fat' | 'sugar' | 'leavening' | 'dairy' | 'liquid' | 'fruit' | 'nut' | 'spice' | 'other';
  default_density_g_per_ml: number;
  allergen_flags: {
    gluten?: boolean;
    dairy?: boolean;
    nuts?: boolean;
    eggs?: boolean;
  };
  nutrition_per_100g: {
    energy_kcal: number;
    protein_g: number;
    fat_g: number;
    carbs_g: number;
    fiber_g?: number;
  };
  created_at: Date;
}
```

#### InventoryItem Model (MVP)
```typescript
interface InventoryItem {
  id: string;
  user_id: string;
  ingredient_master_id: string;
  quantity_on_hand: number;
  unit: string;
  cost_per_unit: number;
  currency: string; // "INR"
  purchase_date: Date;
  expiration_date?: Date;
  supplier_id?: string;
  min_stock_level?: number;
  reorder_quantity?: number;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}
```

#### RecipeCost Model (MVP)
```typescript
interface RecipeCost {
  id: string;
  recipe_id: string;
  ingredient_cost: number;
  overhead_cost: number;
  packaging_cost: number;
  labor_cost: number;
  total_cost: number;
  currency: string; // "INR"
  calculated_at: Date;
}
```

### Business Logic Models

#### ScalingRequest
```typescript
interface ScalingRequest {
  recipe_id: string;
  target_yield_grams?: number;
  target_servings?: number;
  scaling_factor?: number; // Calculated if not provided
}

interface ScaledRecipe extends Recipe {
  original_yield_grams: number;
  scaling_factor: number;
  warnings: string[]; // e.g., "Scaling factor >3x may require timing adjustments"
}
```

#### UnitConversion
```typescript
interface UnitConversionRequest {
  ingredient_id: string;
  quantity: number;
  from_unit: string;
  to_unit: string;
}

interface UnitConversionResult {
  original_quantity: number;
  original_unit: string;
  converted_quantity: number;
  converted_unit: string;
  density_used: number;
  conversion_method: 'direct' | 'via_density' | 'estimated';
}
```

#### CostCalculation
```typescript
interface CostCalculationRequest {
  recipe_id: string;
  overhead_cost?: number;
  packaging_cost?: number;
  labor_cost?: number;
  target_profit_margin?: number; // Percentage
}

interface CostCalculationResult {
  ingredient_cost: number;
  overhead_cost: number;
  packaging_cost: number;
  labor_cost: number;
  total_cost: number;
  cost_per_serving: number;
  cost_per_100g: number;
  suggested_selling_price?: number;
  profit_amount?: number;
  actual_profit_margin?: number;
  breakdown: IngredientCostBreakdown[];
}

interface IngredientCostBreakdown {
  ingredient_name: string;
  quantity_grams: number;
  cost_per_unit: number;
  unit: string;
  total_cost: number;
}
```

## Data Models


### Social Media Export Models

#### RecipeCardExport
```typescript
interface RecipeCardExportRequest {
  recipe_id: string;
  format: 'instagram_story' | 'instagram_post' | 'whatsapp';
  language: 'en' | 'hi' | 'bilingual';
  include_branding: boolean;
  watermark_text?: string;
  color_scheme?: 'light' | 'dark' | 'custom';
  custom_colors?: {
    background: string;
    text: string;
    accent: string;
  };
}

interface RecipeCardExportResult {
  image_url: string;
  width: number;
  height: number;
  format: string;
  file_size_bytes: number;
}
```

## Business Logic Algorithms

### Unit Conversion Algorithm

The unit conversion system handles conversions between volume and weight measurements using ingredient-specific density values.

**Algorithm:**
```
function convertUnit(ingredient_id, quantity, from_unit, to_unit):
  ingredient = getIngredient(ingredient_id)
  density = ingredient.default_density_g_per_ml
  
  // Convert to canonical grams first
  if from_unit is volume unit:
    volume_ml = convertToMilliliters(quantity, from_unit)
    grams = volume_ml * density
  else if from_unit is weight unit:
    grams = convertToGrams(quantity, from_unit)
  else:
    throw InvalidUnitError
  
  // Convert from grams to target unit
  if to_unit is volume unit:
    if density is null:
      throw MissingDensityError
    volume_ml = grams / density
    result = convertFromMilliliters(volume_ml, to_unit)
  else if to_unit is weight unit:
    result = convertFromGrams(grams, to_unit)
  else:
    throw InvalidUnitError
  
  return result
```

**Supported Units:**
- Volume: ml, l, cup (240ml Indian standard), tbsp (15ml), tsp (5ml)
- Weight: g, kg, oz, lb

### Recipe Scaling Algorithm

Recipe scaling maintains ingredient proportions while adjusting total yield.

**Algorithm:**
```
function scaleRecipe(recipe, target_yield_grams):
  original_yield = recipe.yield_weight_grams
  scaling_factor = target_yield_grams / original_yield
  
  // Validate scaling factor
  warnings = []
  if scaling_factor > 3.0:
    warnings.push("Scaling >3x may require baking time adjustments")
  if scaling_factor < 0.25:
    warnings.push("Scaling <0.25x may be impractical for measurement")
  
  // Scale all ingredients
  scaled_ingredients = []
  for ingredient in recipe.ingredients:
    scaled_quantity = ingredient.quantity_grams * scaling_factor
    
    // Validate practical measurement
    if scaled_quantity < 1.0 and ingredient.category != 'spice':
      warnings.push(f"{ingredient.name} quantity very small: {scaled_quantity}g")
    
    scaled_ingredients.push({
      ...ingredient,
      quantity_grams: scaled_quantity,
      quantity_original: scaled_quantity, // Update display
      scaling_factor: scaling_factor
    })
  
  // Recalculate nutrition
  nutrition = calculateNutrition(scaled_ingredients)
  
  return {
    recipe: {
      ...recipe,
      ingredients: scaled_ingredients,
      yield_weight_grams: target_yield_grams,
      nutrition: nutrition
    },
    scaling_factor: scaling_factor,
    warnings: warnings
  }
```

### Cost Calculation Algorithm

Cost calculation aggregates ingredient costs and overhead to determine total recipe cost and suggested pricing.

**Algorithm:**
```
function calculateRecipeCost(recipe, overhead_cost, packaging_cost, labor_cost):
  ingredient_cost = 0
  breakdown = []
  
  // Calculate ingredient costs
  for ingredient in recipe.ingredients:
    inventory_item = getInventoryItem(ingredient.ingredient_master_id)
    
    if inventory_item is null:
      throw MissingInventoryDataError(ingredient.name)
    
    // Convert quantity to inventory unit
    quantity_in_inventory_unit = convertUnit(
      ingredient.ingredient_master_id,
      ingredient.quantity_grams,
      'grams',
      inventory_item.unit
    )
    
    item_cost = quantity_in_inventory_unit * inventory_item.cost_per_unit
    ingredient_cost += item_cost
    
    breakdown.push({
      ingredient_name: ingredient.display_name,
      quantity_grams: ingredient.quantity_grams,
      cost_per_unit: inventory_item.cost_per_unit,
      unit: inventory_item.unit,
      total_cost: item_cost
    })
  
  // Calculate total cost
  total_cost = ingredient_cost + overhead_cost + packaging_cost + labor_cost
  cost_per_serving = total_cost / recipe.servings
  cost_per_100g = (total_cost / recipe.yield_weight_grams) * 100
  
  return {
    ingredient_cost: ingredient_cost,
    overhead_cost: overhead_cost,
    packaging_cost: packaging_cost,
    labor_cost: labor_cost,
    total_cost: total_cost,
    cost_per_serving: cost_per_serving,
    cost_per_100g: cost_per_100g,
    breakdown: breakdown
  }
```

### Pricing Calculator Algorithm

The pricing calculator determines suggested selling price based on cost and target profit margin.

**Algorithm:**
```
function calculatePricing(total_cost, target_profit_margin_percent):
  // Profit margin formula: margin = (price - cost) / price
  // Rearranged: price = cost / (1 - margin)
  
  margin_decimal = target_profit_margin_percent / 100
  
  if margin_decimal >= 1.0:
    throw InvalidMarginError("Profit margin must be less than 100%")
  
  suggested_price = total_cost / (1 - margin_decimal)
  profit_amount = suggested_price - total_cost
  
  // Round to nearest rupee for INR
  suggested_price = Math.ceil(suggested_price)
  profit_amount = suggested_price - total_cost
  actual_margin = (profit_amount / suggested_price) * 100
  
  return {
    total_cost: total_cost,
    suggested_selling_price: suggested_price,
    profit_amount: profit_amount,
    target_profit_margin: target_profit_margin_percent,
    actual_profit_margin: actual_margin
  }
```

### Nutrition Calculation Algorithm

Nutrition calculation aggregates ingredient nutrition data weighted by quantity.

**Algorithm:**
```
function calculateNutrition(ingredients):
  total_nutrition = {
    energy_kcal: 0,
    protein_g: 0,
    fat_g: 0,
    carbs_g: 0,
    fiber_g: 0
  }
  
  total_weight_grams = 0
  
  for ingredient in ingredients:
    ingredient_master = getIngredientMaster(ingredient.ingredient_master_id)
    nutrition_per_100g = ingredient_master.nutrition_per_100g
    
    if nutrition_per_100g is null:
      continue // Skip ingredients without nutrition data
    
    // Calculate contribution based on quantity
    weight_factor = ingredient.quantity_grams / 100
    
    total_nutrition.energy_kcal += nutrition_per_100g.energy_kcal * weight_factor
    total_nutrition.protein_g += nutrition_per_100g.protein_g * weight_factor
    total_nutrition.fat_g += nutrition_per_100g.fat_g * weight_factor
    total_nutrition.carbs_g += nutrition_per_100g.carbs_g * weight_factor
    
    if nutrition_per_100g.fiber_g:
      total_nutrition.fiber_g += nutrition_per_100g.fiber_g * weight_factor
    
    total_weight_grams += ingredient.quantity_grams
  
  // Calculate per-100g nutrition
  nutrition_per_100g = {
    energy_kcal: (total_nutrition.energy_kcal / total_weight_grams) * 100,
    protein_g: (total_nutrition.protein_g / total_weight_grams) * 100,
    fat_g: (total_nutrition.fat_g / total_weight_grams) * 100,
    carbs_g: (total_nutrition.carbs_g / total_weight_grams) * 100,
    fiber_g: (total_nutrition.fiber_g / total_weight_grams) * 100
  }
  
  // Calculate per-serving nutrition
  nutrition_per_serving = {
    energy_kcal: total_nutrition.energy_kcal / recipe.servings,
    protein_g: total_nutrition.protein_g / recipe.servings,
    fat_g: total_nutrition.fat_g / recipe.servings,
    carbs_g: total_nutrition.carbs_g / recipe.servings,
    fiber_g: total_nutrition.fiber_g / recipe.servings
  }
  
  return {
    total: total_nutrition,
    per_100g: nutrition_per_100g,
    per_serving: nutrition_per_serving
  }
```

### Hydration Percentage Calculation

Hydration percentage calculates the baker's percentage (water-to-flour ratio) for dough recipes.

**Algorithm:**
```
function calculateHydrationPercentage(recipe):
  total_flour_grams = 0
  total_liquid_grams = 0
  
  for ingredient in recipe.ingredients:
    ingredient_master = getIngredientMaster(ingredient.ingredient_master_id)
    
    if ingredient_master.category == 'flour':
      total_flour_grams += ingredient.quantity_grams
    
    if ingredient_master.category in ['liquid', 'dairy']:
      total_liquid_grams += ingredient.quantity_grams
  
  if total_flour_grams == 0:
    return null // Not a dough recipe
  
  hydration_percentage = (total_liquid_grams / total_flour_grams) * 100
  
  return Math.round(hydration_percentage, 2)
```

### Inventory Deduction Algorithm

Inventory deduction automatically updates stock levels when a bake is logged.

**Algorithm:**
```
function deductInventory(recipe, journal_entry, scaling_factor = 1.0):
  deductions = []
  warnings = []
  
  for ingredient in recipe.ingredients:
    inventory_item = getInventoryItem(ingredient.ingredient_master_id)
    
    if inventory_item is null:
      warnings.push(f"{ingredient.name} not tracked in inventory")
      continue
    
    // Calculate quantity to deduct (scaled)
    quantity_to_deduct_grams = ingredient.quantity_grams * scaling_factor
    
    // Convert to inventory unit
    quantity_in_inventory_unit = convertUnit(
      ingredient.ingredient_master_id,
      quantity_to_deduct_grams,
      'grams',
      inventory_item.unit
    )
    
    // Check if sufficient stock
    if quantity_in_inventory_unit > inventory_item.quantity_on_hand:
      warnings.push(f"Insufficient {ingredient.name}: need {quantity_in_inventory_unit}, have {inventory_item.quantity_on_hand}")
    
    deductions.push({
      inventory_item_id: inventory_item.id,
      ingredient_name: ingredient.display_name,
      quantity_to_deduct: quantity_in_inventory_unit,
      unit: inventory_item.unit,
      current_stock: inventory_item.quantity_on_hand,
      new_stock: inventory_item.quantity_on_hand - quantity_in_inventory_unit
    })
  
  return {
    deductions: deductions,
    warnings: warnings
  }

function applyInventoryDeductions(deductions, journal_entry_id):
  transaction.begin()
  
  try:
    for deduction in deductions:
      // Update inventory quantity
      updateInventoryQuantity(
        deduction.inventory_item_id,
        deduction.new_stock
      )
      
      // Check if below minimum stock level
      inventory_item = getInventoryItem(deduction.inventory_item_id)
      if inventory_item.min_stock_level and inventory_item.quantity_on_hand < inventory_item.min_stock_level:
        createLowStockAlert(inventory_item)
      
      // Log deduction
      logInventoryTransaction({
        inventory_item_id: deduction.inventory_item_id,
        transaction_type: 'deduction',
        quantity: deduction.quantity_to_deduct,
        reference_type: 'journal_entry',
        reference_id: journal_entry_id
      })
    
    transaction.commit()
  } catch (error) {
    transaction.rollback()
    throw error
  }
```


## Integration Design

### WhatsApp Business API Integration

The WhatsApp integration enables recipe sharing, inventory reminders, and customer communication.

**Architecture:**
```mermaid
graph LR
    FRONTEND[Frontend] --> SOCIAL_API[Social Media Service]
    SOCIAL_API --> WHATSAPP_FORMATTER[WhatsApp Formatter]
    SOCIAL_API --> WHATSAPP_API[WhatsApp Business API]
    WHATSAPP_API --> WHATSAPP_SERVER[WhatsApp Server]
    WHATSAPP_SERVER --> USER_PHONE[User's WhatsApp]
```

**Recipe Sharing Flow:**
1. User clicks "Share via WhatsApp" button
2. Frontend calls `/api/v1/social/whatsapp-format` with recipe ID
3. Social Media Service formats recipe text with proper line breaks and emojis
4. Service generates shareable link with preview metadata
5. Service compresses recipe image for WhatsApp (max 5MB)
6. Returns formatted text and image URL
7. Frontend opens WhatsApp with pre-filled message using `whatsapp://send` URL scheme

**Inventory Reminder Flow:**
1. Scheduled job checks for low stock items daily
2. For each user with low stock items:
   - Format reminder message with ingredient list
   - Include reorder quantities
   - Add supplier contact information if available
3. Send via WhatsApp Business API
4. Log reminder sent in database

**Message Format Example:**
```
🍪 *AiBake Recipe: Chocolate Chip Cookies*

📊 *Ingredients:*
• 250g All-purpose flour
• 113g Butter (softened)
• 200g Brown sugar
• 2 Eggs

⏱️ *Time:* 45 minutes
🔥 *Temp:* 180°C

👉 View full recipe: https://aibake.app/r/abc123

Made with ❤️ by AiBake
```

### Speech-to-Text Integration

Audio note transcription uses cloud-based speech-to-text services.

**Supported Services:**
- Google Cloud Speech-to-Text
- AWS Transcribe
- Azure Speech Services
- OpenAI Whisper API

**Transcription Flow:**
1. User records audio note in frontend
2. Frontend uploads audio file to backend
3. Backend stores audio in cloud storage
4. Backend queues transcription job
5. Transcription service processes audio
6. Webhook receives transcription result
7. Backend updates audio note record with transcription text
8. Frontend polls for transcription completion or receives WebSocket update

**Audio Format Support:**
- MP3 (preferred for size)
- WAV (highest quality)
- M4A (iOS native)
- OGG (Android native)

### Image Generation Service

Recipe card generation creates shareable images for social media.

**Technology Options:**
- Canvas API (Node.js: node-canvas)
- Puppeteer (headless Chrome for HTML rendering)
- ImageMagick (command-line image manipulation)
- Cloud service (Cloudinary, Imgix)

**Recipe Card Generation Flow:**
1. User selects recipe and export format
2. Frontend calls `/api/v1/social/recipe-card` with parameters
3. Image Generation Service:
   - Loads recipe data
   - Selects template based on format (Instagram story/post/WhatsApp)
   - Renders recipe title, ingredients, key instructions
   - Applies user branding (logo, colors, watermark)
   - Generates image in specified dimensions
   - Optimizes image (WebP with JPEG fallback)
   - Uploads to cloud storage
4. Returns image URL to frontend
5. Frontend displays preview and download options

**Template Specifications:**
- Instagram Story: 1080x1920px, portrait
- Instagram Post: 1080x1080px, square
- WhatsApp: 800x800px, compressed <500KB

### Payment Gateway Integration (Future)

For order management and payment processing.

**Supported Gateways:**
- Razorpay (India-focused)
- Paytm
- PhonePe
- Stripe (international)

**Payment Flow:**
1. Customer places order through shared recipe link
2. Backend creates order record with amount
3. Backend initiates payment with gateway
4. Gateway returns payment page URL
5. Customer completes payment
6. Gateway sends webhook notification
7. Backend verifies payment signature
8. Backend updates order status
9. Backend sends confirmation to customer

## Error Handling

### Error Classification

**Client Errors (4xx):**
- 400 Bad Request: Invalid input data, validation failures
- 401 Unauthorized: Missing or invalid authentication token
- 403 Forbidden: Insufficient permissions
- 404 Not Found: Resource does not exist
- 409 Conflict: Resource already exists or version conflict
- 422 Unprocessable Entity: Business rule violation
- 429 Too Many Requests: Rate limit exceeded

**Server Errors (5xx):**
- 500 Internal Server Error: Unexpected server error
- 502 Bad Gateway: External service failure
- 503 Service Unavailable: Temporary service outage
- 504 Gateway Timeout: External service timeout

### Error Response Format

All API errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Recipe validation failed",
    "details": [
      {
        "field": "ingredients",
        "message": "Recipe must have at least one ingredient"
      },
      {
        "field": "ingredients[0].quantity_grams",
        "message": "Quantity must be positive"
      }
    ],
    "request_id": "req_abc123xyz",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Error Handling Strategies

**Database Errors:**
- Connection failures: Retry with exponential backoff (3 attempts)
- Deadlocks: Automatic retry with randomized delay
- Constraint violations: Return 409 Conflict with specific constraint name
- Query timeouts: Log slow query, return 504 Gateway Timeout

**External Service Errors:**
- Transcription service failure: Store audio without transcription, retry later
- Image storage failure: Return error, allow user to retry upload
- WhatsApp API failure: Queue message for retry, notify user of delay
- Payment gateway failure: Log transaction, provide manual payment option

**Validation Errors:**
- Field-level validation: Return all validation errors in single response
- Business rule violations: Return 422 with clear explanation
- Missing required data: Return 400 with list of missing fields

**Authentication Errors:**
- Invalid token: Return 401, prompt user to log in again
- Expired token: Return 401 with refresh token hint
- Insufficient permissions: Return 403 with required permission

### Logging Strategy

**Log Levels:**
- ERROR: Unhandled exceptions, critical failures
- WARN: Handled errors, degraded functionality
- INFO: Important business events (user registration, recipe creation)
- DEBUG: Detailed execution flow (development only)

**Log Format:**
```json
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "level": "ERROR",
  "service": "recipe-service",
  "request_id": "req_abc123xyz",
  "user_id": "user_xyz789",
  "message": "Failed to calculate recipe cost",
  "error": {
    "type": "MissingInventoryDataError",
    "message": "Ingredient 'butter' not found in inventory",
    "stack": "..."
  },
  "context": {
    "recipe_id": "recipe_abc123",
    "ingredient_id": "ing_butter_001"
  }
}
```

**Sensitive Data Handling:**
- Never log passwords, tokens, or payment information
- Mask email addresses (u***@example.com)
- Mask phone numbers (***-***-1234)
- Redact PII in error messages

### Error Recovery Mechanisms

**Frontend Error Recovery:**
- Auto-save form data to localStorage every 30 seconds
- Restore unsaved data on page reload
- Retry failed API requests with exponential backoff
- Queue operations when offline, sync when online
- Display user-friendly error messages with recovery actions

**Backend Error Recovery:**
- Database transaction rollback on any operation failure
- Idempotent API endpoints (safe to retry)
- Circuit breaker pattern for external services
- Graceful degradation (disable non-critical features)
- Health check endpoints for monitoring

## Testing Strategy

### Testing Pyramid

```
        /\
       /  \
      / E2E \
     /--------\
    /          \
   / Integration \
  /--------------\
 /                \
/   Unit + PBT     \
--------------------
```

**Unit Tests (70% of tests):**
- Test individual functions and methods
- Mock external dependencies
- Fast execution (<1ms per test)
- High coverage (>90% for business logic)

**Property-Based Tests (20% of tests):**
- Test universal properties across many inputs
- Validate mathematical operations
- Ensure invariants hold
- Minimum 100 iterations per property

**Integration Tests (8% of tests):**
- Test API endpoints with real database
- Test service interactions
- Test database queries and transactions
- Use test database with seed data

**End-to-End Tests (2% of tests):**
- Test critical user workflows
- Test across all system layers
- Use staging environment
- Slower execution (seconds per test)

### Unit Testing Approach

**Middleware Functions:**
- Unit Converter: Test all unit combinations
- Recipe Scaler: Test various scaling factors
- Nutrition Calculator: Test with different ingredient combinations
- Cost Calculator: Test with missing data, zero costs, large numbers

**API Controllers:**
- Test request validation
- Test authentication/authorization
- Test error handling
- Mock service layer

**Database Functions:**
- Test SQL functions in isolation
- Test triggers with sample data
- Test constraints and validations

### Property-Based Testing Approach

Property-based testing will be implemented using:
- **JavaScript/TypeScript**: fast-check library
- **Python**: Hypothesis library

**Configuration:**
- Minimum 100 iterations per property test
- Each test tagged with feature name and property number
- Tag format: `Feature: aibake-full-system-implementation, Property {N}: {property_text}`

**Key Properties to Test:**

1. **Unit Conversion Round-Trip**
2. **Recipe Scaling Invariants**
3. **Nutrition Calculation Accuracy**
4. **Cost Calculation Consistency**
5. **Inventory Deduction Correctness**
6. **Recipe Parser Round-Trip**

(Detailed properties will be defined in Correctness Properties section)

### Integration Testing Approach

**API Endpoint Tests:**
- Test all CRUD operations
- Test authentication flows
- Test error responses
- Test pagination and filtering
- Test concurrent requests

**Database Integration Tests:**
- Test migrations (up and down)
- Test foreign key constraints
- Test cascade deletes
- Test transaction rollbacks
- Test index usage

**External Service Integration Tests:**
- Mock external APIs
- Test timeout handling
- Test retry logic
- Test webhook processing

### End-to-End Testing Approach

**Critical User Workflows:**
1. User registration and login
2. Create recipe with ingredients
3. Scale recipe and verify quantities
4. Log bake and deduct inventory
5. Calculate cost and pricing
6. Export recipe card for social media

**E2E Test Tools:**
- Playwright or Cypress for browser automation
- Test against staging environment
- Use test user accounts
- Clean up test data after execution

### Test Data Management

**Seed Data:**
- 70+ common ingredients with nutrition and density
- 10+ common baking issues with solutions
- Water activity reference data
- Sample recipes for testing

**Test Fixtures:**
- Sample users with different preferences
- Sample recipes covering various categories
- Sample inventory items with different stock levels
- Sample journal entries with photos and notes

**Test Database:**
- Separate database for testing
- Reset before each test suite
- Use transactions for test isolation
- Parallel test execution support


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Unit Conversion Round-Trip

*For any* ingredient with known density, converting from volume to weight and back to volume should produce the original value within measurement precision tolerance (±0.1%).

**Validates: Requirements 6.5, 19.4**

This property ensures the unit conversion system is mathematically sound. When a user enters "1 cup flour" and the system converts it to grams and back, they should get "1 cup" again. This is critical for recipe accuracy and user trust.

### Property 2: Display Unit Preservation

*For any* recipe ingredient added with original quantity and unit, the system should store both the canonical grams value and preserve the original display quantity and unit for UI presentation.

**Validates: Requirements 2.8, 6.6, 19.6**

This property ensures users see ingredients in their preferred units while the system performs all calculations in canonical grams. A recipe entered as "2 cups flour" should display as "2 cups flour" even though it's stored as 240g internally.

### Property 3: Recipe Scaling Proportionality

*For any* recipe and any positive scaling factor, all ingredient quantities should be multiplied by the same scaling factor, preserving the ratios between all ingredients including critical ratios like leavening-to-flour.

**Validates: Requirements 20.2, 20.3, 31.4, 82.4**

This property ensures recipe scaling maintains ingredient proportions. If a recipe is scaled 2x, every ingredient should double. The ratio of any two ingredients should remain constant: ratio(ingredient_a, ingredient_b) before scaling = ratio(ingredient_a, ingredient_b) after scaling.

### Property 4: Nutrition Calculation Consistency

*For any* recipe with ingredient nutrition data, the calculated total nutrition should equal the sum of individual ingredient contributions weighted by quantity, and this calculation should be automatically updated whenever recipe ingredients change.

**Validates: Requirements 13.5, 20.5, 67.5**

This property ensures nutrition calculations are accurate and stay synchronized with recipe changes. If ingredient A contributes 100 kcal and ingredient B contributes 200 kcal, the total should be 300 kcal. When ingredients change, nutrition must recalculate.

### Property 5: Cascade Deletion Completeness

*For any* recipe, when the recipe is deleted, all related data (ingredients, sections, steps, journal entries, versions, audio notes) should also be deleted, leaving no orphaned records.

**Validates: Requirements 5.6**

This property ensures referential integrity through cascade deletion. After deleting a recipe, querying for its ingredients, sections, or journal entries should return empty results.

### Property 6: Fuzzy Ingredient Search Ranking

*For any* ingredient search query, results should be returned ranked by similarity score (highest first), searching both canonical names and aliases, with matches indicated by source (canonical or alias name).

**Validates: Requirements 4.7, 17.6, 48.1**

This property ensures search functionality is consistent and useful. Searching for "ap" should return "all-purpose flour" ranked by how similar "ap" is to the ingredient name or its aliases.

### Property 7: Composite Ingredient Percentage Sum

*For any* composite ingredient, the sum of all component percentages must equal 100, and this constraint should be enforced during creation and modification.

**Validates: Requirements 18.3**

This property ensures composite ingredients are mathematically valid. A gluten-free flour blend with 40% rice flour, 30% almond flour, and 30% tapioca starch is valid. A blend with components summing to 95% or 105% should be rejected.

### Property 8: Composite Ingredient Expansion

*For any* recipe using composite ingredients, the system should be able to expand the composite into its base components with correct quantities calculated from the composite percentage breakdown.

**Validates: Requirements 18.6, 48.2**

This property ensures composite ingredients can be fully resolved. If a recipe uses 100g of a composite ingredient that is 40% component A and 60% component B, expansion should show 40g of A and 60g of B.

### Property 9: Hydration Percentage Calculation

*For any* dough recipe, the hydration percentage should equal (total liquid weight / total flour weight) × 100, where liquids include all ingredients in 'liquid' and 'dairy' categories, and flours include all ingredients in 'flour' category.

**Validates: Requirements 16.5, 48.4**

This property ensures baker's percentage calculations are correct. A recipe with 500g flour and 350g water should calculate 70% hydration. This is critical for dough consistency.

### Property 10: Baking Loss Calculation

*For any* journal entry with both pre-bake weight and post-bake weight, the system should automatically calculate baking loss in grams (pre - post) and as a percentage ((loss / pre) × 100).

**Validates: Requirements 16.2**

This property ensures hydration loss tracking is accurate. If dough weighs 1000g before baking and 850g after, the loss should be 150g (15%). This helps bakers understand moisture evaporation.

### Property 11: Recipe Versioning on Modification

*For any* recipe modification that changes ingredients, quantities, or instructions, the system should create a new version record with incremented version number and a complete JSON snapshot of the recipe state.

**Validates: Requirements 8.5**

This property ensures recipe history is preserved. Every modification creates a new version, allowing users to track changes and revert if needed.

### Property 12: Journal Entry Version Association

*For any* journal entry created, it should be associated with the current version of the recipe at the time of creation, preserving historical accuracy.

**Validates: Requirements 9.6**

This property ensures journal entries reference the correct recipe version. If a user bakes version 3 of a recipe, the journal entry should link to version 3, not the current version 5.

### Property 13: Recipe Export-Import Round-Trip

*For any* valid recipe, exporting to JSON format and then importing should produce an equivalent recipe with all metadata, ingredients, sections, and steps preserved.

**Validates: Requirements 49.5, 63.6**

This property ensures recipe serialization is lossless. export(import(recipe)) should equal recipe. This is critical for data portability and backups.

### Property 14: Recipe Parser Round-Trip

*For any* valid recipe object, the parser should satisfy parse(print(recipe)) = recipe, where print formats the recipe to text and parse extracts structured data from text.

**Validates: Requirements 63.6**

This property ensures the recipe parser and printer are inverse operations. A recipe printed to text and parsed back should be equivalent to the original.

### Property 15: Transaction Atomicity for Recipe Creation

*For any* recipe creation request with multiple ingredients, either all ingredients should be saved successfully, or none should be saved (transaction rollback on any failure).

**Validates: Requirements 88.6**

This property ensures data consistency. If creating a recipe with 5 ingredients fails on the 4th ingredient, the recipe and first 3 ingredients should not exist in the database.

### Property 16: Transaction Atomicity for Batch Operations

*For any* batch operation (bulk delete, bulk update), if any individual operation fails, all changes should be rolled back, leaving the system in its original state.

**Validates: Requirements 57.6**

This property ensures batch operations are atomic. If deleting 10 recipes fails on the 7th, none of the 10 should be deleted.

### Property 17: Recipe Yield Validation

*For any* recipe, the yield_weight_grams should match the sum of all ingredient quantities in grams within a reasonable tolerance (±5% to account for water loss, air incorporation, etc.).

**Validates: Requirements 91.4**

This property ensures recipe yields are realistic. If ingredients sum to 1000g, the yield should be between 950g and 1050g. A yield of 500g or 2000g would indicate an error.

### Property 18: Inventory Transaction Completeness

*For any* inventory item, all additions (purchases) and deductions (bake logging) should be recorded in the inventory history, and the current quantity should equal the sum of all additions minus all deductions.

**Validates: Requirements 101.7**

This property ensures inventory tracking is accurate and auditable. If an ingredient starts at 0g, has 3 purchases of 1000g each, and 5 deductions of 200g each, the current quantity should be 2000g.

### Property 19: Low Stock Alert Triggering

*For any* inventory item with a defined minimum stock level, when the quantity falls below that level, a low stock alert should be created and displayed to the user.

**Validates: Requirements 102.3**

This property ensures users are notified when ingredients run low. If minimum stock is 500g and quantity drops to 450g, an alert should trigger.

### Property 20: Inventory Deduction on Bake Logging

*For any* journal entry created with inventory deduction enabled, the system should deduct the recipe's ingredient quantities (scaled if applicable) from the corresponding inventory items.

**Validates: Requirements 103.1**

This property ensures inventory automatically updates when bakes are logged. Logging a bake that uses 250g flour should reduce flour inventory by 250g.

### Property 21: Inventory Sufficiency Warning

*For any* recipe, when attempting to log a bake, if any ingredient quantity exceeds the available inventory quantity, the system should warn the user before allowing the operation.

**Validates: Requirements 103.6**

This property prevents negative inventory. If a recipe needs 500g flour but only 300g is available, the user should be warned.

### Property 22: Recipe Cost Calculation

*For any* recipe with ingredient cost data, the total ingredient cost should equal the sum of (ingredient quantity × cost per unit) for all ingredients, converted to the same unit system.

**Validates: Requirements 104.1, 72.3**

This property ensures cost calculations are accurate. If ingredient A costs ₹100 and ingredient B costs ₹50, total ingredient cost should be ₹150.

### Property 23: Cost Recalculation on Price Change

*For any* recipe, when an ingredient's cost per unit changes in inventory, the recipe cost should be automatically recalculated to reflect the new pricing.

**Validates: Requirements 104.8**

This property ensures costs stay current. If flour price increases from ₹40/kg to ₹50/kg, all recipes using flour should show updated costs.

### Property 24: Packaging Cost Inclusion

*For any* recipe cost calculation, if packaging items are associated with the recipe, their costs should be included in the total cost calculation.

**Validates: Requirements 115.4**

This property ensures packaging costs aren't forgotten. A recipe with ₹200 ingredient cost and ₹50 packaging cost should show ₹250 total cost (before overhead and labor).

### Property 25: Pricing Formula Correctness

*For any* recipe cost and target profit margin percentage (0-99%), the suggested selling price should equal cost / (1 - margin/100), and the actual profit margin should equal ((price - cost) / price) × 100.

**Validates: Requirements 105.2**

This property ensures pricing calculations are mathematically correct. With ₹100 cost and 40% target margin, price should be ₹166.67, giving ₹66.67 profit (40% margin).

### Property 26: Delivery Charge Calculation

*For any* order value and delivery zone, the delivery charge should be calculated according to the zone's pricing rules (base charge, per-km charge, free delivery threshold), with charges waived if order value exceeds the free delivery threshold.

**Validates: Requirements 116.4**

This property ensures delivery charges are calculated consistently. If base charge is ₹50, per-km is ₹10, distance is 5km, and free delivery threshold is ₹500, an order of ₹600 should have ₹0 delivery charge.

### Property 27: Bulk Pricing Discount

*For any* product with bulk pricing tiers and order quantity, the price should be calculated using the appropriate tier (highest quantity tier that doesn't exceed the order quantity), and the discount should be correctly applied.

**Validates: Requirements 117.2**

This property ensures bulk discounts are applied correctly. If pricing is ₹100 for 1-9 units, ₹90 for 10-49 units, and ₹80 for 50+ units, an order of 25 units should be priced at ₹90 per unit.

### Property 28: Profit Margin Calculation

*For any* recipe with cost and selling price, the profit margin should equal ((selling_price - total_cost) / selling_price) × 100, and this should be consistent across all profit margin displays.

**Validates: Requirements 119.1**

This property ensures profit margins are calculated consistently. With ₹100 cost and ₹150 selling price, profit margin should be 33.33% everywhere it's displayed.

### Property 29: Currency Formatting Consistency

*For any* monetary value in INR, the formatted display should include the rupee symbol (₹), proper thousand separators (₹1,234.56), and exactly 2 decimal places for paisa precision.

**Validates: Requirements 106.2**

This property ensures currency displays are consistent and professional. ₹1234.5 should display as ₹1,234.50, not ₹1234.5 or ₹1,234.5.

### Property 30: Inventory Purchase Quantity Update

*For any* inventory purchase logged, the inventory item's quantity_on_hand should increase by the purchased quantity (converted to the inventory item's unit if necessary).

**Validates: Requirements 113.3**

This property ensures purchases update inventory correctly. If inventory is 500g and a purchase of 1kg is logged, inventory should become 1500g.


## Error Handling

### Error Handling Strategy

The AiBake system implements a comprehensive error handling strategy across all layers:

**Database Layer:**
- Constraint violations return specific error codes
- Foreign key violations indicate which relationship failed
- Unique constraint violations specify the conflicting field
- Check constraint violations explain the validation rule
- Transaction rollback on any error within a transaction
- Connection pool exhaustion triggers retry with backoff

**Middleware Layer:**
- Missing density data throws `MissingDensityError` with ingredient name
- Invalid unit throws `InvalidUnitError` with supported units list
- Scaling factor out of range throws `InvalidScalingFactorError` with warnings
- Missing inventory data throws `MissingInventoryDataError` with ingredient name
- Insufficient inventory throws `InsufficientInventoryError` with available quantity
- Invalid composite ingredient throws `InvalidCompositeError` with percentage sum

**API Layer:**
- All errors return consistent JSON format with error code, message, details, request_id
- Validation errors include field-level details for all failing fields
- Authentication errors return 401 with clear message
- Authorization errors return 403 with required permission
- Not found errors return 404 with resource type and ID
- Conflict errors return 409 with conflicting resource details
- Rate limit errors return 429 with retry-after header

**Frontend Layer:**
- Display user-friendly error messages (not technical stack traces)
- Provide actionable recovery steps ("Add density data" button)
- Auto-save form data to prevent data loss
- Retry failed requests with exponential backoff
- Queue operations when offline, sync when online
- Show loading states during async operations

### Critical Error Scenarios

**Scenario 1: Recipe Creation Fails Mid-Transaction**
- Problem: Recipe created, but ingredient insertion fails
- Solution: Database transaction rollback ensures recipe is not created
- User Experience: Error message "Failed to create recipe", form data preserved
- Recovery: User can fix validation errors and retry

**Scenario 2: Inventory Deduction Exceeds Available Stock**
- Problem: User logs bake but insufficient inventory
- Solution: Validation before transaction, warning dialog with current stock
- User Experience: "Insufficient flour: need 500g, have 300g. Continue anyway?"
- Recovery: User can adjust quantities, skip deduction, or cancel

**Scenario 3: External Service Failure (Transcription)**
- Problem: Audio uploaded but transcription service unavailable
- Solution: Store audio without transcription, queue retry job
- User Experience: "Audio saved. Transcription pending..."
- Recovery: Background job retries transcription, updates when complete

**Scenario 4: Cost Calculation with Missing Data**
- Problem: Recipe ingredient not in inventory (no cost data)
- Solution: Throw `MissingInventoryDataError`, list missing ingredients
- User Experience: "Cannot calculate cost. Missing prices for: butter, sugar"
- Recovery: User adds ingredients to inventory with costs, retries calculation

**Scenario 5: Concurrent Recipe Modification**
- Problem: Two users edit same recipe simultaneously
- Solution: Optimistic locking with version number check
- User Experience: "Recipe was modified by another user. Please refresh and try again."
- Recovery: User refreshes, sees latest version, reapplies changes

### Error Recovery Patterns

**Retry with Exponential Backoff:**
```
attempt = 0
max_attempts = 3
base_delay = 1000ms

while attempt < max_attempts:
  try:
    result = performOperation()
    return result
  catch (TransientError):
    attempt++
    if attempt >= max_attempts:
      throw error
    delay = base_delay * (2 ^ attempt) + random(0, 1000)
    sleep(delay)
```

**Circuit Breaker Pattern:**
```
circuit_state = CLOSED
failure_count = 0
failure_threshold = 5
timeout_duration = 60000ms

function callExternalService():
  if circuit_state == OPEN:
    if now() - last_failure_time > timeout_duration:
      circuit_state = HALF_OPEN
    else:
      throw CircuitOpenError
  
  try:
    result = externalService.call()
    if circuit_state == HALF_OPEN:
      circuit_state = CLOSED
      failure_count = 0
    return result
  catch (error):
    failure_count++
    last_failure_time = now()
    if failure_count >= failure_threshold:
      circuit_state = OPEN
    throw error
```

**Graceful Degradation:**
```
function getRecipeWithNutrition(recipe_id):
  recipe = getRecipe(recipe_id)
  
  try:
    nutrition = calculateNutrition(recipe)
    recipe.nutrition = nutrition
  catch (MissingNutritionDataError):
    recipe.nutrition = null
    recipe.nutrition_warning = "Nutrition data incomplete"
  
  return recipe
```

## Testing Strategy

### Testing Approach

The AiBake system uses a comprehensive testing strategy with four levels of testing:

**1. Unit Tests (70% of tests)**
- Test individual functions in isolation
- Mock external dependencies (database, external services)
- Fast execution (<1ms per test)
- High coverage target (>90% for business logic)
- Focus on edge cases and error conditions

**2. Property-Based Tests (20% of tests)**
- Test universal properties across many generated inputs
- Validate mathematical operations and invariants
- Minimum 100 iterations per property test
- Each test tagged with feature name and property number
- Use fast-check (JavaScript) or Hypothesis (Python)

**3. Integration Tests (8% of tests)**
- Test API endpoints with real database
- Test service interactions
- Test database queries and transactions
- Use test database with seed data
- Test authentication and authorization flows

**4. End-to-End Tests (2% of tests)**
- Test critical user workflows across all layers
- Use browser automation (Playwright/Cypress)
- Test against staging environment
- Slower execution (seconds per test)
- Focus on happy paths and critical business flows

### Property-Based Testing Configuration

**Library Selection:**
- JavaScript/TypeScript: fast-check
- Python: Hypothesis

**Configuration:**
```javascript
// fast-check configuration
import fc from 'fast-check';

// Minimum 100 iterations per property
const propertyConfig = {
  numRuns: 100,
  verbose: true,
  seed: 42 // For reproducibility
};

// Example property test
test('Feature: aibake-full-system-implementation, Property 1: Unit conversion round-trip', () => {
  fc.assert(
    fc.property(
      fc.record({
        ingredient_id: fc.uuid(),
        quantity: fc.float({ min: 0.1, max: 10000 }),
        unit: fc.constantFrom('cup', 'tbsp', 'tsp', 'ml', 'l')
      }),
      (input) => {
        const grams = convertToGrams(input.ingredient_id, input.quantity, input.unit);
        const backToOriginal = convertFromGrams(input.ingredient_id, grams, input.unit);
        const tolerance = input.quantity * 0.001; // 0.1% tolerance
        return Math.abs(backToOriginal - input.quantity) <= tolerance;
      }
    ),
    propertyConfig
  );
});
```

**Property Test Tags:**
Each property-based test must include a comment tag referencing the design document property:
```javascript
// Feature: aibake-full-system-implementation, Property 3: Recipe scaling proportionality
```

### Unit Testing Strategy

**Middleware Functions:**

**Unit Converter Tests:**
- Test all volume-to-weight conversions
- Test all weight-to-weight conversions
- Test missing density error handling
- Test invalid unit error handling
- Test edge cases (zero quantity, very large quantities)

**Recipe Scaler Tests:**
- Test scaling up (2x, 3x, 10x)
- Test scaling down (0.5x, 0.25x, 0.1x)
- Test scaling factor warnings (>3x, <0.25x)
- Test nutrition recalculation after scaling
- Test edge cases (single ingredient, 100 ingredients)

**Nutrition Calculator Tests:**
- Test with complete nutrition data
- Test with missing nutrition data
- Test with zero-quantity ingredients
- Test per-serving calculation
- Test per-100g calculation

**Cost Calculator Tests:**
- Test with all cost components
- Test with missing inventory data
- Test with zero costs
- Test with very large numbers
- Test currency conversion

**API Controller Tests:**
- Test request validation (missing fields, invalid types)
- Test authentication (valid token, expired token, missing token)
- Test authorization (user owns resource, user doesn't own resource)
- Test error responses (400, 401, 403, 404, 409, 500)
- Mock service layer

### Integration Testing Strategy

**API Endpoint Tests:**

**Recipe Endpoints:**
- POST /api/v1/recipes: Create recipe with ingredients, sections, steps
- GET /api/v1/recipes/:id: Retrieve recipe with all related data
- PATCH /api/v1/recipes/:id: Update recipe, verify version created
- DELETE /api/v1/recipes/:id: Delete recipe, verify cascade deletion
- POST /api/v1/recipes/:id/scale: Scale recipe, verify quantities and nutrition

**Inventory Endpoints:**
- POST /api/v1/inventory: Add inventory item
- POST /api/v1/inventory/purchases: Log purchase, verify quantity update
- POST /api/v1/inventory/deduct: Deduct from inventory, verify low stock alert
- GET /api/v1/inventory/alerts: Retrieve low stock alerts

**Costing Endpoints:**
- POST /api/v1/recipes/:id/cost/calculate: Calculate cost with all components
- GET /api/v1/recipes/:id/cost/history: Retrieve cost history
- POST /api/v1/recipes/:id/pricing: Calculate pricing with profit margin

**Database Integration Tests:**
- Test migrations (up and down)
- Test foreign key constraints (cascade delete, restrict)
- Test unique constraints (duplicate prevention)
- Test check constraints (positive quantities, valid percentages)
- Test triggers (updated_at, baking_loss calculation)
- Test database functions (search_ingredient, calculate_hydration_percentage)

### End-to-End Testing Strategy

**Critical User Workflows:**

**Workflow 1: New User Onboarding**
1. Register new account
2. Verify email confirmation
3. Log in
4. Set preferences (currency, language, units)
5. View dashboard

**Workflow 2: Create and Scale Recipe**
1. Log in
2. Navigate to "New Recipe"
3. Enter recipe details (title, description, servings)
4. Add ingredients with quantities and units
5. Add preparation steps
6. Save recipe
7. View recipe detail page
8. Scale recipe to 2x
9. Verify all quantities doubled
10. Verify nutrition recalculated

**Workflow 3: Log Bake with Inventory Deduction**
1. Log in
2. Add ingredients to inventory with costs
3. Navigate to recipe
4. Click "Log Bake"
5. Enter bake date, notes, rating
6. Upload photo
7. Enable "Deduct from inventory"
8. Review deduction preview
9. Confirm and save
10. Verify inventory quantities reduced
11. Verify low stock alert if applicable

**Workflow 4: Calculate Cost and Pricing**
1. Log in
2. Ensure recipe has ingredients
3. Ensure ingredients in inventory with costs
4. Navigate to recipe
5. Click "Calculate Cost"
6. Enter overhead, packaging, labor costs
7. View cost breakdown
8. Enter target profit margin (40%)
9. View suggested selling price
10. Verify profit margin calculation

**Workflow 5: Export Recipe Card for Instagram**
1. Log in
2. Navigate to recipe
3. Click "Share"
4. Select "Instagram Post"
5. Choose language (bilingual)
6. Customize colors
7. Add watermark
8. Generate image
9. Preview image
10. Download image
11. Verify image dimensions (1080x1080)

### Test Data Management

**Seed Data (for all environments):**
- 70+ common ingredients with nutrition and density
- 10+ common baking issues with solutions
- Water activity reference data for 6 product categories
- Ingredient aliases (abbreviations, regional names)
- Sample composite ingredient (GF flour blend)

**Test Fixtures (for testing only):**
- 5 test users with different preferences
- 20 test recipes covering various categories
- 50 test ingredients in inventory
- 10 test journal entries with photos
- 5 test suppliers with contact information

**Test Database Setup:**
```sql
-- Create test database
CREATE DATABASE aibake_test;

-- Run migrations
psql aibake_test < 01_schema_init.sql
psql aibake_test < 02_seed_data.sql
psql aibake_test < 04_schema_enhancements.sql

-- Load test fixtures
psql aibake_test < test_fixtures.sql
```

**Test Isolation:**
- Each test suite runs in a transaction
- Transaction rolled back after test completion
- Parallel test execution with separate database connections
- Test data cleanup between test runs

### Continuous Integration

**CI Pipeline:**
1. Lint code (ESLint, Prettier)
2. Type check (TypeScript)
3. Run unit tests
4. Run property-based tests
5. Run integration tests
6. Generate coverage report
7. Enforce minimum coverage (80%)
8. Build Docker images
9. Deploy to staging (on main branch)

**CI Configuration (.github/workflows/ci.yml):**
```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: aibake_test
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint
        run: npm run lint
      
      - name: Type check
        run: npm run type-check
      
      - name: Run migrations
        run: npm run migrate:test
      
      - name: Run tests
        run: npm run test:coverage
      
      - name: Check coverage
        run: npm run coverage:check
      
      - name: Build
        run: npm run build
```

## Deployment Design

### Infrastructure Architecture

```mermaid
graph TB
    subgraph "Load Balancer"
        LB[Nginx/HAProxy]
    end
    
    subgraph "Application Tier"
        API1[API Server 1]
        API2[API Server 2]
        API3[API Server 3]
    end
    
    subgraph "Data Tier"
        DB_PRIMARY[(PostgreSQL Primary)]
        DB_REPLICA[(PostgreSQL Replica)]
        REDIS[(Redis Cache)]
    end
    
    subgraph "Storage Tier"
        S3[Cloud Storage]
    end
    
    subgraph "External Services"
        WHATSAPP[WhatsApp API]
        TRANSCRIBE[Speech-to-Text]
    end
    
    LB --> API1
    LB --> API2
    LB --> API3
    
    API1 --> DB_PRIMARY
    API2 --> DB_PRIMARY
    API3 --> DB_PRIMARY
    
    API1 --> DB_REPLICA
    API2 --> DB_REPLICA
    API3 --> DB_REPLICA
    
    API1 --> REDIS
    API2 --> REDIS
    API3 --> REDIS
    
    API1 --> S3
    API2 --> S3
    API3 --> S3
    
    API1 --> WHATSAPP
    API1 --> TRANSCRIBE
```

### Container Architecture

**Docker Compose (Development):**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: aibake
      POSTGRES_USER: aibake
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  
  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://aibake:${DB_PASSWORD}@postgres:5432/aibake
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      STORAGE_PROVIDER: local
    volumes:
      - ./backend:/app
      - /app/node_modules
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
  
  frontend:
    build: ./frontend
    environment:
      VITE_API_URL: http://localhost:3000
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "5173:5173"
    depends_on:
      - backend

volumes:
  postgres_data:
```

**Kubernetes Deployment (Production):**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aibake-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: aibake-api
  template:
    metadata:
      labels:
        app: aibake-api
    spec:
      containers:
      - name: api
        image: aibake/api:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: aibake-secrets
              key: database-url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: aibake-secrets
              key: jwt-secret
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Deployment Strategy

**Blue-Green Deployment:**
1. Deploy new version to "green" environment
2. Run smoke tests on green environment
3. Switch load balancer to green environment
4. Monitor for errors
5. Keep blue environment running for quick rollback
6. After 24 hours, decommission blue environment

**Database Migration Strategy:**
1. Backup database before migration
2. Run migration in transaction (if possible)
3. Verify migration success
4. Run data validation queries
5. If migration fails, restore from backup
6. Document migration in changelog

**Zero-Downtime Deployment:**
1. Ensure backward compatibility
2. Deploy new API version alongside old version
3. Gradually shift traffic to new version
4. Monitor error rates and performance
5. Complete cutover when stable
6. Deprecate old version after transition period

### Environment Configuration

**Development Environment:**
- Local PostgreSQL database
- Local Redis cache
- Mock external services
- Debug logging enabled
- Hot reload enabled
- CORS allow all origins

**Staging Environment:**
- Managed PostgreSQL (AWS RDS/Azure Database)
- Managed Redis (AWS ElastiCache/Azure Cache)
- Real external services (test accounts)
- Info logging
- Same infrastructure as production
- Restricted CORS

**Production Environment:**
- Managed PostgreSQL with read replicas
- Managed Redis cluster
- Real external services (production accounts)
- Error/warn logging only
- Auto-scaling enabled
- Strict CORS whitelist
- SSL/TLS required
- Rate limiting enforced

### Monitoring and Observability

**Health Checks:**
```javascript
// /health endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      storage: await checkStorage()
    }
  };
  
  const allHealthy = Object.values(health.checks).every(c => c.status === 'healthy');
  const statusCode = allHealthy ? 200 : 503;
  
  res.status(statusCode).json(health);
});
```

**Metrics Collection:**
- Request count by endpoint
- Request latency (p50, p95, p99)
- Error rate by endpoint
- Database query latency
- Cache hit rate
- Active connections
- Memory usage
- CPU usage

**Logging:**
- Structured JSON logs
- Log aggregation (ELK stack or CloudWatch)
- Log retention: 30 days
- Error alerting via email/Slack
- Request tracing with correlation IDs

**Alerting Rules:**
- Error rate > 5% for 5 minutes
- Response time p95 > 1000ms for 5 minutes
- Database connection pool > 80% for 5 minutes
- Disk usage > 85%
- Memory usage > 90%
- Failed health checks for 3 consecutive checks

### Backup and Disaster Recovery

**Database Backups:**
- Automated daily full backups
- Continuous WAL archiving for point-in-time recovery
- Backup retention: 30 days
- Backup testing: monthly restore drills
- Backup storage: separate region/availability zone

**Disaster Recovery Plan:**
1. Detect outage (monitoring alerts)
2. Assess impact and root cause
3. Communicate status to users
4. Execute recovery procedure:
   - Restore database from latest backup
   - Deploy application to backup region
   - Update DNS to point to backup region
   - Verify functionality
5. Post-mortem analysis
6. Update runbooks

**Recovery Time Objective (RTO):** 4 hours
**Recovery Point Objective (RPO):** 1 hour

### Security Hardening

**Network Security:**
- Private subnets for database and cache
- Security groups restricting access
- VPN for administrative access
- DDoS protection (Cloudflare/AWS Shield)

**Application Security:**
- HTTPS only (TLS 1.3)
- HSTS headers
- Content Security Policy
- Rate limiting per IP and per user
- Input validation and sanitization
- SQL injection prevention (parameterized queries)
- XSS prevention (output encoding)
- CSRF protection (double-submit cookie)

**Data Security:**
- Encryption at rest (database, backups, storage)
- Encryption in transit (TLS)
- Password hashing (bcrypt, 12 rounds)
- JWT token signing (HS256 or RS256)
- Secrets management (AWS Secrets Manager/HashiCorp Vault)
- Regular security audits
- Dependency vulnerability scanning

**Compliance:**
- GDPR compliance (data privacy, right to deletion)
- Data retention policies
- Audit logging
- User consent management
- Privacy policy and terms of service

---

## Summary

This design document provides a comprehensive blueprint for implementing the AiBake system, a professional-grade baking recipe management platform for Indian home bakers. The design covers:

- **System Architecture**: Multi-tier architecture with clear separation of concerns, supporting horizontal scaling and high availability
- **Database Design**: PostgreSQL schema with 15+ core tables plus MVP extensions for inventory, costing, and social media features
- **API Design**: RESTful API with 50+ endpoints covering all system functionality
- **Business Logic**: Detailed algorithms for unit conversion, recipe scaling, cost calculation, pricing, and inventory management
- **Integration Design**: WhatsApp Business API, speech-to-text services, and image generation for social media
- **Error Handling**: Comprehensive error classification, recovery mechanisms, and graceful degradation
- **Testing Strategy**: Four-level testing pyramid with property-based testing for mathematical operations
- **Deployment Design**: Container-based deployment with Kubernetes orchestration, blue-green deployment strategy, and comprehensive monitoring

The design prioritizes the unique needs of Indian home bakers with INR currency support, Hindi/English bilingual interface, Indian ingredients and measurement units, WhatsApp integration, and Instagram-optimized recipe card export.

**Key Design Decisions:**
1. All ingredient quantities stored in canonical grams for mathematical accuracy
2. Original display units preserved for user experience
3. Property-based testing for mathematical operations (unit conversion, scaling, cost calculation)
4. Transaction-based operations for data consistency
5. Graceful degradation when external services fail
6. Mobile-first responsive design with touch-friendly controls
7. Offline support for core recipe viewing functionality

The system is designed to be implementation-ready, with sufficient detail for developers to begin coding immediately while maintaining flexibility for technology stack choices within the specified constraints.
