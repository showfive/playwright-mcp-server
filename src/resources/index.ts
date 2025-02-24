import type { ResourceDefinition, ResourceHandler } from "./types.js";
import {
  playwrightStatusHandler,
  resourceDefinition as playwrightStatusDefinition
} from "./playwrightStatus.js";

// リソース定義のマッピング
export const resources: Record<string, ResourceDefinition> = {
  "playwright://status": playwrightStatusDefinition
};

// リソースハンドラーのマッピング
export const resourceHandlers: Record<string, ResourceHandler> = {
  "playwright://status": playwrightStatusHandler
};