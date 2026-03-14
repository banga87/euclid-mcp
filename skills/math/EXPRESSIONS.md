# Expression Reference — `calculate` tool

## Operators

| Operator | Meaning        | Example           |
| -------- | -------------- | ----------------- |
| `+`      | Addition       | `2 + 3` → `5`     |
| `-`      | Subtraction    | `10 - 4` → `6`    |
| `*`      | Multiplication | `7 * 8` → `56`    |
| `/`      | Division       | `15 / 4` → `3.75` |
| `^`      | Exponentiation | `2^10` → `1024`   |
| `!`      | Factorial      | `5!` → `120`      |

Standard order of operations applies. Use parentheses to control grouping.

## Functions

| Function       | Description          | Example                 |
| -------------- | -------------------- | ----------------------- |
| `sqrt(x)`      | Square root          | `sqrt(144)` → `12`      |
| `abs(x)`       | Absolute value       | `abs(-5)` → `5`         |
| `ceil(x)`      | Round up             | `ceil(4.2)` → `5`       |
| `floor(x)`     | Round down           | `floor(4.8)` → `4`      |
| `round(x)`     | Round to nearest     | `round(4.5)` → `5`      |
| `exp(x)`       | e^x                  | `exp(1)` → `2.71828...` |
| `log(x, base)` | Logarithm            | `log(100, 10)` → `2`    |
| `ln(x)`        | Natural log (base e) | `ln(e)` → `1`           |
| `sin(x)`       | Sine (radians)       | `sin(pi / 2)` → `1`     |
| `cos(x)`       | Cosine (radians)     | `cos(0)` → `1`          |
| `tan(x)`       | Tangent (radians)    | `tan(pi / 4)` → `1`     |
| `asin(x)`      | Inverse sine         | `asin(1)` → `1.5707...` |
| `acos(x)`      | Inverse cosine       | `acos(1)` → `0`         |
| `atan(x)`      | Inverse tangent      | `atan(1)` → `0.7853...` |

### Trigonometry with degrees

Trig functions use **radians** by default. Append `deg` for degree input:

```
sin(30 deg)     → 0.5
cos(45 deg)     → 0.7071...
sin(pi / 6)     → 0.5  (radians, same result)
```

## Constants

| Constant | Value               | Usage        |
| -------- | ------------------- | ------------ |
| `pi`     | 3.14159265358979... | `2 * pi * r` |
| `e`      | 2.71828182845904... | `e^2`        |
| `phi`    | 1.61803398874989... | Golden ratio |

## Unicode Support

These symbols are normalized automatically — you can use them directly:

| Input               | Converted to | Example                                    |
| ------------------- | ------------ | ------------------------------------------ |
| `×`                 | `*`          | `2 × 3` → `2 * 3`                          |
| `÷`                 | `/`          | `10 ÷ 2` → `10 / 2`                        |
| `²`                 | `^2`         | `5²` → `5^2`                               |
| `³`                 | `^3`         | `2³` → `2^3`                               |
| `√`                 | `sqrt(...)`  | `√16` → `sqrt(16)`, `√(2+3)` → `sqrt(2+3)` |
| `π`                 | `pi`         | `2π` → `2pi`                               |
| `−` (Unicode minus) | `-`          | `5 − 3` → `5 - 3`                          |

## Thousands Separators

Commas in numbers are stripped automatically:

```
3,456 * 7,891       → 3456 * 7891
1,000,000 + 500     → 1000000 + 500
```

Function argument commas are preserved: `log(100, 10)` stays as-is.

## Precision

The `precision` parameter controls significant digits in the result (default: 14):

```
calculate({ expression: "pi", precision: 6 })  → "3.14159"
calculate({ expression: "1/3" })                → "0.33333333333333"
```

## Edge Cases

| Expression         | Result              | Note             |
| ------------------ | ------------------- | ---------------- |
| `1 / 0`            | `Infinity`          | Not an error     |
| `-1 / 0`           | `-Infinity`         | Not an error     |
| `0 / 0`            | `NaN`               | Not an error     |
| `sqrt(-1)`         | `i`                 | Complex number   |
| `e^(i * pi) + 1`   | `≈ 0`               | Euler's identity |
| Very large numbers | Scientific notation | e.g., `1e+30`    |

## Limits

- **Max expression length:** 1000 characters
- **Execution timeout:** 5 seconds
- **Disabled functions:** `import`, `createUnit`, `evaluate`, `parse`, `simplify`,
  `derivative`, `resolve`, `reviver` (blocked for security)
