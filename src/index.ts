import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  McpError,
  ErrorCode,
  type CallToolRequest
} from "@modelcontextprotocol/sdk/types.js";
import { tools, toolHandlers } from "./tools/index.js";
import { resources, resourceHandlers } from "./resources/index.js";

// Low-Level Serverの作成
const server = new Server(
  {
    name: "playwright-mcp-server",
    version: "1.0.0",
    description: "Playwrightを使ったMCPサーバー"
  },
  {
    capabilities: {
      tools: {},
      resources: {}
    }
  }
);

// ツール一覧のハンドラー
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: Object.values(tools)
  };
});

// ツール実行のハンドラー
server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  const toolName = request.params.name as keyof typeof tools;
  const handler = toolHandlers[toolName];

  if (!handler) {
    throw new McpError(
      ErrorCode.MethodNotFound,
      `Unknown tool: ${request.params.name}`
    );
  }

  return handler(request);
});

// リソース一覧のハンドラー
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: Object.values(resources)
  };
});

// リソース読み取りのハンドラー
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const handler = resourceHandlers[request.params.uri];
  
  if (!handler) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      `Unknown resource: ${request.params.uri}`
    );
  }

  return handler(request);
});

// エラーハンドリング
process.on("uncaughtException", (error) => {
  console.error("[Uncaught Exception]", error);
});

process.on("SIGINT", () => {
  server.close().then(() => {
    process.exit(0);
  });
});

// サーバーの起動
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Playwright MCP server running on stdio");