import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNormalizedReclaimError } from "../../../test/harness/assertions.js";
import { reclaim } from "../../core/http.js";
import {
  convertEventToV2,
  listEvents,
  validateSyncPolicy,
} from "./client.js";

const ORIGINAL_API_KEY = process.env.RECLAIM_API_KEY;

describe("events/calendars client error normalization", () => {
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
      await listEvents();
      throw new Error("Expected listEvents to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "listEvents",
        messageFragment: "RECLAIM_API_KEY environment variable is not set",
        status: undefined,
        detailMatcher: expect.objectContaining({
          stack: expect.any(String),
        }),
      });
    }

    expect(requestSpy).not.toHaveBeenCalled();
  });

  it("normalizes local query parsing failures", async () => {
    try {
      await listEvents({
        query: {
          start: "not-a-date",
        },
      });
      throw new Error("Expected listEvents to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "listEvents",
        messageFragment: 'Invalid date format: "not-a-date"',
        status: undefined,
        detailMatcher: expect.objectContaining({
          stack: expect.any(String),
        }),
      });
    }
  });

  it("normalizes local payload parsing failures for conversion helper", async () => {
    try {
      await convertEventToV2({
        start: "definitely-not-a-date",
      });
      throw new Error("Expected convertEventToV2 to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "convertEventToV2",
        messageFragment: 'Invalid date format: "definitely-not-a-date"',
        status: undefined,
        detailMatcher: expect.objectContaining({
          stack: expect.any(String),
        }),
      });
    }
  });

  it("normalizes local payload parsing failures for sync-policy validation", async () => {
    try {
      await validateSyncPolicy({
        start: "also-not-a-date",
      });
      throw new Error("Expected validateSyncPolicy to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "validateSyncPolicy",
        messageFragment: 'Invalid date format: "also-not-a-date"',
        status: undefined,
        detailMatcher: expect.objectContaining({
          stack: expect.any(String),
        }),
      });
    }
  });
});
