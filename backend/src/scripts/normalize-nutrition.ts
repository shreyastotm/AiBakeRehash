/**
 * normalize-nutrition.ts
 * One-time script to normalize all nutrition_per_100g JSONB in ingredient_master.
 * 
 * Run with: npx ts-node src/scripts/normalize-nutrition.ts
 * OR:       node --loader ts-node/esm src/scripts/normalize-nutrition.ts
 */

import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ── Sugar Classification ─────────────────────────────────────────────────────
// Returns the fraction of total sugar that is "added" based on ingredient name/category.
// added_sugar_g = total_sugar_g * addedRatio
function getAddedSugarRatio(name: string, category: string): number {
  const n = name.toLowerCase();
  const c = category?.toLowerCase() || '';

  // 100% added — pure sweeteners
  if (
    n.includes('sugar') ||
    n.includes('icing sugar') ||
    n.includes('powdered sugar') ||
    n.includes('caster sugar') ||
    n.includes('syrup') ||
    n.includes('molasses') ||
    n.includes('treacle') ||
    n.includes('glucose') ||
    n.includes('fructose') ||
    n.includes('sucrose') ||
    n.includes('dextrose') ||
    n.includes('maltose') ||
    n.includes('agave')
  ) return 1.0;

  // ~100% added — sweeteners (honey is added even though natural)
  if (n.includes('honey') || n.includes('nectar')) return 1.0;

  // Processed / heavily sweetened products — partially added
  if (n.includes('glace') || n.includes('glacé') || n.includes('candied')) return 0.65;
  if (n.includes('mixed peel') || n.includes('candied peel')) return 0.80;
  if (n.includes('marzipan') || n.includes('almond paste')) return 0.88;
  if (n.includes('fondant') || n.includes('icing')) return 1.0;
  if (n.includes('jam') || n.includes('preserve') || n.includes('marmalade')) return 0.75;
  if (n.includes('custard') && (n.includes('pour') || n.includes('ready'))) return 0.60;
  if (n.includes('condensed milk') || n.includes('sweetened')) return 0.60;
  if (n.includes('chocolate') && !n.includes('dark')) return 0.60;
  if (n.includes('dark chocolate') || n.includes('cocoa')) return 0.30;

  // Natural fruit — 0% added
  if (
    c === 'fruit' ||
    n.includes('raisin') || n.includes('sultana') || n.includes('currant') ||
    n.includes('date') || n.includes('fig') || n.includes('prune') ||
    n.includes('apricot') || n.includes('cherry') || n.includes('cranberry') ||
    n.includes('blueberry') || n.includes('strawberry') || n.includes('raspberry') ||
    n.includes('orange') || n.includes('lemon') || n.includes('lime') ||
    n.includes('banana') || n.includes('mango') || n.includes('pineapple') ||
    n.includes('apple') || n.includes('pear') || n.includes('peach') ||
    n.includes('grape') || n.includes('plum') || n.includes('berry')
  ) return 0.0;

  // Dairy — 0% added (lactose is natural)
  if (
    c === 'dairy' ||
    n.includes('milk') || n.includes('cream') || n.includes('butter') ||
    n.includes('yogurt') || n.includes('ghee') || n.includes('cheese')
  ) return 0.0;

  // Flour, grains, eggs, nuts, spices — 0%
  if (c === 'flour' || c === 'egg' || c === 'nut' || c === 'spice' || c === 'leavening') return 0.0;
  if (n.includes('flour') || n.includes('egg') || n.includes('yeast') || n.includes('salt')) return 0.0;

  // Default: unknown — treat as 0 (safer than over-estimating added sugars)
  return 0.0;
}

