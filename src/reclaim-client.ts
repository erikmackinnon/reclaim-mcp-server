/**
 * @fileoverview Provides a type-safe client for interacting with the Reclaim.ai REST API.
 * Handles API requests, responses, and basic error normalization.
 */

import axios, { type AxiosError, type AxiosInstance } from "axios";
import "dotenv/config";

// Fixed import path with .js extension
import {
  ReclaimError,
  type Task,
  type TaskInputData,
} from "./types/reclaim.js";

// --- Configuration ---

const TOKEN = process.env.RECLAIM_API_KEY;

// --- Axios Instance ---

/**
 * Pre-configured Axios instance for making requests to the Reclaim.ai API.
 * Includes base URL and authorization header.
 */
export const reclaim: AxiosInstance = axios.create({
  baseURL: "https://api.app.reclaim.ai/api/",
  headers: {
    ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    "Content-Type": "application/json",
    Accept: "application/json", // Explicitly accept JSON responses
  },
  // Optional: Add a timeout for requests
  // timeout: 10000, // 10 seconds
});

/**
 * Ensures the API token is available and refreshes the Axios auth header if needed.
 */
function assertToken(): void {
  const token = process.env.RECLAIM_API_KEY;
  if (!token) {
    throw new ReclaimError(
      "RECLAIM_API_KEY environment variable is not set. Configure it before using Reclaim tools.",
    );
  }

  const authHeader = `Bearer ${token}`;
  const currentHeader = reclaim.defaults.headers.common["Authorization"];
  if (currentHeader !== authHeader) {
    reclaim.defaults.headers.common["Authorization"] = authHeader;
  }
}

function validateChunkSizes(payload: Partial<TaskInputData>): void {
  const minChunkSize = payload.minChunkSize;
  const maxChunkSize = payload.maxChunkSize;

  if (
    typeof minChunkSize === "number" &&
    typeof maxChunkSize === "number" &&
    minChunkSize > maxChunkSize
  ) {
    throw new ReclaimError(
      `minChunkSize (${minChunkSize}) cannot be greater than maxChunkSize (${maxChunkSize}).`,
    );
  }
}

// --- Helper Functions ---

/**
 * Parses a deadline input into an ISO 8601 string suitable for the Reclaim API.
 * Handles inputs as number of days from now or a date/datetime string.
 * Defaults to 24 hours from the current time if parsing fails or input is invalid/missing.
 * Logic ported and refined from `prior-js-implementation.xml`.
 *
 * @param deadlineInput - The deadline specified as number of days from now,
 * an ISO 8601 date/time string, or undefined.
 * @returns An ISO 8601 date/time string representing the calculated deadline.
 */
