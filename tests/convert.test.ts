// tests/convert.test.ts
import { describe, it, expect } from 'vitest';
import { convertTool } from '../src/tools/convert.js';

describe('convertTool', () => {
  it('has correct tool name', () => {
    expect(convertTool.name).toBe('convert');
  });

  it('handler converts km to miles', async () => {
    const response = await convertTool.handler({ value: 5, from: 'km', to: 'miles' });
    expect(response.isError).toBeUndefined();
    const content = JSON.parse(response.content[0].text);
    expect(Number(content.result)).toBeCloseTo(3.10686, 4);
    expect(content.value).toBe(5);
    expect(content.from).toBe('km');
    expect(content.to).toBe('miles');
  });

  it('handler converts temperature', async () => {
    const response = await convertTool.handler({ value: 100, from: 'fahrenheit', to: 'celsius' });
    const content = JSON.parse(response.content[0].text);
    expect(Number(content.result)).toBeCloseTo(37.7778, 3);
  });

  it('handler converts data units', async () => {
    const response = await convertTool.handler({ value: 1024, from: 'bytes', to: 'kB' });
    expect(response.isError).toBeUndefined();
  });

  it('handler returns error for incompatible units', async () => {
    const response = await convertTool.handler({ value: 5, from: 'km', to: 'kg' });
    expect(response.isError).toBe(true);
  });

  it('handler returns error for unknown units', async () => {
    const response = await convertTool.handler({ value: 5, from: 'foobar', to: 'bazqux' });
    expect(response.isError).toBe(true);
  });
});
