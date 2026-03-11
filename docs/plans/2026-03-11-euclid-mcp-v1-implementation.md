# Euclid MCP v1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a deterministic calculator MCP server with three tools (calculate, convert, statistics) powered by mathjs, distributed as an npm package.

**Architecture:** Flat module structure — one engine module (sandboxed mathjs), three tool modules, one entry point. Stdio transport. TDD throughout.

**Tech Stack:** TypeScript, Node.js 20+, pnpm, @modelcontextprotocol/server, mathjs, zod, vitest, tsup

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`

**Step 1: Create package.json**

```json
{
  "name": "euclid-mcp",
  "version": "0.1.0",
  "description": "Deterministic math tools for LLMs — an MCP server powered by mathjs",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "euclid-mcp": "dist/index.js"
  },
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsup src/index.ts --format esm --banner.js '#!/usr/bin/env node'",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src/",
    "format": "prettier --write 'src/**/*.ts' 'tests/**/*.ts'"
  },
  "keywords": ["mcp", "calculator", "math", "deterministic", "llm", "mathjs"],
  "license": "MIT",
  "engines": {
    "node": ">=20"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**Step 3: Create .gitignore**

```
node_modules/
dist/
*.tsbuildinfo
.env
```

**Step 4: Install dependencies**

Run:
```bash
pnpm init 2>/dev/null; pnpm add @modelcontextprotocol/server mathjs zod && pnpm add -D typescript tsx vitest tsup eslint prettier @types/node
```

Expected: dependencies installed, `pnpm-lock.yaml` created.

Note: if `@modelcontextprotocol/server` doesn't resolve, try `@modelcontextprotocol/sdk` instead — the package may have been renamed. Adjust imports accordingly.

**Step 5: Create src/ and tests/ directories**

Run:
```bash
mkdir -p src/tools tests
```

**Step 6: Commit**

```bash
git add package.json tsconfig.json .gitignore pnpm-lock.yaml
git commit -m "chore: scaffold project with dependencies"
```

---

### Task 2: Engine Module (TDD)

**Files:**
- Create: `src/engine.ts`
- Create: `tests/engine.test.ts`

**Step 1: Write failing tests for the engine**

```typescript
// tests/engine.test.ts
import { describe, it, expect } from 'vitest';
import { evaluateExpression, convertUnit, computeStatistic } from '../src/engine.js';

describe('evaluateExpression', () => {
  it('evaluates basic arithmetic', () => {
    const result = evaluateExpression('2 + 3');
    expect(result).toEqual({ result: '5' });
  });

  it('evaluates expressions with order of operations', () => {
    const result = evaluateExpression('2 + 3 * 4');
    expect(result).toEqual({ result: '14' });
  });

  it('evaluates exponents', () => {
    const result = evaluateExpression('2^10');
    expect(result).toEqual({ result: '1024' });
  });

  it('evaluates trigonometric functions', () => {
    const result = evaluateExpression('sin(45 deg)');
    expect(result).toHaveProperty('result');
    expect(Number((result as { result: string }).result)).toBeCloseTo(0.7071067811865476, 10);
  });

  it('evaluates factorials', () => {
    const result = evaluateExpression('10!');
    expect(result).toEqual({ result: '3628800' });
  });

  it('respects precision parameter', () => {
    const result = evaluateExpression('1/3', 4);
    expect(result).toEqual({ result: '0.3333' });
  });

  it('returns error for invalid expressions', () => {
    const result = evaluateExpression('2 ++ 3');
    expect(result).toHaveProperty('error');
  });

  it('rejects expressions over 1000 characters', () => {
    const longExpr = '1+'.repeat(501) + '1';
    const result = evaluateExpression(longExpr);
    expect(result).toHaveProperty('error');
    expect((result as { error: string }).error).toContain('too long');
  });

  it('blocks disabled function: import', () => {
    const result = evaluateExpression('import("fs")');
    expect(result).toHaveProperty('error');
  });

  it('blocks disabled function: evaluate', () => {
    const result = evaluateExpression('evaluate("2+3")');
    expect(result).toHaveProperty('error');
  });

  it('blocks disabled function: parse', () => {
    const result = evaluateExpression('parse("2+3")');
    expect(result).toHaveProperty('error');
  });
});

describe('convertUnit', () => {
  it('converts km to miles', () => {
    const result = convertUnit(5, 'km', 'miles');
    expect(result).toHaveProperty('result');
    expect(Number((result as { result: string }).result)).toBeCloseTo(3.10686, 4);
  });

  it('converts fahrenheit to celsius', () => {
    const result = convertUnit(100, 'fahrenheit', 'celsius');
    expect(result).toHaveProperty('result');
    expect(Number((result as { result: string }).result)).toBeCloseTo(37.7778, 3);
  });

  it('returns error for incompatible units', () => {
    const result = convertUnit(5, 'km', 'kg');
    expect(result).toHaveProperty('error');
  });

  it('returns error for unknown units', () => {
    const result = convertUnit(5, 'foobar', 'bazqux');
    expect(result).toHaveProperty('error');
  });
});

describe('computeStatistic', () => {
  const data = [23, 45, 12, 67, 34];

  it('computes mean', () => {
    const result = computeStatistic('mean', data);
    expect(result).toHaveProperty('result');
    expect(Number((result as { result: string }).result)).toBeCloseTo(36.2, 5);
  });

  it('computes median', () => {
    const result = computeStatistic('median', data);
    expect(result).toEqual({ result: '34' });
  });

  it('computes std', () => {
    const result = computeStatistic('std', data);
    expect(result).toHaveProperty('result');
    expect(Number((result as { result: string }).result)).toBeCloseTo(20.1866, 3);
  });

  it('computes sum', () => {
    const result = computeStatistic('sum', data);
    expect(result).toEqual({ result: '181' });
  });

  it('computes min', () => {
    const result = computeStatistic('min', data);
    expect(result).toEqual({ result: '12' });
  });

  it('computes max', () => {
    const result = computeStatistic('max', data);
    expect(result).toEqual({ result: '67' });
  });

  it('computes variance', () => {
    const result = computeStatistic('variance', data);
    expect(result).toHaveProperty('result');
  });

  it('computes mode', () => {
    const result = computeStatistic('mode', [1, 2, 2, 3]);
    expect(result).toEqual({ result: '2' });
  });

  it('computes percentile', () => {
    const result = computeStatistic('percentile', [1, 2, 3, 4, 5], 90);
    expect(result).toHaveProperty('result');
    expect(Number((result as { result: string }).result)).toBeCloseTo(4.6, 1);
  });

  it('returns error for percentile without percentile value', () => {
    const result = computeStatistic('percentile', [1, 2, 3]);
    expect(result).toHaveProperty('error');
  });

  it('returns error for empty data array', () => {
    const result = computeStatistic('mean', []);
    expect(result).toHaveProperty('error');
  });

  it('rejects data arrays over 10000 elements', () => {
    const bigData = Array.from({ length: 10001 }, (_, i) => i);
    const result = computeStatistic('mean', bigData);
    expect(result).toHaveProperty('error');
    expect((result as { error: string }).error).toContain('too many');
  });

  it('returns error for invalid operation', () => {
    const result = computeStatistic('invalid' as any, [1, 2, 3]);
    expect(result).toHaveProperty('error');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test`

Expected: FAIL — `src/engine.ts` does not exist yet.

**Step 3: Implement the engine**

```typescript
// src/engine.ts
import { create, all, type MathJsStatic } from 'mathjs';
import vm from 'node:vm';

const MAX_EXPRESSION_LENGTH = 1000;
const TIMEOUT_MS = 5000;
const MAX_DATA_LENGTH = 10000;

const math: MathJsStatic = create(all);

// Grab reference before overriding
const limitedEvaluate = math.evaluate;

// Disable dangerous functions
math.import(
  {
    import: () => { throw new Error('Function import is disabled'); },
    createUnit: () => { throw new Error('Function createUnit is disabled'); },
    evaluate: () => { throw new Error('Function evaluate is disabled'); },
    parse: () => { throw new Error('Function parse is disabled'); },
    simplify: () => { throw new Error('Function simplify is disabled'); },
    derivative: () => { throw new Error('Function derivative is disabled'); },
    resolve: () => { throw new Error('Function resolve is disabled'); },
    reviver: () => { throw new Error('Function reviver is disabled'); },
  },
  { override: true }
);

type EngineResult = { result: string } | { error: string };

export function evaluateExpression(expression: string, precision: number = 14): EngineResult {
  if (expression.length > MAX_EXPRESSION_LENGTH) {
    return { error: `Expression too long (${expression.length} chars, max ${MAX_EXPRESSION_LENGTH})` };
  }

  try {
    const sandbox = { fn: limitedEvaluate, expr: expression };
    const raw = vm.runInNewContext('fn(expr)', sandbox, { timeout: TIMEOUT_MS });
    const formatted = math.format(raw, { precision });
    return { result: formatted };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('Script execution timed out')) {
      return { error: 'Computation timed out after 5 seconds' };
    }
    return { error: message };
  }
}

export function convertUnit(value: number, from: string, to: string): EngineResult {
  try {
    const unit = math.unit(value, from);
    const converted = unit.to(to);
    const num = converted.toNumber();
    return { result: String(num) };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: message };
  }
}

type StatOperation = 'mean' | 'median' | 'mode' | 'std' | 'variance' | 'min' | 'max' | 'sum' | 'percentile';

export function computeStatistic(
  operation: string,
  data: number[],
  percentile?: number
): EngineResult {
  if (data.length === 0) {
    return { error: 'Data array is empty' };
  }
  if (data.length > MAX_DATA_LENGTH) {
    return { error: `Data array too many elements (${data.length}, max ${MAX_DATA_LENGTH})` };
  }

  try {
    let result: number | number[];

    switch (operation as StatOperation) {
      case 'mean':
        result = math.mean(data) as number;
        break;
      case 'median':
        result = math.median(data) as number;
        break;
      case 'mode':
        result = math.mode(data) as unknown as number[];
        // mode returns an array; take first element for single result
        result = Array.isArray(result) ? result[0] : result;
        break;
      case 'std':
        result = math.std(data) as unknown as number;
        break;
      case 'variance':
        result = math.variance(data) as unknown as number;
        break;
      case 'min':
        result = math.min(data) as number;
        break;
      case 'max':
        result = math.max(data) as number;
        break;
      case 'sum':
        result = math.sum(data) as number;
        break;
      case 'percentile':
        if (percentile === undefined || percentile === null) {
          return { error: 'Percentile value is required when operation is "percentile"' };
        }
        result = math.quantileSeq(data, percentile / 100) as number;
        break;
      default:
        return { error: `Unknown operation: ${operation}` };
    }

    return { result: String(result) };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: message };
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test`

Expected: all engine tests PASS.

Note: if `vm.runInNewContext` has issues with the mathjs function reference across contexts, fall back to a simpler try/catch approach without vm (still safe since mathjs dangerous functions are already disabled). The timeout for extreme expressions like `999999999!` can be revisited with worker_threads if needed.

**Step 5: Commit**

```bash
git add src/engine.ts tests/engine.test.ts
git commit -m "feat: add engine module with sandboxed mathjs evaluation, unit conversion, and statistics"
```

---

### Task 3: Calculate Tool (TDD)

**Files:**
- Create: `src/tools/calculate.ts`
- Create: `tests/calculate.test.ts`

**Step 1: Write failing test**

```typescript
// tests/calculate.test.ts
import { describe, it, expect } from 'vitest';
import { calculateTool } from '../src/tools/calculate.js';

describe('calculateTool', () => {
  it('has correct tool name', () => {
    expect(calculateTool.name).toBe('calculate');
  });

  it('has a description', () => {
    expect(calculateTool.description).toBeTruthy();
  });

  it('has an inputSchema', () => {
    expect(calculateTool.inputSchema).toBeDefined();
  });

  it('handler returns result for valid expression', async () => {
    const response = await calculateTool.handler({ expression: '2 + 3' });
    expect(response.isError).toBeUndefined();
    const content = JSON.parse(response.content[0].text);
    expect(content.result).toBe('5');
    expect(content.expression).toBe('2 + 3');
  });

  it('handler returns result with precision', async () => {
    const response = await calculateTool.handler({ expression: '1/3', precision: 4 });
    const content = JSON.parse(response.content[0].text);
    expect(content.result).toBe('0.3333');
  });

  it('handler returns error for invalid expression', async () => {
    const response = await calculateTool.handler({ expression: '2 ++ 3' });
    expect(response.isError).toBe(true);
    const content = JSON.parse(response.content[0].text);
    expect(content.error).toBeTruthy();
    expect(content.expression).toBe('2 ++ 3');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/calculate.test.ts`

Expected: FAIL — module not found.

**Step 3: Implement the calculate tool**

```typescript
// src/tools/calculate.ts
import { z } from 'zod/v4';
import { evaluateExpression } from '../engine.js';

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
    precision: z
      .number()
      .optional()
      .describe('Significant digits for the result. Default: 14'),
  }),

  handler: async (args: { expression: string; precision?: number }) => {
    const result = evaluateExpression(args.expression, args.precision);

    if ('error' in result) {
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ error: result.error, expression: args.expression }) }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ result: result.result, expression: args.expression }) }],
    };
  },
};
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test tests/calculate.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/tools/calculate.ts tests/calculate.test.ts
git commit -m "feat: add calculate tool with expression evaluation"
```

---

### Task 4: Convert Tool (TDD)

**Files:**
- Create: `src/tools/convert.ts`
- Create: `tests/convert.test.ts`

**Step 1: Write failing test**

```typescript
// tests/convert.test.ts
import { describe, it, expect } from 'vitest';
import { convertTool } from '../src/tools/convert.js';

describe('convertTool', () => {
  it('has correct tool name', () => {
    expect(convertTool.name).toBe('convert');
  });

  it('handler converts km to miles', async () => {
    const response = await convertTool.handler({ value: 5, from: 'km', to: 'miles' });
    expect(response.isError).toBeUndefined();
    const content = JSON.parse(response.content[0].text);
    expect(Number(content.result)).toBeCloseTo(3.10686, 4);
    expect(content.value).toBe(5);
    expect(content.from).toBe('km');
    expect(content.to).toBe('miles');
  });

  it('handler converts temperature', async () => {
    const response = await convertTool.handler({ value: 100, from: 'fahrenheit', to: 'celsius' });
    const content = JSON.parse(response.content[0].text);
    expect(Number(content.result)).toBeCloseTo(37.7778, 3);
  });

  it('handler converts data units', async () => {
    const response = await convertTool.handler({ value: 1024, from: 'bytes', to: 'kB' });
    expect(response.isError).toBeUndefined();
  });

  it('handler returns error for incompatible units', async () => {
    const response = await convertTool.handler({ value: 5, from: 'km', to: 'kg' });
    expect(response.isError).toBe(true);
  });

  it('handler returns error for unknown units', async () => {
    const response = await convertTool.handler({ value: 5, from: 'foobar', to: 'bazqux' });
    expect(response.isError).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/convert.test.ts`

Expected: FAIL — module not found.

**Step 3: Implement the convert tool**

```typescript
// src/tools/convert.ts
import { z } from 'zod/v4';
import { convertUnit } from '../engine.js';

export const convertTool = {
  name: 'convert',

  description: `Converts between units of measurement deterministically. Supports length, weight, volume, temperature, area, speed, time, data (bytes/bits), and 100+ other units.

Use this tool whenever a user asks to convert between units. The value, source unit, and target unit must be specified separately.

Examples:
- "Convert 5 km to miles" → convert(5, "km", "miles")
- "100°F in Celsius" → convert(100, "fahrenheit", "celsius")
- "1 lb in kg" → convert(1, "lb", "kg")
- "1024 bytes to kB" → convert(1024, "bytes", "kB")`,

  inputSchema: z.object({
    value: z.number().describe('The numeric value to convert'),
    from: z.string().describe("Source unit, e.g. 'km', 'fahrenheit', 'lb'"),
    to: z.string().describe("Target unit, e.g. 'miles', 'celsius', 'kg'"),
  }),

  handler: async (args: { value: number; from: string; to: string }) => {
    const result = convertUnit(args.value, args.from, args.to);

    if ('error' in result) {
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ error: result.error, value: args.value, from: args.from, to: args.to }) }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ result: result.result, value: args.value, from: args.from, to: args.to }) }],
    };
  },
};
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test tests/convert.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/tools/convert.ts tests/convert.test.ts
git commit -m "feat: add convert tool for unit conversion"
```

---

### Task 5: Statistics Tool (TDD)

**Files:**
- Create: `src/tools/statistics.ts`
- Create: `tests/statistics.test.ts`

**Step 1: Write failing test**

```typescript
// tests/statistics.test.ts
import { describe, it, expect } from 'vitest';
import { statisticsTool } from '../src/tools/statistics.js';

describe('statisticsTool', () => {
  it('has correct tool name', () => {
    expect(statisticsTool.name).toBe('statistics');
  });

  it('handler computes mean', async () => {
    const response = await statisticsTool.handler({ operation: 'mean', data: [23, 45, 12, 67, 34] });
    expect(response.isError).toBeUndefined();
    const content = JSON.parse(response.content[0].text);
    expect(Number(content.result)).toBeCloseTo(36.2, 5);
    expect(content.operation).toBe('mean');
  });

  it('handler computes median', async () => {
    const response = await statisticsTool.handler({ operation: 'median', data: [23, 45, 12, 67, 34] });
    const content = JSON.parse(response.content[0].text);
    expect(content.result).toBe('34');
  });

  it('handler computes percentile', async () => {
    const response = await statisticsTool.handler({ operation: 'percentile', data: [1, 2, 3, 4, 5], percentile: 90 });
    expect(response.isError).toBeUndefined();
    const content = JSON.parse(response.content[0].text);
    expect(Number(content.result)).toBeCloseTo(4.6, 1);
  });

  it('handler returns error for percentile without value', async () => {
    const response = await statisticsTool.handler({ operation: 'percentile', data: [1, 2, 3] });
    expect(response.isError).toBe(true);
  });

  it('handler returns error for empty data', async () => {
    const response = await statisticsTool.handler({ operation: 'mean', data: [] });
    expect(response.isError).toBe(true);
  });

  it('handler computes mode', async () => {
    const response = await statisticsTool.handler({ operation: 'mode', data: [1, 2, 2, 3] });
    const content = JSON.parse(response.content[0].text);
    expect(content.result).toBe('2');
  });

  it('handler computes sum', async () => {
    const response = await statisticsTool.handler({ operation: 'sum', data: [10, 20, 30] });
    const content = JSON.parse(response.content[0].text);
    expect(content.result).toBe('60');
  });

  it('handler computes min and max', async () => {
    const responseMin = await statisticsTool.handler({ operation: 'min', data: [5, 3, 8, 1] });
    const responseMax = await statisticsTool.handler({ operation: 'max', data: [5, 3, 8, 1] });
    expect(JSON.parse(responseMin.content[0].text).result).toBe('1');
    expect(JSON.parse(responseMax.content[0].text).result).toBe('8');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/statistics.test.ts`

Expected: FAIL — module not found.

**Step 3: Implement the statistics tool**

```typescript
// src/tools/statistics.ts
import { z } from 'zod/v4';
import { computeStatistic } from '../engine.js';

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
    data: z
      .array(z.number())
      .describe('Array of numbers to compute the statistic on'),
    percentile: z
      .number()
      .optional()
      .describe('Percentile value (0-100), required if operation is "percentile"'),
  }),

  handler: async (args: { operation: string; data: number[]; percentile?: number }) => {
    const result = computeStatistic(args.operation, args.data, args.percentile);

    if ('error' in result) {
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ error: result.error, operation: args.operation }) }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ result: result.result, operation: args.operation }) }],
    };
  },
};
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test tests/statistics.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/tools/statistics.ts tests/statistics.test.ts
git commit -m "feat: add statistics tool with mean, median, mode, std, variance, min, max, sum, percentile"
```

---

### Task 6: Server Entry Point

**Files:**
- Create: `src/index.ts`

**Step 1: Implement the server entry point**

```typescript
// src/index.ts
import { McpServer, StdioServerTransport } from '@modelcontextprotocol/server';
import { calculateTool } from './tools/calculate.js';
import { convertTool } from './tools/convert.js';
import { statisticsTool } from './tools/statistics.js';

const server = new McpServer({
  name: 'euclid',
  version: '0.1.0',
});

// Register tools
server.registerTool(
  calculateTool.name,
  {
    description: calculateTool.description,
    inputSchema: calculateTool.inputSchema,
  },
  async (args) => calculateTool.handler(args as { expression: string; precision?: number })
);

server.registerTool(
  convertTool.name,
  {
    description: convertTool.description,
    inputSchema: convertTool.inputSchema,
  },
  async (args) => convertTool.handler(args as { value: number; from: string; to: string })
);

server.registerTool(
  statisticsTool.name,
  {
    description: statisticsTool.description,
    inputSchema: statisticsTool.inputSchema,
  },
  async (args) => statisticsTool.handler(args as { operation: string; data: number[]; percentile?: number })
);

// Connect via stdio
const transport = new StdioServerTransport();
await server.connect(transport);
```

Note: The `McpServer` and `StdioServerTransport` import path should be `@modelcontextprotocol/server`. If this doesn't resolve, check the installed package — it may export from `@modelcontextprotocol/sdk` or a subpath like `@modelcontextprotocol/sdk/server`. Adjust accordingly.

**Step 2: Verify dev server starts**

Run: `echo '{}' | timeout 3 npx tsx src/index.ts 2>&1 || true`

Expected: Server starts and waits for stdio input without crashing. It may exit or timeout — that's fine, we're just checking for import/startup errors.

**Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: add server entry point with stdio transport and tool registration"
```

---

### Task 7: Edge Cases Tests

**Files:**
- Create: `tests/edge-cases.test.ts`

**Step 1: Write edge case tests**

```typescript
// tests/edge-cases.test.ts
import { describe, it, expect } from 'vitest';
import { evaluateExpression } from '../src/engine.js';

describe('edge cases', () => {
  it('handles division by zero', () => {
    const result = evaluateExpression('1/0');
    expect(result).toHaveProperty('result');
    expect((result as { result: string }).result).toBe('Infinity');
  });

  it('handles negative division by zero', () => {
    const result = evaluateExpression('-1/0');
    expect(result).toHaveProperty('result');
    expect((result as { result: string }).result).toBe('-Infinity');
  });

  it('handles 0/0 (NaN)', () => {
    const result = evaluateExpression('0/0');
    expect(result).toHaveProperty('result');
    expect((result as { result: string }).result).toBe('NaN');
  });

  it('handles very large numbers', () => {
    const result = evaluateExpression('2^64');
    expect(result).toHaveProperty('result');
    expect((result as { result: string }).result).toBe('18446744073709552000');
  });

  it('handles complex numbers', () => {
    const result = evaluateExpression('sqrt(-1)');
    expect(result).toHaveProperty('result');
    expect((result as { result: string }).result).toBe('i');
  });

  it('handles Euler identity', () => {
    const result = evaluateExpression('e^(i * pi) + 1');
    expect(result).toHaveProperty('result');
    // Should be approximately 0 (floating point may give very small number)
    const val = (result as { result: string }).result;
    expect(Number(val) === 0 || Math.abs(Number(val)) < 1e-12 || val.includes('e-')).toBe(true);
  });

  it('handles constants', () => {
    const pi = evaluateExpression('pi');
    expect(Number((pi as { result: string }).result)).toBeCloseTo(Math.PI, 10);

    const e = evaluateExpression('e');
    expect(Number((e as { result: string }).result)).toBeCloseTo(Math.E, 10);
  });

  it('handles nested parentheses', () => {
    const result = evaluateExpression('((((1 + 2) * 3) + 4) * 5)');
    expect(result).toEqual({ result: '65' });
  });

  it('handles whitespace in expressions', () => {
    const result = evaluateExpression('  2  +  3  ');
    expect(result).toEqual({ result: '5' });
  });

  it('rejects empty expression', () => {
    const result = evaluateExpression('');
    expect(result).toHaveProperty('error');
  });

  it('blocks createUnit', () => {
    const result = evaluateExpression('createUnit("foo")');
    expect(result).toHaveProperty('error');
    expect((result as { error: string }).error).toContain('disabled');
  });

  it('blocks simplify', () => {
    const result = evaluateExpression('simplify("x^2 + x")');
    expect(result).toHaveProperty('error');
    expect((result as { error: string }).error).toContain('disabled');
  });

  it('blocks derivative', () => {
    const result = evaluateExpression('derivative("x^2", "x")');
    expect(result).toHaveProperty('error');
    expect((result as { error: string }).error).toContain('disabled');
  });

  it('handles logarithms', () => {
    const result = evaluateExpression('log(1000, 10)');
    expect(Number((result as { result: string }).result)).toBeCloseTo(3, 10);
  });

  it('handles natural log', () => {
    const result = evaluateExpression('log(e^5)');
    expect(Number((result as { result: string }).result)).toBeCloseTo(5, 10);
  });
});
```

**Step 2: Run all tests**

Run: `pnpm test`

Expected: all tests PASS.

Note: Some edge case expectations (especially around Euler's identity, NaN formatting, very large numbers) may need adjustment based on how mathjs actually formats them. Fix assertions to match actual mathjs output if needed.

**Step 3: Commit**

```bash
git add tests/edge-cases.test.ts
git commit -m "test: add edge case tests for division by zero, overflow, complex numbers, disabled functions"
```

---

### Task 8: Build & Distribution

**Files:**
- Modify: `package.json` (verify bin and build config)
- Create: `tsup.config.ts` (if needed for custom config)
- Create: `LICENSE`

**Step 1: Create LICENSE file**

```
MIT License

Copyright (c) 2026 Euclid Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

**Step 2: Verify build works**

Run: `pnpm build`

Expected: `dist/index.js` is created with shebang `#!/usr/bin/env node` at the top.

If tsup has issues with the banner option in the CLI script, create a `tsup.config.ts`:

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  banner: { js: '#!/usr/bin/env node' },
  clean: true,
});
```

And simplify the build script in package.json to: `"build": "tsup"`

**Step 3: Verify the built output runs**

Run: `echo '{}' | timeout 3 node dist/index.js 2>&1 || true`

Expected: starts without import errors.

**Step 4: Commit**

```bash
git add LICENSE tsup.config.ts package.json
git commit -m "chore: add LICENSE and build configuration"
```

---

### Task 9: CI & Lint Setup

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.eslintrc.json` (or `eslint.config.js`)
- Create: `.prettierrc`