const LOCAL_DATETIME_REGEX =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2})(?::(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?)?$/;
const HAS_TIMEZONE_REGEX = /([zZ]|[+-]\d{2}:\d{2})$/;

type CurrentUserResponse = {
  timezone?: string;
  settings?: {
    taskSettings?: {
      defaults?: TaskDefaults;
    };
  };
  [key: string]: unknown;
};

type TaskDefaults = {
  timeChunksRequired?: number;
  commsTimeChunksRequired?: number;
  delayedStartInMinutes?: number;
  dueInDays?: number | null;
  category?: string;
  alwaysPrivate?: boolean;
  minChunkSize?: number;
  maxChunkSize?: number;
  timeSchemeId?: string | null;
  priority?: string;
  onDeck?: boolean;
  splitUp?: boolean;
  googleTaskIntegrationNoDueDateWhenMissing?: boolean;
};

let cachedCurrentUser: CurrentUserResponse | undefined;
let cachedCurrentUserPromise: Promise<CurrentUserResponse | undefined> | undefined;
let cachedAccountTimeZone: string | undefined;
let cachedTaskDefaults: TaskDefaults | undefined;

async function fetchCurrentUser(): Promise<CurrentUserResponse | undefined> {
  if (cachedCurrentUser) {
    return cachedCurrentUser;
  }

  if (!cachedCurrentUserPromise) {
    cachedCurrentUserPromise = (async () => {
      assertToken();
      const { data } = await reclaim.get<CurrentUserResponse>("/users/current");
      if (data && typeof data === "object") {
        cachedCurrentUser = data;
      }
      return cachedCurrentUser;
    })();
  }

  try {
    return await cachedCurrentUserPromise;
  } finally {
    if (!cachedCurrentUser) {
      cachedCurrentUserPromise = undefined;
    }
  }
}

export async function fetchAccountTimeZone(): Promise<string | undefined> {
  if (cachedAccountTimeZone) {
    return cachedAccountTimeZone;
  }

  const user = await fetchCurrentUser();
  const tz = typeof user?.timezone === "string" ? user.timezone.trim() : undefined;
  if (tz) {
    cachedAccountTimeZone = tz;
  }

  return cachedAccountTimeZone;
}

export async function fetchTaskDefaults(): Promise<TaskDefaults | undefined> {
  if (cachedTaskDefaults) {
    return cachedTaskDefaults;
  }

  const user = await fetchCurrentUser();
  const defaults = user?.settings?.taskSettings?.defaults;
  if (defaults && typeof defaults === "object") {
    cachedTaskDefaults = defaults;
  }

  return cachedTaskDefaults;
}

export async function getTaskDefaults(): Promise<Record<string, unknown>> {
  const defaults = await fetchTaskDefaults();
  const category = normalizeEventCategory(undefined, defaults?.category);
  const derived = {
    eventCategory: category,
    eventSubType: normalizeEventSubType(undefined, category),
    priority: normalizePriority(undefined, defaults?.priority),
  };

  return {
    chunkMinutes: 15,
    defaults: defaults ?? {},
    derivedDefaults: derived,
  };
}

function resolveTimeZone(timeZone?: string): string | undefined {
  if (timeZone && timeZone.trim().length > 0) {
    return timeZone.trim();
  }

  if (process.env.MCP_DEFAULT_TIMEZONE) {
    return process.env.MCP_DEFAULT_TIMEZONE;
  }

  if (cachedAccountTimeZone) {
    return cachedAccountTimeZone;
  }

  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function assertValidTimeZone(timeZone: string): void {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
  } catch (error) {
    throw new ReclaimError(
      `Invalid timeZone "${timeZone}". Use an IANA time zone like "America/Los_Angeles".`,
    );
  }
}

const EVENT_CATEGORIES = new Set(["WORK", "PERSONAL"]);
const PRIORITY_LEVELS = new Set([
  "P1",
  "P2",
  "P3",
  "P4",
  "PRIORITIZE",
  "DEFAULT",
]);
const EVENT_SUBTYPES = new Set([
  "ONE_ON_ONE",
  "STAFF_MEETING",
  "OP_REVIEW",
  "EXTERNAL",
  "IDEATION",
  "FOCUS",
  "PRODUCTIVITY",
  "TRAVEL",
  "FLIGHT",
  "TRAIN",
  "RECLAIM",
  "VACATION",
  "HEALTH",
  "ERRAND",
  "OTHER_PERSONAL",
  "UNKNOWN",
]);
const EVENT_SUBTYPE_ALIASES: Record<string, string> = {
  MEETING: "STAFF_MEETING",
  "1ON1": "ONE_ON_ONE",
  ONEONONE: "ONE_ON_ONE",
  "ONE-ON-ONE": "ONE_ON_ONE",
  "ONE_ON_ONE": "ONE_ON_ONE",
  PERSONAL: "OTHER_PERSONAL",
  ERRANDS: "ERRAND",
  FOCUS_TIME: "FOCUS",
};
const PERSONAL_SUBTYPES = new Set(["OTHER_PERSONAL", "ERRAND", "HEALTH", "VACATION"]);

const DEBUG_ENABLED = process.env.RECLAIM_DEBUG === "true";

function debugLog(context: string, detail: unknown): void {
  if (!DEBUG_ENABLED) {
    return;
  }
  try {
    console.error(`[reclaim-debug] ${context}`, JSON.stringify(detail, null, 2));
  } catch (error) {
    console.error(`[reclaim-debug] ${context}`, detail, error);
  }
}

function normalizeEnumValue(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  return value.trim().toUpperCase().replace(/[\s-]+/g, "_");
}

function normalizeEventCategory(
  value?: string,
  fallback?: string,
): "WORK" | "PERSONAL" {
  const normalized = normalizeEnumValue(value ?? fallback);
  if (normalized && EVENT_CATEGORIES.has(normalized)) {
    return normalized as "WORK" | "PERSONAL";
  }
  return "WORK";
}

function inferCategoryFromSubType(
  subType?: string,
): "WORK" | "PERSONAL" | undefined {
  const normalized = normalizeEnumValue(subType);
  if (normalized && PERSONAL_SUBTYPES.has(normalized)) {
    return "PERSONAL";
  }
  return undefined;
}

function normalizePriority(value?: string, fallback?: string):
  | "P1"
  | "P2"
  | "P3"
  | "P4" {
  const normalized = normalizeEnumValue(value ?? fallback);
  if (normalized) {
    if (normalized === "P1" || normalized === "P2" || normalized === "P3" || normalized === "P4") {
      return normalized;
    }
    if (normalized === "DEFAULT") {
      const fallbackNormalized = normalizeEnumValue(fallback);
      if (
        fallbackNormalized === "P1" ||
        fallbackNormalized === "P2" ||
        fallbackNormalized === "P3" ||
        fallbackNormalized === "P4"
      ) {
        return fallbackNormalized;
      }
    }
    if (normalized === "PRIORITIZE") {
      return "P1";
    }
  }
  return "P3";
}

function normalizeEventSubType(
  value: string | undefined,
  eventCategory: "WORK" | "PERSONAL",
): string {
  const normalized = normalizeEnumValue(value);
  if (normalized) {
    if (EVENT_SUBTYPES.has(normalized)) {
      return normalized;
    }
    const alias = EVENT_SUBTYPE_ALIASES[normalized];
    if (alias && EVENT_SUBTYPES.has(alias)) {
      return alias;
    }
  }

  return eventCategory === "PERSONAL" ? "OTHER_PERSONAL" : "FOCUS";
}

type TimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function assertValidLocalDateTime(
  parts: TimeParts & { millisecond: number },
  originalInput: string,
): void {
  const { year, month, day, hour, minute, second, millisecond } = parts;

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    !Number.isInteger(second) ||
    !Number.isInteger(millisecond)
  ) {
    throw new Error(`Invalid date/time: "${originalInput}"`);
  }

  if (month < 1 || month > 12) {
    throw new Error(`Invalid month in date/time: "${originalInput}"`);
  }

  if (day < 1 || day > 31) {
    throw new Error(`Invalid day in date/time: "${originalInput}"`);
  }

  if (hour < 0 || hour > 23) {
    throw new Error(`Invalid hour in date/time: "${originalInput}"`);
  }

  if (minute < 0 || minute > 59) {
    throw new Error(`Invalid minute in date/time: "${originalInput}"`);
  }

  if (second < 0 || second > 59) {
    throw new Error(`Invalid second in date/time: "${originalInput}"`);
  }

  if (millisecond < 0 || millisecond > 999) {
    throw new Error(`Invalid milliseconds in date/time: "${originalInput}"`);
  }

  const utcCheck = new Date(
    Date.UTC(year, month - 1, day, hour, minute, second, millisecond),
  );

  if (
    utcCheck.getUTCFullYear() !== year ||
    utcCheck.getUTCMonth() + 1 !== month ||
    utcCheck.getUTCDate() !== day ||
    utcCheck.getUTCHours() !== hour ||
    utcCheck.getUTCMinutes() !== minute ||
    utcCheck.getUTCSeconds() !== second ||
    utcCheck.getUTCMilliseconds() !== millisecond
  ) {
    throw new Error(`Invalid date/time: "${originalInput}"`);
  }
}

