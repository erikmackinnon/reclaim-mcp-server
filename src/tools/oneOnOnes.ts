import { z } from "zod";

import * as api from "../client/domains/oneOnOnes/index.js";
import type { QueryParams } from "../client/core/http.js";
import {
  isoDateOrDateTimeSchema,
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

import type {
  OneOnOneInputData,
  ReclaimQueryParams,
  ReclaimQueryScalar,
} from "../types/reclaim.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

type OneOnOneToolInput = OneOnOneInputData & {
  durationMinutes?: number;
  minDurationMinutes?: number;
  maxDurationMinutes?: number;
  lockChunkSizeToDuration?: boolean;
  payload?: Record<string, unknown>;
  query?: ReclaimQueryParams;
  timeZone?: string;
  timezone?: string;
};

const CHUNK_MINUTES = 15;

const queryScalarSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);
const queryValueSchema = z.union([queryScalarSchema, z.array(queryScalarSchema)]);

function minutesToChunks(value: number, field: string): number {
  if (value % CHUNK_MINUTES !== 0) {
    throw new Error(
      `${field} must be a multiple of ${CHUNK_MINUTES} minutes. Example: 60 minutes = 4 chunks.`,
    );
  }
  return value / CHUNK_MINUTES;
}

function normalizeChunkInputs(input: OneOnOneToolInput): OneOnOneInputData {
  const data: OneOnOneToolInput = { ...input };

  if (typeof data.durationMinutes === "number") {
    data.timeChunksRequired = minutesToChunks(
      data.durationMinutes,
      "durationMinutes",
    );
  }

  if (typeof data.minDurationMinutes === "number") {
    data.minChunkSize = minutesToChunks(
      data.minDurationMinutes,
      "minDurationMinutes",
    );
  }

  if (typeof data.maxDurationMinutes === "number") {
    data.maxChunkSize = minutesToChunks(
      data.maxDurationMinutes,
      "maxDurationMinutes",
    );
  }

  if (data.lockChunkSizeToDuration) {
    if (typeof data.timeChunksRequired !== "number") {
      throw new Error(
        "lockChunkSizeToDuration requires timeChunksRequired or durationMinutes.",
      );
    }
    data.minChunkSize = data.timeChunksRequired;
    data.maxChunkSize = data.timeChunksRequired;
  }

  delete data.durationMinutes;
  delete data.minDurationMinutes;
  delete data.maxDurationMinutes;
  delete data.lockChunkSizeToDuration;
  delete data.payload;
  delete data.query;
  delete data.timeZone;
  delete data.timezone;

  return data as OneOnOneInputData;
}

function mergePayload<T extends Record<string, unknown>>(
  data: T,
  payload?: Record<string, unknown>,
): T {
  if (!payload) {
    return data;
  }

  return {
    ...payload,
    ...data,
  } as T;
}

