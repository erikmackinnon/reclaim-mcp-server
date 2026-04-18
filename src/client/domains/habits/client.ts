import {
  normalizeApiError,
  reclaimHttpClient,
  type QueryParams,
} from "../../core/http.js";
import { fetchAccountTimeZone, parseDeadline } from "../tasks/client.js";
import {
  type DailyHabit,
  type DailyHabitInputData,
  type Habit,
  type HabitInputData,
  type HabitTemplate,
  type HabitTemplateInputData,
} from "../../../types/reclaim.js";

type HabitRequestOptions = {
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

async function resolveHabitTimeZone(
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

function normalizeHabitQuery(
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

  if (
    typeof value === "number" &&
    NUMERIC_DATE_KEYS.has(key.toLowerCase())
  ) {
    return parseDeadline(value, { timeZone });
  }

  return value;
}

function normalizeHabitPayload(
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

    if (
      typeof value === "number" &&
      NUMERIC_DATE_KEYS.has(normalizedKey)
    ) {
      return true;
    }
  }

  return false;
}

async function prepareRequest(
  options?: HabitRequestOptions,
  forceTimeZoneResolution = false,
): Promise<{ query?: QueryParams; timeZone?: string }> {
  const shouldResolveTimeZone =
    forceTimeZoneResolution ||
    (typeof options?.timeZone === "string" && options.timeZone.trim().length > 0) ||
    Object.keys(options?.query ?? {}).some((key) =>
      QUERY_DATE_KEYS.has(key.toLowerCase()),
    );

  const timeZone = shouldResolveTimeZone
    ? await resolveHabitTimeZone(options?.timeZone)
    : undefined;
  return {
    timeZone,
    query: normalizeHabitQuery(options?.query, timeZone),
  };
}

export async function listHabits(
  options?: HabitRequestOptions,
): Promise<Habit[]> {
  const context = "listHabits";
  const { query } = await prepareRequest(options);
  const data = await reclaimHttpClient.get<Habit[] | Habit>("/smart-habits", {
    context,
    query,
  });
  return Array.isArray(data) ? data : [data];
}

export async function createHabit(
  habitData: HabitInputData,
  options?: HabitRequestOptions,
): Promise<Habit> {
  const context = "createHabit";
  try {
    const { query, timeZone } = await prepareRequest(
      options,
      payloadNeedsTimeZone(habitData as Record<string, unknown>),
    );
    const payload = normalizeHabitPayload(
      habitData as Record<string, unknown>,
      timeZone,
    );
    return reclaimHttpClient.post<Habit>("/smart-habits", payload, {
      context,
      query,
    });
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export async function getHabit(habitId: number): Promise<Habit> {
  const context = `getHabit(habitId=${habitId})`;
  return reclaimHttpClient.get<Habit>(`/smart-habits/${habitId}`, { context });
}

export async function updateHabit(
  habitId: number,
  habitData: HabitInputData,
  options?: HabitRequestOptions,
): Promise<Habit> {
  const context = `updateHabit(habitId=${habitId})`;
  try {
    const { query, timeZone } = await prepareRequest(
      options,
      payloadNeedsTimeZone(habitData as Record<string, unknown>),
    );
    const payload = normalizeHabitPayload(
      habitData as Record<string, unknown>,
      timeZone,
    );
    return reclaimHttpClient.patch<Habit>(`/smart-habits/${habitId}`, payload, {
      context,
      query,
    });
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export async function deleteHabit(
  habitId: number,
  options?: HabitRequestOptions,
): Promise<void> {
  const context = `deleteHabit(habitId=${habitId})`;
  const { query } = await prepareRequest(options);
  await reclaimHttpClient.delete(`/smart-habits/${habitId}`, { context, query });
}

export async function detectHabits(
  options?: HabitRequestOptions,
): Promise<Habit[]> {
  const context = "detectHabits";
  try {
    const { query } = await prepareRequest(options);
    const data = await reclaimHttpClient.get<Habit[] | Habit>(
      "/smart-habits/detect",
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

export async function convertHabitsToSingleInstances(
  payload: Record<string, unknown>,
  options?: HabitRequestOptions,
): Promise<unknown> {
  const context = "convertHabitsToSingleInstances";
  try {
    const { query, timeZone } = await prepareRequest(
      options,
      payloadNeedsTimeZone(payload),
    );
    const normalizedPayload = normalizeHabitPayload(payload, timeZone);
    return reclaimHttpClient.post<unknown>(
      "/smart-habits/to-single-instances",
      normalizedPayload,
      { context, query },
    );
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export async function shareHabit(
  payload: Record<string, unknown>,
  options?: HabitRequestOptions,
): Promise<unknown> {
  const context = "shareHabit";
  try {
    const { query, timeZone } = await prepareRequest(
      options,
      payloadNeedsTimeZone(payload),
    );
    const normalizedPayload = normalizeHabitPayload(payload, timeZone);
    return reclaimHttpClient.post<unknown>("/smart-habits/shared", normalizedPayload, {
      context,
      query,
    });
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export async function getSharedHabit(sharedHabitId: number): Promise<unknown> {
  const context = `getSharedHabit(sharedHabitId=${sharedHabitId})`;
  return reclaimHttpClient.get<unknown>(`/smart-habits/shared/${sharedHabitId}`, {
    context,
  });
}

export async function getSharedHabitV2(
  sharedHabitId: number,
): Promise<unknown> {
  const context = `getSharedHabitV2(sharedHabitId=${sharedHabitId})`;
  return reclaimHttpClient.get<unknown>(
    `/smart-habits/shared/v2/${sharedHabitId}`,
    {
      context,
    },
  );
}

export async function getHabitTemplate(
  options?: HabitRequestOptions,
): Promise<unknown> {
  const context = "getHabitTemplate";
  const { query } = await prepareRequest(options);
  return reclaimHttpClient.get<unknown>("/smart-habits/template", {
    context,
    query,
  });
}

export async function listHabitTemplates(
  options?: HabitRequestOptions,
): Promise<HabitTemplate[]> {
  const context = "listHabitTemplates";
  const { query } = await prepareRequest(options);
  const data = await reclaimHttpClient.get<HabitTemplate[] | HabitTemplate>(
    "/smart-habits/templates",
    { context, query },
  );
  return Array.isArray(data) ? data : [data];
}

export async function createHabitFromTemplate(
  payload: Record<string, unknown>,
  options?: HabitRequestOptions,
): Promise<Habit> {
  const context = "createHabitFromTemplate";
  try {
    const { query, timeZone } = await prepareRequest(
      options,
      payloadNeedsTimeZone(payload),
    );
    const normalizedPayload = normalizeHabitPayload(payload, timeZone);
    return reclaimHttpClient.post<Habit>(
      "/smart-habits/templates/create",
      normalizedPayload,
      { context, query },
    );
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export async function listSmartHabitTemplates(
  options?: HabitRequestOptions,
): Promise<HabitTemplate[]> {
  const context = "listSmartHabitTemplates";
  const { query } = await prepareRequest(options);
  const data = await reclaimHttpClient.get<HabitTemplate[] | HabitTemplate>(
    "/templates/smart-habit",
    { context, query },
  );
  return Array.isArray(data) ? data : [data];
}

export async function createSmartHabitTemplate(
  templateData: HabitTemplateInputData,
  options?: HabitRequestOptions,
): Promise<HabitTemplate> {
  const context = "createSmartHabitTemplate";
  try {
    const { query, timeZone } = await prepareRequest(
      options,
      payloadNeedsTimeZone(templateData as Record<string, unknown>),
    );
    const payload = normalizeHabitPayload(
      templateData as Record<string, unknown>,
      timeZone,
    );
    return reclaimHttpClient.post<HabitTemplate>(
      "/templates/smart-habit",
      payload,
      { context, query },
    );
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export async function getSmartHabitTemplate(
  templateId: number,
): Promise<HabitTemplate> {
  const context = `getSmartHabitTemplate(templateId=${templateId})`;
  return reclaimHttpClient.get<HabitTemplate>(
    `/templates/smart-habit/${templateId}`,
    { context },
  );
}

export async function updateSmartHabitTemplate(
  templateId: number,
  templateData: HabitTemplateInputData,
  options?: HabitRequestOptions,
): Promise<HabitTemplate> {
  const context = `updateSmartHabitTemplate(templateId=${templateId})`;
  try {
    const { query, timeZone } = await prepareRequest(
      options,
      payloadNeedsTimeZone(templateData as Record<string, unknown>),
    );
    const payload = normalizeHabitPayload(
      templateData as Record<string, unknown>,
      timeZone,
    );
    return reclaimHttpClient.patch<HabitTemplate>(
      `/templates/smart-habit/${templateId}`,
      payload,
      { context, query },
    );
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export async function deleteSmartHabitTemplate(
  templateId: number,
  options?: HabitRequestOptions,
): Promise<void> {
  const context = `deleteSmartHabitTemplate(templateId=${templateId})`;
  const { query } = await prepareRequest(options);
  await reclaimHttpClient.delete(`/templates/smart-habit/${templateId}`, {
    context,
    query,
  });
}

export async function listDailyHabits(
  options?: HabitRequestOptions,
): Promise<DailyHabit[]> {
  const context = "listDailyHabits";
  const { query } = await prepareRequest(options);
  const data = await reclaimHttpClient.get<DailyHabit[] | DailyHabit>(
    "/assist/habits/daily",
    { context, query },
  );
  return Array.isArray(data) ? data : [data];
}

export async function createDailyHabit(
  dailyHabitData: DailyHabitInputData,
  options?: HabitRequestOptions,
): Promise<DailyHabit> {
  const context = "createDailyHabit";
  try {
    const { query, timeZone } = await prepareRequest(
      options,
      payloadNeedsTimeZone(dailyHabitData as Record<string, unknown>),
    );
    const payload = normalizeHabitPayload(
      dailyHabitData as Record<string, unknown>,
      timeZone,
    );
    return reclaimHttpClient.post<DailyHabit>("/assist/habits/daily", payload, {
      context,
      query,
    });
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export async function getDailyHabit(dailyHabitId: number): Promise<DailyHabit> {
  const context = `getDailyHabit(dailyHabitId=${dailyHabitId})`;
  return reclaimHttpClient.get<DailyHabit>(`/assist/habits/daily/${dailyHabitId}`, {
    context,
  });
}

export async function replaceDailyHabit(
  dailyHabitId: number,
  dailyHabitData: DailyHabitInputData,
  options?: HabitRequestOptions,
): Promise<DailyHabit> {
  const context = `replaceDailyHabit(dailyHabitId=${dailyHabitId})`;
  try {
    const { query, timeZone } = await prepareRequest(
      options,
      payloadNeedsTimeZone(dailyHabitData as Record<string, unknown>),
    );
    const payload = normalizeHabitPayload(
      dailyHabitData as Record<string, unknown>,
      timeZone,
    );
    return reclaimHttpClient.put<DailyHabit>(
      `/assist/habits/daily/${dailyHabitId}`,
      payload,
      { context, query },
    );
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export async function updateDailyHabit(
  dailyHabitId: number,
  dailyHabitData: DailyHabitInputData,
  options?: HabitRequestOptions,
): Promise<DailyHabit> {
  const context = `updateDailyHabit(dailyHabitId=${dailyHabitId})`;
  try {
    const { query, timeZone } = await prepareRequest(
      options,
      payloadNeedsTimeZone(dailyHabitData as Record<string, unknown>),
    );
    const payload = normalizeHabitPayload(
      dailyHabitData as Record<string, unknown>,
      timeZone,
    );
    return reclaimHttpClient.patch<DailyHabit>(
      `/assist/habits/daily/${dailyHabitId}`,
      payload,
      { context, query },
    );
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export async function deleteDailyHabit(
  dailyHabitId: number,
  options?: HabitRequestOptions,
): Promise<void> {
  const context = `deleteDailyHabit(dailyHabitId=${dailyHabitId})`;
  const { query } = await prepareRequest(options);
  await reclaimHttpClient.delete(`/assist/habits/daily/${dailyHabitId}`, {
    context,
    query,
  });
}

export async function getAssistHabitTemplate(
  options?: HabitRequestOptions,
): Promise<unknown> {
  const context = "getAssistHabitTemplate";
  const { query } = await prepareRequest(options);
  return reclaimHttpClient.get<unknown>("/assist/habits/template", {
    context,
    query,
  });
}

export async function createAssistHabitTemplate(
  payload: Record<string, unknown>,
  options?: HabitRequestOptions,
): Promise<unknown> {
  const context = "createAssistHabitTemplate";
  try {
    const { query, timeZone } = await prepareRequest(
      options,
      payloadNeedsTimeZone(payload),
    );
    const normalizedPayload = normalizeHabitPayload(payload, timeZone);
    return reclaimHttpClient.post<unknown>(
      "/assist/habits/template/create",
      normalizedPayload,
      { context, query },
    );
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export async function listAssistHabitTemplates(
  options?: HabitRequestOptions,
): Promise<unknown[]> {
  const context = "listAssistHabitTemplates";
  const { query } = await prepareRequest(options);
  const data = await reclaimHttpClient.get<unknown[] | unknown>(
    "/assist/habits/templates",
    {
      context,
      query,
    },
  );
  return Array.isArray(data) ? data : [data];
}
