import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { expectNormalizedReclaimError } from "../../../test/harness/assertions.js";
import {
  installNockLifecycle,
  reclaimApiPath,
  reclaimApiScope,
} from "../../../test/harness/nock.js";
import {
  convertSmartMeetingsToSingleInstances,
  createSmartMeeting,
  deleteSmartMeeting,
  detectSmartMeetings,
  getSmartMeeting,
  getSmartMeetingAttendeeDeclined,
  getSmartMeetingAvailability,
  getSmartMeetingAvailabilityDiagnostics,
  inviteSmartMeetingOrganizer,
  listSmartMeetings,
  updateSmartMeeting,
} from "./client.js";

const ORIGINAL_API_KEY = process.env.RECLAIM_API_KEY;

installNockLifecycle();

describe("smart meetings domain client contracts", () => {
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

  it("lists smart meetings from the canonical API route", async () => {
    reclaimApiScope()
      .get(reclaimApiPath("/smart-meetings"))
      .reply(200, [{ id: 15, title: "Weekly planning" }]);

    const meetings = await listSmartMeetings();
    expect(meetings).toHaveLength(1);
    expect(meetings[0]?.id).toBe(15);
  });

  it("does not forward arbitrary query params on no-query smart meeting routes", async () => {
    reclaimApiScope()
      .get(reclaimApiPath("/smart-meetings"))
      .query({})
      .reply(200, [{ id: 12, title: "No-query list route" }]);

    reclaimApiScope()
      .get(reclaimApiPath("/smart-meetings/attendeeDeclined"))
      .query({})
      .reply(200, [{ id: 13 }]);

    reclaimApiScope()
      .post(reclaimApiPath("/smart-meetings/to-single-instances"), {
        smartMeetingIds: [12, 13],
      })
      .query({})
      .reply(200, { converted: 2 });

    const meetings = await listSmartMeetings({
      query: {
        ignored: "value",
      },
    } as unknown as Parameters<typeof listSmartMeetings>[0]);
    expect(meetings).toHaveLength(1);

    const declined = await getSmartMeetingAttendeeDeclined({
      query: {
        ignored: "value",
      },
    } as unknown as Parameters<typeof getSmartMeetingAttendeeDeclined>[0]);
    expect(declined).toHaveLength(1);

    const converted = await convertSmartMeetingsToSingleInstances(
      { smartMeetingIds: [12, 13] },
      {
        query: {
          ignored: "value",
        },
      } as unknown as Parameters<
        typeof convertSmartMeetingsToSingleInstances
      >[1],
    );
    expect(converted).toEqual({ converted: 2 });
  });

  it("normalizes local deadline fields for smart meeting creation", async () => {
    reclaimApiScope()
      .post(
        reclaimApiPath("/smart-meetings"),
        (body: Record<string, unknown>) =>
          body.title === "Weekly planning" &&
          body.due === "2026-01-07T17:00:00.000Z" &&
          !("deadline" in body),
      )
      .reply(200, { id: 40, title: "Weekly planning" });

    const created = await createSmartMeeting(
      {
        title: "Weekly planning",
        deadline: "2026-01-07T09:00:00",
      },
      { timeZone: "America/Los_Angeles" },
    );

    expect(created.id).toBe(40);
  });

  it("normalizes detect query date fields for smart meetings", async () => {
    reclaimApiScope()
      .get(reclaimApiPath("/smart-meetings/detect"))
      .query({
        start: "2026-01-05T16:00:00.000Z",
        end: "2026-01-05T17:00:00.000Z",
        attendeeEmail: "host@example.com",
      })
      .reply(200, [{ id: 82, title: "Detected meeting" }]);

    const detected = await detectSmartMeetings({
      query: {
        start: "2026-01-05T08:00:00",
        end: "2026-01-05T09:00:00",
        attendeeEmail: "host@example.com",
      },
      timeZone: "America/Los_Angeles",
    });

    expect(detected).toHaveLength(1);
    expect(detected[0]?.id).toBe(82);
  });

  it("covers core smart meeting CRUD routes", async () => {
    reclaimApiScope()
      .get(reclaimApiPath("/smart-meetings/42"))
      .reply(200, { id: 42, title: "Weekly planning" });

    reclaimApiScope()
      .patch(reclaimApiPath("/smart-meetings/42"), {
        title: "Weekly planning sync",
        organizerEmail: "organizer@example.com",
      })
      .reply(200, {
        id: 42,
        title: "Weekly planning sync",
        organizerEmail: "organizer@example.com",
      });

    reclaimApiScope().delete(reclaimApiPath("/smart-meetings/42")).reply(204);

    const meeting = await getSmartMeeting(42);
    expect(meeting.id).toBe(42);

    const updated = await updateSmartMeeting(42, {
      title: "Weekly planning sync",
      organizerEmail: "organizer@example.com",
    });
    expect(updated.title).toBe("Weekly planning sync");

    await deleteSmartMeeting(42);
  });

  it("covers attendee-declined, availability, invite, conversion, and diagnostics routes", async () => {
    reclaimApiScope()
      .get(reclaimApiPath("/smart-meetings/attendeeDeclined"))
      .query({})
      .reply(200, [{ id: 99, attendeeEmail: "declined@example.com" }]);

    reclaimApiScope()
      .get(reclaimApiPath("/smart-meetings/availability/42"))
      .query({
        start: "2026-01-10T18:00:00.000Z",
        includeOptionalAttendees: true,
      })
      .reply(200, { windows: [] });

    reclaimApiScope()
      .post(
        reclaimApiPath("/smart-meetings/invite-organizer"),
        (body: Record<string, unknown>) =>
          body.smartMeetingId === 42 &&
          body.organizerEmail === "organizer@example.com" &&
          body.attendeeEmail === "invitee@example.com",
      )
      .reply(200, { sent: true });

    reclaimApiScope()
      .post(reclaimApiPath("/smart-meetings/to-single-instances"), {
        smartMeetingIds: [42, 43],
      })
      .reply(200, { converted: 2 });

    reclaimApiScope()
      .get(reclaimApiPath("/assist/smart-meetings/availability-diagnostics"))
      .query({ end: "2026-01-11T20:00:00.000Z" })
      .reply(200, [{ id: 42, healthy: true }]);

    const declined = await getSmartMeetingAttendeeDeclined();
    expect(declined).toHaveLength(1);

    const availability = await getSmartMeetingAvailability(42, {
      query: {
        start: "2026-01-10T10:00:00",
        includeOptionalAttendees: true,
      },
      timeZone: "America/Los_Angeles",
    });
    expect(availability).toEqual({ windows: [] });

    const invite = await inviteSmartMeetingOrganizer(
      {
        smartMeetingId: 42,
        organizerEmail: "organizer@example.com",
        attendeeEmail: "invitee@example.com",
      },
      { timeZone: "America/Los_Angeles" },
    );
    expect(invite).toEqual({ sent: true });

    const converted = await convertSmartMeetingsToSingleInstances({
      smartMeetingIds: [42, 43],
    });
    expect(converted).toEqual({ converted: 2 });

    const diagnostics = await getSmartMeetingAvailabilityDiagnostics({
      query: {
        end: "2026-01-11T12:00:00",
      },
      timeZone: "America/Los_Angeles",
    });
    expect(diagnostics).toHaveLength(1);
  });

  it("normalizes axios errors for smart meeting retrieval requests", async () => {
    reclaimApiScope()
      .get(reclaimApiPath("/smart-meetings/999"))
      .reply(404, { message: "Not Found" });

    try {
      await getSmartMeeting(999);
      throw new Error("Expected getSmartMeeting to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "getSmartMeeting(smartMeetingId=999)",
        messageFragment: "Not Found",
        status: 404,
        detailMatcher: { message: "Not Found" },
      });
    }
  });
});
