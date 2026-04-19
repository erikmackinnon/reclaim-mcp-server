import { reclaimHttpClient, type QueryParams } from "../../core/http.js";
import {
  type AccountTimeScheme,
  type AccountTimeSchemeInputData,
  type EffectiveTimePolicyInputData,
  type SchedulePolicy,
  type SchedulePolicyInputData,
  type TimeScheme,
  type TimeSchemeInputData,
  type TimeSchemeRule,
  type TimeSchemeRuleInputData,
  type TimeWindowOverride,
  type TimeWindowOverrideEntryInputData,
} from "../../../types/reclaim.js";

type TimePoliciesRequestOptions = {
  query?: QueryParams;
};

type TimePolicyId = number | string;

function cleanUndefined<T extends Record<string, unknown>>(value: T): T {
  const copy: Record<string, unknown> = { ...value };
  for (const [key, entry] of Object.entries(copy)) {
    if (entry === undefined) {
      delete copy[key];
    }
  }
  return copy as T;
}

function toArray<T>(value: T[] | T): T[] {
  return Array.isArray(value) ? value : [value];
}

function toPathId(value: TimePolicyId): string {
  return encodeURIComponent(String(value));
}

export async function listTimeSchemes(
  options?: TimePoliciesRequestOptions,
): Promise<TimeScheme[]> {
  const context = "listTimeSchemes";
  const data = await reclaimHttpClient.get<TimeScheme[] | TimeScheme>(
    "/timeschemes",
    {
      context,
      query: options?.query,
    },
  );
  return toArray(data);
}

export async function createTimeScheme(
  payload: TimeSchemeInputData,
): Promise<TimeScheme> {
  const context = "createTimeScheme";
  return reclaimHttpClient.post<TimeScheme>(
    "/timeschemes",
    cleanUndefined(payload),
    {
      context,
    },
  );
}

export async function getTimeScheme(
  timeSchemeId: TimePolicyId,
): Promise<TimeScheme> {
  const context = `getTimeScheme(timeSchemeId=${String(timeSchemeId)})`;
  return reclaimHttpClient.get<TimeScheme>(
    `/timeschemes/${toPathId(timeSchemeId)}`,
    {
      context,
    },
  );
}

export async function updateTimeScheme(
  timeSchemeId: TimePolicyId,
  payload: TimeSchemeInputData,
): Promise<TimeScheme> {
  const context = `updateTimeScheme(timeSchemeId=${String(timeSchemeId)})`;
  return reclaimHttpClient.patch<TimeScheme>(
    `/timeschemes/${toPathId(timeSchemeId)}`,
    cleanUndefined(payload),
    {
      context,
    },
  );
}

export async function deleteTimeScheme(
  timeSchemeId: TimePolicyId,
  options?: TimePoliciesRequestOptions,
): Promise<void> {
  const context = `deleteTimeScheme(timeSchemeId=${String(timeSchemeId)})`;
  await reclaimHttpClient.delete(`/timeschemes/${toPathId(timeSchemeId)}`, {
    context,
    query: options?.query,
  });
}

export async function listTimeSchemesFilterByFeature(
  options?: TimePoliciesRequestOptions,
): Promise<TimeScheme[]> {
  const context = "listTimeSchemesFilterByFeature";
  const data = await reclaimHttpClient.get<TimeScheme[] | TimeScheme>(
    "/timeschemes/filter-by-feature",
    {
      context,
      query: options?.query,
    },
  );
  return toArray(data);
}

export async function getTimeSchemeFilterByFeature(
  featureId: TimePolicyId,
  options?: TimePoliciesRequestOptions,
): Promise<TimeScheme> {
  const context = `getTimeSchemeFilterByFeature(featureId=${String(featureId)})`;
  return reclaimHttpClient.get<TimeScheme>(
    `/timeschemes/filter-by-feature/${toPathId(featureId)}`,
    {
      context,
      query: options?.query,
    },
  );
}

export async function listTimeSchemeRules(
  options?: TimePoliciesRequestOptions,
): Promise<TimeSchemeRule[]> {
  const context = "listTimeSchemeRules";
  const data = await reclaimHttpClient.get<TimeSchemeRule[] | TimeSchemeRule>(
    "/timescheme/rules",
    {
      context,
      query: options?.query,
    },
  );
  return toArray(data);
}

