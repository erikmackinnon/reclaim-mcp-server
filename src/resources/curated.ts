import { reclaimHttpClient } from "../client/core/http.js";
import { ReclaimError } from "../types/reclaim.js";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";

async function wrapResourceCall(
  uri: string,
  promise: Promise<unknown>,
): Promise<ReadResourceResult> {
  try {
    const result = await promise;
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error: unknown) {
    let message = "Failed to fetch resource data.";
    let detail: string | undefined;

    if (error instanceof ReclaimError) {
      message = error.message;
      detail = error.detail ? JSON.stringify(error.detail) : undefined;
    } else if (error instanceof Error) {
      message = error.message;
    } else {
      message = String(error);
    }

    console.error(
      `MCP Resource Error (URI: ${uri}): ${message}`,
      detail ? `\nDetail: ${detail}` : "",
    );

    throw new Error(`Failed to fetch resource ${uri}: ${message}`);
  }
}

export function registerCuratedResources(server: McpServer): void {
  server.registerResource(
    "reclaim_current_user_profile",
    "reclaim://users/current",
    {
      title: "Current Reclaim User Profile",
      description:
        "Current authenticated user profile and settings snapshot from /users/current.",
      mimeType: "application/json",
    },
    async (uri: URL) =>
      wrapResourceCall(
        uri.href,
        reclaimHttpClient.get("/users/current", {
          context: "resourceCurrentUserProfile",
        }),
      ),
  );

  server.registerResource(
    "reclaim_daily_habits",
    "reclaim://habits/daily",
    {
      title: "Daily Habits",
      description:
        "Daily habits snapshot from /assist/habits/daily for the current account.",
      mimeType: "application/json",
    },
    async (uri: URL) =>
      wrapResourceCall(
        uri.href,
        reclaimHttpClient.get("/assist/habits/daily", {
          context: "resourceDailyHabits",
        }),
      ),
  );

  server.registerResource(
    "reclaim_focus_settings_current",
    "reclaim://focus/settings/current",
    {
      title: "Current Focus Settings",
      description:
        "Current user focus settings snapshot from /focus-settings/user.",
      mimeType: "application/json",
    },
    async (uri: URL) =>
      wrapResourceCall(
        uri.href,
        reclaimHttpClient.get("/focus-settings/user", {
          context: "resourceCurrentFocusSettings",
        }),
      ),
  );

  server.registerResource(
    "reclaim_team_current",
    "reclaim://team/current",
    {
      title: "Current Team Snapshot",
      description: "Current non-admin team snapshot from /team/current.",
      mimeType: "application/json",
    },
    async (uri: URL) =>
      wrapResourceCall(
        uri.href,
        reclaimHttpClient.get("/team/current", {
          context: "resourceCurrentTeam",
        }),
      ),
  );
}
