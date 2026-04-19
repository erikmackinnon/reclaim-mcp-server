import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { expectNormalizedReclaimError } from "../../../test/harness/assertions.js";
import {
  installNockLifecycle,
  reclaimApiPath,
  reclaimApiScope,
} from "../../../test/harness/nock.js";
import {
  convertOneOnOneAuto,
  createOneOnOne,
  deleteOneOnOne,
  getOneOnOne,
  getOneOnOneInvite,
  getOneOnOneInviteeEligibility,
  listDetectedOneOnOnes,
  listOneOnOnes,
  listOneOnOneInvites,
  listOneOnOneSuggestions,
  updateOneOnOne,
} from "./client.js";

const ORIGINAL_API_KEY = process.env.RECLAIM_API_KEY;

installNockLifecycle();

describe("one-on-one domain client contracts", () => {
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

  it("lists one-on-ones from the canonical API route", async () => {
    reclaimApiScope()
      .get(reclaimApiPath("/oneOnOne"))
      .reply(200, [{ id: 31, title: "Weekly manager sync" }]);

    const oneOnOnes = await listOneOnOnes();
    expect(oneOnOnes).toHaveLength(1);
    expect(oneOnOnes[0]?.id).toBe(31);
    expect(oneOnOnes[0]?.title).toBe("Weekly manager sync");
  });

  it("normalizes local deadline fields for one-on-one creation using provided timeZone", async () => {
    reclaimApiScope()
      .post(
        reclaimApiPath("/oneOnOne"),
        (body: Record<string, unknown>) =>
          body.title === "New manager 1:1" &&
          body.due === "2026-01-05T16:00:00.000Z" &&
          !("deadline" in body),
      )
      .reply(200, { id: 44, title: "New manager 1:1" });

    const oneOnOne = await createOneOnOne(
      {
        title: "New manager 1:1",
        deadline: "2026-01-05T08:00:00",
      },
      { timeZone: "America/Los_Angeles" },
    );

    expect(oneOnOne.id).toBe(44);
  });

  it("uses explicit due over deadline regardless of key order", async () => {
    reclaimApiScope()
      .post(
        reclaimApiPath("/oneOnOne"),
        (body: Record<string, unknown>) =>
          body.title === "Due-first payload" &&
          body.due === "2026-01-06T17:00:00.000Z" &&
          !("deadline" in body),
      )
      .reply(200, { id: 45, title: "Due-first payload" });

    reclaimApiScope()
      .post(
        reclaimApiPath("/oneOnOne"),
        (body: Record<string, unknown>) =>
          body.title === "Deadline-first payload" &&
          body.due === "2026-01-06T17:00:00.000Z" &&
          !("deadline" in body),
      )
      .reply(200, { id: 46, title: "Deadline-first payload" });

    const dueFirst = await createOneOnOne(
      {
        title: "Due-first payload",
        due: "2026-01-06T09:00:00",
        deadline: "2026-01-05T08:00:00",
      },
      { timeZone: "America/Los_Angeles" },
    );
    expect(dueFirst.id).toBe(45);

    const deadlineFirst = await createOneOnOne(
      {
        title: "Deadline-first payload",
        deadline: "2026-01-05T08:00:00",
        due: "2026-01-06T09:00:00",
      },
      { timeZone: "America/Los_Angeles" },
    );
    expect(deadlineFirst.id).toBe(46);
  });

  it("covers one-on-one lifecycle, convert-auto, and invite-related reads", async () => {
    reclaimApiScope()
      .get(reclaimApiPath("/oneOnOne/44"))
      .reply(200, { id: 44, title: "Manager sync" });

    reclaimApiScope()
      .patch(reclaimApiPath("/oneOnOne/44"), {
        title: "Manager sync updated",
      })
      .reply(200, { id: 44, title: "Manager sync updated" });

    reclaimApiScope().delete(reclaimApiPath("/oneOnOne/44")).reply(204);

    reclaimApiScope()
      .post(
        reclaimApiPath("/oneOnOne/convert-auto/44"),
        (body: Record<string, unknown>) =>
          body.due === "2026-01-05T16:00:00.000Z" &&
          !("deadline" in body),
      )
      .query({
        start: "2026-01-05T17:00:00.000Z",
      })
      .reply(200, { converted: true });

    reclaimApiScope()
      .get(reclaimApiPath("/oneOnOne/detected"))
      .reply(200, [{ id: 90, title: "Detected 1:1" }]);

    reclaimApiScope()
      .get(reclaimApiPath("/oneOnOne/invitee-eligibility"))
      .query({
        start: "2026-01-05T16:00:00.000Z",
      })
      .reply(200, { eligibleUserIds: [11, 12] });

    reclaimApiScope()
      .get(reclaimApiPath("/oneOnOne/invites"))
      .query({
        end: "2026-01-05T17:00:00.000Z",
      })
      .reply(200, [{ id: 101, status: "PENDING" }]);

    reclaimApiScope()
      .get(reclaimApiPath("/oneOnOne/invites/101"))
      .query({ includeHistory: true })
      .reply(200, { id: 101, status: "PENDING" });

    reclaimApiScope()
      .get(reclaimApiPath("/oneOnOne/suggestions"))
      .reply(200, [{ userId: 11, score: 0.9 }]);

    const fetched = await getOneOnOne(44);
    expect(fetched.id).toBe(44);

    const updated = await updateOneOnOne(44, {
      title: "Manager sync updated",
    });
    expect(updated.title).toBe("Manager sync updated");

    const converted = await convertOneOnOneAuto(
      44,
      { deadline: "2026-01-05T08:00:00" },
      {
        query: {
          start: "2026-01-05T09:00:00",
        },
        timeZone: "America/Los_Angeles",
      },
    );
    expect(converted).toEqual({ converted: true });

    const detected = await listDetectedOneOnOnes();
    expect(detected).toHaveLength(1);

    const eligibility = await getOneOnOneInviteeEligibility({
      query: {
        start: "2026-01-05T08:00:00",
      },
      timeZone: "America/Los_Angeles",
    });
    expect(eligibility).toEqual({ eligibleUserIds: [11, 12] });

    const invites = await listOneOnOneInvites({
      query: {
        end: "2026-01-05T09:00:00",
      },
      timeZone: "America/Los_Angeles",
    });
    expect(invites).toHaveLength(1);

    const invite = await getOneOnOneInvite(101, {
      query: {
        includeHistory: true,
      },
    });
    expect(invite).toEqual({ id: 101, status: "PENDING" });

    const suggestions = await listOneOnOneSuggestions();
    expect(suggestions).toHaveLength(1);

    await deleteOneOnOne(44);
  });

  it("normalizes axios errors for one-on-one retrieval requests", async () => {
    reclaimApiScope()
      .get(reclaimApiPath("/oneOnOne/999"))
      .reply(404, { message: "Not Found" });

    try {
      await getOneOnOne(999);
      throw new Error("Expected getOneOnOne to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "getOneOnOne(oneOnOneId=999)",
        messageFragment: "Not Found",
        status: 404,
        detailMatcher: { message: "Not Found" },
      });
    }
  });
});
