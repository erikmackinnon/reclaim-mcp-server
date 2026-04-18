import { z } from "zod";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME_REGEX =
  /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:[zZ]|[+-]\d{2}:\d{2})?$/;

const DEFAULT_TIME_ZONE_DESCRIPTION =
  "IANA time zone used to interpret date/time inputs without offsets (e.g., America/Los_Angeles).";

export const isoDateSchema = z.string().regex(ISO_DATE_REGEX, {
  message: "Date must be in YYYY-MM-DD format.",
});

export const isoDateTimeSchema = z.string().regex(ISO_DATETIME_REGEX, {
  message:
    "Date/time must be ISO 8601 (YYYY-MM-DDTHH:mm with optional seconds and offset).",
});

export const isoDateOrDateTimeSchema = z.union([
  isoDateTimeSchema,
  isoDateSchema,
]);

export function numericIdSchema(label = "ID"): z.ZodNumber {
  return z.number().int().positive(`${label} must be a positive integer.`);
}

export function stringIdSchema(label = "ID"): z.ZodString {
  return z.string().min(1, `${label} cannot be empty.`);
}

export function bulkNumericIdsSchema(label = "IDs"): z.ZodArray<z.ZodNumber> {
  return z
    .array(numericIdSchema("ID"))
    .min(1, `${label} must include at least one ID.`)
    .max(200, `${label} cannot exceed 200 IDs.`);
}

export function bulkStringIdsSchema(label = "IDs"): z.ZodArray<z.ZodString> {
  return z
    .array(stringIdSchema("ID"))
    .min(1, `${label} must include at least one ID.`)
    .max(200, `${label} cannot exceed 200 IDs.`);
}

export const paginationSchema = {
  limit: z
    .number()
    .int()
    .min(1, "limit must be at least 1.")
    .max(200, "limit cannot exceed 200.")
    .optional(),
  offset: z.number().int().min(0, "offset cannot be negative.").optional(),
  cursor: z.string().min(1, "cursor cannot be empty.").optional(),
} as const;

export const dateRangeSchema = {
  start: isoDateOrDateTimeSchema.optional().describe("Inclusive range start."),
  end: isoDateOrDateTimeSchema.optional().describe("Inclusive range end."),
} as const;

export const timeZoneSchema = z
  .string()
  .optional()
  .describe(DEFAULT_TIME_ZONE_DESCRIPTION);

export const timeZoneAliasSchema = z
  .string()
  .optional()
  .describe("Alias for timeZone.");

export function timeZoneInputSchemas(
  description = DEFAULT_TIME_ZONE_DESCRIPTION,
): {
  timeZone: z.ZodOptional<z.ZodString>;
  timezone: z.ZodOptional<z.ZodString>;
} {
  return {
    timeZone: z.string().optional().describe(description),
    timezone: timeZoneAliasSchema,
  };
}

export function resolveTimeZoneAlias(
  timeZone?: string,
  timezone?: string,
): string | undefined {
  return timeZone ?? timezone;
}

export const plannerEventIdSchema = z
  .union([stringIdSchema("plannerEventId"), numericIdSchema("plannerEventId")])
  .describe(
    "Planner event identifier (string or numeric, depending on endpoint).",
  );

export const plannerEventReferenceSchema = {
  plannerEventId: plannerEventIdSchema.optional(),
  eventId: plannerEventIdSchema
    .optional()
    .describe("Alias for plannerEventId on planner event operations."),
} as const;