function getZonedParts(date: Date, timeZone: string): TimeParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const partMap: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      partMap[part.type] = Number(part.value);
    }
  }

  return {
    year: partMap.year,
    month: partMap.month,
    day: partMap.day,
    hour: partMap.hour ?? 0,
    minute: partMap.minute ?? 0,
    second: partMap.second ?? 0,
  };
}

function partsToUtcMillis(parts: TimeParts): number {
  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
}

function partsMatch(a: TimeParts, b: TimeParts): boolean {
  return (
    a.year === b.year &&
    a.month === b.month &&
    a.day === b.day &&
    a.hour === b.hour &&
    a.minute === b.minute &&
    a.second === b.second
  );
}

function getTimeZoneOffset(date: Date, timeZone: string): number {
  const parts = getZonedParts(date, timeZone);
  const asUtc = partsToUtcMillis(parts);
  return asUtc - date.getTime();
}

function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
  timeZone: string,
): Date {
  const desiredParts: TimeParts = {
    year,
    month,
    day,
    hour,
    minute,
    second,
  };
  const utcGuessMillis = Date.UTC(
    year,
    month - 1,
    day,
    hour,
    minute,
    second,
    millisecond,
  );

  const offsets = new Set<number>();
  const guessDate = new Date(utcGuessMillis);
  offsets.add(getTimeZoneOffset(guessDate, timeZone));

  for (const offset of Array.from(offsets)) {
    const candidate = new Date(utcGuessMillis - offset);
    offsets.add(getTimeZoneOffset(candidate, timeZone));
    offsets.add(getTimeZoneOffset(new Date(candidate.getTime() + 3600000), timeZone));
    offsets.add(getTimeZoneOffset(new Date(candidate.getTime() - 3600000), timeZone));
  }

  const candidates = Array.from(offsets).map((offset) => {
    const date = new Date(utcGuessMillis - offset);
    return { date, parts: getZonedParts(date, timeZone) };
  });

  const matching = candidates
    .filter((candidate) => partsMatch(candidate.parts, desiredParts))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (matching.length > 0) {
    return matching[0].date;
  }

  const desiredNaive = partsToUtcMillis(desiredParts);
  const afterCandidates = candidates
    .map((candidate) => ({
      ...candidate,
      naive: partsToUtcMillis(candidate.parts),
    }))
    .filter((candidate) => candidate.naive >= desiredNaive)
    .sort((a, b) => {
      const aDelta = a.naive - desiredNaive;
      const bDelta = b.naive - desiredNaive;
      if (aDelta !== bDelta) {
        return aDelta - bDelta;
      }
      return a.date.getTime() - b.date.getTime();
    });

  if (afterCandidates.length > 0) {
    // If the desired local time is invalid (DST spring-forward gap), prefer the next valid time.
    return afterCandidates[0].date;
  }

  // Fallback: pick the closest local wall-clock time when we can't find an exact or later match.
  let bestCandidate = candidates[0];
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const candidateNaive = partsToUtcMillis(candidate.parts);
    const diff = Math.abs(candidateNaive - desiredNaive);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestCandidate = candidate;
    }
  }

  return bestCandidate.date;
}

export function parseDeadline(
  deadlineInput: number | string | undefined,
  options?: { timeZone?: string },
): string {
  const now = new Date();
  if (typeof deadlineInput === "number") {
    // Interpret number as days from now
    if (deadlineInput <= 0) {
      console.warn(
        `Received non-positive number of days "${deadlineInput}" for deadline/snooze, using current time.`,
      );
      return now.toISOString();
    }
    const deadline = new Date(now);
    deadline.setDate(deadline.getDate() + deadlineInput);
    // Keep the current time, just advance the date
    return deadline.toISOString();
  }

  if (typeof deadlineInput === "string") {
    const trimmed = deadlineInput.trim();
    if (HAS_TIMEZONE_REGEX.test(trimmed)) {
      const parsed = new Date(trimmed);
      if (isNaN(parsed.getTime())) {
        throw new Error(`Invalid date format: "${deadlineInput}"`);
      }
      return parsed.toISOString();
    }

    const match = trimmed.match(LOCAL_DATETIME_REGEX);
    if (match) {
      const [
        ,
        yearRaw,
        monthRaw,
        dayRaw,
        hourRaw,
        minuteRaw,
        secondRaw,
        millisecondRaw,
      ] = match;
      const year = Number(yearRaw);
      const month = Number(monthRaw);
      const day = Number(dayRaw);
      const hour = hourRaw ? Number(hourRaw) : 0;
      const minute = minuteRaw ? Number(minuteRaw) : 0;
      const second = secondRaw ? Number(secondRaw) : 0;
      const millisecond = millisecondRaw
        ? Number(millisecondRaw.padEnd(3, "0"))
        : 0;

      assertValidLocalDateTime(
        { year, month, day, hour, minute, second, millisecond },
        deadlineInput,
      );

      const timeZone = resolveTimeZone(options?.timeZone);
      if (timeZone) {
        assertValidTimeZone(timeZone);
        const utcDate = zonedTimeToUtc(
          year,
          month,
          day,
          hour,
          minute,
          second,
          millisecond,
          timeZone,
        );
        return utcDate.toISOString();
      }

      const localDate = new Date(
        year,
        month - 1,
        day,
        hour,
        minute,
        second,
        millisecond,
      );
      if (isNaN(localDate.getTime())) {
        throw new Error(`Invalid date format: "${deadlineInput}"`);
      }
      return localDate.toISOString();
    }

    const parsedFallback = new Date(trimmed);
    if (isNaN(parsedFallback.getTime())) {
      throw new Error(`Invalid date format: "${deadlineInput}"`);
    }
    return parsedFallback.toISOString();
  }
  // If deadlineInput is undefined or null, fall through to default

  // Default case: 24 hours from now
  const defaultDeadline = new Date(now);
  defaultDeadline.setDate(defaultDeadline.getDate() + 1); // Add 1 day
  return defaultDeadline.toISOString();
}