**Step 1: Create CI workflow**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: latest
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build
```

**Step 2: Create prettier config**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

**Step 3: Create eslint config**

Create a minimal `eslint.config.js` (flat config):

```javascript
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['dist/', 'node_modules/'],
  },
);
```

Install additional eslint deps if needed:

Run: `pnpm add -D @eslint/js typescript-eslint`

**Step 4: Run lint and format**

Run: `pnpm format && pnpm lint`

Expected: no errors. Fix any issues.

**Step 5: Commit**

```bash
git add .github/workflows/ci.yml .prettierrc eslint.config.js
git commit -m "chore: add CI workflow, eslint, and prettier configuration"
```

---

### Task 10: Final Verification

**Step 1: Run full test suite**

Run: `pnpm test`

Expected: all tests PASS.

**Step 2: Run full build**

Run: `pnpm build`

Expected: clean build, `dist/index.js` exists.

**Step 3: Run lint**

Run: `pnpm lint`

Expected: no errors.

**Step 4: Manually test the server (smoke test)**

Run:
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | timeout 5 node dist/index.js 2>&1 || true
```

Expected: Server responds with initialization result (or at least doesn't crash).

**Step 5: Final commit with any remaining changes**

```bash
git add -A
git commit -m "chore: final cleanup and verification"
```
