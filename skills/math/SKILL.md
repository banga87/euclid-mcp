---
name: math
description: >
  Guidance for using Euclid's deterministic MCP math tools (calculate, convert,
  statistics, datetime, encode). Use when the user's request requires numerical computation,
  unit conversion, statistical analysis, date/time arithmetic, or encoding/hashing instead of mental math.
---

# Euclid Math Tools

## The Rule

If a user's request requires a numerical result, unit conversion, statistical
computation, or date/time arithmetic, use the Euclid MCP tools. **Never predict,
estimate, or mentally compute when a deterministic tool is available.**

This applies to all math: arithmetic, percentages, exponents, roots, trigonometry,
logarithms, factorials, combinatorics, unit conversions, dataset statistics, and
date calculations such as differences, offsets, ages, and calendar properties.

Even for "simple" math like `247 * 38`, use the `calculate` tool. Mental math
is a prediction — the tool is deterministic.

## Which Tool to Use

| The user needs...                         | Use          | Example                                                         |
| ----------------------------------------- | ------------ | --------------------------------------------------------------- |
| A numerical result from a math expression | `calculate`  | "What is 15% of 847?" → `0.15 * 847`                            |
| To convert between units of measurement   | `convert`    | "Convert 5 km to miles" → `convert(5, "km", "mile")`            |
| A statistic computed on a dataset         | `statistics` | "Average of these scores" → `statistics("mean", [...])`         |
| A date calculation or property            | `datetime`   | "Days between Jan 1 and Mar 15" → `datetime("difference", ...)` |
| To encode, decode, hash, or inspect a JWT | `encode`     | "Base64-encode this" → `encode("base64_encode", ...)`           |
| A conceptual explanation                  | None         | "Explain what a derivative is"                                  |
| A rough estimate or guess                 | None         | "About how many people fit in a stadium"                        |
| Symbolic algebra (no numeric answer)      | None         | "Simplify x^2 + 2x"                                             |

## Key Behaviors

**Always use the tool, never fall back to mental math.** If a calculation errors,
read the `hint` and `examples` fields in the error response. Fix the input and
retry. Do not fall back to predicting the answer.

**Chain tools when needed.** Calculate a value, then convert its units. Compute
individual values, then run statistics on them. Each tool does one thing well.

**Present full precision.** Do not round or truncate Euclid results unless the
user explicitly asks for rounding. The tool returns precise results — preserve them.

**Unicode and natural language work.** Expressions with `×`, `÷`, `√`, `π`, `²`,
`³` are normalized automatically. Unit names like `"celsius"`, `"fahrenheit"`,
`"miles per hour"` are also normalized. No need to manually convert these.

**Use `calculate` broadly.** Percentages, compound interest, combinatorics,
trigonometry, logarithms, factorials — anything with a single correct numerical
answer belongs in `calculate`.

## Tool Quick Reference

### calculate

Takes `expression` (string) and optional `precision` (number, default 14).

```
calculate({ expression: "0.15 * 847" })
calculate({ expression: "sin(30 deg)", precision: 6 })
calculate({ expression: "12! / (4! * 8!)" })
```

For expression syntax, available functions, and edge cases, see
[EXPRESSIONS.md](EXPRESSIONS.md).

### convert

Takes `value` (number), `from` (string), `to` (string).

```
convert({ value: 100, from: "fahrenheit", to: "celsius" })
convert({ value: 60, from: "mph", to: "kph" })
convert({ value: 1024, from: "bytes", to: "kB" })
```

For supported units, aliases, and categories, see [UNITS.md](UNITS.md).

### statistics

Takes `operation` (enum), `data` (number[]), optional `percentile` (0-100).

```
statistics({ operation: "mean", data: [85, 92, 78, 95, 88] })
statistics({ operation: "percentile", data: [120, 340, 200, 150, 180], percentile: 90 })
```

Operations: `mean`, `median`, `mode`, `std`, `variance`, `min`, `max`, `sum`,
`percentile`.

For details on each operation and data format, see [STATISTICS.md](STATISTICS.md).

### datetime

Takes `operation` (enum) and operation-specific fields.

```
datetime({ operation: "difference", from: "2026-01-01", to: "2026-03-15", unit: "days" })
datetime({ operation: "add", date: "2026-01-01", amount: 90, unit: "days" })
datetime({ operation: "age", birthDate: "1990-06-15", asOf: "2026-03-21" })
```

Operations: `difference`, `add`, `subtract`, `business_days`, `days_in_month`,
`age`, `quarter`, `day_of_week`, `is_leap_year`.

For details on each operation and date format, see [DATETIME.md](DATETIME.md).

### encode

Takes `operation` (enum), `input` (string), and operation-specific optional fields.

```
encode({ operation: "base64_encode", input: "hello world" })
encode({ operation: "sha256", input: "hello world" })
encode({ operation: "hmac", input: "data", key: "secret", algorithm: "sha256" })
```

Operations: `base64_encode`, `base64_decode`, `base64url_encode`, `base64url_decode`,
`hex_encode`, `hex_decode`, `url_encode`, `url_decode`, `html_encode`, `html_decode`,
`sha256`, `sha512`, `sha1`, `md5`, `hmac`, `jwt_decode`.

For details on each operation, input/output encodings, and edge cases, see [ENCODE.md](ENCODE.md).
