#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { BrowserManager } from "./browser-manager.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { PlaywrightElementOperations } from './features/core/elements.js';

// 人間らしい操作をエミュレートするユーティリティ関数
const humanDelay = async () => {
    const min = 100;
    const max = 300;
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
};

// サーバーの実装
const server = new Server(
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

// ツールのスキーマ定義
const toolSchemas = {
    create_browser: z.object({}),
    use_keyboard: z.object({
        contextId: z.string(),
        selector: z.string(),
        text: z.string(),
        submit: z.boolean().optional()
    }),
    navigate: z.object({
        contextId: z.string(),
        url: z.string().url()
    }),
    get_elements: z.object({
        contextId: z.string(),
        maxDepth: z.number().optional(),
        selector: z.string().optional()
    }),
    get_clickable_elements: z.object({
        contextId: z.string()
    }),
    get_element_info: z.object({
        contextId: z.string(),
        selector: z.string()
    })
};

// ツールの説明を定義
const toolDescriptions = {
    create_browser: "Creates a new browser context with a visible Chrome instance. The context is initialized with a 1280x720 viewport and a modern Chrome user agent. Uses Playwright's chromium.launch() with headless mode disabled for visual interaction. Returns a unique contextId that can be used for subsequent operations.",
    use_keyboard: "Simulates human-like keyboard input for the specified element. Features natural typing with random delays, occasional typos and corrections. Submits input either through button click or Enter key, prioritizing visible submit buttons. Includes mouse movements and proper element focusing for more natural interaction.",
    navigate: "Opens a new page in the specified browser context and navigates to the provided URL. Waits for the network to be idle before completing, ensuring all initial resources are loaded. Requires a valid contextId from create_browser and a properly formatted URL. The page is added to the context's page pool for future operations.",
    get_elements: "Analyzes the current page's DOM structure and returns a hierarchical representation of elements. When a selector is specified, returns an array of matching elements with proper indentation (4 spaces). Without a selector, returns the entire DOM structure (up to 3 levels deep by default). Identifies significant elements including semantic HTML tags (like main, nav, header), elements with IDs, roles, or classes. The output is formatted as an indented HTML-like structure with attributes and truncated text content. Handles large DOM trees efficiently by limiting depth and showing ellipsis for truncated branches.",
    get_clickable_elements: "Scans the page for all potentially interactive elements using sophisticated visibility and interactivity checks. Detects elements matching specific selectors (buttons, links, input[type='button'], etc.) and elements with click-related attributes or classes. Filters out invisible elements by checking computed styles (display, visibility, opacity) and dimensions. Returns detailed information about each clickable element, including tag name, ID, text content, role, and classes. Useful for mapping interactive elements for automation.",
    get_element_info: "Retrieves comprehensive information about a specific DOM element identified by the provided selector. Returns detailed data including: tag name, element ID, text content, all HTML attributes with their values, complete computed styles from getComputedStyle(), and precise bounding box coordinates (x, y, width, height). Performs visibility checks and includes viewport-relative positioning. Throws a descriptive error if the element is not found in the DOM. Essential for detailed element inspection and positioning calculations."
} as const;

// ツールのハンドラー実装
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // バリデーション
    const schema = toolSchemas[name as keyof typeof toolSchemas];
    if (!schema) {
        throw new Error(`Unknown tool: ${name}`);
    }
    const validatedArgs = schema.parse(args) as any;

    try {
        switch (name) {
            case "create_browser": {
                const contextId = Math.random().toString(36).substring(7);
                const browserManager = BrowserManager.getInstance();
                
                // まずブラウザを起動
                await browserManager.getBrowser();
                
                // 次にコンテキストを作成
                await browserManager.createContext(contextId);
                
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({ contextId })
                    }]
                };
            }

            case "navigate": {
                const { contextId, url } = validatedArgs;
                const context = await BrowserManager.getInstance().getContext(contextId);
                const page = await context.newPage();
                await page.goto(url, { waitUntil: 'networkidle' });
                return {
                    content: [{
                        type: "text",
                        text: `Successfully navigated to ${url}`
                    }]
                };
            }

            case "get_elements": {
                const { contextId, maxDepth: customMaxDepth, selector } = validatedArgs;
                const context = await BrowserManager.getInstance().getContext(contextId);
                const page = context.pages()[0];
                
                const elementOps = new PlaywrightElementOperations(page);
                const structureResult = await elementOps.getStructure({
                    maxDepth: typeof customMaxDepth === 'number' ? customMaxDepth : 3, // デフォルト値を3に設定
                    selector
                });
                const structure = structureResult.structure;

                return {
                    content: [{
                        type: "text",
                        text: structure
                    }]
                };
            }

            case "get_clickable_elements": {
                const { contextId } = validatedArgs;
                const context = await BrowserManager.getInstance().getContext(contextId);
                const page = context.pages()[0];
                
                const elementOps = new PlaywrightElementOperations(page);
                const clickableSelectors = [
                    'button',
                    'a',
                    'input[type="button"]',
                    'input[type="submit"]',
                    '[role="button"]',
                    '[onclick]',
                    '[class*="btn"]',
                    '[class*="button"]'
                ].join(',');

                const result = await elementOps.queryAll({
                    selector: clickableSelectors,
                    visible: true
                });

                if (!result.success) {
                    throw new Error(result.error);
                }

                const clickableElements = result.elements?.map(info => ({
                    tag: info.tag,
                    id: info.id,
                    text: info.text,
                    selector: info.id ? `#${info.id}` : undefined,
                    role: info.attributes['role'],
                    classes: info.classes
                }));

                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(clickableElements, null, 2)
                    }]
                };
            }

            case "use_keyboard": {
                const { contextId, selector, text, submit = false } = validatedArgs;
                const context = await BrowserManager.getInstance().getContext(contextId);
                const page = context.pages()[0];

                // 要素が表示されるまで待機
                const element = await page.waitForSelector(selector);
                if (!element) {
                    throw new Error(`Element not found: ${selector}`);
                }

                // 最初に少し待機（ページの準備ができるまで）
                await new Promise(resolve => setTimeout(resolve, 1000));

                // 要素の中心をクリック
                const box = await element.boundingBox();
                if (box) {
                    await page.mouse.click(
                        box.x + box.width / 2,
                        box.y + box.height / 2
                    );
                }

                // フォーカスを設定
                await element.focus();

                // さらに短い待機（フォーカス後）
                await humanDelay();

                // 人間らしい入力を再現（タイピングミスと修正を含む）
                let typed = '';
                for (const char of text) {
                    // ランダムにタイピングミスを入れる（5%の確率）
                    if (Math.random() < 0.05 && typed.length > 0) {
                        await humanDelay();
                        await page.keyboard.press('Backspace');
                        typed = typed.slice(0, -1);
                        await humanDelay();
                    }

                    await page.keyboard.type(char);
                    typed += char;
                    
                    // より自然な入力遅延（50-200ms）
                    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 150));
                }

                // 入力完了後の短い待機
                await new Promise(resolve => setTimeout(resolve, 500));

                // サブミットが要求された場合
                if (submit) {
                    await humanDelay();
                    // 送信ボタンを探す
                    const sendButton = await page.$('button[data-testid="send-button"]');
                    if (sendButton) {
                        await sendButton.click();
                    } else {
                        // ボタンが見つからない場合はEnterキーを使用
                        await page.keyboard.press('Enter');
                    }
                }

                return {
                    content: [{
                        type: "text",
                        text: `Successfully typed "${text}"${submit ? " and submitted" : ""}`
                    }]
                };
            }

            case "get_element_info": {
                const { contextId, selector } = validatedArgs;
                const context = await BrowserManager.getInstance().getContext(contextId);
                const page = context.pages()[0];
                
                const elementOps = new PlaywrightElementOperations(page);
                const element = await page.waitForSelector(selector);
                if (!element) {
                    throw new Error(`Element not found: ${selector}`);
                }
                const elementInfo = await elementOps.getInfo(element);

                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(elementInfo, null, 2)
                    }]
                };
            }

            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    } catch (error) {
        console.error('Operation failed:', error);
        return {
            content: [{
                type: "text",
                text: `Error: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
        };
    }
});

// ListToolsハンドラーを追加
server.setRequestHandler(ListToolsRequestSchema, async () => {
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
                    description: argName === "contextId" 
                        ? "The unique identifier of the browser context to use"
                        : argName === "url"
                        ? "The URL to navigate to"
                        : argName === "selector"
                        ? "CSS selector to identify the target element"
                        : `Parameter ${argName} for ${name} tool`,
                    required: !(argSchema instanceof z.ZodOptional)
                }))
            };
        })
    };
});

// サーバーの起動
const transport = new StdioServerTransport();
await server.connect(transport);
