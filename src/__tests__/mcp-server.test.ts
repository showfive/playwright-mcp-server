import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

describe('PlaywrightMcpServer', () => {
    let server: McpServer;
    let transport: StdioServerTransport;

    beforeEach(() => {
        server = new McpServer({
            name: "playwright-automation-test",
            version: "1.0.0",
            capabilities: {
                tools: {
                    listChanged: true
                }
            }
        });
        transport = new StdioServerTransport();
    });

    afterEach(async () => {
        await server.close();
    });

    describe('Tool Registration', () => {
        it('should correctly register tools', () => {
            // ツールを登録
            expect(() => {
                server.tool(
                    "test_tool",
                    {
                        param1: z.string().describe("Test parameter"),
                    },
                    async ({ param1 }) => ({
                        content: [{
                            type: "text" as const,
                            text: `Received: ${param1}`,
                            annotations: {
                                priority: 1,
                                audience: ["user", "assistant"]
                            }
                        }]
                    })
                );
            }).not.toThrow();
        });

        it('should support multiple tool registrations', () => {
            expect(() => {
                server.tool(
                    "tool1",
                    {
                        param1: z.string(),
                    },
                    async () => ({
                        content: [{ type: "text" as const, text: "test" }]
                    })
                );

                server.tool(
                    "tool2",
                    {
                        param1: z.number(),
                    },
                    async () => ({
                        content: [{ type: "text" as const, text: "test" }]
                    })
                );
            }).not.toThrow();
        });
    });

    describe('Error Handling', () => {
        it('should not allow duplicate tool names', () => {
            server.tool(
                "duplicate_tool",
                {},
                async () => ({
                    content: [{ type: "text" as const, text: "test" }]
                })
            );

            expect(() => {
                server.tool(
                    "duplicate_tool",
                    {},
                    async () => ({
                        content: [{ type: "text" as const, text: "test" }]
                    })
                );
            }).toThrow();
        });

        it('should validate tool schema', () => {
            server.tool(
                "validation_tool",
                {
                    param1: z.string().email(),
                },
                async ({ param1 }) => ({
                    content: [{
                        type: "text" as const,
                        text: param1
                    }]
                })
            );
        });

        it('should handle tool registration with empty schema', () => {
            expect(() => {
                server.tool(
                    "empty_schema_tool",
                    {},
                    async () => ({
                        content: [{ type: "text" as const, text: "test" }]
                    })
                );
            }).not.toThrow();
        });
    });
});