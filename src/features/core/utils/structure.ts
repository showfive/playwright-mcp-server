import { StructuredElementInfo } from '../types.js';
import { checkVisibility } from './visibility.js';

/**
 * 構造解析に関するユーティリティ
 */
export function isSignificantElement(
    el: Element,
    significantTags: ReadonlyArray<string>
): boolean {
    const tagName = el.tagName.toLowerCase();
    const isSignificantTag = significantTags.includes(tagName);
    const hasId = !!el.id;
    const hasRole = !!el.getAttribute('role');
    const hasClasses = el.classList.length > 0;
    
    return isSignificantTag || hasId || hasRole || hasClasses;
}

export function getStructuredInfo(
    element: Element,
    depth: number,
    maxDepth: number,
    significantTags: ReadonlyArray<string>
): StructuredElementInfo {
    const style = getComputedStyle(element);
    const isVisible = checkVisibility(style);
    const tag = element.tagName.toLowerCase();
    const baseInfo: StructuredElementInfo = {
        tag,
        id: element.id || undefined,
        classes: Array.from(element.classList),
        role: element.getAttribute('role') || undefined,
        text: element.textContent?.trim(),
        isVisible
    };

    if (depth > maxDepth) {
        return baseInfo;
    }

    const children: (StructuredElementInfo | string)[] = [];
    let hasSignificantChildren = false;

    Array.from(element.children).forEach(child => {
        if (isSignificantElement(child, significantTags)) {
            hasSignificantChildren = true;
            const childInfo = getStructuredInfo(child, depth + 1, maxDepth, significantTags);
            children.push(childInfo);
        } else if (depth < maxDepth) {
            // 重要でない要素でも、深さが制限内なら子要素をチェック
            const childInfo = getStructuredInfo(child, depth + 1, maxDepth, significantTags);
            if (childInfo.children && childInfo.children.length > 0) {
                children.push(childInfo);
                hasSignificantChildren = true;
            }
        }
    });

    if (children.length > 0) {
        baseInfo.children = children;
    } else if (depth > 1) {
        baseInfo.children = ["..."];
    }

    return baseInfo;
}