/**
 * @fileoverview Registers MCP Tools related to specific actions on Reclaim.ai tasks
 * (e.g., mark complete, delete, add time, prioritize, list tasks).
 */

import { z } from "zod";

import * as api from "../reclaim-client.js";
import {
  bulkNumericIdsSchema,
  isoDateOrDateTimeSchema,
  numericIdSchema,
  plannerEventIdSchema,
  resolveTimeZoneAlias,
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

const CHUNK_MINUTES = 15;

type BatchPatchToolInput = TaskInputData & {
  durationMinutes?: number;
  minDurationMinutes?: number;
  maxDurationMinutes?: number;
  lockChunkSizeToDuration?: boolean;
};

function minutesToChunks(value: number, field: string): number {
  if (value % CHUNK_MINUTES !== 0) {
    throw new Error(
      `${field} must be a multiple of ${CHUNK_MINUTES} minutes. Example: 60 minutes = 4 chunks.`,
    );
  }
  return value / CHUNK_MINUTES;
}

function normalizeBatchPatchInputs(input: BatchPatchToolInput): TaskInputData {
  const patch: BatchPatchToolInput = { ...input };

  if (typeof patch.durationMinutes === "number") {
    patch.timeChunksRequired = minutesToChunks(
      patch.durationMinutes,
      "durationMinutes",
    );
  }

  if (typeof patch.minDurationMinutes === "number") {
    patch.minChunkSize = minutesToChunks(
      patch.minDurationMinutes,
      "minDurationMinutes",
    );
  }

  if (typeof patch.maxDurationMinutes === "number") {
    patch.maxChunkSize = minutesToChunks(
      patch.maxDurationMinutes,
      "maxDurationMinutes",
    );
  }

  if (patch.lockChunkSizeToDuration) {
    if (typeof patch.timeChunksRequired !== "number") {
      throw new Error(
        "lockChunkSizeToDuration requires timeChunksRequired or durationMinutes.",
      );
    }
    patch.minChunkSize = patch.timeChunksRequired;
    patch.maxChunkSize = patch.timeChunksRequired;
  }

  delete patch.durationMinutes;
  delete patch.minDurationMinutes;
  delete patch.maxDurationMinutes;
  delete patch.lockChunkSizeToDuration;

  return patch as TaskInputData;
}

/**
 * Registers all task action-related tools with the provided MCP Server instance.
 * Each tool corresponds to a specific Reclaim API endpoint for task manipulation or querying.
 * Uses the (name, schema, handler) signature for server.tool.
 *
 * @param server - The McpServer instance to register tools against.
 */
export function registerTaskActionTools(server: McpServer): void {
  const taskIdSchema = numericIdSchema("Task ID");
  const timeZoneSchemas = timeZoneInputSchemas(
    "IANA time zone used to interpret end time without an offset (e.g., America/Los_Angeles).",
  );
  const statusNote =
    "IMPORTANT NOTE: Tasks with 'status: COMPLETE' were NOT marked complete by the user. This means the user finished the initial block of time allocated to the task but did NOT finish the task. If asked to list all tasks or all active tasks, include each 'COMPLETE' task unless the user requests otherwise. Do NOT skip 'COMPLETE' tasks.";
  const getTaskStatusNote =
    "Note: If 'status' is 'COMPLETE', this means the task is NOT marked completed by the user. ARCHIVED or CANCELLED is used for completed tasks. A 'COMPLETE' task is still 'active'.";

  server.registerTool(
    reclaimToolName("get_task_defaults"),
    buildToolDefinition({
      title: "Get Reclaim Task Defaults",
      description:
        "Fetch account-level Reclaim task defaults (chunk sizes, priority defaults, etc.).",
      inputSchema: {},
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async () => wrapApiCall(api.getTaskDefaults()),
  );

  server.registerTool(
    reclaimToolName("list_tasks"),
    buildToolDefinition({
      title: "List Reclaim Tasks",
      description:
        "List Reclaim.ai tasks, optionally filtering for active ones (not deleted, ARCHIVED, or CANCELLED).",
      inputSchema: {
        filter: z
          .enum(["active", "all"])
          .optional()
          .default("active")
          .describe(
            'Filter tasks: "active" (default) includes non-deleted tasks whose status is not ARCHIVED or CANCELLED; "all" includes all tasks.',
          ),
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ filter }) => {
      const allTasksPromise = api.listTasks();

      const processedTasksPromise = allTasksPromise.then((tasks) => {
        if (filter === "active") {
          return api.filterActiveTasks(tasks);
        }
        return tasks;
      });

      const result = await wrapApiCall(processedTasksPromise);
      if (!result.isError && result.content) {
        result.content.push({
          type: "text",
          text: statusNote,
        });
      }
      return result;
    },
  );

  server.registerTool(
    reclaimToolName("get_task"),
    buildToolDefinition({
      title: "Get Reclaim Task",
      description: "Fetch details for a specific Reclaim.ai task by its ID.",
      inputSchema: {
        taskId: taskIdSchema.describe("The unique ID of the task to fetch."),
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ taskId }) => {
      const result = await wrapApiCall(api.getTask(taskId));
      if (!result.isError && result.content) {
        result.content.push({
          type: "text",
          text: getTaskStatusNote,
        });
      }
      return result;
    },
  );

  server.registerTool(
    reclaimToolName("get_task_min_index"),
    buildToolDefinition({
      title: "Get Reclaim Task Min Index",
      description:
        "Fetch the current lowest task index value used for ordering.",
      inputSchema: {},
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async () => wrapApiCall(api.getTaskMinIndex()),
  );

  server.registerTool(
    reclaimToolName("list_recommended_tasks"),
    buildToolDefinition({
      title: "List Reclaim Recommended Tasks",
      description:
        "List smart task recommendations from Reclaim's recommendation endpoint.",
      inputSchema: {
        limit: z
          .number()
          .int()
          .min(1, "limit must be at least 1.")
          .max(200, "limit cannot exceed 200.")
          .optional(),
        offset: z
          .number()
          .int()
          .min(0, "offset cannot be negative.")
          .optional(),
        onDeck: z
          .boolean()
          .optional()
          .describe("Filter to on-deck recommendations where supported."),
        includeArchived: z
          .boolean()
          .optional()
          .describe("Include archived tasks where supported by the endpoint."),
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ limit, offset, onDeck, includeArchived }) =>
      wrapApiCall(
        api.getRecommendedTasks({
          limit,
          offset,
          onDeck,
          includeArchived,
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("batch_update_tasks"),
    buildToolDefinition({
      title: "Batch Update Reclaim Tasks",
      description:
        "Apply the same patch update to multiple task IDs in one request.",
      inputSchema: {
        taskIds: bulkNumericIdsSchema("taskIds").describe(
          "Task IDs to update in bulk (maximum 200).",
        ),
        title: z.string().min(1, "Title cannot be empty.").optional(),
        notes: z.string().optional(),
        eventCategory: z.enum(["WORK", "PERSONAL"]).optional(),
        eventSubType: z.string().optional(),
        priority: z
          .enum(["P1", "P2", "P3", "P4", "PRIORITIZE", "DEFAULT"])
          .optional(),
        durationMinutes: z
          .number()
          .int()
          .positive("Duration minutes must be a positive integer.")
          .optional(),
        minDurationMinutes: z
          .number()
          .int()
          .positive("Minimum duration minutes must be a positive integer.")
          .optional(),
        maxDurationMinutes: z
          .number()
          .int()
          .positive("Maximum duration minutes must be a positive integer.")
          .optional(),
        lockChunkSizeToDuration: z.boolean().optional(),
        timeChunksRequired: z.number().int().positive().optional(),
        minChunkSize: z.number().int().positive().optional(),
        maxChunkSize: z.number().int().positive().optional(),
        onDeck: z.boolean().optional(),
        alwaysPrivate: z.boolean().optional(),
        timeSchemeId: z.string().min(1).optional(),
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
            z.number().int().positive("Deadline days must be positive."),
            isoDateOrDateTimeSchema,
          ])
          .optional(),
        due: isoDateOrDateTimeSchema.optional(),
        snoozeUntil: z
          .union([
            z.number().int().positive("Snooze days must be positive."),
            isoDateOrDateTimeSchema,
          ])
          .optional(),
        eventColor: z.string().optional(),
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ idempotent: true, destructive: true }),
    }),
    async ({ taskIds, timeZone, timezone, ...patchInput }) => {
      let normalizedPatch: TaskInputData;
      try {
        normalizedPatch = normalizeBatchPatchInputs(patchInput);
      } catch (error) {
        return wrapApiCall(Promise.reject(error));
      }

      return wrapApiCall(
        api.batchUpdateTasks(
          {
            taskIds,
            updates: normalizedPatch,
          },
          resolveTimeZoneAlias(timeZone, timezone),
        ),
      );
    },
  );

  server.registerTool(
    reclaimToolName("batch_delete_tasks"),
    buildToolDefinition({
      title: "Batch Delete Reclaim Tasks",
      description:
        "Permanently delete multiple tasks in one operation (destructive bulk action).",
      inputSchema: {
        taskIds: bulkNumericIdsSchema("taskIds").describe(
          "Task IDs to permanently delete (maximum 200).",
        ),
      },
      annotations: toolAnnotations({ idempotent: true, destructive: true }),
    }),
    async ({ taskIds }) => wrapApiCall(api.batchDeleteTasks({ taskIds })),
  );

  server.registerTool(
    reclaimToolName("batch_archive_tasks"),
    buildToolDefinition({
      title: "Batch Archive Reclaim Tasks",
      description:
        "Archive multiple tasks in one operation (bulk lifecycle mutation).",
      inputSchema: {
        taskIds: bulkNumericIdsSchema("taskIds").describe(
          "Task IDs to archive in bulk (maximum 200).",
        ),
      },
      annotations: toolAnnotations({ idempotent: true, destructive: true }),
    }),
    async ({ taskIds }) => wrapApiCall(api.batchArchiveTasks({ taskIds })),
  );

  server.registerTool(
    reclaimToolName("batch_complete_tasks"),
    buildToolDefinition({
      title: "Batch Complete Reclaim Tasks",
      description:
        "Mark multiple tasks complete in one operation (bulk lifecycle mutation).",
      inputSchema: {
        taskIds: bulkNumericIdsSchema("taskIds").describe(
          "Task IDs to mark complete in bulk (maximum 200).",
        ),
      },
      annotations: toolAnnotations({ idempotent: true, destructive: true }),
    }),
    async ({ taskIds }) => wrapApiCall(api.batchCompleteTasks({ taskIds })),
  );

  server.registerTool(
    reclaimToolName("reindex_tasks_by_due"),
    buildToolDefinition({
      title: "Reindex Reclaim Tasks By Due Date",
      description:
        "Reindex all tasks according to due date ordering (bulk scheduling mutation).",
      inputSchema: {},
      annotations: toolAnnotations({ idempotent: true, destructive: true }),
    }),
    async () => wrapApiCall(api.reindexTasksByDue()),
  );

  server.registerTool(
    reclaimToolName("reindex_task"),
    buildToolDefinition({
      title: "Reindex Reclaim Task",
      description: "Reindex a single task, optionally at a target index.",
      inputSchema: {
        taskId: taskIdSchema.describe("Task ID to reindex."),
        index: z
          .number()
          .int()
          .min(0, "index cannot be negative.")
          .optional()
          .describe("Optional target index."),
      },
      annotations: toolAnnotations({ idempotent: true }),
    }),
    async ({ taskId, index }) => wrapApiCall(api.reindexTask(taskId, index)),
  );

  server.registerTool(
    reclaimToolName("plan_work"),
    buildToolDefinition({
      title: "Plan Work For Reclaim Task",
      description:
        "Trigger planner plan-work for a task, with optional minutes/end constraints.",
      inputSchema: {
        taskId: taskIdSchema.describe("Task ID to plan work for."),
        minutes: z
          .number()
          .int()
          .positive("Minutes must be a positive integer.")
          .optional(),
        end: isoDateOrDateTimeSchema.optional(),
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ taskId, minutes, end, timeZone, timezone }) =>
      wrapApiCall(
        api.planWorkTask(
          taskId,
          { minutes, end },
          resolveTimeZoneAlias(timeZone, timezone),
        ),
      ),
  );

  server.registerTool(
    reclaimToolName("restart_task"),
    buildToolDefinition({
      title: "Restart Reclaim Task",
      description:
        "Restart planner scheduling for a task, with optional minutes/end constraints.",
      inputSchema: {
        taskId: taskIdSchema.describe("Task ID to restart."),
        minutes: z
          .number()
          .int()
          .positive("Minutes must be a positive integer.")
          .optional(),
        end: isoDateOrDateTimeSchema.optional(),
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ taskId, minutes, end, timeZone, timezone }) =>
      wrapApiCall(
        api.restartTask(
          taskId,
          { minutes, end },
          resolveTimeZoneAlias(timeZone, timezone),
        ),
      ),
  );

  server.registerTool(
    reclaimToolName("reschedule_task_event"),
    buildToolDefinition({
      title: "Reschedule Reclaim Task Event",
      description:
        "Reschedule a specific task planner event using planner event IDs and optional local-time inputs.",
      inputSchema: {
        plannerEventId: plannerEventIdSchema,
        eventId: plannerEventIdSchema.optional(),
        at: isoDateOrDateTimeSchema.optional(),
        from: isoDateOrDateTimeSchema.optional(),
        to: isoDateOrDateTimeSchema.optional(),
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ plannerEventId, eventId, at, from, to, timeZone, timezone }) =>
      wrapApiCall(
        api.rescheduleTaskEvent(
          plannerEventId,
          {
            eventId,
            at,
            from,
            to,
          },
          resolveTimeZoneAlias(timeZone, timezone),
        ),
      ),
  );

  server.registerTool(
    reclaimToolName("bulk_reschedule_task_events"),
    buildToolDefinition({
      title: "Bulk Reschedule Reclaim Task Events",
      description:
        "Reschedule multiple task planner events in one request (bulk scheduling mutation).",
      inputSchema: {
        plannerEventIds: z
          .array(plannerEventIdSchema)
          .min(1)
          .max(200)
          .describe("Planner event IDs to reschedule in bulk."),
        at: isoDateOrDateTimeSchema.optional(),
        from: isoDateOrDateTimeSchema.optional(),
        to: isoDateOrDateTimeSchema.optional(),
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ idempotent: false, destructive: true }),
    }),
    async ({ plannerEventIds, at, from, to, timeZone, timezone }) =>
      wrapApiCall(
        api.bulkRescheduleTaskEvents(
          {
            plannerEventIds,
            at,
            from,
            to,
          },
          resolveTimeZoneAlias(timeZone, timezone),
        ),
      ),
  );

  server.registerTool(
    reclaimToolName("mark_complete"),
    buildToolDefinition({
      title: "Mark Reclaim Task Complete",
      description:
        "Mark a specific Reclaim.ai task as completed/done by the user.",
      inputSchema: {
        taskId: taskIdSchema.describe(
          "The unique ID of the task to mark as complete.",
        ),
      },
      annotations: toolAnnotations({ idempotent: true }),
    }),
    async ({ taskId }) => wrapApiCall(api.markTaskComplete(taskId)),
  );

  server.registerTool(
    reclaimToolName("mark_incomplete"),
    buildToolDefinition({
      title: "Mark Reclaim Task Incomplete",
      description:
        "Mark a specific Reclaim.ai task as incomplete (unarchive it).",
      inputSchema: {
        taskId: taskIdSchema.describe(
          "The unique ID of the task to mark as incomplete (unarchive).",
        ),
      },
      annotations: toolAnnotations({ idempotent: true }),
    }),
    async ({ taskId }) => wrapApiCall(api.markTaskIncomplete(taskId)),
  );

  server.registerTool(
    reclaimToolName("delete_task"),
    buildToolDefinition({
      title: "Delete Reclaim Task",
      description: "Permanently delete a specific Reclaim.ai task.",
      inputSchema: {
        taskId: taskIdSchema.describe("The unique ID of the task to delete."),
      },
      annotations: toolAnnotations({ idempotent: true, destructive: true }),
    }),
    async ({ taskId }) => wrapApiCall(api.deleteTask(taskId)),
  );

  server.registerTool(
    reclaimToolName("add_time"),
    buildToolDefinition({
      title: "Add Time to Reclaim Task",
      description:
        "Add scheduled time (in minutes) to a specific Reclaim.ai task.",
      inputSchema: {
        taskId: taskIdSchema.describe(
          "The unique ID of the task to add time to.",
        ),
        minutes: z
          .number()
          .int()
          .positive("Minutes must be a positive integer.")
          .describe("Number of minutes to add to the task schedule."),
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ taskId, minutes }) =>
      wrapApiCall(api.addTimeToTask(taskId, minutes)),
  );

  server.registerTool(
    reclaimToolName("start_timer"),
    buildToolDefinition({
      title: "Start Reclaim Task Timer",
      description: "Start the live timer for a specific Reclaim.ai task.",
      inputSchema: {
        taskId: taskIdSchema.describe(
          "The unique ID of the task to start the timer for.",
        ),
      },
      annotations: toolAnnotations({ idempotent: true }),
    }),
    async ({ taskId }) => wrapApiCall(api.startTaskTimer(taskId)),
  );

  server.registerTool(
    reclaimToolName("stop_timer"),
    buildToolDefinition({
      title: "Stop Reclaim Task Timer",
      description: "Stop the live timer for a specific Reclaim.ai task.",
      inputSchema: {
        taskId: taskIdSchema.describe(
          "The unique ID of the task to stop the timer for.",
        ),
      },
      annotations: toolAnnotations({ idempotent: true }),
    }),
    async ({ taskId }) => wrapApiCall(api.stopTaskTimer(taskId)),
  );

  server.registerTool(
    reclaimToolName("log_work"),
    buildToolDefinition({
      title: "Log Work for Reclaim Task",
      description:
        "Log completed work time (in minutes) against a specific Reclaim.ai task.",
      inputSchema: {
        taskId: taskIdSchema.describe(
          "The unique ID of the task to log work against.",
        ),
        minutes: z
          .number()
          .int()
          .positive("Minutes must be a positive integer.")
          .describe("Number of minutes worked."),
        end: isoDateOrDateTimeSchema
          .optional()
          .describe(
            "Optional end time/date of the work log (ISO 8601 or YYYY-MM-DD). Defaults to now.",
          ),
        timeZone: timeZoneSchemas.timeZone,
        timezone: timeZoneSchemas.timezone,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ taskId, minutes, end, timeZone, timezone }) =>
      wrapApiCall(
        api.logWorkForTask(
          taskId,
          minutes,
          end,
          resolveTimeZoneAlias(timeZone, timezone),
        ),
      ),
  );

  server.registerTool(
    reclaimToolName("clear_exceptions"),
    buildToolDefinition({
      title: "Clear Reclaim Task Exceptions",
      description:
        "Clear any scheduling exceptions for a specific Reclaim.ai task.",
      inputSchema: {
        taskId: taskIdSchema.describe(
          "The unique ID of the task whose scheduling exceptions should be cleared.",
        ),
      },
      annotations: toolAnnotations({ idempotent: true }),
    }),
    async ({ taskId }) => wrapApiCall(api.clearTaskExceptions(taskId)),
  );

  server.registerTool(
    reclaimToolName("prioritize"),
    buildToolDefinition({
      title: "Prioritize Reclaim Task",
      description: "Mark a specific Reclaim.ai task for prioritization.",
      inputSchema: {
        taskId: taskIdSchema.describe(
          "The unique ID of the task to prioritize.",
        ),
      },
      annotations: toolAnnotations({ idempotent: true }),
    }),
    async ({ taskId }) => wrapApiCall(api.prioritizeTask(taskId)),
  );
}
