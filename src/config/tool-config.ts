import { z } from "zod";

/**
 * ツールのスキーマ定義
 */
export const toolSchemas = {
    create_browser: z.object({}),
    use_keyboard: z.object({
        contextId: z.string(),
        selector: z.string(),
        text: z.string(),
        submit: z.boolean().optional()
    }),
    navigate: z.object({
        contextId: z.string(),
        url: z.string().url()
    }),
    get_elements: z.object({
        contextId: z.string(),
        maxDepth: z.number().optional(),
        selector: z.string().optional()
    }),
    get_element_info: z.object({
        contextId: z.string(),
        selector: z.string()
    }),
    get_page_content: z.object({
        contextId: z.string()
    }),
    get_interactive_elements: z.object({
        contextId: z.string(),
        includeDetails: z.boolean().optional()
    }),
    control_interactive_elements: z.object({
        contextId: z.string(),
        selector: z.string(),
        action: z.enum([
            'click',
            'type',
            'select',
            'check',
            'uncheck',
            'toggle',
            'focus',
            'blur',
            'hover'
        ]),
        value: z.string().optional()
    })
} as const;

/**
 * ツールの説明定義
 */
export const toolDescriptions = {
    create_browser: "Create a new browser context with a viewable Chrome instance.\nThe context is initialized with a 1280x720 viewport and a modern Chrome user agent.\nReturns a unique contextId that can be used for subsequent operations.\nThe home page is set to `https://www.bing.com` and does not require initialization with the navigate operation.",
    use_keyboard: "Simulates human-like keyboard input for the specified element. Features natural typing with random delays, occasional typos and corrections. Submits input either through button click or Enter key, prioritizing visible submit buttons. Includes mouse movements and proper element focusing for more natural interaction.",
    navigate: "Opens a new page in the specified browser context and navigates to the specified URL.\nA valid contextId and a properly formatted URL are required.\nThe page is added to the context's page pool for future operations.",
    get_elements: "Parse the current page's DOM structure and return a hierarchical representation of the elements. By default, it returns the structure up to a depth of 3 from the topmost level. Omitted content is represented as `...`.\nThe maxDepth option allows you to specify the depth limit.\nThe selector option enables you to retrieve the structure of elements below the specified selector.\n※ It is strongly recommended to first check the overall structure without specifying any options.",
    get_element_info: "Retrieves comprehensive information about a specific DOM element identified by a given selector. If the element is not found in the DOM, an explanatory error is thrown.",
    get_page_content: "Extracts the content of the current page and formats it into a structured markdown format. Strings with embedded links are converted to the format `[display text](link)`. In addition, images and videos on the page are formatted as `! [image](link)`.",
    get_interactive_elements: "Provides a comprehensive scan of all interactive elements on the page, including form inputs, buttons, media controls, and other UI components that users can interact with. Detects a wide range of elements such as text inputs, textareas, select dropdowns, radio buttons, checkboxes, sliders, date/time pickers, and more. Returns detailed information about each element's type, state, and capabilities, making it ideal for form automation and UI testing. The includeDetails option provides additional information about element states, validation, and relationships.",
    control_interactive_elements: "Simulates natural human-like interactions with UI elements. Implements realistic mouse movements with variable speeds and slight path variations when approaching targets. Provides a range of actions including clicking, typing, selecting options, toggling checkboxes, and hovering. Each action includes appropriate delays and motion patterns to mimic human behavior. For example, clicking involves moving the cursor naturally to the target, briefly hovering, then clicking with realistic timing. Supports various input types and handles complex interactions like drag-and-drop or range slider adjustments."
} as const;

export type ToolName = keyof typeof toolSchemas;

/**
 * 共通のセレクター定義
 */
export const INTERACTIVE_SELECTORS = [
    // ボタン系
    'button',
    'a',
    'input[type="button"]',
    'input[type="submit"]',
    '[role="button"]',
    '[onclick]',
    '[class*="btn"]',
    '[class*="button"]',
    
    // フォーム要素
    'input:not([type="hidden"])',  // すべての可視input要素
    'textarea',
    'select',
    
    // メディア要素
    'video',
    'audio',
    '[role="slider"]',
    'input[type="range"]',
    
    // 選択要素
    'input[type="radio"]',
    'input[type="checkbox"]',
    '[role="radio"]',
    '[role="checkbox"]',
    '[role="option"]',
    '[role="switch"]',
    
    // 拡張入力要素
    'input[type="date"]',
    'input[type="time"]',
    'input[type="datetime-local"]',
    'input[type="color"]',
    'input[type="file"]',
    
    // リスト要素
    'select[multiple]',
    '[role="listbox"]',
    '[role="combobox"]',
    
    // その他の操作可能な要素
    '[contenteditable="true"]',
    '[tabindex]:not([tabindex="-1"])',
    '[draggable="true"]',
    '[role="menuitem"]',
    '[role="tab"]',

    // リッチテキストエディタ要素
    '.ProseMirror',
    '[class*="editor"]',
    '[class*="rich-text"]',
    '[role="textbox"]',
    '[role="application"][contenteditable]',
    '[aria-label*="editor"]',
    '[aria-label*="input"]',
    '[data-gramm="false"]',  // Grammarly等のエディタ検出用
    '[contenteditable][class*="ProseMirror"]',  // ProseMirror具体的なパターン
    '[role="textbox"][aria-label*="chat"]',     // チャット固有のテキストボックス
    '[role="textbox"][aria-label*="message"]',  // メッセージ入力用のテキストボックス
    '[contenteditable].prose',                  // 一般的なリッチテキスト
    '#prompt-textarea',                         // ChatGPT固有の要素
    
    // AIチャット関連の要素
    '[data-message-author-role]',  // ChatGPT等のメッセージ入力欄
    '[aria-label*="chat"]',
    '[aria-label*="message"]',
    '[placeholder*="message"]',
    '[placeholder*="Send"]'
] as const;
