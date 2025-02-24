import { ElementProcessor } from './types.js';
import { BLOCK_ELEMENTS, HEADING_ELEMENTS } from './constants.js';
import { TextFormatter } from './TextFormatter.js';

/**
 * HTML要素の処理を管理するクラス
 */
export class ElementProcessorManager {
    private readonly elementHandlers: Map<string, ElementProcessor>;
    private readonly processChildren: (element: Element) => string;

    constructor(processChildrenCallback: (element: Element) => string) {
        this.processChildren = processChildrenCallback;
        this.elementHandlers = this.initializeElementHandlers();
    }

    /**
     * 要素に対応するハンドラーを取得
     */
    public getHandler(tagName: string): ElementProcessor | undefined {
        return this.elementHandlers.get(tagName);
    }

    /**
     * 要素ハンドラーの初期化
     */
    private initializeElementHandlers(): Map<string, ElementProcessor> {
        const handlers = new Map<string, ElementProcessor>();

        // 画像要素のハンドラー
        handlers.set('IMG', {
            processElement: (element: Element): string => {
                const src = element.getAttribute('src');
                return src ? TextFormatter.formatImage(src) : '';
            }
        });

        // 動画要素のハンドラー
        handlers.set('VIDEO', {
            processElement: (element: Element): string => {
                let videoSources = '';
                const src = element.getAttribute('src');
                if (src) {
                    videoSources += TextFormatter.formatVideo(src);
                }
                
                const sources = element.getElementsByTagName('source');
                Array.from(sources).forEach(source => {
                    const sourceSrc = source.getAttribute('src');
                    if (sourceSrc) {
                        videoSources += TextFormatter.formatVideo(sourceSrc);
                    }
                });
                
                return videoSources;
            }
        });

        // リンク要素のハンドラー
        handlers.set('A', {
            processElement: (element: Element): string => {
                const href = element.getAttribute('href');
                const text = element.textContent?.trim();
                if (href && text) {
                    return TextFormatter.formatLink(text, href);
                }
                return this.processChildren(element);
            }
        });

        // ブロック要素のハンドラー
        BLOCK_ELEMENTS.forEach(tag => {
            handlers.set(tag, {
                processElement: (element: Element): string => {
                    const content = this.processChildren(element);
                    return content ? TextFormatter.formatParagraph(content) : '';
                }
            });
        });

        // リストアイテムのハンドラー
        handlers.set('LI', {
            processElement: (element: Element): string => {
                return TextFormatter.formatListItem(this.processChildren(element)) + '\n';
            }
        });

        // 見出し要素のハンドラー
        HEADING_ELEMENTS.forEach(tag => {
            handlers.set(tag, {
                processElement: (element: Element): string => {
                    const level = parseInt(tag[1]);
                    return TextFormatter.formatHeading(level, this.processChildren(element));
                }
            });
        });

        return handlers;
    }
}