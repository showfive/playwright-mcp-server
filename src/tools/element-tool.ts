import { ElementHandle, Page } from 'playwright';
import { BrowserManager } from "../browser-manager.js";
import { createSuccessResponse } from "../config/server-config.js";
import { PlaywrightElementOperations } from "../features/core/elements.js";
import { INTERACTIVE_SELECTORS } from "../config/tool-config.js";
import { InteractiveElementAction } from './types.js';

// 既存のElementInfo型を拡張
interface ElementInfo {
    tag: string;
    text?: string;
    type?: string;
    name?: string;
    role?: string;
    disabled?: boolean;
    checked?: boolean;
    parentId?: string;
    value?: string;
    placeholder?: string;
    required?: boolean;
    readOnly?: boolean;
    min?: string;
    max?: string;
    step?: string;
    pattern?: string;
    multiple?: boolean;
    options?: Array<{ value: string; text: string; selected: boolean }>;
    position?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

const HUMAN_DELAY_MIN = 50;  // 最小遅延時間（ミリ秒）
const HUMAN_DELAY_MAX = 150; // 最大遅延時間（ミリ秒）

/**
 * 人間らしい遅延時間を生成
 */
function generateHumanDelay(): number {
    return Math.floor(Math.random() * (HUMAN_DELAY_MAX - HUMAN_DELAY_MIN + 1)) + HUMAN_DELAY_MIN;
}

/**
 * マウスを人間らしく移動
 */
async function moveMouseNaturally(page: Page, targetX: number, targetY: number): Promise<void> {
    const mouse = page.mouse;
    
    const viewport = page.viewportSize();
    if (!viewport) return;
    
    const startX = viewport.width / 2;
    const startY = viewport.height / 2;
    
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
        const progress = i / steps;
        
        const controlX = startX + (targetX - startX) * 0.5 + (Math.random() - 0.5) * 50;
        const controlY = startY + (targetY - startY) * 0.5 + (Math.random() - 0.5) * 50;
        
        const t = progress;
        const curveX = Math.pow(1 - t, 2) * startX + 2 * (1 - t) * t * controlX + Math.pow(t, 2) * targetX;
        const curveY = Math.pow(1 - t, 2) * startY + 2 * (1 - t) * t * controlY + Math.pow(t, 2) * targetY;
        
        const offsetX = (Math.random() - 0.5) * 3;
        const offsetY = (Math.random() - 0.5) * 3;
        
        await mouse.move(curveX + offsetX, curveY + offsetY);
        await page.waitForTimeout(generateHumanDelay());
    }
    
    await mouse.move(targetX, targetY);
}

/**
 * 指定された要素がインタラクティブかどうかを判定
 */
async function isInteractiveElement(element: ElementHandle<Element>): Promise<boolean> {
    return await element.evaluate((el: Element) => {
        // インタラクティブな要素の判定ロジック
        if (el.tagName === 'BUTTON' ||
            el.tagName === 'A' ||
            el.tagName === 'INPUT' ||
            el.tagName === 'TEXTAREA' ||
            el.tagName === 'SELECT') {
            return true;
        }

        const role = el.getAttribute('role');
        if (role && ['button', 'textbox', 'combobox', 'listbox', 'slider'].includes(role)) {
            return true;
        }

        if (el.hasAttribute('contenteditable')) {
            return true;
        }

        const classList = Array.from(el.classList);
        if (classList.some(className =>
            className.includes('ProseMirror') ||
            className.includes('editor') ||
            className.includes('rich-text')
        )) {
            return true;
        }

        const ariaLabel = el.getAttribute('aria-label');
        if (ariaLabel && (
            ariaLabel.includes('editor') ||
            ariaLabel.includes('input') ||
            ariaLabel.includes('chat') ||
            ariaLabel.includes('message')
        )) {
            return true;
        }

        return false;
    });
}

/**
 * 要素の詳細情報を取得
 */
async function getDetailedElementInfo(element: ElementHandle<Element>, page: Page): Promise<ElementInfo> {
    const elementOps = new PlaywrightElementOperations(page);
    const baseInfo = await elementOps.getInfo(element);

    // 基本的な要素情報を構築
    const elementInfo: ElementInfo = {
        tag: baseInfo.tag,
        role: baseInfo.attributes?.['role'],
        text: baseInfo.text,
        position: baseInfo.position
    };

    // 追加の属性情報を取得
    const details = await element.evaluate((el: HTMLElement) => {
        const details: { [key: string]: any } = {};
        
        if (el instanceof HTMLInputElement) {
            details.type = el.type;
            details.name = el.name;
            details.value = el.value;
            details.placeholder = el.placeholder;
            details.required = el.required;
            details.readOnly = el.readOnly;
            details.disabled = el.disabled;
            details.checked = el.checked;
            details.pattern = el.pattern;
            
            if (el.type === 'number' || el.type === 'range') {
                details.min = el.min;
                details.max = el.max;
                details.step = el.step;
            }
        } else if (el instanceof HTMLTextAreaElement) {
            details.value = el.value;
            details.placeholder = el.placeholder;
            details.required = el.required;
            details.readOnly = el.readOnly;
            details.disabled = el.disabled;
        } else if (el instanceof HTMLSelectElement) {
            details.multiple = el.multiple;
            details.disabled = el.disabled;
            details.required = el.required;
            details.options = Array.from(el.options).map(opt => ({
                value: opt.value,
                text: opt.text,
                selected: opt.selected
            }));
        }
        
        return details;
    });

    // 詳細情報をマージ
    return { ...elementInfo, ...details };
}

