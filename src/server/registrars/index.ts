import { taskDomainRegistrar } from "./tasks.js";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DomainRegistrar } from "./types.js";

export const DOMAIN_REGISTRARS: readonly DomainRegistrar[] = [
  taskDomainRegistrar,
];

export function registerDomainRegistrars(server: McpServer): void {
  for (const registrar of DOMAIN_REGISTRARS) {
    registrar.register(server);
  }
}
