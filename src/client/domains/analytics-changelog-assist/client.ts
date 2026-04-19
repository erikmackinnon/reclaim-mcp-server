import {
  normalizeApiError,
  normalizeQueryParams,
  reclaimHttpClient,
  type QueryParams,
} from "../../core/http.js";
import { fetchAccountTimeZone, parseDeadline } from "../tasks/client.js";
import {
  type AnalyticsSnapshot,
  type AssistInteraction,
  type ChangelogEntry,
  type InsightEntityId,
} from "../../../types/reclaim.js";

type InsightsRequestOptions = {
  query?: QueryParams;
  timeZone?: string;
};

type UnknownRecord = Record<string, unknown>;

const QUERY_DATE_KEYS = new Set([
  "availabilityend",
  "availabilitystart",
  "date",
  "deadline",
  "due",
  "end",
  "enddate",
  "endtime",
  "from",
  "on",
  "snoozeuntil",
  "start",
  "startdate",
  "starttime",
  "to",
  "weekof",
  "windowend",
  "windowstart",
]);

const PAYLOAD_DATE_KEYS = new Set([
  "availabilityend",
  "availabilitystart",
  "date",
  "deadline",
  "due",
  "end",
  "enddate",
  "endtime",
  "from",
  "on",
  "snoozeuntil",
  "start",
  "startdate",
  "starttime",
  "to",
  "weekof",
  "windowend",
  "windowstart",
]);

const NUMERIC_DATE_KEYS = new Set(["deadline", "snoozeuntil"]);

function cleanUndefined<T extends Record<string, unknown>>(value: T): T {
  const copy: Record<string, unknown> = { ...value };
  for (const [key, entry] of Object.entries(copy)) {
    if (entry === undefined) {
      delete copy[key];
    }
  }

  return copy as T;
}

function toArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value];
}

function toPathId(value: InsightEntityId): string {
  return encodeURIComponent(String(value));
}

async function resolveInsightsTimeZone(
  explicitTimeZone?: string,
): Promise<string | undefined> {
  if (explicitTimeZone && explicitTimeZone.trim().length > 0) {
    return explicitTimeZone.trim();
  }

  if (process.env.MCP_DEFAULT_TIMEZONE) {
    return process.env.MCP_DEFAULT_TIMEZONE;
  }

  return fetchAccountTimeZone().catch(() => undefined);
}

function normalizeDateQueryValue(
  value: string | number | boolean | null,
  timeZone: string | undefined,
): string | number | boolean | null {
  if (typeof value !== "string") {
    return value;
  }

  return parseDeadline(value, { timeZone });
}

function normalizeInsightsQuery(
  query: QueryParams | undefined,
  timeZone: string | undefined,
): QueryParams | undefined {
  const normalizedInput = normalizeQueryParams(query);
  if (!normalizedInput) {
    return undefined;
  }

  const output: QueryParams = {};
  for (const [key, value] of Object.entries(normalizedInput)) {
    if (value === undefined) {
      continue;
    }

    const normalizedKey = key.toLowerCase();
    if (!QUERY_DATE_KEYS.has(normalizedKey)) {
      output[key] = value;
      continue;
    }

    if (Array.isArray(value)) {
      output[key] = value
        .filter(
          (entry): entry is string | number | boolean | null =>
            entry !== undefined,
        )
        .map((entry) => normalizeDateQueryValue(entry, timeZone));
      continue;
    }

    output[key] = normalizeDateQueryValue(value, timeZone);
  }

  return Object.keys(output).length > 0 ? output : undefined;
}

function normalizePayloadDateValue(
  key: string,
  value: unknown,
  timeZone: string | undefined,
): unknown {
  if (typeof value === "string") {
    return parseDeadline(value, { timeZone });
  }

  if (typeof value === "number" && NUMERIC_DATE_KEYS.has(key.toLowerCase())) {
    return parseDeadline(value, { timeZone });
  }

  return value;
}

function normalizeInsightsPayload(
  payload: UnknownRecord,
  timeZone: string | undefined,
): UnknownRecord {
  const output = cleanUndefined(payload);

  for (const [key, value] of Object.entries(output)) {
    const normalizedKey = key.toLowerCase();
    if (!PAYLOAD_DATE_KEYS.has(normalizedKey)) {
      continue;
    }

    if (normalizedKey === "deadline") {
      if (typeof value === "string" || typeof value === "number") {
        output.due = parseDeadline(value, { timeZone });
      }
      delete output.deadline;
      continue;
    }

    output[key] = normalizePayloadDateValue(normalizedKey, value, timeZone);
  }

  return output;
}

