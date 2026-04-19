import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNormalizedReclaimError } from "../../../test/harness/assertions.js";
import { reclaim } from "../../core/http.js";
import {
  createInteraction,
  getTeamAnalyticsV4,
  getUserAnalytics,
} from "./client.js";

const ORIGINAL_API_KEY = process.env.RECLAIM_API_KEY;

describe("analytics/changelog/assist client error normalization", () => {
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

  it("normalizes missing API key failures for analytics reads", async () => {
    const requestSpy = vi.spyOn(reclaim, "request");

    try {
      await getUserAnalytics();
      throw new Error("Expected getUserAnalytics to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "getUserAnalytics",
        messageFragment: "RECLAIM_API_KEY environment variable is not set",
        status: undefined,
        detailMatcher: expect.objectContaining({
          stack: expect.any(String),
        }),
      });
    }

    expect(requestSpy).not.toHaveBeenCalled();
  });

  it("normalizes local query parsing failures for analytics reads", async () => {
    try {
      await getUserAnalytics({
        query: {
          start: "not-a-date",
        },
      });
      throw new Error("Expected getUserAnalytics to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "getUserAnalytics",
        messageFragment: 'Invalid date format: "not-a-date"',
        status: undefined,
        detailMatcher: expect.objectContaining({
          stack: expect.any(String),
        }),
      });
    }
  });

  it("normalizes local payload parsing failures for team analytics and assist writes", async () => {
    try {
      await getTeamAnalyticsV4({
        deadline: "definitely-not-a-date",
      });
      throw new Error("Expected getTeamAnalyticsV4 to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "getTeamAnalyticsV4",
        messageFragment: 'Invalid date format: "definitely-not-a-date"',
        status: undefined,
        detailMatcher: expect.objectContaining({
          stack: expect.any(String),
        }),
      });
    }

    try {
      await createInteraction({
        start: "invalid-start-value",
      });
      throw new Error("Expected createInteraction to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "createInteraction",
        messageFragment: 'Invalid date format: "invalid-start-value"',
        status: undefined,
        detailMatcher: expect.objectContaining({
          stack: expect.any(String),
        }),
      });
    }
  });
});
