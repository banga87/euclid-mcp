// src/error-hints.ts

export type ErrorHint = {
  hint: string;
  examples: string[];
};

type ToolName = 'calculate' | 'convert' | 'statistics';

const CALCULATE_EXAMPLES = ['2 * 3', 'sqrt(16)', 'sin(pi / 4)', 'log(100, 10)', '12! / (4! * 8!)'];

const CONVERT_EXAMPLES = [
  "convert(5, 'km', 'mile')",
  "convert(100, 'degF', 'degC')",
  "convert(1, 'lb', 'kg')",
];

const STATISTICS_EXAMPLES = [
  "statistics('mean', [1, 2, 3])",
  "statistics('percentile', [10, 20, 30], 90)",
];

function getCalculateHint(errorMessage: string): string {
  if (
    errorMessage.includes('Unexpected') ||
    errorMessage.includes('Parenthesis') ||
    errorMessage.includes('Value expected')
  ) {
    return 'Check expression syntax. Use * for multiplication, / for division, ^ for exponents, and ensure parentheses are balanced.';
  }
  if (errorMessage.includes('Undefined symbol') || errorMessage.includes('Undefined function')) {
    return 'Unknown variable or function. Supported functions include: sqrt, sin, cos, tan, log, exp, abs, ceil, floor, round.';
  }
  if (errorMessage.includes('is disabled')) {
    return 'This function is disabled for security. Use basic arithmetic and math functions only.';
  }
  return 'Invalid expression. Use standard mathematical notation with operators: +, -, *, /, ^.';
}

function getConvertHint(errorMessage: string): string {
  if (errorMessage.includes('not found')) {
    return 'Unit not recognized. Use standard abbreviations: km, m, ft, mile, lb, kg, degC, degF, mph, kph.';
  }
  if (errorMessage.includes('do not match')) {
    return 'Units are incompatible. Ensure both measure the same quantity (e.g., length to length, weight to weight).';
  }
  return 'Invalid conversion. Provide a numeric value with valid source and target units.';
}

function getStatisticsHint(errorMessage: string): string {
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

export function getErrorHint(tool: ToolName, errorMessage: string): ErrorHint {
  switch (tool) {
    case 'calculate':
      return { hint: getCalculateHint(errorMessage), examples: CALCULATE_EXAMPLES };
    case 'convert':
      return { hint: getConvertHint(errorMessage), examples: CONVERT_EXAMPLES };
    case 'statistics':
      return { hint: getStatisticsHint(errorMessage), examples: STATISTICS_EXAMPLES };
  }
}
