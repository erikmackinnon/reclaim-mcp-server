/**
 * @fileoverview Registers MCP Tools for creating and updating Reclaim.ai tasks (CRUD operations).
 */

import { z } from "zod";

import * as api from "../reclaim-client.js";
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
const DATE_ONLY_SCHEMA = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: "Date must be in YYYY-MM-DD format.",
});
const DATE_TIME_SCHEMA = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:[zZ]|[+-]\d{2}:\d{2})?$/,
    {
      message:
        "Date/time must be ISO 8601 (YYYY-MM-DDTHH:mm with optional seconds and offset).",
    },
  );

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
  // --- Zod Schema for Task Properties (used in both create and update) ---
  const taskPropertiesSchema = {
    title: z.string().min(1, "Title cannot be empty."),
    notes: z.string().optional(),
    eventCategory: z.enum(["WORK", "PERSONAL"]).optional(),
    eventSubType: z.string().optional(), // e.g., "MEETING", "FOCUS" - API specific
    priority: z.enum(["P1", "P2", "P3", "P4"]).optional(),
    timeChunksRequired: z
      .number()
      .int()
      .positive("Time chunks must be a positive integer.")
      .optional()
      .describe(
        "Total task duration in 15-minute chunks (e.g., 60 minutes = 4 chunks).",
      ),
    durationMinutes: z
      .number()
      .int()
      .positive("Duration minutes must be a positive integer.")
      .optional()
      .describe(
        "Total task duration in minutes. Will be converted to 15-minute chunks.",
      ),
    minChunkSize: z
      .number()
      .int()
      .positive("Min chunk size must be a positive integer.")
      .optional()
      .describe(
        "Minimum chunk size in 15-minute increments. Set equal to timeChunksRequired to prevent splitting.",
      ),
    minDurationMinutes: z
      .number()
      .int()
      .positive("Min duration minutes must be a positive integer.")
      .optional()
      .describe(
        "Minimum chunk duration in minutes. Will be converted to 15-minute chunks.",
      ),
    maxChunkSize: z
      .number()
      .int()
      .positive("Max chunk size must be a positive integer.")
      .optional()
      .describe(
        "Maximum chunk size in 15-minute increments. Set equal to timeChunksRequired to prevent splitting.",
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
    onDeck: z.boolean().optional(), // Prioritize task
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
    // Deadline: number of days from now OR ISO datetime string OR YYYY-MM-DD date string
    deadline: z
      .union([
        z.number().int().positive("Deadline days must be a positive integer."),
        DATE_TIME_SCHEMA,
        DATE_ONLY_SCHEMA,
      ])
      .optional(),
    // StartTime: ISO datetime string (supports timezone offsets)
    startTime: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:[zZ]|[+-]\d{2}:\d{2})?$/,
        {
          message:
            "startTime must be ISO 8601 (YYYY-MM-DDTHH:mm with optional seconds and offset).",
        },
      )
      .optional(),
    timeZone: z
      .string()
      .optional()
      .describe(
        "IANA time zone used to interpret date/time inputs without offsets (e.g., America/Los_Angeles).",
      ),
    timezone: z.string().optional().describe("Alias for timeZone."),
    // SnoozeUntil: number of days from now OR ISO datetime string OR YYYY-MM-DD date string
    snoozeUntil: z
      .union([
        z.number().int().positive("Snooze days must be a positive integer."),
        DATE_TIME_SCHEMA,
        DATE_ONLY_SCHEMA,
      ])
      .optional(),
    eventColor: z
      .enum([
        // Based on Reclaim's standard colors
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

  // --- CREATE Task Tool ---
  server.registerTool(
    "reclaim_create_task",
    {
      title: "Create Reclaim Task",
      description: "Create a new task in Reclaim.ai.",
      // Schema for create: title is required, other properties are optional
      inputSchema: taskPropertiesSchema,
      annotations: {
        idempotentHint: false,
        destructiveHint: false,
      },
    },
    async (params) => {
      const { startTime, timeZone, timezone, ...taskData } =
        params as TaskToolInput;
      const normalized = normalizeChunkInputs(taskData);
      const resolvedTimeZone = timeZone ?? timezone;
      // The 'params' object directly matches the schema structure
      // Cast to TaskInputData for the API client (which handles 'deadline'/'due' conversion)
      if (typeof startTime === "string" && startTime.length > 0) {
        return wrapApiCall(
          api.createTaskAtTime(startTime, normalized, resolvedTimeZone),
        );
      }

      return wrapApiCall(api.createTask(normalized, resolvedTimeZone));
    },
  );

  // --- UPDATE Task Tool ---
  server.registerTool(
    "reclaim_update_task",
    {
      title: "Update Reclaim Task",
      description: "Update one or more fields on an existing Reclaim.ai task.",
      // Schema for update: requires taskId, all other properties are optional
      inputSchema: {
        taskId: z.number().int().positive("Task ID must be a positive integer."),
        // Make all properties from the base schema optional for update
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
        status: taskPropertiesSchema.status,
        deadline: taskPropertiesSchema.deadline,
        snoozeUntil: taskPropertiesSchema.snoozeUntil,
        eventColor: taskPropertiesSchema.eventColor,
      },
      annotations: {
        idempotentHint: true,
        destructiveHint: false,
      },
    },
    async (params) => {
      // Extract taskId, the rest are the update fields
      const { taskId, timeZone, timezone, ...updateData } =
        params as TaskToolInput & {
          taskId: number;
        };
      const resolvedTimeZone = timeZone ?? timezone;

      let normalized: TaskInputData;
      try {
        normalized = normalizeChunkInputs(updateData);
      } catch (error) {
        return wrapApiCall(Promise.reject(error));
      }

      // Ensure we have at least one property to update besides taskId
      if (Object.keys(normalized).length === 0) {
        // Throw an error that wrapApiCall will catch and format
        return wrapApiCall(
          Promise.reject(
            new Error(
              "Update requires at least one field to change besides taskId.",
            ),
          ),
        );
      }

      // Cast updateData to TaskInputData for the API client
      return wrapApiCall(api.updateTask(taskId, normalized, resolvedTimeZone));
    },
  );
}
