import {
  normalizeApiError,
  reclaimHttpClient,
  type QueryParams,
} from "../../core/http.js";
import { fetchAccountTimeZone, parseDeadline } from "../tasks/client.js";
import {
  type EventCalendar,
  type EventCalendarId,
  type ReclaimEvent,
} from "../../../types/reclaim.js";

type EventsCalendarsRequestOptions = {
  query?: QueryParams;
  timeZone?: string;
};

const QUERY_DATE_KEYS = new Set([
  "date",
  "end",
  "enddate",
  "endtime",
  "from",
  "on",
  "start",
  "startdate",
  "starttime",
  "to",
  "windowend",
  "windowstart",
]);

const PAYLOAD_DATE_KEYS = new Set([
  "date",
  "end",
  "enddate",
  "endtime",
  "from",
  "on",
  "start",
  "startdate",
  "starttime",
  "to",
  "windowend",
  "windowstart",
]);

function cleanUndefined<T extends Record<string, unknown>>(value: T): T {
  const copy: Record<string, unknown> = { ...value };
  for (const [key, entry] of Object.entries(copy)) {
    if (entry === undefined) {
      delete copy[key];
    }
  }
  return copy as T;
}

function toPathId(value: EventCalendarId): string {
  return encodeURIComponent(String(value));
}

async function resolveEventsCalendarsTimeZone(
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

function normalizeEventsCalendarsQuery(
  query: QueryParams | undefined,
  timeZone: string | undefined,
): QueryParams | undefined {
  if (!query) {
    return undefined;
  }

  const output: QueryParams = {};

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) {
      continue;
    }

    const normalizedKey = key.toLowerCase();
    if (!QUERY_DATE_KEYS.has(normalizedKey)) {
      output[key] = value;
      continue;
    }

    if (Array.isArray(value)) {
      output[key] = value.map((entry) =>
        normalizeDateQueryValue(entry, timeZone),
      );
      continue;
    }

    output[key] = normalizeDateQueryValue(value, timeZone);
  }

  return Object.keys(output).length > 0 ? output : undefined;
}

function normalizePayloadDateValue(
  value: unknown,
  timeZone: string | undefined,
): unknown {
  if (typeof value === "string") {
    return parseDeadline(value, { timeZone });
  }

  return value;
}

function normalizeEventsCalendarsPayload(
  payload: Record<string, unknown>,
  timeZone: string | undefined,
): Record<string, unknown> {
  const output = cleanUndefined(payload);

  for (const [key, value] of Object.entries(output)) {
    const normalizedKey = key.toLowerCase();
    if (!PAYLOAD_DATE_KEYS.has(normalizedKey)) {
      continue;
    }

    output[key] = normalizePayloadDateValue(value, timeZone);
  }

  return output;
}

function payloadNeedsTimeZone(payload: Record<string, unknown>): boolean {
  for (const [key, value] of Object.entries(payload)) {
    const normalizedKey = key.toLowerCase();
    if (!PAYLOAD_DATE_KEYS.has(normalizedKey)) {
      continue;
    }

    if (typeof value === "string") {
      return true;
    }
  }

  return false;
}

function queryNeedsTimeZone(query?: QueryParams): boolean {
  if (!query) {
    return false;
  }

  return Object.keys(query).some((key) => QUERY_DATE_KEYS.has(key.toLowerCase()));
}

async function prepareRequest(
  options?: EventsCalendarsRequestOptions,
  forceTimeZoneResolution = false,
): Promise<{ query?: QueryParams; timeZone?: string }> {
  const shouldResolveTimeZone =
    forceTimeZoneResolution ||
    (typeof options?.timeZone === "string" &&
      options.timeZone.trim().length > 0) ||
    queryNeedsTimeZone(options?.query);

  const timeZone = shouldResolveTimeZone
    ? await resolveEventsCalendarsTimeZone(options?.timeZone)
    : undefined;

  return {
    query: normalizeEventsCalendarsQuery(options?.query, timeZone),
    timeZone,
  };
}