export async function createTimeSchemeRule(
  payload: TimeSchemeRuleInputData,
): Promise<TimeSchemeRule> {
  const context = "createTimeSchemeRule";
  return reclaimHttpClient.post<TimeSchemeRule>(
    "/timescheme/rules",
    cleanUndefined(payload),
    {
      context,
    },
  );
}

export async function updateTimeSchemeRule(
  timeSchemeRuleId: TimePolicyId,
  payload: TimeSchemeRuleInputData,
): Promise<TimeSchemeRule> {
  const context = `updateTimeSchemeRule(timeSchemeRuleId=${String(timeSchemeRuleId)})`;
  return reclaimHttpClient.patch<TimeSchemeRule>(
    `/timescheme/rules/${toPathId(timeSchemeRuleId)}`,
    cleanUndefined(payload),
    {
      context,
    },
  );
}

export async function deleteTimeSchemeRule(
  timeSchemeRuleId: TimePolicyId,
): Promise<void> {
  const context = `deleteTimeSchemeRule(timeSchemeRuleId=${String(timeSchemeRuleId)})`;
  await reclaimHttpClient.delete(
    `/timescheme/rules/${toPathId(timeSchemeRuleId)}`,
    {
      context,
    },
  );
}

export async function reindexTimeSchemeRule(
  timeSchemeRuleId: TimePolicyId,
  payload: Record<string, unknown> = {},
): Promise<TimeSchemeRule> {
  const context = `reindexTimeSchemeRule(timeSchemeRuleId=${String(timeSchemeRuleId)})`;
  return reclaimHttpClient.patch<TimeSchemeRule>(
    `/timescheme/rules/${toPathId(timeSchemeRuleId)}/reindex`,
    cleanUndefined(payload),
    {
      context,
    },
  );
}

export async function listAccountTimeSchemes(): Promise<AccountTimeScheme[]> {
  const context = "listAccountTimeSchemes";
  const data = await reclaimHttpClient.get<
    AccountTimeScheme[] | AccountTimeScheme
  >("/account-time-schemes", {
    context,
  });
  return toArray(data);
}

export async function createAccountTimeScheme(
  payload: AccountTimeSchemeInputData,
): Promise<AccountTimeScheme> {
  const context = "createAccountTimeScheme";
  return reclaimHttpClient.post<AccountTimeScheme>(
    "/account-time-schemes",
    cleanUndefined(payload),
    {
      context,
    },
  );
}

export async function updateAccountTimeScheme(
  accountTimeSchemeId: TimePolicyId,
  payload: AccountTimeSchemeInputData,
): Promise<AccountTimeScheme> {
  const context = `updateAccountTimeScheme(accountTimeSchemeId=${String(accountTimeSchemeId)})`;
  return reclaimHttpClient.patch<AccountTimeScheme>(
    `/account-time-schemes/${toPathId(accountTimeSchemeId)}`,
    cleanUndefined(payload),
    {
      context,
    },
  );
}

export async function getEffectiveTimePolicy(
  payload: EffectiveTimePolicyInputData,
): Promise<Record<string, unknown>> {
  const context = "getEffectiveTimePolicy";
  return reclaimHttpClient.post<Record<string, unknown>>(
    "/effective-time-policy",
    cleanUndefined(payload),
    {
      context,
    },
  );
}

export async function listTimeWindowOverrides(): Promise<TimeWindowOverride[]> {
  const context = "listTimeWindowOverrides";
  const data = await reclaimHttpClient.get<
    TimeWindowOverride[] | TimeWindowOverride
  >("/time-window-overrides", {
    context,
  });
  return toArray(data);
}

export async function createTimeWindowOverrideEntry(
  payload: TimeWindowOverrideEntryInputData,
): Promise<TimeWindowOverride> {
  const context = "createTimeWindowOverrideEntry";
  return reclaimHttpClient.post<TimeWindowOverride>(
    "/time-window-overrides/entry",
    cleanUndefined(payload),
    {
      context,
    },
  );
}

export async function deleteTimeWindowOverrideEntry(
  timeWindowOverrideEntryId: TimePolicyId,
): Promise<void> {
  const context = `deleteTimeWindowOverrideEntry(timeWindowOverrideEntryId=${String(timeWindowOverrideEntryId)})`;
  await reclaimHttpClient.delete(
    `/time-window-overrides/entry/${toPathId(timeWindowOverrideEntryId)}`,
    {
      context,
    },
  );
}

