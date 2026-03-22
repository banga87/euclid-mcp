// src/error-hints/index.ts
import * as calculate from './calculate.js';
import * as convert from './convert.js';
import * as statistics from './statistics.js';
import * as datetime from './datetime.js';
import * as encode from './encode.js';

export type ErrorHint = {
  hint: string;
  examples: string[];
};

export type ToolName = 'calculate' | 'convert' | 'statistics' | 'datetime' | 'encode';

const registry: Record<ToolName, { getHint: (error: string) => string; EXAMPLES: string[] }> = {
  calculate,
  convert,
  statistics,
  datetime,
  encode,
};

export function getErrorHint(tool: ToolName, errorMessage: string): ErrorHint {
  const mod = registry[tool];
  return { hint: mod.getHint(errorMessage), examples: mod.EXAMPLES };
}
