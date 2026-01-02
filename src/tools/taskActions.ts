/**
 * @fileoverview Registers MCP Tools related to specific actions on Reclaim.ai tasks
 * (e.g., mark complete, delete, add time, prioritize, list tasks).
 */

import { z } from "zod";

import * as api from "../reclaim-client.js";
import { wrapApiCall } from "../utils.js"; // Import the centralized helper

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Registers all task action-related tools with the provided MCP Server instance.
 * Each tool corresponds to a specific Reclaim API endpoint for task manipulation or querying.
 * Uses the (name, schema, handler) signature for server.tool.
 *
 * @param server - The McpServer instance to register tools against.
 */
export function registerTaskActionTools(server: McpServer): void {
  // --- Common Schemas ---
  const taskIdSchema = z
    .number()
    .int()
    .positive("Task ID must be a positive integer.");
  const endDateSchema = z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/, {
      message: "End date must be in YYYY-MM-DD format.",
    },
  );
  const endDateTimeSchema = z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:[zZ]|[+-]\d{2}:\d{2})?$/,
      {
        message:
          "End time must be ISO 8601 (YYYY-MM-DDTHH:mm with optional seconds and offset).",
      },
    );
  const statusNote =
    "IMPORTANT NOTE: Tasks with 'status: COMPLETE' were NOT marked complete by the user. This means the user finished the initial block of time allocated to the task but did NOT finish the task. If asked to list all tasks or all active tasks, include each 'COMPLETE' task unless the user requests otherwise. Do NOT skip 'COMPLETE' tasks.";
  const getTaskStatusNote =
    "Note: If 'status' is 'COMPLETE', this means the task is NOT marked completed by the user. ARCHIVED or CANCELLED is used for completed tasks. A 'COMPLETE' task is still 'active'.";

  // --- Tool Definitions ---

  server.registerTool(
    "reclaim_get_task_defaults",
    {
      title: "Get Reclaim Task Defaults",
      description:
        "Fetch account-level Reclaim task defaults (chunk sizes, priority defaults, etc.).",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        destructiveHint: false,
      },
    },
    async () => wrapApiCall(api.getTaskDefaults()),
  );

  // List tasks tool (Ported from return_tasks flag in prior JS implementation)
  server.registerTool(
    "reclaim_list_tasks",
    {
      title: "List Reclaim Tasks",
      description:
        "List Reclaim.ai tasks, optionally filtering for active ones (not deleted, ARCHIVED, or CANCELLED).",
      // Zod schema for parameters
      inputSchema: {
        filter: z
          .enum(["active", "all"])
          .optional()
          .default("active")
          .describe(
            'Filter tasks: "active" (default) includes non-deleted tasks whose status is not ARCHIVED or CANCELLED; "all" includes all tasks.',
          ),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        destructiveHint: false,
      },
    },
    // Async handler function
    async ({ filter }) => {
      const allTasksPromise = api.listTasks();

      // Conditionally apply filter based on input
      const processedTasksPromise = allTasksPromise.then((tasks) => {
        if (filter === "active") {
          return api.filterActiveTasks(tasks);
        } else {
          // filter === 'all'
          return tasks;
        }
      });

      // Wrap the API call and add the explanatory note to the output content
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

  // Get specific task tool
  server.registerTool(
    "reclaim_get_task",
    {
      title: "Get Reclaim Task",
      description: "Fetch details for a specific Reclaim.ai task by its ID.",
      // Zod schema for parameters
      inputSchema: {
        taskId: taskIdSchema.describe("The unique ID of the task to fetch."),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        destructiveHint: false,
      },
    },
    // Async handler function using wrapApiCall
    async ({ taskId }) => {
      // Wrap the API call and add the explanatory note to the output content
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

  // Mark task complete tool
  server.registerTool(
    "reclaim_mark_complete",
    {
      title: "Mark Reclaim Task Complete",
      description: "Mark a specific Reclaim.ai task as completed/done by the user.",
      inputSchema: {
        taskId: taskIdSchema.describe(
          "The unique ID of the task to mark as complete.",
        ),
      },
      annotations: {
        idempotentHint: true,
        destructiveHint: false,
      },
    },
    async ({ taskId }) => wrapApiCall(api.markTaskComplete(taskId)),
  );

  // Mark task incomplete tool
  server.registerTool(
    "reclaim_mark_incomplete",
    {
      title: "Mark Reclaim Task Incomplete",
      description: "Mark a specific Reclaim.ai task as incomplete (unarchive it).",
      inputSchema: {
        taskId: taskIdSchema.describe(
          "The unique ID of the task to mark as incomplete (unarchive).",
        ),
      },
      annotations: {
        idempotentHint: true,
        destructiveHint: false,
      },
    },
    async ({ taskId }) => wrapApiCall(api.markTaskIncomplete(taskId)),
  );

  // Delete task tool
  server.registerTool(
    "reclaim_delete_task",
    {
      title: "Delete Reclaim Task",
      description: "Permanently delete a specific Reclaim.ai task.",
      inputSchema: {
        taskId: taskIdSchema.describe("The unique ID of the task to delete."),
      },
      annotations: {
        idempotentHint: true,
        destructiveHint: true,
      },
    },
    async ({ taskId }) => wrapApiCall(api.deleteTask(taskId)),
  );

  // Add time to task tool
  server.registerTool(
    "reclaim_add_time",
    {
      title: "Add Time to Reclaim Task",
      description: "Add scheduled time (in minutes) to a specific Reclaim.ai task.",
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
      annotations: {
        idempotentHint: false,
        destructiveHint: false,
      },
    },
    async ({ taskId, minutes }) =>
      wrapApiCall(api.addTimeToTask(taskId, minutes)),
  );

  // Start task timer tool
  server.registerTool(
    "reclaim_start_timer",
    {
      title: "Start Reclaim Task Timer",
      description: "Start the live timer for a specific Reclaim.ai task.",
      inputSchema: {
        taskId: taskIdSchema.describe(
          "The unique ID of the task to start the timer for.",
        ),
      },
      annotations: {
        idempotentHint: true,
        destructiveHint: false,
      },
    },
    async ({ taskId }) => wrapApiCall(api.startTaskTimer(taskId)),
  );

  // Stop task timer tool
  server.registerTool(
    "reclaim_stop_timer",
    {
      title: "Stop Reclaim Task Timer",
      description: "Stop the live timer for a specific Reclaim.ai task.",
      inputSchema: {
        taskId: taskIdSchema.describe(
          "The unique ID of the task to stop the timer for.",
        ),
      },
      annotations: {
        idempotentHint: true,
        destructiveHint: false,
      },
    },
    async ({ taskId }) => wrapApiCall(api.stopTaskTimer(taskId)),
  );

  // Log work for task tool
  server.registerTool(
    "reclaim_log_work",
    {
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
        // Schema accepts ISO datetime string or YYYY-MM-DD date string
        end: z
          .union([endDateTimeSchema, endDateSchema])
          .optional()
          .describe(
            "Optional end time/date of the work log (ISO 8601 or YYYY-MM-DD). Defaults to now.",
          ),
        timeZone: z
          .string()
          .optional()
          .describe(
            "IANA time zone used to interpret end time without an offset (e.g., America/Los_Angeles).",
          ),
        timezone: z.string().optional().describe("Alias for timeZone."),
      },
      annotations: {
        idempotentHint: false,
        destructiveHint: false,
      },
    },
    async ({ taskId, minutes, end, timeZone, timezone }) =>
      wrapApiCall(
        api.logWorkForTask(taskId, minutes, end, timeZone ?? timezone),
      ),
  );

  // Clear task exceptions tool
  server.registerTool(
    "reclaim_clear_exceptions",
    {
      title: "Clear Reclaim Task Exceptions",
      description:
        "Clear any scheduling exceptions for a specific Reclaim.ai task.",
      inputSchema: {
        taskId: taskIdSchema.describe(
          "The unique ID of the task whose scheduling exceptions should be cleared.",
        ),
      },
      annotations: {
        idempotentHint: true,
        destructiveHint: false,
      },
    },
    async ({ taskId }) => wrapApiCall(api.clearTaskExceptions(taskId)),
  );

  // Prioritize task tool
  server.registerTool(
    "reclaim_prioritize",
    {
      title: "Prioritize Reclaim Task",
      description: "Mark a specific Reclaim.ai task for prioritization.",
      inputSchema: {
        taskId: taskIdSchema.describe(
          "The unique ID of the task to prioritize.",
        ),
      },
      annotations: {
        idempotentHint: true,
        destructiveHint: false,
      },
    },
    async ({ taskId }) => wrapApiCall(api.prioritizeTask(taskId)),
  );
}
