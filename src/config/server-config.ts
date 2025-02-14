import { Server } from "@modelcontextprotocol/sdk/server/index.js";

type ResponseContent = {
    type: string;
    text: string;
};

type McpResponse = {
    content: ResponseContent[];
    isError?: boolean;
};

/**
 * MCPサーバーの基本設定
 */
export const createServer = (): Server => {
    return new Server(
        {
            name: "playwright-automation",
            version: "1.0.0"
        },
        {
            capabilities: {
                tools: {}
            }
        }
    );
};

/**
 * エラーレスポンスを生成
 */
export const createErrorResponse = (error: unknown): McpResponse => {
    return {
        content: [{
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
    };
};

/**
 * 成功レスポンスを生成
 */
export const createSuccessResponse = (text: string | undefined): McpResponse => {
    if (text === undefined) {
        return createErrorResponse("No content available");
    }
    return {
        content: [{
            type: "text",
            text
        }]
    };
};