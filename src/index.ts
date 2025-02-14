#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "./config/server-config.js";
import { handleToolRequest, handleListTools } from "./handlers/index.js";

// サーバーの作成
const server = createServer();

// ツールリクエストハンドラーの登録
server.setRequestHandler(CallToolRequestSchema, handleToolRequest);

// ListToolsハンドラーの登録
server.setRequestHandler(ListToolsRequestSchema, handleListTools);

// サーバーの起動
const transport = new StdioServerTransport();
await server.connect(transport);

console.error('Playwright MCP server running on stdio');
