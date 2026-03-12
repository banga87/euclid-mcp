// src/tools/convert.ts
import { z } from 'zod/v4';
import { convertUnit } from '../engine.js';
import { getErrorHint } from '../error-hints.js';

export const convertTool = {
  name: 'convert',

  description: `Converts between units of measurement deterministically. Supports length, weight, volume, temperature, area, speed, time, data (bytes/bits), and 100+ other units.

Use this tool whenever a user asks to convert between units. The value, source unit, and target unit must be specified separately.

Common aliases like "mph", "kph", "knots" are supported in addition to standard mathjs units.

Examples:
- "Convert 5 km to miles" → convert(5, "km", "miles")
- "100°F in Celsius" → convert(100, "fahrenheit", "celsius")
- "1 lb in kg" → convert(1, "lb", "kg")
- "1024 bytes to kB" → convert(1024, "bytes", "kB")
- "60 mph to km/h" → convert(60, "mph", "kph")`,

  inputSchema: z.object({
    value: z.number().describe('The numeric value to convert'),
    from: z.string().describe("Source unit, e.g. 'km', 'fahrenheit', 'lb'"),
    to: z.string().describe("Target unit, e.g. 'miles', 'celsius', 'kg'"),
  }),

  handler: async (args: { value: number; from: string; to: string }) => {
    const result = convertUnit(args.value, args.from, args.to);

    if ('error' in result) {
      const { hint, examples } = getErrorHint('convert', result.error);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: result.error,
              value: args.value,
              from: args.from,
              to: args.to,
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
            value: args.value,
            from: args.from,
            to: args.to,
            ...(result.note && { note: result.note }),
          }),
        },
      ],
    };
  },
};
