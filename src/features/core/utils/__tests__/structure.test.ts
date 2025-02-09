import { isSignificantElement, getStructuredInfo } from '../structure.js';
import { chromium, Browser, Page } from 'playwright';
import { PlaywrightElementOperations } from '../../elements.js';

describe('Structure Utils', () => {
    const significantTags = ['main', 'nav', 'header'] as const;

    describe('isSignificantElement', () => {
        let element: HTMLElement;

        beforeEach(() => {
            element = document.createElement('div');
        });

        it('should identify elements with significant tags', () => {
            significantTags.forEach(tag => {
                const el = document.createElement(tag);
                expect(isSignificantElement(el, significantTags)).toBe(true);
            });
        });

        it('should identify elements with ID', () => {
            element.id = 'test-id';
            expect(isSignificantElement(element, significantTags)).toBe(true);
        });

        it('should identify elements with role', () => {
            element.setAttribute('role', 'button');
            expect(isSignificantElement(element, significantTags)).toBe(true);
        });

        it('should identify elements with classes', () => {
            element.classList.add('test-class');
            expect(isSignificantElement(element, significantTags)).toBe(true);
        });

        it('should not identify plain elements', () => {
            expect(isSignificantElement(element, significantTags)).toBe(false);
        });
    });

    describe('getStructuredInfo', () => {
        let container: HTMLElement;

        beforeEach(() => {
            container = document.createElement('div');
            container.innerHTML = `
                <header id="page-header">
                    <h1>Title</h1>
                    <nav role="navigation">
                        <ul>
                            <li><a href="#">Link 1</a></li>
                            <li><a href="#">Link 2</a></li>
                        </ul>
                    </nav>
                </header>
                <main>
                    <article class="content">
                        <p>Test content</p>
                    </article>
                </main>
            `;
            document.body.appendChild(container);
        });

        afterEach(() => {
            container.remove();
        });

        it('should create structured info with correct depth', () => {
            const maxDepth = 2;
            const info = getStructuredInfo(container, 0, maxDepth, significantTags);

            expect(info).toContain('<div>');
            expect(info).toContain('</div>');
            expect(info).toContain('<header id="page-header">');
            expect(info).toContain('<nav role="navigation">');
            
            // インデントの確認
            const lines = info.split('\n');
            expect(lines.some(line => line.startsWith('  '))).toBe(true);
            expect(lines.some(line => line.startsWith('    '))).toBe(true);
        });

        it('should handle depth limitation correctly', () => {
            const maxDepth = 1;
            const info = getStructuredInfo(container, 0, maxDepth, significantTags);

            expect(info).toContain('...');
            expect(info.split('\n').length).toBeLessThan(10); // 深さ制限により出力が制限されることを確認
        });

        it('should include significant elements and attributes', () => {
            const info = getStructuredInfo(container, 0, 3, significantTags);

            expect(info).toContain('id="page-header"');
            expect(info).toContain('role="navigation"');
            expect(info).toContain('class="content"');
            expect(info).toContain('<header');
            expect(info).toContain('<nav');
            expect(info).toContain('<main');
        });

        it('should format output with proper indentation and structure', () => {
            const info = getStructuredInfo(container, 0, 3, significantTags);
            const lines = info.split('\n');

            // 基本的な構造の確認
            expect(lines[0]).toBe('<div>');
            expect(lines[lines.length - 1]).toBe('</div>');

            // インデントレベルの確認
            const headerLine = lines.find(line => line.includes('<header'));
            const navLine = lines.find(line => line.includes('<nav'));
            expect(headerLine?.startsWith('  ')).toBe(true);
            expect(navLine?.startsWith('    ')).toBe(true);
        });

        it('should truncate long text content', () => {
            const longTextContainer = document.createElement('div');
            const longText = 'a'.repeat(100);
            longTextContainer.textContent = longText;
            
            const info = getStructuredInfo(longTextContainer, 0, 1, significantTags);
            expect(info).toContain('...');
            expect(info.length).toBeLessThan(longText.length);
        });

        it('should handle empty elements correctly', () => {
            const emptyContainer = document.createElement('div');
            const info = getStructuredInfo(emptyContainer, 0, 1, significantTags);
            
            expect(info).toBe('<div></div>');
        });

        it('should combine multiple attributes correctly', () => {
            const el = document.createElement('div');
            el.id = 'test-id';
            el.className = 'class1 class2';
            el.setAttribute('role', 'button');
            
            const info = getStructuredInfo(el, 0, 1, significantTags);
            expect(info).toContain('id="test-id"');
            expect(info).toContain('class="class1 class2"');
            expect(info).toContain('role="button"');
            
            // 属性の順序を確認
            const attributesPart = info.split('>')[0];
            expect(attributesPart.indexOf('id=')).toBeLessThan(attributesPart.indexOf('class='));
            expect(attributesPart.indexOf('class=')).toBeLessThan(attributesPart.indexOf('role='));
        });
    });

    describe('Integration Test with Real Browser', () => {
        let browser: Browser;
        let page: Page;
        let elementOps: PlaywrightElementOperations;

        beforeAll(async () => {
            browser = await chromium.launch({ headless: true });
            const context = await browser.newContext();
            page = await context.newPage();
            elementOps = new PlaywrightElementOperations(page);
        });

        afterAll(async () => {
            await browser.close();
        });

        it('should get elements in HTML format from real website', async () => {
            await page.goto('https://www.anitube.biz', { waitUntil: 'networkidle' });
            
            const result = await elementOps.getStructure({ maxDepth: 3 });
            if (!result.success) {
                console.error('Error:', result.error);
            }
            expect(result.success).toBe(true);
            expect(result.structure).toBeDefined();
            
            // 文字列形式の検証
            expect(typeof result.structure).toBe('string');
            expect(result.structure).toContain('<html');
            expect(result.structure).toContain('</html>');
            
            // インデントの検証
            const lines = result.structure?.split('\n') || [];
            expect(lines.some(line => line.startsWith('  '))).toBe(true);
            expect(lines.some(line => line.startsWith('    '))).toBe(true);
            
            // 重要な要素の検証
            expect(result.structure).toContain('<header');
            expect(result.structure).toContain('<footer');
            expect(result.structure).toContain('<div class="');
            
            // 属性の検証
            expect(result.structure).toMatch(/id="[^"]+"/);
            expect(result.structure).toMatch(/class="[^"]+"/);
            
            expect(() => JSON.parse(result.structure!)).toThrow();
            
        }, 30000);
    });
});