import { z } from "zod";

import * as api from "../client/domains/scheduling-links/index.js";
import { numericIdSchema, stringIdSchema } from "../server/schemas/shared.js";
import {
  buildToolDefinition,
  reclaimToolName,
  toolAnnotations,
} from "../server/tool-metadata.js";
import { wrapApiCall } from "../utils.js";

import type { QueryParams } from "../client/core/http.js";
import type { ReclaimQueryParams } from "../types/reclaim.js";
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
const querySchema = z
  .record(queryValueSchema)
  .optional()
  .describe(
    "Optional query parameters. Values may be string/number/boolean/null or arrays of those primitives.",
  );
const payloadSchema = z
  .record(z.unknown())
  .describe("Request payload for the scheduling-link endpoint.");
const schedulingLinkIdSchema = z
  .union([
    numericIdSchema("schedulingLinkId"),
    stringIdSchema("schedulingLinkId"),
  ])
  .describe("Scheduling link identifier.");
const userIdSchema = z
  .union([numericIdSchema("userId"), stringIdSchema("userId")])
  .describe("User identifier used by scheduling-link user slug lookups.");
const userSlugIdSchema = z
  .union([numericIdSchema("userSlugId"), stringIdSchema("userSlugId")])
  .describe("User slug identifier.");
const groupIdSchema = z
  .union([numericIdSchema("groupId"), stringIdSchema("groupId")])
  .describe("Group scheduling link identifier.");
const groupSlugIdSchema = z
  .union([numericIdSchema("groupSlugId"), stringIdSchema("groupSlugId")])
  .describe("Group scheduling link slug identifier.");
const meetingIdSchema = z
  .union([numericIdSchema("meetingId"), stringIdSchema("meetingId")])
  .describe("Scheduling-link meeting identifier.");

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

