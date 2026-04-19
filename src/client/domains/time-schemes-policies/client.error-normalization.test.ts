import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNormalizedReclaimError } from "../../../test/harness/assertions.js";
import {
  installNockLifecycle,
  reclaimApiPath,
  reclaimApiScope,
} from "../../../test/harness/nock.js";
import { reclaim } from "../../core/http.js";
import { getTimeScheme, listTimeSchemes } from "./client.js";

const ORIGINAL_API_KEY = process.env.RECLAIM_API_KEY;

installNockLifecycle();

describe("time schemes and policies client error normalization", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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
    delete process.env.RECLAIM_API_KEY;
    const requestSpy = vi.spyOn(reclaim, "request");

    try {
      await listTimeSchemes();
      throw new Error("Expected listTimeSchemes to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "listTimeSchemes",
        messageFragment: "RECLAIM_API_KEY environment variable is not set",
        status: undefined,
        detailMatcher: expect.objectContaining({
          stack: expect.any(String),
        }),
      });
    }

    expect(requestSpy).not.toHaveBeenCalled();
  });

  it("normalizes request failures for time scheme lookups", async () => {
    process.env.RECLAIM_API_KEY = "test-token";

    reclaimApiScope()
      .get(reclaimApiPath("/timeschemes/ts-missing"))
      .reply(404, { message: "No time scheme found" });

    try {
      await getTimeScheme("ts-missing");
      throw new Error("Expected getTimeScheme to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "getTimeScheme(timeSchemeId=ts-missing)",
        messageFragment: "No time scheme found",
        status: 404,
        detailMatcher: { message: "No time scheme found" },
      });
    }
  });
});
