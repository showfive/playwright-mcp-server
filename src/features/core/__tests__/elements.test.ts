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
                            <button id="menu-button" class="btn" role="button">Menu</button>
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
            describe('getClickableElements', () => {
                it('should return structured clickable elements', async () => {
                    const result = await elementOps.queryAll({
                        selector: 'button, a, input',
                        visible: true
                    });
    
                    expect(result.success).toBe(true);
                    expect(result.elements).toBeDefined();
    
                    // 新しい出力形式の検証
                    expect(result.elements).toBeDefined();
                    
                    const output = result.elements ? result.elements.map(element => {
                        const parts = [];
                        parts.push(`${element.tag}[${element.id ? `#${element.id}` : '.'}]`);
                        if (element.text) parts.push(element.text);
                        
                        const attrs = [];
                        if (element.attributes.role) attrs.push(`@${element.attributes.role}`);
                        if (element.attributes.type) attrs.push(`#${element.attributes.type}`);
                        if (element.attributes.name) attrs.push(`$${element.attributes.name}`);
                        if (element.attributes.disabled !== undefined) attrs.push('!');
                        if (element.attributes.checked !== undefined) attrs.push('*');
                        
                        if (attrs.length > 0) parts.push(attrs.join(' '));
                        
                        return parts.join(' | ');
                    }).join('\n') : '';
    
                    expect(output).not.toBe('');
    
                    // 必要な要素が含まれているか確認
                    expect(output).toContain('button[#menu-button]');
                    expect(output).toContain('button[#submit-button]');
                    expect(output).toContain('a[.');
                    expect(output).toContain('input[#test-input]');
    
                    // 属性が正しく表示されているか確認
                    // 個々の要素の検証
                    const lines = output.split('\n');
                    
                    // ボタン要素の検証
                    const menuButton = lines.find(line => line.includes('menu-button'));
                    expect(menuButton).toContain('button[#menu-button]');
                    expect(menuButton).toContain('| Menu');
                    expect(menuButton).toContain('| @button');
    
                    // input要素の検証
                    const inputElement = lines.find(line => line.includes('test-input'));
                    expect(inputElement).toContain('input[#test-input]');
                    expect(inputElement).toContain('| #text');
    
                    // submitボタンの検証
                    const submitButton = lines.find(line => line.includes('submit-button'));
                    expect(submitButton).toContain('button[#submit-button]');
                    expect(submitButton).toContain('| Submit');
    
                    // リンクの検証
                    const linkElement = lines.find(line => line.includes('a[.'));
                    expect(linkElement).toContain('a[.');
                    expect(linkElement).toContain('| Test Link');
                });
    
                it('should handle elements with special attributes', async () => {
                    // テスト用のHTML設定
                    await page.setContent(`
                        <form>
                            <input type="checkbox" id="check1" checked>
                            <input type="text" id="text1" disabled>
                            <button type="submit" name="submit-btn">Submit</button>
                        </form>
                    `);
    
                    const result = await elementOps.queryAll({
                        selector: 'input, button',
                        visible: true
                    });
    
                    expect(result.success).toBe(true);
                    expect(result.elements).toBeDefined();
    
                    expect(result.elements).toBeDefined();
                    
                    const output = result.elements ? result.elements.map(element => {
                        const parts = [];
                        parts.push(`${element.tag}[${element.id ? `#${element.id}` : '.'}]`);
                        
                        const attrs = [];
                        if (element.attributes.type) attrs.push(`#${element.attributes.type}`);
                        if (element.attributes.name) attrs.push(`$${element.attributes.name}`);
                        if (element.attributes.disabled !== undefined) attrs.push('!');
                        if (element.attributes.checked !== undefined) attrs.push('*');
                        
                        if (attrs.length > 0) parts.push(attrs.join(' '));
                        
                        return parts.join(' | ');
                    }).join('\n') : '';
    
                    expect(output).not.toBe('');
    
                    // チェックボックスの状態を確認
                    expect(output).toContain('input[#check1] | #checkbox *');
                    // 無効な要素の確認
                    expect(output).toContain('input[#text1] | #text !');
                    // name属性の確認
                    expect(output).toContain('button[.] | #submit $submit-btn');
                });
            });
    
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

            const structureStr = result.structure as string;
            
            // タグの存在を確認
            expect(structureStr).toContain('<header>');
            expect(structureStr).toContain('<main>');
            expect(structureStr).toContain('<nav');
            
            // ロールの確認
            expect(structureStr).toContain('role="navigation"');
        });

        it('should handle depth limitation correctly', async () => {
            const result = await elementOps.getStructure({ maxDepth: 1 });
            
            expect(result.success).toBe(true);
            expect(result.structure).toBeDefined();
            
            const structureStr = result.structure as string;

            // 省略要素の確認
            expect(structureStr).toContain('...');

            // 深さ制限の確認（深いネストが表示されないことを確認）
            expect(structureStr).not.toContain('<p>Deeply nested content</p>');
        });

        it('should get structure from specific selector', async () => {
            const result = await elementOps.getStructure({
                selector: '#test-form',
                maxDepth: 2
            });

            expect(result.success).toBe(true);
            expect(result.structure).toBeDefined();

            const structureStr = result.structure as string;
            
            // フォーム要素が含まれているか確認
            expect(structureStr).toContain('<form id="test-form"');
            expect(structureStr).toContain('<input id="test-input"');
            expect(structureStr).toContain('<button id="submit-button"');
            
            // フォームの親要素（main）が含まれていないことを確認
            expect(structureStr).not.toContain('<main>');
        });

        it('should handle custom depth with selector', async () => {
            const result = await elementOps.getStructure({
                selector: '.deep-nested',
                maxDepth: 1
            });

            expect(result.success).toBe(true);
            expect(result.structure).toBeDefined();

            const structureStr = result.structure as string;

            // セクション要素が含まれているか確認
            expect(structureStr).toContain('<section class="deep-nested"');
            
            // 深さ制限により省略されているか確認
            expect(structureStr).toContain('...');
            
            // より深い要素が含まれていないことを確認
            expect(structureStr).not.toContain('<p>Deeply nested content</p>');
        });

        it('should return multiple elements when selector matches multiple elements', async () => {
            // 新しいテストHTMLを設定
            await page.setContent(`
                <div>
                    <button class="test-btn">Button 1</button>
                    <section>
                        <button class="test-btn">Button 2</button>
                    </section>
                    <button class="test-btn">Button 3</button>
                </div>
            `);

            const result = await elementOps.getStructure({
                selector: '.test-btn',
                maxDepth: 3
            });

            expect(result.success).toBe(true);
            expect(result.structure).toBeDefined();

            const structureStr = result.structure as string;
            
            // 配列形式で返されることを確認
            expect(structureStr.startsWith('[')).toBe(true);
            expect(structureStr.endsWith(']')).toBe(true);
            
            // 全てのボタンが含まれていることを確認
            expect(structureStr).toContain('Button 1');
            expect(structureStr).toContain('Button 2');
            expect(structureStr).toContain('Button 3');
        });

        it('should handle nested elements correctly when using selector', async () => {
            // ネストされた要素を含むHTMLを設定
            await page.setContent(`
                <div class="level1">
                    <div class="level2">
                        <div class="level3">
                            <p>Deepest content</p>
                        </div>
                        <p>Level 2 content</p>
                    </div>
                    <p>Level 1 content</p>
                </div>
                <div class="standalone">
                    <p>Standalone content</p>
                </div>
            `);

            const result = await elementOps.getStructure({
                selector: 'div',
                maxDepth: 3
            });

            expect(result.success).toBe(true);
            expect(result.structure).toBeDefined();

            const structureStr = result.structure as string;
            
            // 配列形式で返されることを確認
            expect(structureStr.startsWith('[')).toBe(true);
            expect(structureStr.endsWith(']')).toBe(true);

            // 全てのdiv要素が配列の要素として含まれることを確認
            expect(structureStr).toContain('<div class="level1">');
            expect(structureStr).toContain('<div class="level2">');
            expect(structureStr).toContain('<div class="level3">');
            expect(structureStr).toContain('<div class="standalone">');

            // 各要素の内容が適切に含まれていることを確認
            expect(structureStr).toContain('<p>Deepest content</p>');
            expect(structureStr).toContain('<p>Level 2 content</p>');
            expect(structureStr).toContain('<p>Level 1 content</p>');
            expect(structureStr).toContain('<p>Standalone content</p>');
        });

        it('should handle deeply nested elements with same selector', async () => {
            await page.setContent(`
                <main>
                    <div class="container">
                        <div class="nested">
                            <p>Nested content</p>
                        </div>
                        <p>Container content</p>
                    </div>
                    <div class="other">Other content</div>
                </main>
            `);

            const result = await elementOps.getStructure({
                selector: 'div',
                maxDepth: 3
            });

            expect(result.success).toBe(true);
            const structureStr = result.structure as string;

            // 各div要素が独立した配列要素として含まれることを確認
            expect(structureStr).toContain('"container"');
            expect(structureStr).toContain('"nested"');
            expect(structureStr).toContain('"other"');

            // ネストされた要素が適切に表示されることを確認
            expect(structureStr).toContain('<p>Nested content</p>');
            expect(structureStr).toContain('<p>Container content</p>');
            expect(structureStr).toContain('Other content');
        });

        it('should limit maxDepth to 1 when multiple elements are found', async () => {
            const result = await elementOps.getStructure({
                selector: 'div',
                maxDepth: 3
            });

            expect(result.success).toBe(true);
            expect(result.structure).toBeDefined();

            const structureStr = result.structure as string;
            
            // 配列形式で返されることを確認
            expect(structureStr.startsWith('[')).toBe(true);
            expect(structureStr.endsWith(']')).toBe(true);

            // トップレベルの要素は深さが制限されていることを確認
            expect((structureStr.match(/\.\.\./g) || []).length).toBeGreaterThan(0);
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