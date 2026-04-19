import { curatedFallbackRegistrar } from "./curatedFallback.js";
import { habitDomainRegistrar } from "./habits.js";
import { smartMeetingDomainRegistrar } from "./smartMeetings.js";
import { taskDomainRegistrar } from "./tasks.js";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DomainRegistrar } from "./types.js";

export const DOMAIN_REGISTRARS: readonly DomainRegistrar[] = [
  taskDomainRegistrar,
  habitDomainRegistrar,
  smartMeetingDomainRegistrar,
  curatedFallbackRegistrar,
];

export function registerDomainRegistrars(server: McpServer): void {
  for (const registrar of DOMAIN_REGISTRARS) {
    registrar.register(server);
  }
}
