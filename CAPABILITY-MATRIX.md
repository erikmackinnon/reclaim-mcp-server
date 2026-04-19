# Capability Matrix

Generated from `src/endpoint-registry.ts`, `src/tools/*.ts`, `src/resources/tasks.ts`, and `src/resources/curated.ts`.

## Surface Summary

| Surface | Count |
| --- | ---: |
| Typed MCP tools | 273 |
| Raw fallback MCP tools | 1 |
| MCP resources | 6 |
| Typed endpoint signatures | 273 |
| Raw-available endpoint signatures | 108 |
| Excluded endpoint signatures | 130 |
| Total endpoint signatures in registry | 511 |

## Domain Coverage

| Domain | Typed | Raw | Excluded | Total |
| --- | ---: | ---: | ---: | ---: |
| accounts_credentials_delegated_access | 14 | 0 | 0 | 14 |
| analytics | 10 | 1 | 0 | 11 |
| api_keys | 0 | 0 | 6 | 6 |
| assist_interactions | 16 | 1 | 1 | 18 |
| availability | 2 | 2 | 0 | 4 |
| avatars_notifications_misc | 0 | 21 | 10 | 31 |
| changelog | 6 | 0 | 0 | 6 |
| events_calendars | 18 | 0 | 3 | 21 |
| focus_settings_focus_planner | 10 | 4 | 0 | 14 |
| habits | 27 | 0 | 0 | 27 |
| integrations | 30 | 18 | 16 | 64 |
| mcp | 0 | 1 | 23 | 24 |
| oauth2 | 0 | 0 | 11 | 11 |
| planner | 12 | 14 | 1 | 27 |
| schedule_actions | 0 | 9 | 0 | 9 |
| scheduling_links | 26 | 0 | 0 | 26 |
| scim | 0 | 0 | 11 | 11 |
| smart_1_1s | 11 | 0 | 0 | 11 |
| smart_meetings | 11 | 0 | 0 | 11 |
| smart_series | 0 | 3 | 0 | 3 |
| tasks | 14 | 2 | 0 | 16 |
| team_organization_billing | 12 | 4 | 47 | 63 |
| time_schemes_time_windows_schedule_policies | 32 | 0 | 0 | 32 |
| users | 22 | 28 | 1 | 51 |

## Typed Resources

| Resource URI | Internal Registration Name | Source |
| --- | --- | --- |
| `reclaim://focus/settings/current` | `reclaim_focus_settings_current` | `src/resources/curated.ts` |
| `reclaim://habits/daily` | `reclaim_daily_habits` | `src/resources/curated.ts` |
| `reclaim://team/current` | `reclaim_team_current` | `src/resources/curated.ts` |
| `reclaim://users/current` | `reclaim_current_user_profile` | `src/resources/curated.ts` |
| `tasks://active` | `reclaim_active_tasks` | `src/resources/tasks.ts` |
| `tasks://defaults` | `reclaim_task_defaults` | `src/resources/tasks.ts` |

## Typed Tools

All typed tools are prefixed with `reclaim_`.

