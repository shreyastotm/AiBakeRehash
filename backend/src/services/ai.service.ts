import { Mistral } from '@mistralai/mistralai';
import dotenv from 'dotenv';

import { RecipeWithDetails } from '../models/recipe.model';
import { logger } from '../utils/logger';

dotenv.config();

const apiKey = process.env.MISTRAL_API_KEY;
const client = apiKey ? new Mistral({ apiKey }) : null;

export interface EstimatedNutrition {
    calories: number;
    fats_grams: number;
    carbs_grams: number;
    proteins_grams: number;
    sugar_g?: number;
    added_sugar_g?: number;
    fiber_g?: number;
    density_g_per_ml?: number;
    allergen_flags?: {
        contains_gluten: boolean;
        contains_dairy: boolean;
        contains_nuts: boolean;
        contains_eggs: boolean;
        contains_soy: boolean;
        is_vegan: boolean;
        is_vegetarian: boolean;
    };
    category?: string;
}

export interface AIEstimationResult {
    estimated_aw: number;
    estimated_shelf_life_days: number;
    explanation: string;
}

export interface ParsedRecipeData {
    title: string;
    description: string;
    servings: number;
    yield_weight_grams: number | null;
    original_author?: string | null;
    original_author_url?: string | null;
    tags: string[];
    ingredients: {
        display_name: string;
        quantity_original: number;
        unit_original: string;
    }[];
    sections: {
        type: 'pre_prep' | 'prep' | 'bake' | 'rest' | 'notes';
        title: string | null;
        steps: {
            instruction: string;
            duration_seconds: number | null;
            temperature_celsius: number | null;
        }[];
    }[];
}

export class AIService {
    /**
     * Estimates Water Activity (aw) and Shelf Life based on recipe composition and process.
     */
    static async estimateBakingProperties(recipe: RecipeWithDetails): Promise<AIEstimationResult> {
        if (!client) {
            logger.warn('Mistral API key not configured, falling back to mock estimation');
            return this.mockEstimation(recipe);
        }

        try {
            const ingredients = recipe.ingredients
                .map((i) => {
                    let text = `${i.quantity_grams}g ${i.display_name}`;
                    if (i.brand_name) text += ` (Brand: ${i.brand_name})`;
                    if (i.moisture_content) text += ` [Moisture: ${i.moisture_content}%]`;
                    return text;
                })
                .join(', ');
            const steps = recipe.sections
                .flatMap((s) => s.steps.map((st) => st.instruction))
                .join('; ');

            const prompt = `
        You are an expert food scientist specializing in bakery products. Estimate the Water Activity (aw) and Shelf Life for this recipe.

        Title: "${recipe.title}"
        Ingredients: ${ingredients}
        Process: ${steps}
        Total hydration: ${recipe.total_hydration_percentage || 'unknown'}%

        STEP 1 — Identify product characteristics:
        - Product type: (e.g. fruit cake, sponge cake, cookie, bread, custard, cream cake)
        - Dominant humectants: high sugar = lowers aw; high fat = mild effect; alcohol = strong aw reduction
        - Preservatives/acidulants present: alcohol content, vinegar, lemon juice, cream cheese (pH < 4.6)
        - Baking temperature and time: high temp + long time = lower final moisture
        - Aeration: whipped cream / custard / mousse = higher aw, shorter shelf life regardless of sugar content

        STEP 2 — Estimate aw using food science rules:
        - Fruit cake with high sugar + dried fruit + alcohol: aw ≈ 0.70–0.82 → 30–90 days
        - Sponge / butter cake: aw ≈ 0.85–0.90 → 3–7 days
        - Cookie / biscuit: aw ≈ 0.40–0.65 → 60–180 days
        - Bread / yeast product: aw ≈ 0.92–0.97 → 2–5 days
        - Custard / cream filled: aw ≈ 0.95–0.99 → 1–3 days (high risk even at lower aw due to dairy proteins)
        - Cheesecake / cream cheese base: aw ≈ 0.90–0.95 → 3–7 days refrigerated
        - Marzipan / fondant covered: lower aw surface, extend by 15–30%
        
        STEP 3 — Shelf life table (use as reference, adjust for product type):
        | aw | Shelf life (ambient, no refrigeration) |
        | < 0.60 | 6–24 months |
        | 0.60–0.70 | 3–6 months |
        | 0.70–0.80 | 1–3 months |
        | 0.80–0.87 | 2–8 weeks |
        | 0.87–0.91 | 1–2 weeks |
        | 0.91–0.95 | 3–7 days |
        | > 0.95 | 1–3 days (refrigerate) |

        CRITICAL: A dairy-rich product (custard, cream) ALWAYS has a shorter shelf life than the aw table suggests because of microbial load in dairy proteins. Apply at least a 50% reduction to table values for such products.

        Return ONLY a JSON object:
        {
          "estimated_aw": number (0.00–1.00, 2 decimal places),
          "estimated_shelf_life_days": number (realistic integer),
          "explanation": "2–3 sentence technical reasoning citing product type, key ingredients affecting aw, and why that aw gives this shelf life"
        }
      `;

            const response = await client.chat.complete({
                model: 'open-mixtral-8x7b', // Cost-effective model
                messages: [{ role: 'user', content: prompt }],
                responseFormat: { type: 'json_object' },
                temperature: 0,
            });

            const result = JSON.parse(response.choices?.[0]?.message?.content as string);
            return {
                estimated_aw: result.estimated_aw || 0.85,
                estimated_shelf_life_days: result.estimated_shelf_life_days || 3,
                explanation: result.explanation || 'AI generated estimate based on ingredients and process.',
            };
        } catch (error) {
            logger.error({ error }, 'Mistral AI estimation failed');
            return this.mockEstimation(recipe);
        }
    }

