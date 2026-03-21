// src/error-hints/calculate.ts

export const EXAMPLES = [
  '2 * 3',
  'sqrt(16)',
  'sin(pi / 4)',
  'log(100, 10)',
  '12! / (4! * 8!)',
];

export function getHint(errorMessage: string): string {
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
