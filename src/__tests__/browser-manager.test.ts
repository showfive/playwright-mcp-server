import { BrowserManager } from '../browser-manager.js';
import { Browser, BrowserContext, chromium } from 'playwright';

jest.mock('playwright', () => ({
    chromium: {
        launch: jest.fn()
    }
}));

describe('BrowserManager', () => {
    let browserManager: BrowserManager;
    let mockBrowser: jest.Mocked<Browser>;
    let mockContext1: jest.Mocked<BrowserContext>;
    let mockContext2: jest.Mocked<BrowserContext>;

    beforeEach(() => {
        // 異なるモックコンテキストを作成
        mockContext1 = {
            close: jest.fn().mockResolvedValue(undefined),
            pages: jest.fn().mockReturnValue([]),
            newPage: jest.fn().mockResolvedValue({}),
        } as unknown as jest.Mocked<BrowserContext>;

        mockContext2 = {
            close: jest.fn().mockResolvedValue(undefined),
            pages: jest.fn().mockReturnValue([]),
            newPage: jest.fn().mockResolvedValue({}),
        } as unknown as jest.Mocked<BrowserContext>;

        mockBrowser = {
            close: jest.fn().mockResolvedValue(undefined),
            newContext: jest.fn()
                .mockResolvedValueOnce(mockContext1)
                .mockResolvedValueOnce(mockContext2)
        } as unknown as jest.Mocked<Browser>;

        (chromium.launch as jest.Mock).mockResolvedValue(mockBrowser);

        // BrowserManagerのインスタンスを初期化
        browserManager = BrowserManager.getInstance();
    });

    afterEach(async () => {
        await browserManager.closeAll();
        jest.clearAllMocks();
    });

    describe('Instance Management', () => {
        it('should return the same instance when getInstance is called multiple times', () => {
            const instance1 = BrowserManager.getInstance();
            const instance2 = BrowserManager.getInstance();
            expect(instance1).toBe(instance2);
        });
    });

    describe('Browser Management', () => {
        it('should try to launch Brave browser first', async () => {
            const browser = await browserManager.getBrowser();
            expect(chromium.launch).toHaveBeenCalledWith({
                executablePath: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
                headless: false
            });
            expect(browser).toBeDefined();
        });

        it('should fallback to default browser if Brave fails', async () => {
            // 1回目の呼び出しで失敗を模擬
            (chromium.launch as jest.Mock)
                .mockRejectedValueOnce(new Error('Brave not found'))
                .mockResolvedValueOnce(mockBrowser);

            const browser = await browserManager.getBrowser();
            expect(chromium.launch).toHaveBeenCalledTimes(2);
            expect(chromium.launch).toHaveBeenLastCalledWith({
                headless: false
            });
            expect(browser).toBeDefined();
        });

        it('should reuse existing browser instance', async () => {
            const browser1 = await browserManager.getBrowser();
            const browser2 = await browserManager.getBrowser();
            expect(chromium.launch).toHaveBeenCalledTimes(1);
            expect(browser1).toBe(browser2);
        });
    });

    describe('Context Management', () => {
        it('should create new context with specified ID', async () => {
            const contextId = 'test-context';
            const context = await browserManager.createContext(contextId);
            expect(context).toBeDefined();
            expect(mockBrowser.newContext).toHaveBeenCalledWith({
                viewport: { width: 1280, height: 720 },
                userAgent: expect.any(String)
            });
        });

        it('should return existing context when getContext is called with same ID', async () => {
            const contextId = 'test-context';
            const context1 = await browserManager.createContext(contextId);
            const context2 = await browserManager.getContext(contextId);
            expect(context1).toBe(context2);
            expect(mockBrowser.newContext).toHaveBeenCalledTimes(1);
        });

        it('should create new context when getContext is called with new ID', async () => {
            // 2つの異なるコンテキストを作成
            const context1 = await browserManager.getContext('context1');
            const context2 = await browserManager.getContext('context2');
            
            // 異なるインスタンスであることを確認
            expect(context1).not.toBe(context2);
            expect(mockBrowser.newContext).toHaveBeenCalledTimes(2);
        });
    });

    describe('Cleanup', () => {
        it('should close specific context', async () => {
            const contextId = 'test-context';
            const context = await browserManager.createContext(contextId);
            await browserManager.closeContext(contextId);
            expect(mockContext1.close).toHaveBeenCalled();
        });

        it('should close all contexts and browser when closeAll is called', async () => {
            await browserManager.createContext('context1');
            await browserManager.createContext('context2');
            await browserManager.closeAll();
            expect(mockContext1.close).toHaveBeenCalled();
            expect(mockContext2.close).toHaveBeenCalled();
            expect(mockBrowser.close).toHaveBeenCalled();
        });

        it('should handle closing non-existent context', async () => {
            await expect(browserManager.closeContext('non-existent')).resolves.not.toThrow();
        });
    });
});