import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNormalizedReclaimError } from "../../../test/harness/assertions.js";
import { reclaim } from "../../core/http.js";
import {
  convertOneOnOneAuto,
  createOneOnOne,
  listOneOnOnes,
} from "./client.js";

const ORIGINAL_API_KEY = process.env.RECLAIM_API_KEY;

describe("one-on-one client error normalization", () => {
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
      await listOneOnOnes();
      throw new Error("Expected listOneOnOnes to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "listOneOnOnes",
        messageFragment: "RECLAIM_API_KEY environment variable is not set",
        status: undefined,
        detailMatcher: expect.objectContaining({
          stack: expect.any(String),
        }),
      });
    }

    expect(requestSpy).not.toHaveBeenCalled();
  });

  it("normalizes createOneOnOne local input parsing failures", async () => {
    try {
      await createOneOnOne({ title: "Bad 1:1", due: "not-a-date" });
      throw new Error("Expected createOneOnOne to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "createOneOnOne",
        messageFragment: 'Invalid date format: "not-a-date"',
        status: undefined,
        detailMatcher: expect.objectContaining({
          stack: expect.any(String),
        }),
      });
    }
  });

  it("normalizes convertOneOnOneAuto local query parsing failures", async () => {
    try {
      await convertOneOnOneAuto(13, {}, { query: { start: "bad-date" } });
      throw new Error("Expected convertOneOnOneAuto to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "convertOneOnOneAuto(oneOnOneId=13)",
        messageFragment: 'Invalid date format: "bad-date"',
        status: undefined,
        detailMatcher: expect.objectContaining({
          stack: expect.any(String),
        }),
      });
    }
  });
});
