import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNormalizedReclaimError } from "../../../test/harness/assertions.js";
import { reclaim } from "../../core/http.js";
import {
  addTimeToTask,
  createTask,
  createTaskAtTime,
  listTasks,
  logWorkForTask,
  updateTask,
} from "./client.js";

const ORIGINAL_API_KEY = process.env.RECLAIM_API_KEY;

describe("task client error normalization", () => {
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
      await listTasks();
      throw new Error("Expected listTasks to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "listTasks",
        messageFragment: "RECLAIM_API_KEY environment variable is not set",
        status: undefined,
        detailMatcher: expect.objectContaining({
          stack: expect.any(String),
        }),
      });
    }

    expect(requestSpy).not.toHaveBeenCalled();
  });

  it("normalizes createTask local input parsing failures", async () => {
    try {
      await createTask({ title: "Bad due", due: "not-a-date" });
      throw new Error("Expected createTask to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "createTask",
        messageFragment: 'Invalid date format: "not-a-date"',
        status: undefined,
        detailMatcher: expect.objectContaining({
          stack: expect.any(String),
        }),
      });
    }
  });

  it("normalizes createTaskAtTime local input parsing failures", async () => {
    try {
      await createTaskAtTime("bad-start-time", { title: "At time task" });
      throw new Error("Expected createTaskAtTime to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "createTaskAtTime(startTime=bad-start-time)",
        messageFragment: 'Invalid date format: "bad-start-time"',
        status: undefined,
        detailMatcher: expect.objectContaining({
          stack: expect.any(String),
        }),
      });
    }
  });

  it("normalizes updateTask local input parsing failures", async () => {
    try {
      await updateTask(42, { deadline: "not-a-date" });
      throw new Error("Expected updateTask to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "updateTask(taskId=42)",
        messageFragment: 'Invalid date format: "not-a-date"',
        status: undefined,
        detailMatcher: expect.objectContaining({
          stack: expect.any(String),
        }),
      });
    }
  });

  it("normalizes addTimeToTask validation failures", async () => {
    try {
      await addTimeToTask(123, 0);
      throw new Error("Expected addTimeToTask to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "addTimeToTask(taskId=123, minutes=0)",
        messageFragment: "Minutes must be positive to add time.",
        status: undefined,
        detailMatcher: expect.objectContaining({
          stack: expect.any(String),
        }),
      });
    }
  });

  it("normalizes logWorkForTask validation failures", async () => {
    try {
      await logWorkForTask(123, -15);
      throw new Error("Expected logWorkForTask to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "logWorkForTask(taskId=123, minutes=-15, end=now)",
        messageFragment: "Minutes must be positive to log work.",
        status: undefined,
        detailMatcher: expect.objectContaining({
          stack: expect.any(String),
        }),
      });
    }
  });
});
