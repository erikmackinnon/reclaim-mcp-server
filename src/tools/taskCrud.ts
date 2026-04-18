/**
 * @fileoverview Registers MCP Tools for creating and updating Reclaim.ai tasks (CRUD operations).
 */

import { z } from "zod";

import * as api from "../reclaim-client.js";
import {
  isoDateOrDateTimeSchema,
  isoDateTimeSchema,
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

import type { TaskInputData } from "../types/reclaim.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

type TaskToolInput = TaskInputData & {
  startTime?: string;
  durationMinutes?: number;
  minDurationMinutes?: number;
  maxDurationMinutes?: number;
  lockChunkSizeToDuration?: boolean;
  timeZone?: string;
  timezone?: string;
};

const CHUNK_MINUTES = 15;

function minutesToChunks(value: number, field: string): number {
  if (value % CHUNK_MINUTES !== 0) {
    throw new Error(
      `${field} must be a multiple of ${CHUNK_MINUTES} minutes. Example: 60 minutes = 4 chunks.`,
    );
  }
  return value / CHUNK_MINUTES;
}

function normalizeChunkInputs(input: TaskToolInput): TaskInputData {
  const data: TaskToolInput = { ...input };

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
  delete data.startTime;
  delete data.timeZone;
  delete data.timezone;

  return data as TaskInputData;
}

/**
 * Registers task creation and update tools with the provided MCP Server instance.
 * Uses the (name, schema, handler) signature for server.tool.
 *
 * @param server - The McpServer instance to register tools against.
 */
export function registerTaskCrudTools(server: McpServer): void {
  const timeZoneSchemas = timeZoneInputSchemas();

  const taskPropertiesSchema = {
    title: z.string().min(1, "Title cannot be empty."),
    notes: z.string().optional(),
    eventCategory: z
      .enum(["WORK", "PERSONAL"])
      .optional()
      .describe("Task category: WORK or PERSONAL."),
    eventSubType: z
      .string()
      .optional()
      .describe(
        "Task subtype (Reclaim EventSubType). Examples: FOCUS, PRODUCTIVITY, OTHER_PERSONAL, ERRAND, HEALTH.",
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
        "Total task duration in minutes. Will be converted to 15-minute chunks.",
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
        "(Advanced) Total task duration in 15-minute chunks (NOT minutes). Prefer durationMinutes.",
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
      .describe("If true, always mark task events as private on the calendar."),
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
    startTime: isoDateTimeSchema
      .optional()
      .describe(
        "ISO 8601 datetime with optional offset. Used by reclaim_create_task for /tasks/at-time behavior.",
      ),
    timeZone: timeZoneSchemas.timeZone,
    timezone: timeZoneSchemas.timezone,
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
  };

  server.registerTool(
    reclaimToolName("create_task"),
    buildToolDefinition({
      title: "Create Reclaim Task",
      description: "Create a new task in Reclaim.ai.",
      inputSchema: taskPropertiesSchema,
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async (params) => {
      const { startTime, timeZone, timezone, ...taskData } =
        params as TaskToolInput;
      let normalized: TaskInputData;
      try {
        normalized = normalizeChunkInputs(taskData);
      } catch (error) {
        return wrapApiCall(Promise.reject(error));
      }
      const resolvedTimeZone = resolveTimeZoneAlias(timeZone, timezone);

      if (typeof startTime === "string" && startTime.length > 0) {
        return wrapApiCall(
          api.createTaskAtTime(startTime, normalized, resolvedTimeZone),
        );
      }

      return wrapApiCall(api.createTask(normalized, resolvedTimeZone));
    },
  );

  server.registerTool(
    reclaimToolName("update_task"),
    buildToolDefinition({
      title: "Update Reclaim Task",
      description: "Update one or more fields on an existing Reclaim.ai task.",
      inputSchema: {
        taskId: numericIdSchema("Task ID"),
        title: taskPropertiesSchema.title.optional(),
        notes: taskPropertiesSchema.notes,
        eventCategory: taskPropertiesSchema.eventCategory,
        eventSubType: taskPropertiesSchema.eventSubType,
        priority: taskPropertiesSchema.priority,
        timeChunksRequired: taskPropertiesSchema.timeChunksRequired,
        durationMinutes: taskPropertiesSchema.durationMinutes,
        minChunkSize: taskPropertiesSchema.minChunkSize,
        minDurationMinutes: taskPropertiesSchema.minDurationMinutes,
        maxChunkSize: taskPropertiesSchema.maxChunkSize,
        maxDurationMinutes: taskPropertiesSchema.maxDurationMinutes,
        lockChunkSizeToDuration: taskPropertiesSchema.lockChunkSizeToDuration,
        timeZone: taskPropertiesSchema.timeZone,
        timezone: taskPropertiesSchema.timezone,
        onDeck: taskPropertiesSchema.onDeck,
        alwaysPrivate: taskPropertiesSchema.alwaysPrivate,
        timeSchemeId: taskPropertiesSchema.timeSchemeId,
        status: taskPropertiesSchema.status,
        deadline: taskPropertiesSchema.deadline,
        due: taskPropertiesSchema.due,
        snoozeUntil: taskPropertiesSchema.snoozeUntil,
        eventColor: taskPropertiesSchema.eventColor,
      },
      annotations: toolAnnotations({ idempotent: true }),
    }),
    async (params) => {
      const { taskId, timeZone, timezone, ...updateData } =
        params as TaskToolInput & {
          taskId: number;
        };
      const resolvedTimeZone = resolveTimeZoneAlias(timeZone, timezone);

      let normalized: TaskInputData;
      try {
        normalized = normalizeChunkInputs(updateData);
      } catch (error) {
        return wrapApiCall(Promise.reject(error));
      }

      if (Object.keys(normalized).length === 0) {
        return wrapApiCall(
          Promise.reject(
            new Error(
              "Update requires at least one field to change besides taskId.",
            ),
          ),
        );
      }

      return wrapApiCall(api.updateTask(taskId, normalized, resolvedTimeZone));
    },
  );
}
