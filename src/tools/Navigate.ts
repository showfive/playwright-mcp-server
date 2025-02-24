import { McpError, ErrorCode, type CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import type { ToolHandler, ToolResponse } from "./types.js";
import { chromium, type BrowserContext, type Browser } from "playwright";
import { setBrowserContext as setAllContentBrowserContext } from "./GetAllContent.js";
import { setBrowserContext as setVisibleContentBrowserContext } from "./GetVisibleContent.js";
import { setBrowserContext as setMouseActionsBrowserContext } from "./MouseActions.js";
import { setBrowserContext as setInteractiveElementsBrowserContext } from "./GetInteractiveElements.js";

let browser: Browser | null = null;
let browserContext: BrowserContext | null = null;

export const toolDefinition = {
  name: "navigate",
  description: "指定されたURLにブラウザでアクセスします",
  inputSchema: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "アクセスするURL"
      }
    },
    required: ["url"]
  }
} as const;

export const navigateHandler: ToolHandler = async (request: CallToolRequest): Promise<ToolResponse> => {
  const { url } = request.params.arguments as {
    url: string;
  };

  // URLの形式を検証
  try {
    new URL(url);
  } catch {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Invalid URL format: ${url}`
    );
  }

  try {
    // ブラウザが存在しない場合は新規作成
    if (!browser) {
      browser = await chromium.launch({
        headless: true
      });
      const context = await browser.newContext();
      browserContext = context;
      // コンテキストの設定を行う（awaitで確実に完了を待つ）
      await Promise.all([
        setAllContentBrowserContext(context),
        setVisibleContentBrowserContext(context),
        setMouseActionsBrowserContext(context),
        setInteractiveElementsBrowserContext(context)
      ]);
    }

    if (!browserContext) {
      throw new McpError(
        ErrorCode.InternalError,
        "Failed to create browser context"
      );
    }

    // 既存のページをすべて閉じる
    const pages = await browserContext.pages();
    await Promise.all(pages.map(page => page.close()));

    // 新しいページを作成
    const page = await browserContext.newPage();

    // 指定されたURLに移動
    await page.goto(url);

    // 新しいページでブラウザコンテキストを再設定
    await Promise.all([
      setAllContentBrowserContext(browserContext),
      setVisibleContentBrowserContext(browserContext),
      setMouseActionsBrowserContext(browserContext),
      setInteractiveElementsBrowserContext(browserContext)
    ]);

    return {
      content: [
        {
          type: "text",
          text: "Successful navigation"
        }
      ]
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Navigation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};