import { JSDOM } from 'jsdom';

/**
 * インタラクティブ要素の種類
 */
export enum InteractiveElementType {
    Button = 'button',
    TextArea = 'textarea',
    RadioButton = 'radio',
    Checkbox = 'checkbox',
    Slider = 'range',
    Select = 'select',
    TextInput = 'text',
    SubmitButton = 'submit'
}

/**
 * 要素の位置と寸法情報
 */
export interface ElementBounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * インタラクティブ要素の情報
 */
export interface InteractiveElement {
    type: InteractiveElementType;
    id?: string;
    name?: string;
    value?: string;
    label?: string;
    bounds: ElementBounds;
    isVisible: boolean;
    isEnabled: boolean;
}

/**
 * インタラクティブ要素を検出して位置情報を取得するクラス
 */
export class InteractiveElementsProcessor {
    private readonly dom: JSDOM;

    constructor(html: string) {
        this.dom = new JSDOM(html, {
            runScripts: "outside-only",
            pretendToBeVisual: true
        });
    }

    /**
     * 要素の表示状態を確認
     */
    private isElementVisible(element: Element): boolean {
        const style = this.dom.window.getComputedStyle(element);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               style.opacity !== '0';
    }

    /**
     * 要素の有効/無効状態を確認
     */
    private isElementEnabled(element: Element): boolean {
        return !element.hasAttribute('disabled');
    }

    /**
     * 要素のラベルを取得
     */
    private getElementLabel(element: Element): string | undefined {
        // id属性に関連付けられたlabel要素を検索
        const id = element.getAttribute('id');
        if (id) {
            const label = this.dom.window.document.querySelector(`label[for="${id}"]`);
            if (label) {
                return label.textContent?.trim();
            }
        }

        // 親要素がlabelの場合
        let parent = element.parentElement;
        while (parent) {
            if (parent.tagName === 'LABEL') {
                return parent.textContent?.trim();
            }
            parent = parent.parentElement;
        }

        // aria-label属性を確認
        return element.getAttribute('aria-label')?.trim();
    }

    /**
     * 要素の位置と寸法を取得
     */
    private getElementBounds(element: Element): ElementBounds {
        const rect = (element as HTMLElement).getBoundingClientRect();
        return {
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height
        };
    }

    /**
     * インタラクティブ要素の種類を判定
     */
    private getElementType(element: Element): InteractiveElementType | null {
        const tagName = element.tagName.toLowerCase();
        const type = element.getAttribute('type')?.toLowerCase();

        if (tagName === 'button' || (tagName === 'input' && type === 'button')) {
            return InteractiveElementType.Button;
        }
        if (tagName === 'textarea') {
            return InteractiveElementType.TextArea;
        }
        if (tagName === 'input') {
            switch (type) {
                case 'radio':
                    return InteractiveElementType.RadioButton;
                case 'checkbox':
                    return InteractiveElementType.Checkbox;
                case 'range':
                    return InteractiveElementType.Slider;
                case 'text':
                case 'email':
                case 'password':
                    return InteractiveElementType.TextInput;
                case 'submit':
                    return InteractiveElementType.SubmitButton;
            }
        }
        if (tagName === 'select') {
            return InteractiveElementType.Select;
        }
        return null;
    }

    /**
     * インタラクティブ要素の情報を収集
     */
    public getInteractiveElements(): InteractiveElement[] {
        const elements = this.dom.window.document.querySelectorAll(
            'button, input, textarea, select, [role="button"]'
        );
        
        const interactiveElements: InteractiveElement[] = [];

        elements.forEach(element => {
            const type = this.getElementType(element);
            if (!type) return;

            const isVisible = this.isElementVisible(element);
            if (!isVisible) return;

            interactiveElements.push({
                type,
                id: element.getAttribute('id') || undefined,
                name: element.getAttribute('name') || undefined,
                value: element.getAttribute('value') || undefined,
                label: this.getElementLabel(element),
                bounds: this.getElementBounds(element),
                isVisible: true,
                isEnabled: this.isElementEnabled(element)
            });
        });

        return interactiveElements;
    }
}