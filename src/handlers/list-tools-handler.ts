import { ListToolsRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { toolSchemas, toolDescriptions } from "../config/tool-config.js";

/**
 * 利用可能なツールの一覧を返すハンドラー
 */
export const handleListTools = async (request: ListToolsRequest) => {
    return {
        tools: Object.entries(toolSchemas).map(([name, schema]) => {
            const shape = (schema as z.ZodObject<any>).shape;
            return {
                name,
                description: toolDescriptions[name as keyof typeof toolDescriptions],
                inputSchema: {
                    type: "object",
                    properties: Object.fromEntries(
                        Object.entries(shape).map(([argName, argSchema]) => [
                            argName,
                            {
                                type: argSchema instanceof z.ZodString ? "string" : "unknown",
                                format: argName === "url" ? "url" : undefined
                            }
                        ])
                    ),
                    required: Object.keys(shape).filter(
                        key => !(shape[key] instanceof z.ZodOptional)
                    )
                },
                arguments: Object.entries(shape).map(([argName, argSchema]) => ({
                    name: argName,
                    description: getArgumentDescription(name, argName),
                    required: !(argSchema instanceof z.ZodOptional)
                }))
            };
        })
    };
};

/**
 * 引数の説明を取得
 */
function getArgumentDescription(toolName: string, argName: string): string {
    switch (argName) {
        case "contextId":
            return "The unique identifier of the browser context to use";
        case "url":
            return "The URL to navigate to";
        case "selector":
            return "CSS selector to identify the target element";
        case "text":
            return "The text to type into the element";
        case "submit":
            return "Whether to submit the form after typing";
        case "maxDepth":
            return "Maximum depth for element structure traversal";
        default:
            return `Parameter ${argName} for ${toolName} tool`;
    }
}