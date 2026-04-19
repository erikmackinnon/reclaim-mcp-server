import { describe, expect, it } from "vitest";

import {
  expectReclaimToolNames,
  expectToolAnnotations,
  findRegisteredTool,
} from "../../test/harness/assertions.js";
import { createMcpServerHarness } from "../../test/harness/mcp-server.js";
import { DOMAIN_REGISTRARS, registerDomainRegistrars } from "./index.js";
import { curatedFallbackRegistrar } from "./curatedFallback.js";
import { eventsCalendarsDomainRegistrar } from "./eventsCalendars.js";
import { habitDomainRegistrar } from "./habits.js";
import { oneOnOneDomainRegistrar } from "./oneOnOnes.js";
import { schedulingLinkDomainRegistrar } from "./schedulingLinks.js";
import { smartMeetingDomainRegistrar } from "./smartMeetings.js";
import { taskDomainRegistrar } from "./tasks.js";
import { usersAccountsDomainRegistrar } from "./usersAccounts.js";
import { timePoliciesDomainRegistrar } from "./timePolicies.js";

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

    expect(harness.tools.length).toBe(189);
    expect(harness.resources.length).toBe(6);
    expect(new Set(harness.tools.map((tool) => tool.name))).toContain(
      "reclaim_call_api",
    );
    expect(harness.tools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining([
        "reclaim_create_habit",
        "reclaim_detect_habits",
        "reclaim_list_daily_habits",
        "reclaim_create_smart_meeting",
        "reclaim_get_smart_meeting_availability",
        "reclaim_list_one_on_ones",
        "reclaim_get_one_on_one_invitee_eligibility",
        "reclaim_list_scheduling_links",
        "reclaim_create_scheduling_link_group",
        "reclaim_refresh_scheduling_link_meeting",
        "reclaim_get_participant_resolution_scheduling_link",
        "reclaim_list_events",
        "reclaim_get_primary_calendar",
        "reclaim_validate_sync_policy",
        "reclaim_get_current_user",
        "reclaim_list_accounts",
        "reclaim_list_delegated_access",
        "reclaim_list_time_schemes",
        "reclaim_get_recommended_schedule_policy",
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
    expect(domains).toContain("smart_meetings");
    expect(domains).toContain("smart_1_1s");
    expect(domains).toContain("scheduling_links");
    expect(domains).toContain("events_calendars");
    expect(domains).toContain("users_accounts");
    expect(domains).toContain("time_schemes_time_windows_schedule_policies");
    expect(domains).toContain("curated_fallback");
  });

  it("registers users/accounts domain tools via users/accounts registrar", () => {
    const { harness, server } = createMcpServerHarness();

    usersAccountsDomainRegistrar.register(server);

    expect(new Set(harness.tools.map((tool) => tool.name))).toEqual(
      new Set([
        "reclaim_get_current_user",
        "reclaim_update_current_user",
        "reclaim_list_current_user_access",
        "reclaim_get_current_user_access",
        "reclaim_list_current_user_contacts",
        "reclaim_invite_current_user_contact",
        "reclaim_invite_current_user_contact_v2",
        "reclaim_list_current_user_contacts_v2",
        "reclaim_list_current_user_contacts_v3",
        "reclaim_get_current_user_product_usage",
        "reclaim_get_current_user_time_policies",
        "reclaim_update_current_user_time_policies",
        "reclaim_update_current_user_timezone_settings",
        "reclaim_update_current_user_week_start_settings",
        "reclaim_update_current_user_format24hour_settings",
        "reclaim_get_current_user_quest",
        "reclaim_update_current_user_quest",
        "reclaim_get_current_user_referrals",
        "reclaim_reset_current_user",
        "reclaim_get_current_user_restorable_features",
        "reclaim_restore_current_user_features",
        "reclaim_update_current_user_rsvp_settings",
        "reclaim_list_accounts",
        "reclaim_list_account_calendars",
        "reclaim_validate_account",
        "reclaim_delete_account",
        "reclaim_list_credentials",
        "reclaim_get_primary_credential",
        "reclaim_list_personal_credentials",
        "reclaim_get_credential",
        "reclaim_delete_credential",
        "reclaim_list_delegated_access",
        "reclaim_create_delegated_access",
        "reclaim_get_delegated_access_allowed",
        "reclaim_toggle_delegated_access",
        "reclaim_delete_delegated_access",
      ]),
    );

    const getCurrentUser = findRegisteredTool(
      harness.tools,
      "reclaim_get_current_user",
    );
    const updateCurrentUser = findRegisteredTool(
      harness.tools,
      "reclaim_update_current_user",
    );
    const resetCurrentUser = findRegisteredTool(
      harness.tools,
      "reclaim_reset_current_user",
    );
    const deleteCredential = findRegisteredTool(
      harness.tools,
      "reclaim_delete_credential",
    );

    expectToolAnnotations(getCurrentUser, {
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
    });
    expectToolAnnotations(updateCurrentUser, {
      idempotentHint: true,
      destructiveHint: false,
    });
    expectToolAnnotations(resetCurrentUser, {
      idempotentHint: false,
      destructiveHint: true,
    });
    expectToolAnnotations(deleteCredential, {
      idempotentHint: true,
      destructiveHint: true,
    });
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

  it("registers events/calendars domain tools via events/calendars registrar", () => {
    const { harness, server } = createMcpServerHarness();

    eventsCalendarsDomainRegistrar.register(server);

    expect(new Set(harness.tools.map((tool) => tool.name))).toEqual(
      new Set([
        "reclaim_list_events",
        "reclaim_list_events_v2",
        "reclaim_get_event",
        "reclaim_list_personal_events",
        "reclaim_convert_event_to_v2",
        "reclaim_match_event",
        "reclaim_get_primary_calendar",
        "reclaim_list_personal_calendars",
        "reclaim_get_personal_calendar",
        "reclaim_delete_personal_calendar",
        "reclaim_list_personal_calendar_candidates",
        "reclaim_get_sync_calendar",
        "reclaim_delete_sync_calendar",
        "reclaim_list_sync_calendar_candidates",
        "reclaim_register_sync_interest",
        "reclaim_get_sync_policy",
        "reclaim_validate_sync_policy",
        "reclaim_sync_calendar_permissions",
      ]),
    );

    const listEvents = findRegisteredTool(harness.tools, "reclaim_list_events");
    const deletePersonalCalendar = findRegisteredTool(
      harness.tools,
      "reclaim_delete_personal_calendar",
    );
    const deleteSyncCalendar = findRegisteredTool(
      harness.tools,
      "reclaim_delete_sync_calendar",
    );

    expectToolAnnotations(listEvents, {
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
    });
    expectToolAnnotations(deletePersonalCalendar, {
      idempotentHint: true,
      destructiveHint: true,
    });
    expectToolAnnotations(deleteSyncCalendar, {
      idempotentHint: true,
      destructiveHint: true,
    });
  });

  it("registers smart meetings domain tools via smart meetings registrar", () => {
    const { harness, server } = createMcpServerHarness();

    smartMeetingDomainRegistrar.register(server);

    expect(new Set(harness.tools.map((tool) => tool.name))).toEqual(
      new Set([
        "reclaim_list_smart_meetings",
        "reclaim_create_smart_meeting",
        "reclaim_get_smart_meeting",
        "reclaim_update_smart_meeting",
        "reclaim_delete_smart_meeting",
        "reclaim_detect_smart_meetings",
        "reclaim_get_smart_meeting_attendee_declined",
        "reclaim_get_smart_meeting_availability",
        "reclaim_invite_smart_meeting_organizer",
        "reclaim_convert_smart_meetings_to_single_instances",
        "reclaim_get_smart_meeting_availability_diagnostics",
      ]),
    );

    const listMeetings = findRegisteredTool(
      harness.tools,
      "reclaim_list_smart_meetings",
    );
    const attendeeDeclined = findRegisteredTool(
      harness.tools,
      "reclaim_get_smart_meeting_attendee_declined",
    );
    const convertMeetings = findRegisteredTool(
      harness.tools,
      "reclaim_convert_smart_meetings_to_single_instances",
    );
    const deleteMeeting = findRegisteredTool(
      harness.tools,
      "reclaim_delete_smart_meeting",
    );
    expectToolAnnotations(listMeetings, {
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
    });
    expectToolAnnotations(deleteMeeting, {
      idempotentHint: true,
      destructiveHint: true,
    });

    expect(
      Object.keys(
        listMeetings.definition.inputSchema as Record<string, unknown>,
      ),
    ).not.toContain("query");
    expect(
      Object.keys(
        attendeeDeclined.definition.inputSchema as Record<string, unknown>,
      ),
    ).not.toContain("query");
    expect(
      Object.keys(
        convertMeetings.definition.inputSchema as Record<string, unknown>,
      ),
    ).not.toContain("query");
  });

  it("registers one-on-one domain tools via one-on-one registrar", () => {
    const { harness, server } = createMcpServerHarness();

    oneOnOneDomainRegistrar.register(server);

    expect(new Set(harness.tools.map((tool) => tool.name))).toEqual(
      new Set([
        "reclaim_list_one_on_ones",
        "reclaim_create_one_on_one",
        "reclaim_get_one_on_one",
        "reclaim_update_one_on_one",
        "reclaim_delete_one_on_one",
        "reclaim_convert_one_on_one_auto",
        "reclaim_list_detected_one_on_ones",
        "reclaim_get_one_on_one_invitee_eligibility",
        "reclaim_list_one_on_one_invites",
        "reclaim_get_one_on_one_invite",
        "reclaim_list_one_on_one_suggestions",
      ]),
    );

    const listOneOnOnes = findRegisteredTool(
      harness.tools,
      "reclaim_list_one_on_ones",
    );
    const deleteOneOnOne = findRegisteredTool(
      harness.tools,
      "reclaim_delete_one_on_one",
    );
    expectToolAnnotations(listOneOnOnes, {
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
    });
    expectToolAnnotations(deleteOneOnOne, {
      idempotentHint: true,
      destructiveHint: true,
    });
  });

  it("registers scheduling links domain tools via scheduling links registrar", () => {
    const { harness, server } = createMcpServerHarness();

    schedulingLinkDomainRegistrar.register(server);

    expect(new Set(harness.tools.map((tool) => tool.name))).toEqual(
      new Set([
        "reclaim_list_scheduling_links",
        "reclaim_create_scheduling_link",
        "reclaim_get_scheduling_link",
        "reclaim_update_scheduling_link",
        "reclaim_delete_scheduling_link",
        "reclaim_create_scheduling_link_derivative",
        "reclaim_get_scheduling_link_effective_time_policy",
        "reclaim_get_scheduling_link_for_user_link_slug",
        "reclaim_get_scheduling_link_for_user_slug",
        "reclaim_list_recent_scheduling_links",
        "reclaim_check_scheduling_link_slug_exists",
        "reclaim_list_scheduling_link_user_slugs",
        "reclaim_create_scheduling_link_user_slug",
        "reclaim_get_scheduling_link_user_slug",
        "reclaim_check_scheduling_link_user_slug_exists",
        "reclaim_list_scheduling_link_groups",
        "reclaim_create_scheduling_link_group",
        "reclaim_get_scheduling_link_group_by_slug",
        "reclaim_update_scheduling_link_group",
        "reclaim_delete_scheduling_link_group",
        "reclaim_get_scheduling_link_meeting",
        "reclaim_update_scheduling_link_meeting",
        "reclaim_delete_scheduling_link_meeting",
        "reclaim_refresh_scheduling_link_meeting",
        "reclaim_get_participant_resolution",
        "reclaim_get_participant_resolution_scheduling_link",
      ]),
    );

    const listLinks = findRegisteredTool(
      harness.tools,
      "reclaim_list_scheduling_links",
    );
    const deleteLink = findRegisteredTool(
      harness.tools,
      "reclaim_delete_scheduling_link",
    );
    const deleteGroup = findRegisteredTool(
      harness.tools,
      "reclaim_delete_scheduling_link_group",
    );
    const participantResolution = findRegisteredTool(
      harness.tools,
      "reclaim_get_participant_resolution",
    );
    expectToolAnnotations(listLinks, {
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
    });
    expectToolAnnotations(participantResolution, {
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
    });
    expectToolAnnotations(deleteLink, {
      idempotentHint: true,
      destructiveHint: true,
    });
    expectToolAnnotations(deleteGroup, {
      idempotentHint: true,
      destructiveHint: true,
    });
  });

  it("registers time policies domain tools via time policies registrar", () => {
    const { harness, server } = createMcpServerHarness();

    timePoliciesDomainRegistrar.register(server);

    expect(new Set(harness.tools.map((tool) => tool.name))).toEqual(
      new Set([
        "reclaim_list_time_schemes",
        "reclaim_create_time_scheme",
        "reclaim_get_time_scheme",
        "reclaim_update_time_scheme",
        "reclaim_delete_time_scheme",
        "reclaim_list_time_scheme_feature_filters",
        "reclaim_get_time_scheme_feature_filter",
        "reclaim_list_time_scheme_rules",
        "reclaim_create_time_scheme_rule",
        "reclaim_update_time_scheme_rule",
        "reclaim_delete_time_scheme_rule",
        "reclaim_reindex_time_scheme_rule",
        "reclaim_list_account_time_schemes",
        "reclaim_create_account_time_scheme",
        "reclaim_update_account_time_scheme",
        "reclaim_get_effective_time_policy",
        "reclaim_list_time_window_overrides",
        "reclaim_create_time_window_override_entry",
        "reclaim_delete_time_window_override_entry",
        "reclaim_list_schedule_policies",
        "reclaim_create_schedule_policy",
        "reclaim_get_schedule_policy",
        "reclaim_delete_schedule_policy",
        "reclaim_list_schedule_policy_available_types",
        "reclaim_create_default_schedule_policies",
        "reclaim_list_schedule_policy_event_matcher_tags",
        "reclaim_match_schedule_policy_events",
        "reclaim_get_recommended_schedule_policy",
        "reclaim_list_schedule_policy_smart_meeting_candidates",
        "reclaim_list_schedule_policy_templates",
        "reclaim_instantiate_schedule_policy_meeting_quality_template",
        "reclaim_get_instantiated_schedule_policy_template",
      ]),
    );

    const listTimeSchemes = findRegisteredTool(
      harness.tools,
      "reclaim_list_time_schemes",
    );
    const deleteTimeScheme = findRegisteredTool(
      harness.tools,
      "reclaim_delete_time_scheme",
    );
    const createDefaultPolicies = findRegisteredTool(
      harness.tools,
      "reclaim_create_default_schedule_policies",
    );

    expectToolAnnotations(listTimeSchemes, {
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
    });
    expectToolAnnotations(deleteTimeScheme, {
      idempotentHint: true,
      destructiveHint: true,
    });
    expectToolAnnotations(createDefaultPolicies, {
      idempotentHint: false,
      destructiveHint: false,
    });
  });
});
