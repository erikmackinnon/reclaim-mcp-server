import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { expectNormalizedReclaimError } from "../../../test/harness/assertions.js";
import {
  installNockLifecycle,
  reclaimApiPath,
  reclaimApiScope,
} from "../../../test/harness/nock.js";
import {
  getFocusSettingsDefaultFocusTime,
  getFocusSettingsTeam,
  getFocusSettingsUser,
  getIdealTimeAvailability,
  getSuggestedTimes,
  listFocusSettingsTeam,
  lockFocusPlannerEvent,
  moveFocusPlannerEvent,
  patchFocusSettingsUser,
  rescheduleFocusPlannerEvent,
  unlockFocusPlannerEvent,
  updateFocusSettingsUser,
} from "./client.js";

const ORIGINAL_API_KEY = process.env.RECLAIM_API_KEY;

installNockLifecycle();

describe("focus and availability domain client contracts", () => {
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

  it("covers focus settings user/team flows and focus planner actions", async () => {
    reclaimApiScope()
      .get(reclaimApiPath("/focus-settings/user"))
      .reply(200, { id: "user-focus", enabled: true });

    reclaimApiScope()
      .post(
        reclaimApiPath("/focus-settings/user"),
        (body: Record<string, unknown>) =>
          body.start === "2026-03-10T16:00:00.000Z" &&
          body.focusTimeMinHours === 2,
      )
      .query({ mode: "strict" })
      .reply(200, { id: "user-focus", focusTimeMinHours: 2 });

    reclaimApiScope()
      .get(reclaimApiPath("/focus-settings/user/focus-time/default"))
      .reply(200, { durationMinutes: 90 });

    reclaimApiScope()
      .patch(
        reclaimApiPath("/focus-settings/user/123"),
        (body: Record<string, unknown>) =>
          body.start === "2026-03-11T16:00:00.000Z" && body.enabled === false,
      )
      .query({ dryRun: true })
      .reply(200, { id: 123, enabled: false });

    reclaimApiScope()
      .get(reclaimApiPath("/focus-settings/team"))
      .reply(200, [{ id: "team-focus", teamId: "team-1" }]);

    reclaimApiScope()
      .get(reclaimApiPath("/focus-settings/team/team-1"))
      .reply(200, { id: "team-focus", teamId: "team-1" });

    reclaimApiScope()
      .post(reclaimApiPath("/focus/planner/focus-1/event-1/lock"))
      .query({ at: "2026-03-12T16:00:00.000Z" })
      .reply(200, { success: true, action: "lock" });

    reclaimApiScope()
      .post(reclaimApiPath("/focus/planner/focus-1/event-1/unlock"))
      .reply(200, { success: true, action: "unlock" });

    reclaimApiScope()
      .post(reclaimApiPath("/focus/planner/focus-1/event-1/move"))
      .query({
        from: "2026-03-12T16:00:00.000Z",
        to: "2026-03-12T17:00:00.000Z",
      })
      .reply(200, { success: true, action: "move" });

    reclaimApiScope()
      .post(reclaimApiPath("/focus/planner/42/99/reschedule"))
      .query({
        reason: "manual",
        from: "2026-03-12T16:00:00.000Z",
        to: "2026-03-12T17:00:00.000Z",
      })
      .reply(200, { success: true, action: "reschedule" });

    const userSettings = await getFocusSettingsUser();
    expect(userSettings.id).toBe("user-focus");

    const updatedSettings = await updateFocusSettingsUser(
      {
        start: "2026-03-10T09:00:00",
        focusTimeMinHours: 2,
      },
      {
        query: { mode: "strict" },
        timeZone: "America/Los_Angeles",
      },
    );
    expect(updatedSettings.focusTimeMinHours).toBe(2);

    const defaultFocusTime = await getFocusSettingsDefaultFocusTime();
    expect(defaultFocusTime).toEqual({ durationMinutes: 90 });

    const patched = await patchFocusSettingsUser(
      123,
      {
        start: "2026-03-11T09:00:00",
        enabled: false,
      },
      {
        query: { dryRun: true },
        timeZone: "America/Los_Angeles",
      },
    );
    expect(patched.enabled).toBe(false);

    const teamSettings = await listFocusSettingsTeam();
    expect(teamSettings).toHaveLength(1);

    const teamSettingsById = await getFocusSettingsTeam("team-1");
    expect(teamSettingsById.id).toBe("team-focus");

    const lockResult = await lockFocusPlannerEvent(
      "focus-1",
      "event-1",
      {
        at: "2026-03-12T09:00:00",
      },
      { timeZone: "America/Los_Angeles" },
    );
    expect(lockResult).toEqual({ success: true, action: "lock" });

    const unlockResult = await unlockFocusPlannerEvent("focus-1", "event-1");
    expect(unlockResult).toEqual({ success: true, action: "unlock" });

    const moveResult = await moveFocusPlannerEvent(
      "focus-1",
      "event-1",
      {
        from: "2026-03-12T09:00:00",
        to: "2026-03-12T10:00:00",
      },
      { timeZone: "America/Los_Angeles" },
    );
    expect(moveResult).toEqual({ success: true, action: "move" });

    const rescheduleResult = await rescheduleFocusPlannerEvent(
      42,
      99,
      {
        from: "2026-03-12T09:00:00",
        to: "2026-03-12T10:00:00",
      },
      {
        query: { reason: "manual" },
        timeZone: "America/Los_Angeles",
      },
    );
    expect(rescheduleResult).toEqual({ success: true, action: "reschedule" });
  });

  it("normalizes ideal-time and suggested-times availability payload fields", async () => {
    reclaimApiScope()
      .post(
        reclaimApiPath("/availability/ideal-time-availability"),
        (body: Record<string, unknown>) =>
          body.start === "2026-03-15T15:00:00.000Z" &&
          body.end === "2026-03-15T19:00:00.000Z" &&
          Array.isArray(body.attendees),
      )
      .query({ mode: "fast" })
      .reply(200, { windows: [{ start: "2026-03-15T16:00:00.000Z" }] });

    reclaimApiScope()
      .post(
        reclaimApiPath("/availability/suggested-times"),
        (body: Record<string, unknown>) =>
          body.windowStart === "2026-03-16T15:00:00.000Z" &&
          body.windowEnd === "2026-03-16T17:00:00.000Z",
      )
      .reply(200, {
        suggestions: [{ start: "2026-03-16T15:30:00.000Z" }],
      });

    const idealTime = await getIdealTimeAvailability(
      {
        start: "2026-03-15T08:00:00",
        end: "2026-03-15T12:00:00",
        attendees: ["one@example.com"],
      },
      {
        query: { mode: "fast" },
        timeZone: "America/Los_Angeles",
      },
    );
    expect(idealTime).toEqual({
      windows: [{ start: "2026-03-15T16:00:00.000Z" }],
    });

    const suggestedTimes = await getSuggestedTimes(
      {
        windowStart: "2026-03-16T08:00:00",
        windowEnd: "2026-03-16T10:00:00",
      },
      { timeZone: "America/Los_Angeles" },
    );
    expect(suggestedTimes).toEqual({
      suggestions: [{ start: "2026-03-16T15:30:00.000Z" }],
    });
  });

  it("normalizes axios errors for focus settings retrieval", async () => {
    reclaimApiScope()
      .get(reclaimApiPath("/focus-settings/user"))
      .reply(404, { message: "Not Found" });

    try {
      await getFocusSettingsUser();
      throw new Error("Expected getFocusSettingsUser to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "getFocusSettingsUser",
        messageFragment: "Not Found",
        status: 404,
        detailMatcher: { message: "Not Found" },
      });
    }
  });
});
