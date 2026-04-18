import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNormalizedReclaimError } from "../../../test/harness/assertions.js";
import { reclaim } from "../../core/http.js";
import {
  createAssistHabitTemplate,
  createHabit,
  detectHabits,
  listHabits,
  updateDailyHabit,
} from "./client.js";

const ORIGINAL_API_KEY = process.env.RECLAIM_API_KEY;

describe("habit client error normalization", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.RECLAIM_API_KEY;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (ORIGINAL_API_KEY === undefined) {
      delete process.env.RECLAIM_API_KEY;
    } else {
      process.env.RECLAIM_API_KEY = ORIGINAL_API_KEY;
    }
  });

  it("normalizes missing API key failures in HTTP preflight", async () => {
    const requestSpy = vi.spyOn(reclaim, "request");

    try {
      await listHabits();
      throw new Error("Expected listHabits to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "listHabits",
        messageFragment: "RECLAIM_API_KEY environment variable is not set",
        status: undefined,
        detailMatcher: expect.objectContaining({
          stack: expect.any(String),
        }),
      });
    }

    expect(requestSpy).not.toHaveBeenCalled();
  });

  it("normalizes createHabit local input parsing failures", async () => {
    try {
      await createHabit({ title: "Bad habit", due: "not-a-date" });
      throw new Error("Expected createHabit to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "createHabit",
        messageFragment: 'Invalid date format: "not-a-date"',
        status: undefined,
        detailMatcher: expect.objectContaining({
          stack: expect.any(String),
        }),
      });
    }
  });

  it("normalizes detectHabits local query parsing failures", async () => {
    try {
      await detectHabits({
        query: {
          start: "not-a-date",
        },
      });
      throw new Error("Expected detectHabits to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "detectHabits",
        messageFragment: 'Invalid date format: "not-a-date"',
        status: undefined,
        detailMatcher: expect.objectContaining({
          stack: expect.any(String),
        }),
      });
    }
  });

  it("normalizes updateDailyHabit local input parsing failures", async () => {
    try {
      await updateDailyHabit(13, { deadline: "bad-date" });
      throw new Error("Expected updateDailyHabit to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "updateDailyHabit(dailyHabitId=13)",
        messageFragment: 'Invalid date format: "bad-date"',
        status: undefined,
        detailMatcher: expect.objectContaining({
          stack: expect.any(String),
        }),
      });
    }
  });

  it("normalizes createAssistHabitTemplate local payload failures", async () => {
    try {
      await createAssistHabitTemplate({ deadline: "definitely-not-a-date" });
      throw new Error("Expected createAssistHabitTemplate to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "createAssistHabitTemplate",
        messageFragment: 'Invalid date format: "definitely-not-a-date"',
        status: undefined,
        detailMatcher: expect.objectContaining({
          stack: expect.any(String),
        }),
      });
    }
  });
});
