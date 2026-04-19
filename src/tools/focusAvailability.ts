import { z } from "zod";

import * as api from "../client/domains/focus-availability/index.js";
import type { QueryParams } from "../client/core/http.js";
import {
  isoDateOrDateTimeSchema,
  numericIdSchema,
  plannerEventIdSchema,
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
  IdealTimeAvailabilityRequest,
  FocusSettingsId,
  PlannerEventId,
  ReclaimQueryParams,
  SuggestedTimesRequest,
} from "../types/reclaim.js";
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

const payloadSchema = z
  .record(z.unknown())
  .describe("Request payload for the endpoint.");

const querySchema = z
  .record(queryValueSchema)
  .optional()
  .describe(
    "Optional query parameters. Values may be string/number/boolean/null or arrays of those primitives.",
  );

const attendeeEmailSchema = z
  .string()
  .email("attendee email must be a valid email address.");
const attendeeEmailsSchema = z
  .array(attendeeEmailSchema)
  .min(1, "attendee list must include at least one attendee.")
  .max(200, "attendee list cannot exceed 200 entries.");
const availabilityRequestPayloadSchema = z
  .object({
    at: isoDateOrDateTimeSchema.optional(),
    availabilityStart: isoDateOrDateTimeSchema.optional(),
    availabilityEnd: isoDateOrDateTimeSchema.optional(),
    date: isoDateOrDateTimeSchema.optional(),
    deadline: z.union([z.number(), isoDateOrDateTimeSchema]).optional(),
    due: isoDateOrDateTimeSchema.optional(),
    end: isoDateOrDateTimeSchema.optional(),
    endDate: isoDateOrDateTimeSchema.optional(),
    endTime: isoDateOrDateTimeSchema.optional(),
    from: isoDateOrDateTimeSchema.optional(),
    on: isoDateOrDateTimeSchema.optional(),
    snoozeUntil: z.union([z.number(), isoDateOrDateTimeSchema]).optional(),
    start: isoDateOrDateTimeSchema.optional(),
    startDate: isoDateOrDateTimeSchema.optional(),
    startTime: isoDateOrDateTimeSchema.optional(),
    to: isoDateOrDateTimeSchema.optional(),
    windowStart: isoDateOrDateTimeSchema.optional(),
    windowEnd: isoDateOrDateTimeSchema.optional(),
    attendees: attendeeEmailsSchema.optional(),
    attendeeEmails: attendeeEmailsSchema.optional(),
    attendeeEmail: attendeeEmailSchema.optional(),
    optionalAttendees: attendeeEmailsSchema.optional(),
    organizerEmail: attendeeEmailSchema.optional(),
    includeOptionalAttendees: z.boolean().optional(),
    durationMinutes: z
      .number()
      .int()
      .positive("durationMinutes must be a positive integer.")
      .optional(),
    minimumNoticeMinutes: z
      .number()
      .int()
      .min(0, "minimumNoticeMinutes must be zero or greater.")
      .optional(),
    maxResults: z
      .number()
      .int()
      .positive("maxResults must be a positive integer.")
      .optional(),
  })
  .passthrough();

const idealTimeAvailabilityPayloadSchema = availabilityRequestPayloadSchema
  .describe(
    "Optional request payload for ideal-time availability. Supports known date/attendee fields and passthrough keys for forward compatibility.",
  );

const suggestedTimesPayloadSchema = availabilityRequestPayloadSchema.describe(
  "Optional request payload for suggested-times availability. Supports known date/attendee fields and passthrough keys for forward compatibility.",
);

const focusSettingsIdSchema = z
  .union([
    numericIdSchema("focusSettingsId"),
    stringIdSchema("focusSettingsId"),
  ])
  .describe(
    "Focus settings identifier (string or numeric, depending on endpoint).",
  );

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

