import { McpError, ErrorCode, type CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import type { ToolHandler, ToolResponse } from "./types.js";
import type { BrowserContext, Page } from "playwright";

let browserContext: BrowserContext | null = null;
let activePage: Page | null = null;

// ブラウザコンテキストを設定する関数
export const setBrowserContext = async (context: BrowserContext) => {
  browserContext = context;
  // 最初のページを取得
  const pages = await context.pages();
  if (pages.length > 0) {
    activePage = pages[0];
  }
};

// マウス移動ツールの定義
export const moveMouseDefinition = {
  name: "move_mouse",
  description: "指定された座標にマウスカーソルを移動します",
  inputSchema: {
    type: "object",
    properties: {
      x: {
        type: "number",
        description: "X座標"
      },
      y: {
        type: "number",
        description: "Y座標"
      }
    },
    required: ["x", "y"]
  }
} as const;

// マウスクリックツールの定義
export const mouseClickDefinition = {
  name: "mouse_click",
  description: "指定された座標でマウスクリックを実行します",
  inputSchema: {
    type: "object",
    properties: {
      x: {
        type: "number",
        description: "X座標"
      },
      y: {
        type: "number",
        description: "Y座標"
      },
      button: {
        type: "string",
        description: "マウスボタン（'left', 'right', 'middle'）",
        enum: ["left", "right", "middle"]
      },
      clickCount: {
        type: "number",
        description: "クリック回数（デフォルト: 1）"
      }
    },
    required: ["x", "y"]
  }
} as const;

// マウスホイールツールの定義
export const mouseWheelDefinition = {
  name: "mouse_wheel",
  description: "マウスホイールのスクロールを実行します",
  inputSchema: {
    type: "object",
    properties: {
      deltaX: {
        type: "number",
        description: "水平方向のスクロール量（ピクセル）"
      },
      deltaY: {
        type: "number",
        description: "垂直方向のスクロール量（ピクセル）"
      }
    },
    required: ["deltaY"]
  }
} as const;

// ドラッグアンドドロップツールの定義
export const dragAndDropDefinition = {
  name: "drag_and_drop",
  description: "ドラッグアンドドロップ操作を実行します",
  inputSchema: {
    type: "object",
    properties: {
      sourceX: {
        type: "number",
        description: "ドラッグ開始位置のX座標"
      },
      sourceY: {
        type: "number",
        description: "ドラッグ開始位置のY座標"
      },
      targetX: {
        type: "number",
        description: "ドロップ位置のX座標"
      },
      targetY: {
        type: "number",
        description: "ドロップ位置のY座標"
      }
    },
    required: ["sourceX", "sourceY", "targetX", "targetY"]
  }
} as const;

// マウス移動ハンドラー
export const moveMouseHandler: ToolHandler = async (request: CallToolRequest): Promise<ToolResponse> => {
  if (!activePage) {
    throw new McpError(
      ErrorCode.InternalError,
      "No active browser page"
    );
  }

  const { x, y } = request.params.arguments as {
    x: number;
    y: number;
  };

  try {
    await activePage.mouse.move(x, y);
    return {
      content: [
        {
          type: "text",
          text: `Mouse moved to (${x}, ${y})`
        }
      ]
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to move mouse: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

// マウスクリックハンドラー
export const mouseClickHandler: ToolHandler = async (request: CallToolRequest): Promise<ToolResponse> => {
  if (!activePage) {
    throw new McpError(
      ErrorCode.InternalError,
      "No active browser page"
    );
  }

  const { x, y, button = "left", clickCount = 1 } = request.params.arguments as {
    x: number;
    y: number;
    button?: "left" | "right" | "middle";
    clickCount?: number;
  };

  try {
    await activePage.mouse.click(x, y, { button, clickCount });
    return {
      content: [
        {
          type: "text",
          text: `Clicked ${button} button ${clickCount} time(s) at (${x}, ${y})`
        }
      ]
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to click: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

// マウスホイールハンドラー
export const mouseWheelHandler: ToolHandler = async (request: CallToolRequest): Promise<ToolResponse> => {
  if (!activePage) {
    throw new McpError(
      ErrorCode.InternalError,
      "No active browser page"
    );
  }

  const { deltaX = 0, deltaY } = request.params.arguments as {
    deltaX?: number;
    deltaY: number;
  };

  try {
    await activePage.mouse.wheel(deltaX, deltaY);
    return {
      content: [
        {
          type: "text",
          text: `Scrolled by deltaX: ${deltaX}, deltaY: ${deltaY}`
        }
      ]
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to scroll: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

// ドラッグアンドドロップハンドラー
export const dragAndDropHandler: ToolHandler = async (request: CallToolRequest): Promise<ToolResponse> => {
  if (!activePage) {
    throw new McpError(
      ErrorCode.InternalError,
      "No active browser page"
    );
  }

  const { sourceX, sourceY, targetX, targetY } = request.params.arguments as {
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
  };

  try {
    // ドラッグ開始位置に移動
    await activePage.mouse.move(sourceX, sourceY);
    // マウスボタンを押下
    await activePage.mouse.down();
    // ドロップ位置に移動
    await activePage.mouse.move(targetX, targetY);
    // マウスボタンを離す
    await activePage.mouse.up();

    return {
      content: [
        {
          type: "text",
          text: `Dragged from (${sourceX}, ${sourceY}) to (${targetX}, ${targetY})`
        }
      ]
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to drag and drop: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};