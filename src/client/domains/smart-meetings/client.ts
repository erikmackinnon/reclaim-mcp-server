import {
  normalizeApiError,
  reclaimHttpClient,
  type QueryParams,
} from "../../core/http.js";
import { fetchAccountTimeZone, parseDeadline } from "../tasks/client.js";
import {
  type SmartMeeting,
  type SmartMeetingInputData,
} from "../../../types/reclaim.js";

type SmartMeetingRequestOptions = {
  query?: QueryParams;
  timeZone?: string;
};

type SmartMeetingNoQueryRequestOptions = {
  timeZone?: string;
  query?: never;
};

const QUERY_DATE_KEYS = new Set([
  "availabilityend",
  "availabilitystart",
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

async function resolveSmartMeetingTimeZone(
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

function normalizeQueryDateValue(
  value: string | number | boolean | null,
  timeZone: string | undefined,
): string | number | boolean | null {
  if (typeof value !== "string") {
    return value;
  }
  return parseDeadline(value, { timeZone });
}

function normalizeSmartMeetingQuery(
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
        normalizeQueryDateValue(entry, timeZone),
      );
      continue;
    }

    output[key] = normalizeQueryDateValue(value, timeZone);
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

function normalizeSmartMeetingPayload(
  payload: Record<string, unknown>,
  timeZone: string | undefined,
): Record<string, unknown> {
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

function payloadNeedsTimeZone(payload: Record<string, unknown>): boolean {
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

async function prepareRequest(
  options?: SmartMeetingRequestOptions,
  forceTimeZoneResolution = false,
): Promise<{ query?: QueryParams; timeZone?: string }> {
  const shouldResolveTimeZone =
    forceTimeZoneResolution ||
    (typeof options?.timeZone === "string" &&
      options.timeZone.trim().length > 0) ||
    queryNeedsTimeZone(options?.query);

  const timeZone = shouldResolveTimeZone
    ? await resolveSmartMeetingTimeZone(options?.timeZone)
    : undefined;

  return {
    timeZone,
    query: normalizeSmartMeetingQuery(options?.query, timeZone),
  };
}

export async function listSmartMeetings(
  _options?: SmartMeetingNoQueryRequestOptions,
): Promise<SmartMeeting[]> {
  const context = "listSmartMeetings";
  const data = await reclaimHttpClient.get<SmartMeeting[] | SmartMeeting>(
    "/smart-meetings",
    {
      context,
    },
  );
  return Array.isArray(data) ? data : [data];
}

export async function createSmartMeeting(
  smartMeetingData: SmartMeetingInputData,
  options?: SmartMeetingRequestOptions,
): Promise<SmartMeeting> {
  const context = "createSmartMeeting";
  try {
    const { query, timeZone } = await prepareRequest(
      options,
      payloadNeedsTimeZone(smartMeetingData as Record<string, unknown>),
    );
    const payload = normalizeSmartMeetingPayload(
      smartMeetingData as Record<string, unknown>,
      timeZone,
    );
    return reclaimHttpClient.post<SmartMeeting>("/smart-meetings", payload, {
      context,
      query,
    });
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export async function getSmartMeeting(
  smartMeetingId: number,
): Promise<SmartMeeting> {
  const context = `getSmartMeeting(smartMeetingId=${smartMeetingId})`;
  return reclaimHttpClient.get<SmartMeeting>(
    `/smart-meetings/${smartMeetingId}`,
    {
      context,
    },
  );
}

export async function updateSmartMeeting(
  smartMeetingId: number,
  smartMeetingData: SmartMeetingInputData,
  options?: SmartMeetingRequestOptions,
): Promise<SmartMeeting> {
  const context = `updateSmartMeeting(smartMeetingId=${smartMeetingId})`;
  try {
    const { query, timeZone } = await prepareRequest(
      options,
      payloadNeedsTimeZone(smartMeetingData as Record<string, unknown>),
    );
    const payload = normalizeSmartMeetingPayload(
      smartMeetingData as Record<string, unknown>,
      timeZone,
    );
    return reclaimHttpClient.patch<SmartMeeting>(
      `/smart-meetings/${smartMeetingId}`,
      payload,
      { context, query },
    );
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export async function deleteSmartMeeting(
  smartMeetingId: number,
  options?: SmartMeetingRequestOptions,
): Promise<void> {
  const context = `deleteSmartMeeting(smartMeetingId=${smartMeetingId})`;
  const { query } = await prepareRequest(options);
  await reclaimHttpClient.delete(`/smart-meetings/${smartMeetingId}`, {
    context,
    query,
  });
}

export async function detectSmartMeetings(
  options?: SmartMeetingRequestOptions,
): Promise<SmartMeeting[]> {
  const context = "detectSmartMeetings";
  try {
    const { query } = await prepareRequest(options);
    const data = await reclaimHttpClient.get<SmartMeeting[] | SmartMeeting>(
      "/smart-meetings/detect",
      {
        context,
        query,
      },
    );
    return Array.isArray(data) ? data : [data];
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export async function getSmartMeetingAttendeeDeclined(
  _options?: SmartMeetingNoQueryRequestOptions,
): Promise<unknown[]> {
  const context = "getSmartMeetingAttendeeDeclined";
  try {
    const data = await reclaimHttpClient.get<unknown[] | unknown>(
      "/smart-meetings/attendeeDeclined",
      {
        context,
      },
    );
    return Array.isArray(data) ? data : [data];
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export async function getSmartMeetingAvailability(
  smartMeetingId: number,
  options?: SmartMeetingRequestOptions,
): Promise<unknown> {
  const context = `getSmartMeetingAvailability(smartMeetingId=${smartMeetingId})`;
  try {
    const { query } = await prepareRequest(options);
    return reclaimHttpClient.get<unknown>(
      `/smart-meetings/availability/${smartMeetingId}`,
      {
        context,
        query,
      },
    );
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export async function inviteSmartMeetingOrganizer(
  payload: Record<string, unknown>,
  options?: SmartMeetingRequestOptions,
): Promise<unknown> {
  const context = "inviteSmartMeetingOrganizer";
  try {
    const { query, timeZone } = await prepareRequest(
      options,
      payloadNeedsTimeZone(payload),
    );
    const normalizedPayload = normalizeSmartMeetingPayload(payload, timeZone);
    return reclaimHttpClient.post<unknown>(
      "/smart-meetings/invite-organizer",
      normalizedPayload,
      {
        context,
        query,
      },
    );
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export async function convertSmartMeetingsToSingleInstances(
  payload: Record<string, unknown>,
  options?: SmartMeetingNoQueryRequestOptions,
): Promise<unknown> {
  const context = "convertSmartMeetingsToSingleInstances";
  try {
    const timeZone = payloadNeedsTimeZone(payload)
      ? await resolveSmartMeetingTimeZone(options?.timeZone)
      : undefined;
    const normalizedPayload = normalizeSmartMeetingPayload(payload, timeZone);
    return reclaimHttpClient.post<unknown>(
      "/smart-meetings/to-single-instances",
      normalizedPayload,
      {
        context,
      },
    );
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export async function getSmartMeetingAvailabilityDiagnostics(
  options?: SmartMeetingRequestOptions,
): Promise<unknown[]> {
  const context = "getSmartMeetingAvailabilityDiagnostics";
  try {
    const { query } = await prepareRequest(options);
    const data = await reclaimHttpClient.get<unknown[] | unknown>(
      "/assist/smart-meetings/availability-diagnostics",
      {
        context,
        query,
      },
    );
    return Array.isArray(data) ? data : [data];
  } catch (error) {
    return normalizeApiError(error, context);
  }
}
