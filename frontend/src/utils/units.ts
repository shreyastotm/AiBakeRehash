export const volumeUnits = ['ml', 'l', 'cup', 'tbsp', 'tsp']
export const weightUnits = ['g', 'kg', 'oz', 'lb']

export const convertToGrams = (quantity: number, unit: string, density: number): number => {
  const volumeToMl: Record<string, number> = {
    ml: 1,
    l: 1000,
    cup: 240,
    tbsp: 15,
    tsp: 5,
  }

  const weightToGrams: Record<string, number> = {
    g: 1,
    kg: 1000,
    oz: 28.35,
    lb: 453.6,
  }

  if (volumeToMl[unit]) {
    return volumeToMl[unit] * quantity * density
  }

  if (weightToGrams[unit]) {
    return weightToGrams[unit] * quantity
  }

  throw new Error(`Unknown unit: ${unit}`)
}

export const convertFromGrams = (grams: number, unit: string, density: number): number => {
  const volumeToMl: Record<string, number> = {
    ml: 1,
    l: 1000,
    cup: 240,
    tbsp: 15,
    tsp: 5,
  }

  const weightToGrams: Record<string, number> = {
    g: 1,
    kg: 1000,
    oz: 28.35,
    lb: 453.6,
  }

  if (volumeToMl[unit]) {
    return (grams / density) / volumeToMl[unit]
  }

  if (weightToGrams[unit]) {
    return grams / weightToGrams[unit]
  }

  throw new Error(`Unknown unit: ${unit}`)
}
