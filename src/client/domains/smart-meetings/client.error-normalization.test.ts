import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNormalizedReclaimError } from "../../../test/harness/assertions.js";
import { reclaim } from "../../core/http.js";
import {
  createSmartMeeting,
  detectSmartMeetings,
  getSmartMeetingAvailability,
  listSmartMeetings,
} from "./client.js";

const ORIGINAL_API_KEY = process.env.RECLAIM_API_KEY;

describe("smart meeting client error normalization", () => {
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
      await listSmartMeetings();
      throw new Error("Expected listSmartMeetings to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "listSmartMeetings",
        messageFragment: "RECLAIM_API_KEY environment variable is not set",
        status: undefined,
        detailMatcher: expect.objectContaining({
          stack: expect.any(String),
        }),
      });
    }

    expect(requestSpy).not.toHaveBeenCalled();
  });

  it("normalizes createSmartMeeting local input parsing failures", async () => {
    try {
      await createSmartMeeting({ title: "Bad meeting", due: "not-a-date" });
      throw new Error("Expected createSmartMeeting to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "createSmartMeeting",
        messageFragment: 'Invalid date format: "not-a-date"',
        status: undefined,
        detailMatcher: expect.objectContaining({
          stack: expect.any(String),
        }),
      });
    }
  });

  it("normalizes detectSmartMeetings local query parsing failures", async () => {
    try {
      await detectSmartMeetings({
        query: {
          start: "not-a-date",
        },
      });
      throw new Error("Expected detectSmartMeetings to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "detectSmartMeetings",
        messageFragment: 'Invalid date format: "not-a-date"',
        status: undefined,
        detailMatcher: expect.objectContaining({
          stack: expect.any(String),
        }),
      });
    }
  });

  it("normalizes getSmartMeetingAvailability local query parsing failures", async () => {
    try {
      await getSmartMeetingAvailability(12, {
        query: {
          start: "not-a-date",
        },
      });
      throw new Error("Expected getSmartMeetingAvailability to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "getSmartMeetingAvailability(smartMeetingId=12)",
        messageFragment: 'Invalid date format: "not-a-date"',
        status: undefined,
        detailMatcher: expect.objectContaining({
          stack: expect.any(String),
        }),
      });
    }
  });
});
