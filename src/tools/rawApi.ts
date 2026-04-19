import { Buffer } from "node:buffer";

import { z } from "zod";

import {
  normalizeQueryParams,
  normalizeApiError,
  reclaim,
  assertToken,
} from "../client/core/http.js";
import {
  HTTP_METHODS,
  listEndpointMatchesForPath,
  matchEndpointRequest,
  type EndpointRegistryEntry,
  type HttpMethod,
} from "../endpoint-registry.js";
import {
  buildToolDefinition,
  reclaimToolName,
  toolAnnotations,
} from "../server/tool-metadata.js";
import { wrapApiCall } from "../utils.js";

import type { QueryValue } from "../client/core/http.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

type QueryScalar = string | number | boolean | null;
type QueryValueInput = QueryScalar | QueryScalar[];
type QueryInput = Record<string, QueryValueInput>;

type RawApiToolInput = {
  method: HttpMethod;
  path: string;
  query?: unknown;
  body?: unknown;
};

type RawApiResult = {
  endpoint: {
    domain: EndpointRegistryEntry["domain"];
    pathTemplate: string;
    method: HttpMethod;
    allowedMethods: readonly HttpMethod[];
    mode: EndpointRegistryEntry["mode"];
    safety: EndpointRegistryEntry["safety"];
    description: string;
  };
  request: {
    method: HttpMethod;
    path: string;
    queryProvided: boolean;
    bodyProvided: boolean;
  };
  destructiveOperation: boolean;
  safetyNotice?: string;
  response: unknown;
};

