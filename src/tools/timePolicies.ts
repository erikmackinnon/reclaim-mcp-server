import { z } from "zod";

import * as api from "../client/domains/time-schemes-policies/index.js";
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
  .describe("Request payload for the endpoint.");
const optionalPayloadSchema = z
  .record(z.unknown())
  .optional()
  .describe("Optional advanced payload fields merged into the request body.");

const timePolicyIdSchema = z
  .union([numericIdSchema("id"), stringIdSchema("id")])
  .describe("Identifier (string or numeric, depending on endpoint).");

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

export function registerTimePolicyTools(server: McpServer): void {
  server.registerTool(
    reclaimToolName("list_time_schemes"),
    buildToolDefinition({
      title: "List Reclaim Time Schemes",
      description: "List time schemes.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.listTimeSchemes({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("create_time_scheme"),
    buildToolDefinition({
      title: "Create Reclaim Time Scheme",
      description: "Create a new time scheme.",
      inputSchema: {
        payload: payloadSchema,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ payload }) => wrapApiCall(api.createTimeScheme(payload)),
  );

  server.registerTool(
    reclaimToolName("get_time_scheme"),
    buildToolDefinition({
      title: "Get Reclaim Time Scheme",
      description: "Fetch a time scheme by ID.",
      inputSchema: {
        timeSchemeId: timePolicyIdSchema.describe("Time scheme identifier."),
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ timeSchemeId }) => wrapApiCall(api.getTimeScheme(timeSchemeId)),
  );

  server.registerTool(
    reclaimToolName("update_time_scheme"),
    buildToolDefinition({
      title: "Update Reclaim Time Scheme",
      description: "Patch an existing time scheme.",
      inputSchema: {
        timeSchemeId: timePolicyIdSchema.describe("Time scheme identifier."),
        payload: payloadSchema,
      },
      annotations: toolAnnotations({ idempotent: true }),
    }),
    async ({ timeSchemeId, payload }) =>
      wrapApiCall(api.updateTimeScheme(timeSchemeId, payload)),
  );

  server.registerTool(
    reclaimToolName("delete_time_scheme"),
    buildToolDefinition({
      title: "Delete Reclaim Time Scheme",
      description: "Delete a time scheme by ID.",
      inputSchema: {
        timeSchemeId: timePolicyIdSchema.describe("Time scheme identifier."),
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: true, destructive: true }),
    }),
    async ({ timeSchemeId, query }) =>
      wrapApiCall(
        api.deleteTimeScheme(timeSchemeId, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("list_time_scheme_feature_filters"),
    buildToolDefinition({
      title: "List Reclaim Time Scheme Feature Filters",
      description: "List time-scheme feature filters.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.listTimeSchemesFilterByFeature({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("get_time_scheme_feature_filter"),
    buildToolDefinition({
      title: "Get Reclaim Time Scheme Feature Filter",
      description: "Fetch a time-scheme feature filter by ID.",
      inputSchema: {
        featureId: timePolicyIdSchema.describe("Feature filter identifier."),
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ featureId, query }) =>
      wrapApiCall(
        api.getTimeSchemeFilterByFeature(featureId, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("list_time_scheme_rules"),
    buildToolDefinition({
      title: "List Reclaim Time Scheme Rules",
      description: "List time-scheme rules.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.listTimeSchemeRules({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("create_time_scheme_rule"),
    buildToolDefinition({
      title: "Create Reclaim Time Scheme Rule",
      description: "Create a time-scheme rule.",
      inputSchema: {
        payload: payloadSchema,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ payload }) => wrapApiCall(api.createTimeSchemeRule(payload)),
  );

  server.registerTool(
    reclaimToolName("update_time_scheme_rule"),
    buildToolDefinition({
      title: "Update Reclaim Time Scheme Rule",
      description: "Patch a time-scheme rule.",
      inputSchema: {
        timeSchemeRuleId: timePolicyIdSchema.describe(
          "Time-scheme rule identifier.",
        ),
        payload: payloadSchema,
      },
      annotations: toolAnnotations({ idempotent: true }),
    }),
    async ({ timeSchemeRuleId, payload }) =>
      wrapApiCall(api.updateTimeSchemeRule(timeSchemeRuleId, payload)),
  );

  server.registerTool(
    reclaimToolName("delete_time_scheme_rule"),
    buildToolDefinition({
      title: "Delete Reclaim Time Scheme Rule",
      description: "Delete a time-scheme rule by ID.",
      inputSchema: {
        timeSchemeRuleId: timePolicyIdSchema.describe(
          "Time-scheme rule identifier.",
        ),
      },
      annotations: toolAnnotations({ idempotent: true, destructive: true }),
    }),
    async ({ timeSchemeRuleId }) =>
      wrapApiCall(api.deleteTimeSchemeRule(timeSchemeRuleId)),
  );

  server.registerTool(
    reclaimToolName("reindex_time_scheme_rule"),
    buildToolDefinition({
      title: "Reindex Reclaim Time Scheme Rule",
      description: "Reindex a time-scheme rule.",
      inputSchema: {
        timeSchemeRuleId: timePolicyIdSchema.describe(
          "Time-scheme rule identifier.",
        ),
        payload: optionalPayloadSchema,
      },
      annotations: toolAnnotations({ idempotent: true }),
    }),
    async ({ timeSchemeRuleId, payload }) =>
      wrapApiCall(
        api.reindexTimeSchemeRule(
          timeSchemeRuleId,
          (payload as Record<string, unknown>) ?? {},
        ),
      ),
  );

  server.registerTool(
    reclaimToolName("list_account_time_schemes"),
    buildToolDefinition({
      title: "List Reclaim Account Time Schemes",
      description: "List account time schemes.",
      inputSchema: {},
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async () => wrapApiCall(api.listAccountTimeSchemes()),
  );

  server.registerTool(
    reclaimToolName("create_account_time_scheme"),
    buildToolDefinition({
      title: "Create Reclaim Account Time Scheme",
      description: "Create an account time-scheme mapping.",
      inputSchema: {
        payload: payloadSchema,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ payload }) => wrapApiCall(api.createAccountTimeScheme(payload)),
  );

  server.registerTool(
    reclaimToolName("update_account_time_scheme"),
    buildToolDefinition({
      title: "Update Reclaim Account Time Scheme",
      description: "Patch an account time-scheme mapping.",
      inputSchema: {
        accountTimeSchemeId: timePolicyIdSchema.describe(
          "Account time-scheme identifier.",
        ),
        payload: payloadSchema,
      },
      annotations: toolAnnotations({ idempotent: true }),
    }),
    async ({ accountTimeSchemeId, payload }) =>
      wrapApiCall(api.updateAccountTimeScheme(accountTimeSchemeId, payload)),
  );

  server.registerTool(
    reclaimToolName("get_effective_time_policy"),
    buildToolDefinition({
      title: "Get Reclaim Effective Time Policy",
      description:
        "Resolve the effective time policy for supplied policy context.",
      inputSchema: {
        payload: payloadSchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ payload }) => wrapApiCall(api.getEffectiveTimePolicy(payload)),
  );

  server.registerTool(
    reclaimToolName("list_time_window_overrides"),
    buildToolDefinition({
      title: "List Reclaim Time Window Overrides",
      description: "List time-window overrides.",
      inputSchema: {},
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async () => wrapApiCall(api.listTimeWindowOverrides()),
  );

  server.registerTool(
    reclaimToolName("create_time_window_override_entry"),
    buildToolDefinition({
      title: "Create Reclaim Time Window Override Entry",
      description: "Create a time-window override entry.",
      inputSchema: {
        payload: payloadSchema,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ payload }) =>
      wrapApiCall(api.createTimeWindowOverrideEntry(payload)),
  );

  server.registerTool(
    reclaimToolName("delete_time_window_override_entry"),
    buildToolDefinition({
      title: "Delete Reclaim Time Window Override Entry",
      description: "Delete a time-window override entry by ID.",
      inputSchema: {
        timeWindowOverrideEntryId: timePolicyIdSchema.describe(
          "Time-window override entry identifier.",
        ),
      },
      annotations: toolAnnotations({ idempotent: true, destructive: true }),
    }),
    async ({ timeWindowOverrideEntryId }) =>
      wrapApiCall(api.deleteTimeWindowOverrideEntry(timeWindowOverrideEntryId)),
  );

  server.registerTool(
    reclaimToolName("list_schedule_policies"),
    buildToolDefinition({
      title: "List Reclaim Schedule Policies",
      description: "List schedule policies.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.listSchedulePolicies({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("create_schedule_policy"),
    buildToolDefinition({
      title: "Create Reclaim Schedule Policy",
      description: "Create a schedule policy.",
      inputSchema: {
        payload: payloadSchema,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ payload }) => wrapApiCall(api.createSchedulePolicy(payload)),
  );

  server.registerTool(
    reclaimToolName("get_schedule_policy"),
    buildToolDefinition({
      title: "Get Reclaim Schedule Policy",
      description: "Fetch a schedule policy by ID.",
      inputSchema: {
        schedulePolicyId: timePolicyIdSchema.describe(
          "Schedule policy identifier.",
        ),
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ schedulePolicyId }) =>
      wrapApiCall(api.getSchedulePolicy(schedulePolicyId)),
  );

  server.registerTool(
    reclaimToolName("delete_schedule_policy"),
    buildToolDefinition({
      title: "Delete Reclaim Schedule Policy",
      description: "Delete a schedule policy by ID.",
      inputSchema: {
        schedulePolicyId: timePolicyIdSchema.describe(
          "Schedule policy identifier.",
        ),
      },
      annotations: toolAnnotations({ idempotent: true, destructive: true }),
    }),
    async ({ schedulePolicyId }) =>
      wrapApiCall(api.deleteSchedulePolicy(schedulePolicyId)),
  );

  server.registerTool(
    reclaimToolName("list_schedule_policy_available_types"),
    buildToolDefinition({
      title: "List Reclaim Schedule Policy Available Types",
      description: "List available schedule-policy types.",
      inputSchema: {},
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async () => wrapApiCall(api.listSchedulePolicyAvailableTypes()),
  );

  server.registerTool(
    reclaimToolName("create_default_schedule_policies"),
    buildToolDefinition({
      title: "Create Reclaim Default Schedule Policies",
      description: "Create default schedule policies for the current account.",
      inputSchema: {},
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async () => wrapApiCall(api.createDefaultSchedulePolicies()),
  );

  server.registerTool(
    reclaimToolName("list_schedule_policy_event_matcher_tags"),
    buildToolDefinition({
      title: "List Reclaim Schedule Policy Event Matcher Tags",
      description: "List available event-matcher tags for schedule policies.",
      inputSchema: {},
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async () => wrapApiCall(api.listSchedulePolicyEventMatcherTags()),
  );

  server.registerTool(
    reclaimToolName("match_schedule_policy_events"),
    buildToolDefinition({
      title: "Match Reclaim Schedule Policy Events",
      description: "Match events for a schedule policy context.",
      inputSchema: {
        payload: optionalPayloadSchema,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ payload }) =>
      wrapApiCall(
        api.matchSchedulePolicyEvents(
          (payload as Record<string, unknown>) ?? {},
        ),
      ),
  );

  server.registerTool(
    reclaimToolName("get_recommended_schedule_policy"),
    buildToolDefinition({
      title: "Get Reclaim Recommended Schedule Policy",
      description:
        "Get recommended schedule-policy values from policy context.",
      inputSchema: {
        payload: optionalPayloadSchema,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ payload }) =>
      wrapApiCall(
        api.getRecommendedSchedulePolicy(
          (payload as Record<string, unknown>) ?? {},
        ),
      ),
  );

  server.registerTool(
    reclaimToolName("list_schedule_policy_smart_meeting_candidates"),
    buildToolDefinition({
      title: "List Reclaim Schedule Policy Smart Meeting Candidates",
      description:
        "List smart-meeting candidate records for schedule-policy workflows.",
      inputSchema: {},
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async () => wrapApiCall(api.listSchedulePolicySmartMeetingCandidates()),
  );

  server.registerTool(
    reclaimToolName("list_schedule_policy_templates"),
    buildToolDefinition({
      title: "List Reclaim Schedule Policy Templates",
      description: "List schedule-policy templates.",
      inputSchema: {},
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async () => wrapApiCall(api.listSchedulePolicyTemplates()),
  );

  server.registerTool(
    reclaimToolName("instantiate_schedule_policy_meeting_quality_template"),
    buildToolDefinition({
      title: "Instantiate Reclaim Schedule Policy Meeting Quality Template",
      description: "Instantiate a meeting-quality schedule-policy template.",
      inputSchema: {
        payload: optionalPayloadSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ payload, query }) =>
      wrapApiCall(
        api.instantiateMeetingQualitySchedulePolicyTemplate(
          (payload as Record<string, unknown>) ?? {},
          {
            query: normalizeQuery(query as ReclaimQueryParams | undefined),
          },
        ),
      ),
  );

  server.registerTool(
    reclaimToolName("get_instantiated_schedule_policy_template"),
    buildToolDefinition({
      title: "Get Reclaim Instantiated Schedule Policy Template",
      description:
        "Fetch an instantiated schedule-policy template record by ID.",
      inputSchema: {
        templateId: timePolicyIdSchema.describe(
          "Instantiated template identifier.",
        ),
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ templateId }) =>
      wrapApiCall(api.getInstantiatedSchedulePolicyTemplate(templateId)),
  );
}