export async function listEvents(
  options?: EventsCalendarsRequestOptions,
): Promise<ReclaimEvent[]> {
  const context = "listEvents";

  let query: QueryParams | undefined;
  try {
    ({ query } = await prepareRequest(options));
  } catch (error) {
    return normalizeApiError(error, context);
  }

  const data = await reclaimHttpClient.get<ReclaimEvent[] | ReclaimEvent>(
    "/events",
    {
      context,
      query,
    },
  );

  return Array.isArray(data) ? data : [data];
}

export async function listEventsV2(
  options?: EventsCalendarsRequestOptions,
): Promise<ReclaimEvent[]> {
  const context = "listEventsV2";

  let query: QueryParams | undefined;
  try {
    ({ query } = await prepareRequest(options));
  } catch (error) {
    return normalizeApiError(error, context);
  }

  const data = await reclaimHttpClient.get<ReclaimEvent[] | ReclaimEvent>(
    "/events/v2",
    {
      context,
      query,
    },
  );

  return Array.isArray(data) ? data : [data];
}

export async function getEvent(
  eventId: EventCalendarId,
  options?: EventsCalendarsRequestOptions,
): Promise<ReclaimEvent> {
  const context = `getEvent(eventId=${eventId})`;

  let query: QueryParams | undefined;
  try {
    ({ query } = await prepareRequest(options));
  } catch (error) {
    return normalizeApiError(error, context);
  }

  return reclaimHttpClient.get<ReclaimEvent>(`/events/${toPathId(eventId)}`, {
    context,
    query,
  });
}

export async function listPersonalEvents(
  options?: EventsCalendarsRequestOptions,
): Promise<ReclaimEvent[]> {
  const context = "listPersonalEvents";

  let query: QueryParams | undefined;
  try {
    ({ query } = await prepareRequest(options));
  } catch (error) {
    return normalizeApiError(error, context);
  }

  const data = await reclaimHttpClient.get<ReclaimEvent[] | ReclaimEvent>(
    "/events/personal",
    {
      context,
      query,
    },
  );

  return Array.isArray(data) ? data : [data];
}

export async function convertEventToV2(
  payload: Record<string, unknown> = {},
  options?: EventsCalendarsRequestOptions,
): Promise<unknown> {
  const context = "convertEventToV2";

  let query: QueryParams | undefined;
  let body: Record<string, unknown>;
  try {
    const request = await prepareRequest(options, payloadNeedsTimeZone(payload));
    query = request.query;
    body = normalizeEventsCalendarsPayload(payload, request.timeZone);
  } catch (error) {
    return normalizeApiError(error, context);
  }

  return reclaimHttpClient.post<unknown>("/events/utils/to-v2", body, {
    context,
    query,
  });
}

export async function matchEvent(
  payload: Record<string, unknown> = {},
  options?: Pick<EventsCalendarsRequestOptions, "timeZone">,
): Promise<unknown> {
  const context = "matchEvent";

  let body: Record<string, unknown>;
  try {
    const timeZone = payloadNeedsTimeZone(payload)
      ? await resolveEventsCalendarsTimeZone(options?.timeZone)
      : undefined;
    body = normalizeEventsCalendarsPayload(payload, timeZone);
  } catch (error) {
    return normalizeApiError(error, context);
  }

  return reclaimHttpClient.post<unknown>("/matcher/event", body, {
    context,
  });
}

export async function getPrimaryCalendar(): Promise<EventCalendar> {
  const context = "getPrimaryCalendar";
  return reclaimHttpClient.get<EventCalendar>("/calendars/primary", {
    context,
  });
}

export async function listPersonalCalendars(): Promise<EventCalendar[]> {
  const context = "listPersonalCalendars";
  const data = await reclaimHttpClient.get<EventCalendar[] | EventCalendar>(
    "/calendars/personal",
    {
      context,
    },
  );

  return Array.isArray(data) ? data : [data];
}

export async function getPersonalCalendar(
  calendarId: EventCalendarId,
): Promise<EventCalendar> {
  const context = `getPersonalCalendar(calendarId=${calendarId})`;
  return reclaimHttpClient.get<EventCalendar>(
    `/calendars/personal/${toPathId(calendarId)}`,
    {
      context,
    },
  );
}

