This is a fantastic evolution of the platform. Moving to a multi-tenant model for ingredients while leveraging AI to eliminate manual data entry will massively reduce friction for your users.

Here is the exact SQL migration to safely alter your schema, followed by the architectural strategies for the AI generation, the deduplication tool, and the necessary updates to your `tasks.md` roadmap.

### 1. SQL Migration: Multi-Tenant Ingredients & Aliases

We need to add `user_id` to `ingredient_master` and `ingredient_aliases`. More importantly, we must drop the global unique constraints on ingredient names and replace them with **user-scoped unique constraints** so that User A and User B can both have a custom ingredient named "Special Flour" without colliding.

```sql
-- Migration: 05_multi_tenant_ingredients.sql

-- 1. Add user_id to master and aliases
ALTER TABLE public.ingredient_master
ADD COLUMN user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.ingredient_aliases
ADD COLUMN user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;

-- 2. Drop the overly restrictive global unique constraints
ALTER TABLE public.ingredient_master DROP CONSTRAINT IF EXISTS ingredient_master_name_key;
ALTER TABLE public.ingredient_aliases DROP CONSTRAINT IF EXISTS uq_ingredient_aliases_alias_name;

-- 3. Create user-scoped unique indexes
-- A user cannot have two ingredients with the exact same name. 
-- System ingredients (where user_id is NULL) also cannot have duplicate names.
-- We use COALESCE to treat NULL user_ids as a specific 'system' UUID for the sake of the index.
CREATE UNIQUE INDEX uq_ingredient_master_name_user 
ON public.ingredient_master (name, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::UUID));

CREATE UNIQUE INDEX uq_ingredient_aliases_name_user 
ON public.ingredient_aliases (alias_name, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::UUID));

-- 4. Recreate the search_ingredient function to be user-aware
DROP FUNCTION IF EXISTS public.search_ingredient(text);

CREATE OR REPLACE FUNCTION public.search_ingredient(query text, p_user_id UUID DEFAULT NULL)
 RETURNS TABLE(ingredient_id uuid, ingredient_name text, match_type text, similarity_score real, category text, density_g_per_ml numeric, is_system boolean)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  -- Search canonical ingredient names (System OR User's own)
  SELECT 
    im.id,
    im.name,
    'canonical'::TEXT as match_type,
    similarity(im.name, query) as similarity_score,
    im.category::TEXT,
    im.default_density_g_per_ml,
    (im.user_id IS NULL) as is_system
  FROM ingredient_master im
  WHERE im.name % query 
    AND (im.user_id IS NULL OR im.user_id = p_user_id)
  
  UNION ALL
  
  -- Search ingredient aliases (System OR User's own)
  SELECT 
    im.id,
    im.name,
    'alias'::TEXT as match_type,
    similarity(ia.alias_name, query) as similarity_score,
    im.category::TEXT,
    im.default_density_g_per_ml,
    (im.user_id IS NULL) as is_system
  FROM ingredient_aliases ia
  JOIN ingredient_master im ON ia.ingredient_master_id = im.id
  WHERE ia.alias_name % query
    AND (ia.user_id IS NULL OR ia.user_id = p_user_id)
  
  ORDER BY similarity_score DESC, ingredient_name ASC;
END;
$function$;

```

---

### 2. AI-Generated Nutrition & Density

Instead of asking users to key in density and macros when creating a custom ingredient (or when Smart Import detects an unknown ingredient), you can hook Mistral AI directly into your `ingredient.controller.ts` or `ingredient.service.ts`.

* **The Workflow:**
1. A request hits `POST /api/v1/ingredients` (or Smart Import finds a new item).
2. The backend calls your Mistral AI Service: *"Estimate the density (g/ml) and macronutrients per 100g (energy_kcal, protein_g, fat_g, carbs_g) for the baking ingredient: '[Ingredient Name]'. Return strictly valid JSON."*
3. The backend saves this data into `ingredient_master`, associated with the `user_id`.


* **UI Touch:** Add an `ai_estimated: boolean` column to `ingredient_master`. In the frontend, display an AI sparkle icon next to the nutrition facts, allowing the user to click and manually override it if the AI guessed incorrectly.