function addMinutes(base: Date, minutes: number): Date {
  return new Date(base.getTime() + minutes * 60000);
}

function addDays(base: Date, days: number): Date {
  return addMinutes(base, days * 1440);
}

function deriveDefaultDue(base: Date, defaults?: TaskDefaults): Date {
  if (typeof defaults?.dueInDays === "number" && defaults.dueInDays > 0) {
    return addDays(base, defaults.dueInDays);
  }
  return addDays(base, 1);
}

function applyTaskDefaultsForCreate(
  taskData: TaskInputData,
  defaults?: TaskDefaults,
): TaskInputData {
  const output: TaskInputData = { ...taskData };

  const inferredCategory =
    output.eventCategory === undefined
      ? inferCategoryFromSubType(output.eventSubType)
      : undefined;
  const normalizedCategory = normalizeEventCategory(
    output.eventCategory,
    inferredCategory ?? defaults?.category,
  );
  output.eventCategory = normalizedCategory;
  output.eventSubType = normalizeEventSubType(
    output.eventSubType,
    normalizedCategory,
  );
  output.priority = normalizePriority(output.priority, defaults?.priority);

  if (output.onDeck === undefined && typeof defaults?.onDeck === "boolean") {
    output.onDeck = defaults.onDeck;
  }

  if (
    output.alwaysPrivate === undefined &&
    typeof defaults?.alwaysPrivate === "boolean"
  ) {
    output.alwaysPrivate = defaults.alwaysPrivate;
  }

  if (!output.notes) {
    output.notes = "";
  }

  if (
    output.timeSchemeId === undefined &&
    typeof defaults?.timeSchemeId === "string" &&
    defaults.timeSchemeId.trim().length > 0
  ) {
    output.timeSchemeId = defaults.timeSchemeId;
  }

  if (
    output.timeChunksRequired === undefined &&
    typeof defaults?.timeChunksRequired === "number" &&
    defaults.timeChunksRequired > 0
  ) {
    output.timeChunksRequired = defaults.timeChunksRequired;
  }

  if (output.timeChunksRequired === undefined) {
    const derived = Math.max(
      output.minChunkSize ?? 0,
      output.maxChunkSize ?? 0,
    );
    if (derived > 0) {
      output.timeChunksRequired = derived;
    }
  }

  if (output.timeChunksRequired === undefined) {
    output.timeChunksRequired = 1;
  }

  if (output.minChunkSize === undefined) {
    if (
      typeof defaults?.minChunkSize === "number" &&
      defaults.minChunkSize > 0
    ) {
      output.minChunkSize = defaults.minChunkSize;
    }
  }

  if (output.maxChunkSize === undefined) {
    if (
      typeof defaults?.maxChunkSize === "number" &&
      defaults.maxChunkSize > 0
    ) {
      output.maxChunkSize = defaults.maxChunkSize;
    }
  }

  if (output.minChunkSize === undefined) {
    output.minChunkSize = Math.min(output.timeChunksRequired, 1);
  }

  if (output.maxChunkSize === undefined) {
    output.maxChunkSize = output.timeChunksRequired;
  }

  if (output.timeChunksRequired !== undefined) {
    if (output.minChunkSize !== undefined) {
      output.minChunkSize = Math.min(
        output.minChunkSize,
        output.timeChunksRequired,
      );
    }
    if (output.maxChunkSize !== undefined) {
      output.maxChunkSize = Math.min(
        output.maxChunkSize,
        output.timeChunksRequired,
      );
    }
  }

  if (
    output.minChunkSize !== undefined &&
    output.maxChunkSize !== undefined &&
    output.minChunkSize > output.maxChunkSize
  ) {
    output.maxChunkSize = output.minChunkSize;
  }

  return output;
}

