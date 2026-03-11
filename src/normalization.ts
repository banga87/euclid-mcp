// src/normalization.ts

export type NormalizeResult = {
  value: string;
  wasTransformed: boolean;
  original: string;
};

const EXPRESSION_REPLACEMENTS: [RegExp, string][] = [
  [/×/g, '*'],
  [/÷/g, '/'],
  [/²/g, '^2'],
  [/³/g, '^3'],
  [/√\(/g, 'sqrt('],
  [/√(\d+(?:\.\d+)?)/g, 'sqrt($1)'],
  [/\u2212/g, '-'],
  [/π/g, 'pi'],
];

export function normalizeExpression(input: string): NormalizeResult {
  let value = input;

  for (const [pattern, replacement] of EXPRESSION_REPLACEMENTS) {
    value = value.replace(pattern, replacement);
  }

  // Strip thousands-separator commas: 1,234,567 -> 1234567
  // Matches a full thousands-separated number (1-3 leading digits followed by
  // one or more ,NNN groups) and removes the commas in a single pass.
  //
  // This is safe for function arguments because mathjs and LLMs use comma-space
  // (e.g., `log(100, 10)`) to separate arguments, and the regex requires the
  // comma to be immediately followed by a digit — so "100, 200" is never matched.
  // Known limitation: a pathological case like `fn(1,000)` where the argument
  // happens to be exactly three digits will be treated as a thousands separator.
  value = value.replace(/\d{1,3}(?:,\d{3})+(?!\d)/g, (match) => match.replace(/,/g, ''));

  return {
    value,
    wasTransformed: value !== input,
    original: input,
  };
}
