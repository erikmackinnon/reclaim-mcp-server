import { z } from "zod";

import * as api from "../client/domains/smart-meetings/index.js";
import {
  isoDateOrDateTimeSchema,
  numericIdSchema,
  resolveTimeZoneAlias,
  stringIdSchema,
  timeZoneInputSchemas,
} from "../server/schemas/shared.js";
import {
  buildToolDefinition,
  reclaimToolName,
  toolAnnotations,
} from "../server/tool-metadata.js";
import { wrapApiCall } from "../utils.js";

import type { QueryParams } from "../client/core/http.js";
import type {
  ReclaimQueryParams,
  ReclaimQueryScalar,
  SmartMeetingInputData,
} from "../types/reclaim.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

type SmartMeetingToolInput = SmartMeetingInputData & {
  durationMinutes?: number;
  minDurationMinutes?: number;
  maxDurationMinutes?: number;
  lockChunkSizeToDuration?: boolean;
  attendeeEmail?: string;
  attendeeEmails?: string[];
  includeOptionalAttendees?: boolean;
  smartMeetingId?: number;
  smartMeetingIds?: number[];
  payload?: Record<string, unknown>;
  query?: ReclaimQueryParams;
  timeZone?: string;
  timezone?: string;
};

const CHUNK_MINUTES = 15;

const queryScalarSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);
const queryValueSchema = z.union([
  queryScalarSchema,
  z.array(queryScalarSchema),
]);
const attendeeEmailSchema = z
  .string()
  .email("attendeeEmail must be a valid email.");
const attendeeEmailsSchema = z
  .array(attendeeEmailSchema)
  .min(1, "attendeeEmails must include at least one email.")
  .max(200, "attendeeEmails cannot exceed 200 entries.");
const RESERVED_ATTENDEE_QUERY_KEYS = new Set([
  "attendeeemail",
  "attendeeemails",
  "includeoptionalattendees",
]);
const RESERVED_ATTENDEE_QUERY_KEYS_LABEL = [
  "attendeeEmail",
  "attendeeEmails",
  "includeOptionalAttendees",
];

function minutesToChunks(value: number, field: string): number {
  if (value % CHUNK_MINUTES !== 0) {
    throw new Error(
      `${field} must be a multiple of ${CHUNK_MINUTES} minutes. Example: 60 minutes = 4 chunks.`,
    );
  }
  return value / CHUNK_MINUTES;
}

function normalizeChunkInputs(
  input: SmartMeetingToolInput,
): SmartMeetingInputData {
  const data: SmartMeetingToolInput = { ...input };

  if (typeof data.durationMinutes === "number") {
    data.timeChunksRequired = minutesToChunks(
      data.durationMinutes,
      "durationMinutes",
    );
  }

  if (typeof data.minDurationMinutes === "number") {
    data.minChunkSize = minutesToChunks(
      data.minDurationMinutes,
      "minDurationMinutes",
    );
  }

  if (typeof data.maxDurationMinutes === "number") {
    data.maxChunkSize = minutesToChunks(
      data.maxDurationMinutes,
      "maxDurationMinutes",
    );
  }

  if (data.lockChunkSizeToDuration) {
    if (typeof data.timeChunksRequired !== "number") {
      throw new Error(
        "lockChunkSizeToDuration requires timeChunksRequired or durationMinutes.",
      );
    }
    data.minChunkSize = data.timeChunksRequired;
    data.maxChunkSize = data.timeChunksRequired;
  }

  delete data.durationMinutes;
  delete data.minDurationMinutes;
  delete data.maxDurationMinutes;
  delete data.lockChunkSizeToDuration;
  delete data.payload;
  delete data.query;
  delete data.timeZone;
  delete data.timezone;
  delete data.attendeeEmail;
  delete data.attendeeEmails;
  delete data.includeOptionalAttendees;
  delete data.smartMeetingId;
  delete data.smartMeetingIds;

  return data as SmartMeetingInputData;
}

function mergePayload<T extends Record<string, unknown>>(
  data: T,
  payload?: Record<string, unknown>,
): T {
  if (!payload) {
    return data;
  }
  return {
    ...payload,
    ...data,
  } as T;
}

function cleanUndefinedPayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