function normalizeTaskPatch(
  taskData: TaskInputData,
  defaults?: TaskDefaults,
): TaskInputData {
  const output: TaskInputData = { ...taskData };

  if (output.eventCategory) {
    output.eventCategory = normalizeEventCategory(
      output.eventCategory,
      defaults?.category,
    );
  }

  if (output.eventSubType) {
    const category = output.eventCategory
      ? normalizeEventCategory(output.eventCategory)
      : normalizeEventCategory(
          undefined,
          inferCategoryFromSubType(output.eventSubType) ?? defaults?.category,
        );
    output.eventSubType = normalizeEventSubType(output.eventSubType, category);
  }

  if (output.priority) {
    output.priority = normalizePriority(output.priority, defaults?.priority);
  }

  if (output.timeSchemeId !== undefined) {
    if (typeof output.timeSchemeId !== "string" || output.timeSchemeId === "") {
      delete output.timeSchemeId;
    }
  }

  if (output.timeChunksRequired !== undefined) {
    if (output.minChunkSize !== undefined) {
      output.minChunkSize = Math.min(
        output.minChunkSize,
        output.timeChunksRequired,
      );
    }
    if (output.maxChunkSize !== undefined) {
      output.maxChunkSize = Math.min(
        output.maxChunkSize,
        output.timeChunksRequired,
      );
    }
  }

  if (
    output.minChunkSize !== undefined &&
    output.maxChunkSize !== undefined &&
    output.minChunkSize > output.maxChunkSize
  ) {
    output.maxChunkSize = output.minChunkSize;
  }

  return output;
}

/**
 * Filters an array of Task objects to include only those considered "active".
 *
 * **Important:** In Reclaim.ai, a task with `status: "COMPLETE"` means its scheduled time allocation
 * is finished, but the user may *not* have marked the task itself as done. These tasks
 * are considered "active" by this filter unless they are also `ARCHIVED`, `CANCELLED`, or `deleted`.
 *
 * Active tasks meet these criteria:
 * - `deleted` is `false`.
 * - `status` is **not** `ARCHIVED`.
 * - `status` is **not** `CANCELLED`.
 *
 * @param tasks - An array of `Task` objects.
 * @returns A new array containing only the active `Task` objects.
 */
export function filterActiveTasks(tasks: Task[]): Task[] {
  if (!Array.isArray(tasks)) {
    console.error(
      "filterActiveTasks received non-array input, returning empty array.",
    );
    return [];
  }
  return tasks.filter(
    (task) =>
      task && // Ensure task object exists
      !task.deleted &&
      task.status !== "ARCHIVED" &&
      task.status !== "CANCELLED",
  );
}

// --- API Methods ---

/**
 * Handles errors from Axios API calls, normalizing them into ReclaimError instances.
 * Logs the detailed error internally for server-side debugging.
 * This function is typed to return 'never' because it *always* throws an error.
 *
 * @param error - The error object caught from the Axios request (typed as unknown).
 * @param context - A string providing context for the API call (e.g., function name, parameters).
 * @throws {ReclaimError} Always throws a normalized ReclaimError.
 */
const handleApiError = (error: unknown, context: string): never => {
  let status: number | undefined;
  let detail: any;
  let message: string;

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError; // Already checked with isAxiosError
    status = axiosError.response?.status;
    detail = axiosError.response?.data;
    // Try to extract a meaningful message from the response data or fallback to Axios message
    const responseData = detail; // Type assertion for easier access
    message =
      responseData?.message || responseData?.title || axiosError.message;
    console.error(
      `Reclaim API Error (${context}) - Status: ${status ?? "N/A"}`,
      detail || axiosError.message,
    );
  } else if (error instanceof Error) {
    message = error.message;
    detail = { stack: error.stack }; // Include stack for non-API errors
    console.error(`Error during Reclaim API call (${context})`, error);
  } else {
    // Handle cases where something other than an Error was thrown
    message = "An unexpected error occurred during API call.";
    detail = error; // Preserve the original thrown value
    console.error(
      `Unexpected throw during Reclaim API call (${context})`,
      error,
    );
  }

  // Throw a structured error for consistent handling upstream.
  // The 'never' return type indicates this function *always* throws.
  throw new ReclaimError(
    `API Call Failed (${context}): ${message}`,
    status,
    detail,
  );
};

/**
 * Fetches all tasks from the Reclaim API.
 *
 * **Note on `status: "COMPLETE"`:** See the documentation for `filterActiveTasks` for details.
 * This status indicates scheduled time completion, not necessarily user completion.
 *
 * @returns A promise resolving to an array of Task objects.
 * @throws {ReclaimError} If the API request fails.
 */
export async function listTasks(): Promise<Task[]> {
  const context = "listTasks";
  try {
    assertToken();
    const { data } = await reclaim.get<Task[]>("/tasks");
    // It's possible the API returns non-array on error, though Axios usually throws. Add check.
    return Array.isArray(data) ? data : [];
  } catch (error) {
    // handleApiError always throws, satisfying the return type Promise<Task[]>
    return handleApiError(error, context);
  }
}

/**
 * Fetches a specific task by its unique ID.
 *
 * **Note on `status: "COMPLETE"`:** See the documentation for `filterActiveTasks` for details.
 * This status indicates scheduled time completion, not necessarily user completion.
 *
 * @param taskId - The numeric ID of the task to fetch.
 * @returns A promise resolving to the requested Task object.
 * @throws {ReclaimError} If the API request fails (e.g., task not found - 404).
 */
export async function getTask(taskId: number): Promise<Task> {
  const context = `getTask(taskId=${taskId})`;
  try {
    assertToken();
    const { data } = await reclaim.get<Task>(`/tasks/${taskId}`);
    return data;
  } catch (error) {
    // handleApiError always throws, satisfying the return type Promise<Task>
    return handleApiError(error, context);
  }
}

