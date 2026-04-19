import { z } from "zod";

import * as api from "../client/domains/users-accounts/index.js";
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
  .describe("Request payload for the users/accounts endpoint.");

const optionalPayloadSchema = z
  .record(z.unknown())
  .optional()
  .describe(
    "Optional payload. Omit to use endpoint defaults when the API supports an empty body.",
  );

const accountIdSchema = z
  .union([numericIdSchema("accountId"), stringIdSchema("accountId")])
  .describe("Account identifier.");

const credentialIdSchema = z
  .union([numericIdSchema("credentialId"), stringIdSchema("credentialId")])
  .describe("Credential identifier.");

const delegatedAccessIdSchema = z
  .union([
    numericIdSchema("delegatedAccessId"),
    stringIdSchema("delegatedAccessId"),
  ])
  .describe("Delegated-access record identifier.");

const accessIdSchema = z
  .union([numericIdSchema("accessId"), stringIdSchema("accessId")])
  .describe("Current-user access entry identifier.");

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

export function registerUsersAccountsTools(server: McpServer): void {
  server.registerTool(
    reclaimToolName("get_current_user"),
    buildToolDefinition({
      title: "Get Current User",
      description:
        "Fetch the current authenticated user profile from /users/current.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.getCurrentUser({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("update_current_user"),
    buildToolDefinition({
      title: "Update Current User",
      description: "Patch current user profile settings via /users/current.",
      inputSchema: {
        payload: payloadSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: true }),
    }),
    async ({ payload, query }) =>
      wrapApiCall(
        api.updateCurrentUser(payload, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("list_current_user_access"),
    buildToolDefinition({
      title: "List Current User Access",
      description:
        "List self-service account access records from /users/current/access.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.listCurrentUserAccess({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("get_current_user_access"),
    buildToolDefinition({
      title: "Get Current User Access",
      description: "Get one current-user access record by id.",
      inputSchema: {
        accessId: accessIdSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ accessId, query }) =>
      wrapApiCall(
        api.getCurrentUserAccess(accessId, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("list_current_user_contacts"),
    buildToolDefinition({
      title: "List Current User Contacts",
      description: "List contacts from /users/current/contacts.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.listCurrentUserContacts({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("invite_current_user_contact"),
    buildToolDefinition({
      title: "Invite Current User Contact",
      description: "Invite contacts through /users/current/contacts/invite.",
      inputSchema: {
        payload: payloadSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ payload, query }) =>
      wrapApiCall(
        api.inviteCurrentUserContact(payload, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("invite_current_user_contact_v2"),
    buildToolDefinition({
      title: "Invite Current User Contact V2",
      description: "Invite contacts through /users/current/contacts/invite/v2.",
      inputSchema: {
        payload: payloadSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ payload, query }) =>
      wrapApiCall(
        api.inviteCurrentUserContactV2(payload, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("list_current_user_contacts_v2"),
    buildToolDefinition({
      title: "List Current User Contacts V2",
      description: "List contacts from /users/current/contacts/v2.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.listCurrentUserContactsV2({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("list_current_user_contacts_v3"),
    buildToolDefinition({
      title: "List Current User Contacts V3",
      description: "List contacts from /users/current/contacts/v3.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.listCurrentUserContactsV3({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("get_current_user_product_usage"),
    buildToolDefinition({
      title: "Get Current User Product Usage",
      description:
        "Read current product usage from /users/current/product-usage.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.getCurrentUserProductUsage({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("get_current_user_time_policies"),
    buildToolDefinition({
      title: "Get Current User Time Policies",
      description:
        "Get current user time policies from /users/current/timePolicies.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.getCurrentUserTimePolicies({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("update_current_user_time_policies"),
    buildToolDefinition({
      title: "Update Current User Time Policies",
      description: "Patch current user time policies.",
      inputSchema: {
        payload: payloadSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: true }),
    }),
    async ({ payload, query }) =>
      wrapApiCall(
        api.updateCurrentUserTimePolicies(payload, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("update_current_user_timezone_settings"),
    buildToolDefinition({
      title: "Update Current User Timezone Settings",
      description:
        "Update timezone settings via /users/current/timezone-settings.",
      inputSchema: {
        payload: payloadSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: true }),
    }),
    async ({ payload, query }) =>
      wrapApiCall(
        api.updateCurrentUserTimezoneSettings(payload, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("update_current_user_week_start_settings"),
    buildToolDefinition({
      title: "Update Current User Week Start Settings",
      description:
        "Update week-start preference via /users/current/week-start-settings.",
      inputSchema: {
        payload: payloadSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: true }),
    }),
    async ({ payload, query }) =>
      wrapApiCall(
        api.updateCurrentUserWeekStartSettings(payload, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("update_current_user_format24hour_settings"),
    buildToolDefinition({
      title: "Update Current User 24-Hour Format Settings",
      description:
        "Update 24-hour format preference via /users/current/format24hour-settings.",
      inputSchema: {
        payload: payloadSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: true }),
    }),
    async ({ payload, query }) =>
      wrapApiCall(
        api.updateCurrentUserFormat24HourSettings(payload, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("get_current_user_quest"),
    buildToolDefinition({
      title: "Get Current User Quest",
      description: "Read current user quest state from /users/current/quest.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.getCurrentUserQuest({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("update_current_user_quest"),
    buildToolDefinition({
      title: "Update Current User Quest",
      description: "Patch current user quest state.",
      inputSchema: {
        payload: payloadSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: true }),
    }),
    async ({ payload, query }) =>
      wrapApiCall(
        api.updateCurrentUserQuest(payload, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("get_current_user_referrals"),
    buildToolDefinition({
      title: "Get Current User Referrals",
      description: "Read referral data from /users/current/referrals.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.getCurrentUserReferrals({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("reset_current_user"),
    buildToolDefinition({
      title: "Reset Current User",
      description: "Trigger self-service reset via /users/current/reset.",
      inputSchema: {
        payload: optionalPayloadSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: false, destructive: true }),
    }),
    async ({ payload, query }) =>
      wrapApiCall(
        api.resetCurrentUser(payload ?? {}, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("get_current_user_restorable_features"),
    buildToolDefinition({
      title: "Get Current User Restorable Features",
      description:
        "Read restorable features from /users/current/restorable-features.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.getCurrentUserRestorableFeatures({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("restore_current_user_features"),
    buildToolDefinition({
      title: "Restore Current User Features",
      description: "Restore user features via /users/current/restore-features.",
      inputSchema: {
        payload: optionalPayloadSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ payload, query }) =>
      wrapApiCall(
        api.restoreCurrentUserFeatures(payload ?? {}, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("update_current_user_rsvp_settings"),
    buildToolDefinition({
      title: "Update Current User RSVP Settings",
      description: "Update RSVP settings via /users/current/rsvp-settings.",
      inputSchema: {
        payload: payloadSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: true }),
    }),
    async ({ payload, query }) =>
      wrapApiCall(
        api.updateCurrentUserRsvpSettings(payload, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("list_accounts"),
    buildToolDefinition({
      title: "List Accounts",
      description: "List connected accounts from /accounts.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.listAccounts({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("list_account_calendars"),
    buildToolDefinition({
      title: "List Account Calendars",
      description: "List account calendar mappings from /accounts/calendars.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.listAccountCalendars({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("validate_account"),
    buildToolDefinition({
      title: "Validate Account",
      description:
        "Validate account connection payload via /accounts/validate.",
      inputSchema: {
        payload: payloadSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ payload, query }) =>
      wrapApiCall(
        api.validateAccount(payload, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("delete_account"),
    buildToolDefinition({
      title: "Delete Account",
      description: "Delete an account connection from /accounts/{id}.",
      inputSchema: {
        accountId: accountIdSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: true, destructive: true }),
    }),
    async ({ accountId, query }) =>
      wrapApiCall(
        api.deleteAccount(accountId, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("list_credentials"),
    buildToolDefinition({
      title: "List Credentials",
      description: "List credentials from /credentials.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.listCredentials({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("get_primary_credential"),
    buildToolDefinition({
      title: "Get Primary Credential",
      description: "Fetch primary credential from /credentials/primary.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.getPrimaryCredential({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("list_personal_credentials"),
    buildToolDefinition({
      title: "List Personal Credentials",
      description: "List personal credentials from /credentials/personal.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.listPersonalCredentials({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("get_credential"),
    buildToolDefinition({
      title: "Get Credential",
      description: "Fetch one credential by id from /credentials/{id}.",
      inputSchema: {
        credentialId: credentialIdSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ credentialId, query }) =>
      wrapApiCall(
        api.getCredential(credentialId, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("delete_credential"),
    buildToolDefinition({
      title: "Delete Credential",
      description: "Delete one credential from /credentials/{id}.",
      inputSchema: {
        credentialId: credentialIdSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: true, destructive: true }),
    }),
    async ({ credentialId, query }) =>
      wrapApiCall(
        api.deleteCredential(credentialId, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("list_delegated_access"),
    buildToolDefinition({
      title: "List Delegated Access",
      description: "List delegated-access records from /delegated-access.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.listDelegatedAccess({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("create_delegated_access"),
    buildToolDefinition({
      title: "Create Delegated Access",
      description: "Create delegated access via /delegated-access.",
      inputSchema: {
        payload: payloadSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ payload, query }) =>
      wrapApiCall(
        api.createDelegatedAccess(payload, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("get_delegated_access_allowed"),
    buildToolDefinition({
      title: "Get Delegated Access Allowed",
      description:
        "Check delegated-access eligibility from /delegated-access/allowed.",
      inputSchema: {
        query: querySchema,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ query }) =>
      wrapApiCall(
        api.getDelegatedAccessAllowed({
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("toggle_delegated_access"),
    buildToolDefinition({
      title: "Toggle Delegated Access",
      description: "Toggle delegated access via /delegated-access/toggle/{id}.",
      inputSchema: {
        delegatedAccessId: delegatedAccessIdSchema,
        payload: optionalPayloadSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: true }),
    }),
    async ({ delegatedAccessId, payload, query }) =>
      wrapApiCall(
        api.toggleDelegatedAccess(delegatedAccessId, payload ?? {}, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("delete_delegated_access"),
    buildToolDefinition({
      title: "Delete Delegated Access",
      description: "Delete delegated access via /delegated-access/{id}.",
      inputSchema: {
        delegatedAccessId: delegatedAccessIdSchema,
        query: querySchema,
      },
      annotations: toolAnnotations({ idempotent: true, destructive: true }),
    }),
    async ({ delegatedAccessId, query }) =>
      wrapApiCall(
        api.deleteDelegatedAccess(delegatedAccessId, {
          query: normalizeQuery(query as ReclaimQueryParams | undefined),
        }),
      ),
  );
}
