import { Page } from 'playwright';
import { ObserverOptions, ElementChangeEvent } from '../types.js';

interface ObserverConfig {
    observerId: string;
    options: ObserverOptions;
}

/**
 * 要素の変更を監視するユーティリティ
 */
export async function setupElementObserver(
    page: Page,
    options: ObserverOptions,
    callback: (event: ElementChangeEvent) => void
): Promise<() => Promise<void>> {
    const observerId = `observer_${Math.random().toString(36).slice(2)}`;

    // グローバルコールバック関数を設定
    await page.exposeFunction(`${observerId}_callback`, (event: ElementChangeEvent) => {
        callback(event);
    });

    await page.evaluate(
        ({ observerId, options }: ObserverConfig) => {
            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.type === 'attributes' && mutation.target instanceof Element) {
                        // @ts-ignore
                        window[`${observerId}_callback`]({
                            type: 'modified',
                            target: {
                                tag: mutation.target.tagName.toLowerCase(),
                                id: mutation.target.id,
                                classes: Array.from(mutation.target.classList),
                                attributes: Object.fromEntries(
                                    Array.from(mutation.target.attributes)
                                        .map(attr => [attr.name, attr.value])
                                ),
                                isVisible: true
                            },
                            changes: {
                                attribute: mutation.attributeName || undefined,
                                oldValue: mutation.oldValue || undefined,
                                newValue: mutation.target.getAttribute(mutation.attributeName || '') || undefined
                            }
                        });
                    } else if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach(node => {
                            if (node instanceof Element) {
                                // @ts-ignore
                                window[`${observerId}_callback`]({
                                    type: 'added',
                                    target: {
                                        tag: node.tagName.toLowerCase(),
                                        id: node.id,
                                        classes: Array.from(node.classList),
                                        attributes: {},
                                        isVisible: true
                                    }
                                });
                            }
                        });

                        mutation.removedNodes.forEach(node => {
                            if (node instanceof Element) {
                                // @ts-ignore
                                window[`${observerId}_callback`]({
                                    type: 'removed',
                                    target: {
                                        tag: node.tagName.toLowerCase(),
                                        id: node.id,
                                        classes: Array.from(node.classList),
                                        attributes: {},
                                        isVisible: false
                                    }
                                });
                            }
                        });
                    }
                }
            });

            observer.observe(document.body, {
                ...options,
                attributes: true,
                attributeOldValue: true,
                subtree: true
            });
            
            return observer;
        },
        { observerId, options }
    );

    // クリーンアップ関数を返す
    return async () => {
        await page.evaluate(
            (observerId: string) => {
                // @ts-ignore
                delete window[`${observerId}_callback`];
            },
            observerId
        );
    };
}