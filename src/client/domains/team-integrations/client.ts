import {
  normalizeQueryParams,
  reclaimHttpClient,
  type QueryParams,
} from "../../core/http.js";
import {
  type IntegrationConnection,
  type TeamMembership,
  type TeamOooCalendar,
  type TeamProfile,
} from "../../../types/reclaim.js";

type TeamIntegrationsRequestOptions = {
  query?: QueryParams;
};

type TeamIntegrationId = number | string;

type UnknownRecord = Record<string, unknown>;

function cleanUndefined<T extends Record<string, unknown>>(value: T): T {
  const copy: Record<string, unknown> = { ...value };
  for (const [key, entry] of Object.entries(copy)) {
    if (entry === undefined) {
      delete copy[key];
    }
  }

  return copy as T;
}

function toArray<T>(value: T[] | T): T[] {
  return Array.isArray(value) ? value : [value];
}

function normalizeOptionsQuery(
  options?: TeamIntegrationsRequestOptions,
): QueryParams | undefined {
  return normalizeQueryParams(options?.query);
}

function toPathId(value: TeamIntegrationId): string {
  return encodeURIComponent(String(value));
}

export async function getTeamCurrent(
  options?: TeamIntegrationsRequestOptions,
): Promise<TeamProfile> {
  const context = "getTeamCurrent";
  return reclaimHttpClient.get<TeamProfile>("/team/current", {
    context,
    query: normalizeOptionsQuery(options),
  });
}

export async function getTeamCurrentMembership(
  options?: TeamIntegrationsRequestOptions,
): Promise<TeamMembership> {
  const context = "getTeamCurrentMembership";
  return reclaimHttpClient.get<TeamMembership>("/team/current/membership", {
    context,
    query: normalizeOptionsQuery(options),
  });
}

export async function respondTeamCurrentJoin(
  payload: UnknownRecord = {},
  options?: TeamIntegrationsRequestOptions,
): Promise<UnknownRecord> {
  const context = "respondTeamCurrentJoin";
  return reclaimHttpClient.post<UnknownRecord>(
    "/team/current/joinResponses",
    cleanUndefined(payload),
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );
}

export async function leaveTeamCurrent(
  payload: UnknownRecord = {},
  options?: TeamIntegrationsRequestOptions,
): Promise<UnknownRecord> {
  const context = "leaveTeamCurrent";
  return reclaimHttpClient.post<UnknownRecord>(
    "/team/current/leave",
    cleanUndefined(payload),
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );
}

export async function listTeamEditions(
  options?: TeamIntegrationsRequestOptions,
): Promise<UnknownRecord[]> {
  const context = "listTeamEditions";
  const data = await reclaimHttpClient.get<UnknownRecord[] | UnknownRecord>(
    "/team/editions",
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );

  return toArray(data);
}

export async function listTeamJoinable(
  options?: TeamIntegrationsRequestOptions,
): Promise<UnknownRecord[]> {
  const context = "listTeamJoinable";
  const data = await reclaimHttpClient.get<UnknownRecord[] | UnknownRecord>(
    "/team/joinable",
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );

  return toArray(data);
}

export async function listTeamOooCalendars(
  options?: TeamIntegrationsRequestOptions,
): Promise<TeamOooCalendar[]> {
  const context = "listTeamOooCalendars";
  const data = await reclaimHttpClient.get<TeamOooCalendar[] | TeamOooCalendar>(
    "/team/ooo-calendars",
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );

  return toArray(data);
}

export async function createTeamOooCalendar(
  payload: UnknownRecord,
  options?: TeamIntegrationsRequestOptions,
): Promise<TeamOooCalendar> {
  const context = "createTeamOooCalendar";
  return reclaimHttpClient.post<TeamOooCalendar>(
    "/team/ooo-calendars",
    cleanUndefined(payload),
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );
}

export async function listTeamOooCalendarsAvailable(
  options?: TeamIntegrationsRequestOptions,
): Promise<TeamOooCalendar[]> {
  const context = "listTeamOooCalendarsAvailable";
  const data = await reclaimHttpClient.get<TeamOooCalendar[] | TeamOooCalendar>(
    "/team/ooo-calendars/available",
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );

  return toArray(data);
}

