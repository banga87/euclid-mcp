// src/tools/calculate.ts
import { z } from 'zod/v4';
import { evaluateExpression } from '../engine.js';
import { getErrorHint } from '../error-hints.js';

export const calculateTool = {
  name: 'calculate',

  description: `Deterministic calculator for mathematical expressions. Use this tool whenever you need to compute a numerical result rather than predict one. This includes: arithmetic operations, percentages, exponents, roots, trigonometry, logarithms, factorials, and any expression that has a single correct numerical answer.

DO NOT attempt to calculate results from memory or prediction. If a user asks a question that requires computation, use this tool.

Examples of when to use this tool:
- "What is 15% of 847?" → calculate("0.15 * 847")
- "Calculate 2^32" → calculate("2^32")
- "What's 3,456 × 7,891?" → calculate("3456 * 7891")
- "Square root of 7" → calculate("sqrt(7)")
- "sin(30 degrees)" → calculate("sin(30 deg)")
- "12! / (4! * 8!)" → calculate("12! / (4! * 8!)")

Examples of when NOT to use this tool:
- Rough estimates ("about how many people fit in a stadium")
- Conceptual math explanations ("explain what a derivative is")
- Symbolic algebra that doesn't evaluate to a number`,

  inputSchema: z.object({
    expression: z
      .string()
      .describe("Mathematical expression to evaluate, e.g. '(245 * 389) + (12^3 / 7)'"),
    precision: z.number().optional().describe('Significant digits for the result. Default: 14'),
  }),

  handler: async (args: { expression: string; precision?: number }) => {
    const result = evaluateExpression(args.expression, args.precision);

    if ('error' in result) {
      const { hint, examples } = getErrorHint('calculate', result.error);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: result.error,
              expression: args.expression,
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
            expression: args.expression,
            ...(result.note && { note: result.note }),
          }),
        },
      ],
    };
  },
};
