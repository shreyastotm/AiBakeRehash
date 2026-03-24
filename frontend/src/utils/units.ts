export const volumeUnits = ['ml', 'l', 'cup', 'tbsp', 'tsp']
export const weightUnits = ['g', 'kg', 'oz', 'lb']

/**
 * Normalizes a unit string to its canonical form.
 */
export function normalizeUnit(unit: string): string {
  if (!unit) return unit;
  const low = unit.toLowerCase().trim().replace(/\./g, '');

  if (low === 'millilitre' || low === 'millilitres' || low === 'ml') return 'ml';
  if (low === 'litre' || low === 'litres' || low === 'l') return 'l';
  if (low === 'teaspoon' || low === 'teaspoons' || low === 'tsp') return 'tsp';
  if (low === 'tablespoon' || low === 'tablespoons' || low === 'tbsp' || low === 'tbs') return 'tbsp';
  if (low === 'cup' || low === 'cups' || low === 'c') return 'cup';
  if (low === 'gram' || low === 'grams' || low === 'g') return 'g';
  if (low === 'kilogram' || low === 'kilograms' || low === 'kg' || low === 'kilo') return 'kg';
  if (low === 'ounce' || low === 'ounces' || low === 'oz') return 'oz';
  if (low === 'pound' || low === 'pounds' || low === 'lb' || low === 'lbs') return 'lb';

  return low;
}

/**
 * Convert volume to weight in grams using density (g/ml)
 * Indian standard cup = 240ml
 */
export const convertToGrams = (
  quantity: number,
  unit: string,
  densityGPerMl: number | null = null,
  ingredientName: string = ''
): number => {
  const norm = normalizeUnit(unit);

  // Heuristic density for common ingredients if not provided
  let density = densityGPerMl;
  if (density === null || density === 1) {
    const lowerName = ingredientName.toLowerCase();
    if (lowerName.includes('flour')) density = 0.5;
    else if (lowerName.includes('sugar')) density = 0.85;
    else if (lowerName.includes('butter') || lowerName.includes('oil')) density = 0.9;
    else density = 1; // Default to water
  }

  switch (norm) {
    case 'g':
      return quantity;
    case 'kg':
      return quantity * 1000;
    case 'oz':
      return quantity * 28.3495;
    case 'lb':
      return quantity * 453.592;
    case 'ml':
      return quantity * density;
    case 'l':
      return quantity * 1000 * density;
    case 'tsp':
      return quantity * 5 * density;
    case 'tbsp':
      return quantity * 15 * density;
    case 'cup':
      return quantity * 240 * density;
    default:
      return quantity;
  }
};

/**
 * Convert weight in grams to volume/weight unit using density
 */
export const convertFromGrams = (
  grams: number,
  unit: string,
  densityGPerMl: number = 1
): number => {
  const norm = normalizeUnit(unit);
  switch (norm) {
    case 'g':
      return grams;
    case 'kg':
      return grams / 1000;
    case 'oz':
      return grams / 28.3495;
    case 'lb':
      return grams / 453.592;
    case 'ml':
      return grams / densityGPerMl;
    case 'l':
      return (grams / 1000) / densityGPerMl;
    case 'tsp':
      return (grams / 5) / densityGPerMl;
    case 'tbsp':
      return (grams / 15) / densityGPerMl;
    case 'cup':
      return (grams / 240) / densityGPerMl;
    default:
      return grams;
  }
};
