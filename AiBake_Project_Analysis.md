# AiBake — Project Analysis: Features, Gaps & Ideation
**Date:** March 2026 | **Status:** Backend & Frontend In-Progress | **DB Layer:** Complete ✅

---

## 1. Project Overview

AiBake is a full-stack baking management platform built specifically for **Indian home bakers and small baking businesses**. The core proposition sits at the intersection of baker's science, business operations, and Indian market localization.

**Tech Stack:** PostgreSQL 15+ · Node.js/Express · React/TypeScript · Mistral AI · Tailwind CSS · Docker

---

## 2. What Has Been Built

### 2.1 Database Layer (Complete ✅)
The data foundation is thorough and production-grade:
- **24 tables** covering users, recipes, ingredients, inventory, costing, journal, social, and analytics
- **8 custom ENUM types** for domain-specific categorization
- **44 indexes** including trigram indexes for fuzzy ingredient search
- **70+ seeded ingredients** with density, nutrition, and allergen data; Hindi transliterations included
- **5 custom DB functions** — fuzzy search, composite ingredient expansion, nutrition calculation, hydration %, full recipe JSON retrieval
- **Multi-tenant ingredient model** — system-level ingredients + user-owned custom ingredients with user-scoped unique constraints
- Advanced baking science fields: water activity (aw), hydration %, baking loss, shelf life estimation

### 2.2 Backend Services (In-Progress)
Solid service architecture with:
- **Auth** — JWT-based login/register, bcrypt hashing, rate limiting (3 tiers)
- **Recipe** — CRUD, versioning, AI-powered smart import (text / URL / file)
- **Ingredient** — fuzzy search, multi-tenant management, AI-estimated nutrition + density
- **Inventory** — stock tracking, purchase history, supplier management
- **Costing** — recipe cost breakdown (ingredient + overhead + packaging + labor), pricing calculator, profit analysis
- **Social** — Instagram recipe card export, WhatsApp share
- **Journal** — baking log entries with photo upload, audio notes (voice-to-text)
- **AI Service (Mistral)** — water activity estimation, shelf life prediction, recipe parsing from text/URL/image

### 2.3 Frontend (In-Progress)
Pages: Dashboard (basic), Recipes (List/Detail/Form), Journal (List/Detail/New/Edit), Settings

Component library: 30+ reusable common components (Button, Modal, Toast, Input, ProgressBar, Skeleton, Autocomplete, TagInput, CurrencyInput, DatePicker, etc.)

Domain components:
- **Recipe:** RecipeCard, IngredientList, ScalingControl, NutritionDisplay, StepList, AIMeter, SmartImportModal
- **Inventory:** InventoryList, InventoryAlerts, PurchaseForm
- **Costing:** CostCalculator, PricingCalculator, ProfitAnalysis
- **Social:** RecipeCardExport (Instagram 1:1), WhatsAppShare
- **Label:** LabelDesigner + FSSAIPDFLabel ← *standout feature — FSSAI-compliant PDF label generation*
- **Journal:** AudioRecorder, ImageUpload, JournalEntryForm

State management: Zustand stores for auth, recipes, inventory, preferences, journal

### 2.4 Middleware (Complete ✅)
Pure TypeScript business logic layer (no runtime deps):
- unitConverter · recipeScaler · nutritionCalculator · hydrationCalculator · costCalculator · pricingCalculator · inventoryManager · searchEngine

---

## 3. Standout Differentiators (Strengths to Double Down On)

| Feature | Why It Matters |
|---|---|
| FSSAI PDF Label Generator | Unique in the market — home bakers in India legally need FSSAI labels; no other tool automates this with recipe data |
| AI Smart Import (text/URL/file) | Dramatically reduces recipe creation friction; Mistral handles parsing |
| Water Activity + Shelf Life (AI) | Baking science most apps ignore — builds trust with serious bakers |
| Multi-tenant Ingredient Taxonomy | User-owned custom ingredients with Hindi aliases — deeply localized |
| Baker's Science Middleware | Hydration %, baking loss, nutrition per serving — professional-grade |
| Bilingual UI (EN/HI) | Serves vernacular-first Indian home bakers who find English tools alienating |

---

## 4. Feature Gaps (Critical)

### 4.1 Dashboard — Almost Empty
**Current state:** A 4-card link grid with no data.
**Gap:** The dashboard is the daily home screen. It needs to function as a **baking command center**, not just a navigation menu.

**Ideas:**
- Today's baking plan (recipes queued for today)
- Low stock alerts surfaced from inventory
- Recent journal entries with quick-add button
- Cost snapshot — this week's revenue / spend
- Upcoming expiry warnings for perishables

### 4.2 Timer UI — Missing Despite DB Support
**Current state:** `timer_instances` table exists in DB; backend stores timer data. **No timer UI component exists.**
**Gap:** Hands-free baking (mentioned as a core feature in README) is incomplete without a working, full-screen, voice-interruptible timer UI.

