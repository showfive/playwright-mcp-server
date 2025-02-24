import { McpError, ErrorCode, type CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { ToolResponse, ToolHandler } from './types.js';
import { type BrowserContext } from 'playwright';

let browserContext: BrowserContext | null = null;

export const toolDefinition = {
    name: 'get_interactive_elements',
    description: 'ページ内のインタラクティブ要素（ボタン、テキストエリア、ラジオボタンなど）の座標と範囲を取得します',
    inputSchema: {
        type: 'object',
        properties: {},
        required: []
    }
} as const;

/**
 * アクティブなページを取得
 */
async function getActivePage(context: BrowserContext) {
    const pages = await context.pages();
    if (pages.length === 0) {
        throw new McpError(
            ErrorCode.InvalidRequest,
            "No pages found. Please navigate to a page first."
        );
    }
    const page = pages[0]; // navigateツールが古いページを閉じるため、必ず最新のページになる
    await page.waitForLoadState('domcontentloaded');
    return page;
}

/**
 * ページ内のインタラクティブ要素の情報を取得するツール
 */
export const getInteractiveElementsHandler: ToolHandler = async (request: CallToolRequest): Promise<ToolResponse> => {
    if (!browserContext) {
        throw new McpError(
            ErrorCode.InvalidRequest,
            "No active browser context. Please navigate to a page first."
        );
    }

    try {
        // アクティブなページを取得
        const page = await getActivePage(browserContext);

        // インタラクティブ要素を探索して情報を収集
        const elements = await page.$$eval(
            'button, input, textarea, select, [role="button"], [role="checkbox"], [role="radio"]',
            (elements) => {
                return elements.map(element => {
                    // 基本的な要素情報を取得
                    const tagName = element.tagName.toLowerCase();
                    const type = element instanceof HTMLInputElement ? element.type.toLowerCase() : '';
                    
                    // 要素の種類を判定
                    let elementType: string;
                    if (tagName === 'button' || (tagName === 'input' && type === 'button')) {
                        elementType = 'button';
                    } else if (tagName === 'textarea') {
                        elementType = 'textarea';
                    } else if (tagName === 'input') {
                        elementType = type || 'text';
                    } else if (tagName === 'select') {
                        elementType = 'select';
                    } else if (element.getAttribute('role')) {
                        elementType = element.getAttribute('role') || 'button';
                    } else {
                        elementType = 'button';
                    }

                    // 要素のラベルを取得
                    let label = '';
                    const id = element.getAttribute('id');
                    if (id) {
                        const labelElement = document.querySelector(`label[for="${id}"]`);
                        if (labelElement) {
                            label = labelElement.textContent?.trim() || '';
                        }
                    }
                    if (!label) {
                        label = element.getAttribute('aria-label') || 
                               element.getAttribute('placeholder') || 
                               element.getAttribute('title') || 
                               element.textContent?.trim() || '';
                    }

                    // 要素の位置とサイズを取得
                    const rect = element.getBoundingClientRect();
                    const computedStyle = window.getComputedStyle(element);

                    return {
                        type: elementType,
                        id: element.getAttribute('id') || undefined,
                        name: element.getAttribute('name') || undefined,
                        value: element instanceof HTMLInputElement ? element.value : undefined,
                        label: label || undefined,
                        position: {
                            x: Math.round(rect.left + window.scrollX),
                            y: Math.round(rect.top + window.scrollY),
                            width: Math.round(rect.width),
                            height: Math.round(rect.height)
                        },
                        isVisible: computedStyle.display !== 'none' && 
                                 computedStyle.visibility !== 'hidden' && 
                                 computedStyle.opacity !== '0' &&
                                 rect.width > 0 && 
                                 rect.height > 0,
                        isEnabled: !element.hasAttribute('disabled') && 
                                 !element.hasAttribute('aria-disabled')
                    };
                });
            }
        );

        // フィルタリング：表示されている要素のみを返す
        const visibleElements = elements.filter(element => element.isVisible);

        return {
            content: [{
                type: 'text',
                text: JSON.stringify(visibleElements, null, 2)
            }]
        };
    } catch (error) {
        if (error instanceof McpError) {
            throw error;
        }
        throw new McpError(
            ErrorCode.InternalError,
            `Failed to get interactive elements: ${error instanceof Error ? error.message : String(error)}`
        );
    }
};

// ブラウザコンテキストの設定
export const setBrowserContext = (context: BrowserContext) => {
    browserContext = context;
};