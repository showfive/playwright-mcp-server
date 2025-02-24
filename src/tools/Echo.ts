import { McpError, ErrorCode, type CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import type { ToolHandler, ToolResponse } from "./types.js";

export const toolDefinition = {
  name: "echo",
  description: "入力されたメッセージをそのまま返します",
  inputSchema: {
    type: "object",
    properties: {
      message: {
        type: "string",
        description: "エコーするメッセージ"
      }
    },
    required: ["message"]
  }
} as const;

async function echo(message: string): Promise<string> {
  if (typeof message !== 'string') {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Message must be a string'
    );
  }
  
  return message;
}

export const echoHandler: ToolHandler = async (request: CallToolRequest): Promise<ToolResponse> => {
  const { message } = request.params.arguments as {
    message: string;
  };

  try {
    const result = await echo(message);
    return {
      content: [
        {
          type: "text",
          text: result
        }
      ]
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Echo failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};