/**
 * Creates a new task in Reclaim using the provided data.
 * @param taskData - An object containing the properties for the new task. See `TaskInputData`.
 * `title` is typically required by the API. `due` will be generated if `deadline` is omitted.
 * @returns A promise resolving to the newly created Task object as returned by the API.
 * @throws {ReclaimError} If the API request fails (e.g., validation error - 400).
 */
export async function createTask(
  taskData: TaskInputData,
  timeZone?: string,
): Promise<Task> {
  const context = "createTask";
  try {
    assertToken();
    const resolvedTimeZone =
      timeZone ??
      process.env.MCP_DEFAULT_TIMEZONE ??
      (await fetchAccountTimeZone().catch(() => undefined));
    const defaults = await fetchTaskDefaults().catch(() => undefined);
    const normalizedInput = applyTaskDefaultsForCreate(taskData, defaults);
    // API expects 'due', not 'deadline'. parseDeadline handles conversion and default.
    const apiPayload: Partial<TaskInputData> = { ...normalizedInput }; // Clone to avoid modifying input object

    // Normalize due/deadline fields
    if (apiPayload.due !== undefined) {
      apiPayload.due = parseDeadline(apiPayload.due, {
        timeZone: resolvedTimeZone,
      });
    }

    // Handle deadline/due conversion
    if ("deadline" in apiPayload && apiPayload.deadline !== undefined) {
      apiPayload.due = parseDeadline(apiPayload.deadline, {
        timeZone: resolvedTimeZone,
      });
      delete apiPayload.deadline; // Remove original deadline field
    } else if (!apiPayload.due) {
      // Ensure 'due' exists, defaulting if neither 'due' nor 'deadline' provided
      if (typeof defaults?.dueInDays === "number" && defaults.dueInDays > 0) {
        apiPayload.due = parseDeadline(defaults.dueInDays, {
          timeZone: resolvedTimeZone,
        });
      } else {
        apiPayload.due = parseDeadline(undefined, {
          timeZone: resolvedTimeZone,
        }); // Defaults to 24h
      }
    }

    // Handle snoozeUntil conversion
    if ("snoozeUntil" in apiPayload && apiPayload.snoozeUntil !== undefined) {
      // Use parseDeadline logic for snoozeUntil as well
      apiPayload.snoozeUntil = parseDeadline(apiPayload.snoozeUntil, {
        timeZone: resolvedTimeZone,
      });
    }

    validateChunkSizes(apiPayload);

    // Clean undefined keys before sending to API
    Object.keys(apiPayload).forEach((key) => {
      if ((apiPayload as any)[key] === undefined) {
        delete (apiPayload as any)[key];
      }
    });

    debugLog(`${context} payload`, apiPayload);
    const { data } = await reclaim.post<Task>("/tasks", apiPayload);
    return data;
  } catch (error) {
    // handleApiError always throws, satisfying the return type Promise<Task>
    return handleApiError(error, context);
  }
}

/**
 * Creates a new task in Reclaim and places it at an explicit start time.
 *
 * Reclaim exposes this as `POST /api/tasks/at-time?startTime=...`.
 *
 * @param startTime - ISO 8601 date/time string. The server will place the task at this time.
 * @param taskData - Task fields (same as `createTask`).
 * @returns A promise resolving to the API response (Reclaim returns a view object).
 * @throws {ReclaimError} If the API request fails.
 */
export async function createTaskAtTime(
  startTime: string,
  taskData: TaskInputData,
  timeZone?: string,
): Promise<any> {
  const context = `createTaskAtTime(startTime=${startTime})`;
  try {
    assertToken();

    const resolvedTimeZone =
      timeZone ??
      process.env.MCP_DEFAULT_TIMEZONE ??
      (await fetchAccountTimeZone().catch(() => undefined));
    const defaults = await fetchTaskDefaults().catch(() => undefined);
    const normalizedInput = applyTaskDefaultsForCreate(taskData, defaults);

    const startTimeIso = parseDeadline(startTime, {
      timeZone: resolvedTimeZone,
    });
    const apiPayload: Partial<TaskInputData> = { ...normalizedInput };

    // Normalize due/deadline fields; default due to a sensible value if missing.
    if (apiPayload.due !== undefined) {
      apiPayload.due = parseDeadline(apiPayload.due, {
        timeZone: resolvedTimeZone,
      });
    }

    // Handle deadline/due conversion; default due to the start time to avoid an unrelated fallback.
    if ("deadline" in apiPayload && apiPayload.deadline !== undefined) {
      apiPayload.due = parseDeadline(apiPayload.deadline, {
        timeZone: resolvedTimeZone,
      });
      delete apiPayload.deadline;
    } else if (!apiPayload.due) {
      const startTimeDate = new Date(startTimeIso);
      if (
        apiPayload.timeChunksRequired !== undefined &&
        apiPayload.timeChunksRequired > 0 &&
        !isNaN(startTimeDate.getTime())
      ) {
        apiPayload.due = addMinutes(
          startTimeDate,
          apiPayload.timeChunksRequired * 15,
        ).toISOString();
      } else if (!isNaN(startTimeDate.getTime())) {
        apiPayload.due = deriveDefaultDue(startTimeDate, defaults).toISOString();
      } else {
        apiPayload.due = deriveDefaultDue(new Date(), defaults).toISOString();
      }
    }

    // Handle snoozeUntil conversion
    if ("snoozeUntil" in apiPayload && apiPayload.snoozeUntil !== undefined) {
      apiPayload.snoozeUntil = parseDeadline(apiPayload.snoozeUntil, {
        timeZone: resolvedTimeZone,
      });
    }

    validateChunkSizes(apiPayload);

    // Clean undefined keys before sending to API
    Object.keys(apiPayload).forEach((key) => {
      if ((apiPayload as any)[key] === undefined) {
        delete (apiPayload as any)[key];
      }
    });

    debugLog(`${context} payload`, { params: { startTime: startTimeIso }, apiPayload });
    const { data } = await reclaim.post("/tasks/at-time", apiPayload, {
      params: { startTime: startTimeIso },
    });
    return data;
  } catch (error) {
    return handleApiError(error, context);
  }
}

