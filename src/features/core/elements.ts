import { Page, ElementHandle } from 'playwright';
import {
    ElementInfo,
    ElementOperations,
    ElementResult,
    QueryOptions,
    ObserverOptions,
    ElementChangeEvent,
    ElementOperationError,
    ErrorCodes,
    SIGNIFICANT_TAGS
} from './types.js';
import { checkVisibility, isInViewport } from './utils/visibility.js';
import { isSignificantElement, getStructuredInfo } from './utils/structure.js';
import { setupElementObserver } from './utils/observer.js';

// significantTagsの型を明示的に定義
const significantTagsList = Array.from(SIGNIFICANT_TAGS) as ReadonlyArray<string>;

interface ElementEvaluationResult {
    tag: string;
    id?: string;
    classes: string[];
    role?: string;
    text?: string;
    isVisible: boolean;
    children?: ElementEvaluationResult[];
}

/**
 * 構造情報を取得する際の内部パラメータ
 */
interface StructureParams {
    maxDepth: number;
    currentDepth: number;
    significantTags: ReadonlyArray<string>;
}

export class PlaywrightElementOperations implements ElementOperations {
    private readonly page: Page;
    private readonly DEFAULT_MAX_DEPTH = 3;

    constructor(page: Page) {
        this.page = page;
    }

    async getInfo(element: ElementHandle<Element>): Promise<ElementInfo> {
        try {
            const info = await element.evaluate((el: Element) => {
                const rect = el.getBoundingClientRect();
                const computedStyle = window.getComputedStyle(el);
                const windowSize = {
                    width: window.innerWidth || document.documentElement.clientWidth,
                    height: window.innerHeight || document.documentElement.clientHeight
                };
                
                // より詳細な可視性チェック
                const isVisible = (function() {
                    // 基本的な表示プロパティのチェック
                    if (rect.width <= 0 || rect.height <= 0) return false;
                    if (computedStyle.visibility === 'hidden') return false;
                    if (computedStyle.display === 'none') return false;
                    if (computedStyle.opacity === '0') return false;
                    
                    // 要素が画面内にあるかチェック
                    if (rect.bottom < 0) return false;
                    if (rect.right < 0) return false;
                    if (rect.top > windowSize.height) return false;
                    if (rect.left > windowSize.width) return false;
                    
                    // 親要素の可視性もチェック
                    let parent = el.parentElement;
                    while (parent) {
                        const parentStyle = window.getComputedStyle(parent);
                        if (parentStyle.display === 'none') return false;
                        if (parentStyle.visibility === 'hidden') return false;
                        if (parentStyle.opacity === '0') return false;
                        parent = parent.parentElement;
                    }
                    
                    return true;
                })();

                return {
                    tag: el.tagName.toLowerCase(),
                    id: el.id || undefined,
                    classes: Array.from(el.classList),
                    attributes: Object.fromEntries(
                        Array.from(el.attributes)
                            .map(attr => [attr.name, attr.value])
                    ),
                    text: el.textContent?.trim(),
                    isVisible,
                    position: {
                        x: rect.x,
                        y: rect.y,
                        width: rect.width,
                        height: rect.height
                    }
                };
            });

            return info;
        } catch (error) {
            throw new ElementOperationError(
                'Failed to get element info',
                ErrorCodes.ELEMENT_NOT_FOUND,
                error
            );
        }
    }

