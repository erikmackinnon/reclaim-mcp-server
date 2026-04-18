import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { expectNormalizedReclaimError } from "../../../test/harness/assertions.js";
import {
  installNockLifecycle,
  reclaimApiPath,
  reclaimApiScope,
} from "../../../test/harness/nock.js";

import {
  addTimeToTask,
  batchDeleteTasks,
  batchUpdateTasks,
  bulkRescheduleTaskEvents,
  getRecommendedTasks,
  getTask,
  getTaskMinIndex,
  listTasks,
  logWorkForTask,
  planWorkTask,
  reindexTask,
  reindexTasksByDue,
  rescheduleTaskEvent,
  restartTask,
} from "./client.js";

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

  it("sends batch update payloads with ids merged into patch fields", async () => {
    reclaimApiScope()
      .patch(reclaimApiPath("/tasks/batch"), {
        ids: [11, 12],
        notes: "Updated in bulk",
      })
      .reply(200, { updated: 2 });

    const result = await batchUpdateTasks(
      {
        taskIds: [11, 12],
        updates: { notes: "Updated in bulk" },
      },
      "America/Los_Angeles",
    );
    expect(result).toEqual({ updated: 2 });
  });

  it("sends batch delete payloads through DELETE /tasks/batch", async () => {
    reclaimApiScope()
      .delete(reclaimApiPath("/tasks/batch"), {
        ids: [40, 41, 42],
      })
      .reply(200, { deleted: 3 });

    const result = await batchDeleteTasks({ taskIds: [40, 41, 42] });
    expect(result).toEqual({ deleted: 3 });
  });

  it("normalizes min-index responses when API returns a scalar number", async () => {
    reclaimApiScope()
      .get(reclaimApiPath("/tasks/min-index"))
      .reply(200, () => 17 as unknown as object);

    const result = await getTaskMinIndex();
    expect(result).toEqual({ minIndex: 17 });
  });

  it("requests recommended tasks from the typed recommendation endpoint", async () => {
    reclaimApiScope()
      .get(reclaimApiPath("/recommended-tasks"))
      .query({ limit: 2, onDeck: true })
      .reply(200, [
        {
          id: 88,
          title: "Ship docs",
          deleted: false,
          status: "NEW",
        },
      ]);

    const result = await getRecommendedTasks({ limit: 2, onDeck: true });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(88);
  });

  it("calls reindex endpoints for single-task and by-due flows", async () => {
    reclaimApiScope()
      .patch(reclaimApiPath("/tasks/55/reindex"), { index: 3 })
      .reply(200, { ok: true });
    reclaimApiScope()
      .patch(reclaimApiPath("/tasks/reindex-by-due"))
      .reply(200, { ok: true });

    const single = await reindexTask(55, 3);
    const byDue = await reindexTasksByDue();
    expect(single).toEqual({ ok: true });
    expect(byDue).toEqual({ ok: true });
  });

  it("sends plan-work and restart planner calls with query params", async () => {
    reclaimApiScope()
      .post(reclaimApiPath("/planner/plan-work/task/15"))
      .query({ minutes: 30 })
      .reply(200, { planned: true });

    reclaimApiScope()
      .post(reclaimApiPath("/planner/restart/task/15"))
      .query({ minutes: 45 })
      .reply(200, { restarted: true });

    const planned = await planWorkTask(
      15,
      { minutes: 30 },
      "America/Los_Angeles",
    );
    const restarted = await restartTask(
      15,
      { minutes: 45 },
      "America/Los_Angeles",
    );
    expect(planned).toEqual({ planned: true });
    expect(restarted).toEqual({ restarted: true });
  });

  it("normalizes local datetime query values for planner reschedule flows", async () => {
    reclaimApiScope()
      .post(reclaimApiPath("/planner/reschedule/task/event/event-1"))
      .query({
        plannerEventId: "event-2",
        at: "2026-02-14T17:00:00.000Z",
      })
      .reply(200, { moved: true });

    reclaimApiScope()
      .post(reclaimApiPath("/planner/task/reschedule/bulk"))
      .query({
        eventId: ["evt-1", "evt-2"],
        from: "2026-02-14T16:00:00.000Z",
      })
      .reply(200, { bulkMoved: true });

    const single = await rescheduleTaskEvent(
      "event-1",
      {
        plannerEventId: "event-2",
        at: "2026-02-14T09:00:00",
      },
      "America/Los_Angeles",
    );
    const bulk = await bulkRescheduleTaskEvents(
      {
        plannerEventIds: ["evt-1", "evt-2"],
        from: "2026-02-14T08:00:00",
      },
      "America/Los_Angeles",
    );

    expect(single).toEqual({ moved: true });
    expect(bulk).toEqual({ bulkMoved: true });
  });
});
