# Input Normalization & Error Hints Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a preprocessing normalization layer and enriched error messages to all three MCP tools, proactively hardening against LLM input variations.

**Architecture:** Two new files (`src/normalization.ts`, `src/error-hints.ts`) provide pure functions consumed by the engine and tool handlers. The engine calls normalization before evaluation and passes through metadata. Tool handlers call error hints in their error branches and append transparency notes on success.

**Tech Stack:** TypeScript, mathjs, vitest, zod

---

### Task 1: Expression Normalization

**Files:**

- Create: `src/normalization.ts`
- Create: `tests/normalization.test.ts`

**Step 1: Write the failing tests for normalizeExpression**

```typescript
// tests/normalization.test.ts
import { describe, it, expect } from 'vitest';
import { normalizeExpression } from '../src/normalization.js';

describe('normalizeExpression', () => {
  it('replaces × with *', () => {
    const result = normalizeExpression('2 × 3');
    expect(result.value).toBe('2 * 3');
    expect(result.wasTransformed).toBe(true);
    expect(result.original).toBe('2 × 3');
  });

  it('replaces ÷ with /', () => {
    const result = normalizeExpression('10 ÷ 2');
    expect(result.value).toBe('10 / 2');
    expect(result.wasTransformed).toBe(true);
  });

  it('replaces ² with ^2', () => {
    const result = normalizeExpression('x²');
    expect(result.value).toBe('x^2');
    expect(result.wasTransformed).toBe(true);
  });

  it('replaces ³ with ^3', () => {
    const result = normalizeExpression('x³');
    expect(result.value).toBe('x^3');
    expect(result.wasTransformed).toBe(true);
  });

  it('replaces √( with sqrt(', () => {
    const result = normalizeExpression('√(16)');
    expect(result.value).toBe('sqrt(16)');
    expect(result.wasTransformed).toBe(true);
  });

  it('replaces π with pi', () => {
    const result = normalizeExpression('2 * π');
    expect(result.value).toBe('2 * pi');
    expect(result.wasTransformed).toBe(true);
  });

  it('strips thousands-separator commas', () => {
    const result = normalizeExpression('3,456 + 1,000,000');
    expect(result.value).toBe('3456 + 1000000');
    expect(result.wasTransformed).toBe(true);
  });

  it('does not strip commas in function arguments', () => {
    const result = normalizeExpression('log(100, 10)');
    expect(result.value).toBe('log(100, 10)');
    expect(result.wasTransformed).toBe(false);
  });

  it('handles multiple replacements in one expression', () => {
    const result = normalizeExpression('2 × π + √(9)');
    expect(result.value).toBe('2 * pi + sqrt(9)');
    expect(result.wasTransformed).toBe(true);
  });

  it('returns wasTransformed false for clean expressions', () => {
    const result = normalizeExpression('2 * 3 + sqrt(16)');
    expect(result.value).toBe('2 * 3 + sqrt(16)');
    expect(result.wasTransformed).toBe(false);
    expect(result.original).toBe('2 * 3 + sqrt(16)');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/normalization.test.ts`
Expected: FAIL — module `../src/normalization.js` not found

**Step 3: Write the implementation**

```typescript
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
  [/π/g, 'pi'],
];

export function normalizeExpression(input: string): NormalizeResult {
  let value = input;

  for (const [pattern, replacement] of EXPRESSION_REPLACEMENTS) {
    value = value.replace(pattern, replacement);
  }

  // Strip thousands-separator commas: 3,456 → 3456
  // Matches a digit, comma, then exactly 3 digits not followed by another digit.
  // Loop handles cascading groups like 1,000,000.
  let prev = '';
  while (value !== prev) {
    prev = value;
    value = value.replace(/(\d),(\d{3})(?!\d)/g, '$1$2');
  }

  return {
    value,
    wasTransformed: value !== input,
    original: input,
  };
}
```

Note: `normalizeUnit` will be added to this same file in Task 2.

**Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/normalization.test.ts`
Expected: All 10 tests PASS

**Step 5: Commit**

```bash
git add src/normalization.ts tests/normalization.test.ts
git commit -m "feat: add expression normalization with tests"
```

---

### Task 2: Unit Normalization

**Files:**

- Modify: `src/normalization.ts` (add normalizeUnit)
- Modify: `tests/normalization.test.ts` (add normalizeUnit tests)

**Step 1: Write the failing tests for normalizeUnit**

Append to `tests/normalization.test.ts`:

```typescript
import { normalizeUnit } from '../src/normalization.js';