/**
 * Updates an existing task with the specified ID using the provided data.
 * Only the fields included in `taskData` will be updated (PATCH semantics).
 * @param taskId - The numeric ID of the task to update.
 * @param taskData - An object containing the properties to update. See `TaskInputData`.
 * @returns A promise resolving to the updated Task object as returned by the API.
 * @throws {ReclaimError} If the API request fails (e.g., task not found - 404, validation error - 400).
 */
export async function updateTask(
  taskId: number,
  taskData: TaskInputData,
  timeZone?: string,
): Promise<Task> {
  const context = `updateTask(taskId=${taskId})`;
  try {
    assertToken();
    const resolvedTimeZone =
      timeZone ??
      process.env.MCP_DEFAULT_TIMEZONE ??
      (await fetchAccountTimeZone().catch(() => undefined));
    const defaults = await fetchTaskDefaults().catch(() => undefined);
    // API expects 'due', not 'deadline'. parseDeadline handles conversion.
    const apiPayload: Partial<TaskInputData> = normalizeTaskPatch(
      taskData,
      defaults,
    );

    // Normalize due/deadline fields
    if (apiPayload.due !== undefined) {
      apiPayload.due = parseDeadline(apiPayload.due, {
        timeZone: resolvedTimeZone,
      });
    }

    // Handle deadline/due conversion
    if ("deadline" in apiPayload && apiPayload.deadline !== undefined) {
      apiPayload.due = parseDeadline(apiPayload.deadline, {
        timeZone: resolvedTimeZone,
      });
      delete apiPayload.deadline; // Remove original deadline field
    }

    // Handle snoozeUntil conversion
    if ("snoozeUntil" in apiPayload && apiPayload.snoozeUntil !== undefined) {
      apiPayload.snoozeUntil = parseDeadline(apiPayload.snoozeUntil, {
        timeZone: resolvedTimeZone,
      });
    }

    validateChunkSizes(apiPayload);

    // Remove undefined keys explicitly for PATCH safety
    Object.keys(apiPayload).forEach((key) => {
      if ((apiPayload as any)[key] === undefined) {
        delete (apiPayload as any)[key];
      }
    });

    // Ensure we are actually sending some data to update
    if (Object.keys(apiPayload).length === 0) {
      console.warn(
        `UpdateTask called for taskId ${taskId} with no fields to update. Skipping API call.`,
      );
      // Fetch and return the current task state as PATCH with no data is a no-op
      return getTask(taskId);
    }

    debugLog(`${context} payload`, apiPayload);
    const { data } = await reclaim.patch<Task>(`/tasks/${taskId}`, apiPayload);
    return data;
  } catch (error) {
    // handleApiError always throws, satisfying the return type Promise<Task>
    return handleApiError(error, context);
  }
}

/**
 * Deletes a task by its unique ID.
 * Note: This is typically a soft delete in Reclaim unless forced otherwise.
 * @param taskId - The numeric ID of the task to delete.
 * @returns A promise resolving to void upon successful deletion (API returns 204 No Content).
 * @throws {ReclaimError} If the API request fails (e.g., task not found - 404).
 */
export async function deleteTask(taskId: number): Promise<void> {
  const context = `deleteTask(taskId=${taskId})`;
  try {
    assertToken();
    await reclaim.delete(`/tasks/${taskId}`);
    // Successful deletion returns 204 No Content, promise resolves void implicitly
  } catch (error) {
    // handleApiError always throws. Since the return type is Promise<void>,
    // returning 'never' here also satisfies the compiler.
    return handleApiError(error, context);
  }
}

/**
 * Marks a task as complete in the Reclaim planner (user action).
 * @param taskId - The numeric ID of the task to mark complete.
 * @returns A promise resolving to the API response (often minimal or empty). Use `any` for flexibility or define a specific response type if known.
 * @throws {ReclaimError} If the API request fails.
 */
export async function markTaskComplete(taskId: number): Promise<any> {
  const context = `markTaskComplete(taskId=${taskId})`;
  try {
    assertToken();
    // Endpoint might return empty body or a confirmation object
    const { data } = await reclaim.post(`/planner/done/task/${taskId}`);
    return data ?? { success: true }; // Provide a default success object if body is empty
  } catch (error) {
    return handleApiError(error, context);
  }
}

/**
 * Marks a task as incomplete (e.g., unarchives it).
 * @param taskId - The numeric ID of the task to mark incomplete.
 * @returns A promise resolving to the API response (often minimal or empty). Use `any` for flexibility.
 * @throws {ReclaimError} If the API request fails.
 */
export async function markTaskIncomplete(taskId: number): Promise<any> {
  const context = `markTaskIncomplete(taskId=${taskId})`;
  try {
    assertToken();
    const { data } = await reclaim.post(`/planner/unarchive/task/${taskId}`);
    return data ?? { success: true };
  } catch (error) {
    return handleApiError(error, context);
  }
}

