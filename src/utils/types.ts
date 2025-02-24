/**
 * HTML要素の処理に関する型定義
 */
export interface ElementProcessor {
    processElement(element: Element): string;
}

/**
 * HTML解析の結果を表す型
 */
export interface ParsedHTML {
    title: string;
    description: string;
    content: string;
}

/**
 * ビューポートの寸法を表す型
 */
export interface ViewportDimensions {
    /**
     * スクロール位置（ピクセル）
     */
    top: number;
    /**
     * 横方向のスクロール位置（ピクセル）
     */
    left: number;
    /**
     * ビューポートの幅（ピクセル）
     */
    width: number;
    /**
     * ビューポートの高さ（ピクセル）
     */
    height: number;
}

/**
 * 可視コンテンツのオプション
 */
export interface VisibleContentOptions {
    /**
     * ビューポートの設定
     */
    viewport: ViewportDimensions;
    /**
     * 要素の最小可視率（%）
     */
    minVisiblePercentage?: number;
}

/**
 * 可視コンテンツの結果
 */
export interface VisibleContentResult {
    content: string;
    hasAbove: boolean;
    hasBelow: boolean;
}