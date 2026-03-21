// src/tools/statistics.ts
import { z } from 'zod/v4';
import { computeStatistic, type StatOperation } from '../engine.js';
import { getErrorHint } from '../error-hints/index.js';

export const statisticsTool = {
  name: 'statistics',

  description: `Computes statistical measures on a dataset deterministically. Use this tool when a user asks for mean, median, mode, standard deviation, variance, min, max, sum, or percentile calculations on a set of numbers.

Examples:
- "What's the average of these test scores?" → statistics("mean", [85, 92, 78, 95, 88])
- "Find the median household income" → statistics("median", [45000, 52000, 61000, 38000])
- "90th percentile of response times" → statistics("percentile", [120, 340, 200, 150, 180], 90)
- "Standard deviation of this sample" → statistics("std", [23, 45, 12, 67, 34])`,

  inputSchema: z.object({
    operation: z
      .enum(['mean', 'median', 'mode', 'std', 'variance', 'min', 'max', 'sum', 'percentile'])
      .describe('The statistical operation to perform'),
    data: z.array(z.number()).describe('Array of numbers to compute the statistic on'),
    percentile: z
      .number()
      .optional()
      .describe('Percentile value (0-100), required if operation is "percentile"'),
  }),

  handler: async (args: { operation: string; data: number[]; percentile?: number }) => {
    const result = computeStatistic(args.operation as StatOperation, args.data, args.percentile);

    if ('error' in result) {
      const { hint, examples } = getErrorHint('statistics', result.error);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: result.error,
              operation: args.operation,
              hint,
              examples,
            }),
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            result: result.result,
            operation: args.operation,
            ...(result.note && { note: result.note }),
          }),
        },
      ],
    };
  },
};
