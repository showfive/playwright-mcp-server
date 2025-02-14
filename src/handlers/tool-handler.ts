import { toolSchemas } from "../config/tool-config.js";
import { createErrorResponse } from "../config/server-config.js";
import { createBrowserContext, navigateToUrl, getPageContent } from "../tools/browser-tool.js";
import { useKeyboard } from "../tools/keyboard-tool.js";
import { getElements, getElementInfo, getInteractiveElements, controlInteractiveElement } from "../tools/element-tool.js";
import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { ToolArgs } from "../tools/types.js";

type ToolName = keyof typeof toolSchemas;

/**
 * ツールリクエストを処理するハンドラー
 */
export const handleToolRequest = async (request: CallToolRequest) => {
    const { name, arguments: args } = request.params;

    // バリデーション
    const schema = toolSchemas[name as ToolName];
    if (!schema) {
        return createErrorResponse(`Unknown tool: ${name}`);
    }

    try {
        switch (name as ToolName) {
            case "create_browser": {
                const validatedArgs = schema.parse(args) as ToolArgs["create_browser"];
                return await createBrowserContext();
            }

            case "navigate": {
                const validatedArgs = schema.parse(args) as ToolArgs["navigate"];
                return await navigateToUrl(validatedArgs.contextId, validatedArgs.url);
            }

            case "get_elements": {
                const validatedArgs = schema.parse(args) as ToolArgs["get_elements"];
                return await getElements({
                    contextId: validatedArgs.contextId,
                    maxDepth: validatedArgs.maxDepth,
                    selector: validatedArgs.selector
                });
            }

            case "get_element_info": {
                const validatedArgs = schema.parse(args) as ToolArgs["get_element_info"];
                return await getElementInfo({
                    contextId: validatedArgs.contextId,
                    selector: validatedArgs.selector
                });
            }

            case "use_keyboard": {
                const validatedArgs = schema.parse(args) as ToolArgs["use_keyboard"];
                return await useKeyboard({
                    contextId: validatedArgs.contextId,
                    selector: validatedArgs.selector,
                    text: validatedArgs.text,
                    submit: validatedArgs.submit
                });
            }

            case "get_page_content": {
                const validatedArgs = schema.parse(args) as ToolArgs["get_page_content"];
                return await getPageContent(validatedArgs.contextId);
            }

            case "get_interactive_elements": {
                const validatedArgs = schema.parse(args) as ToolArgs["get_interactive_elements"];
                return await getInteractiveElements(
                    validatedArgs.contextId,
                    validatedArgs.includeDetails
                );
            }

            case "control_interactive_elements": {
                const validatedArgs = schema.parse(args) as ToolArgs["control_interactive_elements"];
                return await controlInteractiveElement(
                    validatedArgs.contextId,
                    validatedArgs.selector,
                    validatedArgs.action,
                    validatedArgs.value
                );
            }

            default:
                return createErrorResponse(`Unknown tool: ${name}`);
        }
    } catch (error) {
        console.error('Operation failed:', error);
        return createErrorResponse(error);
    }
};