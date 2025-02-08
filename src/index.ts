#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { BrowserManager } from "./browser-manager.js";

// 人間らしい操作をエミュレートするユーティリティ関数
const humanDelay = async () => {
    const min = 100;
    const max = 300;
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
};

// サーバーの実装
const server = new McpServer({
    name: "playwright-automation",
    version: "1.0.0"
});

// ブラウザコンテキストを作成するツール
server.tool(
    "create_browser",
    {},
    async () => {
        try {
            const contextId = Math.random().toString(36).substring(7);
            await BrowserManager.getInstance().createContext(contextId);
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({ contextId })
                }]
            };
        } catch (error) {
            return {
                content: [{
                    type: "text",
                    text: `Error: ${error}`
                }],
                isError: true
            };
        }
    }
);

// URLに移動するツール
server.tool(
    "navigate",
    {
        contextId: z.string(),
        url: z.string().url()
    },
    async ({ contextId, url }) => {
        try {
            const context = await BrowserManager.getInstance().getContext(contextId);
            const page = await context.newPage();
            await page.goto(url, { waitUntil: 'networkidle' });
            return {
                content: [{
                    type: "text",
                    text: `Successfully navigated to ${url}`
                }]
            };
        } catch (error) {
            return {
                content: [{
                    type: "text",
                    text: `Error: ${error}`
                }],
                isError: true
            };
        }
    }
);

// ページ内の全要素情報を取得するツール
server.tool(
    "get_elements",
    {
        contextId: z.string(),
    },
    async ({ contextId }) => {
        try {
            const context = await BrowserManager.getInstance().getContext(contextId);
            const page = context.pages()[0];
            
            const elements = await page.evaluate(() => {
                const allElements = document.querySelectorAll('*');
                return Array.from(allElements).map(el => ({
                    tag: el.tagName.toLowerCase(),
                    id: el.id,
                    classes: Array.from(el.classList),
                    text: el.textContent?.trim(),
                    isVisible: el.getBoundingClientRect().height > 0 && el.getBoundingClientRect().width > 0,
                    attributes: Array.from(el.attributes).map(attr => ({
                        name: attr.name,
                        value: attr.value
                    }))
                }));
            });

            return {
                content: [{
                    type: "text",
                    text: JSON.stringify(elements, null, 2)
                }]
            };
        } catch (error) {
            return {
                content: [{
                    type: "text",
                    text: `Error: ${error}`
                }],
                isError: true
            };
        }
    }
);

// クリック可能な要素の一覧を取得するツール
server.tool(
    "get_clickable_elements",
    {
        contextId: z.string(),
    },
    async ({ contextId }) => {
        try {
            const context = await BrowserManager.getInstance().getContext(contextId);
            const page = context.pages()[0];
            
            const clickableElements = await page.evaluate(() => {
                const isClickable = (el: Element) => {
                    const style = window.getComputedStyle(el);
                    return (
                        style.display !== 'none' &&
                        style.visibility !== 'hidden' &&
                        style.opacity !== '0' &&
                        el.getBoundingClientRect().width > 0 &&
                        el.getBoundingClientRect().height > 0
                    );
                };

                const clickableSelectors = [
                    'button',
                    'a',
                    'input[type="button"]',
                    'input[type="submit"]',
                    '[role="button"]',
                    '[onclick]',
                    '[class*="btn"]',
                    '[class*="button"]'
                ];

                const elements = document.querySelectorAll(clickableSelectors.join(','));
                return Array.from(elements)
                    .filter(isClickable)
                    .map(el => ({
                        tag: el.tagName.toLowerCase(),
                        id: el.id,
                        text: el.textContent?.trim(),
                        selector: el.id ? `#${el.id}` : undefined,
                        role: el.getAttribute('role'),
                        classes: Array.from(el.classList)
                    }));
            });

            return {
                content: [{
                    type: "text",
                    text: JSON.stringify(clickableElements, null, 2)
                }]
            };
        } catch (error) {
            return {
                content: [{
                    type: "text",
                    text: `Error: ${error}`
                }],
                isError: true
            };
        }
    }
);