- `reclaim_add_time`
- `reclaim_batch_archive_tasks`
- `reclaim_batch_complete_tasks`
- `reclaim_batch_delete_tasks`
- `reclaim_batch_update_tasks`
- `reclaim_bulk_reschedule_task_events`
- `reclaim_check_scheduling_link_slug_exists`
- `reclaim_check_scheduling_link_user_slug_exists`
- `reclaim_clear_exceptions`
- `reclaim_close_interaction`
- `reclaim_convert_event_to_v2`
- `reclaim_convert_habits_to_single_instances`
- `reclaim_convert_one_on_one_auto`
- `reclaim_convert_smart_meetings_to_single_instances`
- `reclaim_create_account_time_scheme`
- `reclaim_create_assist_habit_template`
- `reclaim_create_daily_habit`
- `reclaim_create_default_schedule_policies`
- `reclaim_create_delegated_access`
- `reclaim_create_habit`
- `reclaim_create_habit_from_template`
- `reclaim_create_interaction`
- `reclaim_create_one_on_one`
- `reclaim_create_schedule_policy`
- `reclaim_create_scheduling_link`
- `reclaim_create_scheduling_link_derivative`
- `reclaim_create_scheduling_link_group`
- `reclaim_create_scheduling_link_user_slug`
- `reclaim_create_smart_habit_template`
- `reclaim_create_smart_meeting`
- `reclaim_create_task`
- `reclaim_create_team_ooo_calendar`
- `reclaim_create_time_scheme`
- `reclaim_create_time_scheme_rule`
- `reclaim_create_time_window_override_entry`
- `reclaim_create_zoom_integration`
- `reclaim_delete_account`
- `reclaim_delete_asana_integrations`
- `reclaim_delete_clickup_integrations`
- `reclaim_delete_credential`
- `reclaim_delete_daily_habit`
- `reclaim_delete_delegated_access`
- `reclaim_delete_habit`
- `reclaim_delete_jira_integration`
- `reclaim_delete_jira_v2_site`
- `reclaim_delete_linear_integration`
- `reclaim_delete_one_on_one`
- `reclaim_delete_personal_calendar`
- `reclaim_delete_schedule_policy`
- `reclaim_delete_scheduling_link`
- `reclaim_delete_scheduling_link_group`
- `reclaim_delete_scheduling_link_meeting`
- `reclaim_delete_smart_habit_template`
- `reclaim_delete_smart_meeting`
- `reclaim_delete_sync_calendar`
- `reclaim_delete_task`
- `reclaim_delete_team_ooo_calendar`
- `reclaim_delete_time_scheme`
- `reclaim_delete_time_scheme_rule`
- `reclaim_delete_time_window_override_entry`
- `reclaim_delete_todoist_integration`
- `reclaim_delete_zoom_integration`
- `reclaim_delete_zoom_integration_user`
- `reclaim_detect_habits`
- `reclaim_detect_smart_meetings`
- `reclaim_generate_proactive_gtd`
- `reclaim_get_assist_habit_template`
- `reclaim_get_clickup_integration_details`
- `reclaim_get_credential`
- `reclaim_get_current_daily_digest`
- `reclaim_get_current_proactive_gtd`
- `reclaim_get_current_user`
- `reclaim_get_current_user_access`
- `reclaim_get_current_user_product_usage`
- `reclaim_get_current_user_quest`
- `reclaim_get_current_user_referrals`
- `reclaim_get_current_user_restorable_features`
- `reclaim_get_current_user_time_policies`
- `reclaim_get_daily_habit`
- `reclaim_get_delegated_access_allowed`
- `reclaim_get_effective_time_policy`
- `reclaim_get_event`
- `reclaim_get_focus_insights_v3`
- `reclaim_get_focus_settings_default_focus_time`
- `reclaim_get_focus_settings_team`
- `reclaim_get_focus_settings_user`
- `reclaim_get_habit`
- `reclaim_get_habit_template`
- `reclaim_get_ideal_time_availability`
- `reclaim_get_instantiated_schedule_policy_template`
- `reclaim_get_integrations_enabled`
- `reclaim_get_interaction`
- `reclaim_get_moment`
- `reclaim_get_next_moment`
- `reclaim_get_one_on_one`
- `reclaim_get_one_on_one_invite`
- `reclaim_get_one_on_one_invitee_eligibility`
- `reclaim_get_participant_resolution`
- `reclaim_get_participant_resolution_scheduling_link`
- `reclaim_get_pending_interpreter_plan`
- `reclaim_get_personal_calendar`
- `reclaim_get_primary_calendar`
- `reclaim_get_primary_credential`
- `reclaim_get_recommended_schedule_policy`
- `reclaim_get_schedule_policy`
- `reclaim_get_scheduling_link`
- `reclaim_get_scheduling_link_effective_time_policy`
- `reclaim_get_scheduling_link_for_user_link_slug`
- `reclaim_get_scheduling_link_for_user_slug`
- `reclaim_get_scheduling_link_group_by_slug`
- `reclaim_get_scheduling_link_meeting`
- `reclaim_get_scheduling_link_user_slug`
- `reclaim_get_shared_habit`
- `reclaim_get_shared_habit_v2`
- `reclaim_get_slack_integrations`
- `reclaim_get_smart_habit_template`
- `reclaim_get_smart_meeting`
- `reclaim_get_smart_meeting_attendee_declined`
- `reclaim_get_smart_meeting_availability`
- `reclaim_get_smart_meeting_availability_diagnostics`
- `reclaim_get_suggested_times`
- `reclaim_get_sync_calendar`
- `reclaim_get_sync_policy`
- `reclaim_get_task`
- `reclaim_get_task_defaults`
- `reclaim_get_task_interaction`
- `reclaim_get_task_min_index`
- `reclaim_get_team_analytics`
- `reclaim_get_team_analytics_v3`
- `reclaim_get_team_analytics_v4`
- `reclaim_get_team_analytics_v4_export`
- `reclaim_get_team_analytics_v4_filters`
- `reclaim_get_team_analytics_v4_permissions`
- `reclaim_get_team_current`
- `reclaim_get_team_current_membership`
- `reclaim_get_team_ooo_calendar`
- `reclaim_get_time_scheme`
- `reclaim_get_time_scheme_feature_filter`
- `reclaim_get_todoist_integration_details`
- `reclaim_get_user_analytics`
- `reclaim_get_user_analytics_v3`
- `reclaim_get_weekly_report_social`
- `reclaim_get_zoom_integrations`
- `reclaim_instantiate_schedule_policy_meeting_quality_template`
- `reclaim_invite_current_user_contact`
- `reclaim_invite_current_user_contact_v2`
- `reclaim_invite_smart_meeting_organizer`
- `reclaim_leave_team_current`
- `reclaim_list_account_calendars`
- `reclaim_list_account_time_schemes`
- `reclaim_list_accounts`
- `reclaim_list_asana_integrations`
- `reclaim_list_assist_habit_templates`
- `reclaim_list_changelog`
- `reclaim_list_changelog_events`
- `reclaim_list_changelog_scheduling_links`
- `reclaim_list_changelog_smart_habits`
- `reclaim_list_changelog_smart_meetings`
- `reclaim_list_changelog_tasks`
- `reclaim_list_clickup_integrations`
- `reclaim_list_credentials`
- `reclaim_list_current_user_access`
- `reclaim_list_current_user_contacts`
- `reclaim_list_current_user_contacts_v2`
- `reclaim_list_current_user_contacts_v3`
- `reclaim_list_daily_habits`
- `reclaim_list_delegated_access`
- `reclaim_list_detected_one_on_ones`
- `reclaim_list_events`
- `reclaim_list_events_v2`
- `reclaim_list_focus_settings_team`
- `reclaim_list_habit_templates`
- `reclaim_list_habits`
- `reclaim_list_interaction_records`
- `reclaim_list_interactions`
- `reclaim_list_jira_integrations`
- `reclaim_list_jira_v2_sites`
- `reclaim_list_linear_integrations`
- `reclaim_list_one_on_one_invites`
- `reclaim_list_one_on_one_suggestions`
- `reclaim_list_one_on_ones`
- `reclaim_list_personal_calendar_candidates`
- `reclaim_list_personal_calendars`
- `reclaim_list_personal_credentials`
- `reclaim_list_personal_events`
- `reclaim_list_recent_scheduling_links`
- `reclaim_list_recommended_tasks`
- `reclaim_list_schedule_policies`
- `reclaim_list_schedule_policy_available_types`
- `reclaim_list_schedule_policy_event_matcher_tags`
- `reclaim_list_schedule_policy_smart_meeting_candidates`
- `reclaim_list_schedule_policy_templates`
- `reclaim_list_scheduling_link_groups`
- `reclaim_list_scheduling_link_user_slugs`
- `reclaim_list_scheduling_links`
- `reclaim_list_smart_habit_templates`
- `reclaim_list_smart_meetings`
- `reclaim_list_sync_calendar_candidates`
- `reclaim_list_tasks`
- `reclaim_list_team_editions`
- `reclaim_list_team_joinable`
- `reclaim_list_team_ooo_calendars`
- `reclaim_list_team_ooo_calendars_available`
- `reclaim_list_time_scheme_feature_filters`
- `reclaim_list_time_scheme_rules`
- `reclaim_list_time_schemes`
- `reclaim_list_time_window_overrides`
- `reclaim_list_todoist_integrations`
- `reclaim_lock_focus_planner_event`
- `reclaim_log_work`
- `reclaim_mark_complete`
- `reclaim_mark_incomplete`
- `reclaim_match_event`
- `reclaim_match_schedule_policy_events`
- `reclaim_move_focus_planner_event`
- `reclaim_patch_focus_settings_user`
- `reclaim_plan_work`
- `reclaim_prioritize`
- `reclaim_refresh_scheduling_link_meeting`
- `reclaim_register_sync_interest`
- `reclaim_reindex_task`
- `reclaim_reindex_tasks_by_due`
- `reclaim_reindex_time_scheme_rule`
- `reclaim_replace_daily_habit`
- `reclaim_reschedule_focus_planner_event`
- `reclaim_reschedule_task_event`
- `reclaim_reset_current_user`
- `reclaim_respond_team_current_join`
- `reclaim_restart_task`
- `reclaim_restore_current_user_features`
- `reclaim_send_interaction_chat`
- `reclaim_send_interpreter_message`
- `reclaim_set_current_interaction`
- `reclaim_share_habit`
- `reclaim_start_timer`
- `reclaim_stop_timer`
- `reclaim_sync_calendar_permissions`
- `reclaim_sync_people`
- `reclaim_sync_todoist`
- `reclaim_toggle_delegated_access`
- `reclaim_unlock_focus_planner_event`
- `reclaim_update_account_time_scheme`
- `reclaim_update_asana_integrations`
- `reclaim_update_clickup_integration`
- `reclaim_update_clickup_integration_settings`
- `reclaim_update_current_user`
- `reclaim_update_current_user_format24hour_settings`
- `reclaim_update_current_user_quest`
- `reclaim_update_current_user_rsvp_settings`
- `reclaim_update_current_user_time_policies`
- `reclaim_update_current_user_timezone_settings`
- `reclaim_update_current_user_week_start_settings`
- `reclaim_update_daily_habit`
- `reclaim_update_focus_settings_user`
- `reclaim_update_habit`
- `reclaim_update_interaction`
- `reclaim_update_jira_integration`
- `reclaim_update_linear_integration`
- `reclaim_update_one_on_one`
- `reclaim_update_scheduling_link`
- `reclaim_update_scheduling_link_group`
- `reclaim_update_scheduling_link_meeting`
- `reclaim_update_slack_integrations`
- `reclaim_update_smart_habit_template`
- `reclaim_update_smart_meeting`
- `reclaim_update_task`
- `reclaim_update_team_ooo_calendar`
- `reclaim_update_time_scheme`
- `reclaim_update_time_scheme_rule`
- `reclaim_update_todoist_integration`
- `reclaim_update_todoist_integration_settings`
- `reclaim_validate_account`
- `reclaim_validate_sync_policy`

## Typed Endpoint Signatures