interface GetElementsOptions {
    contextId: string;
    maxDepth?: number;
    selector?: string;
}

interface GetElementInfoOptions {
    contextId: string;
    selector: string;
}

/**
 * 要素の階層構造を取得
 */
export const getElements = async ({ contextId, maxDepth = 3, selector }: GetElementsOptions) => {
    const context = await BrowserManager.getInstance().getContext(contextId);
    const page = context.pages()[0];
    
    const elementOps = new PlaywrightElementOperations(page);
    const result = await elementOps.getStructure({
        maxDepth,
        selector
    });

    if (!result.success) {
        throw new Error(result.error);
    }

    return createSuccessResponse(result.structure);
};

/**
 * 要素の詳細情報を取得
 */
export const getElementInfo = async ({ contextId, selector }: GetElementInfoOptions) => {
    const context = await BrowserManager.getInstance().getContext(contextId);
    const page = context.pages()[0];
    
    const element = await page.waitForSelector(selector);
    if (!element) {
        throw new Error(`Element not found: ${selector}`);
    }

    const elementInfo = await getDetailedElementInfo(element, page);
    return createSuccessResponse(JSON.stringify(elementInfo, null, 2));
};

/**
 * インタラクティブな要素を取得
 */
export const getInteractiveElements = async (contextId: string, includeDetails: boolean = true) => {
    const context = await BrowserManager.getInstance().getContext(contextId);
    const page = context.pages()[0];

    // すべての要素を取得
    const elements = await page.$$('*');
    const interactiveElements = [];

    // インタラクティブな要素をフィルタリング
    for (const element of elements) {
        if (await isInteractiveElement(element)) {
            const elementInfo = await getDetailedElementInfo(element, page);
            interactiveElements.push(elementInfo);
        }
    }

    // 要素情報を文字列に変換
    function elementToString(element: ElementInfo): string {
        if (includeDetails) {
            const attributes: string[] = [];
            if (element.role) attributes.push(`role="${element.role}"`);
            if (element.type) attributes.push(`type="${element.type}"`);
            if (element.name) attributes.push(`name="${element.name}"`);
            if (element.disabled) attributes.push('disabled');
            if (element.checked) attributes.push('checked');
            if (element.required) attributes.push('required');
            if (element.readOnly) attributes.push('readonly');
            if (element.multiple) attributes.push('multiple');
            if (element.placeholder) attributes.push(`placeholder="${element.placeholder}"`);
            if (element.value) attributes.push(`value="${element.value}"`);
            if (element.min) attributes.push(`min="${element.min}"`);
            if (element.max) attributes.push(`max="${element.max}"`);
            if (element.step) attributes.push(`step="${element.step}"`);
            if (element.pattern) attributes.push(`pattern="${element.pattern}"`);

            const attrStr = attributes.length > 0 ? ' ' + attributes.join(' ') : '';
            return `<${element.tag}${attrStr}>${element.text || ''}</${element.tag}>\n`;
        } else {
            const attributes: string[] = [];
            if (element.role) attributes.push(`@${element.role}`);
            if (element.type) attributes.push(`#${element.type}`);
            if (element.name) attributes.push(`$${element.name}`);
            if (element.disabled) attributes.push('!disabled');
            if (element.checked) attributes.push('*checked');
            if (element.required) attributes.push('!required');
            if (element.readOnly) attributes.push('!readonly');
            if (element.multiple) attributes.push('!multiple');
            
            const attrStr = attributes.length > 0 ? ` | ${attributes.join(' ')}` : '';
            const textStr = element.text ? ` | "${element.text}"` : '';
            
            return `${element.tag}${textStr}${attrStr}\n`;
        }
    }

    const output = interactiveElements.map(elementToString).join('');
    return createSuccessResponse(output);
};

/**
 * インタラクティブな要素を操作
 */
export const controlInteractiveElement = async (
    contextId: string,
    selector: string,
    action: InteractiveElementAction['action'],
    value?: string
) => {
    const context = await BrowserManager.getInstance().getContext(contextId);
    const page = context.pages()[0];

    const element = await page.waitForSelector(selector);
    if (!element) {
        throw new Error(`Element not found: ${selector}`);
    }

    const box = await element.boundingBox();
    if (!box) {
        throw new Error('Element is not visible or has no position');
    }

    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    await moveMouseNaturally(page, centerX, centerY);
    await page.waitForTimeout(generateHumanDelay());

    switch (action) {
        case 'click':
            await page.mouse.down();
            await page.waitForTimeout(generateHumanDelay());
            await page.mouse.up();
            break;

        case 'type':
            if (!value) throw new Error('Value is required for type action');
            await element.click();
            await page.waitForTimeout(generateHumanDelay());
            
            for (const char of value) {
                await page.keyboard.type(char);
                await page.waitForTimeout(Math.random() * 100);
            }
            break;

        case 'select':
            if (!value) throw new Error('Value is required for select action');
            await element.selectOption(value);
            break;

        case 'check':
        case 'uncheck':
            const isChecked = await element.evaluate((el: HTMLInputElement) => el.checked);
            if ((action === 'check' && !isChecked) || (action === 'uncheck' && isChecked)) {
                await element.click();
            }
            break;

        case 'toggle':
            await element.click();
            break;

        case 'focus':
            await element.focus();
            break;

        case 'blur':
            await element.evaluate(el => el.blur());
            break;

        case 'hover':
            await page.waitForTimeout(generateHumanDelay());
            break;

        default:
            throw new Error(`Unsupported action: ${action}`);
    }

    return createSuccessResponse(`Successfully performed ${action} on element`);
};