    /**
     * Estimates nutrition for an ingredient string.
     */
    /**
     * Normalizes AI/DB nutrition response to match EstimatedNutrition field names.
     * Handles both old (sugars_grams) and new (sugar_g) naming styles.
     */
    private static normalizeNutritionResponse(raw: any): EstimatedNutrition {
        return {
            calories: Number(raw.calories) || 0,
            fats_grams: Number(raw.fats_grams ?? raw.fat_g ?? raw.fat_grams) || 0,
            carbs_grams: Number(raw.carbs_grams ?? raw.carbs_g ?? raw.carbohydrates_grams) || 0,
            proteins_grams: Number(raw.proteins_grams ?? raw.protein_g ?? raw.protein_grams) || 0,
            // Accept both naming styles from AI responses
            sugar_g: Number(raw.sugar_g ?? raw.sugars_grams ?? raw.sugars_g) || 0,
            added_sugar_g: Number(raw.added_sugar_g ?? raw.added_sugars_grams ?? raw.added_sugars_g) || 0,
            fiber_g: Number(raw.fiber_g ?? raw.fiber_grams ?? raw.dietary_fiber_g) || 0,
            density_g_per_ml: raw.density_g_per_ml,
            allergen_flags: raw.allergen_flags,
            category: raw.category,
        };
    }

    static async estimateNutrition(ingredientString: string): Promise<EstimatedNutrition> {
        if (!client) {
            return this.mockNutrition(ingredientString);
        }

        try {
            const prompt = `
        Estimate the complete nutritional metadata per 100g for the following ingredient: "${ingredientString}".
        Return ONLY a valid JSON object with these exact fields:
        {
          "calories": number,
          "fats_grams": number,
          "carbs_grams": number,
          "proteins_grams": number,
          "sugar_g": number (TOTAL sugars — includes ALL natural sugars from fruit, dairy, grains PLUS any added sugars),
          "added_sugar_g": number (ONLY sugars deliberately added during processing/manufacturing — e.g. table sugar, syrup, glucose. This is 0 for whole natural foods like fruits, milk, flour),
          "fiber_g": number (dietary fiber),
          "density_g_per_ml": number,
          "allergen_flags": {
            "contains_gluten": boolean,
            "contains_dairy": boolean,
            "contains_nuts": boolean,
            "contains_eggs": boolean,
            "contains_soy": boolean,
            "is_vegan": boolean,
            "is_vegetarian": boolean
          },
          "category": "one of: flour, sugar, fat, liquid, additive, fruit, dairy, egg, spice, leavening, nut, other"
        }

        CRITICAL RULES for sugar_g vs added_sugar_g:
        - Whole fruits (fresh or dried): sugar_g = natural fruit sugar content, added_sugar_g = 0
          Examples: date=63g, raisin=59g, orange=9g, strawberry=7g, banana=12g — all have added_sugar_g=0
        - Dairy (milk, cream, yogurt): sugar_g = lactose content, added_sugar_g = 0 (unless sweetened)
        - Flour, oats, rice: sugar_g = small amount of starch-derived sugars, added_sugar_g = 0
        - Table sugar, brown sugar: sugar_g = ~99g, added_sugar_g = ~99g
        - Honey, maple syrup, glucose syrup: sugar_g = 80-85g, added_sugar_g = 80-85g (these are added sweeteners)
        - Sweetened condensed milk / flavored yogurt: split appropriately
      `;

            const response = await client.chat.complete({
                model: 'open-mixtral-8x7b',
                messages: [{ role: 'user', content: prompt }],
                responseFormat: { type: 'json_object' },
                temperature: 0,
            });

            const raw = JSON.parse(response.choices?.[0]?.message?.content as string);
            return this.normalizeNutritionResponse(raw);
        } catch (error) {
            logger.error({ error }, 'Mistral AI nutrition estimation failed');
            return this.mockNutrition(ingredientString);
        }
    }

