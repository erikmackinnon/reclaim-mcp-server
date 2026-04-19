import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNormalizedReclaimError } from "../../../test/harness/assertions.js";
import { reclaim } from "../../core/http.js";
import { getCurrentUserTimePolicies, listAccounts } from "./client.js";

const ORIGINAL_API_KEY = process.env.RECLAIM_API_KEY;

describe("users/accounts client error normalization", () => {
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

  it("normalizes missing API key failures for account listing", async () => {
    const requestSpy = vi.spyOn(reclaim, "request");

    try {
      await listAccounts();
      throw new Error("Expected listAccounts to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "listAccounts",
        messageFragment: "RECLAIM_API_KEY environment variable is not set",
        status: undefined,
        detailMatcher: expect.objectContaining({
          stack: expect.any(String),
        }),
      });
    }

    expect(requestSpy).not.toHaveBeenCalled();
  });

  it("normalizes missing API key failures for user time-policies reads", async () => {
    const requestSpy = vi.spyOn(reclaim, "request");

    try {
      await getCurrentUserTimePolicies({ query: { includeInherited: true } });
      throw new Error("Expected getCurrentUserTimePolicies to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "getCurrentUserTimePolicies",
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
