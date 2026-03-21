// src/error-hints/statistics.ts

export const EXAMPLES = [
  "statistics('mean', [1, 2, 3])",
  "statistics('percentile', [10, 20, 30], 90)",
];

export function getHint(errorMessage: string): string {
  if (errorMessage.includes('Unknown operation')) {
    return 'Valid operations: mean, median, mode, std, variance, min, max, sum, percentile.';
  }
  if (errorMessage.includes('Percentile')) {
    return 'The percentile parameter is required and must be between 0 and 100.';
  }
  if (errorMessage.includes('empty')) {
    return 'Data array must contain at least one number.';
  }
  return 'Provide a valid operation and a non-empty array of numbers.';
}