**Ideas:**
- Floating, persistent timer widget that follows the user across pages
- Multiple simultaneous timers (e.g., "Preheat oven" + "Proof dough" running together)
- Push notification / audio alert on timer end
- Step-linked timers: timers auto-launch as the user progresses through recipe steps

### 4.3 Recipe Version Comparison — Data Exists, No UI
**Current state:** `recipe_versions` and `recipe_version_snapshots` tables are fully built. No version diff or comparison UI exists.
**Gap:** Bakers who iterate on recipes (the primary user) have no way to see what changed between attempts.

**Ideas:**
- Side-by-side version diff (ingredient quantities, steps)
- "Restore to version" functionality
- Tag versions: "Wedding cake test 2", "Reduced sugar batch"

### 4.4 Order Management — Logical Next Step After Costing
**Current state:** Costing, pricing, delivery zones, and suppliers all exist. But there is no order/customer management.
**Gap:** The journey from "I know my cost" → "I take an order" → "I deliver and get paid" is broken.

**Ideas:**
- Customer contact book (name, phone, address, dietary restrictions, order history)
- Order intake form: which recipe, quantity, delivery date, delivery zone, price
- Order status pipeline: Received → In Production → Ready → Delivered → Paid
- Automated cost-to-order linkage: auto-fill order cost from recipe_costs
- WhatsApp order confirmation message generation

### 4.5 Batch Production Planning — Missing for Scaling Bakers
**Current state:** Recipes scale individually. No concept of "I need to bake 5 different things this week."
**Gap:** Bakers planning for events/festivals need aggregated ingredient lists and a production schedule.

**Ideas:**
- Bake Plan: select multiple recipes × quantities → generate aggregated shopping list
- Auto-deduct from inventory when a bake plan is executed
- Batch costing: total cost across all planned recipes for an event
- Production timeline: estimated hours per recipe, suggested baking order

### 4.6 Journal Analytics — Raw Data, No Insight
**Current state:** Journal entries exist with ratings, photos, and baking loss data. No analytical view.
**Gap:** The journal is a log, not a learning tool.

**Ideas:**
- Success rate by recipe (ratio of good attempts vs. failures)
- Trend charts: average rating over time per recipe
- Correlation explorer: oven temperature vs. baking loss, humidity vs. shelf life
- "Most improved" recipe — the one with the biggest rating jump across versions
- Common failure patterns: pull from `common_issues` table to surface recurring themes

### 4.7 Hands-Free Mode — Mentioned But Not Implemented
**Current state:** README lists screen wake lock, large touch controls, and voice commands. No such UI component exists.
**Gap:** This is a stated core feature that is currently not built.

**Ideas:**
- Dedicated "Bake Mode" view: full-screen, step-by-step, giant text, no accidental taps
- Screen wake lock API (browser-native, already supported)
- Step navigation by voice: "Next step", "Repeat", "Set timer for 20 minutes"
- Web Speech API for voice commands (no backend needed for basic commands)

---

## 5. Ideation Opportunities (High-Value New Features)

### 5.1 AI Baking Troubleshooter ("Baker's Copilot")
Use the existing Mistral integration + `common_issues` table to build an in-app troubleshooter.
- User describes their problem: "My cake sank in the middle"
- AI cross-references their recipe ingredients (leavening ratio, fat content), oven temp from journal, and common_issues table
- Returns likely causes + specific fixes for *their* recipe, not generic advice
- Could be the killer differentiator vs. generic baking apps

### 5.2 Seasonal & Occasion Planner
- Diwali mithai planning, Christmas cake orders, Eid baking — festivals drive huge demand for Indian bakers
- Pre-built recipe collections for each occasion
- Auto-calculate bulk ingredient requirements across all festival recipes
- Export a WhatsApp message: "This Diwali, I'm taking orders for..."

### 5.3 Pricing Intelligence / Market Rate Benchmarking
**Current state:** ProfitAnalysis component exists for individual recipes. No market context.
**Idea:**
- Crowdsourced (anonymized) price benchmarking: "Custom cakes in Mumbai typically sell for ₹1,200–₹1,800/kg"
- Pricing suggestion engine: given your cost + local market data → recommended price range
- Alert when ingredient price increases erode margin below a threshold

### 5.4 Customer-Facing Order Mini-Site
A lightweight, shareable URL that a home baker can send to customers:
- Shows their catalogue (published recipes as products)
- Customer can select items, quantities, delivery date
- Baker receives a WhatsApp/email notification
- No payment gateway needed for MVP — just inquiry capture
- This bridges the gap between AiBake as a personal tool and AiBake as a business tool

### 5.5 Photo-First Recipe Creation (OCR + Vision)
The Smart Import modal handles text/URL/file — extend it to:
- Snap a photo of a handwritten recipe → OCR → structured recipe (Mistral vision)
- Photograph a printed cookbook page → parse recipe
- Especially relevant for Indian bakers who have recipes written in notebooks or inherited from family

