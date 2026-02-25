# AiBake Database Setup - Quick Reference Card

## 📁 Files Overview

You have been provided with these SQL files in order:

1. **`00_SETUP_GUIDE.md`** (THIS FILE)
   - Complete step-by-step instructions
   - DBeaver configuration guide
   - Troubleshooting tips

2. **`01_schema_init.sql`** (RUN FIRST)
   - Creates all 15 tables
   - Sets up indexes
   - Creates enum types
   - Configures triggers

3. **`02_seed_data.sql`** (RUN SECOND)
   - Loads 70+ common ingredients
   - Adds density values for conversions
   - Includes nutrition data
   - Seeds common substitutions
   - Loads emergency help database

4. **`03_test_data.sql`** (RUN THIRD - OPTIONAL)
   - Creates 2 test users
   - Adds 2 complete recipes
   - Includes journal entries
   - Calculates nutrition cache

---

## ⚡ Quick Start (3 Steps)

### Step 1: Create Database
```sql
-- In psql or DBeaver
CREATE DATABASE aibake;
```

### Step 2: Connect & Run Schema
- Open DBeaver
- Connect to `aibake` database
- Open `01_schema_init.sql`
- Execute entire script (Ctrl+X / Cmd+X)
- ✅ Verify: Should see "15 tables created"

### Step 3: Load Seed Data
- Open `02_seed_data.sql`
- Execute entire script
- ✅ Verify: Should see "70+ ingredients loaded"

### Optional: Add Test Data
- Open `03_test_data.sql`
- Execute entire script
- ✅ Verify: Should see "2 recipes created"

---

## 🔍 Quick Verification

Run this query after setup to verify everything:

```sql
-- Should return 15
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';

-- Should return 70+
SELECT COUNT(*) FROM ingredient_master;

-- Should see your test recipes
SELECT title, servings, yield_weight_grams FROM recipes;

-- View sample recipe with ingredients
SELECT 
  r.title,
  ri.display_name,
  ri.quantity_grams || 'g' as amount
FROM recipes r
JOIN recipe_ingredients ri ON ri.recipe_id = r.id
WHERE r.title LIKE '%Sourdough%'
ORDER BY ri.position;
```

---

## 📊 Database Overview

### Tables (15 total):
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

### Key Features:
- ✅ All quantities stored in grams (canonical)
- ✅ Original display units preserved
- ✅ Full-text search on recipes
- ✅ Fuzzy search on ingredients
- ✅ Foreign key constraints
- ✅ Automatic timestamp updates
- ✅ JSON support for flexible data

---

## 🎯 Important Concepts

### The Canonical Grams Rule
**ALL math uses `quantity_grams` field**
- Original units stored for display only
- Prevents conversion errors
- Enables precise scaling
- Example: Recipe calls for "1 cup flour"
  - Stored as: `quantity_original: 1, unit_original: "cup", quantity_grams: 125`
  - All calculations use: `125g`

### Unit Conversion Formula
```
volume (ml) × density (g/ml) = weight (grams)

Example:
1 cup flour = 236.588 ml
flour density = 0.53 g/ml
236.588 × 0.53 = 125g
```

### Scaling Recipe Formula
```
scaling_factor = target_yield / original_yield

new_quantity_grams = quantity_grams × scaling_factor

Example:
Original: 500g flour in 850g loaf
Target: 1700g (double batch)
Factor: 1700 / 850 = 2.0
New: 500g × 2.0 = 1000g flour
```

---

## 💡 Useful DBeaver Tips

### View Entity Relationship Diagram (ERD)
- Right-click database → "View Diagram"
- See all table relationships visually

### Export Data
- Right-click table → "Export Data"
- Choose CSV, JSON, SQL, or Excel

### Format SQL
- Write messy SQL
- Press `Ctrl+Shift+F` (Windows) or `Cmd+Shift+F` (Mac)
- Automatically formatted!

### Auto-Complete
- Start typing table or column name
- Press `Ctrl+Space`
- Select from dropdown

### Quick Data View
- Right-click table → "View Data"
- Edit inline, commit changes

---

## 🔧 Common Tasks

### Add New Ingredient
```sql
INSERT INTO ingredient_master (
  name, 
  category, 
  default_density_g_per_ml,
  nutrition_per_100g
) VALUES (
  'ingredient name',
  'category',  -- flour, fat, sugar, dairy, etc.
  0.85,        -- density in g/ml
  '{"energy_kcal": 300, "protein_g": 5, "fat_g": 2, "carbs_g": 60}'::jsonb
);
```

