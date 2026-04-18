import { z } from "zod";

import * as api from "../client/domains/habits/index.js";
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

import type { QueryParams } from "../client/core/http.js";
import type {
  HabitInputData,
  HabitTemplateInputData,
  ReclaimQueryParams,
  ReclaimQueryScalar,
} from "../types/reclaim.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

type HabitToolInput = HabitInputData & {
  durationMinutes?: number;
  minDurationMinutes?: number;
  maxDurationMinutes?: number;
  lockChunkSizeToDuration?: boolean;
  query?: ReclaimQueryParams;
  payload?: Record<string, unknown>;
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

function normalizeChunkInputs(input: HabitToolInput): HabitInputData {
  const data: HabitToolInput = { ...input };

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

  return data as HabitInputData;
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

function buildHabitPayloadSchema(timeZoneSchemas: {
  timeZone: z.ZodOptional<z.ZodString>;
  timezone: z.ZodOptional<z.ZodString>;
}) {
  return {
    title: z.string().min(1, "Title cannot be empty."),
    notes: z.string().optional(),
    recurrenceRule: z
      .string()
      .optional()
      .describe("Optional RFC5545 recurrence rule for recurring habit cadence."),
    frequency: z
      .string()
      .optional()
      .describe("Optional recurrence/frequency alias accepted by Reclaim."),
    eventCategory: z
      .enum(["WORK", "PERSONAL"])
      .optional()
      .describe("Habit category: WORK or PERSONAL."),
    eventSubType: z
      .string()
      .optional()
      .describe(
        "Habit subtype (Reclaim EventSubType). Examples: FOCUS, PRODUCTIVITY, OTHER_PERSONAL, ERRAND, HEALTH.",
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
        "Total habit duration in minutes. Will be converted to 15-minute chunks.",
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
        "(Advanced) Total habit duration in 15-minute chunks (NOT minutes). Prefer durationMinutes.",
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
      .describe("If true, always mark habit events as private on the calendar."),
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
      .optional(),
    due: isoDateOrDateTimeSchema
      .optional()
      .describe(
        "Explicit due date/time (ISO 8601 or YYYY-MM-DD). Prefer deadline for days-from-now inputs.",
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

export function registerHabitTools(server: McpServer): void {
  const timeZoneSchemas = timeZoneInputSchemas();
  const habitPayloadSchema = buildHabitPayloadSchema(timeZoneSchemas);

  server.registerTool(
    reclaimToolName("list_habits"),
    buildToolDefinition({
      title: "List Reclaim Habits",
      description: "List smart habits from Reclaim.ai.",
      inputSchema: {
        query: habitPayloadSchema.query,
        timeZone: habitPayloadSchema.timeZone,
        timezone: habitPayloadSchema.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query, timeZone, timezone }) =>
      wrapApiCall(
        api.listHabits({
          query: query as QueryParams | undefined,
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("create_habit"),
    buildToolDefinition({
      title: "Create Reclaim Habit",
      description: "Create a new smart habit in Reclaim.ai.",
      inputSchema: habitPayloadSchema,
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async (params) => {
      const { payload, query, timeZone, timezone, ...habitData } =
        params as HabitToolInput;
      const resolvedTimeZone = resolveTimeZoneAlias(timeZone, timezone);

      let normalized: HabitInputData;
      try {
        normalized = normalizeChunkInputs(habitData);
      } catch (error) {
        return wrapApiCall(Promise.reject(error));
      }

      return wrapApiCall(
        api.createHabit(mergePayload(normalized, payload), {
          query: query as QueryParams | undefined,
          timeZone: resolvedTimeZone,
        }),
      );
    },
  );

  server.registerTool(
    reclaimToolName("get_habit"),
    buildToolDefinition({
      title: "Get Reclaim Habit",
      description: "Fetch details for a specific Reclaim smart habit by ID.",
      inputSchema: {
        habitId: numericIdSchema("Habit ID"),
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ habitId }) => wrapApiCall(api.getHabit(habitId)),
  );

  server.registerTool(
    reclaimToolName("update_habit"),
    buildToolDefinition({
      title: "Update Reclaim Habit",
      description: "Update one or more fields on an existing smart habit.",
      inputSchema: {
        habitId: numericIdSchema("Habit ID"),
        title: habitPayloadSchema.title.optional(),
        notes: habitPayloadSchema.notes,
        recurrenceRule: habitPayloadSchema.recurrenceRule,
        frequency: habitPayloadSchema.frequency,
        eventCategory: habitPayloadSchema.eventCategory,
        eventSubType: habitPayloadSchema.eventSubType,
        priority: habitPayloadSchema.priority,
        durationMinutes: habitPayloadSchema.durationMinutes,
        minDurationMinutes: habitPayloadSchema.minDurationMinutes,
        maxDurationMinutes: habitPayloadSchema.maxDurationMinutes,
        lockChunkSizeToDuration: habitPayloadSchema.lockChunkSizeToDuration,
        timeChunksRequired: habitPayloadSchema.timeChunksRequired,
        minChunkSize: habitPayloadSchema.minChunkSize,
        maxChunkSize: habitPayloadSchema.maxChunkSize,
        onDeck: habitPayloadSchema.onDeck,
        alwaysPrivate: habitPayloadSchema.alwaysPrivate,
        timeSchemeId: habitPayloadSchema.timeSchemeId,
        status: habitPayloadSchema.status,
        deadline: habitPayloadSchema.deadline,
        due: habitPayloadSchema.due,
        start: habitPayloadSchema.start,
        end: habitPayloadSchema.end,
        startTime: habitPayloadSchema.startTime,
        endTime: habitPayloadSchema.endTime,
        snoozeUntil: habitPayloadSchema.snoozeUntil,
        eventColor: habitPayloadSchema.eventColor,
        payload: habitPayloadSchema.payload,
        query: habitPayloadSchema.query,
        timeZone: habitPayloadSchema.timeZone,
        timezone: habitPayloadSchema.timezone,
      },
      annotations: toolAnnotations({ idempotent: true }),
    }),
    async (params) => {
      const { habitId, payload, query, timeZone, timezone, ...updateData } =
        params as HabitToolInput & { habitId: number };
      const resolvedTimeZone = resolveTimeZoneAlias(timeZone, timezone);

      let normalized: HabitInputData;
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
              "Update requires at least one field to change besides habitId.",
            ),
          ),
        );
      }

      return wrapApiCall(
        api.updateHabit(habitId, mergedPayload, {
          query: query as QueryParams | undefined,
          timeZone: resolvedTimeZone,
        }),
      );
    },
  );

  server.registerTool(
    reclaimToolName("delete_habit"),
    buildToolDefinition({
      title: "Delete Reclaim Habit",
      description: "Delete a smart habit by ID.",
      inputSchema: {
        habitId: numericIdSchema("Habit ID"),
        query: habitPayloadSchema.query,
        timeZone: habitPayloadSchema.timeZone,
        timezone: habitPayloadSchema.timezone,
      },
      annotations: toolAnnotations({ idempotent: true, destructive: true }),
    }),
    async ({ habitId, query, timeZone, timezone }) =>
      wrapApiCall(
        api.deleteHabit(habitId, {
          query: query as QueryParams | undefined,
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("detect_habits"),
    buildToolDefinition({
      title: "Detect Habit Candidates",
      description:
        "Detect existing recurring events that can be converted into smart habits.",
      inputSchema: {
        start: isoDateOrDateTimeSchema.optional(),
        end: isoDateOrDateTimeSchema.optional(),
        query: habitPayloadSchema.query,
        timeZone: habitPayloadSchema.timeZone,
        timezone: habitPayloadSchema.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ start, end, query, timeZone, timezone }) =>
      wrapApiCall(
        api.detectHabits({
          query: mergeQuery(query as ReclaimQueryParams | undefined, {
            start,
            end,
          }),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("convert_habits_to_single_instances"),
    buildToolDefinition({
      title: "Convert Habits to Single Instances",
      description:
        "Convert recurring smart habits into single-instance events where supported.",
      inputSchema: {
        habitIds: z.array(numericIdSchema("Habit ID")).min(1).optional(),
        payload: habitPayloadSchema.payload,
        query: habitPayloadSchema.query,
        timeZone: habitPayloadSchema.timeZone,
        timezone: habitPayloadSchema.timezone,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ habitIds, payload, query, timeZone, timezone }) => {
      const body = mergePayload(
        habitIds ? { habitIds } : ({} as Record<string, unknown>),
        payload,
      );
      return wrapApiCall(
        api.convertHabitsToSingleInstances(body, {
          query: query as QueryParams | undefined,
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      );
    },
  );

  server.registerTool(
    reclaimToolName("share_habit"),
    buildToolDefinition({
      title: "Share Reclaim Habit",
      description: "Share a smart habit with another user or team context.",
      inputSchema: {
        habitId: numericIdSchema("Habit ID").optional(),
        targetUserId: numericIdSchema("Target User ID").optional(),
        sharedWithUserIds: z
          .array(numericIdSchema("Shared User ID"))
          .min(1)
          .optional(),
        payload: habitPayloadSchema.payload,
        query: habitPayloadSchema.query,
        timeZone: habitPayloadSchema.timeZone,
        timezone: habitPayloadSchema.timezone,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({
      habitId,
      targetUserId,
      sharedWithUserIds,
      payload,
      query,
      timeZone,
      timezone,
    }) =>
      wrapApiCall(
        api.shareHabit(
          mergePayload(
            cleanUndefinedPayload({
              habitId,
              targetUserId,
              sharedWithUserIds,
            }),
            payload as Record<string, unknown> | undefined,
          ),
          {
            query: query as QueryParams | undefined,
            timeZone: resolveTimeZoneAlias(timeZone, timezone),
          },
        ),
      ),
  );

  server.registerTool(
    reclaimToolName("get_shared_habit"),
    buildToolDefinition({
      title: "Get Shared Habit",
      description: "Fetch a shared smart habit by shared habit ID.",
      inputSchema: {
        sharedHabitId: numericIdSchema("Shared Habit ID"),
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ sharedHabitId }) => wrapApiCall(api.getSharedHabit(sharedHabitId)),
  );

  server.registerTool(
    reclaimToolName("get_shared_habit_v2"),
    buildToolDefinition({
      title: "Get Shared Habit (V2)",
      description: "Fetch shared habit details from /smart-habits/shared/v2/{id}.",
      inputSchema: {
        sharedHabitId: numericIdSchema("Shared Habit ID"),
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ sharedHabitId }) =>
      wrapApiCall(api.getSharedHabitV2(sharedHabitId)),
  );

  server.registerTool(
    reclaimToolName("get_habit_template"),
    buildToolDefinition({
      title: "Get Habit Template",
      description:
        "Read current smart habit template defaults from /smart-habits/template.",
      inputSchema: {
        query: habitPayloadSchema.query,
        timeZone: habitPayloadSchema.timeZone,
        timezone: habitPayloadSchema.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query, timeZone, timezone }) =>
      wrapApiCall(
        api.getHabitTemplate({
          query: query as QueryParams | undefined,
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("list_habit_templates"),
    buildToolDefinition({
      title: "List Habit Templates",
      description: "List smart-habit templates from /smart-habits/templates.",
      inputSchema: {
        query: habitPayloadSchema.query,
        timeZone: habitPayloadSchema.timeZone,
        timezone: habitPayloadSchema.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query, timeZone, timezone }) =>
      wrapApiCall(
        api.listHabitTemplates({
          query: query as QueryParams | undefined,
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("create_habit_from_template"),
    buildToolDefinition({
      title: "Create Habit from Template",
      description: "Create a smart habit using /smart-habits/templates/create.",
      inputSchema: {
        templateId: numericIdSchema("Template ID").optional(),
        habitId: numericIdSchema("Habit ID").optional(),
        payload: habitPayloadSchema.payload,
        query: habitPayloadSchema.query,
        timeZone: habitPayloadSchema.timeZone,
        timezone: habitPayloadSchema.timezone,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ templateId, habitId, payload, query, timeZone, timezone }) =>
      wrapApiCall(
        api.createHabitFromTemplate(
          mergePayload(cleanUndefinedPayload({ templateId, habitId }), payload),
          {
            query: query as QueryParams | undefined,
            timeZone: resolveTimeZoneAlias(timeZone, timezone),
          },
        ),
      ),
  );

  server.registerTool(
    reclaimToolName("list_smart_habit_templates"),
    buildToolDefinition({
      title: "List Smart Habit Templates",
      description:
        "List templates from /templates/smart-habit (global template library).",
      inputSchema: {
        query: habitPayloadSchema.query,
        timeZone: habitPayloadSchema.timeZone,
        timezone: habitPayloadSchema.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query, timeZone, timezone }) =>
      wrapApiCall(
        api.listSmartHabitTemplates({
          query: query as QueryParams | undefined,
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("create_smart_habit_template"),
    buildToolDefinition({
      title: "Create Smart Habit Template",
      description: "Create a template in /templates/smart-habit.",
      inputSchema: {
        title: habitPayloadSchema.title.optional(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        recurrenceRule: habitPayloadSchema.recurrenceRule,
        payload: habitPayloadSchema.payload,
        query: habitPayloadSchema.query,
        timeZone: habitPayloadSchema.timeZone,
        timezone: habitPayloadSchema.timezone,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async (params) => {
      const { payload, query, timeZone, timezone, ...templateData } = params as {
        title?: string;
        name?: string;
        description?: string;
        recurrenceRule?: string;
        payload?: Record<string, unknown>;
        query?: ReclaimQueryParams;
        timeZone?: string;
        timezone?: string;
      };
      return wrapApiCall(
        api.createSmartHabitTemplate(
          mergePayload(
            cleanUndefinedPayload(templateData) as HabitTemplateInputData,
            payload,
          ),
          {
            query: query as QueryParams | undefined,
            timeZone: resolveTimeZoneAlias(timeZone, timezone),
          },
        ),
      );
    },
  );

  server.registerTool(
    reclaimToolName("get_smart_habit_template"),
    buildToolDefinition({
      title: "Get Smart Habit Template",
      description: "Fetch /templates/smart-habit/{id}.",
      inputSchema: {
        templateId: numericIdSchema("Template ID"),
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ templateId }) => wrapApiCall(api.getSmartHabitTemplate(templateId)),
  );

  server.registerTool(
    reclaimToolName("update_smart_habit_template"),
    buildToolDefinition({
      title: "Update Smart Habit Template",
      description: "Update /templates/smart-habit/{id}.",
      inputSchema: {
        templateId: numericIdSchema("Template ID"),
        title: habitPayloadSchema.title.optional(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        recurrenceRule: habitPayloadSchema.recurrenceRule,
        payload: habitPayloadSchema.payload,
        query: habitPayloadSchema.query,
        timeZone: habitPayloadSchema.timeZone,
        timezone: habitPayloadSchema.timezone,
      },
      annotations: toolAnnotations({ idempotent: true }),
    }),
    async ({ templateId, payload, query, timeZone, timezone, ...templateData }) =>
      wrapApiCall(
        api.updateSmartHabitTemplate(
          templateId,
          mergePayload(cleanUndefinedPayload(templateData), payload),
          {
            query: query as QueryParams | undefined,
            timeZone: resolveTimeZoneAlias(timeZone, timezone),
          },
        ),
      ),
  );

  server.registerTool(
    reclaimToolName("delete_smart_habit_template"),
    buildToolDefinition({
      title: "Delete Smart Habit Template",
      description: "Delete /templates/smart-habit/{id}.",
      inputSchema: {
        templateId: numericIdSchema("Template ID"),
        query: habitPayloadSchema.query,
        timeZone: habitPayloadSchema.timeZone,
        timezone: habitPayloadSchema.timezone,
      },
      annotations: toolAnnotations({ idempotent: true, destructive: true }),
    }),
    async ({ templateId, query, timeZone, timezone }) =>
      wrapApiCall(
        api.deleteSmartHabitTemplate(templateId, {
          query: query as QueryParams | undefined,
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("list_daily_habits"),
    buildToolDefinition({
      title: "List Daily Habits",
      description:
        "List today's daily-habit assist items from /assist/habits/daily.",
      inputSchema: {
        query: habitPayloadSchema.query,
        timeZone: habitPayloadSchema.timeZone,
        timezone: habitPayloadSchema.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query, timeZone, timezone }) =>
      wrapApiCall(
        api.listDailyHabits({
          query: query as QueryParams | undefined,
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("create_daily_habit"),
    buildToolDefinition({
      title: "Create Daily Habit",
      description: "Create a daily habit assist item via /assist/habits/daily.",
      inputSchema: habitPayloadSchema,
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async (params) => {
      const { payload, query, timeZone, timezone, ...dailyData } =
        params as HabitToolInput;
      const resolvedTimeZone = resolveTimeZoneAlias(timeZone, timezone);

      let normalized: HabitInputData;
      try {
        normalized = normalizeChunkInputs(dailyData);
      } catch (error) {
        return wrapApiCall(Promise.reject(error));
      }

      return wrapApiCall(
        api.createDailyHabit(mergePayload(normalized, payload), {
          query: query as QueryParams | undefined,
          timeZone: resolvedTimeZone,
        }),
      );
    },
  );

  server.registerTool(
    reclaimToolName("get_daily_habit"),
    buildToolDefinition({
      title: "Get Daily Habit",
      description: "Fetch a daily habit assist item by ID.",
      inputSchema: {
        dailyHabitId: numericIdSchema("Daily Habit ID"),
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ dailyHabitId }) => wrapApiCall(api.getDailyHabit(dailyHabitId)),
  );

  server.registerTool(
    reclaimToolName("replace_daily_habit"),
    buildToolDefinition({
      title: "Replace Daily Habit",
      description:
        "Replace a daily habit assist item using PUT /assist/habits/daily/{id}.",
      inputSchema: {
        dailyHabitId: numericIdSchema("Daily Habit ID"),
        title: habitPayloadSchema.title.optional(),
        notes: habitPayloadSchema.notes,
        recurrenceRule: habitPayloadSchema.recurrenceRule,
        frequency: habitPayloadSchema.frequency,
        eventCategory: habitPayloadSchema.eventCategory,
        eventSubType: habitPayloadSchema.eventSubType,
        priority: habitPayloadSchema.priority,
        durationMinutes: habitPayloadSchema.durationMinutes,
        minDurationMinutes: habitPayloadSchema.minDurationMinutes,
        maxDurationMinutes: habitPayloadSchema.maxDurationMinutes,
        lockChunkSizeToDuration: habitPayloadSchema.lockChunkSizeToDuration,
        timeChunksRequired: habitPayloadSchema.timeChunksRequired,
        minChunkSize: habitPayloadSchema.minChunkSize,
        maxChunkSize: habitPayloadSchema.maxChunkSize,
        onDeck: habitPayloadSchema.onDeck,
        alwaysPrivate: habitPayloadSchema.alwaysPrivate,
        timeSchemeId: habitPayloadSchema.timeSchemeId,
        status: habitPayloadSchema.status,
        deadline: habitPayloadSchema.deadline,
        due: habitPayloadSchema.due,
        start: habitPayloadSchema.start,
        end: habitPayloadSchema.end,
        startTime: habitPayloadSchema.startTime,
        endTime: habitPayloadSchema.endTime,
        snoozeUntil: habitPayloadSchema.snoozeUntil,
        eventColor: habitPayloadSchema.eventColor,
        payload: habitPayloadSchema.payload,
        query: habitPayloadSchema.query,
        timeZone: habitPayloadSchema.timeZone,
        timezone: habitPayloadSchema.timezone,
      },
      annotations: toolAnnotations({ idempotent: true }),
    }),
    async ({
      dailyHabitId,
      payload,
      query,
      timeZone,
      timezone,
      ...dailyData
    }) => {
      const resolvedTimeZone = resolveTimeZoneAlias(timeZone, timezone);
      let normalized: HabitInputData;
      try {
        normalized = normalizeChunkInputs(dailyData as HabitToolInput);
      } catch (error) {
        return wrapApiCall(Promise.reject(error));
      }

      return wrapApiCall(
        api.replaceDailyHabit(dailyHabitId, mergePayload(normalized, payload), {
          query: query as QueryParams | undefined,
          timeZone: resolvedTimeZone,
        }),
      );
    },
  );

  server.registerTool(
    reclaimToolName("update_daily_habit"),
    buildToolDefinition({
      title: "Update Daily Habit",
      description:
        "Partially update a daily habit assist item using PATCH /assist/habits/daily/{id}.",
      inputSchema: {
        dailyHabitId: numericIdSchema("Daily Habit ID"),
        title: habitPayloadSchema.title.optional(),
        notes: habitPayloadSchema.notes,
        recurrenceRule: habitPayloadSchema.recurrenceRule,
        frequency: habitPayloadSchema.frequency,
        eventCategory: habitPayloadSchema.eventCategory,
        eventSubType: habitPayloadSchema.eventSubType,
        priority: habitPayloadSchema.priority,
        durationMinutes: habitPayloadSchema.durationMinutes,
        minDurationMinutes: habitPayloadSchema.minDurationMinutes,
        maxDurationMinutes: habitPayloadSchema.maxDurationMinutes,
        lockChunkSizeToDuration: habitPayloadSchema.lockChunkSizeToDuration,
        timeChunksRequired: habitPayloadSchema.timeChunksRequired,
        minChunkSize: habitPayloadSchema.minChunkSize,
        maxChunkSize: habitPayloadSchema.maxChunkSize,
        onDeck: habitPayloadSchema.onDeck,
        alwaysPrivate: habitPayloadSchema.alwaysPrivate,
        timeSchemeId: habitPayloadSchema.timeSchemeId,
        status: habitPayloadSchema.status,
        deadline: habitPayloadSchema.deadline,
        due: habitPayloadSchema.due,
        start: habitPayloadSchema.start,
        end: habitPayloadSchema.end,
        startTime: habitPayloadSchema.startTime,
        endTime: habitPayloadSchema.endTime,
        snoozeUntil: habitPayloadSchema.snoozeUntil,
        eventColor: habitPayloadSchema.eventColor,
        payload: habitPayloadSchema.payload,
        query: habitPayloadSchema.query,
        timeZone: habitPayloadSchema.timeZone,
        timezone: habitPayloadSchema.timezone,
      },
      annotations: toolAnnotations({ idempotent: true }),
    }),
    async ({
      dailyHabitId,
      payload,
      query,
      timeZone,
      timezone,
      ...dailyData
    }) => {
      const resolvedTimeZone = resolveTimeZoneAlias(timeZone, timezone);
      let normalized: HabitInputData;
      try {
        normalized = normalizeChunkInputs(dailyData as HabitToolInput);
      } catch (error) {
        return wrapApiCall(Promise.reject(error));
      }

      return wrapApiCall(
        api.updateDailyHabit(dailyHabitId, mergePayload(normalized, payload), {
          query: query as QueryParams | undefined,
          timeZone: resolvedTimeZone,
        }),
      );
    },
  );

  server.registerTool(
    reclaimToolName("delete_daily_habit"),
    buildToolDefinition({
      title: "Delete Daily Habit",
      description: "Delete a daily habit assist item by ID.",
      inputSchema: {
        dailyHabitId: numericIdSchema("Daily Habit ID"),
        query: habitPayloadSchema.query,
        timeZone: habitPayloadSchema.timeZone,
        timezone: habitPayloadSchema.timezone,
      },
      annotations: toolAnnotations({ idempotent: true, destructive: true }),
    }),
    async ({ dailyHabitId, query, timeZone, timezone }) =>
      wrapApiCall(
        api.deleteDailyHabit(dailyHabitId, {
          query: query as QueryParams | undefined,
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("get_assist_habit_template"),
    buildToolDefinition({
      title: "Get Assist Habit Template",
      description: "Read /assist/habits/template.",
      inputSchema: {
        query: habitPayloadSchema.query,
        timeZone: habitPayloadSchema.timeZone,
        timezone: habitPayloadSchema.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query, timeZone, timezone }) =>
      wrapApiCall(
        api.getAssistHabitTemplate({
          query: query as QueryParams | undefined,
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("create_assist_habit_template"),
    buildToolDefinition({
      title: "Create Assist Habit Template",
      description: "Create a new assist habit template using /assist/habits/template/create.",
      inputSchema: {
        payload: z
          .record(z.unknown())
          .optional()
          .describe("Request payload for assist habit template creation."),
        query: habitPayloadSchema.query,
        timeZone: habitPayloadSchema.timeZone,
        timezone: habitPayloadSchema.timezone,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ payload, query, timeZone, timezone }) =>
      wrapApiCall(
        api.createAssistHabitTemplate(payload ?? {}, {
          query: query as QueryParams | undefined,
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("list_assist_habit_templates"),
    buildToolDefinition({
      title: "List Assist Habit Templates",
      description: "List /assist/habits/templates.",
      inputSchema: {
        query: habitPayloadSchema.query,
        timeZone: habitPayloadSchema.timeZone,
        timezone: habitPayloadSchema.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query, timeZone, timezone }) =>
      wrapApiCall(
        api.listAssistHabitTemplates({
          query: query as QueryParams | undefined,
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );
}

function cleanUndefinedPayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...payload };
  for (const [key, value] of Object.entries(copy)) {
    if (value === undefined) {
      delete copy[key];
    }
  }
  return copy;
}
