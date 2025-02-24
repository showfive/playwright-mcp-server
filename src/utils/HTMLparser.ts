import { JSDOM } from 'jsdom';
import { ElementProcessorManager } from './ElementProcessorManager.js';
import { TextFormatter } from './TextFormatter.js';
import { Node, NodeFilter, SKIP_TAGS, MAIN_CONTENT_SELECTORS } from './constants.js';
import type { ParsedHTML, ViewportDimensions, VisibleContentOptions, VisibleContentResult } from './types.js';

/**
 * HTMLパーサーのメインクラス
 */
export class HTMLParser {
    private readonly dom: JSDOM;
    private readonly elementProcessor: ElementProcessorManager;

    constructor(html: string) {
        // スタイル要素を含まないHTMLを作成
        const cleanHtml = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        
        this.dom = new JSDOM(cleanHtml, {
            runScripts: "outside-only",
            includeNodeLocations: true,
            pretendToBeVisual: true
        });

        this.elementProcessor = new ElementProcessorManager(this.processChildren.bind(this));
    }

    /**
     * 要素のテキストコンテンツを安全に取得
     */
    private safeGetTextContent(element: Element | null): string {
        if (!element) return '';
        try {
            return element.textContent?.trim() || '';
        } catch {
            return '';
        }
    }

    /**
     * 子要素の処理
     */
    private processChildren(element: Element): string {
        let result = '';
        for (const child of Array.from(element.childNodes)) {
            result += this.processElement(child as Element);
        }
        return result;
    }

    /**
     * 個別の要素の処理
     */
    private processElement(element: Element | null): string {
        if (!element) return '';

        // テキストノードの処理
        if (element.nodeType === Node.TEXT_NODE && element.textContent) {
            return TextFormatter.formatTextNode(element.textContent);
        }

        const handler = this.elementProcessor.getHandler(element.tagName);
        if (handler) {
            return handler.processElement(element);
        }

        // スキップすべき要素の処理
        if (SKIP_TAGS.includes(element.tagName as any)) {
            return '';
        }

        return this.processChildren(element);
    }

    /**
     * メインコンテンツの特定と取得
     */
    private extractMainContent(): string {
        const document = this.dom.window.document;
        
        // メインコンテンツの検索
        for (const selector of MAIN_CONTENT_SELECTORS) {
            try {
                const element = document.querySelector(selector);
                if (element) {
                    const content = this.processElement(element);
                    if (content.length > 100) {
                        return content;
                    }
                }
            } catch {
                continue;
            }
        }

        // メインコンテンツが見つからない場合はbodyから取得
        try {
            const bodyClone = document.body.cloneNode(true) as HTMLElement;
            Array.from(bodyClone.getElementsByTagName('script')).forEach(el => el.remove());
            Array.from(bodyClone.getElementsByTagName('style')).forEach(el => el.remove());
            return this.processElement(bodyClone);
        } catch (error) {
            console.error('Error extracting body text:', error);
            return 'Failed to extract content';
        }
    }

    /**
     * コンテンツの相対位置を計算
     */
    private calculateRelativePosition(line: number, totalHeight: number, viewportHeight: number): number {
        // スクロール位置を考慮した相対位置の計算
        const lineHeight = 20; // 推定行の高さ（ピクセル）
        const pixelPosition = line * lineHeight;
        const totalPixelHeight = totalHeight * lineHeight;
        return (pixelPosition / totalPixelHeight) * 100;
    }

    /**
     * ノードがスキップすべきものかを判定
     */
    /**
     * 要素の深さを取得
     */
    private getElementDepth(element: Element): number {
        let depth = 0;
        let current = element;
        while (current.parentElement) {
            depth++;
            current = current.parentElement;
        }
        return depth - 1; // body要素の深さを0とする
    }

    /**
     * テーブルを構造化されたテキストに変換
     */
    private formatTable(table: Element): string {
        const rows = Array.from(table.querySelectorAll('tr'));
        const result: string[] = ['Table:'];
        TextFormatter.setIndentLevel(this.getElementDepth(table) + 1);

        for (const row of rows) {
            const cells = Array.from(row.querySelectorAll('th, td'))
                .map(cell => cell.textContent?.trim() || '')
                .join(' | ');
            result.push(TextFormatter.getCurrentIndent() + `| ${cells} |`);
        }

        return result.join('\n');
    }

    /**
     * フォームを構造化されたテキストに変換
     */
    private formatForm(form: Element): string {
        const result: string[] = ['Form:'];
        TextFormatter.setIndentLevel(this.getElementDepth(form) + 1);
        const indent = TextFormatter.getCurrentIndent();

        // フォーム要素の処理
        const inputs = form.querySelectorAll('input, textarea, select, button');
        for (const input of Array.from(inputs)) {
            const type = input.getAttribute('type') || input.tagName.toLowerCase();
            const name = input.getAttribute('name') || '';
            const label = this.findInputLabel(input);
            
            result.push(`${indent}${type}${name ? ` (${name})` : ''}${label ? `: ${label}` : ''}`);
        }

        return result.join('\n');
    }