function mergeQuery(
  query: ReclaimQueryParams | undefined,
  additions?: Record<
    string,
    ReclaimQueryScalar | ReclaimQueryScalar[] | undefined
  >,
): QueryParams | undefined {
  const merged: QueryParams = {};

  if (query) {
    Object.assign(merged, query);
  }

  if (additions) {
    for (const [key, value] of Object.entries(additions)) {
      if (value !== undefined) {
        merged[key] = value;
      }
    }
  }

  return Object.keys(merged).length > 0 ? merged : undefined;
}

function normalizeAttendeeInputs(
  attendeeEmail?: string,
  attendeeEmails?: string[],
): {
  attendeeEmail?: string;
  attendeeEmails?: string[];
} {
  if (attendeeEmail && attendeeEmails && attendeeEmails.length > 0) {
    throw new Error(
      "attendeeEmail and attendeeEmails are mutually exclusive. Provide only one attendee field.",
    );
  }

  return { attendeeEmail, attendeeEmails };
}

function assertNoReservedAttendeeQueryKeys(query?: ReclaimQueryParams): void {
  if (!query) {
    return;
  }

  const foundReservedKeys = Object.keys(query).filter((key) =>
    RESERVED_ATTENDEE_QUERY_KEYS.has(key.toLowerCase()),
  );
  if (foundReservedKeys.length === 0) {
    return;
  }

  throw new Error(
    `query must not include reserved attendee keys (${RESERVED_ATTENDEE_QUERY_KEYS_LABEL.join(", ")}). Use dedicated fields instead. Found: ${foundReservedKeys.join(", ")}.`,
  );
}

function assertNoReservedAttendeePayloadKeys(
  payload?: Record<string, unknown>,
): void {
  if (!payload) {
    return;
  }

  const foundReservedKeys = Object.keys(payload).filter((key) =>
    RESERVED_ATTENDEE_QUERY_KEYS.has(key.toLowerCase()),
  );
  if (foundReservedKeys.length === 0) {
    return;
  }

  throw new Error(
    `payload must not include reserved attendee keys (${RESERVED_ATTENDEE_QUERY_KEYS_LABEL.join(", ")}). Use dedicated fields instead. Found: ${foundReservedKeys.join(", ")}.`,
  );
}

