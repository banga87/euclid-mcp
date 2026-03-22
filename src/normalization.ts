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

const MONTH_NAMES: Record<string, string> = {
  january: '01',
  february: '02',
  march: '03',
  april: '04',
  may: '05',
  june: '06',
  july: '07',
  august: '08',
  september: '09',
  october: '10',
  november: '11',
  december: '12',
};

// Matches "Month DD, YYYY" or "Month DD YYYY"
const MONTH_DD_YYYY = /^([a-z]+)\s+(\d{1,2}),?\s+(\d{4})$/i;
// Matches "DD Month YYYY"
const DD_MONTH_YYYY = /^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/i;

export function normalizeDate(input: string): NormalizeResult {
  const trimmed = input.trim();

  // Pass through ISO 8601 dates: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss...
  if (/^\d{4}-\d{2}-\d{2}(T\S*)?$/.test(trimmed)) {
    return { value: trimmed, wasTransformed: trimmed !== input, original: input };
  }

  // Try "Month DD, YYYY" or "Month DD YYYY"
  const mdyMatch = trimmed.match(MONTH_DD_YYYY);
  if (mdyMatch) {
    const monthNum = MONTH_NAMES[mdyMatch[1].toLowerCase()];
    if (monthNum) {
      const day = mdyMatch[2].padStart(2, '0');
      const year = mdyMatch[3];
      return { value: `${year}-${monthNum}-${day}`, wasTransformed: true, original: input };
    }
  }

  // Try "DD Month YYYY"
  const dmyMatch = trimmed.match(DD_MONTH_YYYY);
  if (dmyMatch) {
    const monthNum = MONTH_NAMES[dmyMatch[2].toLowerCase()];
    if (monthNum) {
      const day = dmyMatch[1].padStart(2, '0');
      const year = dmyMatch[3];
      return { value: `${year}-${monthNum}-${day}`, wasTransformed: true, original: input };
    }
  }

  // Everything else (including ambiguous numeric formats) passes through unchanged
  return { value: trimmed, wasTransformed: trimmed !== input, original: input };
}

// ---------------------------------------------------------------------------
// Encode normalization
// ---------------------------------------------------------------------------

// Operations where hex_decode is the inherent format (always normalize hex)
const HEX_DECODE_OPS = new Set(['hex_decode']);

// Hash operations where hex normalization only applies when input_encoding is 'hex'
const HASH_OPS = new Set(['sha256', 'sha512', 'sha1', 'md5', 'hmac']);

// Operations that accept base64 input for decoding
const BASE64_PAD_OPS = new Set(['base64_decode']);

export function normalizeEncodeInput(
  operation: string,
  input: string,
  inputEncoding?: string,
): NormalizeResult {
  let value = input;

  // Base64 padding: add = to make length a multiple of 4
  if (BASE64_PAD_OPS.has(operation)) {
    const remainder = value.length % 4;
    if (remainder !== 0 && value.length > 0) {
      value = value + '='.repeat(4 - remainder);
    }
  }

  // Hex normalization: strip 0x prefix, spaces, colons
  // For hex_decode: always apply (the input IS hex)
  // For hash ops: only apply when input_encoding is 'hex'
  const shouldNormalizeHex =
    HEX_DECODE_OPS.has(operation) ||
    (HASH_OPS.has(operation) && inputEncoding === 'hex');

  if (shouldNormalizeHex) {
    value = value.replace(/^0[xX]/, '');
    value = value.replace(/[\s:]/g, '');
  }

  return {
    value,
    wasTransformed: value !== input,
    original: input,
  };
}