    /**
     * 入力要素のラベルを検索
     */
    private findInputLabel(input: Element): string {
        const id = input.getAttribute('id');
        if (id) {
            const label = this.dom.window.document.querySelector(`label[for="${id}"]`);
            if (label) {
                return label.textContent?.trim() || '';
            }
        }

        // 親要素がlabelの場合
        let parent = input.parentElement;
        while (parent) {
            if (parent.tagName === 'LABEL') {
                const labelText = parent.textContent?.trim() || '';
                return labelText.replace(input.textContent?.trim() || '', '').trim();
            }
            parent = parent.parentElement;
        }

        return '';
    }

    private shouldSkipNode(node: Node): boolean {
        const parent = node.parentElement;
        if (!parent) return true;

        if (SKIP_TAGS.includes(parent.tagName as any)) {
            return true;
        }

        return !node.textContent?.trim();
    }

    /**
     * 画面内のコンテンツと画面外の位置情報を取得
     */
    public getVisibleContent(options: VisibleContentOptions): VisibleContentResult {
        const document = this.dom.window.document;
        const mainElement = document.querySelector('main, article, [role="main"]') || document.body;

        // ドキュメント全体の高さを計算
        const totalHeight = Array.from(mainElement.getElementsByTagName('*')).reduce((max, el) => {
            const loc = this.dom.nodeLocation(el);
            return loc ? Math.max(max, loc.endLine) : max;
        }, 0);

        // ビューポートの範囲（0-100%）を計算
        const viewportStart = Math.max(0, this.calculateRelativePosition(
            options.viewport.top,
            totalHeight,
            options.viewport.height
        ));
        const viewportEnd = Math.min(100, this.calculateRelativePosition(
            options.viewport.top + options.viewport.height,
            totalHeight,
            options.viewport.height
        ));

        // テキストノードを収集
        const textNodes = this.collectTextNodes(mainElement);
        if (textNodes.length === 0) {
            return { content: '', hasAbove: false, hasBelow: false };
        }

        // 可視範囲内のノードを抽出
        const visibleContent = this.extractVisibleContent(textNodes, {
            start: viewportStart,
            end: viewportEnd,
            minVisiblePercentage: options.minVisiblePercentage,
            viewportHeight: options.viewport.height
        });

        return visibleContent;
    }