// 特定の要素の詳細情報を取得するツール
server.tool(
    "get_element_info",
    {
        contextId: z.string(),
        selector: z.string()
    },
    async ({ contextId, selector }) => {
        try {
            const context = await BrowserManager.getInstance().getContext(contextId);
            const page = context.pages()[0];
            
            const elementInfo = await page.evaluate((sel) => {
                const el = document.querySelector(sel);
                if (!el) return null;

                const rect = el.getBoundingClientRect();
                const style = window.getComputedStyle(el);

                return {
                    tag: el.tagName.toLowerCase(),
                    id: el.id,
                    classes: Array.from(el.classList),
                    text: el.textContent?.trim(),
                    attributes: Array.from(el.attributes).map(attr => ({
                        name: attr.name,
                        value: attr.value
                    })),
                    isVisible: rect.height > 0 && rect.width > 0,
                    position: {
                        x: rect.x,
                        y: rect.y,
                        width: rect.width,
                        height: rect.height
                    },
                    styles: {
                        display: style.display,
                        visibility: style.visibility,
                        position: style.position,
                        zIndex: style.zIndex,
                        opacity: style.opacity
                    }
                };
            }, selector);

            if (!elementInfo) {
                return {
                    content: [{
                        type: "text",
                        text: `Element not found: ${selector}`
                    }],
                    isError: true
                };
            }

            return {
                content: [{
                    type: "text",
                    text: JSON.stringify(elementInfo, null, 2)
                }]
            };
        } catch (error) {
            return {
                content: [{
                    type: "text",
                    text: `Error: ${error}`
                }],
                isError: true
            };
        }
    }
);

// クリック操作を実行するツール
server.tool(
    "click",
    {
        contextId: z.string(),
        selector: z.string()
    },
    async ({ contextId, selector }) => {
        try {
            const context = await BrowserManager.getInstance().getContext(contextId);
            const page = context.pages()[0];
            await humanDelay();
            await page.click(selector, { delay: 100 });
            return {
                content: [{
                    type: "text",
                    text: `Successfully clicked element: ${selector}`
                }]
            };
        } catch (error) {
            return {
                content: [{
                    type: "text",
                    text: `Error: ${error}`
                }],
                isError: true
            };
        }
    }
);

// テキスト入力を実行するツール
server.tool(
    "type_text",
    {
        contextId: z.string(),
        selector: z.string(),
        text: z.string()
    },
    async ({ contextId, selector, text }) => {
        try {
            const context = await BrowserManager.getInstance().getContext(contextId);
            const page = context.pages()[0];
            await humanDelay();
            await page.fill(selector, text, { timeout: 5000 });
            return {
                content: [{
                    type: "text",
                    text: `Successfully typed text into: ${selector}`
                }]
            };
        } catch (error) {
            return {
                content: [{
                    type: "text",
                    text: `Error: ${error}`
                }],
                isError: true
            };
        }
    }
);

// スクロール操作を実行するツール
server.tool(
    "scroll",
    {
        contextId: z.string(),
        y: z.number()
    },
    async ({ contextId, y }) => {
        try {
            const context = await BrowserManager.getInstance().getContext(contextId);
            const page = context.pages()[0];
            await humanDelay();
            await page.evaluate((scrollY) => {
                window.scrollTo({
                    top: scrollY,
                    behavior: 'smooth'
                });
            }, y);
            return {
                content: [{
                    type: "text",
                    text: `Successfully scrolled to Y: ${y}`
                }]
            };
        } catch (error) {
            return {
                content: [{
                    type: "text",
                    text: `Error: ${error}`
                }],
                isError: true
            };
        }
    }
);

// ブラウザコンテキストを閉じるツール
server.tool(
    "close_browser",
    {
        contextId: z.string()
    },
    async ({ contextId }) => {
        try {
            await BrowserManager.getInstance().closeContext(contextId);
            return {
                content: [{
                    type: "text",
                    text: "Browser context closed successfully"
                }]
            };
        } catch (error) {
            return {
                content: [{
                    type: "text",
                    text: `Error: ${error}`
                }],
                isError: true
            };
        }
    }
);

// クリーンアップ処理
process.on('SIGINT', async () => {
    await BrowserManager.getInstance().closeAll();
    process.exit(0);
});

// サーバーの起動
const transport = new StdioServerTransport();
server.connect(transport).catch(console.error);