import { isSignificantElement, getStructuredInfo } from '../structure.js';
import { StructuredElementInfo } from '../../types.js';

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

            expect(info.tag).toBe('div');
            expect(info.children).toBeDefined();
            expect(info.children?.length).toBeGreaterThan(0);

            // 構造の深さをチェック
            function getMaxDepth(info: StructuredElementInfo): number {
                if (!info.children || info.children.length === 0) return 0;
                const childDepths = info.children
                    .filter((child): child is StructuredElementInfo => typeof child !== 'string')
                    .map(child => getMaxDepth(child));
                return 1 + Math.max(...childDepths, 0);
            }

            expect(getMaxDepth(info)).toBeLessThanOrEqual(maxDepth);
        });

        it('should handle depth limitation correctly', () => {
            const maxDepth = 1;
            const info = getStructuredInfo(container, 0, maxDepth, significantTags);

            // 深いネストが省略されていることを確認
            function hasEllipsis(info: StructuredElementInfo): boolean {
                if (!info.children) return false;
                return info.children.some(child => 
                    typeof child === 'string' ? child === '...' : hasEllipsis(child)
                );
            }

            expect(hasEllipsis(info)).toBe(true);
        });

        it('should include significant elements', () => {
            const info = getStructuredInfo(container, 0, 3, significantTags);
            const infoStr = JSON.stringify(info);

            // 主要な要素が含まれていることを確認
            expect(infoStr).toContain('"tag":"header"');
            expect(infoStr).toContain('"tag":"nav"');
            expect(infoStr).toContain('"tag":"main"');
            expect(infoStr).toContain('"role":"navigation"');
        });
    });
});