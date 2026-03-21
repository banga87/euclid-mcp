// src/error-hints/convert.ts

export const EXAMPLES = [
  "convert(5, 'km', 'mile')",
  "convert(100, 'degF', 'degC')",
  "convert(1, 'lb', 'kg')",
];

export function getHint(errorMessage: string): string {
  if (errorMessage.includes('not found')) {
    return 'Unit not recognized. Use standard abbreviations: km, m, ft, mile, lb, kg, degC, degF, mph, kph.';
  }
  if (errorMessage.includes('do not match')) {
    return 'Units are incompatible. Ensure both measure the same quantity (e.g., length to length, weight to weight).';
  }
  return 'Invalid conversion. Provide a numeric value with valid source and target units.';
}