    /**
     * テキストノードの収集
     */
    private collectTextNodes(rootElement: Element): Array<{ node: Node; line: number }> {
        const textNodes: Array<{ node: Node; line: number }> = [];
        const walker = this.dom.window.document.createTreeWalker(
            rootElement,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    return this.shouldSkipNode(node)
                        ? NodeFilter.FILTER_REJECT
                        : NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        while (walker.nextNode()) {
            const node = walker.currentNode;
            const parent = node.parentElement;
            if (!parent) continue;

            const location = this.dom.nodeLocation(parent);
            if (!location) continue;

            textNodes.push({
                node,
                line: location.startLine
            });
        }

        return textNodes.sort((a, b) => a.line - b.line);
    }

    /**
     * 可視範囲内のコンテンツを抽出
     */
    private extractVisibleContent(
        nodes: Array<{ node: Node; line: number }>,
        viewport: {
            start: number;
            end: number;
            minVisiblePercentage?: number;
            viewportHeight: number;
        }
    ): VisibleContentResult {
        const maxLine = nodes[nodes.length - 1].line;
        
        const visibleNodes = nodes.filter(({ line }) => {
            const position = this.calculateRelativePosition(
                line,
                maxLine,
                viewport.viewportHeight
            );
            
            if (position >= viewport.start && position <= viewport.end) {
                return true;
            }
            
            if (viewport.minVisiblePercentage) {
                const visibleRange = position >= viewport.start - 5 && position <= viewport.end + 5;
                if (!visibleRange) return false;

                const visiblePart = Math.min(viewport.end, position + 5) - Math.max(viewport.start, position - 5);
                const visiblePercent = (visiblePart / 10) * 100;
                return visiblePercent >= viewport.minVisiblePercentage;
            }
            
            return false;
        });

        const content = this.formatVisibleContent(visibleNodes.map(n => n.node));
        const hasAbove = nodes.some(({ line }) => {
            const position = this.calculateRelativePosition(
                line,
                maxLine,
                viewport.viewportHeight
            );
            return position < viewport.start - 5;
        });
        const hasBelow = nodes.some(({ line }) => {
            const position = this.calculateRelativePosition(
                line,
                maxLine,
                viewport.viewportHeight
            );
            return position > viewport.end + 5;
        });

        return { content, hasAbove, hasBelow };
    }

    /**
     * 可視コンテンツのフォーマット
     */
    private formatVisibleContent(nodes: Node[]): string {
        let lastParent: Element | null = null;
        let contentParts: string[] = [];
        let currentBlock = '';

        for (const node of nodes) {
            const parent = node.parentElement!;
            const text = node.textContent?.trim() || '';
            
            if (lastParent && parent !== lastParent) {
                if (currentBlock) {
                    contentParts.push(currentBlock);
                    currentBlock = '';
                }
            }

            switch (parent.tagName) {
                case 'H1':
                case 'H2':
                case 'H3':
                case 'H4':
                case 'H5':
                case 'H6':
                    if (currentBlock) contentParts.push(currentBlock);
                    const level = parseInt(parent.tagName[1]);
                    TextFormatter.setIndentLevel(0);
                    contentParts.push(TextFormatter.formatHeading(level, text));
                    currentBlock = '';
                    break;
                case 'A':
                    const href = parent.getAttribute('href');
                    currentBlock += href ? TextFormatter.formatLink(text, href) : `${text} `;
                    break;
                case 'LI':
                    if (currentBlock) contentParts.push(currentBlock);
                    TextFormatter.setIndentLevel(this.getElementDepth(parent));
                    contentParts.push(TextFormatter.formatListItem(text));
                    currentBlock = '';
                    break;
                case 'P':
                    if (currentBlock) contentParts.push(currentBlock);
                    TextFormatter.setIndentLevel(this.getElementDepth(parent));
                    contentParts.push(text);
                    currentBlock = '';
                    break;
                case 'TABLE':
                    if (currentBlock) contentParts.push(currentBlock);
                    TextFormatter.setIndentLevel(this.getElementDepth(parent));
                    contentParts.push(this.formatTable(parent));
                    currentBlock = '';
                    break;
                case 'FORM':
                    if (currentBlock) contentParts.push(currentBlock);
                    TextFormatter.setIndentLevel(this.getElementDepth(parent));
                    contentParts.push(this.formatForm(parent));
                    currentBlock = '';
                    break;
                case 'NAV':
                    if (currentBlock) contentParts.push(currentBlock);
                    TextFormatter.setIndentLevel(this.getElementDepth(parent));
                    contentParts.push('Navigation:');
                    currentBlock = '';
                    break;
                case 'ASIDE':
                    if (currentBlock) contentParts.push(currentBlock);
                    TextFormatter.setIndentLevel(this.getElementDepth(parent));
                    contentParts.push('Sidebar:');
                    currentBlock = '';
                    break;
                case 'FOOTER':
                    if (currentBlock) contentParts.push(currentBlock);
                    TextFormatter.setIndentLevel(this.getElementDepth(parent));
                    contentParts.push('Footer:');
                    currentBlock = '';
                    break;
                default:
                    currentBlock += `${text} `;
            }
            
            lastParent = parent;
        }

        if (currentBlock) {
            contentParts.push(currentBlock);
        }

        return TextFormatter.format(contentParts.filter(part => part.trim().length > 0).join('\n'));
    }

    /**
     * HTMLの解析を実行
     */
    public parse(): ParsedHTML {
        try {
            const document = this.dom.window.document;
            const title = this.safeGetTextContent(document.querySelector('title'));
            const description = document.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() || '';
            
            const mainText = this.extractMainContent();
            const cleanText = TextFormatter.format(mainText);

            return {
                title,
                description,
                content: cleanText
            };
        } catch (error) {
            console.error('Error parsing HTML:', error);
            return {
                title: '',
                description: '',
                content: 'Failed to process webpage content'
            };
        }
    }
}

/**
 * HTMLからテキストを抽出し構造化する
 */
export function extractTextFromHtml(html: string): string {
    try {
        const parser = new HTMLParser(html);
        const { title, description, content } = parser.parse();
        return TextFormatter.generateStructuredContent(title, description, content);
    } catch (error) {
        console.error('Error in extractTextFromHtml:', error);
        return 'Failed to process webpage content';
    }
}

/**
 * 画面に表示されている範囲内のテキストを抽出
 */
export function extractVisibleText(
    html: string, 
    viewport: ViewportDimensions, 
    minVisiblePercentage?: number
): string {
    try {
        const parser = new HTMLParser(html);
        const { content, hasAbove, hasBelow } = parser.getVisibleContent({
            viewport,
            minVisiblePercentage
        });

        const parts: string[] = [];
        if (hasAbove) parts.push('...');
        if (content) parts.push(content);
        if (hasBelow) parts.push('...');

        return parts.join('\n');
    } catch (error) {
        console.error('Error in extractVisibleText:', error);
        return 'Failed to extract visible content';
    }
}
