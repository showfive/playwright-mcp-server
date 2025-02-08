import { Page, ElementHandle } from 'playwright';

/**
 * 要素の基本情報
 */
export interface ElementInfo {
    tag: string;
    id?: string;
    classes: string[];
    attributes: { [key: string]: string };
    text?: string;
    isVisible: boolean;
    position?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

/**
 * ページ構造の要素情報
 */
export interface StructuredElementInfo {
    tag: string;
    id?: string;
    classes: string[];
    role?: string;
    text?: string;
    children?: (StructuredElementInfo | string)[];  // stringは"..."などの省略表現用
    isVisible: boolean;
}

/**
 * 要素のクエリ条件
 */
export interface QueryOptions {
    selector?: string;
    text?: string;
    role?: AriaRole;
    name?: string;
    visible?: boolean;
    maxDepth?: number;  // 探索する最大の深さ
}

/**
 * 要素の監視オプション
 */
export interface ObserverOptions {
    attributes?: boolean;
    childList?: boolean;
    subtree?: boolean;
    attributeFilter?: string[];
}

/**
 * 要素の変更イベント
 */
export interface ElementChangeEvent {
    type: 'added' | 'removed' | 'modified';
    target: ElementInfo;
    changes?: {
        attribute?: string;
        oldValue?: string;
        newValue?: string;
    };
}

/**
 * 要素の操作結果
 */
export interface ElementResult {
    success: boolean;
    error?: string;
    info?: ElementInfo;
    elements?: ElementInfo[];
    structure?: StructuredElementInfo;  // ページ構造情報用
}

/**
 * 要素の操作インターフェース
 */
export interface ElementOperations {
    /**
     * 要素の情報を取得
     */
    getInfo(element: ElementHandle<Element>): Promise<ElementInfo>;

    /**
     * 指定した条件に一致する要素を検索
     */
    query(options: QueryOptions): Promise<ElementResult>;

    /**
     * 指定した条件に一致するすべての要素を検索
     */
    queryAll(options: QueryOptions): Promise<ElementResult>;

    /**
     * ページ構造を取得
     */
    getStructure(options?: { maxDepth?: number }): Promise<ElementResult>;

    /**
     * 要素の変更を監視
     */
    observe(
        options: ObserverOptions,
        callback: (event: ElementChangeEvent) => void
    ): Promise<() => void>;
}

/**
 * 主要なHTML要素タグ
 */
export const SIGNIFICANT_TAGS = [
    'main',
    'nav',
    'header',
    'footer',
    'article',
    'section',
    'aside',
    'h1',
    'h2',
    'h3',
    'form',
    'button',
    'input',
    'select',
    'textarea',
    'a',
    'img',
    'video',
    'audio',
    'table',
    'dialog'
] as const;

/**
 * エラー型定義
 */
export class ElementOperationError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly details?: any
    ) {
        super(message);
        this.name = 'ElementOperationError';
    }
}

/**
 * エラーコード定義
 */
export const ErrorCodes = {
    ELEMENT_NOT_FOUND: 'ELEMENT_NOT_FOUND',
    ELEMENT_NOT_VISIBLE: 'ELEMENT_NOT_VISIBLE',
    ELEMENT_NOT_INTERACTIVE: 'ELEMENT_NOT_INTERACTIVE',
    OPERATION_TIMEOUT: 'OPERATION_TIMEOUT',
    INVALID_SELECTOR: 'INVALID_SELECTOR',
    OBSERVER_ERROR: 'OBSERVER_ERROR'
} as const;

/**
 * サポートされるARIAロール
 */
export type AriaRole =
    | 'alert'
    | 'alertdialog'
    | 'application'
    | 'article'
    | 'banner'
    | 'button'
    | 'cell'
    | 'checkbox'
    | 'columnheader'
    | 'combobox'
    | 'complementary'
    | 'contentinfo'
    | 'definition'
    | 'dialog'
    | 'directory'
    | 'document'
    | 'feed'
    | 'figure'
    | 'form'
    | 'grid'
    | 'gridcell'
    | 'group'
    | 'heading'
    | 'img'
    | 'link'
    | 'list'
    | 'listbox'
    | 'listitem'
    | 'log'
    | 'main'
    | 'marquee'
    | 'math'
    | 'menu'
    | 'menubar'
    | 'menuitem'
    | 'menuitemcheckbox'
    | 'menuitemradio'
    | 'navigation'
    | 'none'
    | 'note'
    | 'option'
    | 'presentation'
    | 'progressbar'
    | 'radio'
    | 'radiogroup'
    | 'region'
    | 'row'
    | 'rowgroup'
    | 'rowheader'
    | 'scrollbar'
    | 'search'
    | 'searchbox'
    | 'separator'
    | 'slider'
    | 'spinbutton'
    | 'status'
    | 'switch'
    | 'tab'
    | 'table'
    | 'tablist'
    | 'tabpanel'
    | 'textbox'
    | 'timer'
    | 'toolbar'
    | 'tooltip'
    | 'tree'
    | 'treegrid'
    | 'treeitem';