function payloadNeedsTimeZone(payload: UnknownRecord): boolean {
  for (const [key, value] of Object.entries(payload)) {
    const normalizedKey = key.toLowerCase();
    if (!PAYLOAD_DATE_KEYS.has(normalizedKey)) {
      continue;
    }

    if (typeof value === "string") {
      return true;
    }

    if (typeof value === "number" && NUMERIC_DATE_KEYS.has(normalizedKey)) {
      return true;
    }
  }

  return false;
}

function queryNeedsTimeZone(query?: QueryParams): boolean {
  if (!query) {
    return false;
  }

  return Object.keys(query).some((key) =>
    QUERY_DATE_KEYS.has(key.toLowerCase()),
  );
}

async function prepareInsightsRequest(
  options?: InsightsRequestOptions,
  forceTimeZoneResolution = false,
): Promise<{ query?: QueryParams; timeZone?: string }> {
  const shouldResolveTimeZone =
    forceTimeZoneResolution ||
    (typeof options?.timeZone === "string" &&
      options.timeZone.trim().length > 0) ||
    queryNeedsTimeZone(options?.query);

  const timeZone = shouldResolveTimeZone
    ? await resolveInsightsTimeZone(options?.timeZone)
    : undefined;

  return {
    query: normalizeInsightsQuery(options?.query, timeZone),
    timeZone,
  };
}

