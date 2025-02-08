import { chromium, Browser, BrowserContext, Page, ElementHandle } from 'playwright';
import { PlaywrightElementOperations } from '../elements.js';
import { ElementInfo, QueryOptions, ElementChangeEvent } from '../types.js';

describe('PlaywrightElementOperations', () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let elementOps: PlaywrightElementOperations;

    beforeAll(async () => {
        browser = await chromium.launch({ headless: true });
    });

    afterAll(async () => {
        await browser.close();
    });

    beforeEach(async () => {
        context = await browser.newContext();
        page = await context.newPage();
        elementOps = new PlaywrightElementOperations(page);

        // テスト用のHTML設定
        await page.setContent(`
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    .hidden-element { display: none; }
                    #result { visibility: visible; }
                </style>
            </head>
            <body>
                <div id="container">
                    <header>
                        <h1 id="title">Test Page</h1>
                        <nav role="navigation">
                            <button id="menu-button" class="btn">Menu</button>
                        </nav>
                    </header>
                    <main>
                        <form id="test-form">
                            <label for="test-input">Input:</label>
                            <input id="test-input" type="text" aria-label="Test Input">
                            <button id="submit-button" class="btn-primary">Submit</button>
                        </form>
                        <div id="result">Visible Result</div>
                        <a href="#" class="link">Test Link</a>
                        <div class="hidden-element">Hidden Content</div>
                        <section class="deep-nested">
                            <article>
                                <div>
                                    <p>Deeply nested content</p>
                                </div>
                            </article>
                        </section>
                    </main>
                </div>
            </body>
            </html>
        `);

        await page.waitForSelector('#container');
    });

    afterEach(async () => {
        await context.close();
    });

    describe('getInfo', () => {
        it('should get element information correctly', async () => {
            const element = await page.$('#title');
            expect(element).not.toBeNull();

            if (element) {
                const info = await elementOps.getInfo(element);
                expect(info).toMatchObject({
                    tag: 'h1',
                    id: 'title',
                    text: 'Test Page',
                    isVisible: true
                });
                expect(info.position).toBeDefined();
            }
        });

        it('should detect hidden elements', async () => {
            const element = await page.$('.hidden-element');
            expect(element).not.toBeNull();

            if (element) {
                const info = await elementOps.getInfo(element);
                expect(info.isVisible).toBe(false);
            }
        });
    });

    describe('query', () => {
        it('should find element by selector', async () => {
            const result = await elementOps.query({
                selector: '#test-input'
            });

            expect(result.success).toBe(true);
            expect(result.info?.tag).toBe('input');
            expect(result.info?.id).toBe('test-input');
        });

        it('should find element by role', async () => {
            const result = await elementOps.query({
                role: 'button',
                name: 'Submit'
            });

            expect(result.success).toBe(true);
            expect(result.info?.id).toBe('submit-button');
        });

        it('should find element by text', async () => {
            const result = await elementOps.query({
                text: 'Test Link'
            });

            expect(result.success).toBe(true);
            expect(result.info?.tag).toBe('a');
        });

        it('should handle non-existent elements', async () => {
            const result = await elementOps.query({
                selector: '#non-existent'
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    describe('queryAll', () => {
        it('should find all buttons', async () => {
            const result = await elementOps.queryAll({
                role: 'button'
            });

            expect(result.success).toBe(true);
            expect(result.elements).toBeDefined();
            const elementIds = result.elements?.map(e => e.id);
            expect(elementIds).toContain('menu-button');
            expect(elementIds).toContain('submit-button');
        });

        it('should filter visible elements', async () => {
            const result = await elementOps.queryAll({
                selector: 'div',
                visible: true
            });

            expect(result.success).toBe(true);
            expect(result.elements).toBeDefined();
            const hasResultElement = result.elements?.some(e => e.id === 'result');
            expect(hasResultElement).toBe(true);
            expect(result.elements?.every(e => e.isVisible)).toBe(true);
        });
    });

    describe('getStructure', () => {
        it('should return structured page information', async () => {
            const result = await elementOps.getStructure({ maxDepth: 2 });
            
            expect(result.success).toBe(true);
            expect(result.structure).toBeDefined();

            // JSON文字列をパースして検証
            const structureObj = JSON.parse(JSON.stringify(result.structure));
            
            // タグの存在を確認
            const hasHeader = findElementByTag(structureObj, 'header');
            const hasMain = findElementByTag(structureObj, 'main');
            const hasNav = findElementByTag(structureObj, 'nav');

            expect(hasHeader).toBe(true);
            expect(hasMain).toBe(true);
            expect(hasNav).toBe(true);

            // ロールの確認
            const hasNavigation = findElementByRole(structureObj, 'navigation');
            expect(hasNavigation).toBe(true);
        });

        it('should handle depth limitation correctly', async () => {
            const result = await elementOps.getStructure({ maxDepth: 1 });
            
            expect(result.success).toBe(true);
            expect(result.structure).toBeDefined();
            
            const structureObj = JSON.parse(JSON.stringify(result.structure));

            // 省略要素の確認
            const hasEllipsis = findEllipsis(structureObj);
            expect(hasEllipsis).toBe(true);

            // 構造の深さを確認
            const maxDepth = getMaxDepth(structureObj);
            expect(maxDepth).toBeLessThanOrEqual(3); // ルート + maxDepth + 1
        });
    });

    describe('observe', () => {
        it('should detect attribute changes', async () => {
            const changes: ElementChangeEvent[] = [];
            const cleanup = await elementOps.observe(
                { attributes: true, subtree: true },
                (event) => {
                    changes.push(event);
                }
            );

            try {
                await page.evaluate(() => {
                    const input = document.querySelector('#test-input');
                    if (input) {
                        input.setAttribute('disabled', 'true');
                    }
                });

                await page.waitForTimeout(100);

                expect(changes.length).toBeGreaterThan(0);
                expect(changes[0].type).toBe('modified');
                expect(changes[0].changes?.attribute).toBe('disabled');
            } finally {
                await cleanup();
            }
        });

        it('should detect DOM changes', async () => {
            const changes: ElementChangeEvent[] = [];
            const cleanup = await elementOps.observe(
                { childList: true, subtree: true },
                (event) => {
                    changes.push(event);
                }
            );

            try {
                await page.evaluate(() => {
                    const result = document.querySelector('#result');
                    if (result) {
                        const newElement = document.createElement('span');
                        newElement.textContent = 'New Content';
                        result.appendChild(newElement);
                    }
                });

                await page.waitForTimeout(100);

                expect(changes.length).toBeGreaterThan(0);
                expect(changes[0].type).toBe('added');
                expect(changes[0].target.tag).toBe('span');
            } finally {
                await cleanup();
            }
        });
    });
});

// ヘルパー関数
function findElementByTag(obj: any, tag: string): boolean {
    if (obj.tag === tag) return true;
    if (obj.children) {
        return obj.children.some((child: any) => 
            typeof child === 'object' && findElementByTag(child, tag)
        );
    }
    return false;
}

function findElementByRole(obj: any, role: string): boolean {
    if (obj.role === role) return true;
    if (obj.children) {
        return obj.children.some((child: any) =>
            typeof child === 'object' && findElementByRole(child, role)
        );
    }
    return false;
}

function findEllipsis(obj: any): boolean {
    if (obj.text === '...') return true;
    if (obj.children) {
        return obj.children.some((child: any) =>
            typeof child === 'object' && findEllipsis(child)
        );
    }
    return false;
}

function getMaxDepth(obj: any): number {
    if (!obj.children || !obj.children.length) return 1;
    const childDepths = obj.children
        .filter((child: any) => typeof child === 'object')
        .map((child: any) => getMaxDepth(child));
    return 1 + Math.max(...childDepths, 0);
}