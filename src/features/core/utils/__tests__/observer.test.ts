import { Page, Browser, BrowserContext, chromium } from 'playwright';
import { setupElementObserver } from '../observer.js';
import { ElementChangeEvent } from '../../types.js';

describe('Observer Utils', () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;

    beforeAll(async () => {
        browser = await chromium.launch({ headless: true });
    });

    afterAll(async () => {
        await browser.close();
    });

    beforeEach(async () => {
        context = await browser.newContext();
        page = await context.newPage();
        await page.setContent(`
            <div id="container">
                <button id="test-button">Click me</button>
                <div id="target">Test content</div>
            </div>
        `);
    });

    afterEach(async () => {
        await context.close();
    });

    it('should detect attribute changes', async () => {
        const changes: ElementChangeEvent[] = [];
        const cleanup = await setupElementObserver(
            page,
            { attributes: true, subtree: true },
            (event) => changes.push(event)
        );

        try {
            await page.evaluate(() => {
                const button = document.getElementById('test-button');
                if (button) {
                    button.setAttribute('disabled', 'true');
                }
            });

            // 変更が検出されるまで待機
            await page.waitForTimeout(100);

            expect(changes.length).toBeGreaterThan(0);
            expect(changes[0].type).toBe('modified');
            expect(changes[0].changes?.attribute).toBe('disabled');
            expect(changes[0].target.tag).toBe('button');
        } finally {
            await cleanup();
        }
    });

    it('should detect added elements', async () => {
        const changes: ElementChangeEvent[] = [];
        const cleanup = await setupElementObserver(
            page,
            { childList: true, subtree: true },
            (event) => changes.push(event)
        );

        try {
            await page.evaluate(() => {
                const target = document.getElementById('target');
                if (target) {
                    const newElement = document.createElement('span');
                    newElement.textContent = 'New content';
                    target.appendChild(newElement);
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

    it('should detect removed elements', async () => {
        const changes: ElementChangeEvent[] = [];
        const cleanup = await setupElementObserver(
            page,
            { childList: true, subtree: true },
            (event) => changes.push(event)
        );

        try {
            await page.evaluate(() => {
                const button = document.getElementById('test-button');
                if (button) {
                    button.remove();
                }
            });

            await page.waitForTimeout(100);

            expect(changes.length).toBeGreaterThan(0);
            expect(changes[0].type).toBe('removed');
            expect(changes[0].target.tag).toBe('button');
            expect(changes[0].target.id).toBe('test-button');
        } finally {
            await cleanup();
        }
    });

    it('should cleanup observer correctly', async () => {
        const changes: ElementChangeEvent[] = [];
        const cleanup = await setupElementObserver(
            page,
            { attributes: true, subtree: true },
            (event) => changes.push(event)
        );

        // クリーンアップを実行
        await cleanup();

        // クリーンアップ後は変更が検出されないことを確認
        await page.evaluate(() => {
            const button = document.getElementById('test-button');
            if (button) {
                button.setAttribute('disabled', 'true');
            }
        });

        await page.waitForTimeout(100);
        expect(changes.length).toBe(0);
    });
});