import {
  normalizeApiError,
  normalizeQueryParams,
  reclaimHttpClient,
  type QueryParams,
} from "../../core/http.js";
import { fetchAccountTimeZone, parseDeadline } from "../tasks/client.js";
import {
  type AvailabilityResult,
  type FocusPlannerActionInput,
  type FocusPlannerActionResult,
  type FocusSettings,
  type FocusSettingsId,
  type IdealTimeAvailabilityRequest,
  type PlannerEventId,
  type SuggestedTimesRequest,
} from "../../../types/reclaim.js";

type FocusAvailabilityRequestOptions = {
  query?: QueryParams;
  timeZone?: string;
};

const QUERY_DATE_KEYS = new Set([
  "at",
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
  "at",
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

function toArray<T>(value: T[] | T): T[] {
  return Array.isArray(value) ? value : [value];
}

async function resolveFocusAvailabilityTimeZone(
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

function normalizeFocusAvailabilityQuery(
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

function normalizeFocusAvailabilityPayload(
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
  options?: FocusAvailabilityRequestOptions,
  forceTimeZoneResolution = false,
): Promise<{ query?: QueryParams; timeZone?: string }> {
  const shouldResolveTimeZone =
    forceTimeZoneResolution ||
    (typeof options?.timeZone === "string" &&
      options.timeZone.trim().length > 0) ||
    queryNeedsTimeZone(options?.query);

  const timeZone = shouldResolveTimeZone
    ? await resolveFocusAvailabilityTimeZone(options?.timeZone)
    : undefined;

  return {
    query: normalizeFocusAvailabilityQuery(options?.query, timeZone),
    timeZone,
  };
}

function normalizePathId(
  value: FocusSettingsId | PlannerEventId,
  label: string,
  context: string,
): string {
  if (typeof value === "number") {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`${label} must be a positive integer in ${context}.`);
    }
    return encodeURIComponent(String(value));
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} must be a non-empty string in ${context}.`);
  }
  return encodeURIComponent(trimmed);
}

async function executeFocusPlannerAction(
  action: "lock" | "unlock" | "move" | "reschedule",
  focusSettingsId: FocusSettingsId,
  plannerEventId: PlannerEventId,
  input: FocusPlannerActionInput = {},
  options?: FocusAvailabilityRequestOptions,
): Promise<FocusPlannerActionResult> {
  const context = `${action}FocusPlannerEvent(focusSettingsId=${String(focusSettingsId)}, plannerEventId=${String(plannerEventId)})`;

  let encodedFocusSettingsId: string;
  let encodedPlannerEventId: string;
  let query: QueryParams | undefined;

  try {
    encodedFocusSettingsId = normalizePathId(
      focusSettingsId,
      "focusSettingsId",
      context,
    );
    encodedPlannerEventId = normalizePathId(
      plannerEventId,
      "plannerEventId",
      context,
    );

    const request = await prepareRequest(
      options,
      Boolean(input.at || input.from || input.to),
    );

    const actionQuery = {
      at: input.at
        ? parseDeadline(input.at, { timeZone: request.timeZone })
        : undefined,
      from: input.from
        ? parseDeadline(input.from, { timeZone: request.timeZone })
        : undefined,
      to: input.to
        ? parseDeadline(input.to, { timeZone: request.timeZone })
        : undefined,
    };

    query = normalizeQueryParams({
      ...(request.query ?? {}),
      ...actionQuery,
    });
  } catch (error) {
    return normalizeApiError(error, context);
  }

  return reclaimHttpClient.post<FocusPlannerActionResult>(
    `/focus/planner/${encodedFocusSettingsId}/${encodedPlannerEventId}/${action}`,
    undefined,
    {
      context,
      query,
    },
  );
}

export async function getFocusSettingsUser(): Promise<FocusSettings> {
  const context = "getFocusSettingsUser";
  return reclaimHttpClient.get<FocusSettings>("/focus-settings/user", {
    context,
  });
}

export async function updateFocusSettingsUser(
  payload: Record<string, unknown>,
  options?: FocusAvailabilityRequestOptions,
): Promise<FocusSettings> {
  const context = "updateFocusSettingsUser";

  try {
    const request = await prepareRequest(
      options,
      payloadNeedsTimeZone(payload),
    );
    const body = normalizeFocusAvailabilityPayload(payload, request.timeZone);

    return reclaimHttpClient.post<FocusSettings>("/focus-settings/user", body, {
      context,
      query: request.query,
    });
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export async function getFocusSettingsDefaultFocusTime(): Promise<unknown> {
  const context = "getFocusSettingsDefaultFocusTime";
  return reclaimHttpClient.get<unknown>(
    "/focus-settings/user/focus-time/default",
    {
      context,
    },
  );
}

export async function patchFocusSettingsUser(
  focusSettingsUserId: FocusSettingsId,
  payload: Record<string, unknown>,
  options?: FocusAvailabilityRequestOptions,
): Promise<FocusSettings> {
  const context = `patchFocusSettingsUser(focusSettingsUserId=${String(focusSettingsUserId)})`;

  let encodedFocusSettingsUserId: string;
  let body: Record<string, unknown>;
  let query: QueryParams | undefined;

  try {
    encodedFocusSettingsUserId = normalizePathId(
      focusSettingsUserId,
      "focusSettingsUserId",
      context,
    );

    const request = await prepareRequest(
      options,
      payloadNeedsTimeZone(payload),
    );
    query = request.query;
    body = normalizeFocusAvailabilityPayload(payload, request.timeZone);
  } catch (error) {
    return normalizeApiError(error, context);
  }

  return reclaimHttpClient.patch<FocusSettings>(
    `/focus-settings/user/${encodedFocusSettingsUserId}`,
    body,
    {
      context,
      query,
    },
  );
}

export async function listFocusSettingsTeam(): Promise<FocusSettings[]> {
  const context = "listFocusSettingsTeam";
  const data = await reclaimHttpClient.get<FocusSettings[] | FocusSettings>(
    "/focus-settings/team",
    {
      context,
    },
  );

  return toArray(data);
}

export async function getFocusSettingsTeam(
  teamFocusSettingsId: FocusSettingsId,
): Promise<FocusSettings> {
  const context = `getFocusSettingsTeam(teamFocusSettingsId=${String(teamFocusSettingsId)})`;

  let encodedTeamFocusSettingsId: string;
  try {
    encodedTeamFocusSettingsId = normalizePathId(
      teamFocusSettingsId,
      "teamFocusSettingsId",
      context,
    );
  } catch (error) {
    return normalizeApiError(error, context);
  }

  return reclaimHttpClient.get<FocusSettings>(
    `/focus-settings/team/${encodedTeamFocusSettingsId}`,
    {
      context,
    },
  );
}

export function lockFocusPlannerEvent(
  focusSettingsId: FocusSettingsId,
  plannerEventId: PlannerEventId,
  input: FocusPlannerActionInput = {},
  options?: FocusAvailabilityRequestOptions,
): Promise<FocusPlannerActionResult> {
  return executeFocusPlannerAction(
    "lock",
    focusSettingsId,
    plannerEventId,
    input,
    options,
  );
}

export function unlockFocusPlannerEvent(
  focusSettingsId: FocusSettingsId,
  plannerEventId: PlannerEventId,
  input: FocusPlannerActionInput = {},
  options?: FocusAvailabilityRequestOptions,
): Promise<FocusPlannerActionResult> {
  return executeFocusPlannerAction(
    "unlock",
    focusSettingsId,
    plannerEventId,
    input,
    options,
  );
}

export function moveFocusPlannerEvent(
  focusSettingsId: FocusSettingsId,
  plannerEventId: PlannerEventId,
  input: FocusPlannerActionInput = {},
  options?: FocusAvailabilityRequestOptions,
): Promise<FocusPlannerActionResult> {
  return executeFocusPlannerAction(
    "move",
    focusSettingsId,
    plannerEventId,
    input,
    options,
  );
}

export function rescheduleFocusPlannerEvent(
  focusSettingsId: FocusSettingsId,
  plannerEventId: PlannerEventId,
  input: FocusPlannerActionInput = {},
  options?: FocusAvailabilityRequestOptions,
): Promise<FocusPlannerActionResult> {
  return executeFocusPlannerAction(
    "reschedule",
    focusSettingsId,
    plannerEventId,
    input,
    options,
  );
}

export async function getIdealTimeAvailability(
  payload: IdealTimeAvailabilityRequest = {},
  options?: FocusAvailabilityRequestOptions,
): Promise<AvailabilityResult> {
  const context = "getIdealTimeAvailability";

  try {
    const request = await prepareRequest(
      options,
      payloadNeedsTimeZone(payload),
    );
    const body = normalizeFocusAvailabilityPayload(payload, request.timeZone);

    return reclaimHttpClient.post<AvailabilityResult>(
      "/availability/ideal-time-availability",
      body,
      {
        context,
        query: request.query,
      },
    );
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export async function getSuggestedTimes(
  payload: SuggestedTimesRequest = {},
  options?: FocusAvailabilityRequestOptions,
): Promise<AvailabilityResult> {
  const context = "getSuggestedTimes";

  try {
    const request = await prepareRequest(
      options,
      payloadNeedsTimeZone(payload),
    );
    const body = normalizeFocusAvailabilityPayload(payload, request.timeZone);

    return reclaimHttpClient.post<AvailabilityResult>(
      "/availability/suggested-times",
      body,
      {
        context,
        query: request.query,
      },
    );
  } catch (error) {
    return normalizeApiError(error, context);
  }
}
