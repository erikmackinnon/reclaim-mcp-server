import { z } from "zod";

import * as api from "../client/domains/analytics-changelog-assist/index.js";
import {
  numericIdSchema,
  resolveTimeZoneAlias,
  stringIdSchema,
  timeZoneInputSchemas,
} from "../server/schemas/shared.js";
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
  .describe("Optional advanced payload fields merged into the request body.");

const optionalPayloadSchema = z
  .record(z.unknown())
  .optional()
  .describe("Optional advanced payload fields merged into the request body.");

const insightsEntityIdSchema = z
  .union([stringIdSchema("id"), numericIdSchema("id")])
  .describe("Identifier (string or numeric, depending on endpoint).");

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

export function registerAnalyticsChangelogAssistTools(server: McpServer): void {
  const timeZoneSchemas = timeZoneInputSchemas();

  server.registerTool(
    reclaimToolName("get_user_analytics"),
    buildToolDefinition({
      title: "Get User Analytics",
      description: "Read user analytics from /analytics/user.",
      inputSchema: {
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query, timeZone, timezone }) =>
      wrapApiCall(
        api.getUserAnalytics({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("get_user_analytics_v3"),
    buildToolDefinition({
      title: "Get User Analytics V3",
      description: "Read user analytics from /analytics/user/V3.",
      inputSchema: {
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query, timeZone, timezone }) =>
      wrapApiCall(
        api.getUserAnalyticsV3({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("get_team_analytics"),
    buildToolDefinition({
      title: "Get Team Analytics",
      description: "Read team analytics from /analytics/team.",
      inputSchema: {
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query, timeZone, timezone }) =>
      wrapApiCall(
        api.getTeamAnalytics({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("get_team_analytics_v3"),
    buildToolDefinition({
      title: "Get Team Analytics V3",
      description: "Read team analytics from /analytics/team/V3.",
      inputSchema: {
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query, timeZone, timezone }) =>
      wrapApiCall(
        api.getTeamAnalyticsV3({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("get_team_analytics_v4"),
    buildToolDefinition({
      title: "Get Team Analytics V4",
      description: "Read team analytics from /analytics/team/V4.",
      inputSchema: {
        payload: payloadSchema,
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ payload, query, timeZone, timezone }) =>
      wrapApiCall(
        api.getTeamAnalyticsV4(payload as Record<string, unknown>, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("get_team_analytics_v4_export"),
    buildToolDefinition({
      title: "Get Team Analytics V4 Export",
      description:
        "Read team analytics export metadata from /analytics/team/V4/export.",
      inputSchema: {
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query, timeZone, timezone }) =>
      wrapApiCall(
        api.getTeamAnalyticsV4Export({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("get_team_analytics_v4_filters"),
    buildToolDefinition({
      title: "Get Team Analytics V4 Filters",
      description:
        "Read available team analytics filters from /analytics/team/V4/filters.",
      inputSchema: {
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query, timeZone, timezone }) =>
      wrapApiCall(
        api.getTeamAnalyticsV4Filters({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("get_team_analytics_v4_permissions"),
    buildToolDefinition({
      title: "Get Team Analytics V4 Permissions",
      description:
        "Read team analytics permissions from /analytics/team/V4/permissions.",
      inputSchema: {
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query, timeZone, timezone }) =>
      wrapApiCall(
        api.getTeamAnalyticsV4Permissions({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("get_focus_insights_v3"),
    buildToolDefinition({
      title: "Get Focus Insights V3",
      description: "Read focus insights from /analytics/focus/insights/V3.",
      inputSchema: {
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query, timeZone, timezone }) =>
      wrapApiCall(
        api.getFocusInsightsV3({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("get_weekly_report_social"),
    buildToolDefinition({
      title: "Get Weekly Report Social",
      description:
        "Read weekly social report content from /weekly-report/social.",
      inputSchema: {
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query, timeZone, timezone }) =>
      wrapApiCall(
        api.getWeeklyReportSocial({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("list_changelog"),
    buildToolDefinition({
      title: "List Changelog Entries",
      description: "Read changelog entries from /changelog.",
      inputSchema: {
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query, timeZone, timezone }) =>
      wrapApiCall(
        api.listChangelog({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("list_changelog_events"),
    buildToolDefinition({
      title: "List Changelog Events",
      description: "Read changelog events from /changelog/events.",
      inputSchema: {
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query, timeZone, timezone }) =>
      wrapApiCall(
        api.listChangelogEvents({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("list_changelog_tasks"),
    buildToolDefinition({
      title: "List Changelog Tasks",
      description: "Read task changelog entries from /changelog/tasks.",
      inputSchema: {
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query, timeZone, timezone }) =>
      wrapApiCall(
        api.listChangelogTasks({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("list_changelog_smart_habits"),
    buildToolDefinition({
      title: "List Changelog Smart Habits",
      description:
        "Read smart habit changelog entries from /changelog/smart-habits.",
      inputSchema: {
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query, timeZone, timezone }) =>
      wrapApiCall(
        api.listChangelogSmartHabits({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("list_changelog_smart_meetings"),
    buildToolDefinition({
      title: "List Changelog Smart Meetings",
      description:
        "Read smart meeting changelog entries from /changelog/smart-meetings.",
      inputSchema: {
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query, timeZone, timezone }) =>
      wrapApiCall(
        api.listChangelogSmartMeetings({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("list_changelog_scheduling_links"),
    buildToolDefinition({
      title: "List Changelog Scheduling Links",
      description:
        "Read scheduling link changelog entries from /changelog/scheduling-links.",
      inputSchema: {
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query, timeZone, timezone }) =>
      wrapApiCall(
        api.listChangelogSchedulingLinks({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("list_interactions"),
    buildToolDefinition({
      title: "List Assist Interactions",
      description: "List assist interactions from /interactions.",
      inputSchema: {
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query, timeZone, timezone }) =>
      wrapApiCall(
        api.listInteractions({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("create_interaction"),
    buildToolDefinition({
      title: "Create Assist Interaction",
      description: "Create an assist interaction via /interactions.",
      inputSchema: {
        payload: payloadSchema,
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ payload, query, timeZone, timezone }) =>
      wrapApiCall(
        api.createInteraction(payload as Record<string, unknown>, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("get_interaction"),
    buildToolDefinition({
      title: "Get Assist Interaction",
      description:
        "Read a single assist interaction by ID from /interactions/{id}.",
      inputSchema: {
        interactionId: insightsEntityIdSchema.describe(
          "Assist interaction identifier.",
        ),
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ interactionId, query, timeZone, timezone }) =>
      wrapApiCall(
        api.getInteraction(interactionId, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("send_interaction_chat"),
    buildToolDefinition({
      title: "Send Assist Chat Message",
      description: "Send a chat interaction payload to /interactions/chat.",
      inputSchema: {
        payload: payloadSchema,
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ payload, query, timeZone, timezone }) =>
      wrapApiCall(
        api.chatInteraction(payload as Record<string, unknown>, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("close_interaction"),
    buildToolDefinition({
      title: "Close Assist Interaction",
      description:
        "Close or resolve an assist interaction using /interactions/close.",
      inputSchema: {
        payload: optionalPayloadSchema,
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ payload, query, timeZone, timezone }) =>
      wrapApiCall(
        api.closeInteraction((payload as Record<string, unknown>) ?? {}, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("set_current_interaction"),
    buildToolDefinition({
      title: "Set Current Assist Interaction",
      description:
        "Set the active interaction context via /interactions/current.",
      inputSchema: {
        payload: optionalPayloadSchema,
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ payload, query, timeZone, timezone }) =>
      wrapApiCall(
        api.setCurrentInteraction((payload as Record<string, unknown>) ?? {}, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("get_current_daily_digest"),
    buildToolDefinition({
      title: "Get Current Daily Digest",
      description:
        "Read the current daily digest interaction from /interactions/daily-digest/current.",
      inputSchema: {
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query, timeZone, timezone }) =>
      wrapApiCall(
        api.getCurrentDailyDigest({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("get_current_proactive_gtd"),
    buildToolDefinition({
      title: "Get Current Proactive GTD",
      description:
        "Read the current proactive GTD interaction from /interactions/proactive-gtd/current.",
      inputSchema: {
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query, timeZone, timezone }) =>
      wrapApiCall(
        api.getCurrentProactiveGtd({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("generate_proactive_gtd"),
    buildToolDefinition({
      title: "Generate Proactive GTD",
      description:
        "Generate proactive GTD recommendations via /interactions/proactive-gtd/generate.",
      inputSchema: {
        payload: optionalPayloadSchema,
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ payload, query, timeZone, timezone }) =>
      wrapApiCall(
        api.generateProactiveGtd((payload as Record<string, unknown>) ?? {}, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("list_interaction_records"),
    buildToolDefinition({
      title: "List Interaction Records",
      description:
        "Read interaction record history from /interactions/records.",
      inputSchema: {
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query, timeZone, timezone }) =>
      wrapApiCall(
        api.listInteractionRecords({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("get_task_interaction"),
    buildToolDefinition({
      title: "Get Task Interaction",
      description:
        "Read interaction data for a task from /interactions/task/{id}.",
      inputSchema: {
        taskId: insightsEntityIdSchema.describe(
          "Task identifier for interaction lookup.",
        ),
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ taskId, query, timeZone, timezone }) =>
      wrapApiCall(
        api.getTaskInteraction(taskId, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("update_interaction"),
    buildToolDefinition({
      title: "Update Interaction",
      description: "Update interaction metadata via /interactions/update.",
      inputSchema: {
        payload: payloadSchema,
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ payload, query, timeZone, timezone }) =>
      wrapApiCall(
        api.updateInteraction(payload as Record<string, unknown>, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("send_interpreter_message"),
    buildToolDefinition({
      title: "Send Interpreter Message",
      description: "Send an interpreter message to /interpreter/message.",
      inputSchema: {
        payload: payloadSchema,
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ payload, query, timeZone, timezone }) =>
      wrapApiCall(
        api.sendInterpreterMessage(payload as Record<string, unknown>, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("get_pending_interpreter_plan"),
    buildToolDefinition({
      title: "Get Pending Interpreter Plan",
      description:
        "Read pending interpreter plan details from /interpreter/plans/pending/{id}.",
      inputSchema: {
        planId: insightsEntityIdSchema.describe(
          "Pending interpreter plan identifier.",
        ),
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ planId, query, timeZone, timezone }) =>
      wrapApiCall(
        api.getPendingInterpreterPlan(planId, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("get_moment"),
    buildToolDefinition({
      title: "Get Moment",
      description: "Read moment data from /moment.",
      inputSchema: {
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query, timeZone, timezone }) =>
      wrapApiCall(
        api.getMoment({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("get_next_moment"),
    buildToolDefinition({
      title: "Get Next Moment",
      description: "Read the upcoming moment from /moment/next.",
      inputSchema: {
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query, timeZone, timezone }) =>
      wrapApiCall(
        api.getNextMoment({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );
}