const MAX_PATH_LENGTH = 2048;
const MAX_QUERY_KEYS = 50;
const MAX_QUERY_ARRAY_LENGTH = 100;
const MAX_QUERY_BYTES = 16 * 1024;
const MAX_BODY_BYTES = 256 * 1024;
const MAX_BODY_DEPTH = 10;
const MAX_BODY_NODES = 3000;
const MAX_OBJECT_KEYS = 300;
const MAX_KEY_LENGTH = 120;
const FORBIDDEN_OBJECT_KEYS = new Set([
  "__proto__",
  "constructor",
  "prototype",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isQueryScalar(value: unknown): value is QueryScalar {
  if (value === null) {
    return true;
  }

  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  return typeof value === "string" || typeof value === "boolean";
}

function assertAllowedObjectKey(key: string, location: "query" | "body"): void {
  if (FORBIDDEN_OBJECT_KEYS.has(key.toLowerCase())) {
    throw new Error(
      `${location} key '${key}' is not allowed for security reasons.`,
    );
  }
}

function normalizePath(inputPath: string): string {
  const trimmed = inputPath.trim();
  if (trimmed.length === 0) {
    throw new Error("path cannot be empty.");
  }
  if (trimmed.length > MAX_PATH_LENGTH) {
    throw new Error(`path exceeds ${MAX_PATH_LENGTH} characters.`);
  }
  if (!trimmed.startsWith("/")) {
    throw new Error("path must start with '/'.");
  }
  if (trimmed.includes("://")) {
    throw new Error("path must be a relative API path, not a full URL.");
  }

  const parsed = new URL(trimmed, "https://reclaim.local");
  if (parsed.origin !== "https://reclaim.local") {
    throw new Error("path must be a relative API path under '/'.");
  }
  if (parsed.search.length > 0 || parsed.hash.length > 0) {
    throw new Error(
      "path must not include query params or fragments. Use the query field instead.",
    );
  }

  const normalizedPath = parsed.pathname;
  if (normalizedPath.includes("..")) {
    throw new Error(
      "path must not include parent directory traversal segments.",
    );
  }

  return normalizedPath;
}

function validateQueryInput(input: unknown): QueryInput | undefined {
  if (input === undefined) {
    return undefined;
  }

  if (!isPlainObject(input)) {
    throw new Error(
      "query must be an object with scalar or scalar-array values.",
    );
  }

  const entries = Object.entries(input);
  if (entries.length > MAX_QUERY_KEYS) {
    throw new Error(`query cannot include more than ${MAX_QUERY_KEYS} keys.`);
  }

  const normalized: QueryInput = {};

  for (const [key, rawValue] of entries) {
    if (key.length === 0 || key.length > MAX_KEY_LENGTH) {
      throw new Error(
        `query key '${key}' is invalid. Keys must be 1-${MAX_KEY_LENGTH} characters.`,
      );
    }
    assertAllowedObjectKey(key, "query");

    if (rawValue === undefined) {
      continue;
    }

    if (isQueryScalar(rawValue)) {
      normalized[key] = rawValue;
      continue;
    }

    if (Array.isArray(rawValue)) {
      if (rawValue.length > MAX_QUERY_ARRAY_LENGTH) {
        throw new Error(
          `query array '${key}' exceeds ${MAX_QUERY_ARRAY_LENGTH} entries.`,
        );
      }

      for (const item of rawValue) {
        if (!isQueryScalar(item)) {
          throw new Error(
            `query array '${key}' must contain only string/number/boolean/null values.`,
          );
        }
      }

      normalized[key] = rawValue;
      continue;
    }

    throw new Error(
      `query value '${key}' must be a scalar or array of scalars (no nested objects).`,
    );
  }

  const encoded = JSON.stringify(normalized);
  if (Buffer.byteLength(encoded, "utf8") > MAX_QUERY_BYTES) {
    throw new Error(`query payload exceeds ${MAX_QUERY_BYTES} bytes.`);
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function validateBodyNode(
  value: unknown,
  depth: number,
  state: { nodes: number },
): void {
  state.nodes += 1;

  if (state.nodes > MAX_BODY_NODES) {
    throw new Error(`body exceeds complexity limit (${MAX_BODY_NODES} nodes).`);
  }

  if (depth > MAX_BODY_DEPTH) {
    throw new Error(`body exceeds maximum nesting depth (${MAX_BODY_DEPTH}).`);
  }

  if (value === null) {
    return;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("body contains non-finite number values.");
    }
    return;
  }

  if (typeof value === "string" || typeof value === "boolean") {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      validateBodyNode(item, depth + 1, state);
    }
    return;
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value);
    if (entries.length > MAX_OBJECT_KEYS) {
      throw new Error(`body object exceeds ${MAX_OBJECT_KEYS} keys.`);
    }

    for (const [key, nestedValue] of entries) {
      if (key.length === 0 || key.length > MAX_KEY_LENGTH) {
        throw new Error(
          `body key '${key}' is invalid. Keys must be 1-${MAX_KEY_LENGTH} characters.`,
        );
      }
      assertAllowedObjectKey(key, "body");
      validateBodyNode(nestedValue, depth + 1, state);
    }
    return;
  }

  throw new Error("body must be valid JSON-compatible content.");
}

function validateBodyInput(method: HttpMethod, body: unknown): unknown {
  if (body === undefined) {
    return undefined;
  }

  if (method === "GET") {
    throw new Error("GET requests cannot include a body.");
  }

  validateBodyNode(body, 0, { nodes: 0 });

  const encoded = JSON.stringify(body);
  if (encoded === undefined) {
    throw new Error("body must be JSON-serializable.");
  }

  if (Buffer.byteLength(encoded, "utf8") > MAX_BODY_BYTES) {
    throw new Error(`body payload exceeds ${MAX_BODY_BYTES} bytes.`);
  }

  return body;
}

function ensureRawEndpoint(
  method: HttpMethod,
  path: string,
): EndpointRegistryEntry {
  const exactMatch = matchEndpointRequest(method, path);

  if (exactMatch?.mode === "excluded" || exactMatch?.isExcluded) {
    throw new Error(
      `Endpoint ${method} ${path} is excluded by policy (${exactMatch.exclusionCategory ?? "unknown"}).`,
    );
  }

  if (exactMatch?.mode === "raw") {
    return exactMatch;
  }

  if (exactMatch?.mode === "typed") {
    throw new Error(
      `Endpoint ${method} ${exactMatch.pathTemplate} is typed and not available via reclaim_call_api.`,
    );
  }

  const pathMatches = listEndpointMatchesForPath(path);
  const rawMatches = pathMatches.filter(
    (entry) => entry.mode === "raw" && !entry.isExcluded,
  );

  if (rawMatches.length === 0) {
    if (
      pathMatches.some((entry) => entry.mode === "excluded" || entry.isExcluded)
    ) {
      throw new Error(
        `Path ${path} is excluded by policy and cannot be called.`,
      );
    }

    if (pathMatches.length > 0) {
      throw new Error(`Path ${path} is not in the raw allowlist.`);
    }

    throw new Error(
      `Path ${path} is not recognized by the endpoint registry and is blocked.`,
    );
  }

  const template = rawMatches[0];
  const allowedMethods = template.allowedMethods.join(", ");
  throw new Error(
    `Method ${method} is not allowlisted for ${template.pathTemplate}. Allowed methods: ${allowedMethods}.`,
  );
}

function toQueryParams(
  query: QueryInput | undefined,
): Record<string, QueryValue> | undefined {
  if (!query) {
    return undefined;
  }

  return query;
}

async function executeRawCall(input: RawApiToolInput): Promise<RawApiResult> {
  const method = input.method;
  const path = normalizePath(input.path);
  const endpoint = ensureRawEndpoint(method, path);
  const query = validateQueryInput(input.query);
  const body = validateBodyInput(method, input.body);

  const context = `reclaim_call_api(${method} ${path})`;

  try {
    assertToken();
    const response = await reclaim.request<unknown>({
      method,
      url: path,
      params: normalizeQueryParams(toQueryParams(query)),
      data: body,
    });

    return {
      endpoint: {
        domain: endpoint.domain,
        pathTemplate: endpoint.pathTemplate,
        method: endpoint.method,
        allowedMethods: endpoint.allowedMethods,
        mode: endpoint.mode,
        safety: endpoint.safety,
        description: endpoint.description,
      },
      request: {
        method,
        path,
        queryProvided: query !== undefined,
        bodyProvided: body !== undefined,
      },
      destructiveOperation: endpoint.safety.destructive,
      safetyNotice: endpoint.safety.destructive
        ? "This endpoint is marked destructive in the registry. Validate intent before use."
        : undefined,
      response: response.data,
    };
  } catch (error) {
    return normalizeApiError(error, context);
  }
}

export function registerRawApiTool(server: McpServer): void {
  server.registerTool(
    reclaimToolName("call_api"),
    buildToolDefinition({
      title: "Call Reclaim API (Allowlisted Raw)",
      description:
        "Expert fallback for allowlisted raw Reclaim endpoints only. Excluded/admin/staff/billing routes are blocked.",
      inputSchema: {
        method: z
          .enum(HTTP_METHODS)
          .describe("HTTP method for the endpoint call."),
        path: z
          .string()
          .min(1)
          .describe(
            "Path beginning with '/' (no host/query/fragment), e.g. /smart-habits/detect.",
          ),
        query: z
          .record(z.unknown())
          .optional()
          .describe(
            "Optional query object. Values must be scalar or scalar arrays. Nested objects are blocked.",
          ),
        body: z
          .unknown()
          .optional()
          .describe(
            "Optional JSON body (max 256KB, depth and node limits enforced).",
          ),
      },
      annotations: toolAnnotations({ idempotent: false, destructive: true }),
    }),
    async (params) => wrapApiCall(executeRawCall(params as RawApiToolInput)),
  );
}