    async query(options: QueryOptions): Promise<ElementResult> {
        try {
            let elementHandle: ElementHandle<Node> | null = null;

            if (options.selector) {
                elementHandle = await this.page.waitForSelector(options.selector, { state: 'attached' });
            } else if (options.role) {
                const roleElement = this.page.getByRole(options.role, { name: options.name });
                elementHandle = await roleElement.elementHandle();
            } else if (options.text) {
                const textElement = this.page.getByText(options.text);
                elementHandle = await textElement.elementHandle();
            }

            if (!elementHandle) {
                return {
                    success: false,
                    error: 'Element not found'
                };
            }

            const isElement = await elementHandle.evaluate((node: Node) => node instanceof Element);
            if (!isElement) {
                return {
                    success: false,
                    error: 'Found node is not an element'
                };
            }

            const element = elementHandle as ElementHandle<Element>;
            const info = await this.getInfo(element);

            if (options.visible && !info.isVisible) {
                return {
                    success: false,
                    error: 'Element is not visible'
                };
            }

            return {
                success: true,
                info
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    async queryAll(options: QueryOptions): Promise<ElementResult> {
        try {
            let elements: ElementHandle<Element>[] = [];
            
            if (options.selector) {
                // セレクターを','で分割して個別に処理
                const selectors = options.selector.split(',').map(s => s.trim());
                
                // クライアントサイドで要素を検索し、一意のパスを生成
                const elementPaths = await this.page.evaluate((selectors) => {
                    function getElementPath(element: Element): string {
                        const path: string[] = [];
                        let current = element;
                        
                        while (current && current !== document.documentElement) {
                            let selector = current.tagName.toLowerCase();
                            if (current.id) {
                                selector += `#${current.id}`;
                            } else {
                                let index = 1;
                                let sibling = current.previousElementSibling;
                                while (sibling) {
                                    if (sibling.tagName === current.tagName) index++;
                                    sibling = sibling.previousElementSibling;
                                }
                                selector += `:nth-child(${index})`;
                            }
                            path.unshift(selector);
                            current = current.parentElement!;
                        }
                        return path.join(' > ');
                    }
                    
                    return selectors.flatMap(selector =>
                        Array.from(document.querySelectorAll(selector))
                            .map(el => getElementPath(el))
                    );
                }, selectors);
                
                // 生成されたパスを使用して要素のハンドルを取得
                for (const path of elementPaths) {
                    try {
                        const element = await this.page.waitForSelector(path, {
                            state: 'attached',
                            timeout: 1000
                        });
                        if (element) elements.push(element);
                    } catch (e) {
                        console.warn(`Element handle not found for path: ${path}`);
                    }
                }
            } else if (options.role) {
                const locator = this.page.getByRole(options.role, { name: options.name });
                const roleElements = await locator.elementHandles();
                elements = roleElements as ElementHandle<Element>[];
            } else if (options.text) {
                const locator = this.page.getByText(options.text);
                const textElements = await locator.elementHandles();
                elements = textElements as ElementHandle<Element>[];
            }

            const infos = await Promise.all(
                elements.map(element => this.getInfo(element))
            );

            if (options.visible) {
                const visibleInfos = infos.filter(info => info.isVisible);
                return {
                    success: true,
                    elements: visibleInfos
                };
            }

            return {
                success: true,
                elements: infos
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    async getStructure(options?: { maxDepth?: number; selector?: string }): Promise<ElementResult> {
        try {
            // より柔軟な待機戦略
            try {
                await Promise.race([
                    this.page.waitForLoadState('domcontentloaded', { timeout: 5000 }),
                    this.page.waitForSelector('body', { timeout: 5000 })
                ]);
            } catch (e) {
                console.warn('Page load timeout, proceeding with available content');
            }

            const params = {
                maxDepth: options?.maxDepth ?? this.DEFAULT_MAX_DEPTH,
                significantTags: significantTagsList,
                selector: options?.selector
            };

            const structure = await this.page.evaluate(
                ({ maxDepth, significantTags, selector }) => {
                    function isSignificantElement(el: Element, tags: ReadonlyArray<string>): boolean {
                        const tagName = el.tagName.toLowerCase();
                        const isSignificantTag = tags.includes(tagName);
                        const hasId = !!el.id;
                        const hasRole = !!el.getAttribute('role');
                        const hasClasses = el.classList.length > 0;
                        
                        return isSignificantTag || hasId || hasRole || hasClasses;
                    }

                    function processElementAttributes(element: Element): string {
                        const attributes: string[] = [];
                        if (element.id) {
                            attributes.push(`id="${element.id}"`);
                        }
                        if (element.classList.length > 0) {
                            attributes.push(`class="${Array.from(element.classList).join(' ')}"`);
                        }
                        const role = element.getAttribute('role');
                        if (role) {
                            attributes.push(`role="${role}"`);
                        }
                        return attributes.length > 0 ? ' ' + attributes.join(' ') : '';
                    }

                    function getStructuredInfo(element: Element, depth: number, maxDepth: number, tags: ReadonlyArray<string>, isTopLevel: boolean = false): string {
                        const indent = '    '.repeat(depth);
                        const tag = element.tagName.toLowerCase();
                        const attrStr = processElementAttributes(element);
                        let output = `${indent}<${tag}${attrStr}>`;

                        const childElements = Array.from(element.children);
                        const isSignificant = isSignificantElement(element, tags);

                        // テキストコンテンツの処理
                        if (childElements.length === 0) {
                            const text = element.textContent?.trim();
                            if (text) {
                                output += text.length > 50 ? text.substring(0, 47) + '...' : text;
                            }
                            return output + `</${tag}>`;
                        }

                        // 深さの制限チェック
                        if (!isTopLevel && !isSignificant && depth >= maxDepth) {
                            return output + '...' + `</${tag}>`;
                        }

                        output += '\n';

                        // 子要素の処理
                        for (const child of childElements) {
                            const childOutput = getStructuredInfo(
                                child,
                                depth + 1,
                                maxDepth,
                                tags,
                                false
                            );
                            if (childOutput) {
                                const childLines = childOutput.split('\n');
                                for (const line of childLines) {
                                    if (line.trim()) {
                                        output += indent + '    ' + line.trim() + '\n';
                                    }
                                }
                            }
                        }
                        output = output.trimEnd();
                        return output + `</${tag}>`;
                    }

                    // セレクターなしの場合：ドキュメント全体の構造を返す
                    if (!selector) {
                        return getStructuredInfo(
                            document.documentElement,
                            0,
                            maxDepth,
                            significantTags,
                            true
                        );
                    }

                    // セレクターありの場合：マッチする要素のみを配列で返す
                    const elements = document.querySelectorAll(selector);
                    if (elements.length === 0) {
                        throw new Error(`Elements not found: ${selector}`);
                    }

                    // トップレベルの要素のみを抽出
                    const topLevelElements = Array.from(elements).filter(el => {
                        const parent = el.parentElement;
                        return !parent || !parent.matches(selector);
                    });

                    // 各要素を処理（配列形式で返す）
                    const processedElements = topLevelElements.map(element => {
                        const html = getStructuredInfo(
                            element,
                            0,
                            maxDepth,
                            significantTags,
                            true
                        );
                        // 各行に4スペースのインデントを追加
                        return html.split('\n')
                            .map(line => '    ' + line)
                            .join('\n');
                    });

                    // 配列形式で結合
                    return '[\n' + processedElements.join(',\n') + '\n]';
                },
                params
            );

            return {
                success: true,
                structure
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get page structure'
            };
        }
    }

    async observe(
        options: ObserverOptions,
        callback: (event: ElementChangeEvent) => void
    ): Promise<() => void> {
        return setupElementObserver(this.page, options, callback);
    }
}