export function registerSchedulingLinkTools(server: McpServer): void {
  server.registerTool(
    reclaimToolName("list_scheduling_links"),
    buildToolDefinition({
      title: "List Reclaim Scheduling Links",
      description: "List scheduling links visible to the authenticated user.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.listSchedulingLinks({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("create_scheduling_link"),
    buildToolDefinition({
      title: "Create Reclaim Scheduling Link",
      description: "Create a scheduling link.",
      inputSchema: {
        payload: payloadSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ payload, query }) =>
      wrapApiCall(
        api.createSchedulingLink(payload, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("get_scheduling_link"),
    buildToolDefinition({
      title: "Get Reclaim Scheduling Link",
      description: "Fetch one scheduling link by ID.",
      inputSchema: {
        schedulingLinkId: schedulingLinkIdSchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ schedulingLinkId }) =>
      wrapApiCall(api.getSchedulingLink(schedulingLinkId)),
  );

  server.registerTool(
    reclaimToolName("update_scheduling_link"),
    buildToolDefinition({
      title: "Update Reclaim Scheduling Link",
      description: "Patch an existing scheduling link.",
      inputSchema: {
        schedulingLinkId: schedulingLinkIdSchema,
        payload: payloadSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: true }),
    }),
    async ({ schedulingLinkId, payload, query }) =>
      wrapApiCall(
        api.updateSchedulingLink(schedulingLinkId, payload, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("delete_scheduling_link"),
    buildToolDefinition({
      title: "Delete Reclaim Scheduling Link",
      description: "Delete a scheduling link by ID.",
      inputSchema: {
        schedulingLinkId: schedulingLinkIdSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: true, destructive: true }),
    }),
    async ({ schedulingLinkId, query }) =>
      wrapApiCall(
        api.deleteSchedulingLink(schedulingLinkId, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("create_scheduling_link_derivative"),
    buildToolDefinition({
      title: "Create Reclaim Scheduling Link Derivative",
      description:
        "Create a derivative scheduling-link payload from an existing schedule context.",
      inputSchema: {
        payload: payloadSchema,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ payload }) =>
      wrapApiCall(api.createSchedulingLinkDerivative(payload)),
  );

  server.registerTool(
    reclaimToolName("get_scheduling_link_effective_time_policy"),
    buildToolDefinition({
      title: "Get Reclaim Scheduling Link Effective Time Policy",
      description:
        "Resolve the effective scheduling-link time policy from supplied inputs.",
      inputSchema: {
        payload: payloadSchema,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ payload }) =>
      wrapApiCall(api.getSchedulingLinkEffectiveTimePolicy(payload)),
  );

  server.registerTool(
    reclaimToolName("get_scheduling_link_for_user_link_slug"),
    buildToolDefinition({
      title: "Get Reclaim Scheduling Link For User Link Slug",
      description: "Resolve a scheduling link for a user-link slug query.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.getSchedulingLinkForUserLinkSlug({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("get_scheduling_link_for_user_slug"),
    buildToolDefinition({
      title: "Get Reclaim Scheduling Link For User Slug",
      description: "Resolve scheduling links for a specific user identifier.",
      inputSchema: {
        userId: userIdSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ userId, query }) =>
      wrapApiCall(
        api.getSchedulingLinkForUserSlug(userId, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("list_recent_scheduling_links"),
    buildToolDefinition({
      title: "List Recent Reclaim Scheduling Links",
      description:
        "List recently accessed or used scheduling links for the current user.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.listRecentSchedulingLinks({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("check_scheduling_link_slug_exists"),
    buildToolDefinition({
      title: "Check Reclaim Scheduling Link Slug Exists",
      description: "Check whether a scheduling-link slug already exists.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.checkSchedulingLinkSlugExists({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("list_scheduling_link_user_slugs"),
    buildToolDefinition({
      title: "List Reclaim Scheduling Link User Slugs",
      description: "List user-slug entries for scheduling links.",
      inputSchema: {},
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async () => wrapApiCall(api.listSchedulingLinkUserSlugs()),
  );

  server.registerTool(
    reclaimToolName("create_scheduling_link_user_slug"),
    buildToolDefinition({
      title: "Create Reclaim Scheduling Link User Slug",
      description: "Create or reserve a scheduling-link user slug.",
      inputSchema: {
        payload: payloadSchema,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ payload }) =>
      wrapApiCall(api.createSchedulingLinkUserSlug(payload)),
  );

  server.registerTool(
    reclaimToolName("get_scheduling_link_user_slug"),
    buildToolDefinition({
      title: "Get Reclaim Scheduling Link User Slug",
      description: "Fetch one scheduling-link user-slug record by ID.",
      inputSchema: {
        userSlugId: userSlugIdSchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ userSlugId }) =>
      wrapApiCall(api.getSchedulingLinkUserSlug(userSlugId)),
  );

  server.registerTool(
    reclaimToolName("check_scheduling_link_user_slug_exists"),
    buildToolDefinition({
      title: "Check Reclaim Scheduling Link User Slug Exists",
      description: "Check whether a scheduling-link user slug already exists.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.checkSchedulingLinkUserSlugExists({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("list_scheduling_link_groups"),
    buildToolDefinition({
      title: "List Reclaim Scheduling Link Groups",
      description: "List scheduling-link groups.",
      inputSchema: {},
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async () => wrapApiCall(api.listSchedulingLinkGroups()),
  );

  server.registerTool(
    reclaimToolName("create_scheduling_link_group"),
    buildToolDefinition({
      title: "Create Reclaim Scheduling Link Group",
      description: "Create a scheduling-link group.",
      inputSchema: {
        payload: payloadSchema,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ payload }) => wrapApiCall(api.createSchedulingLinkGroup(payload)),
  );

  server.registerTool(
    reclaimToolName("get_scheduling_link_group_by_slug"),
    buildToolDefinition({
      title: "Get Reclaim Scheduling Link Group By Slug",
      description: "Fetch one scheduling-link group by slug identifier.",
      inputSchema: {
        groupSlugId: groupSlugIdSchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ groupSlugId }) =>
      wrapApiCall(api.getSchedulingLinkGroupBySlug(groupSlugId)),
  );

  server.registerTool(
    reclaimToolName("update_scheduling_link_group"),
    buildToolDefinition({
      title: "Update Reclaim Scheduling Link Group",
      description: "Patch a scheduling-link group by ID.",
      inputSchema: {
        groupId: groupIdSchema,
        payload: payloadSchema,
      },
      annotations: toolAnnotations({ idempotent: true }),
    }),
    async ({ groupId, payload }) =>
      wrapApiCall(api.updateSchedulingLinkGroup(groupId, payload)),
  );

  server.registerTool(
    reclaimToolName("delete_scheduling_link_group"),
    buildToolDefinition({
      title: "Delete Reclaim Scheduling Link Group",
      description: "Delete a scheduling-link group by ID.",
      inputSchema: {
        groupId: groupIdSchema,
      },
      annotations: toolAnnotations({ idempotent: true, destructive: true }),
    }),
    async ({ groupId }) => wrapApiCall(api.deleteSchedulingLinkGroup(groupId)),
  );

  server.registerTool(
    reclaimToolName("get_scheduling_link_meeting"),
    buildToolDefinition({
      title: "Get Reclaim Scheduling Link Meeting",
      description: "Fetch a meeting-level scheduling-link record by ID.",
      inputSchema: {
        meetingId: meetingIdSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ meetingId, query }) =>
      wrapApiCall(
        api.getSchedulingLinkMeeting(meetingId, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("update_scheduling_link_meeting"),
    buildToolDefinition({
      title: "Update Reclaim Scheduling Link Meeting",
      description: "Patch a meeting-level scheduling-link record by ID.",
      inputSchema: {
        meetingId: meetingIdSchema,
        payload: payloadSchema,
      },
      annotations: toolAnnotations({ idempotent: true }),
    }),
    async ({ meetingId, payload }) =>
      wrapApiCall(api.updateSchedulingLinkMeeting(meetingId, payload)),
  );

  server.registerTool(
    reclaimToolName("delete_scheduling_link_meeting"),
    buildToolDefinition({
      title: "Delete Reclaim Scheduling Link Meeting",
      description: "Delete a meeting-level scheduling-link record by ID.",
      inputSchema: {
        meetingId: meetingIdSchema,
      },
      annotations: toolAnnotations({ idempotent: true, destructive: true }),
    }),
    async ({ meetingId }) =>
      wrapApiCall(api.deleteSchedulingLinkMeeting(meetingId)),
  );

  server.registerTool(
    reclaimToolName("refresh_scheduling_link_meeting"),
    buildToolDefinition({
      title: "Refresh Reclaim Scheduling Link Meeting",
      description: "Refresh a scheduling-link meeting record by ID.",
      inputSchema: {
        meetingId: meetingIdSchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ meetingId }) =>
      wrapApiCall(api.refreshSchedulingLinkMeeting(meetingId)),
  );

  server.registerTool(
    reclaimToolName("get_participant_resolution"),
    buildToolDefinition({
      title: "Get Reclaim Participant Resolution",
      description: "Resolve participant records for scheduling contexts.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.getParticipantResolution({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("get_participant_resolution_scheduling_link"),
    buildToolDefinition({
      title: "Get Reclaim Participant Resolution For Scheduling Link",
      description:
        "Resolve participant records scoped to scheduling-link workflows.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.getParticipantResolutionForSchedulingLink({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );
}
