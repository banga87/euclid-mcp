# Statistics Reference — `statistics` tool

## Operations

| Operation    | Description               | Example                                                  |
| ------------ | ------------------------- | -------------------------------------------------------- |
| `mean`       | Arithmetic average        | `statistics("mean", [1, 2, 3])` → `2`                    |
| `median`     | Middle value (sorted)     | `statistics("median", [1, 3, 5, 7])` → `4`               |
| `mode`       | Most frequent value       | `statistics("mode", [1, 2, 2, 3])` → `2`                 |
| `std`        | Sample standard deviation | `statistics("std", [2, 4, 6])` → `2`                     |
| `variance`   | Sample variance           | `statistics("variance", [2, 4, 6])` → `4`                |
| `min`        | Minimum value             | `statistics("min", [5, 1, 9])` → `1`                     |
| `max`        | Maximum value             | `statistics("max", [5, 1, 9])` → `9`                     |
| `sum`        | Sum of all values         | `statistics("sum", [10, 20, 30])` → `60`                 |
| `percentile` | Value at nth percentile   | `statistics("percentile", [10, 20, 30], 90)` → see below |

### Notes on specific operations

**`mode`**: If multiple values share the highest frequency, returns the first one
encountered. It does not return all modes.

**`percentile`**: Requires the `percentile` parameter (0–100). This is the most
common error — omitting it produces:

```
"Percentile value is required when operation is 'percentile'"
```

Example:

```
statistics({ operation: "percentile", data: [120, 340, 200, 150, 180], percentile: 90 })
```

**`std` and `variance`**: These compute **sample** standard deviation and variance
(dividing by n-1), not population (dividing by n).

## Data Format

- Data is a plain JSON array of numbers: `[85, 92, 78, 95, 88]`
- Array must contain at least one number (empty arrays are rejected)
- Maximum 10,000 elements per array

## Common Errors

| Error                                  | Cause                      | Fix                               |
| -------------------------------------- | -------------------------- | --------------------------------- |
| "Data array is empty"                  | Empty `[]` passed          | Provide at least one number       |
| "Percentile value is required..."      | `percentile` param missing | Add `percentile: N` (0–100)       |
| "Percentile must be between 0 and 100" | Value out of range         | Use a value from 0 to 100         |
| "Unknown operation"                    | Typo in operation name     | Use one of the 9 valid operations |