    /**
     * Parses unstructured recipe text/data into structured JSON format 
     */
    static async parseRecipeRawText(rawText: string, existingUserTags: string[] = []): Promise<ParsedRecipeData> {
        if (!client) {
            throw new Error('Mistral API key not configured for Smart Import');
        }

        try {
            const prompt = `
        You are an expert culinary AI capable of reading unstructured recipe text and converting it into a structured JSON schema.
        Read the following unstructured text:
        
        """
        ${rawText}
        """

        ${existingUserTags.length > 0 ? `The user has already defined the following tag categories. Please prioritize using these if they are relevant to the recipe: ${existingUserTags.join(', ')}.` : ''}

        Extract the recipe data and return ONLY a JSON object exactly matching this schema:
        {
          "title": "string (extract the recipe name)",
          "description": "string (brief summary or intro)",
          "servings": "number (default to 1 if unknown)",
          "yield_weight_grams": "number or null (if total baked weight is mentioned)",
          "original_author": "string or null (extract the author or creator name if present)",
          "original_author_url": "string or null (extract the author's URL or social link if present)",
          "tags": ["string (extract 2-5 highly relevant short keywords or categories like 'vegan', 'dessert', 'quick')"],
          "ingredients": [
            {
              "display_name": "string (ingredient name without quantities)",
              "quantity_original": "number (the amount)",
              "unit_original": "string (standardized: g, ml, cup, tbsp, tsp, oz, lb, kg, piece, pinch. Prefer abbreviations. Infer 'piece' if no unit is given e.g. '2 eggs')"
            }
          ],
          "sections": [
            {
              "type": "string (must be one of: 'pre_prep', 'prep', 'bake', 'rest', 'notes')",
              "title": "string or null (e.g. 'For the dough', 'For the glaze')",
              "steps": [
                {
                  "instruction": "string (the actual step instruction)",
                  "duration_seconds": "number or null (extract time and convert strictly to seconds. e.g. 'bake for 30 mins' = 1800)",
                  "temperature_celsius": "number or null (extract exact temperature in Celsius. Convert from Fahrenheit if needed)"
                }
              ]
            }
          ]
        }
        
        Rules:
        1. Group steps into logical sections based on the recipe flow (e.g., 'pre_prep' for gathering/setting up, 'prep' for mixing/kneading, 'bake' for cooking, 'rest' for cooling, rising, proving, or chilling, 'notes' for tips/tricks/storage).
        2. Be extremely thorough: Extract preparation times, rest periods (proving/rising), and any baker's tips/tricks.
        3. Ensure all resting times, chilling, proving, or cooling steps are added to a 'rest' section with accurate duration_seconds.
        4. Ensure all tips, tricks, and extra advice are added to a 'notes' section.
        5. Ensure ingredients contain purely the name (e.g., 'all-purpose flour', not '2 cups of all-purpose flour').
        6. Units MUST be standardized: 'tsp' for teaspoon, 'tbsp' for tablespoon, 'ml' for millilitre, 'g' for grams, etc.
        7. If the input is in a different language, translate to English.
        8. Only return the final JSON.
            `;

            const response = await client.chat.complete({
                model: 'open-mixtral-8x7b', // Cost-effective 
                messages: [{ role: 'user', content: prompt }],
                responseFormat: { type: 'json_object' },
            });

            const content = response.choices?.[0]?.message?.content as string;
            return JSON.parse(content) as ParsedRecipeData;
        } catch (error) {
            logger.error({ error }, 'Mistral AI recipe parsing failed');
            throw new Error('Failed to parse the recipe text using AI. Please try again.');
        }
    }

