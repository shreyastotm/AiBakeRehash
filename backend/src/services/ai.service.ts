import { RecipeWithDetails } from '../models/recipe.model';
import { logger } from '../utils/logger';

export interface EstimatedNutrition {
    calories: number;
    fats_grams: number;
    carbs_grams: number;
    proteins_grams: number;
}

export class AIService {
    /**
     * Estimates Water Activity (aw) based on recipe composition.
     * In a real implementation, this would call an LLM with the recipe text.
     */
    static async estimateWaterActivity(recipe: RecipeWithDetails): Promise<{
        estimated_aw: number;
        explanation: string;
    }> {
        logger.info({ recipeId: recipe.id }, 'Estimating water activity via AI');

        // MOCK LOGIC: Heuristic based on hydration
        // Higher hydration usually means higher aw, but salt/sugar lower it.
        const hydration = recipe.total_hydration_percentage || 70;

        // Simple mock heuristic
        let estimate = 0.85;
        if (hydration > 80) estimate = 0.95;
        else if (hydration < 50) estimate = 0.75;

        // Simulate "LLM" thinking delay
        await new Promise(resolve => setTimeout(resolve, 800));

        return {
            estimated_aw: parseFloat(estimate.toFixed(2)),
            explanation: `Estimated based on ${hydration.toFixed(1)}% hydration and typical baking parameters for ${recipe.title}. (AI Estimation)`
        };
    }

    /**
     * Estimates nutrition for an ingredient not found in the master database.
     */
    static async estimateNutrition(displayName: string): Promise<EstimatedNutrition> {
        logger.info({ displayName }, 'Estimating ingredient nutrition via AI');

        // Simulate "LLM" lookup
        await new Promise(resolve => setTimeout(resolve, 500));

        // Simple mock data for common baking items if lookup fails
        const lowerName = displayName.toLowerCase();

        if (lowerName.includes('flour')) {
            return { calories: 364, fats_grams: 1, carbs_grams: 76, proteins_grams: 10 };
        }
        if (lowerName.includes('sugar')) {
            return { calories: 387, fats_grams: 0, carbs_grams: 100, proteins_grams: 0 };
        }
        if (lowerName.includes('butter')) {
            return { calories: 717, fats_grams: 81, carbs_grams: 0, proteins_grams: 1 };
        }

        // Default "average" ingredient
        return {
            calories: 250,
            fats_grams: 10,
            carbs_grams: 30,
            proteins_grams: 5
        };
    }
}
