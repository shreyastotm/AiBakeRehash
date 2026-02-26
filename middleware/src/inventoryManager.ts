/**
 * Inventory Manager for AiBake
 *
 * Handles inventory deduction when a bake is logged in the journal.
 * Calculates quantities to deduct based on recipe ingredients and scaling
 * factor, checks stock availability, generates warnings for insufficient
 * stock and low-stock alerts, and applies deductions transactionally.
 *
 * All ingredient quantities arrive in canonical grams and are converted
 * to the inventory item's unit before deduction.
 */

import { convertFromGrams, isSupportedUnit, type IngredientDensity } from './unitConverter';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Ingredient data needed for deduction calculation */
export interface DeductionIngredient {
  id: string;
  display_name: string;
  ingredient_master_id: string;
  /** Weight in grams (canonical) */
  quantity_grams: number;
}

/** Inventory record for an ingredient */
export interface InventoryItem {
  id: string;
  ingredient_master_id: string;
  quantity_on_hand: number;
  unit: string;
  min_stock_level: number | null;
}

/** Single deduction entry in the result */
export interface Deduction {
  inventory_item_id: string;
  ingredient_name: string;
  quantity_to_deduct: number;
  unit: string;
  current_stock: number;
  new_stock: number;
}

/** Result of calculateDeductions */
export interface DeductionResult {
  deductions: Deduction[];
  warnings: string[];
}

/** Low-stock alert generated after deduction */
export interface LowStockAlert {
  inventory_item_id: string;
  ingredient_name: string;
  current_stock: number;
  min_stock_level: number;
  unit: string;
}

/** Record of an inventory transaction for audit trail */
export interface InventoryTransaction {
  inventory_item_id: string;
  transaction_type: 'deduction';
  quantity: number;
  unit: string;
  reference_type: 'journal_entry';
  reference_id: string;
}

/** Result of applyDeductions */
export interface ApplyDeductionsResult {
  transactions: InventoryTransaction[];
  low_stock_alerts: LowStockAlert[];
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class InsufficientStockError extends Error {
  constructor(ingredientName: string, needed: number, available: number, unit: string) {
    super(
      `Insufficient stock for "${ingredientName}": need ${needed} ${unit}, have ${available} ${unit}.`,
    );
    this.name = 'InsufficientStockError';
  }
}

export class InvalidDeductionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidDeductionError';
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Convert grams to the inventory item's unit. Falls back to treating the
 * unit as grams when it is not a recognised convertible unit.
 */
function gramsToInventoryUnit(
  quantityGrams: number,
  inventoryUnit: string,
  density: IngredientDensity,
): number {
  if (!isSupportedUnit(inventoryUnit)) {
    return quantityGrams;
  }
  return convertFromGrams(density, quantityGrams, inventoryUnit);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Calculate the inventory deductions required for a recipe bake.
 *
 * For each ingredient the function:
 *   1. Looks up the matching inventory item via `inventoryLookup`.
 *   2. Multiplies the canonical grams by `scalingFactor`.
 *   3. Converts to the inventory item's unit.
 *   4. Checks stock availability and generates warnings.
 *
 * Ingredients without an inventory entry are skipped with a warning
 * (they are not tracked in inventory).
 *
 * @param ingredients      - Recipe ingredients with quantities in grams
 * @param scalingFactor    - Multiplier for scaled bakes (default 1.0)
 * @param inventoryLookup  - Map from ingredient_master_id → InventoryItem
 * @param densityLookup    - Map from ingredient_master_id → IngredientDensity
 *
 * @throws {InvalidDeductionError} if inputs are invalid
 */
export function calculateDeductions(
  ingredients: DeductionIngredient[],
  scalingFactor: number,
  inventoryLookup: Map<string, InventoryItem>,
  densityLookup: Map<string, IngredientDensity>,
): DeductionResult {
  if (!ingredients || ingredients.length === 0) {
    throw new InvalidDeductionError('At least one ingredient is required for deduction calculation.');
  }
  if (scalingFactor <= 0) {
    throw new InvalidDeductionError('Scaling factor must be a positive number.');
  }

  const deductions: Deduction[] = [];
  const warnings: string[] = [];

  for (const ing of ingredients) {
    const inventory = inventoryLookup.get(ing.ingredient_master_id);
    if (!inventory) {
      warnings.push(`${ing.display_name} not tracked in inventory`);
      continue;
    }

    const scaledGrams = ing.quantity_grams * scalingFactor;

    const density = densityLookup.get(ing.ingredient_master_id) ?? {
      id: ing.ingredient_master_id,
      name: ing.display_name,
      default_density_g_per_ml: null,
    };

    const quantityInUnit = gramsToInventoryUnit(scaledGrams, inventory.unit, density);

    if (quantityInUnit > inventory.quantity_on_hand) {
      warnings.push(
        `Insufficient ${ing.display_name}: need ${quantityInUnit} ${inventory.unit}, have ${inventory.quantity_on_hand} ${inventory.unit}`,
      );
    }

    deductions.push({
      inventory_item_id: inventory.id,
      ingredient_name: ing.display_name,
      quantity_to_deduct: quantityInUnit,
      unit: inventory.unit,
      current_stock: inventory.quantity_on_hand,
      new_stock: inventory.quantity_on_hand - quantityInUnit,
    });
  }

  return { deductions, warnings };
}

/**
 * Apply calculated deductions and produce transaction records and alerts.
 *
 * This is a pure function that computes the results of applying deductions.
 * The actual database transaction should be handled by the calling service
 * layer (backend), which can use the returned data to perform updates
 * within a DB transaction.
 *
 * @param deductions     - Deductions from `calculateDeductions`
 * @param journalEntryId - ID of the journal entry triggering the deduction
 *
 * @throws {InvalidDeductionError} if inputs are invalid
 */
export function applyDeductions(
  deductions: Deduction[],
  journalEntryId: string,
  inventoryLookup: Map<string, InventoryItem>,
): ApplyDeductionsResult {
  if (!deductions || deductions.length === 0) {
    throw new InvalidDeductionError('At least one deduction is required.');
  }
  if (!journalEntryId) {
    throw new InvalidDeductionError('Journal entry ID is required.');
  }

  const transactions: InventoryTransaction[] = [];
  const lowStockAlerts: LowStockAlert[] = [];

  for (const deduction of deductions) {
    transactions.push({
      inventory_item_id: deduction.inventory_item_id,
      transaction_type: 'deduction',
      quantity: deduction.quantity_to_deduct,
      unit: deduction.unit,
      reference_type: 'journal_entry',
      reference_id: journalEntryId,
    });

    // Check for low stock alert after deduction
    const inventory = inventoryLookup.get(deduction.inventory_item_id);
    const minLevel = inventory?.min_stock_level ?? null;

    if (minLevel !== null && deduction.new_stock < minLevel) {
      lowStockAlerts.push({
        inventory_item_id: deduction.inventory_item_id,
        ingredient_name: deduction.ingredient_name,
        current_stock: deduction.new_stock,
        min_stock_level: minLevel,
        unit: deduction.unit,
      });
    }
  }

  return { transactions, low_stock_alerts: lowStockAlerts };
}
