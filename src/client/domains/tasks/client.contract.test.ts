import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { expectNormalizedReclaimError } from "../../../test/harness/assertions.js";
import {
  installNockLifecycle,
  reclaimApiPath,
  reclaimApiScope,
} from "../../../test/harness/nock.js";

import { addTimeToTask, getTask, listTasks, logWorkForTask } from "./client.js";

const ORIGINAL_API_KEY = process.env.RECLAIM_API_KEY;

installNockLifecycle();

describe("task domain client contracts", () => {
  beforeEach(() => {
    process.env.RECLAIM_API_KEY = "test-token";
  });

  afterEach(() => {
    if (ORIGINAL_API_KEY === undefined) {
      delete process.env.RECLAIM_API_KEY;
    } else {
      process.env.RECLAIM_API_KEY = ORIGINAL_API_KEY;
    }
  });

  it("lists tasks from the canonical API route", async () => {
    reclaimApiScope()
      .get(reclaimApiPath("/tasks"))
      .reply(200, [
        {
          id: 11,
          title: "Sample task",
          deleted: false,
          status: "NEW",
        },
      ]);

    const tasks = await listTasks();
    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.id).toBe(11);
    expect(tasks[0]?.title).toBe("Sample task");
  });

  it("sends planner add-time requests with minutes query params", async () => {
    reclaimApiScope()
      .post(reclaimApiPath("/planner/add-time/task/42"))
      .query({ minutes: 30 })
      .reply(200, { ok: true });

    const result = await addTimeToTask(42, 30);
    expect(result).toEqual({ ok: true });
  });

  it("normalizes timezone-aware log-work end values into ISO UTC", async () => {
    reclaimApiScope()
      .post(reclaimApiPath("/planner/log-work/task/7"))
      .query({
        minutes: 45,
        end: "2026-01-05T16:00:00.000Z",
      })
      .reply(200, { logged: true });

    const result = await logWorkForTask(
      7,
      45,
      "2026-01-05T08:00:00",
      "America/Los_Angeles",
    );
    expect(result).toEqual({ logged: true });
  });

  it("normalizes axios response errors with status and body detail", async () => {
    reclaimApiScope()
      .get(reclaimApiPath("/tasks/999"))
      .reply(401, { message: "Unauthorized" });

    try {
      await getTask(999);
      throw new Error("Expected getTask to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "getTask(taskId=999)",
        messageFragment: "Unauthorized",
        status: 401,
        detailMatcher: { message: "Unauthorized" },
      });
    }
  });
});