function buildSmartMeetingPayloadSchema(timeZoneSchemas: {
  timeZone: z.ZodOptional<z.ZodString>;
  timezone: z.ZodOptional<z.ZodString>;
}) {
  return {
    title: z.string().min(1, "Title cannot be empty."),
    notes: z.string().optional(),
    recurrenceRule: z
      .string()
      .optional()
      .describe(
        "Optional RFC5545 recurrence rule for recurring smart meetings.",
      ),
    frequency: z
      .string()
      .optional()
      .describe("Optional recurrence/frequency alias accepted by Reclaim."),
    eventCategory: z
      .enum(["WORK", "PERSONAL"])
      .optional()
      .describe("Meeting category: WORK or PERSONAL."),
    eventSubType: z
      .string()
      .optional()
      .describe(
        "Meeting subtype (Reclaim EventSubType). Examples: MEETING, FOCUS, PRODUCTIVITY.",
      ),
    priority: z
      .enum(["P1", "P2", "P3", "P4", "PRIORITIZE", "DEFAULT"])
      .optional(),
    durationMinutes: z
      .number()
      .int()
      .positive("Duration minutes must be a positive integer.")
      .optional()
      .describe(
        "Total meeting duration in minutes. Will be converted to 15-minute chunks.",
      ),
    minDurationMinutes: z
      .number()
      .int()
      .positive("Min duration minutes must be a positive integer.")
      .optional()
      .describe(
        "Minimum chunk duration in minutes. Will be converted to 15-minute chunks.",
      ),
    maxDurationMinutes: z
      .number()
      .int()
      .positive("Max duration minutes must be a positive integer.")
      .optional()
      .describe(
        "Maximum chunk duration in minutes. Will be converted to 15-minute chunks.",
      ),
    lockChunkSizeToDuration: z
      .boolean()
      .optional()
      .describe(
        "If true, sets minChunkSize and maxChunkSize equal to the requested duration (no splitting).",
      ),
    timeChunksRequired: z
      .number()
      .int()
      .positive("Time chunks must be a positive integer.")
      .optional()
      .describe(
        "(Advanced) Total meeting duration in 15-minute chunks (NOT minutes). Prefer durationMinutes.",
      ),
    minChunkSize: z
      .number()
      .int()
      .positive("Min chunk size must be a positive integer.")
      .optional()
      .describe(
        "(Advanced) Minimum chunk size in 15-minute chunks (NOT minutes). Prefer minDurationMinutes.",
      ),
    maxChunkSize: z
      .number()
      .int()
      .positive("Max chunk size must be a positive integer.")
      .optional()
      .describe(
        "(Advanced) Maximum chunk size in 15-minute chunks (NOT minutes). Prefer maxDurationMinutes.",
      ),
    onDeck: z.boolean().optional(),
    alwaysPrivate: z
      .boolean()
      .optional()
      .describe(
        "If true, always mark meeting events as private on the calendar.",
      ),
    timeSchemeId: stringIdSchema("timeSchemeId")
      .optional()
      .describe(
        "Time scheme ID for scheduling rules. Defaults to account task settings.",
      ),
    status: z
      .enum([
        "NEW",
        "SCHEDULED",
        "IN_PROGRESS",
        "COMPLETE",
        "CANCELLED",
        "ARCHIVED",
      ])
      .optional(),
    deadline: z
      .union([
        z.number().int().positive("Deadline days must be a positive integer."),
        isoDateOrDateTimeSchema,
      ])
      .optional(),
    due: isoDateOrDateTimeSchema
      .optional()
      .describe(
        "Explicit due date/time (ISO 8601 or YYYY-MM-DD). Prefer deadline for days-from-now inputs.",
      ),
    start: isoDateOrDateTimeSchema.optional(),
    end: isoDateOrDateTimeSchema.optional(),
    startTime: isoDateOrDateTimeSchema.optional(),
    endTime: isoDateOrDateTimeSchema.optional(),
    snoozeUntil: z
      .union([
        z.number().int().positive("Snooze days must be a positive integer."),
        isoDateOrDateTimeSchema,
      ])
      .optional(),
    attendees: attendeeEmailsSchema
      .optional()
      .describe("Optional attendee email list for the smart meeting."),
    optionalAttendees: attendeeEmailsSchema
      .optional()
      .describe("Optional optional-attendee email list for the smart meeting."),
    organizerEmail: z
      .string()
      .email("organizerEmail must be a valid email.")
      .optional(),
    payload: z
      .record(z.unknown())
      .optional()
      .describe(
        "Optional advanced payload fields merged into the request body.",
      ),
    query: z
      .record(queryValueSchema)
      .optional()
      .describe(
        "Optional query parameters. Values may be string/number/boolean/null or arrays of those primitives.",
      ),
    timeZone: timeZoneSchemas.timeZone,
    timezone: timeZoneSchemas.timezone,
  };
}

