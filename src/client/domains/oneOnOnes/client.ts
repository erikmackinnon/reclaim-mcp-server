import {
  normalizeApiError,
  reclaimHttpClient,
  type QueryParams,
} from "../../core/http.js";
import { fetchAccountTimeZone, parseDeadline } from "../tasks/client.js";
import {
  type OneOnOne,
  type OneOnOneInputData,
  type OneOnOneInvite,
  type OneOnOneSuggestion,
} from "../../../types/reclaim.js";

type OneOnOneRequestOptions = {
  query?: QueryParams;
  timeZone?: string;
};

const QUERY_DATE_KEYS = new Set([
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

const PAYLOAD_DATE_KEYS = new Set([
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

async function resolveOneOnOneTimeZone(
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

function normalizeOneOnOneQuery(
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
      output[key] = value.map((entry) => normalizeQueryDateValue(entry, timeZone));
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

function normalizeOneOnOnePayload(
  payload: Record<string, unknown>,
  timeZone: string | undefined,
): Record<string, unknown> {
  const output = cleanUndefined(payload);

  const dueProvided = Object.prototype.hasOwnProperty.call(output, "due");
  const deadlineValue = output.deadline;

  // Explicit `due` always wins when both `due` and `deadline` are provided.
  if (dueProvided) {
    output.due = normalizePayloadDateValue("due", output.due, timeZone);
  } else if (
    typeof deadlineValue === "string" ||
    typeof deadlineValue === "number"
  ) {
    output.due = parseDeadline(deadlineValue, { timeZone });
  }

  if ("deadline" in output) {
    delete output.deadline;
  }

  for (const [key, value] of Object.entries(output)) {
    const normalizedKey = key.toLowerCase();

    if (!PAYLOAD_DATE_KEYS.has(normalizedKey) || normalizedKey === "due") {
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

async function prepareRequest(
  options?: OneOnOneRequestOptions,
  forceTimeZoneResolution = false,
): Promise<{ query?: QueryParams; timeZone?: string }> {
  const shouldResolveTimeZone =
    forceTimeZoneResolution ||
    (typeof options?.timeZone === "string" &&
      options.timeZone.trim().length > 0) ||
    Object.keys(options?.query ?? {}).some((key) =>
      QUERY_DATE_KEYS.has(key.toLowerCase()),
    );

  const timeZone = shouldResolveTimeZone
    ? await resolveOneOnOneTimeZone(options?.timeZone)
    : undefined;

  return {
    timeZone,
    query: normalizeOneOnOneQuery(options?.query, timeZone),
  };
}

export async function listOneOnOnes(
  options?: OneOnOneRequestOptions,
): Promise<OneOnOne[]> {
  const context = "listOneOnOnes";

  let query: QueryParams | undefined;
  try {
    ({ query } = await prepareRequest(options));
  } catch (error) {
    return normalizeApiError(error, context);
  }

  const data = await reclaimHttpClient.get<OneOnOne[] | OneOnOne>("/oneOnOne", {
    context,
    query,
  });
  return Array.isArray(data) ? data : [data];
}

export async function createOneOnOne(
  oneOnOneData: OneOnOneInputData,
  options?: OneOnOneRequestOptions,
): Promise<OneOnOne> {
  const context = "createOneOnOne";

  let query: QueryParams | undefined;
  let payload: Record<string, unknown>;
  try {
    const request = await prepareRequest(
      options,
      payloadNeedsTimeZone(oneOnOneData as Record<string, unknown>),
    );
    query = request.query;
    payload = normalizeOneOnOnePayload(
      oneOnOneData as Record<string, unknown>,
      request.timeZone,
    );
  } catch (error) {
    return normalizeApiError(error, context);
  }

  return reclaimHttpClient.post<OneOnOne>("/oneOnOne", payload, {
    context,
    query,
  });
}

export async function getOneOnOne(oneOnOneId: number): Promise<OneOnOne> {
  const context = `getOneOnOne(oneOnOneId=${oneOnOneId})`;
  return reclaimHttpClient.get<OneOnOne>(`/oneOnOne/${oneOnOneId}`, { context });
}

export async function updateOneOnOne(
  oneOnOneId: number,
  oneOnOneData: OneOnOneInputData,
  options?: OneOnOneRequestOptions,
): Promise<OneOnOne> {
  const context = `updateOneOnOne(oneOnOneId=${oneOnOneId})`;

  let query: QueryParams | undefined;
  let payload: Record<string, unknown>;
  try {
    const request = await prepareRequest(
      options,
      payloadNeedsTimeZone(oneOnOneData as Record<string, unknown>),
    );
    query = request.query;
    payload = normalizeOneOnOnePayload(
      oneOnOneData as Record<string, unknown>,
      request.timeZone,
    );
  } catch (error) {
    return normalizeApiError(error, context);
  }

  return reclaimHttpClient.patch<OneOnOne>(`/oneOnOne/${oneOnOneId}`, payload, {
    context,
    query,
  });
}

export async function deleteOneOnOne(
  oneOnOneId: number,
  options?: OneOnOneRequestOptions,
): Promise<void> {
  const context = `deleteOneOnOne(oneOnOneId=${oneOnOneId})`;

  let query: QueryParams | undefined;
  try {
    ({ query } = await prepareRequest(options));
  } catch (error) {
    return normalizeApiError(error, context);
  }

  await reclaimHttpClient.delete(`/oneOnOne/${oneOnOneId}`, {
    context,
    query,
  });
}

export async function convertOneOnOneAuto(
  oneOnOneId: number,
  payload: Record<string, unknown> = {},
  options?: OneOnOneRequestOptions,
): Promise<unknown> {
  const context = `convertOneOnOneAuto(oneOnOneId=${oneOnOneId})`;

  let query: QueryParams | undefined;
  let normalizedPayload: Record<string, unknown>;
  try {
    const request = await prepareRequest(
      options,
      payloadNeedsTimeZone(payload),
    );
    query = request.query;
    normalizedPayload = normalizeOneOnOnePayload(payload, request.timeZone);
  } catch (error) {
    return normalizeApiError(error, context);
  }

  return reclaimHttpClient.post<unknown>(
    `/oneOnOne/convert-auto/${oneOnOneId}`,
    normalizedPayload,
    {
      context,
      query,
    },
  );
}

export async function listDetectedOneOnOnes(
  options?: OneOnOneRequestOptions,
): Promise<OneOnOne[]> {
  const context = "listDetectedOneOnOnes";

  let query: QueryParams | undefined;
  try {
    ({ query } = await prepareRequest(options));
  } catch (error) {
    return normalizeApiError(error, context);
  }

  const data = await reclaimHttpClient.get<OneOnOne[] | OneOnOne>(
    "/oneOnOne/detected",
    {
      context,
      query,
    },
  );

  return Array.isArray(data) ? data : [data];
}

export async function getOneOnOneInviteeEligibility(
  options?: OneOnOneRequestOptions,
): Promise<unknown> {
  const context = "getOneOnOneInviteeEligibility";

  let query: QueryParams | undefined;
  try {
    ({ query } = await prepareRequest(options));
  } catch (error) {
    return normalizeApiError(error, context);
  }

  return reclaimHttpClient.get<unknown>("/oneOnOne/invitee-eligibility", {
    context,
    query,
  });
}

export async function listOneOnOneInvites(
  options?: OneOnOneRequestOptions,
): Promise<OneOnOneInvite[]> {
  const context = "listOneOnOneInvites";

  let query: QueryParams | undefined;
  try {
    ({ query } = await prepareRequest(options));
  } catch (error) {
    return normalizeApiError(error, context);
  }

  const data = await reclaimHttpClient.get<OneOnOneInvite[] | OneOnOneInvite>(
    "/oneOnOne/invites",
    {
      context,
      query,
    },
  );

  return Array.isArray(data) ? data : [data];
}

export async function getOneOnOneInvite(
  inviteId: number,
  options?: OneOnOneRequestOptions,
): Promise<OneOnOneInvite> {
  const context = `getOneOnOneInvite(inviteId=${inviteId})`;

  let query: QueryParams | undefined;
  try {
    ({ query } = await prepareRequest(options));
  } catch (error) {
    return normalizeApiError(error, context);
  }

  return reclaimHttpClient.get<OneOnOneInvite>(`/oneOnOne/invites/${inviteId}`, {
    context,
    query,
  });
}

export async function listOneOnOneSuggestions(
  options?: OneOnOneRequestOptions,
): Promise<OneOnOneSuggestion[]> {
  const context = "listOneOnOneSuggestions";

  let query: QueryParams | undefined;
  try {
    ({ query } = await prepareRequest(options));
  } catch (error) {
    return normalizeApiError(error, context);
  }

  const data = await reclaimHttpClient.get<
    OneOnOneSuggestion[] | OneOnOneSuggestion
  >("/oneOnOne/suggestions", {
    context,
    query,
  });

  return Array.isArray(data) ? data : [data];
}
