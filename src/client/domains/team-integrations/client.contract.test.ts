import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { expectNormalizedReclaimError } from "../../../test/harness/assertions.js";
import {
  installNockLifecycle,
  reclaimApiPath,
  reclaimApiScope,
} from "../../../test/harness/nock.js";
import {
  createTeamOooCalendar,
  createZoomIntegration,
  deleteAsanaIntegrations,
  deleteClickupIntegrations,
  deleteJiraIntegration,
  deleteJiraV2Site,
  deleteLinearIntegration,
  deleteTeamOooCalendar,
  deleteTodoistIntegration,
  deleteZoomIntegration,
  deleteZoomIntegrationUser,
  getClickupIntegrationDetails,
  getIntegrationsEnabled,
  getSlackIntegrations,
  getTeamCurrent,
  getTeamCurrentMembership,
  getTeamOooCalendar,
  getTodoistIntegrationDetails,
  getZoomIntegrations,
  leaveTeamCurrent,
  listAsanaIntegrations,
  listClickupIntegrations,
  listJiraIntegrations,
  listJiraV2Sites,
  listLinearIntegrations,
  listTeamEditions,
  listTeamJoinable,
  listTeamOooCalendars,
  listTeamOooCalendarsAvailable,
  listTodoistIntegrations,
  respondTeamCurrentJoin,
  syncPeople,
  syncTodoist,
  updateAsanaIntegrations,
  updateClickupIntegration,
  updateClickupIntegrationSettings,
  updateJiraIntegration,
  updateLinearIntegration,
  updateSlackIntegrations,
  updateTeamOooCalendar,
  updateTodoistIntegration,
  updateTodoistIntegrationSettings,
} from "./client.js";

const ORIGINAL_API_KEY = process.env.RECLAIM_API_KEY;

installNockLifecycle();

