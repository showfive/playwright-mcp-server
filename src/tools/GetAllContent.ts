import { McpError, ErrorCode, type CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import type { ToolHandler, ToolResponse } from "./types.js";
import { type BrowserContext } from "playwright";
import { HTMLParser } from "../utils/HTMLparser.js";

let browserContext: BrowserContext | null = null;

export const toolDefinition = {
  name: "get_all_content",
  description: "現在開いているページのコンテンツを取得し、HTML構造を保持した形式で返します",
  inputSchema: {
    type: "object",
    properties: {},
    required: []
  }
} as const;

/**
 * アクティブなページを取得
 */
async function getActivePage(context: BrowserContext) {
  const pages = await context.pages();
  if (pages.length === 0) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      "No pages found. Please navigate to a page first."
    );
  }
  return pages[pages.length - 1];
}

/**
 * ページの基本情報を取得
 */
async function getPageInfo(page: NonNullable<Awaited<ReturnType<typeof getActivePage>>>) {
  try {
    const [content, title, description] = await Promise.all([
      page.content(),
      page.title(),
      page.$eval(
        'meta[name="description"]',
        (el) => el.getAttribute('content') || ''
      ).catch(() => '')
    ]);

    return { content, title, description };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to get page information: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export const getAllContentHandler: ToolHandler = async (request: CallToolRequest): Promise<ToolResponse> => {
  if (!browserContext) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      "No active browser context. Please navigate to a page first."
    );
  }

  try {
    // アクティブなページを取得
    const page = await getActivePage(browserContext);
    
    // ページの基本情報を取得
    const { content, title, description } = await getPageInfo(page);

    // HTMLを解析してコンテンツを取得
    const parser = new HTMLParser(content);
    const { content: parsedContent } = parser.parse();

    // タイトルと説明を含めた最終的なコンテンツを構築
    const finalContent = [
      `# ${title}`,
      description ? `\n## Description\n${description}` : '',
      '\n## Content\n',
      parsedContent
    ].filter(Boolean).join('\n');

    return {
      content: [
        {
          type: "text",
          text: finalContent
        }
      ]
    };
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to get page content: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

// ブラウザコンテキストの設定
export const setBrowserContext = (context: BrowserContext) => {
  browserContext = context;
};