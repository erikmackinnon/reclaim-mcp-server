import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { reclaim } from "../../core/http.js";
import {
  addTimeToTask,
  createTask,
  createTaskAtTime,
  listTasks,
  logWorkForTask,
  updateTask,
} from "./client.js";
import { ReclaimError } from "../../../types/reclaim.js";

const ORIGINAL_API_KEY = process.env.RECLAIM_API_KEY;

function assertNormalizedError(
  error: unknown,
  context: string,
  fragment: string,
): void {
  expect(error).toBeInstanceOf(ReclaimError);
  const reclaimError = error as ReclaimError;
  expect(reclaimError.message).toContain(`API Call Failed (${context}):`);
  expect(reclaimError.message).toContain(fragment);
  expect(reclaimError.status).toBeUndefined();
  expect(reclaimError.detail).toMatchObject({
    stack: expect.any(String),
  });
}

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
      assertNormalizedError(
        error,
        "listTasks",
        "RECLAIM_API_KEY environment variable is not set",
      );
    }

    expect(requestSpy).not.toHaveBeenCalled();
  });

  it("normalizes createTask local input parsing failures", async () => {
    try {
      await createTask({ title: "Bad due", due: "not-a-date" });
      throw new Error("Expected createTask to throw");
    } catch (error: unknown) {
      assertNormalizedError(error, "createTask", 'Invalid date format: "not-a-date"');
    }
  });

  it("normalizes createTaskAtTime local input parsing failures", async () => {
    try {
      await createTaskAtTime("bad-start-time", { title: "At time task" });
      throw new Error("Expected createTaskAtTime to throw");
    } catch (error: unknown) {
      assertNormalizedError(
        error,
        "createTaskAtTime(startTime=bad-start-time)",
        'Invalid date format: "bad-start-time"',
      );
    }
  });

  it("normalizes updateTask local input parsing failures", async () => {
    try {
      await updateTask(42, { deadline: "not-a-date" });
      throw new Error("Expected updateTask to throw");
    } catch (error: unknown) {
      assertNormalizedError(
        error,
        "updateTask(taskId=42)",
        'Invalid date format: "not-a-date"',
      );
    }
  });

  it("normalizes addTimeToTask validation failures", async () => {
    try {
      await addTimeToTask(123, 0);
      throw new Error("Expected addTimeToTask to throw");
    } catch (error: unknown) {
      assertNormalizedError(
        error,
        "addTimeToTask(taskId=123, minutes=0)",
        "Minutes must be positive to add time.",
      );
    }
  });

  it("normalizes logWorkForTask validation failures", async () => {
    try {
      await logWorkForTask(123, -15);
      throw new Error("Expected logWorkForTask to throw");
    } catch (error: unknown) {
      assertNormalizedError(
        error,
        "logWorkForTask(taskId=123, minutes=-15, end=now)",
        "Minutes must be positive to log work.",
      );
    }
  });
});