export function registerFocusAvailabilityTools(server: McpServer): void {
  const timeZoneSchemas = timeZoneInputSchemas();

  server.registerTool(
    reclaimToolName("get_focus_settings_user"),
    buildToolDefinition({
      title: "Get Focus Settings User",
      description:
        "Fetch current user focus settings from /focus-settings/user.",
      inputSchema: {},
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async () => wrapApiCall(api.getFocusSettingsUser()),
  );

  server.registerTool(
    reclaimToolName("update_focus_settings_user"),
    buildToolDefinition({
      title: "Update Focus Settings User",
      description:
        "Create or update current user focus settings via /focus-settings/user.",
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
        api.updateFocusSettingsUser(payload as Record<string, unknown>, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("get_focus_settings_default_focus_time"),
    buildToolDefinition({
      title: "Get Focus Settings Default Focus Time",
      description:
        "Fetch default focus-time settings for the current user from /focus-settings/user/focus-time/default.",
      inputSchema: {},
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async () => wrapApiCall(api.getFocusSettingsDefaultFocusTime()),
  );

  server.registerTool(
    reclaimToolName("patch_focus_settings_user"),
    buildToolDefinition({
      title: "Patch Focus Settings User",
      description:
        "Patch current user focus settings via /focus-settings/user/{id}.",
      inputSchema: {
        focusSettingsUserId: focusSettingsIdSchema,
        payload: payloadSchema,
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ idempotent: true }),
    }),
    async ({ focusSettingsUserId, payload, query, timeZone, timezone }) =>
      wrapApiCall(
        api.patchFocusSettingsUser(
          focusSettingsUserId as FocusSettingsId,
          payload as Record<string, unknown>,
          {
            query: normalizeQuery(query as ReclaimQueryParams | undefined),
            timeZone: resolveTimeZoneAlias(timeZone, timezone),
          },
        ),
      ),
  );

  server.registerTool(
    reclaimToolName("list_focus_settings_team"),
    buildToolDefinition({
      title: "List Focus Settings Team",
      description: "List team focus settings from /focus-settings/team.",
      inputSchema: {},
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async () => wrapApiCall(api.listFocusSettingsTeam()),
  );

  server.registerTool(
    reclaimToolName("get_focus_settings_team"),
    buildToolDefinition({
      title: "Get Focus Settings Team",
      description:
        "Fetch team focus settings by id from /focus-settings/team/{id}.",
      inputSchema: {
        teamFocusSettingsId: focusSettingsIdSchema.describe(
          "Team focus-settings identifier.",
        ),
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ teamFocusSettingsId }) =>
      wrapApiCall(
        api.getFocusSettingsTeam(teamFocusSettingsId as FocusSettingsId),
      ),
  );

  server.registerTool(
    reclaimToolName("lock_focus_planner_event"),
    buildToolDefinition({
      title: "Lock Focus Planner Event",
      description:
        "Lock a focus planner event via /focus/planner/{id}/{eventId}/lock.",
      inputSchema: {
        focusSettingsId: focusSettingsIdSchema,
        plannerEventId: plannerEventIdSchema,
        at: isoDateOrDateTimeSchema.optional(),
        from: isoDateOrDateTimeSchema.optional(),
        to: isoDateOrDateTimeSchema.optional(),
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({
      focusSettingsId,
      plannerEventId,
      at,
      from,
      to,
      query,
      timeZone,
      timezone,
    }) =>
      wrapApiCall(
        api.lockFocusPlannerEvent(
          focusSettingsId as FocusSettingsId,
          plannerEventId as PlannerEventId,
          {
            at,
            from,
            to,
          },
          {
            query: normalizeQuery(query as ReclaimQueryParams | undefined),
            timeZone: resolveTimeZoneAlias(timeZone, timezone),
          },
        ),
      ),
  );

  server.registerTool(
    reclaimToolName("unlock_focus_planner_event"),
    buildToolDefinition({
      title: "Unlock Focus Planner Event",
      description:
        "Unlock a focus planner event via /focus/planner/{id}/{eventId}/unlock.",
      inputSchema: {
        focusSettingsId: focusSettingsIdSchema,
        plannerEventId: plannerEventIdSchema,
        at: isoDateOrDateTimeSchema.optional(),
        from: isoDateOrDateTimeSchema.optional(),
        to: isoDateOrDateTimeSchema.optional(),
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({
      focusSettingsId,
      plannerEventId,
      at,
      from,
      to,
      query,
      timeZone,
      timezone,
    }) =>
      wrapApiCall(
        api.unlockFocusPlannerEvent(
          focusSettingsId as FocusSettingsId,
          plannerEventId as PlannerEventId,
          {
            at,
            from,
            to,
          },
          {
            query: normalizeQuery(query as ReclaimQueryParams | undefined),
            timeZone: resolveTimeZoneAlias(timeZone, timezone),
          },
        ),
      ),
  );

  server.registerTool(
    reclaimToolName("move_focus_planner_event"),
    buildToolDefinition({
      title: "Move Focus Planner Event",
      description:
        "Move a focus planner event via /focus/planner/{id}/{eventId}/move.",
      inputSchema: {
        focusSettingsId: focusSettingsIdSchema,
        plannerEventId: plannerEventIdSchema,
        at: isoDateOrDateTimeSchema.optional(),
        from: isoDateOrDateTimeSchema.optional(),
        to: isoDateOrDateTimeSchema.optional(),
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({
      focusSettingsId,
      plannerEventId,
      at,
      from,
      to,
      query,
      timeZone,
      timezone,
    }) =>
      wrapApiCall(
        api.moveFocusPlannerEvent(
          focusSettingsId as FocusSettingsId,
          plannerEventId as PlannerEventId,
          {
            at,
            from,
            to,
          },
          {
            query: normalizeQuery(query as ReclaimQueryParams | undefined),
            timeZone: resolveTimeZoneAlias(timeZone, timezone),
          },
        ),
      ),
  );

  server.registerTool(
    reclaimToolName("reschedule_focus_planner_event"),
    buildToolDefinition({
      title: "Reschedule Focus Planner Event",
      description:
        "Reschedule a focus planner event via /focus/planner/{id}/{eventId}/reschedule.",
      inputSchema: {
        focusSettingsId: focusSettingsIdSchema,
        plannerEventId: plannerEventIdSchema,
        at: isoDateOrDateTimeSchema.optional(),
        from: isoDateOrDateTimeSchema.optional(),
        to: isoDateOrDateTimeSchema.optional(),
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({
      focusSettingsId,
      plannerEventId,
      at,
      from,
      to,
      query,
      timeZone,
      timezone,
    }) =>
      wrapApiCall(
        api.rescheduleFocusPlannerEvent(
          focusSettingsId as FocusSettingsId,
          plannerEventId as PlannerEventId,
          {
            at,
            from,
            to,
          },
          {
            query: normalizeQuery(query as ReclaimQueryParams | undefined),
            timeZone: resolveTimeZoneAlias(timeZone, timezone),
          },
        ),
      ),
  );

  server.registerTool(
    reclaimToolName("get_ideal_time_availability"),
    buildToolDefinition({
      title: "Get Ideal Time Availability",
      description:
        "Compute ideal-time availability windows via /availability/ideal-time-availability.",
      inputSchema: {
        payload: idealTimeAvailabilityPayloadSchema.optional(),
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ payload, query, timeZone, timezone }) =>
      wrapApiCall(
        api.getIdealTimeAvailability(
          payload as IdealTimeAvailabilityRequest | undefined,
          {
            query: normalizeQuery(query as ReclaimQueryParams | undefined),
            timeZone: resolveTimeZoneAlias(timeZone, timezone),
          },
        ),
      ),
  );

  server.registerTool(
    reclaimToolName("get_suggested_times"),
    buildToolDefinition({
      title: "Get Suggested Times",
      description:
        "Compute suggested meeting windows via /availability/suggested-times.",
      inputSchema: {
        payload: suggestedTimesPayloadSchema.optional(),
        query: querySchema,
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ payload, query, timeZone, timezone }) =>
      wrapApiCall(
        api.getSuggestedTimes(payload as SuggestedTimesRequest | undefined, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );
}
