import { describe, expect, it } from "vitest";

import { DOMAIN_REGISTRARS, registerDomainRegistrars } from "./index.js";
import { taskDomainRegistrar } from "./tasks.js";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

class RegistrationSpy {
  public readonly tools: string[] = [];
  public readonly resources: string[] = [];

  registerTool(name: string): void {
    this.tools.push(name);
  }

  registerResource(name: string): void {
    this.resources.push(name);
  }
}

function createSpyServer(): {
  spy: RegistrationSpy;
  server: McpServer;
} {
  const spy = new RegistrationSpy();
  return {
    spy,
    server: spy as unknown as McpServer,
  };
}

describe("domain registrars", () => {
  it("registers task domain tools and resources via task registrar", () => {
    const { spy, server } = createSpyServer();

    taskDomainRegistrar.register(server);

    expect(new Set(spy.tools)).toEqual(
      new Set([
        "reclaim_get_task_defaults",
        "reclaim_list_tasks",
        "reclaim_get_task",
        "reclaim_mark_complete",
        "reclaim_mark_incomplete",
        "reclaim_delete_task",
        "reclaim_add_time",
        "reclaim_start_timer",
        "reclaim_stop_timer",
        "reclaim_log_work",
        "reclaim_clear_exceptions",
        "reclaim_prioritize",
        "reclaim_create_task",
        "reclaim_update_task",
      ]),
    );

    expect(new Set(spy.resources)).toEqual(
      new Set(["reclaim_active_tasks", "reclaim_task_defaults"]),
    );
  });

  it("registers all domain registrars through bootstrap helper", () => {
    const { spy, server } = createSpyServer();

    registerDomainRegistrars(server);

    expect(spy.tools.length).toBe(14);
    expect(spy.resources.length).toBe(2);

    for (const toolName of spy.tools) {
      expect(toolName.startsWith("reclaim_")).toBe(true);
    }
  });

  it("keeps registrar domains uniquely addressable", () => {
    const domains = DOMAIN_REGISTRARS.map((registrar) => registrar.domain);
    expect(domains.length).toBe(new Set(domains).size);
    expect(domains).toContain("tasks");
  });
});