### Add New Recipe (Simplified)
```sql
-- 1. Insert recipe
INSERT INTO recipes (user_id, title, servings, yield_weight_grams, status)
VALUES ('your-user-id', 'Recipe Name', 8, 1200, 'active')
RETURNING id;

-- 2. Add ingredients (use returned ID)
INSERT INTO recipe_ingredients (
  recipe_id, 
  ingredient_master_id, 
  display_name, 
  quantity_grams,
  position
) VALUES (
  'recipe-id-from-above',
  (SELECT id FROM ingredient_master WHERE name = 'flour'),
  'All-purpose flour',
  250,
  1
);
```

### Find Ingredient by Fuzzy Search
```sql
-- Find ingredients similar to "flor" (finds "flour")
SELECT name, category 
FROM ingredient_master 
WHERE name % 'flor'  -- % is similarity operator
ORDER BY similarity(name, 'flor') DESC
LIMIT 5;
```

### Calculate Recipe Nutrition
```sql
SELECT 
  r.title,
  SUM((im.nutrition_per_100g->>'energy_kcal')::numeric * ri.quantity_grams / 100) as total_calories,
  SUM((im.nutrition_per_100g->>'protein_g')::numeric * ri.quantity_grams / 100) as total_protein_g
FROM recipes r
JOIN recipe_ingredients ri ON ri.recipe_id = r.id
JOIN ingredient_master im ON im.id = ri.ingredient_master_id
WHERE r.id = 'your-recipe-id'
GROUP BY r.title;
```

---

## ⚠️ Common Errors & Fixes

### "relation [table] does not exist"
**Fix:** Run `01_schema_init.sql` first

### "insert or update violates foreign key constraint"
**Fix:** Make sure referenced record exists
```sql
-- Check if ingredient exists before referencing
SELECT id FROM ingredient_master WHERE name = 'flour';
```

### "duplicate key value violates unique constraint"
**Fix:** Record with that key already exists
```sql
-- Use UPDATE instead of INSERT
-- Or use UPSERT (INSERT ... ON CONFLICT)
```

### "column [name] does not exist"
**Fix:** Check spelling, case sensitivity

---

## 📝 Sample Queries

### List all recipes with ingredient counts
```sql
SELECT 
  r.title,
  r.servings,
  COUNT(ri.id) as ingredient_count,
  r.yield_weight_grams || 'g' as yield
FROM recipes r
LEFT JOIN recipe_ingredients ri ON ri.recipe_id = r.id
GROUP BY r.id;
```

### Find recipes using specific ingredient
```sql
SELECT DISTINCT r.title
FROM recipes r
JOIN recipe_ingredients ri ON ri.recipe_id = r.id
JOIN ingredient_master im ON im.id = ri.ingredient_master_id
WHERE im.name = 'chocolate chips';
```

### View full recipe with steps
```sql
SELECT 
  r.title,
  rs.title as section,
  rst.position,
  rst.instruction,
  CASE 
    WHEN rst.duration_seconds IS NOT NULL 
    THEN (rst.duration_seconds / 60)::text || ' min'
    ELSE ''
  END as duration
FROM recipes r
JOIN recipe_sections rs ON rs.recipe_id = r.id
JOIN recipe_steps rst ON rst.section_id = rs.id
WHERE r.id = 'your-recipe-id'
ORDER BY rs.position, rst.position;
```

---

## 🎉 You're All Set!

Your AiBake database is now configured and ready for development.

**Next Steps:**
1. ✅ Explore the data in DBeaver
2. ✅ Try the sample queries
3. ✅ Connect your application
4. ✅ Start building features!

**Connection String for Your App:**
```
postgresql://username:password@localhost:5432/aibake
```

---

## 📚 Additional Resources

- **Setup Guide**: `00_SETUP_GUIDE.md` (detailed instructions)
- **Technical Docs**: `AiBake_Complete_Technical_Architecture_v2.md`
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **DBeaver Wiki**: https://github.com/dbeaver/dbeaver/wiki

---

## 🆘 Need Help?

1. Check `00_SETUP_GUIDE.md` for detailed troubleshooting
2. Review PostgreSQL logs
3. Check DBeaver error log (Help → Error Log)
4. Verify PostgreSQL is running: `sudo systemctl status postgresql`

---

**Happy Baking! 🍞**
