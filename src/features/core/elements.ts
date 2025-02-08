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
    StructuredElementInfo,
    SIGNIFICANT_TAGS
} from './types.js';
import { checkVisibility, isInViewport } from './utils/visibility.js';
import { isSignificantElement } from './utils/structure.js';
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
                
                const isVisible = !!(
                    rect.width > 0 &&
                    rect.height > 0 &&
                    computedStyle.visibility !== 'hidden' &&
                    computedStyle.display !== 'none' &&
                    computedStyle.opacity !== '0'
                );

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
                const handles = await this.page.$$(options.selector);
                const validElements = await Promise.all(
                    handles.map(async handle => {
                        const isElement = await handle.evaluate((node: Node) => node instanceof Element);
                        return isElement ? handle as ElementHandle<Element> : null;
                    })
                );
                elements = validElements.filter((el): el is ElementHandle<Element> => el !== null);
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

    async getStructure(options?: { maxDepth?: number }): Promise<ElementResult> {
        try {
            const maxDepth = options?.maxDepth ?? this.DEFAULT_MAX_DEPTH;
            
            await this.page.waitForLoadState('domcontentloaded');

            const structure = await this.page.evaluate(
                ({ maxDepth, significantTags }: { maxDepth: number; significantTags: ReadonlyArray<string> }) => {
                    function getStructuredInfo(element: Element, params: StructureParams): ElementEvaluationResult {
                        const { maxDepth, currentDepth, significantTags } = params;
                        const style = window.getComputedStyle(element);
                        const isVisible = style.display !== 'none' && 
                                        style.visibility !== 'hidden' && 
                                        style.opacity !== '0';
                        const tagName = element.tagName.toLowerCase();
                        const isImportant = significantTags.includes(tagName) ||
                                          !!element.id ||
                                          !!element.getAttribute('role') ||
                                          element.classList.length > 0;

                        const baseInfo: ElementEvaluationResult = {
                            tag: tagName,
                            id: element.id || undefined,
                            classes: Array.from(element.classList),
                            role: element.getAttribute('role') || undefined,
                            text: element.textContent?.trim(),
                            isVisible
                        };

                        // 子要素の処理
                        const children = Array.from(element.children)
                            .map(child => {
                                const childTagName = child.tagName.toLowerCase();
                                // 重要な要素の判定を厳密に
                                const isSemanticTag = significantTags.includes(childTagName);
                                const hasIdentifier = !!child.id || child.classList.length > 0;
                                const hasRole = !!child.getAttribute('role');
                                const isChildImportant = isSemanticTag || hasIdentifier || hasRole;

                                const nextDepth = currentDepth + 1;

                                // セマンティックタグは常に含める
                                if (isSemanticTag) {
                                    return getStructuredInfo(child, {
                                        maxDepth,
                                        currentDepth: nextDepth,
                                        significantTags
                                    });
                                }

                                // 深さの制限チェック
                                if (nextDepth > maxDepth) {
                                    // 重要な要素は省略付きで含める
                                    return isChildImportant ? {
                                        tag: childTagName,
                                        id: child.id || undefined,
                                        classes: Array.from(child.classList),
                                        role: child.getAttribute('role') || undefined,
                                        text: '...',
                                        isVisible: false
                                    } : null;
                                }

                                // 深さ制限内の要素を処理
                                if (isChildImportant || nextDepth <= maxDepth - 1) {
                                    return getStructuredInfo(child, {
                                        maxDepth,
                                        currentDepth: nextDepth,
                                        significantTags
                                    });
                                }

                                // その他の要素は省略
                                return {
                                    tag: childTagName,
                                    text: '...',
                                    isVisible: false,
                                    classes: []
                                };
                            })
                            .filter((child): child is ElementEvaluationResult => child !== null);

                        if (children.length > 0) {
                            baseInfo.children = children;
                        } else if (currentDepth > 0) {
                            baseInfo.text = baseInfo.text || '...';
                        }

                        return baseInfo;
                    }

                    return getStructuredInfo(document.documentElement, {
                        maxDepth,
                        currentDepth: 0,
                        significantTags
                    });
                },
                { maxDepth, significantTags: significantTagsList }
            );

            return {
                success: true,
                structure: structure as StructuredElementInfo
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