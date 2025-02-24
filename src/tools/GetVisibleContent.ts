import { McpError, ErrorCode, type CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import type { ToolHandler, ToolResponse } from "./types.js";
import { type BrowserContext } from "playwright";
import { extractVisibleText } from "../utils/HTMLparser.js";

/**
 * ブラウザコンテキストの管理用クラス
 */
class BrowserContextManager {
    private static instance: BrowserContextManager;
    private context: BrowserContext | null = null;

    private constructor() {}

    public static getInstance(): BrowserContextManager {
        if (!BrowserContextManager.instance) {
            BrowserContextManager.instance = new BrowserContextManager();
        }
        return BrowserContextManager.instance;
    }

    public setContext(context: BrowserContext): void {
        this.context = context;
    }

    public getContext(): BrowserContext {
        if (!this.context) {
            throw new McpError(
                ErrorCode.InvalidRequest,
                "No active browser context. Please navigate to a page first."
            );
        }
        return this.context;
    }
}

/**
 * 引数の型定義
 */
interface GetVisibleContentArgs {
    minVisiblePercentage?: number;
}

/**
 * ツール定義
 */
export const toolDefinition = {
    name: "get_visible_content",
    description: "現在開いているページの表示領域内のコンテンツを取得します",
    inputSchema: {
        type: "object",
        properties: {
            minVisiblePercentage: {
                type: "number",
                description: "要素の最小可視率（%）",
                minimum: 0,
                maximum: 100
            }
        },
        required: []
    }
} as const;

/**
 * ビューポート情報の取得
 */
async function getViewportInfo(page: Awaited<ReturnType<BrowserContext["pages"]>>[number]) {
    const viewport = await page.viewportSize();
    if (!viewport) {
        throw new McpError(
            ErrorCode.InternalError,
            "Failed to get viewport size"
        );
    }

    const scrollPosition = await page.evaluate(() => ({
        top: window.scrollY,
        left: window.scrollX
    }));

    return {
        viewport,
        scrollPosition
    };
}

/**
 * ハンドラーの実装
 */
export const getVisibleContentHandler: ToolHandler = async (request: CallToolRequest): Promise<ToolResponse> => {
    try {
        const browserContext = BrowserContextManager.getInstance().getContext();
        const pages = await browserContext.pages();
        
        if (pages.length === 0) {
            throw new McpError(
                ErrorCode.InvalidRequest,
                "No pages found. Please navigate to a page first."
            );
        }

        // 最後のページを使用（最新のアクティブページ）
        const page = pages[pages.length - 1];
        
        // ビューポートとスクロール位置の取得
        const { viewport, scrollPosition } = await getViewportInfo(page);

        // 可視要素を直接取得
        const visibleContent = await page.evaluate(async () => {
            const isElementVisible = (element: Element) => {
                const rect = element.getBoundingClientRect();
                return (
                    rect.top >= 0 &&
                    rect.left >= 0 &&
                    rect.bottom <= window.innerHeight &&
                    rect.right <= window.innerWidth
                );
            };

            const visibleElements = Array.from(document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, a'))
                .filter(isElementVisible)
                .map(el => {
                    const text = el.textContent?.trim() || '';
                    const tag = el.tagName.toLowerCase();
                    if (tag === 'a') {
                        const href = (el as HTMLAnchorElement).href;
                        return href ? `${text} (${href})` : text;
                    }
                    return text;
                })
                .filter(text => text.length > 0);

            const contentAbove = window.scrollY > 0 ? '...\n' : '';
            const contentBelow = window.scrollY + window.innerHeight < document.documentElement.scrollHeight ? '\n...' : '';

            return contentAbove + visibleElements.join('\n') + contentBelow;
        });

        return {
            content: [
                {
                    type: "text",
                    text: visibleContent
                }
            ]
        };
    } catch (error) {
        if (error instanceof McpError) {
            throw error;
        }
        throw new McpError(
            ErrorCode.InternalError,
            `Failed to get visible content: ${error instanceof Error ? error.message : String(error)}`
        );
    }
};

/**
 * ブラウザコンテキストの設定
 */
export const setBrowserContext = (context: BrowserContext) => {
    BrowserContextManager.getInstance().setContext(context);
};