import { describe, expect, it } from "vitest";

import { parseDeadline } from "./reclaim-client.js";

describe("parseDeadline", () => {
  it("interprets local datetime without offset using provided timeZone", () => {
    expect(
      parseDeadline("2026-01-05T08:00:00", {
        timeZone: "America/Los_Angeles",
      }),
    ).toBe("2026-01-05T16:00:00.000Z");
  });

  it("keeps explicit offsets as-is (ignores timeZone option)", () => {
    expect(
      parseDeadline("2026-01-05T08:00:00-08:00", {
        timeZone: "America/New_York",
      }),
    ).toBe("2026-01-05T16:00:00.000Z");
  });

  it("resolves DST spring-forward gaps to the next valid local time", () => {
    // In America/Los_Angeles, 2026-03-08 02:30 does not exist (spring forward).
    // Prefer the next valid local time (03:30), which is 10:30Z.
    expect(
      parseDeadline("2026-03-08T02:30:00", {
        timeZone: "America/Los_Angeles",
      }),
    ).toBe("2026-03-08T10:30:00.000Z");
  });

  it("resolves DST fall-back overlaps to the earlier matching instant", () => {
    // In America/Los_Angeles, 2026-11-01 01:30 occurs twice.
    // Prefer the earlier occurrence (PDT), which is 08:30Z.
    expect(
      parseDeadline("2026-11-01T01:30:00", {
        timeZone: "America/Los_Angeles",
      }),
    ).toBe("2026-11-01T08:30:00.000Z");
  });

  it("interprets date-only inputs as midnight in the provided timeZone", () => {
    // Midnight America/Los_Angeles on 2026-01-05 is 08:00Z.
    expect(
      parseDeadline("2026-01-05", {
        timeZone: "America/Los_Angeles",
      }),
    ).toBe("2026-01-05T08:00:00.000Z");
  });

  it("rejects invalid local dates that would roll over", () => {
    expect(() =>
      parseDeadline("2026-02-30T09:00:00", {
        timeZone: "America/Los_Angeles",
      }),
    ).toThrow(/Invalid date\/time/);
  });

  it("rejects invalid local times that would roll over", () => {
    expect(() =>
      parseDeadline("2026-01-05T25:00:00", {
        timeZone: "America/Los_Angeles",
      }),
    ).toThrow(/Invalid hour/);
  });
});
