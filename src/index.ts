import { createRequire } from 'node:module';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { calculateTool } from './tools/calculate.js';
import { convertTool } from './tools/convert.js';
import { statisticsTool } from './tools/statistics.js';
import { datetimeTool } from './tools/datetime.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json') as { version: string };

const server = new McpServer({
  name: 'euclid',
  version,
});

// Register tools
server.registerTool(
  calculateTool.name,
  {
    description: calculateTool.description,
    inputSchema: calculateTool.inputSchema,
  },
  async (args) => calculateTool.handler(args as { expression: string; precision?: number }),
);

server.registerTool(
  convertTool.name,
  {
    description: convertTool.description,
    inputSchema: convertTool.inputSchema,
  },
  async (args) => convertTool.handler(args as { value: number; from: string; to: string }),
);

server.registerTool(
  statisticsTool.name,
  {
    description: statisticsTool.description,
    inputSchema: statisticsTool.inputSchema,
  },
  async (args) =>
    statisticsTool.handler(args as { operation: string; data: number[]; percentile?: number }),
);

server.registerTool(
  datetimeTool.name,
  {
    description: datetimeTool.description,
    inputSchema: datetimeTool.inputSchema,
  },
  async (args) =>
    datetimeTool.handler(
      args as {
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
      },
    ),
);

// Connect via stdio
const transport = new StdioServerTransport();
await server.connect(transport);
