import type { ToolAnnotations } from "../../server/tool-metadata.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export type RegisteredToolDefinition = {
  title: string;
  description: string;
  inputSchema: unknown;
  annotations: ToolAnnotations;
};

export type RegisteredTool = {
  name: string;
  definition: RegisteredToolDefinition;
  handler: (params: Record<string, unknown>) => unknown;
};

export type RegisteredResource = {
  name: string;
  uriTemplate: string;
  metadata: Record<string, unknown> | undefined;
  handler: (
    uri: URL,
    params: Record<string, string | string[]>,
    extra: unknown,
  ) => unknown;
};

export class McpServerRegistrationHarness {
  public readonly tools: RegisteredTool[] = [];
  public readonly resources: RegisteredResource[] = [];

  registerTool(
    name: string,
    definition: RegisteredToolDefinition,
    handler: (params: Record<string, unknown>) => unknown,
  ): void {
    this.tools.push({ name, definition, handler });
  }

  registerResource(
    name: string,
    uriTemplate: string,
    metadata: Record<string, unknown> | undefined,
    handler: (
      uri: URL,
      params: Record<string, string | string[]>,
      extra: unknown,
    ) => unknown,
  ): void {
    this.resources.push({ name, uriTemplate, metadata, handler });
  }
}

export function createMcpServerHarness(): {
  harness: McpServerRegistrationHarness;
  server: McpServer;
} {
  const harness = new McpServerRegistrationHarness();
  return {
    harness,
    server: harness as unknown as McpServer,
  };
}
