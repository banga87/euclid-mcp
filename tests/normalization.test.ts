// tests/normalization.test.ts
import { describe, it, expect } from 'vitest';
import { normalizeExpression, normalizeUnit, normalizeDate } from '../src/normalization.js';

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

  it('replaces bare √ followed by number', () => {
    const result = normalizeExpression('√16');
    expect(result.value).toBe('sqrt(16)');
    expect(result.wasTransformed).toBe(true);
  });

  it('replaces bare √ followed by decimal number', () => {
    const result = normalizeExpression('√2.5');
    expect(result.value).toBe('sqrt(2.5)');
    expect(result.wasTransformed).toBe(true);
  });

  it('replaces Unicode minus sign with hyphen-minus', () => {
    const result = normalizeExpression('5 − 3');
    expect(result.value).toBe('5 - 3');
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

  it('does not strip comma-space patterns in function arguments', () => {
    const result = normalizeExpression('max(100, 200)');
    expect(result.value).toBe('max(100, 200)');
    expect(result.wasTransformed).toBe(false);
  });

  it('handles numbers with many comma groups', () => {
    const result = normalizeExpression('1,234,567,890');
    expect(result.value).toBe('1234567890');
    expect(result.wasTransformed).toBe(true);
  });

  it('handles mixed thousands commas and function arguments', () => {
    const result = normalizeExpression('max(1,000, 2,000)');
    expect(result.value).toBe('max(1000, 2000)');
    expect(result.wasTransformed).toBe(true);
  });

  it('returns wasTransformed false for clean expressions', () => {
    const result = normalizeExpression('2 * 3 + sqrt(16)');
    expect(result.value).toBe('2 * 3 + sqrt(16)');
    expect(result.wasTransformed).toBe(false);
    expect(result.original).toBe('2 * 3 + sqrt(16)');
  });
});

describe('normalizeUnit', () => {
  it.each([
    ['celsius', 'degC'],
    ['fahrenheit', 'degF'],
    ['kilometers per hour', 'km/hour'],
    ['miles per hour', 'mile/hour'],
    ['meters per second', 'm/s'],
    ['feet per second', 'ft/s'],
    ['square meters', 'm^2'],
    ['square feet', 'ft^2'],
    ['square kilometers', 'km^2'],
    ['square miles', 'mile^2'],
    ['cubic meters', 'm^3'],
    ['cubic feet', 'ft^3'],
    ['cubic inches', 'in^3'],
    ['litres', 'liter'],
  ])('normalizes "%s" to "%s"', (input, expected) => {
    const result = normalizeUnit(input);
    expect(result.value).toBe(expected);
    expect(result.wasTransformed).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(normalizeUnit('Celsius').value).toBe('degC');
    expect(normalizeUnit('FAHRENHEIT').value).toBe('degF');
    expect(normalizeUnit('Kilometers Per Hour').value).toBe('km/hour');
  });

  it('trims whitespace even when no alias matches', () => {
    const result = normalizeUnit('  km  ');
    expect(result.value).toBe('km');
    expect(result.wasTransformed).toBe(true);
    expect(result.original).toBe('  km  ');
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

describe('normalizeDate', () => {
  it('passes through ISO date strings unchanged', () => {
    const result = normalizeDate('2026-03-21');
    expect(result.value).toBe('2026-03-21');
    expect(result.wasTransformed).toBe(false);
  });

  it('passes through ISO datetime strings unchanged', () => {
    const result = normalizeDate('2026-03-21T14:30:00');
    expect(result.value).toBe('2026-03-21T14:30:00');
    expect(result.wasTransformed).toBe(false);
  });

  it('normalizes "Month DD, YYYY" format', () => {
    const result = normalizeDate('March 12, 2026');
    expect(result.value).toBe('2026-03-12');
    expect(result.wasTransformed).toBe(true);
    expect(result.original).toBe('March 12, 2026');
  });

  it('normalizes "DD Month YYYY" format', () => {
    const result = normalizeDate('12 March 2026');
    expect(result.value).toBe('2026-03-12');
    expect(result.wasTransformed).toBe(true);
  });

  it('handles full month names case-insensitively', () => {
    const result = normalizeDate('january 1, 2026');
    expect(result.value).toBe('2026-01-01');
    expect(result.wasTransformed).toBe(true);
  });

  it('does NOT normalize ambiguous numeric formats like MM/DD/YYYY', () => {
    const result = normalizeDate('12/03/2026');
    expect(result.value).toBe('12/03/2026');
    expect(result.wasTransformed).toBe(false);
  });

  it('does NOT normalize ambiguous numeric formats like DD-MM-YYYY', () => {
    const result = normalizeDate('03-12-2026');
    expect(result.value).toBe('03-12-2026');
    expect(result.wasTransformed).toBe(false);
  });

  it('returns unparseable strings unchanged', () => {
    const result = normalizeDate('not a date');
    expect(result.value).toBe('not a date');
    expect(result.wasTransformed).toBe(false);
  });

  it('trims whitespace', () => {
    const result = normalizeDate('  2026-03-21  ');
    expect(result.value).toBe('2026-03-21');
  });
});
