# Product Overview

AiBake is a professional baking recipe management platform designed for Indian home bakers and small-scale baking businesses.

## Core Purpose

Provide comprehensive recipe management with precise ingredient tracking, inventory management, product costing, and social media integration optimized for the Indian market.

## Key Features

- Recipe management with versioning and scaling
- Inventory tracking with automated deductions
- Product costing with profit margin analysis
- Social media export (Instagram/WhatsApp optimized)
- Hands-free baking mode with voice commands
- Bilingual interface (Hindi/English)
- INR currency and Indian measurement units

## Target Users

- Indian home bakers
- Small-scale baking businesses
- Professional bakers managing inventory and costs

## Market Localization

- Currency: INR (₹), Indian number format (₹1,23,456.78)
- Languages: Hindi (Devanagari) and English — both must be complete
- Ingredient database: Indian baking ingredients (maida, atta, besan, ghee, khoya, etc.)
- Measurement units: Metric with Indian kitchen conventions (240ml cup, 15ml tbsp)

## Domain Rules (Business Logic Invariants)

These rules represent core domain truths. Code that violates them is a bug.

### Quantities
- All weight quantities are **stored in grams** canonically; display units are a presentation concern
- All volume quantities are **stored in milliliters** canonically
- Original display values are always preserved alongside canonical values

### Recipe Scaling
- Scaling factor applied uniformly to all ingredients (ratios preserved)
- Warnings generated for scaling factor **>3x** (too large) or **<0.25x** (too small)
- Nutrition is recalculated after every scaling operation

### Hydration
- **Formula**: `hydration_percentage = (total_liquid_grams / total_flour_grams) × 100`
- Flour category: all ingredients with `category = 'flour'`
- Liquid includes both `liquid` and `dairy` categories
- Returns `null` for non-dough recipes (zero flour)

### Baking Loss
- **Formula**: `baking_loss_grams = pre_bake_weight_grams − outcome_weight_grams`
- **Formula**: `baking_loss_percentage = (baking_loss_grams / pre_bake_weight_grams) × 100`
- Calculated automatically via database trigger

### Cost and Pricing
- **Cost formula**: `total_cost = ingredient_cost + overhead_cost + packaging_cost + labor_cost`
- **Pricing formula**: `suggested_price = total_cost / (1 − target_margin_percent / 100)`
- Suggested prices are always rounded to the nearest ₹ (integer)
- Profit margin must be between 0% and 99% — ≥100% is invalid

### Water Activity (Food Safety)
- Must be between **0.00 and 1.00** (enforced via database check constraint)
- Drives `estimated_shelf_life_days` for food safety compliance
- Indian climate (higher humidity) affects safe water activity thresholds

### Inventory
- Inventory is deducted when a bake journal entry is logged (optional — user confirmation required)
- Low-stock alerts trigger when `quantity_on_hand < min_stock_level`
- Inventory deductions are transactional — partial deductions are rolled back on error
