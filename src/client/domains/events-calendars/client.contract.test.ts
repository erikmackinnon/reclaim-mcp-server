import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { expectNormalizedReclaimError } from "../../../test/harness/assertions.js";
import {
  installNockLifecycle,
  reclaimApiPath,
  reclaimApiScope,
} from "../../../test/harness/nock.js";
import {
  convertEventToV2,
  deletePersonalCalendar,
  deleteSyncCalendar,
  getEvent,
  getPersonalCalendar,
  getPrimaryCalendar,
  getSyncCalendar,
  getSyncPolicy,
  listEvents,
  listEventsV2,
  listPersonalCalendarCandidates,
  listPersonalCalendars,
  listPersonalEvents,
  listSyncCalendarCandidates,
  matchEvent,
  registerSyncInterest,
  syncCalendarPermissions,
  validateSyncPolicy,
} from "./client.js";

const ORIGINAL_API_KEY = process.env.RECLAIM_API_KEY;

installNockLifecycle();

describe("events/calendars domain client contracts", () => {
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

  it("lists /events with normalized local date query values", async () => {
    reclaimApiScope()
      .get(reclaimApiPath("/events"))
      .query({
        start: "2026-01-05T16:00:00.000Z",
        end: "2026-01-05T17:00:00.000Z",
        sourceDetails: true,
        calendarIds: ["cal-a", "cal-b"],
      })
      .reply(200, [{ id: "evt-1", title: "Focus block" }]);

    const events = await listEvents({
      query: {
        start: "2026-01-05T08:00:00",
        end: "2026-01-05T09:00:00",
        sourceDetails: true,
        calendarIds: ["cal-a", "cal-b"],
      },
      timeZone: "America/Los_Angeles",
    });

    expect(events).toHaveLength(1);
    expect(events[0]?.id).toBe("evt-1");
  });

  it("covers event list variants and conversion helpers", async () => {
    reclaimApiScope()
      .get(reclaimApiPath("/events/v2"))
      .query({ allConnected: true })
      .reply(200, [{ id: "evt-2", title: "V2 event" }]);

    reclaimApiScope()
      .get(reclaimApiPath("/events/evt-1"))
      .query({ sourceDetails: true })
      .reply(200, { id: "evt-1", title: "Focus block" });

    reclaimApiScope()
      .get(reclaimApiPath("/events/personal"))
      .query({ includeDeclined: false })
      .reply(200, [{ id: "evt-personal", title: "Personal event" }]);

    reclaimApiScope()
      .post(
        reclaimApiPath("/events/utils/to-v2"),
        (body: Record<string, unknown>) =>
          body.start === "2026-01-05T16:00:00.000Z" &&
          body.end === "2026-01-05T17:00:00.000Z",
      )
      .query({ dryRun: true })
      .reply(200, { converted: true });

    reclaimApiScope()
      .post(reclaimApiPath("/matcher/event"), {
        title: "Standup",
        start: "2026-01-05T16:00:00.000Z",
      })
      .reply(200, { matched: true });

    const v2 = await listEventsV2({
      query: {
        allConnected: true,
      },
    });
    expect(v2[0]?.id).toBe("evt-2");

    const event = await getEvent("evt-1", {
      query: {
        sourceDetails: true,
      },
    });
    expect(event.id).toBe("evt-1");

    const personal = await listPersonalEvents({
      query: {
        includeDeclined: false,
      },
    });
    expect(personal[0]?.id).toBe("evt-personal");

    const converted = await convertEventToV2(
      {
        start: "2026-01-05T08:00:00",
        end: "2026-01-05T09:00:00",
      },
      {
        query: {
          dryRun: true,
        },
        timeZone: "America/Los_Angeles",
      },
    );
    expect(converted).toEqual({ converted: true });

    const matched = await matchEvent(
      {
        title: "Standup",
        start: "2026-01-05T08:00:00",
      },
      {
        timeZone: "America/Los_Angeles",
      },
    );
    expect(matched).toEqual({ matched: true });
  });

  it("covers calendar inspection and safe sync mutations", async () => {
    reclaimApiScope()
      .get(reclaimApiPath("/calendars/primary"))
      .reply(200, { id: "cal-primary" });

    reclaimApiScope()
      .get(reclaimApiPath("/calendars/personal"))
      .reply(200, [{ id: "cal-personal-1" }]);

    reclaimApiScope()
      .get(reclaimApiPath("/calendars/personal/cal-personal-1"))
      .reply(200, { id: "cal-personal-1" });

    reclaimApiScope()
      .delete(reclaimApiPath("/calendars/personal/cal-personal-1"))
      .reply(204);

    reclaimApiScope()
      .get(reclaimApiPath("/calendars/personal/candidates"))
      .query({ includeReadOnly: true })
      .reply(200, [{ id: "cal-personal-candidate" }]);

    reclaimApiScope()
      .get(reclaimApiPath("/calendars/sync/cal-sync-1"))
      .reply(200, { id: "cal-sync-1" });

    reclaimApiScope()
      .delete(reclaimApiPath("/calendars/sync/cal-sync-1"))
      .reply(204);

    reclaimApiScope()
      .get(reclaimApiPath("/calendars/sync/candidates"))
      .query({ includeReadOnly: false })
      .reply(200, [{ id: "cal-sync-candidate" }]);

    reclaimApiScope()
      .post(reclaimApiPath("/calendars/sync/interest"), {
        provider: "google",
      })
      .query({ source: "settings" })
      .reply(200, { queued: true });

    reclaimApiScope()
      .get(reclaimApiPath("/calendars/sync-policy"))
      .reply(200, { policy: "default" });

    reclaimApiScope()
      .post(reclaimApiPath("/calendars/sync-policy/validate"), {
        policy: "strict",
      })
      .reply(200, { valid: true });

    reclaimApiScope()
      .post(reclaimApiPath("/calendars/permissions/sync"), {
        force: true,
      })
      .reply(200, { synced: true });

    const primary = await getPrimaryCalendar();
    expect(primary.id).toBe("cal-primary");

    const personal = await listPersonalCalendars();
    expect(personal[0]?.id).toBe("cal-personal-1");

    const personalCalendar = await getPersonalCalendar("cal-personal-1");
    expect(personalCalendar.id).toBe("cal-personal-1");

    await deletePersonalCalendar("cal-personal-1");

    const personalCandidates = await listPersonalCalendarCandidates({
      query: {
        includeReadOnly: true,
      },
    });
    expect(personalCandidates[0]?.id).toBe("cal-personal-candidate");

    const sync = await getSyncCalendar("cal-sync-1");
    expect(sync.id).toBe("cal-sync-1");

    await deleteSyncCalendar("cal-sync-1");

    const syncCandidates = await listSyncCalendarCandidates({
      query: {
        includeReadOnly: false,
      },
    });
    expect(syncCandidates[0]?.id).toBe("cal-sync-candidate");

    const syncInterest = await registerSyncInterest(
      {
        provider: "google",
      },
      {
        query: {
          source: "settings",
        },
      },
    );
    expect(syncInterest).toEqual({ queued: true });

    const syncPolicy = await getSyncPolicy();
    expect(syncPolicy).toEqual({ policy: "default" });

    const validated = await validateSyncPolicy({ policy: "strict" });
    expect(validated).toEqual({ valid: true });

    const permissions = await syncCalendarPermissions({ force: true });
    expect(permissions).toEqual({ synced: true });
  });

  it("normalizes axios errors for event lookups", async () => {
    reclaimApiScope()
      .get(reclaimApiPath("/events/missing"))
      .reply(404, { message: "Not Found" });

    try {
      await getEvent("missing");
      throw new Error("Expected getEvent to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "getEvent(eventId=missing)",
        messageFragment: "Not Found",
        status: 404,
        detailMatcher: { message: "Not Found" },
      });
    }
  });
});
