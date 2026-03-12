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
    const response = await calculateTool.handler({ expression: '2 +* 3' });
    expect(response.isError).toBe(true);
    const content = JSON.parse(response.content[0].text);
    expect(content.error).toBeTruthy();
    expect(content.expression).toBe('2 +* 3');
  });

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
});
