// src/index.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { calculateTool } from './tools/calculate.js';
import { convertTool } from './tools/convert.js';
import { statisticsTool } from './tools/statistics.js';

const server = new McpServer({
  name: 'euclid',
  version: '0.1.0',
});

// Register tools
server.tool(
  calculateTool.name,
  calculateTool.description,
  calculateTool.inputSchema.shape,
  async (args) => calculateTool.handler(args as { expression: string; precision?: number }),
);

server.tool(
  convertTool.name,
  convertTool.description,
  convertTool.inputSchema.shape,
  async (args) => convertTool.handler(args as { value: number; from: string; to: string }),
);

server.tool(
  statisticsTool.name,
  statisticsTool.description,
  statisticsTool.inputSchema.shape,
  async (args) =>
    statisticsTool.handler(args as { operation: string; data: number[]; percentile?: number }),
);

// Connect via stdio
const transport = new StdioServerTransport();
await server.connect(transport);
