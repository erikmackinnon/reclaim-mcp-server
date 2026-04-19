import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  ENDPOINT_REGISTRY,
  EXCLUSION_CATEGORIES,
  EXCLUSION_POLICY_NOTES,
  getEndpointBySignature,
  matchEndpointRequest,
} from "./endpoint-registry.js";
import {
  endpointSignature,
  parseApiSurfaceEndpoints,
  resolveApiSurfacePath,
} from "./test/harness/api-surface.js";

describe("endpoint registry coverage", () => {
  it("classifies every API-SURFACE endpoint and only those endpoints", () => {
    const apiSurface = readFileSync(resolveApiSurfacePath(), "utf8");

    const sourceEndpoints = parseApiSurfaceEndpoints(apiSurface);
    const sourceSignatures = new Set(sourceEndpoints.map(endpointSignature));
    const registrySignatures = new Set(
      ENDPOINT_REGISTRY.map((entry) => `${entry.method} ${entry.pathTemplate}`),
    );

    expect(registrySignatures.size).toBe(ENDPOINT_REGISTRY.length);

    const missingFromRegistry = [...sourceSignatures]
      .filter((signature) => !registrySignatures.has(signature))
      .sort();
    const unknownToSurface = [...registrySignatures]
      .filter((signature) => !sourceSignatures.has(signature))
      .sort();

    expect(missingFromRegistry).toEqual([]);
    expect(unknownToSurface).toEqual([]);
  });

  it("keeps exclusion-policy metadata attached to excluded endpoints", () => {
    for (const entry of ENDPOINT_REGISTRY) {
      if (entry.mode === "excluded") {
        expect(entry.isExcluded).toBe(true);
        expect(entry.exclusionCategory).toBeTruthy();
        expect(entry.exclusionReason).toBeTruthy();
      } else {
        expect(entry.isExcluded).toBe(false);
      }
    }
  });

  it("applies required policy categories to known routes", () => {
    expect(new Set(EXCLUSION_CATEGORIES)).toEqual(
      new Set(Object.keys(EXCLUSION_POLICY_NOTES)),
    );

    const oauthToken = getEndpointBySignature("POST", "/oauth2/token");
    expect(oauthToken?.mode).toBe("excluded");
    expect(oauthToken?.exclusionCategory).toBe("oauth");

    const apiKeyRoute = getEndpointBySignature(
      "GET",
      "/api-management/api-keys",
    );
    expect(apiKeyRoute?.mode).toBe("excluded");
    expect(apiKeyRoute?.exclusionCategory).toBe("api_key");

    const taskList = getEndpointBySignature("GET", "/tasks");
    expect(taskList?.mode).toBe("typed");
    expect(taskList?.isExcluded).toBe(false);

    const smartMeetingAvailability = getEndpointBySignature(
      "GET",
      "/smart-meetings/availability/{id}",
    );
    expect(smartMeetingAvailability?.mode).toBe("typed");
    expect(smartMeetingAvailability?.isExcluded).toBe(false);

    const oneOnOneList = getEndpointBySignature("GET", "/oneOnOne");
    expect(oneOnOneList?.mode).toBe("typed");
    expect(oneOnOneList?.isExcluded).toBe(false);

    const recentSchedulingLinks = getEndpointBySignature(
      "GET",
      "/scheduling-link/recent",
    );
    expect(recentSchedulingLinks?.mode).toBe("typed");
    expect(recentSchedulingLinks?.isExcluded).toBe(false);

    const eventsList = getEndpointBySignature("GET", "/events");
    expect(eventsList?.mode).toBe("typed");
    expect(eventsList?.isExcluded).toBe(false);

    const primaryCalendar = getEndpointBySignature("GET", "/calendars/primary");
    expect(primaryCalendar?.mode).toBe("typed");
    expect(primaryCalendar?.isExcluded).toBe(false);

    const accounts = getEndpointBySignature("GET", "/accounts");
    expect(accounts?.mode).toBe("typed");
    expect(accounts?.isExcluded).toBe(false);

    const currentUserPatch = getEndpointBySignature("PATCH", "/users/current");
    expect(currentUserPatch?.mode).toBe("typed");
    expect(currentUserPatch?.isExcluded).toBe(false);

    const userTimePoliciesPatch = getEndpointBySignature(
      "PATCH",
      "/users/current/timePolicies",
    );
    expect(userTimePoliciesPatch?.mode).toBe("typed");
    expect(userTimePoliciesPatch?.isExcluded).toBe(false);

    const timeSchemes = getEndpointBySignature("GET", "/timeschemes");
    expect(timeSchemes?.mode).toBe("typed");
    expect(timeSchemes?.isExcluded).toBe(false);

    const schedulePolicyRecommended = getEndpointBySignature(
      "POST",
      "/schedule-policy/recommended",
    );
    expect(schedulePolicyRecommended?.mode).toBe("typed");
    expect(schedulePolicyRecommended?.isExcluded).toBe(false);

    const focusSettingsUser = getEndpointBySignature(
      "GET",
      "/focus-settings/user",
    );
    expect(focusSettingsUser?.mode).toBe("typed");
    expect(focusSettingsUser?.isExcluded).toBe(false);

    const focusPlannerReschedule = getEndpointBySignature(
      "POST",
      "/focus/planner/{id}/{eventId}/reschedule",
    );
    expect(focusPlannerReschedule?.mode).toBe("typed");
    expect(focusPlannerReschedule?.isExcluded).toBe(false);

    const suggestedTimes = getEndpointBySignature(
      "POST",
      "/availability/suggested-times",
    );
    expect(suggestedTimes?.mode).toBe("typed");
    expect(suggestedTimes?.isExcluded).toBe(false);
    expect(suggestedTimes?.safety.readOnly).toBe(true);

    const idealTimeAvailability = getEndpointBySignature(
      "POST",
      "/availability/ideal-time-availability",
    );
    expect(idealTimeAvailability?.mode).toBe("typed");
    expect(idealTimeAvailability?.isExcluded).toBe(false);
    expect(idealTimeAvailability?.safety.readOnly).toBe(true);

    const watchSettings = getEndpointBySignature(
      "POST",
      "/calendars/watchSettings",
    );
    expect(watchSettings?.mode).toBe("excluded");
    expect(watchSettings?.isExcluded).toBe(true);
    expect(watchSettings?.exclusionCategory).toBe("callback_route");
  });

  it("excludes internal migration and feature-toggle/debug endpoints", () => {
    const internalRoutes = [
      ["POST", "/planner/migration/priorities"],
      [
        "POST",
        "/users/current/features/experimental-settings/look-ahead-for-smart-meeting-ideal-day-on-weekly-meetings",
      ],
      [
        "POST",
        "/users/current/features/experimental-settings/treat-optional-smart-meeting-attendees-as-free",
      ],
      ["POST", "/users/current/features/focus/debug"],
    ] as const;

    for (const [method, pathTemplate] of internalRoutes) {
      const entry = getEndpointBySignature(method, pathTemplate);
      expect(entry?.mode).toBe("excluded");
      expect(entry?.isExcluded).toBe(true);
      expect(entry?.exclusionCategory).toBe("staff");
      expect(entry?.exclusionReason).toBeTruthy();
    }
  });

  it("marks whole-table reindex-by-due as a high-risk bulk mutation", () => {
    const reindexByDue = getEndpointBySignature(
      "PATCH",
      "/tasks/reindex-by-due",
    );

    expect(reindexByDue?.safety.bulk).toBe(true);
    expect(reindexByDue?.safety.highRisk).toBe(true);
    expect(reindexByDue?.safety.readOnly).toBe(false);
    expect(reindexByDue?.safety.destructive).toBe(false);
  });

  it("marks schedule-policy default creation as mutative despite GET", () => {
    const createDefaultPolicies = getEndpointBySignature(
      "GET",
      "/schedule-policy/create-default-policies",
    );

    expect(createDefaultPolicies?.safety.readOnly).toBe(false);
    expect(createDefaultPolicies?.safety.destructive).toBe(false);
  });

  it("classifies analytics/changelog/assist WU-13 surfaces as typed while keeping high-risk assist raw", () => {
    const userAnalytics = getEndpointBySignature("GET", "/analytics/user");
    expect(userAnalytics?.mode).toBe("typed");

    const teamAnalyticsV4 = getEndpointBySignature(
      "POST",
      "/analytics/team/V4",
    );
    expect(teamAnalyticsV4?.mode).toBe("typed");
    expect(teamAnalyticsV4?.safety.readOnly).toBe(true);

    const focusInsights = getEndpointBySignature(
      "GET",
      "/analytics/focus/insights/V3",
    );
    expect(focusInsights?.mode).toBe("typed");

    const changelogRoot = getEndpointBySignature("GET", "/changelog");
    expect(changelogRoot?.mode).toBe("typed");

    const changelogSmartMeetings = getEndpointBySignature(
      "GET",
      "/changelog/smart-meetings",
    );
    expect(changelogSmartMeetings?.mode).toBe("typed");

    const interactions = getEndpointBySignature("GET", "/interactions");
    expect(interactions?.mode).toBe("typed");

    const proactiveGtdGenerate = getEndpointBySignature(
      "POST",
      "/interactions/proactive-gtd/generate",
    );
    expect(proactiveGtdGenerate?.mode).toBe("typed");

    const interpreterMessage = getEndpointBySignature(
      "POST",
      "/interpreter/message",
    );
    expect(interpreterMessage?.mode).toBe("typed");

    const scoringRescore = getEndpointBySignature("POST", "/scoring/rescore");
    expect(scoringRescore?.mode).toBe("raw");
    expect(scoringRescore?.safety.highRisk).toBe(true);
  });

  it("resolves wildcard assist-settings routes without losing explicit debug exclusions", () => {
    const wildcardAssistSettings = matchEndpointRequest(
      "POST",
      "/users/current/features/assist-settings/smart-meeting-recurrence-type",
    );
    expect(wildcardAssistSettings?.pathTemplate).toBe(
      "/users/current/features/assist-settings/*",
    );
    expect(wildcardAssistSettings?.mode).toBe("raw");

    const explicitAssistSettingsPut = matchEndpointRequest(
      "PUT",
      "/users/current/features/assist-settings/scheduling-behavior",
    );
    expect(explicitAssistSettingsPut?.pathTemplate).toBe(
      "/users/current/features/assist-settings/scheduling-behavior",
    );

    const debugRoute = matchEndpointRequest(
      "POST",
      "/users/current/features/focus/debug",
    );
    expect(debugRoute?.pathTemplate).toBe(
      "/users/current/features/focus/debug",
    );
    expect(debugRoute?.mode).toBe("excluded");
    expect(debugRoute?.exclusionCategory).toBe("staff");
  });

  it("prefers exact/static templates over parameter templates for request matching", () => {
    const batchDelete = matchEndpointRequest("DELETE", "/tasks/batch");
    expect(batchDelete?.pathTemplate).toBe("/tasks/batch");
    expect(batchDelete?.mode).toBe("typed");
  });
});
