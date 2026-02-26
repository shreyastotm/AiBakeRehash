// ---------------------------------------------------------------------------
// Ingredient model types — mirrors ingredient_master and ingredient_aliases tables
// ---------------------------------------------------------------------------

export type IngredientCategory =
  | 'flour'
  | 'fat'
  | 'sugar'
  | 'leavening'
  | 'dairy'
  | 'liquid'
  | 'fruit'
  | 'nut'
  | 'spice'
  | 'other';

export interface NutritionPer100g {
  energy_kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  fiber_g?: number;
}

export interface AllergenFlags {
  gluten?: boolean;
  dairy?: boolean;
  nuts?: boolean;
  eggs?: boolean;
}

// ---------------------------------------------------------------------------
// Core interfaces
// ---------------------------------------------------------------------------

export interface IngredientMaster {
  id: string;
  name: string;
  category: IngredientCategory;
  default_density_g_per_ml: number | null;
  nutrition_per_100g: NutritionPer100g | null;
  allergen_flags: AllergenFlags | null;
  is_composite: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface IngredientAlias {
  id: string;
  ingredient_master_id: string;
  alias_name: string;
  alias_type: 'abbreviation' | 'regional' | 'brand' | 'common';
  locale: string | null;
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export interface CreateIngredientInput {
  name: string;
  category: IngredientCategory;
  default_density_g_per_ml?: number | null;
  nutrition_per_100g?: NutritionPer100g | null;
  allergen_flags?: AllergenFlags | null;
  is_composite?: boolean;
}

// ---------------------------------------------------------------------------
// List/filter types
// ---------------------------------------------------------------------------

export interface IngredientListQuery {
  page?: number;
  limit?: number;
  category?: IngredientCategory;
}

export interface IngredientSearchQuery {
  q: string;
  limit?: number;
}
