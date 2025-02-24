import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import type { ResourceDefinition, ResourceHandler } from "./types.js";

export const resourceDefinition: ResourceDefinition = {
  uri: "playwright://status",
  name: "Playwright Status",
  description: "現在のPlaywright実行環境の状態を提供します",
  mimeType: "application/json"
};

export const playwrightStatusHandler: ResourceHandler = async (request) => {
  if (request.params.uri !== resourceDefinition.uri) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      `Unknown resource: ${request.params.uri}`
    );
  }

  return {
    contents: [
      {
        uri: request.params.uri,
        mimeType: "application/json",
        text: JSON.stringify({
          status: "ready",
          availableBrowsers: ["chromium"],
          timestamp: new Date().toISOString()
        })
      }
    ]
  };
};