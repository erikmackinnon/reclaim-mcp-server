import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { expectNormalizedReclaimError } from "../../../test/harness/assertions.js";
import {
  installNockLifecycle,
  reclaimApiPath,
  reclaimApiScope,
} from "../../../test/harness/nock.js";
import {
  createAccountTimeScheme,
  createDefaultSchedulePolicies,
  createSchedulePolicy,
  createTimeScheme,
  createTimeSchemeRule,
  createTimeWindowOverrideEntry,
  deleteSchedulePolicy,
  deleteTimeScheme,
  deleteTimeSchemeRule,
  deleteTimeWindowOverrideEntry,
  getEffectiveTimePolicy,
  getInstantiatedSchedulePolicyTemplate,
  getRecommendedSchedulePolicy,
  getSchedulePolicy,
  getTimeScheme,
  getTimeSchemeFilterByFeature,
  instantiateMeetingQualitySchedulePolicyTemplate,
  listAccountTimeSchemes,
  listSchedulePolicies,
  listSchedulePolicyAvailableTypes,
  listSchedulePolicyEventMatcherTags,
  listSchedulePolicySmartMeetingCandidates,
  listSchedulePolicyTemplates,
  listTimeSchemeRules,
  listTimeSchemes,
  listTimeSchemesFilterByFeature,
  listTimeWindowOverrides,
  matchSchedulePolicyEvents,
  reindexTimeSchemeRule,
  updateAccountTimeScheme,
  updateTimeScheme,
  updateTimeSchemeRule,
} from "./client.js";

const ORIGINAL_API_KEY = process.env.RECLAIM_API_KEY;

installNockLifecycle();

