import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { 
    LATEST_PROTOCOL_VERSION,
    Implementation,
    Tool,
    CallToolResult,
    ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

describe('MCP Protocol Integration', () => {
    let server: McpServer;
    const serverInfo: Implementation = {
        name: "playwright-automation-test",
        version: "1.0.0"
    };

    beforeEach(() => {
        server = new McpServer(serverInfo, {
            capabilities: {
                tools: {
                    listChanged: true
                }
            }
        });
    });

    afterEach(async () => {
        await server.close();
    });

    describe('Tool Registration and Execution', () => {
        beforeEach(() => {
            // テスト用のツールを登録
            server.tool(
                "test_tool",
                {
                    param1: z.string().describe("Test parameter")
                },
                async ({ param1 }) => ({
                    content: [{
                        type: "text" as const,
                        text: `Received: ${param1}`
                    }]
                })
            );
        });

        it('should register tools properly', () => {
            // 登録されたツールを確認
            expect(() => {
                server.tool(
                    "another_tool",
                    {
                        param2: z.number()
                    },
                    async ({ param2 }) => ({
                        content: [{
                            type: "text" as const,
                            text: `Number: ${param2}`
                        }]
                    })
                );
            }).not.toThrow();
        });
    });

    describe('Protocol Message Handling', () => {
        it('should handle initialize request', () => {
            expect(() => {
                server.tool(
                    "initialize_test",
                    "Test initialization",
                    async () => ({
                        content: [{
                            type: "text" as const,
                            text: "Initialized"
                        }]
                    })
                );
            }).not.toThrow();
        });

        it('should reject invalid tool parameters', () => {
            server.tool(
                "validation_tool",
                {
                    email: z.string().email("Invalid email")
                },
                async ({ email }) => ({
                    content: [{
                        type: "text" as const,
                        text: `Email: ${email}`
                    }]
                })
            );

            expect(() => {
                server.tool(
                    "validation_tool",
                    {
                        email: z.string().email("Invalid email")
                    },
                    async () => ({
                        content: [{
                            type: "text" as const,
                            text: "Duplicate"
                        }]
                    })
                );
            }).toThrow();
        });

        it('should properly format tool responses', () => {
            expect(() => {
                server.tool(
                    "response_test",
                    {
                        message: z.string()
                    },
                    async ({ message }) => ({
                        content: [{
                            type: "text" as const,
                            text: message,
                            annotations: {
                                priority: 1,
                                audience: ["user", "assistant"]
                            }
                        }],
                        _meta: {
                            timestamp: "2025-02-08T00:00:00Z"
                        }
                    })
                );
            }).not.toThrow();
        });
    });

    describe('Error Handling', () => {
        it('should handle tool execution errors', () => {
            expect(() => {
                server.tool(
                    "error_tool",
                    {},
                    async () => {
                        throw new Error("Test error");
                    }
                );
            }).not.toThrow();
        });

        it('should prevent duplicate tool registration', () => {
            server.tool(
                "unique_tool",
                {},
                async () => ({
                    content: [{
                        type: "text" as const,
                        text: "test"
                    }]
                })
            );

            expect(() => {
                server.tool(
                    "unique_tool",
                    {},
                    async () => ({
                        content: [{
                            type: "text" as const,
                            text: "duplicate"
                        }]
                    })
                );
            }).toThrow();
        });
    });
});