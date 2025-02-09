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
): string {
    const indent = '  '.repeat(depth);
    const tag = element.tagName.toLowerCase();
    
    // 属性文字列の生成
    const attributes: string[] = [];
    if (element.id) {
        attributes.push(`id="${element.id}"`);
    }
    if (element.classList.length > 0) {
        attributes.push(`class="${Array.from(element.classList).join(' ')}"`);
    }
    const role = element.getAttribute('role');
    if (role) {
        attributes.push(`role="${role}"`);
    }
    
    // タグと属性の文字列を生成
    const attrStr = attributes.length > 0 ? ' ' + attributes.join(' ') : '';
    let output = `${indent}<${tag}${attrStr}>`;
    
    if (depth > maxDepth) {
        return output + '...';
    }
    
    // 子要素の処理
    const childElements = Array.from(element.children);
    if (childElements.length > 0) {
        output += '\n';
        for (const child of childElements) {
            if (isSignificantElement(child, significantTags) || depth < maxDepth) {
                output += getStructuredInfo(child, depth + 1, maxDepth, significantTags) + '\n';
            } else {
                output += `${indent}  ...`;
            }
        }
        output += indent;
    } else {
        const text = element.textContent?.trim();
        if (text) {
            output += text.length > 50 ? text.substring(0, 47) + '...' : text;
        }
    }
    
    return output + `</${tag}>`;
}