describe("time schemes and schedule policies domain client contracts", () => {
  beforeEach(() => {
    process.env.RECLAIM_API_KEY = "test-token";
  });

  afterEach(() => {
    if (ORIGINAL_API_KEY === undefined) {
      delete process.env.RECLAIM_API_KEY;
    } else {
      process.env.RECLAIM_API_KEY = ORIGINAL_API_KEY;
    }
  });

  it("covers time schemes CRUD and feature filters", async () => {
    reclaimApiScope()
      .get(reclaimApiPath("/timeschemes"))
      .query({ q: "focus" })
      .reply(200, [{ id: "ts-1", name: "Focus" }]);

    reclaimApiScope()
      .post(
        reclaimApiPath("/timeschemes"),
        (body: Record<string, unknown>) =>
          body.name === "Focus" && body.color === "BLUE",
      )
      .reply(200, { id: "ts-1", name: "Focus" });

    reclaimApiScope()
      .get(reclaimApiPath("/timeschemes/ts-1"))
      .reply(200, { id: "ts-1", name: "Focus" });

    reclaimApiScope()
      .patch(reclaimApiPath("/timeschemes/ts-1"), {
        name: "Focus Updated",
      })
      .reply(200, { id: "ts-1", name: "Focus Updated" });

    reclaimApiScope()
      .delete(reclaimApiPath("/timeschemes/ts-1"))
      .query({ force: true })
      .reply(204);

    reclaimApiScope()
      .get(reclaimApiPath("/timeschemes/filter-by-feature"))
      .query({ feature: "scheduling" })
      .reply(200, [{ id: "ts-1" }, { id: "ts-2" }]);

    reclaimApiScope()
      .get(reclaimApiPath("/timeschemes/filter-by-feature/focus"))
      .query({ includeDefaults: true })
      .reply(200, { id: "ts-1", feature: "focus" });

    const schemes = await listTimeSchemes({ query: { q: "focus" } });
    expect(schemes).toHaveLength(1);

    const created = await createTimeScheme({ name: "Focus", color: "BLUE" });
    expect(created.id).toBe("ts-1");

    const fetched = await getTimeScheme("ts-1");
    expect(fetched.name).toBe("Focus");

    const updated = await updateTimeScheme("ts-1", { name: "Focus Updated" });
    expect(updated.name).toBe("Focus Updated");

    await deleteTimeScheme("ts-1", { query: { force: true } });

    const filtered = await listTimeSchemesFilterByFeature({
      query: { feature: "scheduling" },
    });
    expect(filtered).toHaveLength(2);

    const filteredById = await getTimeSchemeFilterByFeature("focus", {
      query: { includeDefaults: true },
    });
    expect(filteredById.feature).toBe("focus");
  });

  it("covers time scheme rule CRUD and reindex routes", async () => {
    reclaimApiScope()
      .get(reclaimApiPath("/timescheme/rules"))
      .query({ timeSchemeId: "ts-1" })
      .reply(200, [{ id: "rule-1", index: 1 }]);

    reclaimApiScope()
      .post(
        reclaimApiPath("/timescheme/rules"),
        (body: Record<string, unknown>) =>
          body.timeSchemeId === "ts-1" && body.dayOfWeek === "MONDAY",
      )
      .reply(200, { id: "rule-1", index: 1 });

    reclaimApiScope()
      .patch(reclaimApiPath("/timescheme/rules/rule-1"), {
        dayOfWeek: "TUESDAY",
      })
      .reply(200, { id: "rule-1", dayOfWeek: "TUESDAY" });

    reclaimApiScope()
      .delete(reclaimApiPath("/timescheme/rules/rule-1"))
      .reply(204);

    reclaimApiScope()
      .patch(reclaimApiPath("/timescheme/rules/rule-1/reindex"), {
        index: 2,
      })
      .reply(200, { id: "rule-1", index: 2 });

    const rules = await listTimeSchemeRules({
      query: { timeSchemeId: "ts-1" },
    });
    expect(rules).toHaveLength(1);

    const created = await createTimeSchemeRule({
      timeSchemeId: "ts-1",
      dayOfWeek: "MONDAY",
    });
    expect(created.id).toBe("rule-1");

    const updated = await updateTimeSchemeRule("rule-1", {
      dayOfWeek: "TUESDAY",
    });
    expect(updated.dayOfWeek).toBe("TUESDAY");

    await deleteTimeSchemeRule("rule-1");

    const reindexed = await reindexTimeSchemeRule("rule-1", { index: 2 });
    expect(reindexed.index).toBe(2);
  });

  it("covers account/effective-time-policy and time-window override routes", async () => {
    reclaimApiScope()
      .get(reclaimApiPath("/account-time-schemes"))
      .reply(200, [{ id: "ats-1", timeSchemeId: "ts-1" }]);

    reclaimApiScope()
      .post(
        reclaimApiPath("/account-time-schemes"),
        (body: Record<string, unknown>) => body.timeSchemeId === "ts-1",
      )
      .reply(200, { id: "ats-1", timeSchemeId: "ts-1" });

    reclaimApiScope()
      .patch(reclaimApiPath("/account-time-schemes/ats-1"), {
        enabled: true,
      })
      .reply(200, { id: "ats-1", enabled: true });

    reclaimApiScope()
      .post(
        reclaimApiPath("/effective-time-policy"),
        (body: Record<string, unknown>) => body.timeSchemeId === "ts-1",
      )
      .reply(200, { timeSchemeId: "ts-1", effective: true });

    reclaimApiScope()
      .get(reclaimApiPath("/time-window-overrides"))
      .reply(200, [{ id: "two-1", start: "09:00", end: "11:00" }]);

    reclaimApiScope()
      .post(
        reclaimApiPath("/time-window-overrides/entry"),
        (body: Record<string, unknown>) => body.timeSchemeId === "ts-1",
      )
      .reply(200, { id: "two-1", timeSchemeId: "ts-1" });

    reclaimApiScope()
      .delete(reclaimApiPath("/time-window-overrides/entry/two-1"))
      .reply(204);

    const accountSchemes = await listAccountTimeSchemes();
    expect(accountSchemes).toHaveLength(1);

    const created = await createAccountTimeScheme({ timeSchemeId: "ts-1" });
    expect(created.id).toBe("ats-1");

    const updated = await updateAccountTimeScheme("ats-1", { enabled: true });
    expect(updated.enabled).toBe(true);

    const effective = await getEffectiveTimePolicy({ timeSchemeId: "ts-1" });
    expect(effective).toEqual({ timeSchemeId: "ts-1", effective: true });

    const overrides = await listTimeWindowOverrides();
    expect(overrides).toHaveLength(1);

    const createdOverride = await createTimeWindowOverrideEntry({
      timeSchemeId: "ts-1",
    });
    expect(createdOverride.id).toBe("two-1");

    await deleteTimeWindowOverrideEntry("two-1");
  });

  it("covers schedule policy CRUD/recommendation/template flows", async () => {
    reclaimApiScope()
      .get(reclaimApiPath("/schedule-policy"))
      .query({ type: "MEETING" })
      .reply(200, [{ id: "sp-1", type: "MEETING" }]);

    reclaimApiScope()
      .post(
        reclaimApiPath("/schedule-policy"),
        (body: Record<string, unknown>) => body.type === "MEETING",
      )
      .reply(200, { id: "sp-1", type: "MEETING" });

    reclaimApiScope()
      .get(reclaimApiPath("/schedule-policy/sp-1"))
      .reply(200, { id: "sp-1", type: "MEETING" });

    reclaimApiScope()
      .delete(reclaimApiPath("/schedule-policy/sp-1"))
      .reply(204);

    reclaimApiScope()
      .get(reclaimApiPath("/schedule-policy/available-types"))
      .reply(200, { types: ["MEETING", "FOCUS"] });

    reclaimApiScope()
      .get(reclaimApiPath("/schedule-policy/create-default-policies"))
      .reply(200, { created: 4 });

    reclaimApiScope()
      .get(reclaimApiPath("/schedule-policy/event-matcher-tags"))
      .reply(200, { tags: ["meeting", "focus"] });

    reclaimApiScope()
      .post(
        reclaimApiPath("/schedule-policy/matching-events"),
        (body: Record<string, unknown>) => body.schedulePolicyId === "sp-1",
      )
      .reply(200, { events: [{ id: "evt-1" }] });

    reclaimApiScope()
      .post(
        reclaimApiPath("/schedule-policy/recommended"),
        (body: Record<string, unknown>) => body.subject === "planning",
      )
      .reply(200, { id: "sp-recommended" });

    reclaimApiScope()
      .get(reclaimApiPath("/schedule-policy/smart-meeting/candidates"))
      .reply(200, { candidates: [{ id: "sm-1" }] });

    reclaimApiScope()
      .get(reclaimApiPath("/schedule-policy/templates"))
      .reply(200, { templates: [{ id: "tpl-1" }] });

    reclaimApiScope()
      .post(
        reclaimApiPath(
          "/schedule-policy/templates/instantiate-meeting-quality",
        ),
        (body: Record<string, unknown>) =>
          body.schedulePolicyTemplateId === "tpl-1",
      )
      .query({ dryRun: true })
      .reply(200, { schedulePolicyId: "sp-1" });

    reclaimApiScope()
      .get(reclaimApiPath("/schedule-policy/templates/instantiated/sp-1"))
      .reply(200, { id: "sp-1", sourceTemplateId: "tpl-1" });

    const policies = await listSchedulePolicies({ query: { type: "MEETING" } });
    expect(policies).toHaveLength(1);

    const createdPolicy = await createSchedulePolicy({ type: "MEETING" });
    expect(createdPolicy.id).toBe("sp-1");

    const fetchedPolicy = await getSchedulePolicy("sp-1");
    expect(fetchedPolicy.type).toBe("MEETING");

    await deleteSchedulePolicy("sp-1");

    const availableTypes = await listSchedulePolicyAvailableTypes();
    expect(availableTypes).toEqual({ types: ["MEETING", "FOCUS"] });

    const defaultPolicies = await createDefaultSchedulePolicies();
    expect(defaultPolicies).toEqual({ created: 4 });

    const matcherTags = await listSchedulePolicyEventMatcherTags();
    expect(matcherTags).toEqual({ tags: ["meeting", "focus"] });

    const matchingEvents = await matchSchedulePolicyEvents({
      schedulePolicyId: "sp-1",
    });
    expect(matchingEvents).toEqual({ events: [{ id: "evt-1" }] });

    const recommended = await getRecommendedSchedulePolicy({
      subject: "planning",
    });
    expect(recommended).toEqual({ id: "sp-recommended" });

    const candidates = await listSchedulePolicySmartMeetingCandidates();
    expect(candidates).toEqual({ candidates: [{ id: "sm-1" }] });

    const templates = await listSchedulePolicyTemplates();
    expect(templates).toEqual({ templates: [{ id: "tpl-1" }] });

    const instantiated = await instantiateMeetingQualitySchedulePolicyTemplate(
      {
        schedulePolicyTemplateId: "tpl-1",
      },
      {
        query: { dryRun: true },
      },
    );
    expect(instantiated).toEqual({ schedulePolicyId: "sp-1" });

    const instantiatedTemplate =
      await getInstantiatedSchedulePolicyTemplate("sp-1");
    expect(instantiatedTemplate).toEqual({
      id: "sp-1",
      sourceTemplateId: "tpl-1",
    });
  });

  it("normalizes axios errors for schedule policy lookups", async () => {
    reclaimApiScope()
      .get(reclaimApiPath("/schedule-policy/missing"))
      .reply(404, { message: "Not Found" });

    try {
      await getSchedulePolicy("missing");
      throw new Error("Expected getSchedulePolicy to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "getSchedulePolicy(schedulePolicyId=missing)",
        messageFragment: "Not Found",
        status: 404,
        detailMatcher: { message: "Not Found" },
      });
    }
  });
});