| Method | Path Template | Domain | Read Only | Destructive | Bulk | High Risk |
| --- | --- | --- | --- | --- | --- | --- |
| `DELETE` | `/accounts/{id}` | accounts_credentials_delegated_access | no | yes | no | no |
| `DELETE` | `/credentials/{id}` | accounts_credentials_delegated_access | no | yes | no | no |
| `DELETE` | `/delegated-access/{id}` | accounts_credentials_delegated_access | no | yes | no | no |
| `GET` | `/accounts` | accounts_credentials_delegated_access | yes | no | no | no |
| `GET` | `/accounts/calendars` | accounts_credentials_delegated_access | yes | no | no | no |
| `GET` | `/credentials` | accounts_credentials_delegated_access | yes | no | no | no |
| `GET` | `/credentials/{id}` | accounts_credentials_delegated_access | yes | no | no | no |
| `GET` | `/credentials/personal` | accounts_credentials_delegated_access | yes | no | no | no |
| `GET` | `/credentials/primary` | accounts_credentials_delegated_access | yes | no | no | no |
| `GET` | `/delegated-access` | accounts_credentials_delegated_access | yes | no | no | no |
| `GET` | `/delegated-access/allowed` | accounts_credentials_delegated_access | yes | no | no | no |
| `POST` | `/accounts/validate` | accounts_credentials_delegated_access | no | no | no | no |
| `POST` | `/delegated-access` | accounts_credentials_delegated_access | no | no | no | no |
| `PUT` | `/delegated-access/toggle/{id}` | accounts_credentials_delegated_access | no | no | no | no |
| `GET` | `/analytics/focus/insights/V3` | analytics | yes | no | no | no |
| `GET` | `/analytics/team` | analytics | yes | no | no | no |
| `GET` | `/analytics/team/V3` | analytics | yes | no | no | no |
| `GET` | `/analytics/team/V4/export` | analytics | yes | no | no | no |
| `GET` | `/analytics/team/V4/filters` | analytics | yes | no | no | no |
| `GET` | `/analytics/team/V4/permissions` | analytics | yes | no | no | no |
| `GET` | `/analytics/user` | analytics | yes | no | no | no |
| `GET` | `/analytics/user/V3` | analytics | yes | no | no | no |
| `GET` | `/weekly-report/social` | analytics | yes | no | no | no |
| `POST` | `/analytics/team/V4` | analytics | yes | no | no | no |
| `GET` | `/interactions` | assist_interactions | yes | no | no | no |
| `GET` | `/interactions/{id}` | assist_interactions | yes | no | no | no |
| `GET` | `/interactions/daily-digest/current` | assist_interactions | yes | no | no | no |
| `GET` | `/interactions/proactive-gtd/current` | assist_interactions | yes | no | no | no |
| `GET` | `/interactions/records` | assist_interactions | yes | no | no | no |
| `GET` | `/interactions/task/{id}` | assist_interactions | yes | no | no | no |
| `GET` | `/interpreter/plans/pending/{id}` | assist_interactions | yes | no | no | no |
| `GET` | `/moment` | assist_interactions | yes | no | no | no |
| `GET` | `/moment/next` | assist_interactions | yes | no | no | no |
| `POST` | `/interactions` | assist_interactions | no | no | no | no |
| `POST` | `/interactions/chat` | assist_interactions | no | no | no | no |
| `POST` | `/interactions/close` | assist_interactions | no | no | no | no |
| `POST` | `/interactions/current` | assist_interactions | no | no | no | no |
| `POST` | `/interactions/proactive-gtd/generate` | assist_interactions | no | no | no | no |
| `POST` | `/interactions/update` | assist_interactions | no | no | no | no |
| `POST` | `/interpreter/message` | assist_interactions | no | no | no | no |
| `POST` | `/availability/ideal-time-availability` | availability | yes | no | no | no |
| `POST` | `/availability/suggested-times` | availability | yes | no | no | no |
| `GET` | `/changelog` | changelog | yes | no | no | no |
| `GET` | `/changelog/events` | changelog | yes | no | no | no |
| `GET` | `/changelog/scheduling-links` | changelog | yes | no | no | no |
| `GET` | `/changelog/smart-habits` | changelog | yes | no | no | no |
| `GET` | `/changelog/smart-meetings` | changelog | yes | no | no | no |
| `GET` | `/changelog/tasks` | changelog | yes | no | no | no |
| `DELETE` | `/calendars/personal/{id}` | events_calendars | no | yes | no | no |
| `DELETE` | `/calendars/sync/{id}` | events_calendars | no | yes | no | no |
| `GET` | `/calendars/personal` | events_calendars | yes | no | no | no |
| `GET` | `/calendars/personal/{id}` | events_calendars | yes | no | no | no |
| `GET` | `/calendars/personal/candidates` | events_calendars | yes | no | no | no |
| `GET` | `/calendars/primary` | events_calendars | yes | no | no | no |
| `GET` | `/calendars/sync-policy` | events_calendars | yes | no | no | no |
| `GET` | `/calendars/sync/{id}` | events_calendars | yes | no | no | no |
| `GET` | `/calendars/sync/candidates` | events_calendars | yes | no | no | no |
| `GET` | `/events` | events_calendars | yes | no | no | no |
| `GET` | `/events/{id}` | events_calendars | yes | no | no | no |
| `GET` | `/events/personal` | events_calendars | yes | no | no | no |
| `GET` | `/events/v2` | events_calendars | yes | no | no | no |
| `POST` | `/calendars/permissions/sync` | events_calendars | no | no | no | no |
| `POST` | `/calendars/sync-policy/validate` | events_calendars | no | no | no | no |
| `POST` | `/calendars/sync/interest` | events_calendars | no | no | no | no |
| `POST` | `/events/utils/to-v2` | events_calendars | no | no | no | no |
| `POST` | `/matcher/event` | events_calendars | no | no | no | no |
| `GET` | `/focus-settings/team` | focus_settings_focus_planner | yes | no | no | no |
| `GET` | `/focus-settings/team/{id}` | focus_settings_focus_planner | yes | no | no | no |
| `GET` | `/focus-settings/user` | focus_settings_focus_planner | yes | no | no | no |
| `GET` | `/focus-settings/user/focus-time/default` | focus_settings_focus_planner | yes | no | no | no |
| `PATCH` | `/focus-settings/user/{id}` | focus_settings_focus_planner | no | no | no | no |
| `POST` | `/focus-settings/user` | focus_settings_focus_planner | no | no | no | no |
| `POST` | `/focus/planner/{id}/{eventId}/lock` | focus_settings_focus_planner | no | no | no | no |
| `POST` | `/focus/planner/{id}/{eventId}/move` | focus_settings_focus_planner | no | no | no | no |
| `POST` | `/focus/planner/{id}/{eventId}/reschedule` | focus_settings_focus_planner | no | no | no | no |
| `POST` | `/focus/planner/{id}/{eventId}/unlock` | focus_settings_focus_planner | no | no | no | no |
| `DELETE` | `/assist/habits/daily/{id}` | habits | no | yes | no | no |
| `DELETE` | `/smart-habits/{id}` | habits | no | yes | no | no |
| `DELETE` | `/templates/smart-habit/{id}` | habits | no | yes | no | no |
| `GET` | `/assist/habits/daily` | habits | yes | no | no | no |
| `GET` | `/assist/habits/daily/{id}` | habits | yes | no | no | no |
| `GET` | `/assist/habits/template` | habits | yes | no | no | no |
| `GET` | `/assist/habits/templates` | habits | yes | no | no | no |
| `GET` | `/smart-habits` | habits | yes | no | no | no |
| `GET` | `/smart-habits/{id}` | habits | yes | no | no | no |
| `GET` | `/smart-habits/detect` | habits | yes | no | no | no |
| `GET` | `/smart-habits/shared/{id}` | habits | yes | no | no | no |
| `GET` | `/smart-habits/shared/v2/{id}` | habits | yes | no | no | no |
| `GET` | `/smart-habits/template` | habits | yes | no | no | no |
| `GET` | `/smart-habits/templates` | habits | yes | no | no | no |
| `GET` | `/templates/smart-habit` | habits | yes | no | no | no |
| `GET` | `/templates/smart-habit/{id}` | habits | yes | no | no | no |
| `PATCH` | `/assist/habits/daily/{id}` | habits | no | no | no | no |
| `PATCH` | `/smart-habits/{id}` | habits | no | no | no | no |
| `PATCH` | `/templates/smart-habit/{id}` | habits | no | no | no | no |
| `POST` | `/assist/habits/daily` | habits | no | no | no | no |
| `POST` | `/assist/habits/template/create` | habits | no | no | no | no |
| `POST` | `/smart-habits` | habits | no | no | no | no |
| `POST` | `/smart-habits/shared` | habits | no | no | no | no |
| `POST` | `/smart-habits/templates/create` | habits | no | no | no | no |
| `POST` | `/smart-habits/to-single-instances` | habits | no | no | no | no |
| `POST` | `/templates/smart-habit` | habits | no | no | no | no |
| `PUT` | `/assist/habits/daily/{id}` | habits | no | no | no | no |
| `DELETE` | `/asana/integrations` | integrations | no | yes | no | no |
| `DELETE` | `/clickup/integrations` | integrations | no | yes | no | no |
| `DELETE` | `/integrations/zoom` | integrations | no | yes | no | no |
| `DELETE` | `/integrations/zoom/user` | integrations | no | yes | no | no |
| `DELETE` | `/jira-v2/sites/{id}` | integrations | no | yes | no | no |
| `DELETE` | `/jira/integrations/{id}` | integrations | no | yes | no | no |
| `DELETE` | `/linear/integrations/{id}` | integrations | no | yes | no | no |
| `DELETE` | `/todoist/integrations/{id}` | integrations | no | yes | no | no |
| `GET` | `/asana/integrations` | integrations | yes | no | no | no |
| `GET` | `/clickup/integrations` | integrations | yes | no | no | no |
| `GET` | `/clickup/integrations/details` | integrations | yes | no | no | no |
| `GET` | `/integrations/enabled` | integrations | yes | no | no | no |
| `GET` | `/integrations/zoom` | integrations | yes | no | no | no |
| `GET` | `/jira-v2/sites` | integrations | yes | no | no | no |
| `GET` | `/jira/integrations` | integrations | yes | no | no | no |
| `GET` | `/linear/integrations` | integrations | yes | no | no | no |
| `GET` | `/slack/integrations` | integrations | yes | no | no | no |
| `GET` | `/todoist/integrations` | integrations | yes | no | no | no |
| `GET` | `/todoist/integrations/details` | integrations | yes | no | no | no |
| `PATCH` | `/asana/integrations` | integrations | no | no | no | no |
| `PATCH` | `/clickup/integrations/{id}` | integrations | no | no | no | no |
| `PATCH` | `/clickup/integrations/settings/{id}` | integrations | no | no | no | no |
| `PATCH` | `/jira/integrations/{id}` | integrations | no | no | no | no |
| `PATCH` | `/linear/integrations/{id}` | integrations | no | no | no | no |
| `PATCH` | `/todoist/integrations/{id}` | integrations | no | no | no | no |
| `PATCH` | `/todoist/integrations/settings/{id}` | integrations | no | no | no | no |
| `POST` | `/integrations/zoom` | integrations | no | no | no | no |
| `POST` | `/people/sync` | integrations | no | no | no | no |
| `POST` | `/todoist/sync` | integrations | no | no | no | no |
| `PUT` | `/slack/integrations` | integrations | no | no | no | no |
| `POST` | `/planner/add-time/task/{id}` | planner | no | no | no | no |
| `POST` | `/planner/clear-exceptions/task/{id}` | planner | no | no | no | no |
| `POST` | `/planner/done/task/{id}` | planner | no | no | no | no |
| `POST` | `/planner/log-work/task/{id}` | planner | no | no | no | no |
| `POST` | `/planner/plan-work/task/{id}` | planner | no | no | no | no |
| `POST` | `/planner/prioritize/task/{id}` | planner | no | no | no | no |
| `POST` | `/planner/reschedule/task/event/{id}` | planner | no | no | no | no |
| `POST` | `/planner/restart/task/{id}` | planner | no | no | no | no |
| `POST` | `/planner/start/task/{id}` | planner | no | no | no | no |
| `POST` | `/planner/stop/task/{id}` | planner | no | no | no | no |
| `POST` | `/planner/task/reschedule/bulk` | planner | no | no | no | no |
| `POST` | `/planner/unarchive/task/{id}` | planner | no | no | no | no |
| `DELETE` | `/scheduling-link/{id}` | scheduling_links | no | yes | no | no |
| `DELETE` | `/scheduling-link/group/{id}` | scheduling_links | no | yes | no | no |
| `DELETE` | `/scheduling-link/meeting/{id}` | scheduling_links | no | yes | no | no |
| `GET` | `/participant-resolution` | scheduling_links | yes | no | no | no |
| `GET` | `/participant-resolution/scheduling-link` | scheduling_links | yes | no | no | no |
| `GET` | `/scheduling-link` | scheduling_links | yes | no | no | no |
| `GET` | `/scheduling-link/{id}` | scheduling_links | yes | no | no | no |
| `GET` | `/scheduling-link/for-user-link-slug` | scheduling_links | yes | no | no | no |
| `GET` | `/scheduling-link/for-user-slug/{id}` | scheduling_links | yes | no | no | no |
| `GET` | `/scheduling-link/group` | scheduling_links | yes | no | no | no |
| `GET` | `/scheduling-link/group-by-slug/{id}` | scheduling_links | yes | no | no | no |
| `GET` | `/scheduling-link/meeting/{id}` | scheduling_links | yes | no | no | no |
| `GET` | `/scheduling-link/recent` | scheduling_links | yes | no | no | no |
| `GET` | `/scheduling-link/refresh-meeting/{id}` | scheduling_links | yes | no | no | no |
| `GET` | `/scheduling-link/slug-exists` | scheduling_links | yes | no | no | no |
| `GET` | `/scheduling-link/user-slug` | scheduling_links | yes | no | no | no |
| `GET` | `/scheduling-link/user-slug/{id}` | scheduling_links | yes | no | no | no |
| `GET` | `/scheduling-link/user-slug/exists` | scheduling_links | yes | no | no | no |
| `PATCH` | `/scheduling-link/{id}` | scheduling_links | no | no | no | no |
| `PATCH` | `/scheduling-link/group/{id}` | scheduling_links | no | no | no | no |
| `PATCH` | `/scheduling-link/meeting/{id}` | scheduling_links | no | no | no | no |
| `POST` | `/scheduling-link` | scheduling_links | no | no | no | no |
| `POST` | `/scheduling-link/derivative` | scheduling_links | no | no | no | no |
| `POST` | `/scheduling-link/effective-time-policy` | scheduling_links | no | no | no | no |
| `POST` | `/scheduling-link/group` | scheduling_links | no | no | no | no |
| `POST` | `/scheduling-link/user-slug` | scheduling_links | no | no | no | no |
| `DELETE` | `/oneOnOne/{id}` | smart_1_1s | no | yes | no | no |
| `GET` | `/oneOnOne` | smart_1_1s | yes | no | no | no |
| `GET` | `/oneOnOne/{id}` | smart_1_1s | yes | no | no | no |
| `GET` | `/oneOnOne/detected` | smart_1_1s | yes | no | no | no |
| `GET` | `/oneOnOne/invitee-eligibility` | smart_1_1s | yes | no | no | no |
| `GET` | `/oneOnOne/invites` | smart_1_1s | yes | no | no | no |
| `GET` | `/oneOnOne/invites/{id}` | smart_1_1s | yes | no | no | no |
| `GET` | `/oneOnOne/suggestions` | smart_1_1s | yes | no | no | no |
| `PATCH` | `/oneOnOne/{id}` | smart_1_1s | no | no | no | no |
| `POST` | `/oneOnOne` | smart_1_1s | no | no | no | no |
| `POST` | `/oneOnOne/convert-auto/{id}` | smart_1_1s | no | no | no | no |
| `DELETE` | `/smart-meetings/{id}` | smart_meetings | no | yes | no | no |
| `GET` | `/assist/smart-meetings/availability-diagnostics` | smart_meetings | yes | no | no | no |
| `GET` | `/smart-meetings` | smart_meetings | yes | no | no | no |
| `GET` | `/smart-meetings/{id}` | smart_meetings | yes | no | no | no |
| `GET` | `/smart-meetings/attendeeDeclined` | smart_meetings | yes | no | no | no |
| `GET` | `/smart-meetings/availability/{id}` | smart_meetings | yes | no | no | no |
| `GET` | `/smart-meetings/detect` | smart_meetings | yes | no | no | no |
| `PATCH` | `/smart-meetings/{id}` | smart_meetings | no | no | no | no |
| `POST` | `/smart-meetings` | smart_meetings | no | no | no | no |
| `POST` | `/smart-meetings/invite-organizer` | smart_meetings | no | no | no | no |
| `POST` | `/smart-meetings/to-single-instances` | smart_meetings | no | no | no | no |
| `DELETE` | `/tasks/{id}` | tasks | no | yes | no | no |
| `DELETE` | `/tasks/batch` | tasks | no | no | no | no |
| `GET` | `/recommended-tasks` | tasks | yes | no | no | no |
| `GET` | `/tasks` | tasks | yes | no | no | no |
| `GET` | `/tasks/{id}` | tasks | yes | no | no | no |
| `GET` | `/tasks/min-index` | tasks | yes | no | no | no |
| `PATCH` | `/tasks/{id}` | tasks | no | no | no | no |
| `PATCH` | `/tasks/{id}/reindex` | tasks | no | no | no | no |
| `PATCH` | `/tasks/batch` | tasks | no | no | no | no |
| `PATCH` | `/tasks/batch/archive` | tasks | no | no | no | no |
| `PATCH` | `/tasks/batch/complete` | tasks | no | no | no | no |
| `PATCH` | `/tasks/reindex-by-due` | tasks | no | no | yes | yes |
| `POST` | `/tasks` | tasks | no | no | no | no |
| `POST` | `/tasks/at-time` | tasks | no | no | no | no |
| `DELETE` | `/team/ooo-calendars/{id}` | team_organization_billing | no | yes | no | no |
| `GET` | `/team/current` | team_organization_billing | yes | no | no | no |
| `GET` | `/team/current/membership` | team_organization_billing | yes | no | no | no |
| `GET` | `/team/editions` | team_organization_billing | yes | no | no | no |
| `GET` | `/team/joinable` | team_organization_billing | yes | no | no | no |
| `GET` | `/team/ooo-calendars` | team_organization_billing | yes | no | no | no |
| `GET` | `/team/ooo-calendars/{id}` | team_organization_billing | yes | no | no | no |
| `GET` | `/team/ooo-calendars/available` | team_organization_billing | yes | no | no | no |
| `PATCH` | `/team/ooo-calendars/{id}` | team_organization_billing | no | no | no | no |
| `POST` | `/team/current/joinResponses` | team_organization_billing | no | no | no | no |
| `POST` | `/team/current/leave` | team_organization_billing | no | no | no | no |
| `POST` | `/team/ooo-calendars` | team_organization_billing | no | no | no | no |
| `DELETE` | `/schedule-policy/{id}` | time_schemes_time_windows_schedule_policies | no | yes | no | no |
| `DELETE` | `/time-window-overrides/entry/{id}` | time_schemes_time_windows_schedule_policies | no | yes | no | no |
| `DELETE` | `/timescheme/rules/{id}` | time_schemes_time_windows_schedule_policies | no | yes | no | no |
| `DELETE` | `/timeschemes/{id}` | time_schemes_time_windows_schedule_policies | no | yes | no | no |
| `GET` | `/account-time-schemes` | time_schemes_time_windows_schedule_policies | yes | no | no | no |
| `GET` | `/schedule-policy` | time_schemes_time_windows_schedule_policies | yes | no | no | no |
| `GET` | `/schedule-policy/{id}` | time_schemes_time_windows_schedule_policies | yes | no | no | no |
| `GET` | `/schedule-policy/available-types` | time_schemes_time_windows_schedule_policies | yes | no | no | no |
| `GET` | `/schedule-policy/create-default-policies` | time_schemes_time_windows_schedule_policies | no | no | no | no |
| `GET` | `/schedule-policy/event-matcher-tags` | time_schemes_time_windows_schedule_policies | yes | no | no | no |
| `GET` | `/schedule-policy/smart-meeting/candidates` | time_schemes_time_windows_schedule_policies | yes | no | no | no |
| `GET` | `/schedule-policy/templates` | time_schemes_time_windows_schedule_policies | yes | no | no | no |
| `GET` | `/schedule-policy/templates/instantiated/{id}` | time_schemes_time_windows_schedule_policies | yes | no | no | no |
| `GET` | `/time-window-overrides` | time_schemes_time_windows_schedule_policies | yes | no | no | no |
| `GET` | `/timescheme/rules` | time_schemes_time_windows_schedule_policies | yes | no | no | no |
| `GET` | `/timeschemes` | time_schemes_time_windows_schedule_policies | yes | no | no | no |
| `GET` | `/timeschemes/{id}` | time_schemes_time_windows_schedule_policies | yes | no | no | no |
| `GET` | `/timeschemes/filter-by-feature` | time_schemes_time_windows_schedule_policies | yes | no | no | no |
| `GET` | `/timeschemes/filter-by-feature/{id}` | time_schemes_time_windows_schedule_policies | yes | no | no | no |
| `PATCH` | `/account-time-schemes/{id}` | time_schemes_time_windows_schedule_policies | no | no | no | no |
| `PATCH` | `/timescheme/rules/{id}` | time_schemes_time_windows_schedule_policies | no | no | no | no |
| `PATCH` | `/timescheme/rules/{id}/reindex` | time_schemes_time_windows_schedule_policies | no | no | no | no |
| `PATCH` | `/timeschemes/{id}` | time_schemes_time_windows_schedule_policies | no | no | no | no |
| `POST` | `/account-time-schemes` | time_schemes_time_windows_schedule_policies | no | no | no | no |
| `POST` | `/effective-time-policy` | time_schemes_time_windows_schedule_policies | no | no | no | no |
| `POST` | `/schedule-policy` | time_schemes_time_windows_schedule_policies | no | no | no | no |
| `POST` | `/schedule-policy/matching-events` | time_schemes_time_windows_schedule_policies | no | no | no | no |
| `POST` | `/schedule-policy/recommended` | time_schemes_time_windows_schedule_policies | no | no | no | no |
| `POST` | `/schedule-policy/templates/instantiate-meeting-quality` | time_schemes_time_windows_schedule_policies | no | no | no | no |
| `POST` | `/time-window-overrides/entry` | time_schemes_time_windows_schedule_policies | no | no | no | no |
| `POST` | `/timescheme/rules` | time_schemes_time_windows_schedule_policies | no | no | no | no |
| `POST` | `/timeschemes` | time_schemes_time_windows_schedule_policies | no | no | no | no |
| `GET` | `/users/current` | users | yes | no | no | no |
| `GET` | `/users/current/access` | users | yes | no | no | no |
| `GET` | `/users/current/access/{id}` | users | yes | no | no | no |
| `GET` | `/users/current/contacts` | users | yes | no | no | no |
| `GET` | `/users/current/contacts/v2` | users | yes | no | no | no |
| `GET` | `/users/current/contacts/v3` | users | yes | no | no | no |
| `GET` | `/users/current/product-usage` | users | yes | no | no | no |
| `GET` | `/users/current/quest` | users | yes | no | no | no |
| `GET` | `/users/current/referrals` | users | yes | no | no | no |
| `GET` | `/users/current/restorable-features` | users | yes | no | no | no |
| `GET` | `/users/current/timePolicies` | users | yes | no | no | no |
| `PATCH` | `/users/current` | users | no | no | no | no |
| `PATCH` | `/users/current/format24hour-settings` | users | no | no | no | no |
| `PATCH` | `/users/current/quest` | users | no | no | no | no |
| `PATCH` | `/users/current/timePolicies` | users | no | no | no | no |
| `PATCH` | `/users/current/week-start-settings` | users | no | no | no | no |
| `POST` | `/users/current/contacts/invite` | users | no | no | no | no |
| `POST` | `/users/current/contacts/invite/v2` | users | no | no | no | no |
| `POST` | `/users/current/reset` | users | no | yes | no | no |
| `POST` | `/users/current/restore-features` | users | no | no | no | no |
| `PUT` | `/users/current/rsvp-settings` | users | no | no | no | no |
| `PUT` | `/users/current/timezone-settings` | users | no | no | no | no |