describe("team/integrations domain client contracts", () => {
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

  it("covers team self-service and OOO calendar lifecycle", async () => {
    reclaimApiScope()
      .get(reclaimApiPath("/team/current"))
      .query({ include: "all" })
      .reply(200, { id: "team-1", name: "Core" });

    reclaimApiScope()
      .get(reclaimApiPath("/team/current/membership"))
      .reply(200, { id: "membership-1", role: "member" });

    reclaimApiScope()
      .post(reclaimApiPath("/team/current/joinResponses"), {
        response: "accept",
      })
      .reply(200, { success: true });

    reclaimApiScope()
      .post(reclaimApiPath("/team/current/leave"), { reason: "done" })
      .reply(200, { success: true });

    reclaimApiScope().get(reclaimApiPath("/team/editions")).reply(200, {
      id: "edition-1",
      tier: "team",
    });

    reclaimApiScope()
      .get(reclaimApiPath("/team/joinable"))
      .reply(200, [{ id: "join-1", teamName: "Design" }]);

    reclaimApiScope()
      .get(reclaimApiPath("/team/ooo-calendars"))
      .reply(200, [{ id: "ooo-1", provider: "google" }]);

    reclaimApiScope()
      .post(reclaimApiPath("/team/ooo-calendars"), { calendarId: "cal-1" })
      .reply(200, { id: "ooo-2", calendarId: "cal-1" });

    reclaimApiScope()
      .get(reclaimApiPath("/team/ooo-calendars/available"))
      .reply(200, [{ id: "ooo-3" }]);

    reclaimApiScope()
      .get(reclaimApiPath("/team/ooo-calendars/ooo-1"))
      .query({ includeHidden: false })
      .reply(200, { id: "ooo-1", provider: "google" });

    reclaimApiScope()
      .patch(reclaimApiPath("/team/ooo-calendars/ooo-1"), { enabled: true })
      .reply(200, { id: "ooo-1", enabled: true });

    reclaimApiScope()
      .delete(reclaimApiPath("/team/ooo-calendars/ooo-1"))
      .reply(204);

    const current = await getTeamCurrent({
      query: {
        include: "all",
      },
    });
    expect(current.id).toBe("team-1");

    const membership = await getTeamCurrentMembership();
    expect(membership.role).toBe("member");

    const joinResponse = await respondTeamCurrentJoin({ response: "accept" });
    expect(joinResponse).toEqual({ success: true });

    const leaveResponse = await leaveTeamCurrent({ reason: "done" });
    expect(leaveResponse).toEqual({ success: true });

    const editions = await listTeamEditions();
    expect(editions[0]?.id).toBe("edition-1");

    const joinable = await listTeamJoinable();
    expect(joinable[0]?.id).toBe("join-1");

    const oooCalendars = await listTeamOooCalendars();
    expect(oooCalendars[0]?.id).toBe("ooo-1");

    const created = await createTeamOooCalendar({ calendarId: "cal-1" });
    expect(created.id).toBe("ooo-2");

    const available = await listTeamOooCalendarsAvailable();
    expect(available[0]?.id).toBe("ooo-3");

    const calendar = await getTeamOooCalendar("ooo-1", {
      query: {
        includeHidden: false,
      },
    });
    expect(calendar.id).toBe("ooo-1");

    const updated = await updateTeamOooCalendar("ooo-1", { enabled: true });
    expect(updated.enabled).toBe(true);

    await deleteTeamOooCalendar("ooo-1");
  });

  it("covers integration provider read/update/sync/disconnect flows", async () => {
    reclaimApiScope()
      .get(reclaimApiPath("/integrations/enabled"))
      .reply(200, { providers: ["slack", "jira"] });

    reclaimApiScope().get(reclaimApiPath("/slack/integrations")).reply(200, {
      id: "slack-1",
      enabled: true,
    });

    reclaimApiScope()
      .put(reclaimApiPath("/slack/integrations"), { enabled: false })
      .reply(200, { id: "slack-1", enabled: false });

    reclaimApiScope()
      .get(reclaimApiPath("/integrations/zoom"))
      .reply(200, [{ id: "zoom-1" }]);

    reclaimApiScope()
      .post(reclaimApiPath("/integrations/zoom"), { workspace: "primary" })
      .reply(200, { id: "zoom-2" });

    reclaimApiScope().delete(reclaimApiPath("/integrations/zoom")).reply(204);

    reclaimApiScope()
      .delete(reclaimApiPath("/integrations/zoom/user"))
      .reply(204);

    reclaimApiScope()
      .get(reclaimApiPath("/todoist/integrations"))
      .reply(200, { id: "todo-1" });

    reclaimApiScope()
      .get(reclaimApiPath("/todoist/integrations/details"))
      .reply(200, { id: "todo-details" });

    reclaimApiScope()
      .patch(reclaimApiPath("/todoist/integrations/settings/todo-1"), {
        projectId: "inbox",
      })
      .reply(200, { id: "todo-1", projectId: "inbox" });

    reclaimApiScope()
      .patch(reclaimApiPath("/todoist/integrations/todo-1"), {
        enabled: true,
      })
      .reply(200, { id: "todo-1", enabled: true });

    reclaimApiScope()
      .delete(reclaimApiPath("/todoist/integrations/todo-1"))
      .reply(204);

    reclaimApiScope()
      .post(reclaimApiPath("/todoist/sync"), { force: true })
      .reply(200, { queued: true });

    reclaimApiScope()
      .get(reclaimApiPath("/linear/integrations"))
      .reply(200, [{ id: "linear-1" }]);

    reclaimApiScope()
      .patch(reclaimApiPath("/linear/integrations/linear-1"), {
        teamId: "team-123",
      })
      .reply(200, { id: "linear-1", teamId: "team-123" });

    reclaimApiScope()
      .delete(reclaimApiPath("/linear/integrations/linear-1"))
      .reply(204);

    reclaimApiScope()
      .get(reclaimApiPath("/jira/integrations"))
      .reply(200, [{ id: "jira-1" }]);

    reclaimApiScope()
      .patch(reclaimApiPath("/jira/integrations/jira-1"), {
        projectKey: "PROJ",
      })
      .reply(200, { id: "jira-1", projectKey: "PROJ" });

    reclaimApiScope()
      .delete(reclaimApiPath("/jira/integrations/jira-1"))
      .reply(204);

    reclaimApiScope()
      .get(reclaimApiPath("/jira-v2/sites"))
      .reply(200, [{ id: "site-1" }]);

    reclaimApiScope()
      .delete(reclaimApiPath("/jira-v2/sites/site-1"))
      .reply(204);

    reclaimApiScope()
      .get(reclaimApiPath("/asana/integrations"))
      .reply(200, [{ id: "asana-1" }]);

    reclaimApiScope()
      .patch(reclaimApiPath("/asana/integrations"), { workspace: "Main" })
      .reply(200, { id: "asana-1", workspace: "Main" });

    reclaimApiScope().delete(reclaimApiPath("/asana/integrations")).reply(204);

    reclaimApiScope()
      .get(reclaimApiPath("/clickup/integrations"))
      .reply(200, [{ id: "click-1" }]);

    reclaimApiScope()
      .delete(reclaimApiPath("/clickup/integrations"))
      .reply(204);

    reclaimApiScope()
      .get(reclaimApiPath("/clickup/integrations/details"))
      .reply(200, { id: "click-details" });

    reclaimApiScope()
      .patch(reclaimApiPath("/clickup/integrations/click-1"), {
        workspace: "w-1",
      })
      .reply(200, { id: "click-1", workspace: "w-1" });

    reclaimApiScope()
      .patch(reclaimApiPath("/clickup/integrations/settings/click-1"), {
        listId: "l-1",
      })
      .reply(200, { id: "click-1", listId: "l-1" });

    reclaimApiScope()
      .post(reclaimApiPath("/people/sync"), { provider: "google" })
      .reply(200, { synced: true });

    const enabled = await getIntegrationsEnabled();
    expect(enabled).toEqual({ providers: ["slack", "jira"] });

    const slack = await getSlackIntegrations();
    expect(slack[0]?.id).toBe("slack-1");

    const updatedSlack = await updateSlackIntegrations({ enabled: false });
    expect(
      Array.isArray(updatedSlack)
        ? updatedSlack[0]?.enabled
        : updatedSlack.enabled,
    ).toBe(false);

    const zoom = await getZoomIntegrations();
    expect(zoom[0]?.id).toBe("zoom-1");

    const createdZoom = await createZoomIntegration({ workspace: "primary" });
    expect(createdZoom.id).toBe("zoom-2");

    await deleteZoomIntegration();
    await deleteZoomIntegrationUser();

    const todoist = await listTodoistIntegrations();
    expect(todoist[0]?.id).toBe("todo-1");

    const todoistDetails = await getTodoistIntegrationDetails();
    expect(todoistDetails.id).toBe("todo-details");

    const todoistSettings = await updateTodoistIntegrationSettings("todo-1", {
      projectId: "inbox",
    });
    expect(todoistSettings.projectId).toBe("inbox");

    const todoistUpdated = await updateTodoistIntegration("todo-1", {
      enabled: true,
    });
    expect(todoistUpdated.enabled).toBe(true);

    await deleteTodoistIntegration("todo-1");

    const todoistSync = await syncTodoist({ force: true });
    expect(todoistSync).toEqual({ queued: true });

    const linear = await listLinearIntegrations();
    expect(linear[0]?.id).toBe("linear-1");

    const linearUpdated = await updateLinearIntegration("linear-1", {
      teamId: "team-123",
    });
    expect(linearUpdated.teamId).toBe("team-123");

    await deleteLinearIntegration("linear-1");

    const jira = await listJiraIntegrations();
    expect(jira[0]?.id).toBe("jira-1");

    const jiraUpdated = await updateJiraIntegration("jira-1", {
      projectKey: "PROJ",
    });
    expect(jiraUpdated.projectKey).toBe("PROJ");

    await deleteJiraIntegration("jira-1");

    const jiraSites = await listJiraV2Sites();
    expect(jiraSites[0]?.id).toBe("site-1");

    await deleteJiraV2Site("site-1");

    const asana = await listAsanaIntegrations();
    expect(asana[0]?.id).toBe("asana-1");

    const asanaUpdated = await updateAsanaIntegrations({ workspace: "Main" });
    expect(
      Array.isArray(asanaUpdated)
        ? asanaUpdated[0]?.workspace
        : asanaUpdated.workspace,
    ).toBe("Main");

    await deleteAsanaIntegrations();

    const clickup = await listClickupIntegrations();
    expect(clickup[0]?.id).toBe("click-1");

    await deleteClickupIntegrations();

    const clickupDetails = await getClickupIntegrationDetails();
    expect(clickupDetails.id).toBe("click-details");

    const clickupUpdated = await updateClickupIntegration("click-1", {
      workspace: "w-1",
    });
    expect(clickupUpdated.workspace).toBe("w-1");

    const clickupSettings = await updateClickupIntegrationSettings("click-1", {
      listId: "l-1",
    });
    expect(clickupSettings.listId).toBe("l-1");

    const syncedPeople = await syncPeople({ provider: "google" });
    expect(syncedPeople).toEqual({ synced: true });
  });

  it("normalizes axios errors for team membership lookups", async () => {
    reclaimApiScope()
      .get(reclaimApiPath("/team/current/membership"))
      .reply(404, { message: "Membership not found" });

    try {
      await getTeamCurrentMembership();
      throw new Error("Expected getTeamCurrentMembership to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "getTeamCurrentMembership",
        messageFragment: "Membership not found",
        status: 404,
        detailMatcher: { message: "Membership not found" },
      });
    }
  });
});
