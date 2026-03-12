// src/engine.ts
import { create, all, type MathJsStatic } from 'mathjs';
import vm from 'node:vm';
import { normalizeExpression, normalizeUnit } from './normalization.js';

const MAX_EXPRESSION_LENGTH = 1000;
const TIMEOUT_MS = 5000;
const MAX_DATA_LENGTH = 10000;

const math: MathJsStatic = create(all);

// Grab reference before overriding
const limitedEvaluate = math.evaluate;

// Register common unit aliases before disabling createUnit
math.createUnit('mph', '1 mile/hour');
math.createUnit('kph', '1 km/hour');
math.createUnit('kmh', '1 km/hour');
math.createUnit('knot', '1.852 km/hour');
math.createUnit('knots', '1 knot');
math.createUnit('kn', '1 knot');
math.createUnit('kt', '1 knot');
math.createUnit('nmi', '1.852 km');

// Disable dangerous functions
math.import(
  {
    import: () => {
      throw new Error('Function import is disabled');
    },
    createUnit: () => {
      throw new Error('Function createUnit is disabled');
    },
    evaluate: () => {
      throw new Error('Function evaluate is disabled');
    },
    parse: () => {
      throw new Error('Function parse is disabled');
    },
    simplify: () => {
      throw new Error('Function simplify is disabled');
    },
    derivative: () => {
      throw new Error('Function derivative is disabled');
    },
    resolve: () => {
      throw new Error('Function resolve is disabled');
    },
    reviver: () => {
      throw new Error('Function reviver is disabled');
    },
  },
  { override: true },
);

export type EngineResult = { result: string; note?: string } | { error: string };

export function evaluateExpression(expression: string, precision: number = 14): EngineResult {
  if (expression.trim().length === 0) {
    return { error: 'Expression is empty' };
  }
  // Length check runs before normalization intentionally: prevents oversized input
  // from reaching the normalizer, regardless of how normalization may expand the string.
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

export type StatOperation =
  | 'mean'
  | 'median'
  | 'mode'
  | 'std'
  | 'variance'
  | 'min'
  | 'max'
  | 'sum'
  | 'percentile';

export function computeStatistic(
  operation: StatOperation,
  data: number[],
  percentile?: number,
): EngineResult {
  if (data.length === 0) {
    return { error: 'Data array is empty' };
  }
  if (data.length > MAX_DATA_LENGTH) {
    return { error: `Data array too many elements (${data.length}, max ${MAX_DATA_LENGTH})` };
  }

  try {
    let result: number | number[];

    switch (operation) {
      case 'mean':
        result = math.mean(data) as number;
        break;
      case 'median':
        result = math.median(data) as number;
        break;
      case 'mode':
        result = math.mode(data) as unknown as number[];
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
        if (percentile === undefined) {
          return { error: 'Percentile value is required when operation is "percentile"' };
        }
        if (percentile < 0 || percentile > 100) {
          return { error: 'Percentile must be between 0 and 100' };
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
