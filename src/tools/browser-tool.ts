import { BrowserManager } from "../browser-manager.js";
import { createSuccessResponse } from "../config/server-config.js";
import { JSDOM } from 'jsdom';
import { PlaywrightElementOperations } from "../features/core/elements.js";
import { INTERACTIVE_SELECTORS } from "../config/tool-config.js";
import { getInteractiveElements } from "./element-tool.js";

// テキストコンテンツを安全に取得
function safeGetTextContent(element: Element | null): string {
    if (!element) return '';
    try {
        return element.textContent?.trim() || '';
    } catch (e) {
        return '';
    }
}

// HTMLからマークダウン形式のテキストを抽出
function extractMarkdownFromHtml(html: string): string {
    try {
        const cleanHtml = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        const dom = new JSDOM(cleanHtml, {
            runScripts: "outside-only",
            includeNodeLocations: true,
            pretendToBeVisual: true
        });
        const document = dom.window.document;

        // タイトルとメタ情報の取得
        const title = safeGetTextContent(document.querySelector('title'));
        const description = document.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() || '';

        // 要素の処理
        function processElement(element: Element | null): string {
            if (!element) return '';

            let result = '';
            if (element.nodeType === 3 && element.textContent) {
                return element.textContent.trim().replace(/\s+/g, ' ') + ' ';
            }

            switch (element.tagName) {
                case 'IMG': {
                    const src = element.getAttribute('src');
                    const alt = element.getAttribute('alt');
                    return src ? `![${alt || 'image'}](${src})\n` : '';
                }
                case 'A': {
                    const href = element.getAttribute('href');
                    const text = element.textContent?.trim();
                    if (href && text) {
                        return `[${text}](${href}) `;
                    }
                    return processChildren(element);
                }
                case 'P':
                case 'DIV':
                case 'SECTION':
                case 'ARTICLE': {
                    const content = processChildren(element);
                    return content ? content + '\n\n' : '';
                }
                case 'LI':
                    return '- ' + processChildren(element) + '\n';
                case 'H1':
                case 'H2':
                case 'H3':
                case 'H4':
                case 'H5':
                case 'H6': {
                    const level = parseInt(element.tagName[1]);
                    const prefix = '#'.repeat(level);
                    return `${prefix} ${processChildren(element)}\n\n`;
                }
                case 'BR':
                    return '\n';
                case 'PRE':
                case 'CODE':
                    return '```\n' + processChildren(element) + '\n```\n';
                default:
                    return processChildren(element);
            }
        }

        function processChildren(element: Element): string {
            let result = '';
            for (const child of Array.from(element.childNodes)) {
                result += processElement(child as Element);
            }
            return result;
        }

        // メインコンテンツの抽出
        const mainSelectors = [
            'article', 'main', '[role="main"]',
            '#main-content', '.main-content',
            '#content', '.content'
        ];

        let mainText = '';
        for (const selector of mainSelectors) {
            try {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    const text = processElement(element);
                    mainText += text;
                    if (mainText.length > 100) break;
                }
            } catch (e) {
                continue;
            }
        }

        if (!mainText) {
            const bodyClone = document.body.cloneNode(true) as HTMLElement;
            Array.from(bodyClone.getElementsByTagName('script')).forEach(el => el.remove());
            Array.from(bodyClone.getElementsByTagName('style')).forEach(el => el.remove());
            mainText = processElement(bodyClone);
        }

        // テキストの整形
        const cleanText = mainText
            .split(/\n\s*\n+/)
            .map(paragraph => paragraph.replace(/\s+/g, ' ').trim())
            .filter(paragraph => paragraph.length > 0)
            .join('\n\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        return [
            title ? `# ${title}` : '# No Title',
            description ? `\n## Description\n${description}` : '',
            '\n## Content\n',
            cleanText
        ].filter(Boolean).join('\n');

    } catch (error) {
        console.error('Error in extractMarkdownFromHtml:', error);
        return 'Failed to process webpage content';
    }
}

/**
 * ブラウザコンテキストを作成
 */
export const createBrowserContext = async () => {
    const contextId = Math.random().toString(36).substring(7);
    const browserManager = BrowserManager.getInstance();
    
    // まずブラウザを起動
    await browserManager.getBrowser();
    
    // 次にコンテキストを作成
    await browserManager.createContext(contextId);

    // ホームページにナビゲート
    const result = await navigateToUrl(contextId, 'https://www.bing.com');
    const content = result.content[0].text;
    return createSuccessResponse(JSON.stringify({ contextId, content }));
};

/**
 * 指定されたURLにナビゲート
 */
export const navigateToUrl = async (contextId: string, url: string) => {
    const context = await BrowserManager.getInstance().getContext(contextId);
    const page = await context.newPage();
    try {
        await page.goto(url, {
            waitUntil: 'load',
            timeout: 15000
        });

        // 追加の待機時間（動的要素の読み込み用）
        await page.waitForTimeout(2000);

        // DOMコンテンツの取得
        const htmlContent = await page.content();
        
        // HTMLからマークダウン形式のテキストを抽出
        const markdownContent = extractMarkdownFromHtml(htmlContent);
        
        // インタラクティブ要素を取得
        const interactiveResult = (await getInteractiveElements(contextId)).content[0].text;
        const interactiveContent = '\n\n## Interactive Elements\n' + interactiveResult;
        
        return createSuccessResponse(markdownContent + interactiveContent);
    } catch (error) {
        // ページが部分的に読み込まれている場合は内容を取得
        if (await page.evaluate(() => document.readyState !== 'loading')) {
            const htmlContent = await page.content();
            const markdownContent = extractMarkdownFromHtml(htmlContent);
            return createSuccessResponse(markdownContent);
        }
        throw error;
    }
};

/**
 * ページコンテンツをマークダウン形式で取得
 */
export const getPageContent = async (contextId: string) => {
    const context = await BrowserManager.getInstance().getContext(contextId);
    const page = context.pages()[0];
    if (!page) {
        throw new Error('No active page found');
    }

    try {
        // JavaScriptの実行を待機（動的コンテンツのロード用）
        await new Promise(resolve => setTimeout(resolve, 2000));

        // DOMコンテンツの取得
        const htmlContent = await page.content();
        
        // HTMLからマークダウン形式のテキストを抽出
        const markdownContent = extractMarkdownFromHtml(htmlContent);
        
        return createSuccessResponse(markdownContent);
    } catch (error) {
        console.error('Error getting page content:', error);
        throw new Error('Failed to get page content');
    }
};