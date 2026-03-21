// src/tools/datetime.ts
import { z } from 'zod/v4';
import { computeDatetime, type DatetimeOperation } from '../engines/datetime.js';
import { getErrorHint } from '../error-hints/index.js';

const REQUIRED_FIELDS: Partial<Record<DatetimeOperation, string[]>> = {
  add: ['date', 'amount', 'unit'],
  subtract: ['date', 'amount', 'unit'],
  difference: ['from', 'to'],
  business_days: ['from', 'to'],
  days_in_month: ['year', 'month'],
  age: ['birthDate', 'asOf'],
  quarter: ['date'],
  day_of_week: ['date'],
  is_leap_year: ['year'],
};

export const datetimeTool = {
  name: 'datetime',

  description: `Performs calendar and date arithmetic deterministically. Use this tool for any date-based calculation: differences, additions/subtractions, age, business days, quarters, and more.

Examples:
- "How many days between Jan 1 and Mar 15?" → datetime("difference", { from: "2026-01-01", to: "2026-03-15" })
- "What date is 90 days from today?" → datetime("add", { date: "2026-01-01", amount: 90, unit: "days" })
- "How old is someone born June 15, 1990?" → datetime("age", { birthDate: "1990-06-15", asOf: "2026-03-21" })
- "How many business days in January?" → datetime("business_days", { from: "2026-01-01", to: "2026-01-31" })
- "What day of the week is March 21, 2026?" → datetime("day_of_week", { date: "2026-03-21" })
- "Is 2024 a leap year?" → datetime("is_leap_year", { year: 2024 })
- "What quarter is October in?" → datetime("quarter", { date: "2026-10-15" })
- "How many days in February 2024?" → datetime("days_in_month", { year: 2024, month: 2 })

Disambiguation: This tool does NOT handle timezone conversions or DST transitions — it performs pure calendar math. Use \`calculate\` for pure number arithmetic. Use \`convert\` for time unit conversion (hours to minutes, etc.).`,

  inputSchema: z.object({
    operation: z
      .enum([
        'difference',
        'add',
        'subtract',
        'business_days',
        'days_in_month',
        'age',
        'quarter',
        'day_of_week',
        'is_leap_year',
      ])
      .describe(
        'The datetime operation to perform: difference, add, subtract, business_days, days_in_month, age, quarter, day_of_week, is_leap_year',
      ),
    date: z.string().optional().describe('A date string (ISO 8601 preferred: YYYY-MM-DD)'),
    from: z
      .string()
      .optional()
      .describe('Start date for difference or business_days operations'),
    to: z.string().optional().describe('End date for difference or business_days operations'),
    amount: z.number().optional().describe('Number of units to add or subtract'),
    unit: z
      .enum(['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds'])
      .optional()
      .describe('Time unit for add, subtract, or difference operations'),
    year: z.number().optional().describe('A 4-digit year, used by days_in_month and is_leap_year'),
    month: z.number().optional().describe('A month number (1–12), used by days_in_month'),
    birthDate: z.string().optional().describe('Birth date in ISO 8601 format, used by age'),
    asOf: z
      .string()
      .optional()
      .describe('Reference date for the age calculation (typically today)'),
    holidays: z
      .array(z.string())
      .optional()
      .describe('Optional list of holiday dates (ISO 8601) to exclude from business_days count'),
  }),

  handler: async (args: {
    operation: string;
    date?: string;
    from?: string;
    to?: string;
    amount?: number;
    unit?: string;
    year?: number;
    month?: number;
    birthDate?: string;
    asOf?: string;
    holidays?: string[];
  }) => {
    const operation = args.operation as DatetimeOperation;

    // Pre-validate required fields and return an LLM-friendly error containing "requires"
    const required = REQUIRED_FIELDS[operation];
    if (required) {
      const missing = required.filter(
        (field) => args[field as keyof typeof args] === undefined || args[field as keyof typeof args] === null,
      );
      if (missing.length > 0) {
        const { hint, examples } = getErrorHint('datetime', 'Missing required');
        const error = `'${operation}' requires: ${missing.join(', ')}`;
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ error, operation, hint, examples }),
            },
          ],
          isError: true,
        };
      }
    }

    const result = computeDatetime(operation, args as Record<string, unknown>);

    if ('error' in result) {
      const { hint, examples } = getErrorHint('datetime', result.error);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: result.error,
              operation,
              hint,
              examples,
            }),
          },
        ],
        isError: true,
      };
    }

    // Build a note starting with "Interpreted" when date normalization occurred
    const note = result.note ? `Interpreted: ${result.note}` : undefined;

    const { note: _note, ...rest } = result;
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            ...rest,
            operation,
            ...(note && { note }),
          }),
        },
      ],
    };
  },
};