export async function listSchedulePolicies(
  options?: TimePoliciesRequestOptions,
): Promise<SchedulePolicy[]> {
  const context = "listSchedulePolicies";
  const data = await reclaimHttpClient.get<SchedulePolicy[] | SchedulePolicy>(
    "/schedule-policy",
    {
      context,
      query: options?.query,
    },
  );
  return toArray(data);
}

export async function createSchedulePolicy(
  payload: SchedulePolicyInputData,
): Promise<SchedulePolicy> {
  const context = "createSchedulePolicy";
  return reclaimHttpClient.post<SchedulePolicy>(
    "/schedule-policy",
    cleanUndefined(payload),
    {
      context,
    },
  );
}

export async function getSchedulePolicy(
  schedulePolicyId: TimePolicyId,
): Promise<SchedulePolicy> {
  const context = `getSchedulePolicy(schedulePolicyId=${String(schedulePolicyId)})`;
  return reclaimHttpClient.get<SchedulePolicy>(
    `/schedule-policy/${toPathId(schedulePolicyId)}`,
    {
      context,
    },
  );
}

export async function deleteSchedulePolicy(
  schedulePolicyId: TimePolicyId,
): Promise<void> {
  const context = `deleteSchedulePolicy(schedulePolicyId=${String(schedulePolicyId)})`;
  await reclaimHttpClient.delete(
    `/schedule-policy/${toPathId(schedulePolicyId)}`,
    {
      context,
    },
  );
}

export async function listSchedulePolicyAvailableTypes(): Promise<
  Record<string, unknown>
> {
  const context = "listSchedulePolicyAvailableTypes";
  return reclaimHttpClient.get<Record<string, unknown>>(
    "/schedule-policy/available-types",
    {
      context,
    },
  );
}

export async function createDefaultSchedulePolicies(): Promise<
  Record<string, unknown>
> {
  const context = "createDefaultSchedulePolicies";
  return reclaimHttpClient.get<Record<string, unknown>>(
    "/schedule-policy/create-default-policies",
    {
      context,
    },
  );
}

export async function listSchedulePolicyEventMatcherTags(): Promise<
  Record<string, unknown>
> {
  const context = "listSchedulePolicyEventMatcherTags";
  return reclaimHttpClient.get<Record<string, unknown>>(
    "/schedule-policy/event-matcher-tags",
    {
      context,
    },
  );
}

export async function matchSchedulePolicyEvents(
  payload: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const context = "matchSchedulePolicyEvents";
  return reclaimHttpClient.post<Record<string, unknown>>(
    "/schedule-policy/matching-events",
    cleanUndefined(payload),
    {
      context,
    },
  );
}

export async function getRecommendedSchedulePolicy(
  payload: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const context = "getRecommendedSchedulePolicy";
  return reclaimHttpClient.post<Record<string, unknown>>(
    "/schedule-policy/recommended",
    cleanUndefined(payload),
    {
      context,
    },
  );
}

export async function listSchedulePolicySmartMeetingCandidates(): Promise<
  Record<string, unknown>
> {
  const context = "listSchedulePolicySmartMeetingCandidates";
  return reclaimHttpClient.get<Record<string, unknown>>(
    "/schedule-policy/smart-meeting/candidates",
    {
      context,
    },
  );
}

export async function listSchedulePolicyTemplates(): Promise<
  Record<string, unknown>
> {
  const context = "listSchedulePolicyTemplates";
  return reclaimHttpClient.get<Record<string, unknown>>(
    "/schedule-policy/templates",
    {
      context,
    },
  );
}

export async function instantiateMeetingQualitySchedulePolicyTemplate(
  payload: Record<string, unknown> = {},
  options?: TimePoliciesRequestOptions,
): Promise<Record<string, unknown>> {
  const context = "instantiateMeetingQualitySchedulePolicyTemplate";
  return reclaimHttpClient.post<Record<string, unknown>>(
    "/schedule-policy/templates/instantiate-meeting-quality",
    cleanUndefined(payload),
    {
      context,
      query: options?.query,
    },
  );
}

export async function getInstantiatedSchedulePolicyTemplate(
  templateId: TimePolicyId,
): Promise<Record<string, unknown>> {
  const context = `getInstantiatedSchedulePolicyTemplate(templateId=${String(templateId)})`;
  return reclaimHttpClient.get<Record<string, unknown>>(
    `/schedule-policy/templates/instantiated/${toPathId(templateId)}`,
    {
      context,
    },
  );
}
