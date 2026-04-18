import { describe, expect, it } from "vitest";

import {
  expectReclaimToolNames,
  expectToolAnnotations,
  findRegisteredTool,
} from "../../test/harness/assertions.js";
import { createMcpServerHarness } from "../../test/harness/mcp-server.js";
import { DOMAIN_REGISTRARS, registerDomainRegistrars } from "./index.js";
import { curatedFallbackRegistrar } from "./curatedFallback.js";
import { habitDomainRegistrar } from "./habits.js";
import { taskDomainRegistrar } from "./tasks.js";

describe("domain registrars", () => {
  it("registers task domain tools and resources via task registrar", () => {
    const { harness, server } = createMcpServerHarness();

    taskDomainRegistrar.register(server);

    expect(new Set(harness.tools.map((tool) => tool.name))).toEqual(
      new Set([
        "reclaim_get_task_defaults",
        "reclaim_list_tasks",
        "reclaim_get_task",
        "reclaim_get_task_min_index",
        "reclaim_list_recommended_tasks",
        "reclaim_batch_update_tasks",
        "reclaim_batch_delete_tasks",
        "reclaim_batch_archive_tasks",
        "reclaim_batch_complete_tasks",
        "reclaim_reindex_tasks_by_due",
        "reclaim_reindex_task",
        "reclaim_plan_work",
        "reclaim_restart_task",
        "reclaim_reschedule_task_event",
        "reclaim_bulk_reschedule_task_events",
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

    expect(new Set(harness.resources.map((resource) => resource.name))).toEqual(
      new Set(["reclaim_active_tasks", "reclaim_task_defaults"]),
    );

    const listTasks = findRegisteredTool(harness.tools, "reclaim_list_tasks");
    const deleteTask = findRegisteredTool(harness.tools, "reclaim_delete_task");
    const batchDelete = findRegisteredTool(
      harness.tools,
      "reclaim_batch_delete_tasks",
    );
    const batchArchive = findRegisteredTool(
      harness.tools,
      "reclaim_batch_archive_tasks",
    );
    expectToolAnnotations(listTasks, {
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
    });
    expectToolAnnotations(deleteTask, {
      idempotentHint: true,
      destructiveHint: true,
    });
    expectToolAnnotations(batchDelete, {
      idempotentHint: true,
      destructiveHint: true,
    });
    expectToolAnnotations(batchArchive, {
      idempotentHint: true,
      destructiveHint: true,
    });
  });

  it("registers all domain registrars through bootstrap helper", () => {
    const { harness, server } = createMcpServerHarness();

    registerDomainRegistrars(server);

    expect(harness.tools.length).toBe(54);
    expect(harness.resources.length).toBe(6);
    expect(new Set(harness.tools.map((tool) => tool.name))).toContain(
      "reclaim_call_api",
    );
    expect(harness.tools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining([
        "reclaim_create_habit",
        "reclaim_detect_habits",
        "reclaim_list_daily_habits",
      ]),
    );
    expect(harness.resources.map((resource) => resource.name)).toEqual(
      expect.arrayContaining([
        "reclaim_current_user_profile",
        "reclaim_daily_habits",
        "reclaim_focus_settings_current",
        "reclaim_team_current",
      ]),
    );
    expectReclaimToolNames(harness.tools);
  });

  it("keeps registrar domains uniquely addressable", () => {
    const domains = DOMAIN_REGISTRARS.map((registrar) => registrar.domain);
    expect(domains.length).toBe(new Set(domains).size);
    expect(domains).toContain("tasks");
    expect(domains).toContain("habits");
    expect(domains).toContain("curated_fallback");
  });

  it("registers habits domain tools via habits registrar", () => {
    const { harness, server } = createMcpServerHarness();

    habitDomainRegistrar.register(server);

    expect(new Set(harness.tools.map((tool) => tool.name))).toEqual(
      new Set([
        "reclaim_list_habits",
        "reclaim_create_habit",
        "reclaim_get_habit",
        "reclaim_update_habit",
        "reclaim_delete_habit",
        "reclaim_detect_habits",
        "reclaim_convert_habits_to_single_instances",
        "reclaim_share_habit",
        "reclaim_get_shared_habit",
        "reclaim_get_shared_habit_v2",
        "reclaim_get_habit_template",
        "reclaim_list_habit_templates",
        "reclaim_create_habit_from_template",
        "reclaim_list_smart_habit_templates",
        "reclaim_create_smart_habit_template",
        "reclaim_get_smart_habit_template",
        "reclaim_update_smart_habit_template",
        "reclaim_delete_smart_habit_template",
        "reclaim_list_daily_habits",
        "reclaim_create_daily_habit",
        "reclaim_get_daily_habit",
        "reclaim_replace_daily_habit",
        "reclaim_update_daily_habit",
        "reclaim_delete_daily_habit",
        "reclaim_get_assist_habit_template",
        "reclaim_create_assist_habit_template",
        "reclaim_list_assist_habit_templates",
      ]),
    );

    const listHabits = findRegisteredTool(harness.tools, "reclaim_list_habits");
    const deleteDailyHabit = findRegisteredTool(
      harness.tools,
      "reclaim_delete_daily_habit",
    );
    expectToolAnnotations(listHabits, {
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
    });
    expectToolAnnotations(deleteDailyHabit, {
      idempotentHint: true,
      destructiveHint: true,
    });
  });

  it("registers curated fallback domain tool and resources", () => {
    const { harness, server } = createMcpServerHarness();

    curatedFallbackRegistrar.register(server);

    expect(harness.tools.map((tool) => tool.name)).toEqual([
      "reclaim_call_api",
    ]);
    expect(new Set(harness.resources.map((resource) => resource.name))).toEqual(
      new Set([
        "reclaim_current_user_profile",
        "reclaim_daily_habits",
        "reclaim_focus_settings_current",
        "reclaim_team_current",
      ]),
    );
  });
});
