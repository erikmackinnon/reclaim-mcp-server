import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export type DomainRegistrar = {
  domain: string;
  register(server: McpServer): void;
};
