import { BrowserManager } from "../browser-manager.js";
import { createSuccessResponse } from "../config/server-config.js";
import { humanDelay, customHumanDelay } from "../utils/human-delay.js";

interface UseKeyboardOptions {
    contextId: string;
    selector: string;
    text: string;
    submit?: boolean;
}

/**
 * キーボード入力をシミュレート
 */
export const useKeyboard = async ({ contextId, selector, text, submit = false }: UseKeyboardOptions) => {
    const context = await BrowserManager.getInstance().getContext(contextId);
    const page = context.pages()[0];

    // まずページの読み込みを待機
    await Promise.all([
        page.waitForLoadState('domcontentloaded'),
        page.waitForLoadState('networkidle')
    ]);

    // 要素が存在することを確認
    const element = await page.$(selector);
    if (!element) {
        throw new Error(`Element not found: ${selector}`);
    }

    // より詳細な可視性チェック
    const isVisible = await element.evaluate((el) => {
        function isElementVisible(element: Element): boolean {
            const rect = element.getBoundingClientRect();
            const style = window.getComputedStyle(element);

            // サイズチェック
            if (rect.width <= 0 || rect.height <= 0) return false;

            // 基本的な表示プロパティのチェック
            if (style.visibility === 'hidden') return false;
            if (style.display === 'none') return false;
            if (style.opacity === '0') return false;

            // ビューポート内の位置チェック
            const windowSize = {
                width: window.innerWidth || document.documentElement.clientWidth,
                height: window.innerHeight || document.documentElement.clientHeight
            };
            if (rect.bottom < 0) return false;
            if (rect.right < 0) return false;
            if (rect.top > windowSize.height) return false;
            if (rect.left > windowSize.width) return false;

            // 親要素の可視性も再帰的にチェック
            let parent = element.parentElement;
            while (parent) {
                const parentStyle = window.getComputedStyle(parent);
                if (parentStyle.display === 'none') return false;
                if (parentStyle.visibility === 'hidden') return false;
                if (parentStyle.opacity === '0') return false;
                parent = parent.parentElement;
            }

            return true;
        }

        return isElementVisible(el);
    });

    if (!isVisible) {
        // 要素が非表示の場合、フォーカスを試みる
        try {
            await element.focus();
            await page.waitForTimeout(1000);  // フォーカス後の表示を待機
        } catch (e) {
            // フォーカスに失敗した場合は例外をスロー
            throw new Error('Element is not visible and could not be focused');
        }
    }

    // 要素の親コンテナをクリック
    const container = await page.$('#composer-background');
    if (container) {
        const containerBox = await container.boundingBox();
        if (containerBox) {
            await page.mouse.click(
                containerBox.x + containerBox.width / 2,
                containerBox.y + containerBox.height / 2
            );
        }
    }

    // フォーカスを設定して要素が操作可能になるまで待機
    await element.focus();
    await page.waitForTimeout(500);

    // キーボード入力の準備
    await page.keyboard.press('Tab');  // フォーカスを確実にする
    await page.waitForTimeout(300);

    // クリック後の短い待機
    await customHumanDelay(300, 500);

    // フォーカスの確認
    const isFocused = await element.evaluate(el => {
        return document.activeElement === el;
    });

    if (!isFocused) {
        await element.focus();
        await customHumanDelay(200, 400);
    }

    // 人間らしい入力を再現（タイピングミスと修正を含む）
    let typed = '';
    for (const char of text) {
        // ランダムにタイピングミスを入れる（5%の確率）
        if (Math.random() < 0.05 && typed.length > 0) {
            await humanDelay();
            await page.keyboard.press('Backspace');
            typed = typed.slice(0, -1);
            await humanDelay();
        }

        await page.keyboard.type(char);
        typed += char;
        
        // より自然な入力遅延（50-200ms）
        await customHumanDelay(50, 200);
    }

    // 入力完了後の短い待機
    await customHumanDelay(400, 600);

    // サブミットが要求された場合
    if (submit) {
        await humanDelay();
        // 送信ボタンを探す
        const sendButton = await page.$('button[data-testid="send-button"]');
        if (sendButton) {
            await sendButton.click();
        } else {
            // ボタンが見つからない場合はEnterキーを使用
            await page.keyboard.press('Enter');
        }
    }

    return createSuccessResponse(
        `Successfully typed "${text}"${submit ? " and submitted" : ""}`
    );
};