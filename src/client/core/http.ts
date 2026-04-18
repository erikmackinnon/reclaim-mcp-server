import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from "axios";

import { ReclaimError } from "../../types/reclaim.js";

export type QueryValue =
  | string
  | number
  | boolean
  | null
  | Array<string | number | boolean | null>
  | undefined;

export type QueryParams = Record<string, QueryValue>;

type RequestOptions = {
  context: string;
  query?: QueryParams;
};

const TOKEN = process.env.RECLAIM_API_KEY;
const DEBUG_ENABLED = process.env.RECLAIM_DEBUG === "true";

export const reclaim: AxiosInstance = axios.create({
  baseURL: "https://api.app.reclaim.ai/api/",
  headers: {
    ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  paramsSerializer: {
    serialize: (params) => serializeQueryParams(params as QueryParams),
  },
});

export function debugLog(context: string, detail: unknown): void {
  if (!DEBUG_ENABLED) {
    return;
  }

  try {
    console.error(`[reclaim-debug] ${context}`, JSON.stringify(detail, null, 2));
  } catch (error) {
    console.error(`[reclaim-debug] ${context}`, detail, error);
  }
}

export function assertToken(): void {
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

export function normalizeQueryParams(query?: QueryParams): QueryParams | undefined {
  if (!query) {
    return undefined;
  }

  const normalized: QueryParams = {};
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      const compact = value.filter((entry) => entry !== undefined);
      if (compact.length > 0) {
        normalized[key] = compact;
      }
      continue;
    }

    normalized[key] = value;
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export function serializeQueryParams(params: QueryParams): string {
  const normalized = normalizeQueryParams(params);
  if (!normalized) {
    return "";
  }

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(normalized)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        search.append(key, item === null ? "" : String(item));
      }
      continue;
    }

    search.append(key, value === null ? "" : String(value));
  }

  return search.toString();
}

export function normalizeApiError(error: unknown, context: string): never {
  let status: number | undefined;
  let detail: unknown;
  let message: string;

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    status = axiosError.response?.status;
    detail = axiosError.response?.data;
    const responseData = detail as { message?: string; title?: string } | undefined;
    message = responseData?.message || responseData?.title || axiosError.message;
    console.error(
      `Reclaim API Error (${context}) - Status: ${status ?? "N/A"}`,
      detail || axiosError.message,
    );
  } else if (error instanceof Error) {
    message = error.message;
    detail = { stack: error.stack };
    console.error(`Error during Reclaim API call (${context})`, error);
  } else {
    message = "An unexpected error occurred during API call.";
    detail = error;
    console.error(`Unexpected throw during Reclaim API call (${context})`, error);
  }

  throw new ReclaimError(`API Call Failed (${context}): ${message}`, status, detail);
}

async function request<T>(
  config: AxiosRequestConfig,
  options: RequestOptions,
): Promise<T> {
  const normalizedQuery = normalizeQueryParams(options.query);
  const requestConfig: AxiosRequestConfig = {
    ...config,
    params: normalizedQuery,
  };

  debugLog(`${options.context} request`, {
    method: requestConfig.method,
    url: requestConfig.url,
    params: normalizedQuery,
    data: requestConfig.data,
  });

  try {
    assertToken();
    const response: AxiosResponse<T> = await reclaim.request<T>(requestConfig);
    debugLog(`${options.context} response`, {
      status: response.status,
      data: response.data,
    });
    return response.data;
  } catch (error) {
    return normalizeApiError(error, options.context);
  }
}

export const reclaimHttpClient = {
  get<T>(url: string, options: RequestOptions): Promise<T> {
    return request<T>({ method: "GET", url }, options);
  },

  post<T>(url: string, data: unknown, options: RequestOptions): Promise<T> {
    return request<T>({ method: "POST", url, data }, options);
  },

  put<T>(url: string, data: unknown, options: RequestOptions): Promise<T> {
    return request<T>({ method: "PUT", url, data }, options);
  },

  patch<T>(url: string, data: unknown, options: RequestOptions): Promise<T> {
    return request<T>({ method: "PATCH", url, data }, options);
  },

  delete(url: string, options: RequestOptions): Promise<void> {
    return request<void>({ method: "DELETE", url }, options);
  },
};