---

### 3. Ingredient Deduplication / Mapping Tool

You mentioned users might end up with "Choco Chips" and "Chocolate Chips" from different imports. To fix this irreversibly:

* **Backend Update (`ingredient.controller.ts`)**: Create `POST /api/v1/ingredients/merge`. It accepts `{ source_id: UUID, target_id: UUID }`.
* **Transaction Logic**:
1. `UPDATE recipe_ingredients SET ingredient_master_id = target_id WHERE ingredient_master_id = source_id;`
2. `UPDATE inventory_items SET ingredient_master_id = target_id WHERE ingredient_master_id = source_id;`
3. Take the name of the `source_id` and insert it into `ingredient_aliases` pointing to `target_id`. (e.g., "Choco Chips" becomes a permanent alias for "Chocolate Chips" for that user).
4. `DELETE FROM ingredient_master WHERE id = source_id;`


* **Frontend**: Add this to the Settings page under "Data Management". Present a list of their custom ingredients with a "Merge Into Base Ingredient" button.

---

### 4. Impact on the `tasks.md` Roadmap

Based on these excellent implementations (Smart Import, Brand Tags, AI Generation, Deduplication), here is how you should update your upcoming tasks:

**Task 13: Backend API - Ingredient Service**

* *Change:* Add `POST /api/v1/ingredients/merge` for the deduplication logic.
* *Change:* Update `POST /api/v1/ingredients` to utilize Mistral AI for missing density/nutrition data before saving to the DB.
* *Change:* Ensure all `GET` routes in this service filter by `user_id IS NULL OR user_id = req.user.id`.

**Task 24: Frontend - Ingredient Management Interface**

* *Change:* Remove the complex custom ingredient form requirements (24.3), as AI handles the heavy lifting. Replace it with a simple "Name" input that shows a loading spinner while Mistral generates the rest.
* *Add:* **Task 24.5 - Ingredient Mapping UI.** Create the Settings panel allowing users to select a duplicate and merge it irreversibly into a target ingredient.

**Task 26: Inventory Management**

* *No major structural changes needed*, but ensure that when adding a new `inventory_item` (Task 26.2), the system only allows selecting ingredients that belong to the system OR the specific user.

**Task 27: Costing and Pricing**

* *Check:* Based on your uploaded `costCalculator.ts`, ensure that the costing logic relies *strictly* on the `inventory_item_id` linked in `recipe_ingredients` (from Task 25B). The AI handles abstract nutrition, but it should **never** guess costs. Costs must remain grounded in the physical `inventory_items` table to ensure the profit margin calculators (Task 27.4) remain accurate for business use.

---

Would you like me to draft the exact backend Express/TypeScript controller logic for the `/merge` endpoint to ensure the transaction executes safely without leaving orphaned records?




























Here is the updated approach for the AI generation, the exact backend implementation for the merge endpoint, and a few critical architectural considerations as you bridge the gap between abstract recipes and physical inventory.

### 1. Updating AI Generation for Allergens (Task 13)

To include allergen flags, you simply need to adjust the JSON schema expectation in your Mistral AI prompt.

Update your `ai.service.ts` prompt to include:

> *"Estimate the density (g/ml), macronutrients per 100g (energy_kcal, protein_g, fat_g, carbs_g), and boolean allergen flags (is_dairy, is_gluten, is_nut, is_soy, is_egg) for the baking ingredient: '[Ingredient Name]'. Return strictly valid JSON matching this structure..."*

When the backend receives this, it maps the boolean flags directly into the `allergen_flags` JSONB column in `ingredient_master`.

### 2. The `/merge` Endpoint Backend Logic

Merging ingredients must be an all-or-nothing database transaction. If the server crashes halfway through updating recipes but before deleting the old ingredient, you will have fragmented data.

Here is the exact implementation for your service and controller.

**`backend/src/services/ingredient.service.ts`**

