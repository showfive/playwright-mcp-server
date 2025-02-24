import type { ToolHandler } from "./types.js";
import { echoHandler, toolDefinition as echoDefinition } from "./Echo.js";
import { navigateHandler, toolDefinition as navigateDefinition } from "./Navigate.js";
import { getAllContentHandler, toolDefinition as getContentDefinition } from "./GetAllContent.js";
import { getVisibleContentHandler, toolDefinition as getVisibleContentDefinition } from "./GetVisibleContent.js";
import { getInteractiveElementsHandler, toolDefinition as getInteractiveElementsDefinition } from "./GetInteractiveElements.js";
import {
  moveMouseHandler,
  mouseClickHandler,
  mouseWheelHandler,
  dragAndDropHandler,
  moveMouseDefinition,
  mouseClickDefinition,
  mouseWheelDefinition,
  dragAndDropDefinition
} from "./MouseActions.js";

// ツール定義とハンドラーのマッピング
export const tools = {
  echo: echoDefinition,
  navigate: navigateDefinition,
  get_all_content: getContentDefinition,
  get_visible_content: getVisibleContentDefinition,
  get_interactive_elements: getInteractiveElementsDefinition,
  move_mouse: moveMouseDefinition,
  mouse_click: mouseClickDefinition,
  mouse_wheel: mouseWheelDefinition,
  drag_and_drop: dragAndDropDefinition
} as const;

export const toolHandlers: Record<keyof typeof tools, ToolHandler> = {
  echo: echoHandler,
  navigate: navigateHandler,
  get_all_content: getAllContentHandler,
  get_visible_content: getVisibleContentHandler,
  get_interactive_elements: getInteractiveElementsHandler,
  move_mouse: moveMouseHandler,
  mouse_click: mouseClickHandler,
  mouse_wheel: mouseWheelHandler,
  drag_and_drop: dragAndDropHandler
};