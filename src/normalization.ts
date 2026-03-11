// src/normalization.ts

export type NormalizeResult = {
  value: string;
  wasTransformed: boolean;
  original: string;
};

const UNIT_ALIASES: Record<string, string> = {
  celsius: 'degC',
  fahrenheit: 'degF',
  'kilometers per hour': 'km/hour',
  'miles per hour': 'mile/hour',
  'meters per second': 'm/s',
  'feet per second': 'ft/s',
  'square meters': 'm^2',
  'square feet': 'ft^2',
  'square kilometers': 'km^2',
  'square miles': 'mile^2',
  'cubic meters': 'm^3',
  'cubic feet': 'ft^3',
  'cubic inches': 'in^3',
  litres: 'liter',
};

export function normalizeUnit(input: string): NormalizeResult {
  const trimmed = input.trim();
  const key = trimmed.toLowerCase();
  const mapped = UNIT_ALIASES[key];
  if (mapped) {
    return { value: mapped, wasTransformed: true, original: input };
  }
  return { value: trimmed, wasTransformed: trimmed !== input, original: input };
}

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