## Raw Fallback Tool

- `reclaim_call_api`

## Raw-Available Endpoints

These endpoint signatures are callable only through `reclaim_call_api` after registry allowlist checks.

| Method | Path Template | Domain | Read Only | Destructive | Bulk | High Risk |
| --- | --- | --- | --- | --- | --- | --- |
| `POST` | `/weekly-report/unsubscribe` | analytics | no | yes | no | no |
| `POST` | `/scoring/rescore` | assist_interactions | no | no | no | yes |
| `POST` | `/availability/enable-redis-cache` | availability | no | no | no | yes |
| `POST` | `/availability/warm-cache` | availability | no | no | no | yes |
| `GET` | `/anonymous/flags` | avatars_notifications_misc | yes | no | no | no |
| `GET` | `/avatar/credential/{id}` | avatars_notifications_misc | yes | no | no | no |
| `GET` | `/avatar/lookup` | avatars_notifications_misc | yes | no | no | no |
| `GET` | `/avatar/me` | avatars_notifications_misc | yes | no | no | no |
| `GET` | `/avatar/streamed/id/{id}` | avatars_notifications_misc | yes | no | no | no |
| `GET` | `/avatar/streamed/me` | avatars_notifications_misc | yes | no | no | no |
| `GET` | `/enum-registry/list` | avatars_notifications_misc | yes | no | no | no |
| `GET` | `/extra-types/assistantInteractionUpdate` | avatars_notifications_misc | yes | no | no | no |
| `GET` | `/extra-types/calendarEvent` | avatars_notifications_misc | yes | no | no | no |
| `GET` | `/extra-types/lockChangedMetadataView` | avatars_notifications_misc | yes | no | no | no |
| `GET` | `/extra-types/periodSkippedDueToReservedWordMetadataView` | avatars_notifications_misc | yes | no | no | no |
| `GET` | `/extra-types/periodSkippedMetadataView` | avatars_notifications_misc | yes | no | no | no |
| `GET` | `/extra-types/smartMeetingDeclinedMetadataView` | avatars_notifications_misc | yes | no | no | no |
| `GET` | `/extra-types/smartSeriesEventMovedView` | avatars_notifications_misc | yes | no | no | no |
| `GET` | `/invite/{id}` | avatars_notifications_misc | yes | no | no | no |
| `GET` | `/notification-settings` | avatars_notifications_misc | yes | no | no | no |
| `GET` | `/notifications/{id}` | avatars_notifications_misc | yes | no | no | no |
| `GET` | `/people` | avatars_notifications_misc | yes | no | no | no |
| `GET` | `/resources` | avatars_notifications_misc | yes | no | no | no |
| `GET` | `/sso/provider/{id}` | avatars_notifications_misc | yes | no | no | no |
| `PATCH` | `/notification-settings` | avatars_notifications_misc | no | no | no | no |
| `PATCH` | `/focus-settings/team/{id}` | focus_settings_focus_planner | no | no | no | no |
| `POST` | `/focus-settings/clear-focus-time-events` | focus_settings_focus_planner | no | no | no | no |
| `POST` | `/focus-settings/remove-duplicated-focus-time-events` | focus_settings_focus_planner | no | no | no | no |
| `POST` | `/focus-settings/team` | focus_settings_focus_planner | no | no | no | no |
| `DELETE` | `/clockwise/cleanup-events` | integrations | no | yes | no | no |
| `DELETE` | `/notion/workspaces/{id}` | integrations | no | yes | no | no |
| `GET` | `/clockwise/detect-events` | integrations | yes | no | no | no |
| `GET` | `/clockwise/import/{id}` | integrations | yes | no | no | no |
| `GET` | `/google-add-on/integrations` | integrations | yes | no | no | no |
| `GET` | `/google/groups/expand` | integrations | yes | no | no | no |
| `GET` | `/integrations/zoom/meeting-assets/{id}` | integrations | yes | no | no | no |
| `GET` | `/integrations/zoom/meeting-assets/fetch/{id}` | integrations | yes | no | no | no |
| `GET` | `/integrations/zoom/meeting-assets/lookup` | integrations | yes | no | no | no |
| `GET` | `/linear/issue/{id}` | integrations | yes | no | no | no |
| `GET` | `/slack/add` | integrations | yes | no | no | no |
| `GET` | `/slack/connect` | integrations | yes | no | no | no |
| `GET` | `/slack/streamlined-connect` | integrations | yes | no | no | no |
| `GET` | `/slack/streamlined-init` | integrations | yes | no | no | no |
| `POST` | `/clockwise/clear-suppression` | integrations | no | no | no | no |
| `POST` | `/clockwise/import` | integrations | no | no | no | no |
| `POST` | `/notion/workspaces` | integrations | no | no | no | no |
| `POST` | `/slack/link` | integrations | no | no | no | no |
| `GET` | `/.well-known/openai-apps-challenge` | mcp | yes | no | no | no |
| `DELETE` | `/planner/policy/habit/{id}` | planner | no | yes | no | no |
| `DELETE` | `/planner/policy/task/{id}` | planner | no | yes | no | no |
| `POST` | `/planner/clear-exceptions/habit/{id}` | planner | no | no | no | no |
| `POST` | `/planner/clear-exceptions/one-on-one/{id}` | planner | no | no | no | no |
| `POST` | `/planner/done/habit/{id}` | planner | no | no | no | no |
| `POST` | `/planner/event/move/{id}` | planner | no | no | no | no |
| `POST` | `/planner/event/pin/{id}` | planner | no | no | no | no |
| `POST` | `/planner/event/unpin/{id}` | planner | no | no | no | no |
| `POST` | `/planner/reschedule/habit/event/{id}` | planner | no | no | no | no |
| `POST` | `/planner/restart/habit/{id}` | planner | no | no | no | no |
| `POST` | `/planner/skip/habit/event/{id}` | planner | no | no | no | no |
| `POST` | `/planner/start/habit/{id}` | planner | no | no | no | no |
| `POST` | `/planner/stop/habit/{id}` | planner | no | no | no | no |
| `POST` | `/planner/toggle/habit/{id}` | planner | no | no | no | no |
| `POST` | `/schedule-actions` | schedule_actions | no | no | no | yes |
| `POST` | `/schedule-actions/apply-actions` | schedule_actions | no | no | no | yes |
| `POST` | `/schedule-actions/disable-background-automation` | schedule_actions | no | no | no | yes |
| `POST` | `/schedule-actions/enable` | schedule_actions | no | no | no | yes |
| `POST` | `/schedule-actions/enable-calendar-ui` | schedule_actions | no | no | no | yes |
| `POST` | `/schedule-actions/enable-experimental-features` | schedule_actions | no | no | no | yes |
| `POST` | `/schedule-actions/enable-mcp` | schedule_actions | no | no | no | yes |
| `POST` | `/schedule-actions/event-actions` | schedule_actions | no | no | no | yes |
| `POST` | `/schedule-actions/find-problems` | schedule_actions | no | no | no | yes |
| `GET` | `/events/smart-series` | smart_series | yes | no | no | no |
| `POST` | `/smart-series-migration/reclaim-recurrence/migrate-all` | smart_series | no | no | no | no |
| `POST` | `/smart-series-migration/run` | smart_series | no | no | no | no |
| `POST` | `/tasks/interest` | tasks | no | no | no | no |
| `PUT` | `/tasks/{id}` | tasks | no | no | no | no |
| `GET` | `/team/orgStructure` | team_organization_billing | yes | no | no | no |
| `PATCH` | `/team/current` | team_organization_billing | no | no | no | no |
| `POST` | `/team/connected-conferences` | team_organization_billing | no | no | no | no |
| `POST` | `/team/orgStructure` | team_organization_billing | no | no | no | no |
| `DELETE` | `/users/current` | users | no | yes | no | no |
| `GET` | `/users/current/adventures` | users | yes | no | no | no |
| `GET` | `/users/current/adventures/{id}` | users | yes | no | no | no |
| `GET` | `/users/current/buildings` | users | yes | no | no | no |
| `GET` | `/users/current/buildings/rooms` | users | yes | no | no | no |
| `GET` | `/users/current/buildings/rooms/v2` | users | yes | no | no | no |
| `GET` | `/users/current/buildings/v2/{id}` | users | yes | no | no | no |
| `GET` | `/users/current/contacts/v4/directory/{id}` | users | yes | no | no | no |
| `GET` | `/users/current/contacts/v4/top-contacts/{id}` | users | yes | no | no | no |
| `GET` | `/users/current/downgrade-snapshot` | users | yes | no | no | no |
| `GET` | `/users/tzs` | users | yes | no | no | no |
| `PATCH` | `/users/current/date-field-order-settings` | users | no | no | no | no |
| `PATCH` | `/users/current/features/post-onboard` | users | no | no | no | no |
| `POST` | `/users/current/adventures/{id}` | users | no | no | no | no |
| `POST` | `/users/current/buildings/sync` | users | no | no | no | no |
| `POST` | `/users/current/features/assist-settings/*` | users | no | no | no | no |
| `POST` | `/users/current/onboarded` | users | no | no | no | no |
| `POST` | `/users/current/pipeline-migration` | users | no | no | no | yes |
| `POST` | `/users/current/pipeline-migration-async` | users | no | no | no | yes |
| `POST` | `/users/current/product-usage/hard-downgrade` | users | no | yes | no | no |
| `POST` | `/users/current/rewards` | users | no | no | no | no |
| `POST` | `/users/current/run-manual-assist` | users | no | no | no | no |
| `POST` | `/users/interest` | users | no | no | no | no |
| `POST` | `/users/trait/{id}` | users | no | no | no | no |
| `PUT` | `/users/current/features/app-notifications` | users | no | no | no | no |
| `PUT` | `/users/current/features/assist-settings/scheduling-behavior` | users | no | no | no | no |
| `PUT` | `/users/current/features/calendar-permission-settings` | users | no | no | no | no |
| `PUT` | `/users/current/features/event-display-preferences` | users | no | no | no | no |

