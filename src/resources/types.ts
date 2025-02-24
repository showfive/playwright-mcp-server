import type { ReadResourceRequest } from "@modelcontextprotocol/sdk/types.js";

export interface ResourceContent {
  uri: string;
  mimeType: string;
  text: string;
}

export interface ResourceResponse {
  contents: ResourceContent[];
  [key: string]: unknown;
}

export interface ResourceDefinition {
  uri: string;
  name: string;
  description?: string;
  mimeType: string;
}

export type ResourceHandler = (request: ReadResourceRequest) => Promise<ResourceResponse>;