export async function getUserAnalytics(
  options?: InsightsRequestOptions,
): Promise<AnalyticsSnapshot> {
  const context = "getUserAnalytics";
  try {
    const { query } = await prepareInsightsRequest(options);
    return reclaimHttpClient.get<AnalyticsSnapshot>("/analytics/user", {
      context,
      query,
    });
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export async function getUserAnalyticsV3(
  options?: InsightsRequestOptions,
): Promise<AnalyticsSnapshot> {
  const context = "getUserAnalyticsV3";
  try {
    const { query } = await prepareInsightsRequest(options);
    return reclaimHttpClient.get<AnalyticsSnapshot>("/analytics/user/V3", {
      context,
      query,
    });
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export async function getTeamAnalytics(
  options?: InsightsRequestOptions,
): Promise<AnalyticsSnapshot> {
  const context = "getTeamAnalytics";
  try {
    const { query } = await prepareInsightsRequest(options);
    return reclaimHttpClient.get<AnalyticsSnapshot>("/analytics/team", {
      context,
      query,
    });
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export async function getTeamAnalyticsV3(
  options?: InsightsRequestOptions,
): Promise<AnalyticsSnapshot> {
  const context = "getTeamAnalyticsV3";
  try {
    const { query } = await prepareInsightsRequest(options);
    return reclaimHttpClient.get<AnalyticsSnapshot>("/analytics/team/V3", {
      context,
      query,
    });
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export async function getTeamAnalyticsV4(
  payload: UnknownRecord,
  options?: InsightsRequestOptions,
): Promise<AnalyticsSnapshot> {
  const context = "getTeamAnalyticsV4";
  try {
    const { query, timeZone } = await prepareInsightsRequest(
      options,
      payloadNeedsTimeZone(payload),
    );
    return reclaimHttpClient.post<AnalyticsSnapshot>(
      "/analytics/team/V4",
      normalizeInsightsPayload(payload, timeZone),
      {
        context,
        query,
      },
    );
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export async function getTeamAnalyticsV4Export(
  options?: InsightsRequestOptions,
): Promise<UnknownRecord> {
  const context = "getTeamAnalyticsV4Export";
  try {
    const { query } = await prepareInsightsRequest(options);
    return reclaimHttpClient.get<UnknownRecord>("/analytics/team/V4/export", {
      context,
      query,
    });
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export async function getTeamAnalyticsV4Filters(
  options?: InsightsRequestOptions,
): Promise<UnknownRecord> {
  const context = "getTeamAnalyticsV4Filters";
  try {
    const { query } = await prepareInsightsRequest(options);
    return reclaimHttpClient.get<UnknownRecord>("/analytics/team/V4/filters", {
      context,
      query,
    });
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export async function getTeamAnalyticsV4Permissions(
  options?: InsightsRequestOptions,
): Promise<UnknownRecord> {
  const context = "getTeamAnalyticsV4Permissions";
  try {
    const { query } = await prepareInsightsRequest(options);
    return reclaimHttpClient.get<UnknownRecord>(
      "/analytics/team/V4/permissions",
      {
        context,
        query,
      },
    );
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export async function getFocusInsightsV3(
  options?: InsightsRequestOptions,
): Promise<AnalyticsSnapshot> {
  const context = "getFocusInsightsV3";
  try {
    const { query } = await prepareInsightsRequest(options);
    return reclaimHttpClient.get<AnalyticsSnapshot>(
      "/analytics/focus/insights/V3",
      {
        context,
        query,
      },
    );
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export async function getWeeklyReportSocial(
  options?: InsightsRequestOptions,
): Promise<UnknownRecord> {
  const context = "getWeeklyReportSocial";
  try {
    const { query } = await prepareInsightsRequest(options);
    return reclaimHttpClient.get<UnknownRecord>("/weekly-report/social", {
      context,
      query,
    });
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

async function listChangelogPath(
  path: string,
  context: string,
  options?: InsightsRequestOptions,
): Promise<ChangelogEntry[]> {
  try {
    const { query } = await prepareInsightsRequest(options);
    const data = await reclaimHttpClient.get<ChangelogEntry[] | ChangelogEntry>(
      path,
      {
        context,
        query,
      },
    );
    return toArray(data);
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export function listChangelog(
  options?: InsightsRequestOptions,
): Promise<ChangelogEntry[]> {
  return listChangelogPath("/changelog", "listChangelog", options);
}

export function listChangelogEvents(
  options?: InsightsRequestOptions,
): Promise<ChangelogEntry[]> {
  return listChangelogPath("/changelog/events", "listChangelogEvents", options);
}

export function listChangelogTasks(
  options?: InsightsRequestOptions,
): Promise<ChangelogEntry[]> {
  return listChangelogPath("/changelog/tasks", "listChangelogTasks", options);
}

export function listChangelogSmartHabits(
  options?: InsightsRequestOptions,
): Promise<ChangelogEntry[]> {
  return listChangelogPath(
    "/changelog/smart-habits",
    "listChangelogSmartHabits",
    options,
  );
}

export function listChangelogSmartMeetings(
  options?: InsightsRequestOptions,
): Promise<ChangelogEntry[]> {
  return listChangelogPath(
    "/changelog/smart-meetings",
    "listChangelogSmartMeetings",
    options,
  );
}

export function listChangelogSchedulingLinks(
  options?: InsightsRequestOptions,
): Promise<ChangelogEntry[]> {
  return listChangelogPath(
    "/changelog/scheduling-links",
    "listChangelogSchedulingLinks",
    options,
  );
}

export async function listInteractions(
  options?: InsightsRequestOptions,
): Promise<AssistInteraction[]> {
  const context = "listInteractions";
  try {
    const { query } = await prepareInsightsRequest(options);
    const data = await reclaimHttpClient.get<
      AssistInteraction[] | AssistInteraction
    >("/interactions", {
      context,
      query,
    });
    return toArray(data);
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export async function createInteraction(
  payload: UnknownRecord,
  options?: InsightsRequestOptions,
): Promise<AssistInteraction> {
  const context = "createInteraction";
  try {
    const { query, timeZone } = await prepareInsightsRequest(
      options,
      payloadNeedsTimeZone(payload),
    );
    return reclaimHttpClient.post<AssistInteraction>(
      "/interactions",
      normalizeInsightsPayload(payload, timeZone),
      {
        context,
        query,
      },
    );
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export async function getInteraction(
  interactionId: InsightEntityId,
  options?: InsightsRequestOptions,
): Promise<AssistInteraction> {
  const context = `getInteraction(interactionId=${String(interactionId)})`;
  try {
    const { query } = await prepareInsightsRequest(options);
    return reclaimHttpClient.get<AssistInteraction>(
      `/interactions/${toPathId(interactionId)}`,
      {
        context,
        query,
      },
    );
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export async function chatInteraction(
  payload: UnknownRecord,
  options?: InsightsRequestOptions,
): Promise<UnknownRecord> {
  const context = "chatInteraction";
  try {
    const { query, timeZone } = await prepareInsightsRequest(
      options,
      payloadNeedsTimeZone(payload),
    );
    return reclaimHttpClient.post<UnknownRecord>(
      "/interactions/chat",
      normalizeInsightsPayload(payload, timeZone),
      {
        context,
        query,
      },
    );
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export async function closeInteraction(
  payload: UnknownRecord = {},
  options?: InsightsRequestOptions,
): Promise<UnknownRecord> {
  const context = "closeInteraction";
  try {
    const { query, timeZone } = await prepareInsightsRequest(
      options,
      payloadNeedsTimeZone(payload),
    );
    return reclaimHttpClient.post<UnknownRecord>(
      "/interactions/close",
      normalizeInsightsPayload(payload, timeZone),
      {
        context,
        query,
      },
    );
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export async function setCurrentInteraction(
  payload: UnknownRecord = {},
  options?: InsightsRequestOptions,
): Promise<UnknownRecord> {
  const context = "setCurrentInteraction";
  try {
    const { query, timeZone } = await prepareInsightsRequest(
      options,
      payloadNeedsTimeZone(payload),
    );
    return reclaimHttpClient.post<UnknownRecord>(
      "/interactions/current",
      normalizeInsightsPayload(payload, timeZone),
      {
        context,
        query,
      },
    );
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export async function getCurrentDailyDigest(
  options?: InsightsRequestOptions,
): Promise<UnknownRecord> {
  const context = "getCurrentDailyDigest";
  try {
    const { query } = await prepareInsightsRequest(options);
    return reclaimHttpClient.get<UnknownRecord>(
      "/interactions/daily-digest/current",
      {
        context,
        query,
      },
    );
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export async function getCurrentProactiveGtd(
  options?: InsightsRequestOptions,
): Promise<UnknownRecord> {
  const context = "getCurrentProactiveGtd";
  try {
    const { query } = await prepareInsightsRequest(options);
    return reclaimHttpClient.get<UnknownRecord>(
      "/interactions/proactive-gtd/current",
      {
        context,
        query,
      },
    );
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export async function generateProactiveGtd(
  payload: UnknownRecord = {},
  options?: InsightsRequestOptions,
): Promise<UnknownRecord> {
  const context = "generateProactiveGtd";
  try {
    const { query, timeZone } = await prepareInsightsRequest(
      options,
      payloadNeedsTimeZone(payload),
    );
    return reclaimHttpClient.post<UnknownRecord>(
      "/interactions/proactive-gtd/generate",
      normalizeInsightsPayload(payload, timeZone),
      {
        context,
        query,
      },
    );
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export async function listInteractionRecords(
  options?: InsightsRequestOptions,
): Promise<AssistInteraction[]> {
  const context = "listInteractionRecords";
  try {
    const { query } = await prepareInsightsRequest(options);
    const data = await reclaimHttpClient.get<
      AssistInteraction[] | AssistInteraction
    >("/interactions/records", {
      context,
      query,
    });
    return toArray(data);
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export async function getTaskInteraction(
  taskId: InsightEntityId,
  options?: InsightsRequestOptions,
): Promise<UnknownRecord> {
  const context = `getTaskInteraction(taskId=${String(taskId)})`;
  try {
    const { query } = await prepareInsightsRequest(options);
    return reclaimHttpClient.get<UnknownRecord>(
      `/interactions/task/${toPathId(taskId)}`,
      {
        context,
        query,
      },
    );
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export async function updateInteraction(
  payload: UnknownRecord,
  options?: InsightsRequestOptions,
): Promise<UnknownRecord> {
  const context = "updateInteraction";
  try {
    const { query, timeZone } = await prepareInsightsRequest(
      options,
      payloadNeedsTimeZone(payload),
    );
    return reclaimHttpClient.post<UnknownRecord>(
      "/interactions/update",
      normalizeInsightsPayload(payload, timeZone),
      {
        context,
        query,
      },
    );
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export async function sendInterpreterMessage(
  payload: UnknownRecord,
  options?: InsightsRequestOptions,
): Promise<UnknownRecord> {
  const context = "sendInterpreterMessage";
  try {
    const { query, timeZone } = await prepareInsightsRequest(
      options,
      payloadNeedsTimeZone(payload),
    );
    return reclaimHttpClient.post<UnknownRecord>(
      "/interpreter/message",
      normalizeInsightsPayload(payload, timeZone),
      {
        context,
        query,
      },
    );
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export async function getPendingInterpreterPlan(
  planId: InsightEntityId,
  options?: InsightsRequestOptions,
): Promise<UnknownRecord> {
  const context = `getPendingInterpreterPlan(planId=${String(planId)})`;
  try {
    const { query } = await prepareInsightsRequest(options);
    return reclaimHttpClient.get<UnknownRecord>(
      `/interpreter/plans/pending/${toPathId(planId)}`,
      {
        context,
        query,
      },
    );
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export async function getMoment(
  options?: InsightsRequestOptions,
): Promise<UnknownRecord> {
  const context = "getMoment";
  try {
    const { query } = await prepareInsightsRequest(options);
    return reclaimHttpClient.get<UnknownRecord>("/moment", {
      context,
      query,
    });
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export async function getNextMoment(
  options?: InsightsRequestOptions,
): Promise<UnknownRecord> {
  const context = "getNextMoment";
  try {
    const { query } = await prepareInsightsRequest(options);
    return reclaimHttpClient.get<UnknownRecord>("/moment/next", {
      context,
      query,
    });
  } catch (error) {
    return normalizeApiError(error, context);
  }
}
