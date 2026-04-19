import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  installNockLifecycle,
  reclaimApiPath,
  reclaimApiScope,
} from "../../../test/harness/nock.js";
import {
  chatInteraction,
  closeInteraction,
  createInteraction,
  generateProactiveGtd,
  getCurrentDailyDigest,
  getCurrentProactiveGtd,
  getFocusInsightsV3,
  getInteraction,
  getMoment,
  getNextMoment,
  getPendingInterpreterPlan,
  getTaskInteraction,
  getTeamAnalytics,
  getTeamAnalyticsV3,
  getTeamAnalyticsV4,
  getTeamAnalyticsV4Export,
  getTeamAnalyticsV4Filters,
  getTeamAnalyticsV4Permissions,
  getUserAnalytics,
  getUserAnalyticsV3,
  getWeeklyReportSocial,
  listChangelog,
  listChangelogEvents,
  listChangelogSchedulingLinks,
  listChangelogSmartHabits,
  listChangelogSmartMeetings,
  listChangelogTasks,
  listInteractionRecords,
  listInteractions,
  sendInterpreterMessage,
  setCurrentInteraction,
  updateInteraction,
} from "./client.js";

const ORIGINAL_API_KEY = process.env.RECLAIM_API_KEY;

installNockLifecycle();

describe("analytics/changelog/assist domain client contracts", () => {
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

  it("covers analytics reads with query and payload normalization", async () => {
    reclaimApiScope()
      .get(reclaimApiPath("/analytics/user"))
      .query({
        start: "2026-01-03T16:00:00.000Z",
        end: "2026-01-03T17:00:00.000Z",
      })
      .reply(200, { scope: "user-v1" });

    reclaimApiScope()
      .get(reclaimApiPath("/analytics/user/V3"))
      .query({
        includeForecast: true,
      })
      .reply(200, { scope: "user-v3" });

    reclaimApiScope()
      .get(reclaimApiPath("/analytics/team"))
      .query({
        teamId: "team-123",
      })
      .reply(200, { scope: "team-v1" });

    reclaimApiScope()
      .get(reclaimApiPath("/analytics/team/V3"))
      .query({
        includeBenchmarks: true,
      })
      .reply(200, { scope: "team-v3" });

    reclaimApiScope()
      .post(
        reclaimApiPath("/analytics/team/V4"),
        (body: Record<string, unknown>) =>
          body.start === "2026-01-03T16:00:00.000Z" &&
          body.end === "2026-01-03T17:00:00.000Z" &&
          body.due === "2026-01-04T08:00:00.000Z" &&
          !("deadline" in body),
      )
      .query({ granularity: "week" })
      .reply(200, { scope: "team-v4" });

    reclaimApiScope()
      .get(reclaimApiPath("/analytics/team/V4/export"))
      .query({
        format: "csv",
      })
      .reply(200, { url: "https://example.invalid/export.csv" });

    reclaimApiScope()
      .get(reclaimApiPath("/analytics/team/V4/filters"))
      .query({
        includeDeprecated: false,
      })
      .reply(200, { filters: [] });

    reclaimApiScope()
      .get(reclaimApiPath("/analytics/team/V4/permissions"))
      .query({
        includeInherited: true,
      })
      .reply(200, { canView: true });

    reclaimApiScope()
      .get(reclaimApiPath("/analytics/focus/insights/V3"))
      .query({
        start: "2026-01-03T16:00:00.000Z",
        end: "2026-01-03T17:00:00.000Z",
      })
      .reply(200, { focus: 72 });

    reclaimApiScope()
      .get(reclaimApiPath("/weekly-report/social"))
      .query({
        weekOf: "2026-01-05T08:00:00.000Z",
      })
      .reply(200, { summary: "Strong week" });

    const user = await getUserAnalytics({
      query: {
        start: "2026-01-03T08:00:00",
        end: "2026-01-03T09:00:00",
      },
      timeZone: "America/Los_Angeles",
    });
    expect(user.scope).toBe("user-v1");

    const userV3 = await getUserAnalyticsV3({
      query: {
        includeForecast: true,
      },
    });
    expect(userV3.scope).toBe("user-v3");

    const team = await getTeamAnalytics({
      query: {
        teamId: "team-123",
      },
    });
    expect(team.scope).toBe("team-v1");

    const teamV3 = await getTeamAnalyticsV3({
      query: {
        includeBenchmarks: true,
      },
    });
    expect(teamV3.scope).toBe("team-v3");

    const teamV4 = await getTeamAnalyticsV4(
      {
        start: "2026-01-03T08:00:00",
        end: "2026-01-03T09:00:00",
        deadline: "2026-01-04",
      },
      {
        query: {
          granularity: "week",
        },
        timeZone: "America/Los_Angeles",
      },
    );
    expect(teamV4.scope).toBe("team-v4");

    const teamExport = await getTeamAnalyticsV4Export({
      query: {
        format: "csv",
      },
    });
    expect(teamExport.url).toBe("https://example.invalid/export.csv");

    const teamFilters = await getTeamAnalyticsV4Filters({
      query: {
        includeDeprecated: false,
      },
    });
    expect(teamFilters.filters).toEqual([]);

    const teamPermissions = await getTeamAnalyticsV4Permissions({
      query: {
        includeInherited: true,
      },
    });
    expect(teamPermissions.canView).toBe(true);

    const focusInsights = await getFocusInsightsV3({
      query: {
        start: "2026-01-03T08:00:00",
        end: "2026-01-03T09:00:00",
      },
      timeZone: "America/Los_Angeles",
    });
    expect(focusInsights.focus).toBe(72);

    const weekly = await getWeeklyReportSocial({
      query: {
        weekOf: "2026-01-05",
      },
      timeZone: "America/Los_Angeles",
    });
    expect(weekly.summary).toBe("Strong week");
  });

  it("covers changelog reads across all typed changelog entities", async () => {
    reclaimApiScope()
      .get(reclaimApiPath("/changelog"))
      .query({ limit: 10 })
      .reply(200, [{ id: "root-1" }]);

    reclaimApiScope()
      .get(reclaimApiPath("/changelog/events"))
      .query({ limit: 10 })
      .reply(200, [{ id: "event-1" }]);

    reclaimApiScope()
      .get(reclaimApiPath("/changelog/tasks"))
      .query({ limit: 10 })
      .reply(200, [{ id: "task-1" }]);

    reclaimApiScope()
      .get(reclaimApiPath("/changelog/smart-habits"))
      .query({ limit: 10 })
      .reply(200, [{ id: "habit-1" }]);

    reclaimApiScope()
      .get(reclaimApiPath("/changelog/smart-meetings"))
      .query({ limit: 10 })
      .reply(200, [{ id: "meeting-1" }]);

    reclaimApiScope()
      .get(reclaimApiPath("/changelog/scheduling-links"))
      .query({ limit: 10 })
      .reply(200, [{ id: "link-1" }]);

    const changelog = await listChangelog({ query: { limit: 10 } });
    expect(changelog[0]?.id).toBe("root-1");

    const events = await listChangelogEvents({ query: { limit: 10 } });
    expect(events[0]?.id).toBe("event-1");

    const tasks = await listChangelogTasks({ query: { limit: 10 } });
    expect(tasks[0]?.id).toBe("task-1");

    const habits = await listChangelogSmartHabits({ query: { limit: 10 } });
    expect(habits[0]?.id).toBe("habit-1");

    const meetings = await listChangelogSmartMeetings({ query: { limit: 10 } });
    expect(meetings[0]?.id).toBe("meeting-1");

    const links = await listChangelogSchedulingLinks({ query: { limit: 10 } });
    expect(links[0]?.id).toBe("link-1");
  });

  it("covers assist interaction, digest, proactive GTD, and moment flows", async () => {
    reclaimApiScope()
      .get(reclaimApiPath("/interactions"))
      .query({ limit: 5 })
      .reply(200, [{ id: "int-1" }]);

    reclaimApiScope()
      .post(
        reclaimApiPath("/interactions"),
        (body: Record<string, unknown>) =>
          body.start === "2026-01-03T16:00:00.000Z" &&
          body.due === "2026-01-04T08:00:00.000Z" &&
          !("deadline" in body),
      )
      .query({ includeContext: true })
      .reply(200, { id: "int-2", status: "open" });

    reclaimApiScope()
      .get(reclaimApiPath("/interactions/int-2"))
      .reply(200, { id: "int-2", status: "open" });

    reclaimApiScope()
      .post(reclaimApiPath("/interactions/chat"), { message: "hello" })
      .reply(200, { sent: true });

    reclaimApiScope()
      .post(reclaimApiPath("/interactions/close"), { id: "int-2" })
      .reply(200, { closed: true });

    reclaimApiScope()
      .post(reclaimApiPath("/interactions/current"), { id: "int-2" })
      .reply(200, { current: "int-2" });

    reclaimApiScope()
      .get(reclaimApiPath("/interactions/daily-digest/current"))
      .reply(200, { digestId: "digest-1" });

    reclaimApiScope()
      .get(reclaimApiPath("/interactions/proactive-gtd/current"))
      .reply(200, { gtdId: "gtd-1" });

    reclaimApiScope()
      .post(reclaimApiPath("/interactions/proactive-gtd/generate"), {
        focusArea: "planning",
      })
      .reply(200, { generated: true });

    reclaimApiScope()
      .get(reclaimApiPath("/interactions/records"))
      .reply(200, [{ id: "rec-1" }]);

    reclaimApiScope()
      .get(reclaimApiPath("/interactions/task/task-7"))
      .reply(200, { taskId: "task-7", interactions: 2 });

    reclaimApiScope()
      .post(reclaimApiPath("/interactions/update"), {
        id: "int-2",
        status: "resolved",
      })
      .reply(200, { updated: true });

    reclaimApiScope()
      .post(reclaimApiPath("/interpreter/message"), {
        prompt: "summarize",
      })
      .reply(200, { reply: "done" });

    reclaimApiScope()
      .get(reclaimApiPath("/interpreter/plans/pending/plan-1"))
      .reply(200, { id: "plan-1", status: "pending" });

    reclaimApiScope()
      .get(reclaimApiPath("/moment"))
      .reply(200, { id: "moment-1" });

    reclaimApiScope()
      .get(reclaimApiPath("/moment/next"))
      .reply(200, { id: "moment-2" });

    const interactions = await listInteractions({ query: { limit: 5 } });
    expect(interactions[0]?.id).toBe("int-1");

    const created = await createInteraction(
      {
        start: "2026-01-03T08:00:00",
        deadline: "2026-01-04",
      },
      {
        query: {
          includeContext: true,
        },
        timeZone: "America/Los_Angeles",
      },
    );
    expect(created.id).toBe("int-2");

    const interaction = await getInteraction("int-2");
    expect(interaction.id).toBe("int-2");

    const chat = await chatInteraction({ message: "hello" });
    expect(chat.sent).toBe(true);

    const closed = await closeInteraction({ id: "int-2" });
    expect(closed.closed).toBe(true);

    const current = await setCurrentInteraction({ id: "int-2" });
    expect(current.current).toBe("int-2");

    const digest = await getCurrentDailyDigest();
    expect(digest.digestId).toBe("digest-1");

    const proactiveCurrent = await getCurrentProactiveGtd();
    expect(proactiveCurrent.gtdId).toBe("gtd-1");

    const proactiveGenerated = await generateProactiveGtd({
      focusArea: "planning",
    });
    expect(proactiveGenerated.generated).toBe(true);

    const records = await listInteractionRecords();
    expect(records[0]?.id).toBe("rec-1");

    const taskInteraction = await getTaskInteraction("task-7");
    expect(taskInteraction.interactions).toBe(2);

    const updated = await updateInteraction({
      id: "int-2",
      status: "resolved",
    });
    expect(updated.updated).toBe(true);

    const interpreter = await sendInterpreterMessage({
      prompt: "summarize",
    });
    expect(interpreter.reply).toBe("done");

    const pendingPlan = await getPendingInterpreterPlan("plan-1");
    expect(pendingPlan.id).toBe("plan-1");

    const moment = await getMoment();
    expect(moment.id).toBe("moment-1");

    const nextMoment = await getNextMoment();
    expect(nextMoment.id).toBe("moment-2");
  });
});
