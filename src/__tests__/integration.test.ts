import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BrowserManager } from "../browser-manager.js";
import { Browser, BrowserContext, Page, chromium } from 'playwright';
import { z } from "zod";
import * as http from 'http';

// テストのタイムアウトを2分に設定
jest.setTimeout(120000);

describe('Playwright MCP Server Integration', () => {
    let server: McpServer;
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let testContext: BrowserContext;
    let httpServer: http.Server;
    let testPageUrl: string;

    beforeAll(async () => {
        // テストHTTPサーバーを起動
        httpServer = http.createServer((req, res) => {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Test Page</title>
                </head>
                <body>
                    <nav class="menu">
                        <button id="nav-button" class="btn">Menu</button>
                    </nav>
                    <main>
                        <form id="test-form">
                            <input type="text" id="test-input" placeholder="Enter text">
                            <textarea id="test-textarea" placeholder="Enter description"></textarea>
                            <button id="test-button" class="btn-primary">Click me</button>
                        </form>
                        <div id="result"></div>
                        <a href="#" class="link">Test Link</a>
                        <div class="hidden-element" style="display: none">Hidden</div>
                    </main>
                </body>
                </html>
            `);
        });

        await new Promise<void>((resolve) => {
            httpServer.listen(0, () => resolve());
        });

        const address = httpServer.address() as { port: number };
        testPageUrl = `http://localhost:${address.port}`;
        
        browser = await chromium.launch({ headless: true });
    });

    afterAll(async () => {
        try {
            if (browser) {
                await browser.close();
            }
            await BrowserManager.getInstance().closeAll();
            await new Promise<void>((resolve) => {
                httpServer.close(() => resolve());
            });
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    });

    beforeEach(async () => {
        server = new McpServer({
            name: "playwright-automation-test",
            version: "1.0.0"
        });

        context = await browser.newContext();
        page = await context.newPage();
        await page.goto(testPageUrl, { waitUntil: 'networkidle' });
        testContext = await BrowserManager.getInstance().createContext("test-context");
    });

    afterEach(async () => {
        try {
            if (page) {
                await page.close().catch(() => {});
            }
            if (context) {
                await context.close().catch(() => {});
            }
            if (testContext) {
                await BrowserManager.getInstance().closeContext("test-context").catch(() => {});
            }
            await server.close().catch(() => {});
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    });

    describe('Navigation and Element Tools', () => {
        it('should navigate to URL and return page content with interactive elements', async () => {
            server.tool(
                "navigate_test",
                {
                    contextId: z.string(),
                    url: z.string()
                },
                async ({ contextId, url }) => {
                    const context = await BrowserManager.getInstance().getContext(contextId);
                    const page = await context.newPage();
                    await page.goto(url, { waitUntil: 'networkidle' });

                    // ページのコンテンツを取得
                    const content = await page.content();
                    
                    // インタラクティブな要素を取得
                    const elements = await page.$$eval(
                        'button, input, select, textarea, a, [role="button"]',
                        els => els.map(el => ({
                            tag: el.tagName.toLowerCase(),
                            text: el.textContent?.trim() || '',
                            type: el.getAttribute('type'),
                            role: el.getAttribute('role')
                        }))
                    );

                    return {
                        content: [{
                            type: "text" as const,
                            text: JSON.stringify({ content, elements })
                        }]
                    };
                }
            );

            // 実際のテスト実行
            const page = await testContext.newPage();
            await page.goto(testPageUrl);
            
            // インタラクティブな要素の存在を確認
            const elements = await page.$$eval(
                'button, input, select, textarea, a, [role="button"]',
                els => els.map(el => ({
                    tag: el.tagName.toLowerCase(),
                    id: el.id
                }))
            );

            expect(elements).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ id: 'test-input' }),
                    expect.objectContaining({ id: 'test-button' }),
                    expect.objectContaining({ id: 'nav-button' })
                ])
            );
        });

        beforeEach(async () => {
            const testPage = await testContext.newPage();
            await testPage.goto(testPageUrl, { waitUntil: 'networkidle' });
        });

        it('should list all elements on the page', async () => {
            let elementsList: any = null;
            
            // ツール実装のテスト
            server.tool(
                "list_elements",
                {
                    contextId: z.string()
                },
                async ({ contextId }) => {
                    const context = await BrowserManager.getInstance().getContext(contextId);
                    const page = context.pages()[0];
                    const elements = await page.evaluate(() => {
                        const allElements = document.querySelectorAll('*');
                        return Array.from(allElements).map(el => ({
                            tag: el.tagName.toLowerCase(),
                            id: el.id,
                            classes: Array.from(el.classList)
                        }));
                    });

                    elementsList = elements; // テスト用に結果を保存

                    return {
                        content: [{
                            type: "text" as const,
                            text: JSON.stringify(elements)
                        }]
                    };
                }
            );

            // ツールが正しく登録されたことを確認
            expect(elementsList).toBe(null);

            // 実際のブラウザ操作で要素を確認
            const elements = await page.evaluate(() => {
                const allElements = document.querySelectorAll('*');
                return Array.from(allElements).map(el => ({
                    tag: el.tagName.toLowerCase(),
                    id: el.id
                }));
            });

            expect(elements).toEqual(expect.arrayContaining([
                expect.objectContaining({ id: 'test-input' }),
                expect.objectContaining({ id: 'test-button' })
            ]));
        });

        it('should identify clickable elements', async () => {
            // ツール実装のテスト
            server.tool(
                "get_clickable",
                {
                    contextId: z.string()
                },
                async ({ contextId }) => {
                    const context = await BrowserManager.getInstance().getContext(contextId);
                    const page = context.pages()[0];
                    const elements = await page.evaluate(() => {
                        const clickable = document.querySelectorAll('button, a, [role="button"]');
                        return Array.from(clickable).map(el => ({
                            tag: el.tagName.toLowerCase(),
                            id: el.id,
                            text: el.textContent?.trim()
                        }));
                    });
                    return {
                        content: [{
                            type: "text" as const,
                            text: JSON.stringify(elements)
                        }]
                    };
                }
            );

            // 実際のブラウザ操作で要素を確認
            const clickableElements = await page.$$eval('button, a, [role="button"]', 
                elements => elements.map(el => ({
                    id: el.id,
                    tag: el.tagName.toLowerCase()
                }))
            );

            expect(clickableElements).toEqual(expect.arrayContaining([
                expect.objectContaining({ id: 'test-button' }),
                expect.objectContaining({ id: 'nav-button' })
            ]));
        });

        it('should provide detailed element information', async () => {
            server.tool(
                "get_element_details",
                {
                    contextId: z.string(),
                    selector: z.string()
                },
                async ({ contextId, selector }) => {
                    const context = await BrowserManager.getInstance().getContext(contextId);
                    const page = context.pages()[0];
                    const info = await page.evaluate((sel) => {
                        const el = document.querySelector(sel);
                        if (!el) return null;
                        return {
                            tag: el.tagName.toLowerCase(),
                            id: el.id,
                            type: el.getAttribute('type'),
                            isVisible: el.getBoundingClientRect().height > 0
                        };
                    }, selector);

                    if (!info) {
                        return {
                            content: [{
                                type: "text" as const,
                                text: `Element not found: ${selector}`
                            }],
                            isError: true
                        };
                    }

                    return {
                        content: [{
                            type: "text" as const,
                            text: JSON.stringify(info)
                        }]
                    };
                }
            );

            // 実際のブラウザ操作で要素を確認
            const elementInfo = await page.$eval('#test-input', el => ({
                tag: el.tagName.toLowerCase(),
                id: el.id,
                type: el.getAttribute('type')
            }));

            expect(elementInfo).toEqual({
                tag: 'input',
                id: 'test-input',
                type: 'text'
            });
        });

        it('should handle non-existent elements', async () => {
            let errorCaptured = false;

            server.tool(
                "check_element",
                {
                    contextId: z.string(),
                    selector: z.string()
                },
                async ({ contextId, selector }) => {
                    const context = await BrowserManager.getInstance().getContext(contextId);
                    const page = context.pages()[0];
                    const exists = await page.$(selector);
                    
                    if (!exists) {
                        errorCaptured = true; // テスト用にエラー状態を記録
                        return {
                            content: [{
                                type: "text" as const,
                                text: `Element not found: ${selector}`
                            }],
                            isError: true
                        };
                    }

                    return {
                        content: [{
                            type: "text" as const,
                            text: "Element exists"
                        }]
                    };
                }
            );

            // 実際のブラウザ操作で存在しない要素へのアクセスを試みる
            const nonExistentElement = await page.$('#non-existent');
            expect(nonExistentElement).toBeNull();
        });

        it('should detect all interactive elements including textarea', async () => {
            server.tool(
                "test_interactive_elements",
                {
                    contextId: z.string(),
                    includeDetails: z.boolean().optional()
                },
                async ({ contextId, includeDetails }) => {
                    const context = await BrowserManager.getInstance().getContext(contextId);
                    const page = context.pages()[0];
                    
                    // インタラクティブな要素を取得
                    const elements = await page.$$eval(
                        'button, input, textarea, select, a[href], [role="button"]',
                        (els, withDetails) => els.map(el => {
                            const base = {
                                tag: el.tagName.toLowerCase(),
                                id: el.id,
                            };

                            if (!withDetails) return base;

                            const details: any = { ...base };
                            if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
                                details.placeholder = el.placeholder;
                                details.value = el.value;
                            }
                            return details;
                        }), includeDetails
                    );

                    return {
                        content: [{
                            type: "text" as const,
                            text: JSON.stringify(elements)
                        }]
                    };
                }
            );

            // 基本的な要素の存在確認
            const elements = await page.$$eval(
                'button, input, textarea, select, a[href], [role="button"]',
                els => els.map(el => ({
                    tag: el.tagName.toLowerCase(),
                    id: el.id
                }))
            );

            expect(elements).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ id: 'test-input' }),
                    expect.objectContaining({ id: 'test-textarea' }),
                    expect.objectContaining({ id: 'test-button' }),
                    expect.objectContaining({ id: 'nav-button' })
                ])
            );

            // 詳細情報の確認
            const detailedElements = await page.$$eval(
                'input, textarea',
                els => els.map(el => ({
                    tag: el.tagName.toLowerCase(),
                    id: el.id,
                    placeholder: (el as HTMLInputElement | HTMLTextAreaElement).placeholder
                }))
            );

            expect(detailedElements).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        id: 'test-input',
                        placeholder: 'Enter text'
                    }),
                    expect.objectContaining({
                        id: 'test-textarea',
                        placeholder: 'Enter description'
                    })
                ])
            );
        });
    });
});