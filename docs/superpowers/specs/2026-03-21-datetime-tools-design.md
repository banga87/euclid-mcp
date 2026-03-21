# DateTime Tools Design Spec

**Date:** 2026-03-21
**Status:** Approved
**Scope:** Add `datetime` MCP tool + skill + error-hints registry refactor

---

## Overview

Add a `datetime` tool to the Euclid MCP server that provides deterministic calendar and duration arithmetic. No timezone database, no DST — pure calendar math. Implements the datetime section of the Wave 1 expansion plan using `date-fns`.

Alongside the new tool, refactor `src/error-hints.ts` from a monolith to a registry pattern to support scaling to future tools.

## Dependency

**`date-fns`** — tree-shakeable date arithmetic library (~10-14 KB bundled, ~52M downloads/week, native TypeScript, ESM, zero transitive dependencies).

Chosen over:
- `dayjs` (~2 KB) — lacks built-in business day support
- `luxon` — not tree-shakeable
- `mathjs` — has no date/time functionality

## Tool Definition

### `datetime`

**Purpose:** Deterministic date/time arithmetic. No timezone conversions or DST transitions — pure calendar math.

**Disambiguation prompt:** "This tool performs calendar and duration arithmetic. It does not handle timezone conversions or DST transitions. Use `calculate` for pure number arithmetic. Use `convert` for time unit conversion (hours to minutes, etc.)."

### Operations

#### `difference`

- **Required:** `from` (ISO date string), `to` (ISO date string)
- **Optional:** `unit` (`"days"` | `"weeks"` | `"months"` | `"years"` | `"hours"` | `"minutes"`, default: returns full breakdown)
- **Returns:** `{ difference, breakdown: { years, months, days, hours, minutes, seconds } }`

#### `add`

- **Required:** `date` (ISO date string), `amount` (number), `unit` (`"days"` | `"weeks"` | `"months"` | `"years"` | `"hours"` | `"minutes"` | `"seconds"`)
- **Returns:** `{ result }` (ISO date string)

#### `subtract`

- **Required:** `date` (ISO date string), `amount` (number), `unit` (`"days"` | `"weeks"` | `"months"` | `"years"` | `"hours"` | `"minutes"` | `"seconds"`)
- **Returns:** `{ result }` (ISO date string)

#### `business_days`

- **Required:** `from` (ISO date string), `to` (ISO date string)
- **Returns:** `{ count }` (weekday count, excludes weekends)

#### `days_in_month`

- **Required:** `year` (number), `month` (number, 1-12)
- **Returns:** `{ days }`

#### `age`

- **Required:** `birthDate` (ISO date string), `asOf` (ISO date string)
- **Returns:** `{ years, months, days }`
- **Note:** `asOf` is required (no "today" default) to maintain determinism — same inputs always produce same outputs. The LLM knows the current date from its system prompt.

#### `quarter`

- **Required:** `date` (ISO date string)
- **Returns:** `{ quarter, quarterStart, quarterEnd }`

### Date Format

- **Primary:** ISO 8601 (`"2026-03-12"`, `"2026-03-12T14:30:00"`)
- **Normalization:** Attempts to parse common natural formats (`"March 12, 2026"`, `"12/03/2026"`) but the tool description recommends ISO.

## File Structure

### New Files

```
src/engines/datetime.ts        — Pure date/time functions
src/tools/datetime.ts          — Tool definition (name, description, schema, handler)
src/error-hints/index.ts       — Registry + getErrorHint() dispatcher
src/error-hints/calculate.ts   — Calculate hints (migrated from monolith)
src/error-hints/convert.ts     — Convert hints (migrated from monolith)
src/error-hints/statistics.ts  — Statistics hints (migrated from monolith)
src/error-hints/datetime.ts    — Datetime hints
tests/datetime.test.ts         — Datetime operation tests
skills/math/DATETIME.md        — Datetime tool reference for LLMs
```

### Modified Files

```
src/index.ts                   — Register datetime tool
src/normalization.ts           — Add normalizeDate() function
src/tools/calculate.ts         — Update import path for error hints
src/tools/convert.ts           — Update import path for error hints
src/tools/statistics.ts        — Update import path for error hints
skills/math/SKILL.md           — Add datetime to decision table + quick reference
hooks/session-start            — Mention datetime in injected context
package.json                   — Add date-fns dependency
```

### Deleted Files

```
src/error-hints.ts             — Replaced by src/error-hints/ directory
```

## Engine Module: `src/engines/datetime.ts`

Pure functions following the existing engine pattern:

- Each operation is a function returning `{ result, ... } | { error }`
- Input validation (date parsing, range checks) happens inside the engine
- No exceptions thrown to caller — all errors returned as values
- Uses `date-fns` functions: `differenceInDays`, `differenceInBusinessDays`, `addDays`, `addMonths`, `addYears`, `getDaysInMonth`, `startOfQuarter`, `endOfQuarter`, `isWeekend`, etc.

## Normalization: `normalizeDate()`

A new function in `src/normalization.ts`:

- `"March 12, 2026"` → `"2026-03-12"`
- `"12/03/2026"` → best-effort parse (ambiguous — hint recommends ISO)
- Already-ISO strings pass through unchanged
- Returns original string if unparseable (engine catches and returns error with hint)

## Error Hints Registry

### Architecture

- `src/error-hints/index.ts` — Exports `getErrorHint(tool: string, error: string)` that dispatches to the correct module by tool name
- Each per-tool module exports `getHint(error: string): { hint: string, examples: string[] } | null`
- Existing consumers continue calling `getErrorHint()` with the same signature — no breaking change to the public API

### Datetime Hints

| Pattern | Hint |
|---------|------|
| Invalid date | "Date must be in ISO 8601 format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss" |
| Invalid month | "Month must be between 1 and 12" |
| Business days from > to | "Start date must be before end date" |
| Unparseable natural date | "Could not parse date. Use ISO format: 2026-03-21" |

## Skills

### New: `skills/math/DATETIME.md`

- All 7 operations with input/output examples
- ISO 8601 format guidance
- Common patterns: "How many days between X and Y", "What date is 90 days from X", "How old is someone born on X"
- Disambiguation: datetime vs calculate vs convert

### Updated: `skills/math/SKILL.md`

- Add `datetime` to the "Which Tool to Use" decision table
- Add quick reference examples for datetime operations
- Reference `DATETIME.md` for detailed documentation

### Updated: `hooks/session-start`

- Mention `datetime` alongside existing tools in the injected context

## Testing: `tests/datetime.test.ts`

### Operation Tests

All 7 operations with expected inputs/outputs.

### Edge Cases

- Leap year handling (Feb 29)
- Month boundary arithmetic (Jan 31 + 1 month)
- End-of-month add behavior
- Business days spanning weekends
- Year boundary crossing
- Date-only vs datetime inputs

### Error Cases

- Invalid date strings
- Invalid month numbers (0, 13)
- `from` after `to` in business_days
- Unparseable natural language dates

## Design Decisions

1. **`date-fns` over mathjs** — mathjs has no date/time functionality at all
2. **`date-fns` over `dayjs`** — dayjs lacks built-in business day support
3. **`date-fns` over `luxon`** — luxon is not tree-shakeable
4. **`asOf` required in `age`** — determinism: same inputs always produce same outputs
5. **No timezone/DST** — keeps the tool simple and deterministic; timezone math is a different domain
6. **Error hints registry refactor** — scales to future Wave 1 tools without growing a monolith
7. **Separate engine module** (`src/engines/datetime.ts`) — keeps existing `src/engine.ts` untouched
