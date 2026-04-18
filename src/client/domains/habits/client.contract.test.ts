import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { expectNormalizedReclaimError } from "../../../test/harness/assertions.js";
import {
  installNockLifecycle,
  reclaimApiPath,
  reclaimApiScope,
} from "../../../test/harness/nock.js";
import {
  createDailyHabit,
  createHabit,
  deleteDailyHabit,
  deleteHabit,
  detectHabits,
  getDailyHabit,
  getHabit,
  listAssistHabitTemplates,
  listDailyHabits,
  listHabits,
  replaceDailyHabit,
  updateDailyHabit,
  updateHabit,
} from "./client.js";

const ORIGINAL_API_KEY = process.env.RECLAIM_API_KEY;

installNockLifecycle();

describe("habit domain client contracts", () => {
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

  it("lists smart habits from the canonical API route", async () => {
    reclaimApiScope()
      .get(reclaimApiPath("/smart-habits"))
      .reply(200, [{ id: 11, title: "Morning stretch" }]);

    const habits = await listHabits();
    expect(habits).toHaveLength(1);
    expect(habits[0]?.id).toBe(11);
    expect(habits[0]?.title).toBe("Morning stretch");
  });

  it("normalizes local deadline fields for habit creation using provided timeZone", async () => {
    reclaimApiScope()
      .post(
        reclaimApiPath("/smart-habits"),
        (body: Record<string, unknown>) =>
          body.title === "Hydrate" &&
          body.due === "2026-01-05T16:00:00.000Z" &&
          !("deadline" in body),
      )
      .reply(200, { id: 42, title: "Hydrate" });

    const habit = await createHabit(
      { title: "Hydrate", deadline: "2026-01-05T08:00:00" },
      { timeZone: "America/Los_Angeles" },
    );
    expect(habit.id).toBe(42);
  });

  it("normalizes detect query window values using local timezone inputs", async () => {
    reclaimApiScope()
      .get(reclaimApiPath("/smart-habits/detect"))
      .query({
        start: "2026-01-05T16:00:00.000Z",
        end: "2026-01-05T17:00:00.000Z",
        includeArchived: false,
      })
      .reply(200, [{ id: 9, title: "Detected habit" }]);

    const detected = await detectHabits({
      query: {
        start: "2026-01-05T08:00:00",
        end: "2026-01-05T09:00:00",
        includeArchived: false,
      },
      timeZone: "America/Los_Angeles",
    });

    expect(detected).toHaveLength(1);
    expect(detected[0]?.id).toBe(9);
  });

  it("covers core smart habit CRUD routes", async () => {
    reclaimApiScope()
      .get(reclaimApiPath("/smart-habits/42"))
      .reply(200, { id: 42, title: "Hydrate" });

    reclaimApiScope()
      .patch(reclaimApiPath("/smart-habits/42"), {
        title: "Hydrate frequently",
        notes: "every 2 hours",
      })
      .reply(200, {
        id: 42,
        title: "Hydrate frequently",
        notes: "every 2 hours",
      });

    reclaimApiScope().delete(reclaimApiPath("/smart-habits/42")).reply(204);

    const habit = await getHabit(42);
    expect(habit.id).toBe(42);

    const updated = await updateHabit(42, {
      title: "Hydrate frequently",
      notes: "every 2 hours",
    });
    expect(updated.title).toBe("Hydrate frequently");

    await deleteHabit(42);
  });

  it("covers daily habit assist lifecycle routes", async () => {
    reclaimApiScope()
      .post(
        reclaimApiPath("/assist/habits/daily"),
        (body: Record<string, unknown>) =>
          body.title === "Walk after lunch" &&
          body.due === "2026-01-05T08:00:00.000Z",
      )
      .reply(200, { id: 701, title: "Walk after lunch" });

    reclaimApiScope()
      .get(reclaimApiPath("/assist/habits/daily"))
      .reply(200, [{ id: 701, title: "Walk after lunch" }]);

    reclaimApiScope()
      .get(reclaimApiPath("/assist/habits/daily/701"))
      .reply(200, { id: 701, title: "Walk after lunch" });

    reclaimApiScope()
      .patch(reclaimApiPath("/assist/habits/daily/701"), {
        notes: "35 minutes",
      })
      .reply(200, { id: 701, title: "Walk after lunch", notes: "35 minutes" });

    reclaimApiScope()
      .delete(reclaimApiPath("/assist/habits/daily/701"))
      .reply(204);

    reclaimApiScope()
      .put(reclaimApiPath("/assist/habits/daily/701"), {
        title: "Walk after lunch",
        notes: "30 minutes",
      })
      .reply(200, { id: 701, title: "Walk after lunch", notes: "30 minutes" });

    const created = await createDailyHabit(
      { title: "Walk after lunch", due: "2026-01-05" },
      { timeZone: "America/Los_Angeles" },
    );
    expect(created.id).toBe(701);

    const dailyHabits = await listDailyHabits();
    expect(dailyHabits).toHaveLength(1);

    const fetched = await getDailyHabit(701);
    expect(fetched.id).toBe(701);

    const replaced = await replaceDailyHabit(701, {
      title: "Walk after lunch",
      notes: "30 minutes",
    });
    expect(replaced.notes).toBe("30 minutes");

    const updated = await updateDailyHabit(701, {
      notes: "35 minutes",
    });
    expect(updated.notes).toBe("35 minutes");

    await deleteDailyHabit(701);
  });

  it("lists assist habit templates", async () => {
    reclaimApiScope()
      .get(reclaimApiPath("/assist/habits/templates"))
      .reply(200, [{ id: 1, name: "Daily reset" }]);

    const templates = await listAssistHabitTemplates();
    expect(templates).toHaveLength(1);
  });

  it("normalizes axios errors for habit retrieval requests", async () => {
    reclaimApiScope()
      .get(reclaimApiPath("/assist/habits/daily/999"))
      .reply(404, { message: "Not Found" });

    try {
      await getDailyHabit(999);
      throw new Error("Expected getDailyHabit to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "getDailyHabit(dailyHabitId=999)",
        messageFragment: "Not Found",
        status: 404,
        detailMatcher: { message: "Not Found" },
      });
    }
  });
});
