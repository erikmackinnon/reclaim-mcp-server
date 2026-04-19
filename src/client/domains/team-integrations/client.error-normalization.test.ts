import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNormalizedReclaimError } from "../../../test/harness/assertions.js";
import { reclaim } from "../../core/http.js";
import { getSlackIntegrations, getTeamCurrent } from "./client.js";

const ORIGINAL_API_KEY = process.env.RECLAIM_API_KEY;

describe("team/integrations client error normalization", () => {
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
      await getTeamCurrent();
      throw new Error("Expected getTeamCurrent to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "getTeamCurrent",
        messageFragment: "RECLAIM_API_KEY environment variable is not set",
        status: undefined,
        detailMatcher: expect.objectContaining({
          stack: expect.any(String),
        }),
      });
    }

    expect(requestSpy).not.toHaveBeenCalled();
  });

  it("normalizes transport-layer failures", async () => {
    process.env.RECLAIM_API_KEY = "test-token";
    vi.spyOn(reclaim, "request").mockRejectedValue(new Error("socket hang up"));

    try {
      await getSlackIntegrations();
      throw new Error("Expected getSlackIntegrations to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "getSlackIntegrations",
        messageFragment: "socket hang up",
        status: undefined,
        detailMatcher: expect.objectContaining({
          stack: expect.any(String),
        }),
      });
    }
  });
});
