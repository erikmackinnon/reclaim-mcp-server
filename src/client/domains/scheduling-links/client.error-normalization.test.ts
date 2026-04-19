import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNormalizedReclaimError } from "../../../test/harness/assertions.js";
import { reclaim } from "../../core/http.js";
import { getParticipantResolution, listSchedulingLinks } from "./client.js";

const ORIGINAL_API_KEY = process.env.RECLAIM_API_KEY;

describe("scheduling links client error normalization", () => {
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

  it("normalizes missing API key failures in HTTP preflight for link listing", async () => {
    const requestSpy = vi.spyOn(reclaim, "request");

    try {
      await listSchedulingLinks();
      throw new Error("Expected listSchedulingLinks to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "listSchedulingLinks",
        messageFragment: "RECLAIM_API_KEY environment variable is not set",
        status: undefined,
        detailMatcher: expect.objectContaining({
          stack: expect.any(String),
        }),
      });
    }

    expect(requestSpy).not.toHaveBeenCalled();
  });

  it("normalizes missing API key failures in HTTP preflight for participant resolution", async () => {
    const requestSpy = vi.spyOn(reclaim, "request");

    try {
      await getParticipantResolution({
        query: {
          query: "alex@example.com",
        },
      });
      throw new Error("Expected getParticipantResolution to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "getParticipantResolution",
        messageFragment: "RECLAIM_API_KEY environment variable is not set",
        status: undefined,
        detailMatcher: expect.objectContaining({
          stack: expect.any(String),
        }),
      });
    }

    expect(requestSpy).not.toHaveBeenCalled();
  });
});
