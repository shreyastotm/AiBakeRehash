/**
 * Unit Conversion System for AiBake
 *
 * Converts between volume and weight measurements using ingredient-specific
 * density values. All calculations go through canonical grams as the
 * intermediate representation.
 *
 * Supported volume units: ml, l, cup (240ml), tbsp (15ml), tsp (5ml)
 * Supported weight units: g, kg, oz, lb
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Volume unit identifiers */
export type VolumeUnit = 'ml' | 'l' | 'cup' | 'tbsp' | 'tsp';

/** Weight unit identifiers */
export type WeightUnit = 'g' | 'kg' | 'oz' | 'lb';

/** Any supported unit */
export type Unit = VolumeUnit | WeightUnit;

/** Minimal ingredient data needed for conversion */
export interface IngredientDensity {
  id: string;
  name: string;
  /** Grams per milliliter – null when density is unknown */
  default_density_g_per_ml: number | null;
}

/** Result returned by the generic `convertUnit` function */
export interface UnitConversionResult {
  original_quantity: number;
  original_unit: Unit;
  converted_quantity: number;
  converted_unit: Unit;
  density_used: number | null;
  conversion_method: 'direct' | 'via_density';
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class MissingDensityError extends Error {
  constructor(ingredientName: string) {
    super(
      `Density data unavailable for "${ingredientName}". Please provide weight directly or add density data.`,
    );
    this.name = 'MissingDensityError';
  }
}

export class InvalidUnitError extends Error {
  constructor(unit: string) {
    super(
      `Unsupported unit "${unit}". Supported volume units: ml, l, cup, tbsp, tsp. Supported weight units: g, kg, oz, lb.`,
    );
    this.name = 'InvalidUnitError';
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Millilitre equivalents for each volume unit (Indian standard cup = 240 ml) */
const ML_PER_VOLUME_UNIT: Record<VolumeUnit, number> = {
  ml: 1,
  l: 1000,
  cup: 240,
  tbsp: 15,
  tsp: 5,
};

/** Gram equivalents for each weight unit */
const GRAMS_PER_WEIGHT_UNIT: Record<WeightUnit, number> = {
  g: 1,
  kg: 1000,
  oz: 28.3495,
  lb: 453.592,
};

const VOLUME_UNITS = new Set<string>(Object.keys(ML_PER_VOLUME_UNIT));
const WEIGHT_UNITS = new Set<string>(Object.keys(GRAMS_PER_WEIGHT_UNIT));

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

export function isVolumeUnit(unit: string): unit is VolumeUnit {
  return VOLUME_UNITS.has(unit);
}

export function isWeightUnit(unit: string): unit is WeightUnit {
  return WEIGHT_UNITS.has(unit);
}

export function isSupportedUnit(unit: string): unit is Unit {
  return isVolumeUnit(unit) || isWeightUnit(unit);
}


// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Convert any volume unit to millilitres */
function toMillilitres(quantity: number, unit: VolumeUnit): number {
  return quantity * ML_PER_VOLUME_UNIT[unit];
}

/** Convert millilitres to any volume unit */
function fromMillilitres(ml: number, unit: VolumeUnit): number {
  return ml / ML_PER_VOLUME_UNIT[unit];
}

/** Convert any weight unit to grams */
function toGrams(quantity: number, unit: WeightUnit): number {
  return quantity * GRAMS_PER_WEIGHT_UNIT[unit];
}

/** Convert grams to any weight unit */
function fromGrams(grams: number, unit: WeightUnit): number {
  return grams / GRAMS_PER_WEIGHT_UNIT[unit];
}

function requireDensity(ingredient: IngredientDensity): number {
  if (
    ingredient.default_density_g_per_ml === null ||
    ingredient.default_density_g_per_ml === undefined
  ) {
    throw new MissingDensityError(ingredient.name);
  }
  return ingredient.default_density_g_per_ml;
}

function validateUnit(unit: string): asserts unit is Unit {
  if (!isSupportedUnit(unit)) {
    throw new InvalidUnitError(unit);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Convert a quantity from any supported unit to canonical grams.
 *
 * - Weight → grams: pure arithmetic (no density needed).
 * - Volume → grams: requires ingredient density (g/ml).
 *
 * @throws {InvalidUnitError}    if `fromUnit` is not recognised
 * @throws {MissingDensityError} if a volume unit is used and density is null
 */
export function convertToGrams(
  ingredient: IngredientDensity,
  quantity: number,
  fromUnit: string,
): number {
  validateUnit(fromUnit);

  if (isWeightUnit(fromUnit)) {
    return toGrams(quantity, fromUnit);
  }

  // Volume → grams via density
  const density = requireDensity(ingredient);
  const ml = toMillilitres(quantity, fromUnit);
  return ml * density;
}

/**
 * Convert a weight in grams to any supported unit.
 *
 * - Grams → weight: pure arithmetic.
 * - Grams → volume: requires ingredient density (g/ml).
 *
 * @throws {InvalidUnitError}    if `toUnit` is not recognised
 * @throws {MissingDensityError} if a volume unit is used and density is null
 */
export function convertFromGrams(
  ingredient: IngredientDensity,
  grams: number,
  toUnit: string,
): number {
  validateUnit(toUnit);

  if (isWeightUnit(toUnit)) {
    return fromGrams(grams, toUnit);
  }

  // Grams → volume via density
  const density = requireDensity(ingredient);
  const ml = grams / density;
  return fromMillilitres(ml, toUnit);
}

/**
 * General-purpose conversion between any two supported units.
 *
 * Internally routes through canonical grams so every path is covered:
 *   weight → weight  (direct arithmetic)
 *   volume → weight  (density required)
 *   weight → volume  (density required)
 *   volume → volume  (density required for intermediate grams step)
 */
export function convertUnit(
  ingredient: IngredientDensity,
  quantity: number,
  fromUnit: string,
  toUnit: string,
): UnitConversionResult {
  validateUnit(fromUnit);
  validateUnit(toUnit);

  const needsDensity = isVolumeUnit(fromUnit) || isVolumeUnit(toUnit);
  const grams = convertToGrams(ingredient, quantity, fromUnit);
  const converted = convertFromGrams(ingredient, grams, toUnit);

  return {
    original_quantity: quantity,
    original_unit: fromUnit,
    converted_quantity: converted,
    converted_unit: toUnit as Unit,
    density_used: needsDensity ? ingredient.default_density_g_per_ml : null,
    conversion_method: needsDensity ? 'via_density' : 'direct',
  };
}

/**
 * Return the set of all supported unit strings.
 * Useful for validation in upstream layers.
 */
export function getSupportedUnits(): { volume: VolumeUnit[]; weight: WeightUnit[] } {
  return {
    volume: Object.keys(ML_PER_VOLUME_UNIT) as VolumeUnit[],
    weight: Object.keys(GRAMS_PER_WEIGHT_UNIT) as WeightUnit[],
  };
}