export async function getTeamOooCalendar(
  calendarId: TeamIntegrationId,
  options?: TeamIntegrationsRequestOptions,
): Promise<TeamOooCalendar> {
  const context = `getTeamOooCalendar(calendarId=${String(calendarId)})`;
  return reclaimHttpClient.get<TeamOooCalendar>(
    `/team/ooo-calendars/${toPathId(calendarId)}`,
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );
}

export async function deleteTeamOooCalendar(
  calendarId: TeamIntegrationId,
  options?: TeamIntegrationsRequestOptions,
): Promise<void> {
  const context = `deleteTeamOooCalendar(calendarId=${String(calendarId)})`;
  await reclaimHttpClient.delete(
    `/team/ooo-calendars/${toPathId(calendarId)}`,
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );
}

export async function updateTeamOooCalendar(
  calendarId: TeamIntegrationId,
  payload: UnknownRecord,
  options?: TeamIntegrationsRequestOptions,
): Promise<TeamOooCalendar> {
  const context = `updateTeamOooCalendar(calendarId=${String(calendarId)})`;
  return reclaimHttpClient.patch<TeamOooCalendar>(
    `/team/ooo-calendars/${toPathId(calendarId)}`,
    cleanUndefined(payload),
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );
}

export async function getIntegrationsEnabled(
  options?: TeamIntegrationsRequestOptions,
): Promise<UnknownRecord> {
  const context = "getIntegrationsEnabled";
  return reclaimHttpClient.get<UnknownRecord>("/integrations/enabled", {
    context,
    query: normalizeOptionsQuery(options),
  });
}

export async function getSlackIntegrations(
  options?: TeamIntegrationsRequestOptions,
): Promise<IntegrationConnection[]> {
  const context = "getSlackIntegrations";
  const data = await reclaimHttpClient.get<
    IntegrationConnection[] | IntegrationConnection
  >("/slack/integrations", {
    context,
    query: normalizeOptionsQuery(options),
  });

  return toArray(data);
}

export async function updateSlackIntegrations(
  payload: UnknownRecord,
  options?: TeamIntegrationsRequestOptions,
): Promise<IntegrationConnection[] | IntegrationConnection> {
  const context = "updateSlackIntegrations";
  return reclaimHttpClient.put<IntegrationConnection[] | IntegrationConnection>(
    "/slack/integrations",
    cleanUndefined(payload),
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );
}

export async function getZoomIntegrations(
  options?: TeamIntegrationsRequestOptions,
): Promise<IntegrationConnection[]> {
  const context = "getZoomIntegrations";
  const data = await reclaimHttpClient.get<
    IntegrationConnection[] | IntegrationConnection
  >("/integrations/zoom", {
    context,
    query: normalizeOptionsQuery(options),
  });

  return toArray(data);
}

export async function createZoomIntegration(
  payload: UnknownRecord = {},
  options?: TeamIntegrationsRequestOptions,
): Promise<IntegrationConnection> {
  const context = "createZoomIntegration";
  return reclaimHttpClient.post<IntegrationConnection>(
    "/integrations/zoom",
    cleanUndefined(payload),
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );
}

export async function deleteZoomIntegration(
  options?: TeamIntegrationsRequestOptions,
): Promise<void> {
  const context = "deleteZoomIntegration";
  await reclaimHttpClient.delete("/integrations/zoom", {
    context,
    query: normalizeOptionsQuery(options),
  });
}

export async function deleteZoomIntegrationUser(
  options?: TeamIntegrationsRequestOptions,
): Promise<void> {
  const context = "deleteZoomIntegrationUser";
  await reclaimHttpClient.delete("/integrations/zoom/user", {
    context,
    query: normalizeOptionsQuery(options),
  });
}

export async function listTodoistIntegrations(
  options?: TeamIntegrationsRequestOptions,
): Promise<IntegrationConnection[]> {
  const context = "listTodoistIntegrations";
  const data = await reclaimHttpClient.get<
    IntegrationConnection[] | IntegrationConnection
  >("/todoist/integrations", {
    context,
    query: normalizeOptionsQuery(options),
  });

  return toArray(data);
}