### 5.6 WhatsApp Business API for Order Taking
**Current state:** WhatsApp share generates a text message. One-directional.
**Idea:**
- Integrate WhatsApp Business Cloud API
- Baker registers their WhatsApp number
- Customers message the baker's WhatsApp → bot captures order details conversationally
- Orders auto-sync into AiBake's order management (see Gap 4.4)

### 5.7 Ingredient Substitution Advisor
The `ingredient_substitutions` table exists but there's no UI surfacing it.
- When a baker edits a recipe and removes/changes an ingredient → suggest substitutions with impact warnings (moisture, structure)
- "Out of butter? Try: coconut oil (will reduce browning), ghee (adds flavor, similar fat content)"
- This reduces the friction of improvisation, which is a daily reality for Indian home bakers

### 5.8 Business Analytics Dashboard (Separate from Recipe Dashboard)
- Monthly revenue summary (from completed orders)
- Most-made recipes and their profitability
- Inventory spend trend
- Best-selling products by occasion/season
- FSSAI compliance tracker: which recipes have labels generated

### 5.9 Recipe Collections / Digital Cookbook
**Current state:** Tags exist (TagManagement in Settings). No collection/folder UI.
**Ideas:**
- Named collections: "Mom's Recipes", "Client Favorites", "Festival Specials"
- Private vs. shareable collections (a URL you can send to customers or family)
- Export collection as a PDF cookbook (using the existing PDF label skill pattern)

### 5.10 Offline-First / PWA
Indian home bakers often bake in kitchens with poor WiFi. The current app has no offline support.
- Service worker for offline recipe viewing
- Offline timer functionality (critical — timers must work without internet)
- Background sync for journal entries written offline

---

## 6. Implementation Priority Matrix

| Feature | User Impact | Build Effort | Priority |
|---|---|---|---|
| Timer UI (hands-free) | 🔴 High | 🟡 Medium | **P0 — Complete stated feature** |
| Dashboard rework | 🔴 High | 🟢 Low | **P0 — Daily engagement driver** |
| Order Management (basic) | 🔴 High | 🔴 High | **P1 — Core for biz users** |
| Ingredient Substitution UI | 🟡 Medium | 🟢 Low | **P1 — DB already done** |
| Recipe Version Diff UI | 🟡 Medium | 🟡 Medium | **P1 — DB already done** |
| AI Troubleshooter | 🔴 High | 🟡 Medium | **P1 — Killer differentiator** |
| Journal Analytics | 🟡 Medium | 🟡 Medium | **P2** |
| Batch Production Planner | 🟡 Medium | 🔴 High | **P2** |
| Bake Mode (hands-free UI) | 🔴 High | 🟡 Medium | **P2** |
| Photo Recipe Import (vision) | 🟡 Medium | 🟡 Medium | **P2** |
| Customer Order Mini-Site | 🔴 High | 🔴 High | **P3** |
| Seasonal Planner | 🟡 Medium | 🟡 Medium | **P3** |
| Offline / PWA | 🔴 High | 🔴 High | **P3** |
| WhatsApp Business API | 🟡 Medium | 🔴 High | **P3** |

---

## 7. Quick Wins (Can Be Done Now)

These require minimal new backend work and make the app feel significantly more complete:

1. **Ingredient Substitution UI** — the table exists, just add a "Substitutions" panel on the ingredient detail / recipe edit page
2. **Recipe Version History panel** — data is in DB, just add a version list + restore button to RecipeDetail
3. **Dashboard stats** — add 4 KPI cards using existing API endpoints: total recipes, inventory items, last journal entry date, total cost of goods this month
4. **InventoryAlerts on Dashboard** — component already exists, just wire it to the dashboard
5. **Common Issues Browser** — the `common_issues` table has 10+ entries; a simple searchable FAQ page adds immediate value
6. **Collection/Folder tags** — TagInput component already exists; just add a "type: collection" to tags

---

## 8. Architecture Notes & Technical Observations

- The **AI service uses Mistral** (not OpenAI), which is a solid choice for cost and Indian data compliance; consider expanding prompts to leverage Mistral's multilingual capability for Hindi instructions
- The **multi-tenant ingredient migration** (05_multi_tenant_ingredients.sql) is thoughtfully designed with COALESCE for NULL user_id indexing — this pattern should be carried to other shared-data tables if added
- **Stores are Zustand-based** — good choice; cross-tab sync hook (`useCrossTabSync`) is a nice touch for multi-device bakers
- **Storybook stories exist** for most components (`*.stories.tsx`) — great for isolated testing; ensure they're kept up to date as the component API evolves
- **importExport controller/service** exists — this should enable recipe export to JSON/CSV for backup and migration, which builds trust for SaaS users
- **`user-tag` model** suggests a tag system that spans multiple entity types — worth confirming the schema handles recipe-level, ingredient-level, and journal-level tagging uniformly

---

*Analysis generated from codebase exploration — March 2026*