    private static mockEstimation(recipe: RecipeWithDetails): AIEstimationResult {
        const hydration = recipe.total_hydration_percentage || 70;
        let aw = 0.85;
        if (hydration > 80) aw = 0.95;
        else if (hydration < 50) aw = 0.75;

        return {
            estimated_aw: aw,
            estimated_shelf_life_days: aw > 0.9 ? 2 : aw > 0.8 ? 4 : 14,
            explanation: 'Heuristic mock estimation based on hydration only. (Mistral not configured)',
        };
    }

    private static mockNutrition(displayName: string): EstimatedNutrition {
        const lowerName = displayName.toLowerCase();
        const base = {
            calories: 0,
            fats_grams: 0,
            carbs_grams: 0,
            proteins_grams: 0,
            sugar_g: 0,
            added_sugar_g: 0,
            fiber_g: 0,
            density_g_per_ml: 1.0,
            allergen_flags: {
                contains_gluten: false,
                contains_dairy: false,
                contains_nuts: false,
                contains_eggs: false,
                contains_soy: false,
                is_vegan: true,
                is_vegetarian: true
            },
            category: 'other' as any
        };

        if (lowerName.includes('flour')) {
            return {
                ...base,
                calories: 364, fats_grams: 1, carbs_grams: 76, proteins_grams: 10,
                sugar_g: 0.3, added_sugar_g: 0, fiber_g: 2.7,
                density_g_per_ml: 0.65,
                allergen_flags: { ...base.allergen_flags, contains_gluten: true, is_vegan: true },
                category: 'flour'
            };
        }
        if (lowerName.includes('sugar') || lowerName.includes('syrup') || lowerName.includes('molasses') || lowerName.includes('honey')) {
            const isPlainSweetener = lowerName.includes('sugar') || lowerName.includes('syrup') || lowerName.includes('molasses');
            return {
                ...base,
                calories: isPlainSweetener ? 387 : 304,
                carbs_grams: isPlainSweetener ? 99 : 82,
                sugar_g: isPlainSweetener ? 99 : 82,
                added_sugar_g: isPlainSweetener ? 99 : 82,
                density_g_per_ml: 1.1,
                category: 'sugar' as any
            };
        }
        if (lowerName.includes('butter')) {
            return {
                ...base,
                calories: 717, fats_grams: 81, carbs_grams: 0, proteins_grams: 1,
                density_g_per_ml: 0.9,
                allergen_flags: { ...base.allergen_flags, contains_dairy: true, is_vegan: false },
                category: 'fat'
            };
        }
        if (lowerName.includes('milk')) {
            return {
                ...base,
                calories: 61, fats_grams: 3.3, carbs_grams: 4.8, proteins_grams: 3.2,
                sugar_g: 4.8, added_sugar_g: 0, fiber_g: 0,
                density_g_per_ml: 1.03,
                allergen_flags: { ...base.allergen_flags, contains_dairy: true, is_vegan: false },
                category: 'liquid'
            };
        }
        if (lowerName.includes('egg')) {
            return {
                ...base,
                calories: 155, fats_grams: 11, carbs_grams: 1.1, proteins_grams: 13,
                density_g_per_ml: 1.0,
                allergen_flags: { ...base.allergen_flags, contains_eggs: true, is_vegan: false },
                category: 'additive'
            };
        }
        if (lowerName.includes('date') || lowerName.includes('raisin') || lowerName.includes('sultana') || lowerName.includes('currant')) {
            const isDriedFruit = true;
            return {
                ...base,
                calories: 282, fats_grams: 0.4, carbs_grams: 75, proteins_grams: 2.5,
                sugar_g: 63, added_sugar_g: 0, fiber_g: 8,
                category: 'fruit' as any
            };
        }
        return base;
    }
}