export async function getTodoistIntegrationDetails(
  options?: TeamIntegrationsRequestOptions,
): Promise<UnknownRecord> {
  const context = "getTodoistIntegrationDetails";
  return reclaimHttpClient.get<UnknownRecord>("/todoist/integrations/details", {
    context,
    query: normalizeOptionsQuery(options),
  });
}

export async function updateTodoistIntegrationSettings(
  integrationId: TeamIntegrationId,
  payload: UnknownRecord,
  options?: TeamIntegrationsRequestOptions,
): Promise<IntegrationConnection> {
  const context = `updateTodoistIntegrationSettings(integrationId=${String(integrationId)})`;
  return reclaimHttpClient.patch<IntegrationConnection>(
    `/todoist/integrations/settings/${toPathId(integrationId)}`,
    cleanUndefined(payload),
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );
}

export async function updateTodoistIntegration(
  integrationId: TeamIntegrationId,
  payload: UnknownRecord,
  options?: TeamIntegrationsRequestOptions,
): Promise<IntegrationConnection> {
  const context = `updateTodoistIntegration(integrationId=${String(integrationId)})`;
  return reclaimHttpClient.patch<IntegrationConnection>(
    `/todoist/integrations/${toPathId(integrationId)}`,
    cleanUndefined(payload),
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );
}

export async function deleteTodoistIntegration(
  integrationId: TeamIntegrationId,
  options?: TeamIntegrationsRequestOptions,
): Promise<void> {
  const context = `deleteTodoistIntegration(integrationId=${String(integrationId)})`;
  await reclaimHttpClient.delete(
    `/todoist/integrations/${toPathId(integrationId)}`,
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );
}

export async function syncTodoist(
  payload: UnknownRecord = {},
  options?: TeamIntegrationsRequestOptions,
): Promise<UnknownRecord> {
  const context = "syncTodoist";
  return reclaimHttpClient.post<UnknownRecord>(
    "/todoist/sync",
    cleanUndefined(payload),
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );
}

export async function listLinearIntegrations(
  options?: TeamIntegrationsRequestOptions,
): Promise<IntegrationConnection[]> {
  const context = "listLinearIntegrations";
  const data = await reclaimHttpClient.get<
    IntegrationConnection[] | IntegrationConnection
  >("/linear/integrations", {
    context,
    query: normalizeOptionsQuery(options),
  });

  return toArray(data);
}

export async function updateLinearIntegration(
  integrationId: TeamIntegrationId,
  payload: UnknownRecord,
  options?: TeamIntegrationsRequestOptions,
): Promise<IntegrationConnection> {
  const context = `updateLinearIntegration(integrationId=${String(integrationId)})`;
  return reclaimHttpClient.patch<IntegrationConnection>(
    `/linear/integrations/${toPathId(integrationId)}`,
    cleanUndefined(payload),
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );
}

export async function deleteLinearIntegration(
  integrationId: TeamIntegrationId,
  options?: TeamIntegrationsRequestOptions,
): Promise<void> {
  const context = `deleteLinearIntegration(integrationId=${String(integrationId)})`;
  await reclaimHttpClient.delete(
    `/linear/integrations/${toPathId(integrationId)}`,
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );
}

export async function listJiraIntegrations(
  options?: TeamIntegrationsRequestOptions,
): Promise<IntegrationConnection[]> {
  const context = "listJiraIntegrations";
  const data = await reclaimHttpClient.get<
    IntegrationConnection[] | IntegrationConnection
  >("/jira/integrations", {
    context,
    query: normalizeOptionsQuery(options),
  });

  return toArray(data);
}

export async function updateJiraIntegration(
  integrationId: TeamIntegrationId,
  payload: UnknownRecord,
  options?: TeamIntegrationsRequestOptions,
): Promise<IntegrationConnection> {
  const context = `updateJiraIntegration(integrationId=${String(integrationId)})`;
  return reclaimHttpClient.patch<IntegrationConnection>(
    `/jira/integrations/${toPathId(integrationId)}`,
    cleanUndefined(payload),
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );
}

export async function deleteJiraIntegration(
  integrationId: TeamIntegrationId,
  options?: TeamIntegrationsRequestOptions,
): Promise<void> {
  const context = `deleteJiraIntegration(integrationId=${String(integrationId)})`;
  await reclaimHttpClient.delete(
    `/jira/integrations/${toPathId(integrationId)}`,
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );
}