describe('normalizeUnit', () => {
  it('normalizes celsius to degC', () => {
    const result = normalizeUnit('celsius');
    expect(result.value).toBe('degC');
    expect(result.wasTransformed).toBe(true);
    expect(result.original).toBe('celsius');
  });

  it('normalizes fahrenheit to degF', () => {
    const result = normalizeUnit('fahrenheit');
    expect(result.value).toBe('degF');
    expect(result.wasTransformed).toBe(true);
  });

  it('normalizes "kilometers per hour" to km/hour', () => {
    const result = normalizeUnit('kilometers per hour');
    expect(result.value).toBe('km/hour');
    expect(result.wasTransformed).toBe(true);
  });

  it('normalizes "miles per hour" to mile/hour', () => {
    const result = normalizeUnit('miles per hour');
    expect(result.value).toBe('mile/hour');
    expect(result.wasTransformed).toBe(true);
  });

  it('normalizes "meters per second" to m/s', () => {
    const result = normalizeUnit('meters per second');
    expect(result.value).toBe('m/s');
    expect(result.wasTransformed).toBe(true);
  });

  it('normalizes "square meters" to m^2', () => {
    const result = normalizeUnit('square meters');
    expect(result.value).toBe('m^2');
    expect(result.wasTransformed).toBe(true);
  });

  it('normalizes "cubic feet" to ft^3', () => {
    const result = normalizeUnit('cubic feet');
    expect(result.value).toBe('ft^3');
    expect(result.wasTransformed).toBe(true);
  });

  it('normalizes "litres" to liter', () => {
    const result = normalizeUnit('litres');
    expect(result.value).toBe('liter');
    expect(result.wasTransformed).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(normalizeUnit('Celsius').value).toBe('degC');
    expect(normalizeUnit('FAHRENHEIT').value).toBe('degF');
    expect(normalizeUnit('Kilometers Per Hour').value).toBe('km/hour');
  });

  it('passes through unknown units unchanged', () => {
    const result = normalizeUnit('km');
    expect(result.value).toBe('km');
    expect(result.wasTransformed).toBe(false);
    expect(result.original).toBe('km');
  });

  it('passes through already-correct units unchanged', () => {
    const result = normalizeUnit('degC');
    expect(result.value).toBe('degC');
    expect(result.wasTransformed).toBe(false);
  });
});
```

**Step 2: Run tests to verify new tests fail**

Run: `npx vitest run tests/normalization.test.ts`
Expected: normalizeUnit tests FAIL — function not exported

**Step 3: Add normalizeUnit to normalization.ts**

Append to `src/normalization.ts`:

```typescript
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
  const key = input.toLowerCase().trim();
  const mapped = UNIT_ALIASES[key];
  if (mapped) {
    return { value: mapped, wasTransformed: true, original: input };
  }
  return { value: input, wasTransformed: false, original: input };
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/normalization.test.ts`
Expected: All tests PASS (both normalizeExpression and normalizeUnit)

**Step 5: Commit**

```bash
git add src/normalization.ts tests/normalization.test.ts
git commit -m "feat: add unit normalization with aliases and tests"
```

---

### Task 3: Error Hints

**Files:**

- Create: `src/error-hints.ts`
- Create: `tests/error-hints.test.ts`

**Step 1: Write the failing tests**

```typescript
// tests/error-hints.test.ts
import { describe, it, expect } from 'vitest';
import { getErrorHint } from '../src/error-hints.js';