export function registerSmartMeetingTools(server: McpServer): void {
  const timeZoneSchemas = timeZoneInputSchemas();
  const smartMeetingPayloadSchema =
    buildSmartMeetingPayloadSchema(timeZoneSchemas);

  server.registerTool(
    reclaimToolName("list_smart_meetings"),
    buildToolDefinition({
      title: "List Reclaim Smart Meetings",
      description: "List smart meetings from Reclaim.ai.",
      inputSchema: {},
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async () => wrapApiCall(api.listSmartMeetings()),
  );

  server.registerTool(
    reclaimToolName("create_smart_meeting"),
    buildToolDefinition({
      title: "Create Reclaim Smart Meeting",
      description: "Create a new recurring smart meeting in Reclaim.ai.",
      inputSchema: smartMeetingPayloadSchema,
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async (params) => {
      const { payload, query, timeZone, timezone, ...smartMeetingData } =
        params as SmartMeetingToolInput;
      const resolvedTimeZone = resolveTimeZoneAlias(timeZone, timezone);

      let normalized: SmartMeetingInputData;
      try {
        normalized = normalizeChunkInputs(smartMeetingData);
      } catch (error) {
        return wrapApiCall(Promise.reject(error));
      }

      return wrapApiCall(
        api.createSmartMeeting(mergePayload(normalized, payload), {
          query: query as QueryParams | undefined,
          timeZone: resolvedTimeZone,
        }),
      );
    },
  );

  server.registerTool(
    reclaimToolName("get_smart_meeting"),
    buildToolDefinition({
      title: "Get Reclaim Smart Meeting",
      description: "Fetch details for a specific smart meeting by ID.",
      inputSchema: {
        smartMeetingId: numericIdSchema("Smart Meeting ID"),
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({ smartMeetingId }) =>
      wrapApiCall(api.getSmartMeeting(smartMeetingId)),
  );

  server.registerTool(
    reclaimToolName("update_smart_meeting"),
    buildToolDefinition({
      title: "Update Reclaim Smart Meeting",
      description: "Update one or more fields on an existing smart meeting.",
      inputSchema: {
        smartMeetingId: numericIdSchema("Smart Meeting ID"),
        title: smartMeetingPayloadSchema.title.optional(),
        notes: smartMeetingPayloadSchema.notes,
        recurrenceRule: smartMeetingPayloadSchema.recurrenceRule,
        frequency: smartMeetingPayloadSchema.frequency,
        eventCategory: smartMeetingPayloadSchema.eventCategory,
        eventSubType: smartMeetingPayloadSchema.eventSubType,
        priority: smartMeetingPayloadSchema.priority,
        durationMinutes: smartMeetingPayloadSchema.durationMinutes,
        minDurationMinutes: smartMeetingPayloadSchema.minDurationMinutes,
        maxDurationMinutes: smartMeetingPayloadSchema.maxDurationMinutes,
        lockChunkSizeToDuration:
          smartMeetingPayloadSchema.lockChunkSizeToDuration,
        timeChunksRequired: smartMeetingPayloadSchema.timeChunksRequired,
        minChunkSize: smartMeetingPayloadSchema.minChunkSize,
        maxChunkSize: smartMeetingPayloadSchema.maxChunkSize,
        onDeck: smartMeetingPayloadSchema.onDeck,
        alwaysPrivate: smartMeetingPayloadSchema.alwaysPrivate,
        timeSchemeId: smartMeetingPayloadSchema.timeSchemeId,
        status: smartMeetingPayloadSchema.status,
        deadline: smartMeetingPayloadSchema.deadline,
        due: smartMeetingPayloadSchema.due,
        start: smartMeetingPayloadSchema.start,
        end: smartMeetingPayloadSchema.end,
        startTime: smartMeetingPayloadSchema.startTime,
        endTime: smartMeetingPayloadSchema.endTime,
        snoozeUntil: smartMeetingPayloadSchema.snoozeUntil,
        attendees: smartMeetingPayloadSchema.attendees,
        optionalAttendees: smartMeetingPayloadSchema.optionalAttendees,
        organizerEmail: smartMeetingPayloadSchema.organizerEmail,
        payload: smartMeetingPayloadSchema.payload,
        query: smartMeetingPayloadSchema.query,
        timeZone: smartMeetingPayloadSchema.timeZone,
        timezone: smartMeetingPayloadSchema.timezone,
      },
      annotations: toolAnnotations({ idempotent: true }),
    }),
    async (params) => {
      const {
        smartMeetingId,
        payload,
        query,
        timeZone,
        timezone,
        ...updateData
      } = params as SmartMeetingToolInput & { smartMeetingId: number };
      const resolvedTimeZone = resolveTimeZoneAlias(timeZone, timezone);

      let normalized: SmartMeetingInputData;
      try {
        normalized = normalizeChunkInputs(updateData);
      } catch (error) {
        return wrapApiCall(Promise.reject(error));
      }

      const mergedPayload = mergePayload(normalized, payload);
      if (Object.keys(mergedPayload).length === 0) {
        return wrapApiCall(
          Promise.reject(
            new Error(
              "Update requires at least one field to change besides smartMeetingId.",
            ),
          ),
        );
      }

      return wrapApiCall(
        api.updateSmartMeeting(smartMeetingId, mergedPayload, {
          query: query as QueryParams | undefined,
          timeZone: resolvedTimeZone,
        }),
      );
    },
  );

  server.registerTool(
    reclaimToolName("delete_smart_meeting"),
    buildToolDefinition({
      title: "Delete Reclaim Smart Meeting",
      description: "Delete a smart meeting by ID.",
      inputSchema: {
        smartMeetingId: numericIdSchema("Smart Meeting ID"),
        query: smartMeetingPayloadSchema.query,
        timeZone: smartMeetingPayloadSchema.timeZone,
        timezone: smartMeetingPayloadSchema.timezone,
      },
      annotations: toolAnnotations({ idempotent: true, destructive: true }),
    }),
    async ({ smartMeetingId, query, timeZone, timezone }) =>
      wrapApiCall(
        api.deleteSmartMeeting(smartMeetingId, {
          query: query as QueryParams | undefined,
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      ),
  );

  server.registerTool(
    reclaimToolName("detect_smart_meetings"),
    buildToolDefinition({
      title: "Detect Smart Meeting Candidates",
      description:
        "Detect existing recurring events that can be converted into smart meetings.",
      inputSchema: {
        start: isoDateOrDateTimeSchema.optional(),
        end: isoDateOrDateTimeSchema.optional(),
        attendeeEmail: attendeeEmailSchema.optional(),
        attendeeEmails: attendeeEmailsSchema.optional(),
        query: smartMeetingPayloadSchema.query,
        timeZone: smartMeetingPayloadSchema.timeZone,
        timezone: smartMeetingPayloadSchema.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({
      start,
      end,
      attendeeEmail,
      attendeeEmails,
      query,
      timeZone,
      timezone,
    }) => {
      let normalizedAttendees:
        | {
            attendeeEmail?: string;
            attendeeEmails?: string[];
          }
        | undefined;
      try {
        normalizedAttendees = normalizeAttendeeInputs(
          attendeeEmail,
          attendeeEmails,
        );
        assertNoReservedAttendeeQueryKeys(
          query as ReclaimQueryParams | undefined,
        );
      } catch (error) {
        return wrapApiCall(Promise.reject(error));
      }

      return wrapApiCall(
        api.detectSmartMeetings({
          query: mergeQuery(query as ReclaimQueryParams | undefined, {
            start,
            end,
            ...normalizedAttendees,
          }),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      );
    },
  );

  server.registerTool(
    reclaimToolName("get_smart_meeting_attendee_declined"),
    buildToolDefinition({
      title: "Get Smart Meeting Attendee Declined",
      description: "Read attendee-declined metadata for smart meetings.",
      inputSchema: {},
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async () => wrapApiCall(api.getSmartMeetingAttendeeDeclined()),
  );

  server.registerTool(
    reclaimToolName("get_smart_meeting_availability"),
    buildToolDefinition({
      title: "Get Smart Meeting Availability",
      description:
        "Look up availability information for a smart meeting, with optional attendee/date filters.",
      inputSchema: {
        smartMeetingId: numericIdSchema("Smart Meeting ID"),
        start: isoDateOrDateTimeSchema.optional(),
        end: isoDateOrDateTimeSchema.optional(),
        attendeeEmail: attendeeEmailSchema.optional(),
        attendeeEmails: attendeeEmailsSchema.optional(),
        includeOptionalAttendees: z
          .boolean()
          .optional()
          .describe(
            "Whether optional attendees should be included in availability checks.",
          ),
        query: smartMeetingPayloadSchema.query,
        timeZone: smartMeetingPayloadSchema.timeZone,
        timezone: smartMeetingPayloadSchema.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({
      smartMeetingId,
      start,
      end,
      attendeeEmail,
      attendeeEmails,
      includeOptionalAttendees,
      query,
      timeZone,
      timezone,
    }) => {
      let normalizedAttendees:
        | {
            attendeeEmail?: string;
            attendeeEmails?: string[];
          }
        | undefined;
      try {
        normalizedAttendees = normalizeAttendeeInputs(
          attendeeEmail,
          attendeeEmails,
        );
        assertNoReservedAttendeeQueryKeys(
          query as ReclaimQueryParams | undefined,
        );
      } catch (error) {
        return wrapApiCall(Promise.reject(error));
      }

      return wrapApiCall(
        api.getSmartMeetingAvailability(smartMeetingId, {
          query: mergeQuery(query as ReclaimQueryParams | undefined, {
            start,
            end,
            ...normalizedAttendees,
            includeOptionalAttendees,
          }),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      );
    },
  );

  server.registerTool(
    reclaimToolName("invite_smart_meeting_organizer"),
    buildToolDefinition({
      title: "Invite Smart Meeting Organizer",
      description:
        "Invite organizer/participants for a smart meeting using validated attendee fields.",
      inputSchema: {
        smartMeetingId: numericIdSchema("Smart Meeting ID").optional(),
        organizerEmail: z
          .string()
          .email("organizerEmail must be a valid email.")
          .optional(),
        attendeeEmail: attendeeEmailSchema.optional(),
        attendeeEmails: attendeeEmailsSchema.optional(),
        payload: smartMeetingPayloadSchema.payload,
        query: smartMeetingPayloadSchema.query,
        timeZone: smartMeetingPayloadSchema.timeZone,
        timezone: smartMeetingPayloadSchema.timezone,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({
      smartMeetingId,
      organizerEmail,
      attendeeEmail,
      attendeeEmails,
      payload,
      query,
      timeZone,
      timezone,
    }) => {
      let normalizedAttendees:
        | {
            attendeeEmail?: string;
            attendeeEmails?: string[];
          }
        | undefined;
      try {
        normalizedAttendees = normalizeAttendeeInputs(
          attendeeEmail,
          attendeeEmails,
        );
        assertNoReservedAttendeePayloadKeys(payload);
        assertNoReservedAttendeeQueryKeys(
          query as ReclaimQueryParams | undefined,
        );
      } catch (error) {
        return wrapApiCall(Promise.reject(error));
      }

      return wrapApiCall(
        api.inviteSmartMeetingOrganizer(
          mergePayload(
            cleanUndefinedPayload({
              smartMeetingId,
              organizerEmail,
              ...normalizedAttendees,
            }),
            payload,
          ),
          {
            query: query as QueryParams | undefined,
            timeZone: resolveTimeZoneAlias(timeZone, timezone),
          },
        ),
      );
    },
  );

  server.registerTool(
    reclaimToolName("convert_smart_meetings_to_single_instances"),
    buildToolDefinition({
      title: "Convert Smart Meetings to Single Instances",
      description:
        "Convert recurring smart meetings into single-instance events where supported.",
      inputSchema: {
        smartMeetingIds: z
          .array(numericIdSchema("Smart Meeting ID"))
          .min(1)
          .optional(),
        payload: smartMeetingPayloadSchema.payload,
        timeZone: smartMeetingPayloadSchema.timeZone,
        timezone: smartMeetingPayloadSchema.timezone,
      },
      annotations: toolAnnotations({ idempotent: false }),
    }),
    async ({ smartMeetingIds, payload, timeZone, timezone }) => {
      const body = mergePayload(
        smartMeetingIds ? { smartMeetingIds } : {},
        payload,
      );
      return wrapApiCall(
        api.convertSmartMeetingsToSingleInstances(body, {
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      );
    },
  );

  server.registerTool(
    reclaimToolName("get_smart_meeting_availability_diagnostics"),
    buildToolDefinition({
      title: "Get Smart Meeting Availability Diagnostics",
      description:
        "Read availability diagnostics for smart meetings with optional attendee/date filters.",
      inputSchema: {
        start: isoDateOrDateTimeSchema.optional(),
        end: isoDateOrDateTimeSchema.optional(),
        attendeeEmail: attendeeEmailSchema.optional(),
        attendeeEmails: attendeeEmailsSchema.optional(),
        includeOptionalAttendees: z
          .boolean()
          .optional()
          .describe(
            "Whether optional attendees should be included in diagnostics.",
          ),
        query: smartMeetingPayloadSchema.query,
        timeZone: smartMeetingPayloadSchema.timeZone,
        timezone: smartMeetingPayloadSchema.timezone,
      },
      annotations: toolAnnotations({ readOnly: true }),
    }),
    async ({
      start,
      end,
      attendeeEmail,
      attendeeEmails,
      includeOptionalAttendees,
      query,
      timeZone,
      timezone,
    }) => {
      let normalizedAttendees:
        | {
            attendeeEmail?: string;
            attendeeEmails?: string[];
          }
        | undefined;
      try {
        normalizedAttendees = normalizeAttendeeInputs(
          attendeeEmail,
          attendeeEmails,
        );
        assertNoReservedAttendeeQueryKeys(
          query as ReclaimQueryParams | undefined,
        );
      } catch (error) {
        return wrapApiCall(Promise.reject(error));
      }

      return wrapApiCall(
        api.getSmartMeetingAvailabilityDiagnostics({
          query: mergeQuery(query as ReclaimQueryParams | undefined, {
            start,
            end,
            ...normalizedAttendees,
            includeOptionalAttendees,
          }),
          timeZone: resolveTimeZoneAlias(timeZone, timezone),
        }),
      );
    },
  );
}