// ── Known ground-truth values for common baking ingredients ─────────────────
// Keyed by lowercase name fragment. Order matters: more specific first.
// Format: [energy_kcal, protein_g, fat_g, carbs_g, sugar_g, added_sugar_g, fiber_g]
const KNOWN_VALUES: Array<[string | RegExp, number[]]> = [
  // Sweeteners (sugar_g = added_sugar_g)
  [/brown sugar|caster sugar|icing sugar|granulated sugar|white sugar|cane sugar|castor sugar/, [387, 0, 0, 99.7, 99.7, 99.7, 0]],
  [/molasses|treacle/, [290, 0, 0.1, 74.7, 74.7, 74.7, 0]],
  [/golden syrup|corn syrup|glucose syrup|maple syrup/, [310, 0.2, 0, 82.6, 79, 79, 0]],
  [/honey/, [304, 0.4, 0, 82.4, 82.1, 82.1, 0.2]],
  [/agave/, [310, 0.1, 0.4, 76, 68, 68, 0]],
  // Processed / partially added sugar
  [/glac.{0,3}cherr|candied cherr/, [254, 0.4, 0.1, 63, 60, 40, 1]],
  [/mixed peel|candied peel|lemon peel|orange peel/, [250, 0.6, 0.2, 62, 60, 48, 4]],
  [/marzipan|almond paste/, [439, 9, 23, 49, 50, 45, 3]],
  [/fondant|royal icing|sugar paste/, [380, 0.5, 0, 94, 88, 88, 0]],
  [/pour.* custard|ready.*custard|custard sauce/, [95, 2.8, 3.0, 14.8, 12, 8, 0]],
  [/dark chocolate|bittersweet chocolate/, [612, 5.5, 43.1, 45.8, 24, 18, 11]],
  [/milk chocolate/, [535, 7.7, 29.7, 59.4, 52, 48, 1.5]],
  [/white chocolate/, [539, 5.9, 32.1, 59.2, 59, 59, 0]],
  [/chocolate chip/, [488, 6.9, 27.8, 59.6, 48, 40, 7]],
  [/jam|marmalade|preserve/, [250, 0.5, 0.1, 65, 58, 55, 1]],
  [/condensed milk|sweetened.*milk/, [321, 8.7, 8.7, 54.4, 54.4, 45, 0]],
  // Fruits — added_sugar_g = 0
  [/raisin|sultana|currant/, [299, 3.1, 0.5, 79.2, 59.2, 0, 3.7]],
  [/medjool date|deglet date|dried date|pitted date/, [277, 1.8, 0.2, 74.9, 63, 0, 6.7]],
  [/^date$|^dates$/, [282, 2.5, 0.4, 75.3, 63.4, 0, 8]],
  [/dried apricot|diced.*apricot/, [241, 3.4, 0.5, 62.6, 53.4, 0, 7.3]],
  [/fresh apricot|apricot/, [48, 1.4, 0.4, 11.1, 9.2, 0, 2]],
  [/cherry|cherries/, [63, 1.1, 0.2, 16, 12.8, 0, 2.1]],
  [/cranberr/, [46, 0.4, 0.1, 12.2, 4.3, 0, 4.6]],
  [/blueberr/, [57, 0.7, 0.3, 14.5, 9.7, 0, 2.4]],
  [/strawberr/, [33, 0.7, 0.3, 7.7, 4.9, 0, 2]],
  [/raspberr/, [52, 1.2, 0.7, 11.9, 4.4, 0, 6.5]],
  [/banana/, [89, 1.1, 0.3, 22.8, 12.2, 0, 2.6]],
  [/mango/, [60, 0.8, 0.4, 15, 13.7, 0, 1.6]],
  [/pineapple/, [50, 0.5, 0.1, 13.1, 9.9, 0, 1.4]],
  [/apple juice/, [46, 0.1, 0.1, 11.3, 10, 0, 0.1]],
  [/orange juice/, [45, 0.7, 0.2, 10.4, 8.4, 0, 0.2]],
  [/fig/, [249, 3.3, 0.9, 63.9, 47.9, 0, 9.8]],
  // Dairy / Eggs — added_sugar_g = 0
  [/whole milk|full fat milk/, [61, 3.2, 3.3, 4.8, 4.8, 0, 0]],
  [/skimmed milk|skim milk|low fat milk/, [34, 3.4, 0.1, 5, 5, 0, 0]],
  [/cream cheese/, [342, 5.9, 34.4, 4.1, 3.8, 0, 0]],
  [/double cream|heavy cream/, [454, 1.7, 48, 2.8, 2.7, 0, 0]],
  [/single cream/, [193, 2.7, 19.1, 3.7, 3.5, 0, 0]],
  [/sour cream/, [193, 2.9, 20, 2.9, 2.8, 0, 0]],
  [/yogurt|yoghurt/, [61, 3.5, 3.3, 4.7, 4.7, 0, 0]],
  [/unsalted butter|salted butter|^butter$/, [717, 0.9, 81.1, 0.1, 0.1, 0, 0]],
  [/ghee/, [900, 0.5, 99.8, 0, 0, 0, 0]],
  [/egg/, [143, 12.6, 9.5, 0.7, 0.4, 0, 0]],
  // Flours / Starches — sugar_g and added_sugar_g are both tiny
  [/all.purpose flour|plain flour/, [364, 10.3, 1, 76.3, 0.3, 0, 2.7]],
  [/whole wheat flour|wholemeal flour/, [340, 13.2, 2.5, 72, 0.4, 0, 10.7]],
  [/bread flour|strong flour/, [361, 12, 1.7, 72.5, 0.4, 0, 2.7]],
  [/cake flour|self.raising flour/, [353, 8.9, 1.2, 75.9, 0.3, 0, 2.5]],
  [/rice flour/, [366, 6, 1.4, 80.1, 0.1, 0, 2.4]],
  [/almond flour|almond meal/, [571, 21, 49, 21.6, 4.4, 0, 12.5]],
  [/coconut flour/, [400, 19.3, 14.8, 58.5, 6.7, 0, 45.5]],
  [/tapioca|arrowroot|cornstarch|corn starch|cornflour/, [357, 0.2, 0, 88.7, 0, 0, 0.9]],
  // Fats / Oils
  [/vegetable oil|sunflower oil|canola oil|rapeseed oil|corn oil/, [884, 0, 100, 0, 0, 0, 0]],
  [/olive oil/, [884, 0, 100, 0, 0, 0, 0]],
  [/coconut oil/, [862, 0, 99.1, 0, 0, 0, 0]],
  [/shortening/, [884, 0, 100, 0, 0, 0, 0]],
  // Leavening / Salt
  [/baking powder/, [53, 0, 0, 27.7, 0, 0, 0.2]],
  [/baking soda|bicarbonate of soda|sodium bicarbonate/, [0, 0, 0, 0, 0, 0, 0]],
  [/active dry yeast|instant yeast|dry yeast/, [325, 40, 7.6, 41.2, 0, 0, 26.9]],
  [/^salt$|sea salt|table salt/, [0, 0, 0, 0, 0, 0, 0]],
  // Nuts / Seeds
  [/walnut/, [654, 15.2, 65.2, 13.7, 2.6, 0, 6.7]],
  [/almond/, [579, 21.2, 49.9, 21.6, 4.4, 0, 12.5]],
  [/cashew/, [553, 18.2, 43.9, 30.2, 5.9, 0, 3.3]],
  [/pistachio/, [562, 20.2, 45.4, 27.5, 7.7, 0, 10.6]],
  [/pecan/, [691, 9.2, 71.9, 13.9, 3.97, 0, 9.6]],
  [/hazelnut/, [628, 15, 60.7, 16.7, 4.3, 0, 9.7]],
  [/desiccated coconut|shredded coconut/, [592, 6, 56.8, 24.3, 7, 0, 15.4]],
  // Spices / Flavourings
  [/vanilla extract|vanilla bean|vanilla/, [288, 0.1, 0.1, 12.6, 12.6, 0, 0]],
  [/cinnamon/, [247, 3.9, 1.2, 80.6, 2.2, 0, 53.1]],
  [/mixed spice|pumpkin spice|garam masala/, [250, 7, 8, 50, 5, 0, 20]],
  [/nutmeg/, [525, 5.8, 36.3, 49.3, 2.99, 0, 20.8]],
  [/cardamom/, [311, 11, 6.7, 68.5, 0, 0, 28]],
  [/ginger/, [80, 1.8, 0.8, 18, 1.7, 0, 2]],
];