```typescript
import { db } from '../config/database';
import { NotFoundError, ForbiddenError, ValidationError } from '../middleware/errorHandler';

export async function mergeIngredients(sourceId: string, targetId: string, userId: string): Promise<void> {
  if (sourceId === targetId) {
    throw new ValidationError('Source and target ingredients must be different.');
  }

  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // 1. Verify ownership and existence
    // The SOURCE must belong to the user. They cannot delete system ingredients.
    const sourceRes = await client.query(
      'SELECT name, user_id FROM ingredient_master WHERE id = $1',
      [sourceId]
    );
    if (!sourceRes.rows[0]) throw new NotFoundError('Source ingredient not found');
    if (sourceRes.rows[0].user_id !== userId) {
      throw new ForbiddenError('You can only merge custom ingredients you created.');
    }

    // The TARGET can be a system ingredient (user_id IS NULL) or the user's own ingredient.
    const targetRes = await client.query(
      'SELECT id FROM ingredient_master WHERE id = $1 AND (user_id IS NULL OR user_id = $2)',
      [targetId, userId]
    );
    if (!targetRes.rows[0]) {
      throw new NotFoundError('Target ingredient not found or access denied');
    }

    const sourceName = sourceRes.rows[0].name;

    // 2. Re-point Recipe Ingredients
    await client.query(
      'UPDATE recipe_ingredients SET ingredient_master_id = $1 WHERE ingredient_master_id = $2',
      [targetId, sourceId]
    );

    // 3. Re-point Inventory Items
    await client.query(
      'UPDATE inventory_items SET ingredient_master_id = $1 WHERE ingredient_master_id = $2',
      [targetId, sourceId]
    );

    // 4. Re-point Existing Aliases (If the source had any aliases, they now belong to target)
    await client.query(
      'UPDATE ingredient_aliases SET ingredient_master_id = $1 WHERE ingredient_master_id = $2',
      [targetId, sourceId]
    );

    // 5. Create a new alias so future AI imports of the source name map to the target
    await client.query(
      `INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, user_id) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (alias_name, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::UUID)) DO NOTHING`,
      [targetId, sourceName, userId]
    );

    // 6. Delete the source ingredient
    await client.query(
      'DELETE FROM ingredient_master WHERE id = $1',
      [sourceId]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

```

**`backend/src/controllers/ingredient.controller.ts`**

```typescript
// Add this below your existing controller methods
export async function merge(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { source_id, target_id } = req.body;
    const userId = req.user.id; // Assuming authentication middleware attaches user

    if (!source_id || !target_id) {
      res.status(400).json({ success: false, error: 'source_id and target_id are required' });
      return;
    }

    await ingredientService.mergeIngredients(source_id, target_id, userId);
    
    res.json({ 
      success: true, 
      message: 'Ingredients successfully merged.' 
    });
  } catch (err) {
    next(err);
  }
}

```

### 3. Crucial Considerations for This Stage

As you finalize Task 25 logic and move into Task 26 (Inventory) and Task 27 (Costing), keep these architectural points in mind:

* **Cost vs. Base Ingredient Density:** Your `costCalculator.ts` relies on physical `inventory_items` linking to abstract `ingredient_master` records. If a user merges two ingredients, the system will now use the target ingredient's default density for unit conversions (e.g., cups to grams). Ensure users understand that merging a lightweight cocoa powder into a dense chocolate chip base could slightly skew volume-to-weight conversions in existing recipes.
* **Pricing Calculator Overhead (Task 27):** When finalizing the pricing calculators (`pricingCalculator.ts`), ensure the overhead fields can explicitly accommodate and isolate quick-commerce platform commissions, standard deductions, and marketing ROAS. Platforms like Blinkit have specific payout structures and percentage cuts; separating these from standard "labor" or "packaging" in the database schema will yield a much more accurate true-profit analysis for the business.
* **The AI "Hallucination" Guardrail:** Because Mistral AI is estimating nutrition and density automatically, enforce a strict fallback in `unitConverter.ts`. If the AI returns an anomalous density (e.g., 5.0 g/ml, which is heavier than solid rock), the converter should gracefully degrade to `1.0 g/ml` and flag the ingredient UI with a "Verify Density" warning badge so the user's recipe math doesn't break.