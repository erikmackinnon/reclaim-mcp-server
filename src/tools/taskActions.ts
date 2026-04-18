/**
 * @fileoverview Registers MCP Tools related to specific actions on Reclaim.ai tasks
 * (e.g., mark complete, delete, add time, prioritize, list tasks).
 */

import { z } from "zod";

import * as api from "../reclaim-client.js";
import {
  isoDateOrDateTimeSchema,
  numericIdSchema,
  resolveTimeZoneAlias,
  timeZoneInputSchemas,
} from "../server/schemas/shared.js";
import {
  buildToolDefinition,
  reclaimToolName,
  toolAnnotations,
} from "../server/tool-metadata.js";
import { wrapApiCall } from "../utils.js";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

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