function lookupKnownValues(name: string): number[] | null {
  const lower = name.toLowerCase().trim();
  for (const [pattern, values] of KNOWN_VALUES) {
    if (typeof pattern === 'string') {
      if (lower.includes(pattern)) return values;
    } else {
      if (pattern.test(lower)) return values;
    }
  }
  return null;
}

// ── Normalize a single nutrition_per_100g object ──────────────────────────────
function normalizeNutrition(raw: Record<string, any>, name: string, category: string): Record<string, any> {
  // First, check if we have a known ground-truth value
  const known = lookupKnownValues(name);
  if (known) {
    const [energy_kcal, protein_g, fat_g, carbs_g, sugar_g, added_sugar_g, fiber_g] = known;
    return { energy_kcal, protein_g, fat_g, carbs_g, sugar_g, added_sugar_g, fiber_g };
  }

  // Otherwise normalize from existing data
  const totalSugar = Number(
    raw.sugar_g ?? raw.sugars_g ?? raw.sugars_grams ?? raw.sugar_grams ?? raw.total_sugar_g ?? 0
  );
  const fiber = Number(raw.fiber_g ?? raw.fiber_grams ?? raw.dietary_fiber_g ?? raw.fibre_g ?? 0);
  const ratio = getAddedSugarRatio(name, category);
  const addedSugar = +(totalSugar * ratio).toFixed(2);

  return {
    energy_kcal: Number(raw.energy_kcal ?? raw.calories ?? 0),
    protein_g:   Number(raw.protein_g ?? raw.proteins_grams ?? raw.protein_grams ?? 0),
    fat_g:       Number(raw.fat_g ?? raw.fats_grams ?? raw.fat_grams ?? 0),
    carbs_g:     Number(raw.carbs_g ?? raw.carbs_grams ?? raw.carbohydrates_g ?? 0),
    sugar_g:       +totalSugar.toFixed(2),
    added_sugar_g: addedSugar,
    fiber_g:       +fiber.toFixed(2),
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function run() {
  const DRY_RUN = process.argv.includes('--dry-run');
  const client = await pool.connect();
  try {
    console.log(`Fetching all ingredient_master rows... DRY_RUN=${DRY_RUN}`);
    const res = await client.query(
      'SELECT id, name, category, nutrition_per_100g FROM ingredient_master ORDER BY name ASC'
    );

    console.log(`Found ${res.rows.length} ingredients. Normalizing...\n`);
    let updated = 0;
    let skipped = 0;

    for (const row of res.rows) {
      if (!row.nutrition_per_100g) {
        console.log(`  ⊘ [NO DATA] ${row.name}`);
        skipped++;
        continue;
      }

      const raw = row.nutrition_per_100g;
      const normalized = normalizeNutrition(raw, row.name, row.category);

      // Always recompute — values may be wrong even if key names are correct
      const sugarBefore = raw.sugar_g ?? raw.sugars_g ?? 0;
      const addedBefore = raw.added_sugar_g ?? raw.added_sugars_g ?? 0;
      const sugarChanged = Math.abs(normalized.sugar_g - sugarBefore) > 0.01;
      const addedChanged = Math.abs(normalized.added_sugar_g - addedBefore) > 0.01;
      const hasStaleKeys = raw.sugars_g !== undefined || raw.sugars_grams !== undefined || raw.added_sugars_g !== undefined;

      const needsUpdate = sugarChanged || addedChanged || hasStaleKeys;

      if (needsUpdate) {
        const tag = sugarChanged ? '✓ SUGAR' : addedChanged ? '✓ ADDED' : '✓ KEYS';
        console.log(
          `  ${tag} ${row.name.padEnd(35)} sugar: ${sugarBefore}→${normalized.sugar_g}g  added: ${addedBefore}→${normalized.added_sugar_g}g  fiber: ${normalized.fiber_g}g`
        );
        if (!DRY_RUN) {
          await client.query(
            'UPDATE ingredient_master SET nutrition_per_100g = $1 WHERE id = $2',
            [JSON.stringify(normalized), row.id]
          );
        }
        updated++;
      } else {
        console.log(`  · ${row.name.padEnd(35)} sugar=${normalized.sugar_g}g added=${normalized.added_sugar_g}g [OK]`);
      }
    }

    console.log(`\nNormalization complete: ${updated} updated, ${skipped} skipped (no nutrition data).`);
    if (!DRY_RUN && updated > 0) {
      console.log('Clearing nutrition cache...');
      await client.query('TRUNCATE TABLE recipe_nutrition_cache');
      console.log('✓ Cache cleared. All recipes will recalculate on next access.');
    } else if (DRY_RUN) {
      console.log('DRY RUN — no changes written. Re-run without --dry-run to apply.');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
