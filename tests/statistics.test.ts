// tests/statistics.test.ts
import { describe, it, expect } from 'vitest';
import { statisticsTool } from '../src/tools/statistics.js';

describe('statisticsTool', () => {
  it('has correct tool name', () => {
    expect(statisticsTool.name).toBe('statistics');
  });

  it('has a description', () => {
    expect(statisticsTool.description).toBeTruthy();
  });

  it('has an inputSchema', () => {
    expect(statisticsTool.inputSchema).toBeDefined();
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