## Exclusion Categories

| Category | Excluded Endpoints | Policy Note |
| --- | ---: | --- |
| `admin` | 36 | Administrative organization-management routes are excluded from MCP tools and raw fallback. |
| `api_key` | 6 | API key lifecycle and reissue routes are excluded for security. |
| `billing` | 15 | Billing, subscription, promotions, and payment-related routes are excluded. |
| `callback_route` | 24 | Provider callback/action endpoints are excluded because they are server-to-server callbacks. |
| `oauth` | 25 | OAuth bootstrap, token exchange, and discovery routes are excluded from exposure. |
| `scim` | 11 | Enterprise SCIM provisioning routes are excluded. |
| `staff` | 4 | Internal staff-only or operator-only routes are not exposed via MCP. |
| `webhook_admin` | 9 | Webhook administration and secret-management routes are excluded. |

## Excluded Endpoints

| Category | Method | Path Template | Domain | Read Only | Destructive | Bulk | High Risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `admin` | `DELETE` | `/mcp` | mcp | no | no | no | no |
| `admin` | `DELETE` | `/mcp/chatgpt` | mcp | no | no | no | no |
| `admin` | `DELETE` | `/mcp/proxy` | mcp | no | no | no | no |
| `admin` | `DELETE` | `/mcp/raw` | mcp | no | no | no | no |
| `admin` | `GET` | `/mcp` | mcp | no | no | no | no |
| `admin` | `GET` | `/mcp/chatgpt` | mcp | no | no | no | no |
| `admin` | `GET` | `/mcp/proxy` | mcp | no | no | no | no |
| `admin` | `GET` | `/mcp/raw` | mcp | no | no | no | no |
| `admin` | `POST` | `/mcp` | mcp | no | no | no | yes |
| `admin` | `POST` | `/mcp/chatgpt` | mcp | no | no | no | yes |
| `admin` | `POST` | `/mcp/proxy` | mcp | no | no | no | yes |
| `admin` | `POST` | `/mcp/raw` | mcp | no | no | no | yes |
| `admin` | `DELETE` | `/team/current/invitation/{id}` | team_organization_billing | no | yes | no | yes |
| `admin` | `DELETE` | `/team/current/members` | team_organization_billing | no | no | no | no |
| `admin` | `DELETE` | `/team/scheduling-link/branding/image` | team_organization_billing | no | no | no | no |
| `admin` | `GET` | `/team/current/domains` | team_organization_billing | no | no | no | no |
| `admin` | `GET` | `/team/current/invitations` | team_organization_billing | no | no | no | no |
| `admin` | `GET` | `/team/current/invitations/v2` | team_organization_billing | no | no | no | no |
| `admin` | `GET` | `/team/current/inviteable` | team_organization_billing | yes | no | no | yes |
| `admin` | `GET` | `/team/current/members` | team_organization_billing | no | no | no | no |
| `admin` | `GET` | `/team/current/requests` | team_organization_billing | no | no | no | no |
| `admin` | `GET` | `/team/scheduling-link/branding` | team_organization_billing | no | no | no | no |
| `admin` | `PATCH` | `/team/current/invitations/{id}` | team_organization_billing | no | no | no | yes |
| `admin` | `PATCH` | `/team/current/invitations/v2/{id}` | team_organization_billing | no | no | no | yes |
| `admin` | `PATCH` | `/team/current/members` | team_organization_billing | no | no | no | yes |
| `admin` | `PATCH` | `/team/current/onboarding-settings` | team_organization_billing | no | no | no | yes |
| `admin` | `POST` | `/team/current/allowMembersToCreateOooCalendars` | team_organization_billing | no | no | no | yes |
| `admin` | `POST` | `/team/current/enableExternalLlm` | team_organization_billing | no | no | no | yes |
| `admin` | `POST` | `/team/current/generate-promo-code` | team_organization_billing | no | no | no | yes |
| `admin` | `POST` | `/team/current/invitations` | team_organization_billing | no | no | no | yes |
| `admin` | `POST` | `/team/current/invitations/v2` | team_organization_billing | no | no | no | yes |
| `admin` | `POST` | `/team/current/reconcile` | team_organization_billing | no | no | no | yes |
| `admin` | `POST` | `/team/current/settings/ooo-calendars` | team_organization_billing | no | no | no | yes |
| `admin` | `PUT` | `/team/scheduling-link/branding/homepage` | team_organization_billing | no | no | no | yes |
| `admin` | `PUT` | `/team/scheduling-link/branding/image` | team_organization_billing | no | no | no | yes |
| `admin` | `PUT` | `/team/scheduling-link/branding/mode` | team_organization_billing | no | no | no | yes |
| `api_key` | `DELETE` | `/api-management/api-key/{id}` | api_keys | no | no | no | no |
| `api_key` | `GET` | `/api-management/api-key/{id}` | api_keys | no | no | no | no |
| `api_key` | `GET` | `/api-management/api-keys` | api_keys | no | no | no | no |
| `api_key` | `PATCH` | `/api-management/api-key` | api_keys | no | no | no | yes |
| `api_key` | `PATCH` | `/api-management/api-key/reissue/{id}` | api_keys | no | no | no | yes |
| `api_key` | `POST` | `/api-management/api-key` | api_keys | no | no | no | yes |
| `billing` | `POST` | `/interactions/proactive-gtd/promote` | assist_interactions | no | no | no | yes |
| `billing` | `DELETE` | `/people/subscriptions` | avatars_notifications_misc | no | no | no | no |
| `billing` | `DELETE` | `/team/current/subscription` | team_organization_billing | no | no | no | no |
| `billing` | `DELETE` | `/team/current/trial` | team_organization_billing | no | no | no | no |
| `billing` | `GET` | `/team/create/subscription/session` | team_organization_billing | no | no | no | no |
| `billing` | `GET` | `/team/current/promo` | team_organization_billing | no | no | no | no |
| `billing` | `GET` | `/team/current/subscription` | team_organization_billing | no | no | no | no |
| `billing` | `GET` | `/team/current/subscription-options` | team_organization_billing | no | no | no | no |
| `billing` | `GET` | `/team/current/subscription/session` | team_organization_billing | no | no | no | no |
| `billing` | `POST` | `/team/current/cancellation-reason` | team_organization_billing | no | no | no | yes |
| `billing` | `POST` | `/team/current/promo` | team_organization_billing | no | no | no | yes |
| `billing` | `POST` | `/team/current/subscription/change` | team_organization_billing | no | no | no | yes |
| `billing` | `POST` | `/team/current/subscription/change-preview` | team_organization_billing | no | no | no | yes |
| `billing` | `POST` | `/team/current/subscription/reinstate` | team_organization_billing | no | no | no | yes |
| `billing` | `POST` | `/team/current/trial/extension` | team_organization_billing | no | no | no | yes |
| `callback_route` | `POST` | `/ws-relay` | avatars_notifications_misc | no | no | no | yes |
| `callback_route` | `POST` | `/ws/bogus` | avatars_notifications_misc | no | no | no | yes |
| `callback_route` | `POST` | `/ws/connect` | avatars_notifications_misc | no | no | no | yes |
| `callback_route` | `POST` | `/ws/default` | avatars_notifications_misc | no | no | no | yes |
| `callback_route` | `POST` | `/ws/disconnect` | avatars_notifications_misc | no | no | no | no |
| `callback_route` | `POST` | `/ws/subscribe` | avatars_notifications_misc | no | no | no | yes |
| `callback_route` | `POST` | `/ws/unsubscribe` | avatars_notifications_misc | no | no | no | no |
| `callback_route` | `POST` | `/calendars/watch` | events_calendars | no | no | no | no |
| `callback_route` | `POST` | `/calendars/watchList` | events_calendars | no | no | no | no |
| `callback_route` | `POST` | `/calendars/watchSettings` | events_calendars | no | no | no | no |
| `callback_route` | `GET` | `/web/asana/syncform` | integrations | no | no | no | no |
| `callback_route` | `GET` | `/web/asana/task/{id}` | integrations | no | no | no | no |
| `callback_route` | `GET` | `/web/asana/widget` | integrations | no | no | no | no |
| `callback_route` | `GET` | `/web/clickup/task/{id}` | integrations | no | no | no | no |
| `callback_route` | `GET` | `/web/linear/task/{id}` | integrations | no | no | no | no |
| `callback_route` | `GET` | `/web/todoist/task/{id}` | integrations | no | no | no | no |
| `callback_route` | `POST` | `/google-add-on/add-html-to-email` | integrations | no | no | no | yes |
| `callback_route` | `POST` | `/slack/action-endpoint` | integrations | no | no | no | yes |
| `callback_route` | `POST` | `/slack/command` | integrations | no | no | no | yes |
| `callback_route` | `POST` | `/slack/interactive-endpoint` | integrations | no | no | no | yes |
| `callback_route` | `POST` | `/slack/options-load-endpoint` | integrations | no | no | no | yes |
| `callback_route` | `POST` | `/web/asana/formfieldchange` | integrations | no | no | no | yes |
| `callback_route` | `POST` | `/web/asana/formsubmit` | integrations | no | no | no | yes |
| `callback_route` | `POST` | `/webhook/stripe` | team_organization_billing | no | no | no | yes |
| `oauth` | `GET` | `/oauth/zoom/account/init` | integrations | no | no | no | no |
| `oauth` | `GET` | `/oauth/zoom/development/init` | integrations | no | no | no | no |
| `oauth` | `GET` | `/oauth/zoom/init` | integrations | no | no | no | no |
| `oauth` | `GET` | `/.well-known/oauth-authorization-server` | mcp | no | no | no | no |
| `oauth` | `GET` | `/.well-known/oauth-authorization-server/mcp` | mcp | no | no | no | no |
| `oauth` | `GET` | `/.well-known/oauth-authorization-server/mcp/{id}` | mcp | no | no | no | no |
| `oauth` | `GET` | `/.well-known/oauth-protected-resource` | mcp | no | no | no | no |
| `oauth` | `GET` | `/.well-known/oauth-protected-resource/mcp` | mcp | no | no | no | no |
| `oauth` | `GET` | `/.well-known/oauth-protected-resource/mcp/{id}` | mcp | no | no | no | no |
| `oauth` | `GET` | `/.well-known/openid-configuration` | mcp | no | no | no | no |
| `oauth` | `GET` | `/.well-known/openid-configuration/mcp` | mcp | no | no | no | no |
| `oauth` | `GET` | `/.well-known/openid-configuration/mcp/{id}` | mcp | no | no | no | no |
| `oauth` | `GET` | `/mcp/.well-known/oauth-authorization-server` | mcp | no | no | no | no |
| `oauth` | `GET` | `/mcp/.well-known/openid-configuration` | mcp | no | no | no | no |
| `oauth` | `DELETE` | `/oauth2/clients/{id}` | oauth2 | no | no | no | no |
| `oauth` | `GET` | `/oauth2/authorize` | oauth2 | no | no | no | no |
| `oauth` | `GET` | `/oauth2/clients` | oauth2 | no | no | no | no |
| `oauth` | `GET` | `/oauth2/clients/{id}` | oauth2 | no | no | no | no |
| `oauth` | `POST` | `/oauth2/authorize/approve` | oauth2 | no | no | no | yes |
| `oauth` | `POST` | `/oauth2/authorize/deny` | oauth2 | no | no | no | yes |
| `oauth` | `POST` | `/oauth2/clients` | oauth2 | no | no | no | yes |
| `oauth` | `POST` | `/oauth2/register` | oauth2 | no | no | no | yes |
| `oauth` | `POST` | `/oauth2/revoke` | oauth2 | no | no | no | no |
| `oauth` | `POST` | `/oauth2/token` | oauth2 | no | no | no | yes |
| `oauth` | `PUT` | `/oauth2/clients/{id}` | oauth2 | no | no | no | yes |
| `scim` | `DELETE` | `/scim/v2/Users/{id}` | scim | no | no | no | no |
| `scim` | `GET` | `/scim/v2/Groups` | scim | no | no | no | no |
| `scim` | `GET` | `/scim/v2/ResourceTypes` | scim | no | no | no | no |
| `scim` | `GET` | `/scim/v2/Schemas` | scim | no | no | no | no |
| `scim` | `GET` | `/scim/v2/ServiceProvider` | scim | no | no | no | no |
| `scim` | `GET` | `/scim/v2/Users` | scim | no | no | no | no |
| `scim` | `GET` | `/scim/v2/Users/{id}` | scim | no | no | no | no |
| `scim` | `PATCH` | `/scim/v2/Users/{id}` | scim | no | no | no | yes |
| `scim` | `POST` | `/scim/v2/Users` | scim | no | no | no | yes |
| `scim` | `PUT` | `/scim/v2/Users` | scim | no | no | no | yes |
| `scim` | `PUT` | `/scim/v2/Users/{id}` | scim | no | no | no | yes |
| `staff` | `DELETE` | `/admin/users/{id}` | avatars_notifications_misc | no | no | no | no |
| `staff` | `POST` | `/admin/users` | avatars_notifications_misc | no | no | no | yes |
| `staff` | `POST` | `/planner/migration/priorities` | planner | no | no | no | yes |
| `staff` | `POST` | `/users/current/features/focus/debug` | users | no | no | no | yes |
| `webhook_admin` | `DELETE` | `/team/current/webhooks/{id}` | team_organization_billing | no | no | no | no |
| `webhook_admin` | `GET` | `/team/current/webhooks` | team_organization_billing | no | no | no | no |
| `webhook_admin` | `GET` | `/team/current/webhooks/{id}` | team_organization_billing | no | no | no | no |
| `webhook_admin` | `GET` | `/team/current/webhooks/messages` | team_organization_billing | no | no | no | no |
| `webhook_admin` | `GET` | `/team/current/webhooks/versions` | team_organization_billing | no | no | no | no |
| `webhook_admin` | `GET` | `/team/webhook/generate-secret` | team_organization_billing | no | no | no | no |
| `webhook_admin` | `POST` | `/team/current/webhooks` | team_organization_billing | no | no | no | yes |
| `webhook_admin` | `POST` | `/team/current/webhooks/messages/retry` | team_organization_billing | no | no | no | yes |
| `webhook_admin` | `PUT` | `/team/current/webhooks/{id}` | team_organization_billing | no | no | no | yes |
