// tests/datetime.test.ts
import { describe, it, expect } from 'vitest';
import { datetimeTool } from '../src/tools/datetime.js';

describe('datetimeTool', () => {
  it('has correct tool name', () => {
    expect(datetimeTool.name).toBe('datetime');
  });

  it('has a description', () => {
    expect(datetimeTool.description).toBeTruthy();
  });

  it('has an inputSchema', () => {
    expect(datetimeTool.inputSchema).toBeDefined();
  });

  it('handler returns result for add operation', async () => {
    const response = await datetimeTool.handler({
      operation: 'add',
      date: '2026-01-01',
      amount: 10,
      unit: 'days',
    });
    expect(response.isError).toBeUndefined();
    const content = JSON.parse(response.content[0].text);
    expect(content.result).toBe('2026-01-11');
    expect(content.operation).toBe('add');
  });

  it('handler returns structured fields for age', async () => {
    const response = await datetimeTool.handler({
      operation: 'age',
      birthDate: '1990-06-15',
      asOf: '2026-03-21',
    });
    const content = JSON.parse(response.content[0].text);
    expect(content.years).toBe(35);
    expect(content.months).toBe(9);
    expect(content.days).toBe(6);
    expect(content.result).toContain('35 years');
  });

  it('handler returns error with hint and examples', async () => {
    const response = await datetimeTool.handler({
      operation: 'add',
      date: 'not-a-date',
      amount: 10,
      unit: 'days',
    });
    expect(response.isError).toBe(true);
    const content = JSON.parse(response.content[0].text);
    expect(content.error).toBeTruthy();
    expect(content.hint).toBeTruthy();
    expect(content.examples).toBeInstanceOf(Array);
    expect(content.examples.length).toBeGreaterThan(0);
  });

  it('handler includes note when date is normalized', async () => {
    const response = await datetimeTool.handler({
      operation: 'day_of_week',
      date: 'March 21, 2026',
    });
    expect(response.isError).toBeUndefined();
    const content = JSON.parse(response.content[0].text);
    expect(content.note).toContain('Interpreted');
  });

  it('handler does not include note for ISO dates', async () => {
    const response = await datetimeTool.handler({
      operation: 'day_of_week',
      date: '2026-03-21',
    });
    const content = JSON.parse(response.content[0].text);
    expect(content.note).toBeUndefined();
  });

  it('handler returns error for missing required fields', async () => {
    const response = await datetimeTool.handler({ operation: 'add', date: '2026-01-01' });
    expect(response.isError).toBe(true);
    const content = JSON.parse(response.content[0].text);
    expect(content.error).toContain('requires');
  });
});
