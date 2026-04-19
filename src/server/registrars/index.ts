import { analyticsChangelogAssistDomainRegistrar } from "./analyticsChangelogAssist.js";
import { curatedFallbackRegistrar } from "./curatedFallback.js";
import { eventsCalendarsDomainRegistrar } from "./eventsCalendars.js";
import { focusAvailabilityDomainRegistrar } from "./focusAvailability.js";
import { habitDomainRegistrar } from "./habits.js";
import { oneOnOneDomainRegistrar } from "./oneOnOnes.js";
import { schedulingLinkDomainRegistrar } from "./schedulingLinks.js";
import { smartMeetingDomainRegistrar } from "./smartMeetings.js";
import { taskDomainRegistrar } from "./tasks.js";
import { teamIntegrationsDomainRegistrar } from "./teamIntegrations.js";
import { usersAccountsDomainRegistrar } from "./usersAccounts.js";
import { timePoliciesDomainRegistrar } from "./timePolicies.js";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DomainRegistrar } from "./types.js";

export const DOMAIN_REGISTRARS: readonly DomainRegistrar[] = [
  taskDomainRegistrar,
  habitDomainRegistrar,
  oneOnOneDomainRegistrar,
  smartMeetingDomainRegistrar,
  schedulingLinkDomainRegistrar,
  eventsCalendarsDomainRegistrar,
  usersAccountsDomainRegistrar,
  timePoliciesDomainRegistrar,
  focusAvailabilityDomainRegistrar,
  analyticsChangelogAssistDomainRegistrar,
  teamIntegrationsDomainRegistrar,
  curatedFallbackRegistrar,
];

export function registerDomainRegistrars(server: McpServer): void {
  for (const registrar of DOMAIN_REGISTRARS) {
    registrar.register(server);
  }
}
