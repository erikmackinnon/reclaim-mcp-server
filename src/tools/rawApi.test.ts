import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { reclaim } from "../client/core/http.js";
import { registerRawApiTool } from "./rawApi.js";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

type ToolHandler = (params: unknown) => Promise<CallToolResult>;

const ORIGINAL_API_KEY = process.env.RECLAIM_API_KEY;

class ToolSpy {
  private readonly handlers = new Map<string, ToolHandler>();

  registerTool(name: string, _definition: unknown, handler: ToolHandler): void {
    this.handlers.set(name, handler);
  }

  getHandler(name: string): ToolHandler {
    const handler = this.handlers.get(name);
    if (!handler) {
      throw new Error(`Missing handler for ${name}`);
    }
    return handler;
  }
}

type RawToolResultPayload = {
  result: {
    destructiveOperation: boolean;
    safetyNotice?: string;
    endpoint: {
      pathTemplate: string;
      mode: string;
    };
    response: unknown;
  };
};

function extractText(result: CallToolResult): string {
  return result.content
    .filter(
      (item): item is { type: "text"; text: string } => item.type === "text",
    )
    .map((item) => item.text)
    .join("\n");
}

describe("registerRawApiTool", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.RECLAIM_API_KEY = "test-token";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (ORIGINAL_API_KEY === undefined) {
      delete process.env.RECLAIM_API_KEY;
    } else {
      process.env.RECLAIM_API_KEY = ORIGINAL_API_KEY;
    }
  });

  it("blocks excluded endpoints", async () => {
    const spy = new ToolSpy();
    registerRawApiTool(spy as unknown as McpServer);

    const handler = spy.getHandler("reclaim_call_api");
    const result = await handler({ method: "POST", path: "/oauth2/token" });

    expect(result.isError).toBe(true);
    expect(extractText(result)).toContain("excluded by policy");
  });

  it("blocks methods that are not allowlisted for a raw endpoint template", async () => {
    const spy = new ToolSpy();
    registerRawApiTool(spy as unknown as McpServer);

    const handler = spy.getHandler("reclaim_call_api");
    const result = await handler({
      method: "GET",
      path: "/planner/done/habit/42",
    });

    expect(result.isError).toBe(true);
    expect(extractText(result)).toContain("not allowlisted");
    expect(extractText(result)).toContain("POST");
  });

  it("blocks typed endpoints from the raw fallback surface", async () => {
    const spy = new ToolSpy();
    registerRawApiTool(spy as unknown as McpServer);

    const handler = spy.getHandler("reclaim_call_api");
    const result = await handler({
      method: "GET",
      path: "/smart-habits/detect",
    });

    expect(result.isError).toBe(true);
    expect(extractText(result)).toContain(
      "typed and not available via reclaim_call_api",
    );
  });

  it("blocks typed one-on-one endpoints from the raw fallback surface", async () => {
    const spy = new ToolSpy();
    registerRawApiTool(spy as unknown as McpServer);

    const handler = spy.getHandler("reclaim_call_api");
    const result = await handler({
      method: "POST",
      path: "/oneOnOne",
    });

    expect(result.isError).toBe(true);
    expect(extractText(result)).toContain(
      "typed and not available via reclaim_call_api",
    );
  });

  it("blocks typed team/integration endpoints from the raw fallback surface", async () => {
    const spy = new ToolSpy();
    registerRawApiTool(spy as unknown as McpServer);

    const handler = spy.getHandler("reclaim_call_api");
    const result = await handler({
      method: "GET",
      path: "/team/current/membership",
    });

    expect(result.isError).toBe(true);
    expect(extractText(result)).toContain(
      "typed and not available via reclaim_call_api",
    );
  });

  it("blocks excluded invitation administration endpoints", async () => {
    const spy = new ToolSpy();
    registerRawApiTool(spy as unknown as McpServer);

    const handler = spy.getHandler("reclaim_call_api");
    const result = await handler({
      method: "GET",
      path: "/team/current/inviteable",
    });

    expect(result.isError).toBe(true);
    expect(extractText(result)).toContain("excluded by policy");
  });

  it("allows PUT /tasks/{id} through raw fallback when the route is raw-scoped", async () => {
    const spy = new ToolSpy();
    registerRawApiTool(spy as unknown as McpServer);

    vi.spyOn(reclaim, "request").mockResolvedValue({
      data: { ok: true },
    } as never);

    const handler = spy.getHandler("reclaim_call_api");
    const result = await handler({
      method: "PUT",
      path: "/tasks/123",
      body: { title: "Updated Task" },
    });

    expect(result.isError).not.toBe(true);

    const payload = result.structuredContent as RawToolResultPayload;
    expect(payload.result.endpoint.pathTemplate).toBe("/tasks/{id}");
    expect(payload.result.endpoint.mode).toBe("raw");
    expect(payload.result.response).toEqual({ ok: true });
  });

  it("returns endpoint metadata and destructive annotation for destructive raw calls", async () => {
    const spy = new ToolSpy();
    registerRawApiTool(spy as unknown as McpServer);

    vi.spyOn(reclaim, "request").mockResolvedValue({
      data: { ok: true },
    } as never);

    const handler = spy.getHandler("reclaim_call_api");
    const result = await handler({
      method: "DELETE",
      path: "/planner/policy/task/101",
    });

    expect(result.isError).not.toBe(true);

    const payload = result.structuredContent as RawToolResultPayload;
    expect(payload.result.endpoint.pathTemplate).toBe(
      "/planner/policy/task/{id}",
    );
    expect(payload.result.endpoint.mode).toBe("raw");
    expect(payload.result.destructiveOperation).toBe(true);
    expect(payload.result.safetyNotice).toContain("marked destructive");
    expect(payload.result.response).toEqual({ ok: true });
  });

  it("rejects nested query payloads", async () => {
    const spy = new ToolSpy();
    registerRawApiTool(spy as unknown as McpServer);

    const handler = spy.getHandler("reclaim_call_api");
    const result = await handler({
      method: "DELETE",
      path: "/planner/policy/task/101",
      query: {
        nested: { disallowed: true },
      },
    });

    expect(result.isError).toBe(true);
    expect(extractText(result)).toContain("no nested objects");
  });
});