describe('getErrorHint', () => {
  describe('calculate', () => {
    it('returns syntax hint for Unexpected token errors', () => {
      const { hint, examples } = getErrorHint('calculate', 'Unexpected operator +');
      expect(hint).toContain('syntax');
      expect(examples.length).toBeGreaterThan(0);
    });

    it('returns syntax hint for Parenthesis errors', () => {
      const { hint } = getErrorHint('calculate', 'Parenthesis ) unexpected');
      expect(hint).toContain('parenthes');
    });

    it('returns function hint for Undefined symbol errors', () => {
      const { hint } = getErrorHint('calculate', 'Undefined symbol foo');
      expect(hint).toContain('function');
    });

    it('returns security hint for disabled function errors', () => {
      const { hint } = getErrorHint('calculate', 'Function simplify is disabled');
      expect(hint).toContain('disabled');
    });

    it('returns fallback hint for unknown errors', () => {
      const { hint, examples } = getErrorHint('calculate', 'Something weird happened');
      expect(hint).toBeTruthy();
      expect(examples.length).toBeGreaterThan(0);
    });

    it('always includes examples', () => {
      const { examples } = getErrorHint('calculate', 'any error');
      expect(examples.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('convert', () => {
    it('returns unit hint for Unknown unit errors', () => {
      const { hint } = getErrorHint('convert', 'Unknown unit foobar');
      expect(hint).toContain('unit');
    });

    it('returns incompatible hint for dimension errors', () => {
      const { hint } = getErrorHint('convert', 'Cannot convert incompatible dimensions');
      expect(hint).toContain('incompatible');
    });

    it('returns fallback hint for unknown errors', () => {
      const { hint, examples } = getErrorHint('convert', 'Something weird happened');
      expect(hint).toBeTruthy();
      expect(examples.length).toBeGreaterThan(0);
    });

    it('always includes examples', () => {
      const { examples } = getErrorHint('convert', 'any error');
      expect(examples.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('statistics', () => {
    it('returns operation hint for Unknown operation errors', () => {
      const { hint } = getErrorHint('statistics', 'Unknown operation: foo');
      expect(hint).toContain('operation');
    });

    it('returns percentile hint for Percentile errors', () => {
      const { hint } = getErrorHint('statistics', 'Percentile must be between 0 and 100');
      expect(hint).toContain('percentile');
    });

    it('returns empty data hint for empty errors', () => {
      const { hint } = getErrorHint('statistics', 'Data array is empty');
      expect(hint).toContain('at least one');
    });

    it('returns fallback hint for unknown errors', () => {
      const { hint, examples } = getErrorHint('statistics', 'Something weird happened');
      expect(hint).toBeTruthy();
      expect(examples.length).toBeGreaterThan(0);
    });

    it('always includes examples', () => {
      const { examples } = getErrorHint('statistics', 'any error');
      expect(examples.length).toBeGreaterThanOrEqual(2);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/error-hints.test.ts`
Expected: FAIL — module `../src/error-hints.js` not found

**Step 3: Write the implementation**

```typescript
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
  if (errorMessage.includes('Unexpected') || errorMessage.includes('Parenthesis')) {
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
  if (errorMessage.includes('Unknown unit') || errorMessage.includes('Unexpected')) {
    return 'Unit not recognized. Use standard abbreviations: km, m, ft, mile, lb, kg, degC, degF, mph, kph.';
  }
  if (errorMessage.includes('Cannot convert') || errorMessage.includes('dimensions')) {
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
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/error-hints.test.ts`
Expected: All 14 tests PASS

**Step 5: Commit**

```bash
git add src/error-hints.ts tests/error-hints.test.ts
git commit -m "feat: add error hints with tool-specific guidance and examples"
```

---

### Task 4: Integrate Normalization into Engine

**Files:**

- Modify: `src/engine.ts` (import normalization, update EngineResult, update evaluateExpression and convertUnit)
- Modify: `tests/engine.test.ts` (add normalization integration tests)

**Step 1: Write the failing integration tests**

Add to `tests/engine.test.ts` inside the `evaluateExpression` describe block:

```typescript
it('normalizes Unicode multiplication symbol', () => {
  const result = evaluateExpression('2 × 3');
  expect(result).toHaveProperty('result');
  expect((result as { result: string }).result).toBe('6');
});

it('normalizes Unicode division symbol', () => {
  const result = evaluateExpression('10 ÷ 2');
  expect(result).toHaveProperty('result');
  expect((result as { result: string }).result).toBe('5');
});

it('normalizes π to pi', () => {
  const result = evaluateExpression('π');
  expect(result).toHaveProperty('result');
  expect(Number((result as { result: string }).result)).toBeCloseTo(3.14159, 4);
});

it('returns note when expression was normalized', () => {
  const result = evaluateExpression('2 × 3');
  expect(result).toHaveProperty('note');
  expect((result as { result: string; note: string }).note).toContain('2 × 3');
  expect((result as { result: string; note: string }).note).toContain('2 * 3');
});

it('does not return note for clean expressions', () => {
  const result = evaluateExpression('2 * 3');
  expect(result).not.toHaveProperty('note');
});

it('strips thousands commas and evaluates', () => {
  const result = evaluateExpression('1,000 + 2,000');
  expect(result).toHaveProperty('result');
  expect((result as { result: string }).result).toBe('3000');
});
```

Add to `tests/engine.test.ts` inside the `convertUnit` describe block:

```typescript
it('normalizes natural-language unit names', () => {
  const result = convertUnit(100, 'celsius', 'fahrenheit');
  expect(result).toHaveProperty('result');
  expect(Number((result as { result: string }).result)).toBeCloseTo(212, 0);
});

it('returns note when units were normalized', () => {
  const result = convertUnit(0, 'celsius', 'fahrenheit');
  expect(result).toHaveProperty('note');
  expect((result as { result: string; note: string }).note).toContain('celsius');
  expect((result as { result: string; note: string }).note).toContain('degC');
});

it('does not return note for standard units', () => {
  const result = convertUnit(5, 'km', 'miles');
  expect(result).not.toHaveProperty('note');
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/engine.test.ts`
Expected: New tests FAIL — `evaluateExpression('2 × 3')` returns error (mathjs doesn't understand ×), and `result.note` doesn't exist on EngineResult

**Step 3: Update engine.ts**

Changes to `src/engine.ts`:

1. Add import at top:

```typescript
import { normalizeExpression, normalizeUnit } from './normalization.js';
```

2. Replace the `EngineResult` type:

```typescript
export type EngineResult = { result: string; note?: string } | { error: string };
```

3. Update `evaluateExpression` — add normalization after validation, before sandbox:

```typescript
export function evaluateExpression(expression: string, precision: number = 14): EngineResult {
  if (expression.trim().length === 0) {
    return { error: 'Expression is empty' };
  }
  if (expression.length > MAX_EXPRESSION_LENGTH) {
    return {
      error: `Expression too long (${expression.length} chars, max ${MAX_EXPRESSION_LENGTH})`,
    };
  }

  const norm = normalizeExpression(expression);

  try {
    const sandbox = { fn: limitedEvaluate, expr: norm.value };
    const raw = vm.runInNewContext('fn(expr)', sandbox, { timeout: TIMEOUT_MS });
    const formatted = math.format(raw, { precision, upperExp: 14, lowerExp: -14 });
    const engineResult: { result: string; note?: string } = { result: formatted };
    if (norm.wasTransformed) {
      engineResult.note = `Expression '${norm.original}' was interpreted as '${norm.value}'`;
    }
    return engineResult;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('Script execution timed out')) {
      return { error: 'Computation timed out after 5 seconds' };
    }
    return { error: message };
  }
}
```

4. Update `convertUnit` — add normalization before math.unit():

```typescript
export function convertUnit(value: number, from: string, to: string): EngineResult {
  const normFrom = normalizeUnit(from);
  const normTo = normalizeUnit(to);

  try {
    const unit = math.unit(value, normFrom.value);
    const converted = unit.to(normTo.value);
    const num = converted.toNumber();
    const engineResult: { result: string; note?: string } = { result: String(num) };

    const notes: string[] = [];
    if (normFrom.wasTransformed) {
      notes.push(`'${normFrom.original}' was interpreted as '${normFrom.value}'`);
    }
    if (normTo.wasTransformed) {
      notes.push(`'${normTo.original}' was interpreted as '${normTo.value}'`);
    }
    if (notes.length > 0) {
      engineResult.note = notes.join('; ');
    }

    return engineResult;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: message };
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/engine.test.ts`
Expected: All tests PASS (existing + new)

**Step 5: Run full test suite to check for regressions**

Run: `npx vitest run`
Expected: All tests PASS — existing tool handler tests and edge-case tests still work because `note` is optional and JSON.stringify includes it harmlessly

**Step 6: Commit**

```bash
git add src/engine.ts tests/engine.test.ts
git commit -m "feat: integrate normalization into engine with transparency notes"
```

---

### Task 5: Integrate Error Hints into Tool Handlers

**Files:**

- Modify: `src/tools/calculate.ts`
- Modify: `src/tools/convert.ts`
- Modify: `src/tools/statistics.ts`
- Modify: `tests/calculate.test.ts`
- Modify: `tests/convert.test.ts`
- Modify: `tests/statistics.test.ts`

**Step 1: Write the failing tool handler tests**

Add to `tests/calculate.test.ts`:

```typescript
it('handler returns hint and examples on error', async () => {
  const response = await calculateTool.handler({ expression: '2 +* 3' });
  expect(response.isError).toBe(true);
  const content = JSON.parse(response.content[0].text);
  expect(content.hint).toBeTruthy();
  expect(content.examples).toBeInstanceOf(Array);
  expect(content.examples.length).toBeGreaterThan(0);
});

it('handler returns note when expression was normalized', async () => {
  const response = await calculateTool.handler({ expression: '2 × 3' });
  expect(response.isError).toBeUndefined();
  const content = JSON.parse(response.content[0].text);
  expect(content.result).toBe('6');
  expect(content.note).toContain('2 × 3');
  expect(content.note).toContain('2 * 3');
});

it('handler does not return note for clean expressions', async () => {
  const response = await calculateTool.handler({ expression: '2 + 3' });
  const content = JSON.parse(response.content[0].text);
  expect(content.note).toBeUndefined();
});
```

Add to `tests/convert.test.ts`:

```typescript
it('handler returns hint and examples on error', async () => {
  const response = await convertTool.handler({ value: 5, from: 'foobar', to: 'bazqux' });
  expect(response.isError).toBe(true);
  const content = JSON.parse(response.content[0].text);
  expect(content.hint).toBeTruthy();
  expect(content.examples).toBeInstanceOf(Array);
  expect(content.examples.length).toBeGreaterThan(0);
});

it('handler returns note when units were normalized', async () => {
  const response = await convertTool.handler({ value: 100, from: 'celsius', to: 'fahrenheit' });
  expect(response.isError).toBeUndefined();
  const content = JSON.parse(response.content[0].text);
  expect(content.note).toContain('celsius');
  expect(content.note).toContain('degC');
});

it('handler does not return note for standard units', async () => {
  const response = await convertTool.handler({ value: 5, from: 'km', to: 'miles' });
  const content = JSON.parse(response.content[0].text);
  expect(content.note).toBeUndefined();
});
```

Add to `tests/statistics.test.ts`:

```typescript
it('handler returns hint and examples on error', async () => {
  const response = await statisticsTool.handler({ operation: 'mean', data: [] });
  expect(response.isError).toBe(true);
  const content = JSON.parse(response.content[0].text);
  expect(content.hint).toBeTruthy();
  expect(content.examples).toBeInstanceOf(Array);
  expect(content.examples.length).toBeGreaterThan(0);
});
```

**Step 2: Run tests to verify new tests fail**

Run: `npx vitest run tests/calculate.test.ts tests/convert.test.ts tests/statistics.test.ts`
Expected: New tests FAIL — `content.hint` is undefined, `content.note` is undefined

**Step 3: Update calculate.ts handler**

Replace `src/tools/calculate.ts` handler:

```typescript
// src/tools/calculate.ts
import { z } from 'zod/v4';
import { evaluateExpression } from '../engine.js';
import { getErrorHint } from '../error-hints.js';

export const calculateTool = {
  name: 'calculate',

  description: `Deterministic calculator for mathematical expressions. Use this tool whenever you need to compute a numerical result rather than predict one. This includes: arithmetic operations, percentages, exponents, roots, trigonometry, logarithms, factorials, and any expression that has a single correct numerical answer.

DO NOT attempt to calculate results from memory or prediction. If a user asks a question that requires computation, use this tool.

Examples of when to use this tool:
- "What is 15% of 847?" → calculate("0.15 * 847")
- "Calculate 2^32" → calculate("2^32")
- "What's 3,456 × 7,891?" → calculate("3456 * 7891")
- "Square root of 7" → calculate("sqrt(7)")
- "sin(30 degrees)" → calculate("sin(30 deg)")
- "12! / (4! * 8!)" → calculate("12! / (4! * 8!)")

Examples of when NOT to use this tool:
- Rough estimates ("about how many people fit in a stadium")
- Conceptual math explanations ("explain what a derivative is")
- Symbolic algebra that doesn't evaluate to a number`,

  inputSchema: z.object({
    expression: z
      .string()
      .describe("Mathematical expression to evaluate, e.g. '(245 * 389) + (12^3 / 7)'"),
    precision: z.number().optional().describe('Significant digits for the result. Default: 14'),
  }),

  handler: async (args: { expression: string; precision?: number }) => {
    const result = evaluateExpression(args.expression, args.precision);

    if ('error' in result) {
      const { hint, examples } = getErrorHint('calculate', result.error);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: result.error,
              expression: args.expression,
              hint,
              examples,
            }),
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            result: result.result,
            expression: args.expression,
            ...(result.note && { note: result.note }),
          }),
        },
      ],
    };
  },
};
```

**Step 4: Update convert.ts handler**

Replace `src/tools/convert.ts` handler:

```typescript
// src/tools/convert.ts
import { z } from 'zod/v4';
import { convertUnit } from '../engine.js';
import { getErrorHint } from '../error-hints.js';

export const convertTool = {
  name: 'convert',

  description: `Converts between units of measurement deterministically. Supports length, weight, volume, temperature, area, speed, time, data (bytes/bits), and 100+ other units.

Use this tool whenever a user asks to convert between units. The value, source unit, and target unit must be specified separately.

Common aliases like "mph", "kph", "knots" are supported in addition to standard mathjs units.

Examples:
- "Convert 5 km to miles" → convert(5, "km", "miles")
- "100°F in Celsius" → convert(100, "fahrenheit", "celsius")
- "1 lb in kg" → convert(1, "lb", "kg")
- "1024 bytes to kB" → convert(1024, "bytes", "kB")
- "60 mph to km/h" → convert(60, "mph", "kph")`,

  inputSchema: z.object({
    value: z.number().describe('The numeric value to convert'),
    from: z.string().describe("Source unit, e.g. 'km', 'fahrenheit', 'lb'"),
    to: z.string().describe("Target unit, e.g. 'miles', 'celsius', 'kg'"),
  }),

  handler: async (args: { value: number; from: string; to: string }) => {
    const result = convertUnit(args.value, args.from, args.to);

    if ('error' in result) {
      const { hint, examples } = getErrorHint('convert', result.error);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: result.error,
              value: args.value,
              from: args.from,
              to: args.to,
              hint,
              examples,
            }),
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            result: result.result,
            value: args.value,
            from: args.from,
            to: args.to,
            ...(result.note && { note: result.note }),
          }),
        },
      ],
    };
  },
};
```

**Step 5: Update statistics.ts handler**

Replace `src/tools/statistics.ts` handler:

```typescript
// src/tools/statistics.ts
import { z } from 'zod/v4';
import { computeStatistic, type StatOperation } from '../engine.js';
import { getErrorHint } from '../error-hints.js';

export const statisticsTool = {
  name: 'statistics',

  description: `Computes statistical measures on a dataset deterministically. Use this tool when a user asks for mean, median, mode, standard deviation, variance, min, max, sum, or percentile calculations on a set of numbers.

Examples:
- "What's the average of these test scores?" → statistics("mean", [85, 92, 78, 95, 88])
- "Find the median household income" → statistics("median", [45000, 52000, 61000, 38000])
- "90th percentile of response times" → statistics("percentile", [120, 340, 200, 150, 180], 90)
- "Standard deviation of this sample" → statistics("std", [23, 45, 12, 67, 34])`,

  inputSchema: z.object({
    operation: z
      .enum(['mean', 'median', 'mode', 'std', 'variance', 'min', 'max', 'sum', 'percentile'])
      .describe('The statistical operation to perform'),
    data: z.array(z.number()).describe('Array of numbers to compute the statistic on'),
    percentile: z
      .number()
      .optional()
      .describe('Percentile value (0-100), required if operation is "percentile"'),
  }),

  handler: async (args: { operation: string; data: number[]; percentile?: number }) => {
    const result = computeStatistic(args.operation as StatOperation, args.data, args.percentile);

    if ('error' in result) {
      const { hint, examples } = getErrorHint('statistics', result.error);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: result.error,
              operation: args.operation,
              hint,
              examples,
            }),
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ result: result.result, operation: args.operation }),
        },
      ],
    };
  },
};
```

**Step 6: Run tests to verify they pass**

Run: `npx vitest run tests/calculate.test.ts tests/convert.test.ts tests/statistics.test.ts`
Expected: All tests PASS (existing + new)

**Step 7: Commit**

```bash
git add src/tools/calculate.ts src/tools/convert.ts src/tools/statistics.ts tests/calculate.test.ts tests/convert.test.ts tests/statistics.test.ts
git commit -m "feat: integrate error hints and normalization notes into tool handlers"
```

---

### Task 6: Final Verification

**Files:** None (verification only)

**Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS across all test files

**Step 2: Run lint**

Run: `npx eslint src/`
Expected: No errors

**Step 3: Run format check**

Run: `npx prettier --check .`
Expected: All files formatted (or run `npx prettier --write .` if needed)

**Step 4: Run build**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors

**Step 5: Commit any formatting fixes if needed**

```bash
git add -A
git commit -m "chore: format and lint fixes"
```
