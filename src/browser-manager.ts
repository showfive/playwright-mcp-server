import { Browser, BrowserContext, chromium } from 'playwright';

export class BrowserManager {
    private static instance: BrowserManager;
    private browser: Browser | null = null;
    private contexts: Map<string, BrowserContext> = new Map();

    private constructor() {}

    static getInstance(): BrowserManager {
        if (!BrowserManager.instance) {
            BrowserManager.instance = new BrowserManager();
        }
        return BrowserManager.instance;
    }

    async getBrowser(): Promise<Browser> {
        if (!this.browser) {
            const defaultOptions = { headless: false };
            const braveOptions = {
                executablePath: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
                ...defaultOptions
            };

            try {
                // まずBraveブラウザでの起動を試みる
                this.browser = await chromium.launch(braveOptions);
            } catch (error) {
                // Braveが利用できない場合はデフォルトのChromiumを使用
                console.log('Falling back to default browser');
                this.browser = await chromium.launch(defaultOptions);
            }
        }
        return this.browser;
    }

    async createContext(contextId: string): Promise<BrowserContext> {
        const browser = await this.getBrowser();
        const context = await browser.newContext({
            viewport: { width: 1280, height: 720 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        });
        this.contexts.set(contextId, context);
        return context;
    }

    async getContext(contextId: string): Promise<BrowserContext> {
        const context = this.contexts.get(contextId);
        if (!context) {
            return this.createContext(contextId);
        }
        return context;
    }

    async closeContext(contextId: string): Promise<void> {
        const context = this.contexts.get(contextId);
        if (context) {
            await context.close();
            this.contexts.delete(contextId);
        }
    }

    async closeAll(): Promise<void> {
        for (const context of this.contexts.values()) {
            await context.close();
        }
        this.contexts.clear();
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}