import { z } from "zod";

import * as api from "../client/domains/team-integrations/index.js";
import { numericIdSchema, stringIdSchema } from "../server/schemas/shared.js";
import {
  buildToolDefinition,
  reclaimToolName,
  toolAnnotations,
} from "../server/tool-metadata.js";
import { wrapApiCall } from "../utils.js";

import type { QueryParams } from "../client/core/http.js";
import type { ReclaimQueryParams } from "../types/reclaim.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const queryScalarSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

const queryValueSchema = z.union([
  queryScalarSchema,
  z.array(queryScalarSchema),
]);

const querySchema = z
  .record(queryValueSchema)
  .optional()
  .describe(
    "Optional query parameters. Values may be string/number/boolean/null or arrays of those primitives.",
  );

const payloadSchema = z
  .record(z.unknown())
  .describe("Request payload for the endpoint.");

const optionalPayloadSchema = z
  .record(z.unknown())
  .optional()
  .describe(
    "Optional payload. Omit to use endpoint defaults when the API supports an empty body.",
  );

const integrationIdSchema = z
  .union([numericIdSchema("integrationId"), stringIdSchema("integrationId")])
  .describe("Integration identifier.");

const calendarIdSchema = z
  .union([numericIdSchema("calendarId"), stringIdSchema("calendarId")])
  .describe("OOO calendar identifier.");

const siteIdSchema = z
  .union([numericIdSchema("siteId"), stringIdSchema("siteId")])
  .describe("Jira site identifier.");

