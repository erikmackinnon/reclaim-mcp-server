import { z } from "zod";

import * as api from "../client/domains/events-calendars/index.js";
import type { QueryParams } from "../client/core/http.js";
import {
  isoDateOrDateTimeSchema,
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

import type {
  EventCalendarId,
  ReclaimQueryParams,
  ReclaimQueryValue,
} from "../types/reclaim.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const queryScalarSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);
const queryValueSchema = z.union([queryScalarSchema, z.array(queryScalarSchema)]);

const eventCalendarIdSchema = z.union([
  stringIdSchema("id"),
  z.number().int().positive("id must be a positive integer."),
]);

function mergeQuery(
  query: ReclaimQueryParams | undefined,
  additions?: Record<string, ReclaimQueryValue | undefined>,
): QueryParams | undefined {
  const merged: QueryParams = {};

  if (query) {
    Object.assign(merged, query);
  }

  if (additions) {
    for (const [key, value] of Object.entries(additions)) {
      if (value !== undefined) {
        merged[key] = value;
      }
    }
  }

  return Object.keys(merged).length > 0 ? merged : undefined;
}

function toIdArray(ids: EventCalendarId[] | undefined): Array<string | number> | undefined {
  if (!ids || ids.length === 0) {
    return undefined;
  }

  return ids.map((id) => (typeof id === "number" ? id : String(id)));
}

export function registerEventCalendarTools(server: McpServer): void {
  const timeZoneSchemas = timeZoneInputSchemas();

  const querySchema = z
    .record(queryValueSchema)
    .optional()
    .describe(
      "Optional query parameters. Values may be string/number/boolean/null or arrays of those primitives.",
    );

  const payloadSchema = z
    .record(z.unknown())
    .optional()
    .describe("Optional advanced payload fields merged into the request body.");

  server.registerTool(
    reclaimToolName("list_events"),
    buildToolDefinition({
      title: "List Reclaim Events",
      description:
        "List events from /events with optional date windows and calendar filters.",
      inputSchema: {
        start: isoDateOrDateTimeSchema.optional(),
        end: isoDateOrDateTimeSchema.optional(),
        sourceDetails: z.boolean().optional(),
        calendarIds: z
          .array(eventCalendarIdSchema)
          .optional()
          .describe("Optional calendar IDs to filter events by calendar."),
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ start, end, sourceDetails, calendarIds, query, timeZone, timezone }) =>
      wrapApiCall(
        api.listEvents({
          query: mergeQuery(query as ReclaimQueryParams | undefined, {
            start,
            end,
            sourceDetails,
            calendarIds: toIdArray(calendarIds as EventCalendarId[] | undefined),
          }),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("list_events_v2"),
    buildToolDefinition({
      title: "List Reclaim Events V2",
      description:
        "List events from /events/v2 with optional allConnected and date-window filters.",
      inputSchema: {
        start: isoDateOrDateTimeSchema.optional(),
        end: isoDateOrDateTimeSchema.optional(),
        allConnected: z.boolean().optional(),
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ start, end, allConnected, query, timeZone, timezone }) =>
      wrapApiCall(
        api.listEventsV2({
          query: mergeQuery(query as ReclaimQueryParams | undefined, {
            start,
            end,
            allConnected,
          }),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("get_event"),
    buildToolDefinition({
      title: "Get Reclaim Event",
      description: "Fetch a specific event by ID from /events/{id}.",
      inputSchema: {
        eventId: eventCalendarIdSchema.describe(
          "Event identifier (string or numeric, depending on provider).",
        ),
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ eventId, query, timeZone, timezone }) =>
      wrapApiCall(
        api.getEvent(eventId, {
          query: query as QueryParams | undefined,
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("list_personal_events"),
    buildToolDefinition({
      title: "List Personal Events",
      description: "List personal events from /events/personal.",
      inputSchema: {
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query, timeZone, timezone }) =>
      wrapApiCall(
        api.listPersonalEvents({
          query: query as QueryParams | undefined,
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("convert_event_to_v2"),
    buildToolDefinition({
      title: "Convert Event To V2",
      description: "Call /events/utils/to-v2 with optional query and payload.",
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
        api.convertEventToV2((payload as Record<string, unknown>) ?? {}, {
          query: query as QueryParams | undefined,
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("match_event"),
    buildToolDefinition({
      title: "Match Event",
      description: "Call /matcher/event to run provider event matching.",
      inputSchema: {
        payload: payloadSchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ payload, timeZone, timezone }) =>
      wrapApiCall(
        api.matchEvent((payload as Record<string, unknown>) ?? {}, {
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("get_primary_calendar"),
    buildToolDefinition({
      title: "Get Primary Calendar",
      description: "Fetch the current primary calendar from /calendars/primary.",
      inputSchema: {},
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async () => wrapApiCall(api.getPrimaryCalendar()),
  );

  server.registerTool(
    reclaimToolName("list_personal_calendars"),
    buildToolDefinition({
      title: "List Personal Calendars",
      description: "List connected personal calendars from /calendars/personal.",
      inputSchema: {},
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async () => wrapApiCall(api.listPersonalCalendars()),
  );

  server.registerTool(
    reclaimToolName("get_personal_calendar"),
    buildToolDefinition({
      title: "Get Personal Calendar",
      description: "Fetch a specific personal calendar from /calendars/personal/{id}.",
      inputSchema: {
        calendarId: eventCalendarIdSchema.describe("Personal calendar identifier."),
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ calendarId }) => wrapApiCall(api.getPersonalCalendar(calendarId)),
  );

  server.registerTool(
    reclaimToolName("delete_personal_calendar"),
    buildToolDefinition({
      title: "Delete Personal Calendar",
      description: "Delete a personal calendar connection from /calendars/personal/{id}.",
      inputSchema: {
        calendarId: eventCalendarIdSchema.describe("Personal calendar identifier."),
      },
      annotations: toolAnnotations({ idempotent: true, destructive: true }),
    }),
    async ({ calendarId }) => wrapApiCall(api.deletePersonalCalendar(calendarId)),
  );

  server.registerTool(
    reclaimToolName("list_personal_calendar_candidates"),
    buildToolDefinition({
      title: "List Personal Calendar Candidates",
      description:
        "List candidate personal calendars from /calendars/personal/candidates.",
      inputSchema: {
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query, timeZone, timezone }) =>
      wrapApiCall(
        api.listPersonalCalendarCandidates({
          query: query as QueryParams | undefined,
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("get_sync_calendar"),
    buildToolDefinition({
      title: "Get Sync Calendar",
      description: "Fetch a synced calendar from /calendars/sync/{id}.",
      inputSchema: {
        calendarId: eventCalendarIdSchema.describe("Synced calendar identifier."),
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ calendarId }) => wrapApiCall(api.getSyncCalendar(calendarId)),
  );

  server.registerTool(
    reclaimToolName("delete_sync_calendar"),
    buildToolDefinition({
      title: "Delete Sync Calendar",
      description: "Delete a synced calendar from /calendars/sync/{id}.",
      inputSchema: {
        calendarId: eventCalendarIdSchema.describe("Synced calendar identifier."),
      },
      annotations: toolAnnotations({ idempotent: true, destructive: true }),
    }),
    async ({ calendarId }) => wrapApiCall(api.deleteSyncCalendar(calendarId)),
  );

  server.registerTool(
    reclaimToolName("list_sync_calendar_candidates"),
    buildToolDefinition({
      title: "List Sync Calendar Candidates",
      description: "List candidate sync calendars from /calendars/sync/candidates.",
      inputSchema: {
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query, timeZone, timezone }) =>
      wrapApiCall(
        api.listSyncCalendarCandidates({
          query: query as QueryParams | undefined,
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("register_sync_interest"),
    buildToolDefinition({
      title: "Register Sync Interest",
      description: "Call /calendars/sync/interest for customer-safe sync flows.",
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
        api.registerSyncInterest((payload as Record<string, unknown>) ?? {}, {
          query: query as QueryParams | undefined,
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("get_sync_policy"),
    buildToolDefinition({
      title: "Get Sync Policy",
      description: "Fetch current calendar sync policy from /calendars/sync-policy.",
      inputSchema: {},
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async () => wrapApiCall(api.getSyncPolicy()),
  );

  server.registerTool(
    reclaimToolName("validate_sync_policy"),
    buildToolDefinition({
      title: "Validate Sync Policy",
      description: "Validate a sync policy payload via /calendars/sync-policy/validate.",
      inputSchema: {
        payload: payloadSchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ payload, timeZone, timezone }) =>
      wrapApiCall(
        api.validateSyncPolicy((payload as Record<string, unknown>) ?? {}, {
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("sync_calendar_permissions"),
    buildToolDefinition({
      title: "Sync Calendar Permissions",
      description: "Run calendar permission sync checks via /calendars/permissions/sync.",
      inputSchema: {
        payload: payloadSchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ payload, timeZone, timezone }) =>
      wrapApiCall(
        api.syncCalendarPermissions((payload as Record<string, unknown>) ?? {}, {
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );
}
