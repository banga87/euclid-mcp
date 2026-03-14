# Unit Reference — `convert` tool

## Supported Unit Categories

### Length

| Unit          | Aliases               |
| ------------- | --------------------- |
| Meter         | `m`, `cm`, `mm`, `km` |
| Mile          | `mi`, `mile`, `miles` |
| Yard          | `yd`                  |
| Foot          | `ft`                  |
| Inch          | `inch`, `in`          |
| Nautical mile | `nmi`                 |

### Mass

| Unit     | Aliases         |
| -------- | --------------- |
| Kilogram | `kg`, `g`, `mg` |
| Pound    | `lb`            |
| Ounce    | `oz`            |
| Ton      | `ton`           |
| Stone    | `stone`         |

### Volume

| Unit        | Aliases                         |
| ----------- | ------------------------------- |
| Liter       | `liter`, `litre`, `litres`, `L` |
| Milliliter  | `ml`, `mL`                      |
| Gallon      | `gal`                           |
| Pint        | `pint`                          |
| Cup         | `cup`                           |
| Fluid ounce | `floz`                          |

### Temperature

| Unit       | Code   | Natural language alias |
| ---------- | ------ | ---------------------- |
| Celsius    | `degC` | `celsius`              |
| Fahrenheit | `degF` | `fahrenheit`           |
| Kelvin     | `K`    | —                      |
| Rankine    | `degR` | —                      |

Temperature units in mathjs are `degC` and `degF`, but you can use `celsius` and
`fahrenheit` — they are normalized automatically.

### Speed

| Unit                      | Code                        |
| ------------------------- | --------------------------- |
| Meters per second         | `m/s`                       |
| Kilometers per hour       | `km/h`                      |
| Miles per hour            | `mph`                       |
| Kilometers per hour (alt) | `kph`, `kmh`                |
| Knots                     | `knot`, `knots`, `kn`, `kt` |

### Time

| Unit   | Code   |
| ------ | ------ |
| Second | `s`    |
| Minute | `min`  |
| Hour   | `h`    |
| Day    | `day`  |
| Week   | `week` |

### Area

| Unit             | Code     | Natural language alias |
| ---------------- | -------- | ---------------------- |
| Square meter     | `m^2`    | `square meters`        |
| Square foot      | `ft^2`   | `square feet`          |
| Square kilometer | `km^2`   | `square kilometers`    |
| Square mile      | `mile^2` | `square miles`         |

### Volume (Cubic)

| Unit        | Code   | Natural language alias |
| ----------- | ------ | ---------------------- |
| Cubic meter | `m^3`  | `cubic meters`         |
| Cubic foot  | `ft^3` | `cubic feet`           |
| Cubic inch  | `in^3` | `cubic inches`         |

### Data

| Unit     | Code            |
| -------- | --------------- |
| Byte     | `byte`, `bytes` |
| Kilobyte | `kB`            |
| Megabyte | `MB`            |
| Gigabyte | `GB`            |
| Terabyte | `TB`            |
| Bit      | `b`             |
| Kilobit  | `kb`            |
| Megabit  | `Mb`            |
| Gigabit  | `Gb`            |
| Terabit  | `Tb`            |

## Natural Language Aliases

These are normalized automatically (case-insensitive):

| You can say...        | Converted to |
| --------------------- | ------------ |
| `celsius`             | `degC`       |
| `fahrenheit`          | `degF`       |
| `kilometers per hour` | `km/hour`    |
| `miles per hour`      | `mile/hour`  |
| `meters per second`   | `m/s`        |
| `feet per second`     | `ft/s`       |
| `square meters`       | `m^2`        |
| `square feet`         | `ft^2`       |
| `square kilometers`   | `km^2`       |
| `square miles`        | `mile^2`     |
| `cubic meters`        | `m^3`        |
| `cubic feet`          | `ft^3`       |
| `cubic inches`        | `in^3`       |
| `litres`              | `liter`      |

## Incompatible Units

Both units must measure the same quantity. Converting between different quantities
(e.g., `kg` to `km`, or `degC` to `mph`) returns an error:

```
"Units are incompatible. Ensure both measure the same quantity
(e.g., length to length, weight to weight)."
```