function mergeQuery(
  query: ReclaimQueryParams | undefined,
  additions?: Record<string, ReclaimQueryScalar | undefined>,
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

function buildOneOnOnePayloadSchema(timeZoneSchemas: {
  timeZone: z.ZodOptional<z.ZodString>;
  timezone: z.ZodOptional<z.ZodString>;
}) {
  return {
    title: z.string().min(1, "Title cannot be empty."),
    notes: z.string().optional(),
    inviteeId: numericIdSchema("inviteeId")
      .optional()
      .describe("Invitee user ID for the one-on-one when applicable."),
    inviteeEmail: z
      .string()
      .email("inviteeEmail must be a valid email address.")
      .optional(),
    eventCategory: z
      .enum(["WORK", "PERSONAL"])
      .optional()
      .describe("One-on-one category: WORK or PERSONAL."),
    eventSubType: z
      .string()
      .optional()
      .describe(
        "One-on-one subtype (Reclaim EventSubType). Defaults are managed by Reclaim.",
      ),
    priority: z
      .enum(["P1", "P2", "P3", "P4", "PRIORITIZE", "DEFAULT"])
      .optional(),
    durationMinutes: z
      .number()
      .int()
      .positive("Duration minutes must be a positive integer.")
      .optional()
      .describe(
        "Total one-on-one duration in minutes. Will be converted to 15-minute chunks.",
      ),
    minDurationMinutes: z
      .number()
      .int()
      .positive("Min duration minutes must be a positive integer.")
      .optional()
      .describe(
        "Minimum chunk duration in minutes. Will be converted to 15-minute chunks.",
      ),
    maxDurationMinutes: z
      .number()
      .int()
      .positive("Max duration minutes must be a positive integer.")
      .optional()
      .describe(
        "Maximum chunk duration in minutes. Will be converted to 15-minute chunks.",
      ),
    lockChunkSizeToDuration: z
      .boolean()
      .optional()
      .describe(
        "If true, sets minChunkSize and maxChunkSize equal to the requested duration (no splitting).",
      ),
    timeChunksRequired: z
      .number()
      .int()
      .positive("Time chunks must be a positive integer.")
      .optional()
      .describe(
        "(Advanced) Total one-on-one duration in 15-minute chunks (NOT minutes). Prefer durationMinutes.",
      ),
    minChunkSize: z
      .number()
      .int()
      .positive("Min chunk size must be a positive integer.")
      .optional()
      .describe(
        "(Advanced) Minimum chunk size in 15-minute chunks (NOT minutes). Prefer minDurationMinutes.",
      ),
    maxChunkSize: z
      .number()
      .int()
      .positive("Max chunk size must be a positive integer.")
      .optional()
      .describe(
        "(Advanced) Maximum chunk size in 15-minute chunks (NOT minutes). Prefer maxDurationMinutes.",
      ),
    onDeck: z.boolean().optional(),
    alwaysPrivate: z
      .boolean()
      .optional()
      .describe("If true, always mark one-on-one events as private on the calendar."),
    timeSchemeId: stringIdSchema("timeSchemeId")
      .optional()
      .describe(
        "Time scheme ID for scheduling rules. Defaults to account task settings.",
      ),
    status: z
      .enum([
        "NEW",
        "SCHEDULED",
        "IN_PROGRESS",
        "COMPLETE",
        "CANCELLED",
        "ARCHIVED",
      ])
      .optional(),
    deadline: z
      .union([
        z.number().int().positive("Deadline days must be a positive integer."),
        isoDateOrDateTimeSchema,
      ])
      .optional()
      .describe(
        "Deadline input (days-from-now number or date). Ignored when explicit due is also provided.",
      ),
    due: isoDateOrDateTimeSchema
      .optional()
      .describe(
        "Explicit due date/time (ISO 8601 or YYYY-MM-DD). If both due and deadline are provided, due takes precedence.",
      ),
    start: isoDateOrDateTimeSchema.optional(),
    end: isoDateOrDateTimeSchema.optional(),
    startTime: isoDateOrDateTimeSchema.optional(),
    endTime: isoDateOrDateTimeSchema.optional(),
    snoozeUntil: z
      .union([
        z.number().int().positive("Snooze days must be a positive integer."),
        isoDateOrDateTimeSchema,
      ])
      .optional(),
    eventColor: z
      .enum([
        "NONE",
        "LAVENDER",
        "SAGE",
        "GRAPE",
        "FLAMINGO",
        "BANANA",
        "TANGERINE",
        "PEACOCK",
        "GRAPHITE",
        "BLUEBERRY",
        "BASIL",
        "TOMATO",
      ])
      .optional(),
    payload: z
      .record(z.unknown())
      .optional()
      .describe("Optional advanced payload fields merged into the request body."),
    query: z
      .record(queryValueSchema)
      .optional()
      .describe(
        "Optional query parameters. Values may be string/number/boolean/null or arrays of those primitives.",
      ),
    timeZone: timeZoneSchemas.timeZone,
    timezone: timeZoneSchemas.timezone,
  };
}

export function registerOneOnOneTools(server: McpServer): void {
  const timeZoneSchemas = timeZoneInputSchemas();
  const oneOnOnePayloadSchema = buildOneOnOnePayloadSchema(timeZoneSchemas);

  server.registerTool(
    reclaimToolName("list_one_on_ones"),
    buildToolDefinition({
      title: "List Reclaim One-on-Ones",
      description: "List smart one-on-one meetings from Reclaim.ai.",
      inputSchema: {
        query: oneOnOnePayloadSchema.query,
        timeZone: oneOnOnePayloadSchema.timeZone,
        timezone: oneOnOnePayloadSchema.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query, timeZone, timezone }) =>
      wrapApiCall(
        api.listOneOnOnes({
          query: query as QueryParams | undefined,
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("create_one_on_one"),
    buildToolDefinition({
      title: "Create Reclaim One-on-One",
      description: "Create a new smart one-on-one meeting in Reclaim.ai.",
      inputSchema: oneOnOnePayloadSchema,
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ payload, query, timeZone, timezone, ...oneOnOneData }) => {
      let normalized: OneOnOneInputData;
      try {
        normalized = normalizeChunkInputs(oneOnOneData);
      } catch (error) {
        return wrapApiCall(Promise.reject(error));
      }

      return wrapApiCall(
        api.createOneOnOne(mergePayload(normalized, payload), {
          query: mergeQuery(query as ReclaimQueryParams | undefined),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      );
    },
  );

  server.registerTool(
    reclaimToolName("get_one_on_one"),
    buildToolDefinition({
      title: "Get Reclaim One-on-One",
      description: "Fetch details for a specific one-on-one by ID.",
      inputSchema: {
        oneOnOneId: numericIdSchema("oneOnOneId").describe(
          "The unique ID of the one-on-one to fetch.",
        ),
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ oneOnOneId }) => wrapApiCall(api.getOneOnOne(oneOnOneId)),
  );

  server.registerTool(
    reclaimToolName("update_one_on_one"),
    buildToolDefinition({
      title: "Update Reclaim One-on-One",
      description: "Update one or more fields on an existing smart one-on-one.",
      inputSchema: {
        oneOnOneId: numericIdSchema("oneOnOneId").describe(
          "The unique ID of the one-on-one to update.",
        ),
        title: oneOnOnePayloadSchema.title.optional(),
        notes: oneOnOnePayloadSchema.notes,
        inviteeId: oneOnOnePayloadSchema.inviteeId,
        inviteeEmail: oneOnOnePayloadSchema.inviteeEmail,
        eventCategory: oneOnOnePayloadSchema.eventCategory,
        eventSubType: oneOnOnePayloadSchema.eventSubType,
        priority: oneOnOnePayloadSchema.priority,
        durationMinutes: oneOnOnePayloadSchema.durationMinutes,
        minDurationMinutes: oneOnOnePayloadSchema.minDurationMinutes,
        maxDurationMinutes: oneOnOnePayloadSchema.maxDurationMinutes,
        lockChunkSizeToDuration: oneOnOnePayloadSchema.lockChunkSizeToDuration,
        timeChunksRequired: oneOnOnePayloadSchema.timeChunksRequired,
        minChunkSize: oneOnOnePayloadSchema.minChunkSize,
        maxChunkSize: oneOnOnePayloadSchema.maxChunkSize,
        onDeck: oneOnOnePayloadSchema.onDeck,
        alwaysPrivate: oneOnOnePayloadSchema.alwaysPrivate,
        timeSchemeId: oneOnOnePayloadSchema.timeSchemeId,
        status: oneOnOnePayloadSchema.status,
        deadline: oneOnOnePayloadSchema.deadline,
        due: oneOnOnePayloadSchema.due,
        start: oneOnOnePayloadSchema.start,
        end: oneOnOnePayloadSchema.end,
        startTime: oneOnOnePayloadSchema.startTime,
        endTime: oneOnOnePayloadSchema.endTime,
        snoozeUntil: oneOnOnePayloadSchema.snoozeUntil,
        eventColor: oneOnOnePayloadSchema.eventColor,
        payload: oneOnOnePayloadSchema.payload,
        query: oneOnOnePayloadSchema.query,
        timeZone: oneOnOnePayloadSchema.timeZone,
        timezone: oneOnOnePayloadSchema.timezone,
      },
      annotations: toolAnnotations({ idempotent: true }),
    }),
    async ({ oneOnOneId, payload, query, timeZone, timezone, ...updateData }) => {
      let normalized: OneOnOneInputData;
      try {
        normalized = normalizeChunkInputs(updateData);
      } catch (error) {
        return wrapApiCall(Promise.reject(error));
      }

      const mergedPayload = mergePayload(normalized, payload);
      if (Object.keys(mergedPayload).length === 0) {
        return wrapApiCall(
          Promise.reject(
            new Error(
              "Update requires at least one field to change besides oneOnOneId.",
            ),
          ),
        );
      }

      return wrapApiCall(
        api.updateOneOnOne(oneOnOneId, mergedPayload, {
          query: mergeQuery(query as ReclaimQueryParams | undefined),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      );
    },
  );

  server.registerTool(
    reclaimToolName("delete_one_on_one"),
    buildToolDefinition({
      title: "Delete Reclaim One-on-One",
      description: "Delete a smart one-on-one by ID.",
      inputSchema: {
        oneOnOneId: numericIdSchema("oneOnOneId").describe(
          "The unique ID of the one-on-one to delete.",
        ),
        query: oneOnOnePayloadSchema.query,
        timeZone: oneOnOnePayloadSchema.timeZone,
        timezone: oneOnOnePayloadSchema.timezone,
      },
      annotations: toolAnnotations({ idempotent: true, destructive: true }),
    }),
    async ({ oneOnOneId, query, timeZone, timezone }) =>
      wrapApiCall(
        api.deleteOneOnOne(oneOnOneId, {
          query: mergeQuery(query as ReclaimQueryParams | undefined),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("convert_one_on_one_auto"),
    buildToolDefinition({
      title: "Convert Reclaim One-on-One Auto",
      description:
        "Convert an existing one-on-one to an auto-managed smart one-on-one.",
      inputSchema: {
        oneOnOneId: numericIdSchema("oneOnOneId").describe(
          "The unique ID of the one-on-one to convert.",
        ),
        title: oneOnOnePayloadSchema.title.optional(),
        notes: oneOnOnePayloadSchema.notes,
        inviteeId: oneOnOnePayloadSchema.inviteeId,
        inviteeEmail: oneOnOnePayloadSchema.inviteeEmail,
        deadline: oneOnOnePayloadSchema.deadline,
        due: oneOnOnePayloadSchema.due,
        start: oneOnOnePayloadSchema.start,
        end: oneOnOnePayloadSchema.end,
        startTime: oneOnOnePayloadSchema.startTime,
        endTime: oneOnOnePayloadSchema.endTime,
        payload: oneOnOnePayloadSchema.payload,
        query: oneOnOnePayloadSchema.query,
        timeZone: oneOnOnePayloadSchema.timeZone,
        timezone: oneOnOnePayloadSchema.timezone,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ oneOnOneId, payload, query, timeZone, timezone, ...convertData }) => {
      let normalized: OneOnOneInputData;
      try {
        normalized = normalizeChunkInputs(convertData);
      } catch (error) {
        return wrapApiCall(Promise.reject(error));
      }

      return wrapApiCall(
        api.convertOneOnOneAuto(oneOnOneId, mergePayload(normalized, payload), {
          query: mergeQuery(query as ReclaimQueryParams | undefined),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      );
    },
  );

  server.registerTool(
    reclaimToolName("list_detected_one_on_ones"),
    buildToolDefinition({
      title: "List Detected Reclaim One-on-Ones",
      description: "List detected one-on-one opportunities from Reclaim.ai.",
      inputSchema: {},
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async () => wrapApiCall(api.listDetectedOneOnOnes()),
  );

  server.registerTool(
    reclaimToolName("get_one_on_one_invitee_eligibility"),
    buildToolDefinition({
      title: "Get Reclaim One-on-One Invitee Eligibility",
      description:
        "Check invitee eligibility for one-on-one invite workflows.",
      inputSchema: {
        query: oneOnOnePayloadSchema.query,
        timeZone: oneOnOnePayloadSchema.timeZone,
        timezone: oneOnOnePayloadSchema.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query, timeZone, timezone }) =>
      wrapApiCall(
        api.getOneOnOneInviteeEligibility({
          query: mergeQuery(query as ReclaimQueryParams | undefined),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("list_one_on_one_invites"),
    buildToolDefinition({
      title: "List Reclaim One-on-One Invites",
      description: "List one-on-one invites for the authenticated user.",
      inputSchema: {
        query: oneOnOnePayloadSchema.query,
        timeZone: oneOnOnePayloadSchema.timeZone,
        timezone: oneOnOnePayloadSchema.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query, timeZone, timezone }) =>
      wrapApiCall(
        api.listOneOnOneInvites({
          query: mergeQuery(query as ReclaimQueryParams | undefined),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("get_one_on_one_invite"),
    buildToolDefinition({
      title: "Get Reclaim One-on-One Invite",
      description: "Fetch details for a specific one-on-one invite by ID.",
      inputSchema: {
        inviteId: numericIdSchema("inviteId").describe(
          "The unique ID of the one-on-one invite.",
        ),
        query: oneOnOnePayloadSchema.query,
        timeZone: oneOnOnePayloadSchema.timeZone,
        timezone: oneOnOnePayloadSchema.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ inviteId, query, timeZone, timezone }) =>
      wrapApiCall(
        api.getOneOnOneInvite(inviteId, {
          query: mergeQuery(query as ReclaimQueryParams | undefined),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("list_one_on_one_suggestions"),
    buildToolDefinition({
      title: "List Reclaim One-on-One Suggestions",
      description: "List one-on-one suggestions from Reclaim.ai.",
      inputSchema: {},
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async () => wrapApiCall(api.listOneOnOneSuggestions()),
  );
}
