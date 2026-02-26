// ---------------------------------------------------------------------------
// Cost model types — mirrors recipe_costs table and costing API shapes
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Core interfaces
// ---------------------------------------------------------------------------

export interface RecipeCost {
  id: string;
  recipe_id: string;
  user_id: string;
  ingredient_cost: number;
  overhead_cost: number;
  packaging_cost: number;
  labor_cost: number;
  total_cost: number;
  currency: string;
  calculated_at: Date;
}

export interface IngredientCostBreakdown {
  ingredient_name: string;
  quantity_grams: number;
  cost_per_unit: number;
  unit: string;
  total_cost: number;
}

export interface CostCalculationResult extends RecipeCost {
  cost_per_serving: number;
  cost_per_100g: number;
  breakdown: IngredientCostBreakdown[];
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export interface CalculateCostInput {
  overhead_cost?: number;
  packaging_cost?: number;
  labor_cost?: number;
  currency?: string;
}

export interface CalculatePricingInput {
  target_profit_margin_percent: number;
  custom_selling_price?: number;
}

// ---------------------------------------------------------------------------
// Pricing result
// ---------------------------------------------------------------------------

export interface PricingResult {
  recipe_id: string;
  total_cost: number;
  suggested_selling_price: number;
  profit_amount: number;
  target_profit_margin: number;
  actual_profit_margin: number;
  currency: string;
}

// ---------------------------------------------------------------------------
// Report types
// ---------------------------------------------------------------------------

export interface ProfitMarginReportItem {
  recipe_id: string;
  recipe_title: string;
  total_cost: number;
  currency: string;
  calculated_at: Date;
}

export interface CostTrendItem {
  recipe_id: string;
  recipe_title: string;
  ingredient_cost: number;
  overhead_cost: number;
  packaging_cost: number;
  labor_cost: number;
  total_cost: number;
  currency: string;
  calculated_at: Date;
}

// ---------------------------------------------------------------------------
// Query types
// ---------------------------------------------------------------------------

export interface CostTrendQuery {
  from_date?: string;
  to_date?: string;
}
