/**
 * DOM Node の定数
 */
export const Node = {
    ELEMENT_NODE: 1,
    ATTRIBUTE_NODE: 2,
    TEXT_NODE: 3,
    CDATA_SECTION_NODE: 4,
    ENTITY_REFERENCE_NODE: 5,
    ENTITY_NODE: 6,
    PROCESSING_INSTRUCTION_NODE: 7,
    COMMENT_NODE: 8,
    DOCUMENT_NODE: 9,
    DOCUMENT_TYPE_NODE: 10,
    DOCUMENT_FRAGMENT_NODE: 11,
    NOTATION_NODE: 12
} as const;

/**
 * DOM NodeFilter の定数
 */
export const NodeFilter = {
    // フィルタータイプ
    FILTER_ACCEPT: 1,
    FILTER_REJECT: 2,
    FILTER_SKIP: 3,
    // Show フラグ
    SHOW_ALL: -1,
    SHOW_ELEMENT: 1,
    SHOW_ATTRIBUTE: 2,
    SHOW_TEXT: 4,
    SHOW_CDATA_SECTION: 8,
    SHOW_ENTITY_REFERENCE: 16,
    SHOW_ENTITY: 32,
    SHOW_PROCESSING_INSTRUCTION: 64,
    SHOW_COMMENT: 128,
    SHOW_DOCUMENT: 256,
    SHOW_DOCUMENT_TYPE: 512,
    SHOW_DOCUMENT_FRAGMENT: 1024,
    SHOW_NOTATION: 2048
} as const;

/**
 * スキップすべきタグ名のリスト
 */
export const SKIP_TAGS = ['SCRIPT', 'STYLE', 'NOSCRIPT'] as const;

/**
 * メインコンテンツを探すためのセレクター
 */
export const MAIN_CONTENT_SELECTORS = [
    'article',
    'main',
    '[role="main"]',
    '#main-content',
    '.main-content',
    '#content',
    '.content'
] as const;

/**
 * ブロック要素のタグ名
 */
export const BLOCK_ELEMENTS = ['P', 'DIV', 'SECTION', 'ARTICLE'] as const;

/**
 * 見出し要素のタグ名
 */
export const HEADING_ELEMENTS = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'] as const;