/**
 * Adds a specified amount of time to a task's schedule.
 * @param taskId - The numeric ID of the task.
 * @param minutes - The number of minutes to add (must be positive).
 * @returns A promise resolving to the API response. Use `any` for flexibility.
 * @throws {ReclaimError} If the API request fails or minutes is invalid.
 */
export async function addTimeToTask(
  taskId: number,
  minutes: number,
): Promise<any> {
  const context = `addTimeToTask(taskId=${taskId}, minutes=${minutes})`;
  if (minutes <= 0) {
    // Throw an error immediately for invalid input, handled by wrapApiCall later
    throw new Error("Minutes must be positive to add time.");
  }
  try {
    assertToken();
    // API expects minutes as a query parameter
    const { data } = await reclaim.post(
      `/planner/add-time/task/${taskId}`,
      null,
      {
        params: { minutes },
      },
    );
    return data ?? { success: true };
  } catch (error) {
    return handleApiError(error, context);
  }
}

/**
 * Starts the timer for a specific task.
 * @param taskId - The numeric ID of the task to start the timer for.
 * @returns A promise resolving to the API response. Use `any` for flexibility.
 * @throws {ReclaimError} If the API request fails.
 */
export async function startTaskTimer(taskId: number): Promise<any> {
  const context = `startTaskTimer(taskId=${taskId})`;
  try {
    assertToken();
    const { data } = await reclaim.post(`/planner/start/task/${taskId}`);
    return data ?? { success: true };
  } catch (error) {
    return handleApiError(error, context);
  }
}

/**
 * Stops the timer for a specific task.
 * @param taskId - The numeric ID of the task to stop the timer for.
 * @returns A promise resolving to the API response. Use `any` for flexibility.
 * @throws {ReclaimError} If the API request fails.
 */
export async function stopTaskTimer(taskId: number): Promise<any> {
  const context = `stopTaskTimer(taskId=${taskId})`;
  try {
    assertToken();
    const { data } = await reclaim.post(`/planner/stop/task/${taskId}`);
    return data ?? { success: true };
  } catch (error) {
    return handleApiError(error, context);
  }
}

/**
 * Logs work (time spent) against a specific task.
 * @param taskId - The numeric ID of the task to log work against.
 * @param minutes - The number of minutes worked (must be positive).
 * @param end - Optional end time of the work session (ISO 8601 string or YYYY-MM-DD). If omitted, Reclaim usually assumes 'now'.
 * @returns A promise resolving to the API response. Use `any` for flexibility.
 * @throws {ReclaimError} If the API request fails or parameters are invalid.
 */
export async function logWorkForTask(
  taskId: number,
  minutes: number,
  end?: string,
  timeZone?: string,
): Promise<any> {
  const context = `logWorkForTask(taskId=${taskId}, minutes=${minutes}, end=${end ?? "now"})`;
  if (minutes <= 0) {
    throw new Error("Minutes must be positive to log work.");
  }

  const resolvedTimeZone =
    timeZone ??
    process.env.MCP_DEFAULT_TIMEZONE ??
    (await fetchAccountTimeZone().catch(() => undefined));

  // Prepare query parameters, validating 'end' date if provided
  const params: { minutes: number; end?: string } = { minutes };
  if (end) {
    try {
      // Use parseDeadline to validate and normalize the end date string
      // Reclaim API seems to expect ISO string for 'end' param based on prior JS
      const parsedEnd = parseDeadline(end, { timeZone: resolvedTimeZone });
      // Ensure it includes time if only date was given - Reclaim might need time
      if (parsedEnd.length === 10) {
        // YYYY-MM-DD
        params.end = new Date(parsedEnd).toISOString(); // Convert to full ISO string
      } else {
        params.end = parsedEnd;
      }
    } catch (dateError: unknown) {
      // Throw a more specific error if parsing fails
      const message =
        dateError instanceof Error ? dateError.message : String(dateError);
      throw new Error(
        `Invalid 'end' date format: "${end}". Error: ${message}. Please use ISO 8601 or YYYY-MM-DD format.`,
      );
    }
  }

  try {
    assertToken();
    debugLog(`${context} params`, params);
    const { data } = await reclaim.post(
      `/planner/log-work/task/${taskId}`,
      null,
      { params },
    );
    return data ?? { success: true };
  } catch (error) {
    return handleApiError(error, context);
  }
}

/**
 * Clears any scheduling exceptions associated with a task.
 * @param taskId - The numeric ID of the task.
 * @returns A promise resolving to the API response. Use `any` for flexibility.
 * @throws {ReclaimError} If the API request fails.
 */
export async function clearTaskExceptions(taskId: number): Promise<any> {
  const context = `clearTaskExceptions(taskId=${taskId})`;
  try {
    assertToken();
    const { data } = await reclaim.post(
      `/planner/clear-exceptions/task/${taskId}`,
    );
    return data ?? { success: true };
  } catch (error) {
    return handleApiError(error, context);
  }
}

/**
 * Marks a task for prioritization in the Reclaim planner.
 * @param taskId - The numeric ID of the task to prioritize.
 * @returns A promise resolving to the API response. Use `any` for flexibility.
 * @throws {ReclaimError} If the API request fails.
 */
export async function prioritizeTask(taskId: number): Promise<any> {
  const context = `prioritizeTask(taskId=${taskId})`;
  try {
    assertToken();
    const { data } = await reclaim.post(`/planner/prioritize/task/${taskId}`);
    return data ?? { success: true };
  } catch (error) {
    return handleApiError(error, context);
  }
}
