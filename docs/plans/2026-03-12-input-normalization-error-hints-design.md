# Input Normalization & Error Hints Design

**Date:** 2026-03-12
**Status:** Approved
**Goal:** Proactively harden the MCP server against LLM input variations by adding a preprocessing normalization layer and enriched error messages with corrective guidance.

## Motivation

LLMs frequently send expressions and unit names in formats that mathjs doesn't accept (Unicode symbols like `×`, natural-language unit names like `"celsius"`). The existing unit alias registrations (`mph`, `kph`, etc.) handle a few cases, but the approach doesn't scale. Rather than waiting for failures to accumulate, we're getting ahead of the problem with two complementary layers:

1. **Normalization** — cheap preprocessing that fixes predictable input variations before they hit mathjs
2. **Error hints** — enriched error responses that help the LLM self-correct on retry

## Design Decisions

- **Minimal normalization, not NLP** — only symbol substitutions and exact-match alias lookups. No fuzzy matching.
- **Transparent transformations** — when normalization changes input, the response includes both original and normalized forms so the LLM can learn the correct format.
- **Error hints are tool-specific and error-pattern-specific** — targeted guidance when the error type is recognizable, plus general examples always included.
- **Separate files** — `src/normalization.ts` and `src/error-hints.ts` keep concerns cleanly separated from engine evaluation logic.

## Architecture

### `src/normalization.ts`

Two exported functions returning a common result type:

```typescript
type NormalizeResult = {
  value: string;
  wasTransformed: boolean;
  original: string;
};

function normalizeExpression(input: string): NormalizeResult;
function normalizeUnit(input: string): NormalizeResult;
```

**`normalizeExpression`** — static map of character-level substitutions:

- `×` → `*`, `÷` → `/`
- `²` → `^2`, `³` → `^3`
- `√(` or `√` → `sqrt(`
- `π` → `pi`
- Strip thousands-separator commas (e.g., `3,456` → `3456`)

Applied via sequential `.replace()` calls.

**`normalizeUnit`** — static map of natural-language unit names to mathjs equivalents:

- `"celsius"` → `"degC"`, `"fahrenheit"` → `"degF"`
- `"kilometers per hour"` → `"km/hour"`, `"miles per hour"` → `"mile/hour"`
- `"meters per second"` → `"m/s"`
- `"square meters"` → `"m^2"`, `"cubic meters"` → `"m^3"`

Case-insensitive via `.toLowerCase()`. Exact matches only.

### `src/error-hints.ts`

One exported function:

```typescript
type ErrorHint = {
  hint: string;
  examples: string[];
};

function getErrorHint(
  tool: 'calculate' | 'convert' | 'statistics',
  errorMessage: string,
): ErrorHint;
```

**Pattern matching per tool:**

**Calculate:**

- Syntax errors → guidance on supported operators
- Undefined symbols → list of supported functions
- Disabled functions → security explanation
- Fallback → generic hint
- Examples: `["2 * 3", "sqrt(16)", "sin(pi / 4)", "log(100, 10)", "12! / (4! * 8!)"]`

**Convert:**

- Unknown unit → guidance on standard abbreviations
- Incompatible units → guidance on matching quantity types
- Fallback → generic hint
- Examples: `["convert(5, 'km', 'mile')", "convert(100, 'degF', 'degC')", "convert(1, 'lb', 'kg')"]`

**Statistics:**

- Unknown operation → list valid operations
- Percentile issues → percentile requirements
- Empty data → data requirements
- Fallback → generic hint
- Examples: `["statistics('mean', [1, 2, 3])", "statistics('percentile', [10, 20, 30], 90)"]`

### Integration

**Engine (`src/engine.ts`):**

- `evaluateExpression()` calls `normalizeExpression()` before VM evaluation
- `convertUnit()` calls `normalizeUnit()` on `from` and `to` before `math.unit()`
- `EngineResult` type expands to carry optional normalization metadata

```typescript
export type EngineResult =
  | { result: string; normalized?: { original: string; expression: string } }
  | { error: string };
```

Convert uses a similar pattern with `originalFrom`/`from`/`originalTo`/`to`.

**Tool handlers:**

- Error branch: call `getErrorHint()` and append `hint` + `examples` to the JSON response
- Success branch: if normalization occurred, append a `note` field (e.g., `"Note: '2 x 3' was interpreted as '2 * 3'"`)
- Statistics handler: no normalization needed (structured enum + number array inputs), only error hints added

**No changes to `index.ts`.**

## Testing

**New test files:**

- `tests/normalization.test.ts` — each symbol/unit mapping, passthrough cases, case insensitivity
- `tests/error-hints.test.ts` — each tool + error pattern combo, fallback behavior, non-empty examples

**Updated test files:**

- `tests/engine.test.ts` — normalized expressions evaluate correctly with metadata
- `tests/convert.test.ts` — natural-language unit names work end-to-end
- `tests/calculate.test.ts` — error responses include `hint` and `examples` fields
