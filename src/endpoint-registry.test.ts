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
    expect(batchDelete?.mode).toBe("raw");
  });
});
