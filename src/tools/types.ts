import type { CallToolRequest, ServerResult } from "@modelcontextprotocol/sdk/types.js";

export interface ToolContent {
  type: string;
  text: string;
}

export type ToolResponse = ServerResult & {
  content: ToolContent[];
};

export type ToolHandler = (request: CallToolRequest) => Promise<ToolResponse>;