function normalizeQuery(query?: ReclaimQueryParams): QueryParams | undefined {
  if (!query) {
    return undefined;
  }

  const normalized: QueryParams = {};

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      normalized[key] = value;
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export function registerTeamIntegrationsTools(server: McpServer): void {
  server.registerTool(
    reclaimToolName("get_team_current"),
    buildToolDefinition({
      title: "Get Team Current",
      description: "Read the current team profile from /team/current.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.getTeamCurrent({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("get_team_current_membership"),
    buildToolDefinition({
      title: "Get Team Current Membership",
      description:
        "Read the current user's team membership from /team/current/membership.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.getTeamCurrentMembership({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("respond_team_current_join"),
    buildToolDefinition({
      title: "Respond Team Current Join",
      description:
        "Submit a self-service team join response through /team/current/joinResponses.",
      inputSchema: {
        payload: optionalPayloadSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ payload, query }) =>
      wrapApiCall(
        api.respondTeamCurrentJoin(
          (payload as Record<string, unknown> | undefined) ?? {},
          {
            query: normalizeQuery(query as ReclaimQueryParams | undefined),
          },
        ),
      ),
  );

  server.registerTool(
    reclaimToolName("leave_team_current"),
    buildToolDefinition({
      title: "Leave Team Current",
      description: "Leave the current team through /team/current/leave.",
      inputSchema: {
        payload: optionalPayloadSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ payload, query }) =>
      wrapApiCall(
        api.leaveTeamCurrent(
          (payload as Record<string, unknown> | undefined) ?? {},
          {
            query: normalizeQuery(query as ReclaimQueryParams | undefined),
          },
        ),
      ),
  );

  server.registerTool(
    reclaimToolName("list_team_editions"),
    buildToolDefinition({
      title: "List Team Editions",
      description: "List available team editions from /team/editions.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.listTeamEditions({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("list_team_joinable"),
    buildToolDefinition({
      title: "List Team Joinable",
      description: "List teams the current user can join from /team/joinable.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.listTeamJoinable({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("list_team_ooo_calendars"),
    buildToolDefinition({
      title: "List Team OOO Calendars",
      description: "List team OOO calendars from /team/ooo-calendars.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.listTeamOooCalendars({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("create_team_ooo_calendar"),
    buildToolDefinition({
      title: "Create Team OOO Calendar",
      description: "Create a team OOO calendar via /team/ooo-calendars.",
      inputSchema: {
        payload: payloadSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ payload, query }) =>
      wrapApiCall(
        api.createTeamOooCalendar(payload as Record<string, unknown>, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("list_team_ooo_calendars_available"),
    buildToolDefinition({
      title: "List Team OOO Calendars Available",
      description:
        "List available OOO calendars through /team/ooo-calendars/available.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.listTeamOooCalendarsAvailable({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("get_team_ooo_calendar"),
    buildToolDefinition({
      title: "Get Team OOO Calendar",
      description: "Fetch one team OOO calendar from /team/ooo-calendars/{id}.",
      inputSchema: {
        calendarId: calendarIdSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ calendarId, query }) =>
      wrapApiCall(
        api.getTeamOooCalendar(calendarId, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("delete_team_ooo_calendar"),
    buildToolDefinition({
      title: "Delete Team OOO Calendar",
      description: "Delete a team OOO calendar via /team/ooo-calendars/{id}.",
      inputSchema: {
        calendarId: calendarIdSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: true, destructive: true }),
    }),
    async ({ calendarId, query }) =>
      wrapApiCall(
        api.deleteTeamOooCalendar(calendarId, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("update_team_ooo_calendar"),
    buildToolDefinition({
      title: "Update Team OOO Calendar",
      description: "Patch a team OOO calendar via /team/ooo-calendars/{id}.",
      inputSchema: {
        calendarId: calendarIdSchema,
        payload: payloadSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: true }),
    }),
    async ({ calendarId, payload, query }) =>
      wrapApiCall(
        api.updateTeamOooCalendar(
          calendarId,
          payload as Record<string, unknown>,
          {
            query: normalizeQuery(query as ReclaimQueryParams | undefined),
          },
        ),
      ),
  );

  server.registerTool(
    reclaimToolName("get_integrations_enabled"),
    buildToolDefinition({
      title: "Get Integrations Enabled",
      description: "Read enabled integrations from /integrations/enabled.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.getIntegrationsEnabled({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("get_slack_integrations"),
    buildToolDefinition({
      title: "Get Slack Integrations",
      description: "List Slack integrations from /slack/integrations.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.getSlackIntegrations({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("update_slack_integrations"),
    buildToolDefinition({
      title: "Update Slack Integrations",
      description: "Update Slack integration settings via /slack/integrations.",
      inputSchema: {
        payload: payloadSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: true }),
    }),
    async ({ payload, query }) =>
      wrapApiCall(
        api.updateSlackIntegrations(payload as Record<string, unknown>, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("get_zoom_integrations"),
    buildToolDefinition({
      title: "Get Zoom Integrations",
      description: "List Zoom integrations from /integrations/zoom.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.getZoomIntegrations({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("create_zoom_integration"),
    buildToolDefinition({
      title: "Create Zoom Integration",
      description:
        "Create or connect a Zoom integration via /integrations/zoom.",
      inputSchema: {
        payload: optionalPayloadSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ payload, query }) =>
      wrapApiCall(
        api.createZoomIntegration(
          (payload as Record<string, unknown> | undefined) ?? {},
          {
            query: normalizeQuery(query as ReclaimQueryParams | undefined),
          },
        ),
      ),
  );

  server.registerTool(
    reclaimToolName("delete_zoom_integration"),
    buildToolDefinition({
      title: "Delete Zoom Integration",
      description: "Disconnect Zoom via DELETE /integrations/zoom.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: true, destructive: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.deleteZoomIntegration({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("delete_zoom_integration_user"),
    buildToolDefinition({
      title: "Delete Zoom Integration User",
      description: "Disconnect Zoom user state via /integrations/zoom/user.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: true, destructive: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.deleteZoomIntegrationUser({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("list_todoist_integrations"),
    buildToolDefinition({
      title: "List Todoist Integrations",
      description: "List Todoist integrations from /todoist/integrations.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.listTodoistIntegrations({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("get_todoist_integration_details"),
    buildToolDefinition({
      title: "Get Todoist Integration Details",
      description:
        "Read Todoist integration details from /todoist/integrations/details.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.getTodoistIntegrationDetails({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("update_todoist_integration_settings"),
    buildToolDefinition({
      title: "Update Todoist Integration Settings",
      description:
        "Patch Todoist integration settings via /todoist/integrations/settings/{id}.",
      inputSchema: {
        integrationId: integrationIdSchema,
        payload: payloadSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: true }),
    }),
    async ({ integrationId, payload, query }) =>
      wrapApiCall(
        api.updateTodoistIntegrationSettings(
          integrationId,
          payload as Record<string, unknown>,
          {
            query: normalizeQuery(query as ReclaimQueryParams | undefined),
          },
        ),
      ),
  );

  server.registerTool(
    reclaimToolName("update_todoist_integration"),
    buildToolDefinition({
      title: "Update Todoist Integration",
      description:
        "Patch one Todoist integration via /todoist/integrations/{id}.",
      inputSchema: {
        integrationId: integrationIdSchema,
        payload: payloadSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: true }),
    }),
    async ({ integrationId, payload, query }) =>
      wrapApiCall(
        api.updateTodoistIntegration(
          integrationId,
          payload as Record<string, unknown>,
          {
            query: normalizeQuery(query as ReclaimQueryParams | undefined),
          },
        ),
      ),
  );

  server.registerTool(
    reclaimToolName("delete_todoist_integration"),
    buildToolDefinition({
      title: "Delete Todoist Integration",
      description:
        "Disconnect one Todoist integration via /todoist/integrations/{id}.",
      inputSchema: {
        integrationId: integrationIdSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: true, destructive: true }),
    }),
    async ({ integrationId, query }) =>
      wrapApiCall(
        api.deleteTodoistIntegration(integrationId, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("sync_todoist"),
    buildToolDefinition({
      title: "Sync Todoist",
      description: "Trigger Todoist synchronization via /todoist/sync.",
      inputSchema: {
        payload: optionalPayloadSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ payload, query }) =>
      wrapApiCall(
        api.syncTodoist(
          (payload as Record<string, unknown> | undefined) ?? {},
          {
            query: normalizeQuery(query as ReclaimQueryParams | undefined),
          },
        ),
      ),
  );

  server.registerTool(
    reclaimToolName("list_linear_integrations"),
    buildToolDefinition({
      title: "List Linear Integrations",
      description: "List Linear integrations from /linear/integrations.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.listLinearIntegrations({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("update_linear_integration"),
    buildToolDefinition({
      title: "Update Linear Integration",
      description: "Patch a Linear integration via /linear/integrations/{id}.",
      inputSchema: {
        integrationId: integrationIdSchema,
        payload: payloadSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: true }),
    }),
    async ({ integrationId, payload, query }) =>
      wrapApiCall(
        api.updateLinearIntegration(
          integrationId,
          payload as Record<string, unknown>,
          {
            query: normalizeQuery(query as ReclaimQueryParams | undefined),
          },
        ),
      ),
  );

  server.registerTool(
    reclaimToolName("delete_linear_integration"),
    buildToolDefinition({
      title: "Delete Linear Integration",
      description:
        "Disconnect a Linear integration via /linear/integrations/{id}.",
      inputSchema: {
        integrationId: integrationIdSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: true, destructive: true }),
    }),
    async ({ integrationId, query }) =>
      wrapApiCall(
        api.deleteLinearIntegration(integrationId, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("list_jira_integrations"),
    buildToolDefinition({
      title: "List Jira Integrations",
      description: "List Jira integrations from /jira/integrations.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.listJiraIntegrations({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("update_jira_integration"),
    buildToolDefinition({
      title: "Update Jira Integration",
      description: "Patch one Jira integration via /jira/integrations/{id}.",
      inputSchema: {
        integrationId: integrationIdSchema,
        payload: payloadSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: true }),
    }),
    async ({ integrationId, payload, query }) =>
      wrapApiCall(
        api.updateJiraIntegration(
          integrationId,
          payload as Record<string, unknown>,
          {
            query: normalizeQuery(query as ReclaimQueryParams | undefined),
          },
        ),
      ),
  );

  server.registerTool(
    reclaimToolName("delete_jira_integration"),
    buildToolDefinition({
      title: "Delete Jira Integration",
      description:
        "Disconnect one Jira integration via /jira/integrations/{id}.",
      inputSchema: {
        integrationId: integrationIdSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: true, destructive: true }),
    }),
    async ({ integrationId, query }) =>
      wrapApiCall(
        api.deleteJiraIntegration(integrationId, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("list_jira_v2_sites"),
    buildToolDefinition({
      title: "List Jira V2 Sites",
      description: "List Jira Cloud sites via /jira-v2/sites.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.listJiraV2Sites({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("delete_jira_v2_site"),
    buildToolDefinition({
      title: "Delete Jira V2 Site",
      description: "Disconnect one Jira site via /jira-v2/sites/{id}.",
      inputSchema: {
        siteId: siteIdSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: true, destructive: true }),
    }),
    async ({ siteId, query }) =>
      wrapApiCall(
        api.deleteJiraV2Site(siteId, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("list_asana_integrations"),
    buildToolDefinition({
      title: "List Asana Integrations",
      description: "List Asana integrations from /asana/integrations.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.listAsanaIntegrations({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("update_asana_integrations"),
    buildToolDefinition({
      title: "Update Asana Integrations",
      description: "Patch Asana integration settings via /asana/integrations.",
      inputSchema: {
        payload: payloadSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: true }),
    }),
    async ({ payload, query }) =>
      wrapApiCall(
        api.updateAsanaIntegrations(payload as Record<string, unknown>, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("delete_asana_integrations"),
    buildToolDefinition({
      title: "Delete Asana Integrations",
      description: "Disconnect Asana integrations via /asana/integrations.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: true, destructive: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.deleteAsanaIntegrations({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("list_clickup_integrations"),
    buildToolDefinition({
      title: "List ClickUp Integrations",
      description: "List ClickUp integrations from /clickup/integrations.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.listClickupIntegrations({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("delete_clickup_integrations"),
    buildToolDefinition({
      title: "Delete ClickUp Integrations",
      description:
        "Disconnect ClickUp integrations via DELETE /clickup/integrations.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: true, destructive: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.deleteClickupIntegrations({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("get_clickup_integration_details"),
    buildToolDefinition({
      title: "Get ClickUp Integration Details",
      description:
        "Read ClickUp integration details from /clickup/integrations/details.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.getClickupIntegrationDetails({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("update_clickup_integration"),
    buildToolDefinition({
      title: "Update ClickUp Integration",
      description:
        "Patch one ClickUp integration via /clickup/integrations/{id}.",
      inputSchema: {
        integrationId: integrationIdSchema,
        payload: payloadSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: true }),
    }),
    async ({ integrationId, payload, query }) =>
      wrapApiCall(
        api.updateClickupIntegration(
          integrationId,
          payload as Record<string, unknown>,
          {
            query: normalizeQuery(query as ReclaimQueryParams | undefined),
          },
        ),
      ),
  );

  server.registerTool(
    reclaimToolName("update_clickup_integration_settings"),
    buildToolDefinition({
      title: "Update ClickUp Integration Settings",
      description:
        "Patch ClickUp integration settings via /clickup/integrations/settings/{id}.",
      inputSchema: {
        integrationId: integrationIdSchema,
        payload: payloadSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: true }),
    }),
    async ({ integrationId, payload, query }) =>
      wrapApiCall(
        api.updateClickupIntegrationSettings(
          integrationId,
          payload as Record<string, unknown>,
          {
            query: normalizeQuery(query as ReclaimQueryParams | undefined),
          },
        ),
      ),
  );

  server.registerTool(
    reclaimToolName("sync_people"),
    buildToolDefinition({
      title: "Sync People",
      description: "Trigger people synchronization through /people/sync.",
      inputSchema: {
        payload: optionalPayloadSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ payload, query }) =>
      wrapApiCall(
        api.syncPeople((payload as Record<string, unknown> | undefined) ?? {}, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );
}