export async function deletePersonalCalendar(
  calendarId: EventCalendarId,
): Promise<void> {
  const context = `deletePersonalCalendar(calendarId=${calendarId})`;
  await reclaimHttpClient.delete(`/calendars/personal/${toPathId(calendarId)}`, {
    context,
  });
}

export async function listPersonalCalendarCandidates(
  options?: EventsCalendarsRequestOptions,
): Promise<EventCalendar[]> {
  const context = "listPersonalCalendarCandidates";

  let query: QueryParams | undefined;
  try {
    ({ query } = await prepareRequest(options));
  } catch (error) {
    return normalizeApiError(error, context);
  }

  const data = await reclaimHttpClient.get<EventCalendar[] | EventCalendar>(
    "/calendars/personal/candidates",
    {
      context,
      query,
    },
  );

  return Array.isArray(data) ? data : [data];
}

export async function getSyncCalendar(
  calendarId: EventCalendarId,
): Promise<EventCalendar> {
  const context = `getSyncCalendar(calendarId=${calendarId})`;
  return reclaimHttpClient.get<EventCalendar>(`/calendars/sync/${toPathId(calendarId)}`, {
    context,
  });
}

export async function deleteSyncCalendar(
  calendarId: EventCalendarId,
): Promise<void> {
  const context = `deleteSyncCalendar(calendarId=${calendarId})`;
  await reclaimHttpClient.delete(`/calendars/sync/${toPathId(calendarId)}`, {
    context,
  });
}

export async function listSyncCalendarCandidates(
  options?: EventsCalendarsRequestOptions,
): Promise<EventCalendar[]> {
  const context = "listSyncCalendarCandidates";

  let query: QueryParams | undefined;
  try {
    ({ query } = await prepareRequest(options));
  } catch (error) {
    return normalizeApiError(error, context);
  }

  const data = await reclaimHttpClient.get<EventCalendar[] | EventCalendar>(
    "/calendars/sync/candidates",
    {
      context,
      query,
    },
  );

  return Array.isArray(data) ? data : [data];
}

export async function registerSyncInterest(
  payload: Record<string, unknown> = {},
  options?: EventsCalendarsRequestOptions,
): Promise<unknown> {
  const context = "registerSyncInterest";

  let query: QueryParams | undefined;
  let body: Record<string, unknown>;
  try {
    const request = await prepareRequest(options, payloadNeedsTimeZone(payload));
    query = request.query;
    body = normalizeEventsCalendarsPayload(payload, request.timeZone);
  } catch (error) {
    return normalizeApiError(error, context);
  }

  return reclaimHttpClient.post<unknown>("/calendars/sync/interest", body, {
    context,
    query,
  });
}

export async function getSyncPolicy(): Promise<unknown> {
  const context = "getSyncPolicy";
  return reclaimHttpClient.get<unknown>("/calendars/sync-policy", { context });
}

export async function validateSyncPolicy(
  payload: Record<string, unknown> = {},
  options?: Pick<EventsCalendarsRequestOptions, "timeZone">,
): Promise<unknown> {
  const context = "validateSyncPolicy";

  let body: Record<string, unknown>;
  try {
    const timeZone = payloadNeedsTimeZone(payload)
      ? await resolveEventsCalendarsTimeZone(options?.timeZone)
      : undefined;
    body = normalizeEventsCalendarsPayload(payload, timeZone);
  } catch (error) {
    return normalizeApiError(error, context);
  }

  return reclaimHttpClient.post<unknown>("/calendars/sync-policy/validate", body, {
    context,
  });
}

export async function syncCalendarPermissions(
  payload: Record<string, unknown> = {},
  options?: Pick<EventsCalendarsRequestOptions, "timeZone">,
): Promise<unknown> {
  const context = "syncCalendarPermissions";

  let body: Record<string, unknown>;
  try {
    const timeZone = payloadNeedsTimeZone(payload)
      ? await resolveEventsCalendarsTimeZone(options?.timeZone)
      : undefined;
    body = normalizeEventsCalendarsPayload(payload, timeZone);
  } catch (error) {
    return normalizeApiError(error, context);
  }

  return reclaimHttpClient.post<unknown>("/calendars/permissions/sync", body, {
    context,
  });
}
