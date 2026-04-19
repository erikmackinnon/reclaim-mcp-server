import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNormalizedReclaimError } from "../../../test/harness/assertions.js";
import { reclaim } from "../../core/http.js";
import {
  getFocusSettingsUser,
  getIdealTimeAvailability,
  lockFocusPlannerEvent,
} from "./client.js";

const ORIGINAL_API_KEY = process.env.RECLAIM_API_KEY;

describe("focus and availability client error normalization", () => {
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

  it("normalizes missing API key failures for focus settings reads", async () => {
    const requestSpy = vi.spyOn(reclaim, "request");

    try {
      await getFocusSettingsUser();
      throw new Error("Expected getFocusSettingsUser to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "getFocusSettingsUser",
        messageFragment: "RECLAIM_API_KEY environment variable is not set",
        status: undefined,
        detailMatcher: expect.objectContaining({
          stack: expect.any(String),
        }),
      });
    }

    expect(requestSpy).not.toHaveBeenCalled();
  });

  it("normalizes local query parsing failures for focus planner actions", async () => {
    try {
      await lockFocusPlannerEvent(
        "focus-1",
        "event-1",
        {
          at: "not-a-date",
        },
        { timeZone: "America/Los_Angeles" },
      );
      throw new Error("Expected lockFocusPlannerEvent to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context:
          "lockFocusPlannerEvent(focusSettingsId=focus-1, plannerEventId=event-1)",
        messageFragment: 'Invalid date format: "not-a-date"',
        status: undefined,
        detailMatcher: expect.objectContaining({
          stack: expect.any(String),
        }),
      });
    }
  });

  it("normalizes local payload parsing failures for availability helper calls", async () => {
    try {
      await getIdealTimeAvailability({ start: "definitely-not-a-date" });
      throw new Error("Expected getIdealTimeAvailability to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "getIdealTimeAvailability",
        messageFragment: 'Invalid date format: "definitely-not-a-date"',
        status: undefined,
        detailMatcher: expect.objectContaining({
          stack: expect.any(String),
        }),
      });
    }
  });
});
