/**
 * 要素の可視性チェックに関するユーティリティ
 */
export function checkVisibility(style: CSSStyleDeclaration): boolean {
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0';
}

export function isInViewport(rect: DOMRect, windowSize: { width: number; height: number }): boolean {
    return rect.top >= 0 &&
           rect.left >= 0 &&
           rect.bottom <= windowSize.height &&
           rect.right <= windowSize.width;
}