// ---------------------------------------------------------------------------
// Recipe model types — mirrors the recipe-related tables in PostgreSQL
// ---------------------------------------------------------------------------

// Enum types matching database enums
export type RecipeSourceType = 'manual' | 'image' | 'whatsapp' | 'url';
export type RecipeStatus = 'draft' | 'active' | 'archived';
export type SectionType = 'pre_prep' | 'prep' | 'bake' | 'rest' | 'notes';

// ---------------------------------------------------------------------------
// Core interfaces
// ---------------------------------------------------------------------------

export interface Recipe {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  source_type: RecipeSourceType;
  source_url: string | null;
  original_author: string | null;
  original_author_url: string | null;
  servings: number;
  yield_weight_grams: number;
  preferred_unit_system: string;
  status: RecipeStatus;
  target_water_activity: number | null;
  min_safe_water_activity: number | null;
  estimated_shelf_life_days: number | null;
  total_hydration_percentage: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  ingredient_master_id: string;
  display_name: string;
  quantity_original: number;
  unit_original: string;
  quantity_grams: number;
  position: number;
  is_flour: boolean;
  is_liquid: boolean;
}

export interface RecipeSection {
  id: string;
  recipe_id: string;
  type: SectionType;
  title: string | null;
  position: number;
}

export interface RecipeStep {
  id: string;
  recipe_id: string;
  section_id: string | null;
  instruction: string;
  duration_seconds: number | null;
  temperature_celsius: number | null;
  position: number;
  dependency_step_id: string | null;
}

export interface RecipeVersion {
  id: string;
  recipe_id: string;
  version_number: number;
  change_summary: string | null;
  created_at: Date;
}

export interface RecipeVersionSnapshot {
  id: string;
  version_id: string;
  snapshot_data: Record<string, unknown>;
}


// ---------------------------------------------------------------------------
// Full recipe with related data
// ---------------------------------------------------------------------------

export interface RecipeWithDetails extends Recipe {
  ingredients: RecipeIngredient[];
  sections: (RecipeSection & { steps: RecipeStep[] })[];
}

// ---------------------------------------------------------------------------
// Input types for create/update
// ---------------------------------------------------------------------------

export interface CreateRecipeIngredientInput {
  ingredient_master_id: string;
  display_name: string;
  quantity_original: number;
  unit_original: string;
  quantity_grams: number;
  position: number;
  is_flour?: boolean;
  is_liquid?: boolean;
}

export interface CreateRecipeStepInput {
  instruction: string;
  duration_seconds?: number | null;
  temperature_celsius?: number | null;
  position: number;
  dependency_step_id?: string | null;
}

export interface CreateRecipeSectionInput {
  type: SectionType;
  title?: string | null;
  position: number;
  steps?: CreateRecipeStepInput[];
}

export interface CreateRecipeInput {
  title: string;
  description?: string | null;
  source_type?: RecipeSourceType;
  source_url?: string | null;
  original_author?: string | null;
  servings: number;
  yield_weight_grams: number;
  preferred_unit_system?: string;
  status?: RecipeStatus;
  ingredients?: CreateRecipeIngredientInput[];
  sections?: CreateRecipeSectionInput[];
}

export interface UpdateRecipeInput {
  title?: string;
  description?: string | null;
  source_type?: RecipeSourceType;
  servings?: number;
  yield_weight_grams?: number;
  preferred_unit_system?: string;
  status?: RecipeStatus;
  ingredients?: CreateRecipeIngredientInput[];
  sections?: CreateRecipeSectionInput[];
  change_summary?: string;
}

// ---------------------------------------------------------------------------
// List/filter types
// ---------------------------------------------------------------------------

export interface RecipeListQuery {
  page?: number;
  limit?: number;
  status?: RecipeStatus;
  source_type?: RecipeSourceType;
  sort_by?: 'created_at' | 'updated_at' | 'title';
  sort_order?: 'asc' | 'desc';
}

export interface RecipeSearchQuery {
  q: string;
  status?: RecipeStatus;
  source_type?: RecipeSourceType;
  ingredient?: string;
  sort_by?: 'created_at' | 'updated_at' | 'title' | 'rating';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