export async function listJiraV2Sites(
  options?: TeamIntegrationsRequestOptions,
): Promise<IntegrationConnection[]> {
  const context = "listJiraV2Sites";
  const data = await reclaimHttpClient.get<
    IntegrationConnection[] | IntegrationConnection
  >("/jira-v2/sites", {
    context,
    query: normalizeOptionsQuery(options),
  });

  return toArray(data);
}

export async function deleteJiraV2Site(
  siteId: TeamIntegrationId,
  options?: TeamIntegrationsRequestOptions,
): Promise<void> {
  const context = `deleteJiraV2Site(siteId=${String(siteId)})`;
  await reclaimHttpClient.delete(`/jira-v2/sites/${toPathId(siteId)}`, {
    context,
    query: normalizeOptionsQuery(options),
  });
}

export async function listAsanaIntegrations(
  options?: TeamIntegrationsRequestOptions,
): Promise<IntegrationConnection[]> {
  const context = "listAsanaIntegrations";
  const data = await reclaimHttpClient.get<
    IntegrationConnection[] | IntegrationConnection
  >("/asana/integrations", {
    context,
    query: normalizeOptionsQuery(options),
  });

  return toArray(data);
}

export async function updateAsanaIntegrations(
  payload: UnknownRecord,
  options?: TeamIntegrationsRequestOptions,
): Promise<IntegrationConnection[] | IntegrationConnection> {
  const context = "updateAsanaIntegrations";
  return reclaimHttpClient.patch<
    IntegrationConnection[] | IntegrationConnection
  >("/asana/integrations", cleanUndefined(payload), {
    context,
    query: normalizeOptionsQuery(options),
  });
}

export async function deleteAsanaIntegrations(
  options?: TeamIntegrationsRequestOptions,
): Promise<void> {
  const context = "deleteAsanaIntegrations";
  await reclaimHttpClient.delete("/asana/integrations", {
    context,
    query: normalizeOptionsQuery(options),
  });
}

export async function listClickupIntegrations(
  options?: TeamIntegrationsRequestOptions,
): Promise<IntegrationConnection[]> {
  const context = "listClickupIntegrations";
  const data = await reclaimHttpClient.get<
    IntegrationConnection[] | IntegrationConnection
  >("/clickup/integrations", {
    context,
    query: normalizeOptionsQuery(options),
  });

  return toArray(data);
}

export async function deleteClickupIntegrations(
  options?: TeamIntegrationsRequestOptions,
): Promise<void> {
  const context = "deleteClickupIntegrations";
  await reclaimHttpClient.delete("/clickup/integrations", {
    context,
    query: normalizeOptionsQuery(options),
  });
}

export async function getClickupIntegrationDetails(
  options?: TeamIntegrationsRequestOptions,
): Promise<UnknownRecord> {
  const context = "getClickupIntegrationDetails";
  return reclaimHttpClient.get<UnknownRecord>("/clickup/integrations/details", {
    context,
    query: normalizeOptionsQuery(options),
  });
}

export async function updateClickupIntegration(
  integrationId: TeamIntegrationId,
  payload: UnknownRecord,
  options?: TeamIntegrationsRequestOptions,
): Promise<IntegrationConnection> {
  const context = `updateClickupIntegration(integrationId=${String(integrationId)})`;
  return reclaimHttpClient.patch<IntegrationConnection>(
    `/clickup/integrations/${toPathId(integrationId)}`,
    cleanUndefined(payload),
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );
}

export async function updateClickupIntegrationSettings(
  integrationId: TeamIntegrationId,
  payload: UnknownRecord,
  options?: TeamIntegrationsRequestOptions,
): Promise<IntegrationConnection> {
  const context = `updateClickupIntegrationSettings(integrationId=${String(integrationId)})`;
  return reclaimHttpClient.patch<IntegrationConnection>(
    `/clickup/integrations/settings/${toPathId(integrationId)}`,
    cleanUndefined(payload),
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );
}

export async function syncPeople(
  payload: UnknownRecord = {},
  options?: TeamIntegrationsRequestOptions,
): Promise<UnknownRecord> {
  const context = "syncPeople";
  return reclaimHttpClient.post<UnknownRecord>(
    "/people/sync",
    cleanUndefined(payload),
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );
}
