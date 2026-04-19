import { reclaimHttpClient, type QueryParams } from "../../core/http.js";
import {
  type ParticipantResolution,
  type SchedulingLink,
  type SchedulingLinkGroup,
  type SchedulingLinkInputData,
  type SchedulingLinkUserSlug,
} from "../../../types/reclaim.js";

type SchedulingLinkRequestOptions = {
  query?: QueryParams;
};

type SchedulingLinkId = number | string;

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

export async function listSchedulingLinks(
  options?: SchedulingLinkRequestOptions,
): Promise<SchedulingLink[]> {
  const context = "listSchedulingLinks";
  const data = await reclaimHttpClient.get<SchedulingLink[] | SchedulingLink>(
    "/scheduling-link",
    {
      context,
      query: options?.query,
    },
  );
  return toArray(data);
}

export async function createSchedulingLink(
  linkData: SchedulingLinkInputData,
  options?: SchedulingLinkRequestOptions,
): Promise<SchedulingLink> {
  const context = "createSchedulingLink";
  return reclaimHttpClient.post<SchedulingLink>(
    "/scheduling-link",
    cleanUndefined(linkData),
    {
      context,
      query: options?.query,
    },
  );
}

export async function getSchedulingLink(
  schedulingLinkId: SchedulingLinkId,
): Promise<SchedulingLink> {
  const context = `getSchedulingLink(schedulingLinkId=${String(schedulingLinkId)})`;
  return reclaimHttpClient.get<SchedulingLink>(
    `/scheduling-link/${encodeURIComponent(String(schedulingLinkId))}`,
    { context },
  );
}

export async function updateSchedulingLink(
  schedulingLinkId: SchedulingLinkId,
  linkData: SchedulingLinkInputData,
  options?: SchedulingLinkRequestOptions,
): Promise<SchedulingLink> {
  const context = `updateSchedulingLink(schedulingLinkId=${String(schedulingLinkId)})`;
  return reclaimHttpClient.patch<SchedulingLink>(
    `/scheduling-link/${encodeURIComponent(String(schedulingLinkId))}`,
    cleanUndefined(linkData),
    {
      context,
      query: options?.query,
    },
  );
}

export async function deleteSchedulingLink(
  schedulingLinkId: SchedulingLinkId,
  options?: SchedulingLinkRequestOptions,
): Promise<void> {
  const context = `deleteSchedulingLink(schedulingLinkId=${String(schedulingLinkId)})`;
  await reclaimHttpClient.delete(
    `/scheduling-link/${encodeURIComponent(String(schedulingLinkId))}`,
    {
      context,
      query: options?.query,
    },
  );
}

export async function createSchedulingLinkDerivative(
  payload: Record<string, unknown>,
): Promise<unknown> {
  const context = "createSchedulingLinkDerivative";
  return reclaimHttpClient.post<unknown>(
    "/scheduling-link/derivative",
    cleanUndefined(payload),
    { context },
  );
}

export async function getSchedulingLinkEffectiveTimePolicy(
  payload: Record<string, unknown>,
): Promise<unknown> {
  const context = "getSchedulingLinkEffectiveTimePolicy";
  return reclaimHttpClient.post<unknown>(
    "/scheduling-link/effective-time-policy",
    cleanUndefined(payload),
    { context },
  );
}

export async function getSchedulingLinkForUserLinkSlug(
  options?: SchedulingLinkRequestOptions,
): Promise<unknown> {
  const context = "getSchedulingLinkForUserLinkSlug";
  return reclaimHttpClient.get<unknown>("/scheduling-link/for-user-link-slug", {
    context,
    query: options?.query,
  });
}

export async function getSchedulingLinkForUserSlug(
  userId: SchedulingLinkId,
  options?: SchedulingLinkRequestOptions,
): Promise<unknown> {
  const context = `getSchedulingLinkForUserSlug(userId=${String(userId)})`;
  return reclaimHttpClient.get<unknown>(
    `/scheduling-link/for-user-slug/${encodeURIComponent(String(userId))}`,
    {
      context,
      query: options?.query,
    },
  );
}

export async function listRecentSchedulingLinks(
  options?: SchedulingLinkRequestOptions,
): Promise<SchedulingLink[]> {
  const context = "listRecentSchedulingLinks";
  const data = await reclaimHttpClient.get<SchedulingLink[] | SchedulingLink>(
    "/scheduling-link/recent",
    {
      context,
      query: options?.query,
    },
  );
  return toArray(data);
}

export async function checkSchedulingLinkSlugExists(
  options?: SchedulingLinkRequestOptions,
): Promise<unknown> {
  const context = "checkSchedulingLinkSlugExists";
  return reclaimHttpClient.get<unknown>("/scheduling-link/slug-exists", {
    context,
    query: options?.query,
  });
}

export async function listSchedulingLinkUserSlugs(): Promise<
  SchedulingLinkUserSlug[]
> {
  const context = "listSchedulingLinkUserSlugs";
  const data = await reclaimHttpClient.get<
    SchedulingLinkUserSlug[] | SchedulingLinkUserSlug
  >("/scheduling-link/user-slug", { context });
  return toArray(data);
}

export async function createSchedulingLinkUserSlug(
  payload: Record<string, unknown>,
): Promise<SchedulingLinkUserSlug> {
  const context = "createSchedulingLinkUserSlug";
  return reclaimHttpClient.post<SchedulingLinkUserSlug>(
    "/scheduling-link/user-slug",
    cleanUndefined(payload),
    { context },
  );
}

export async function getSchedulingLinkUserSlug(
  userSlugId: SchedulingLinkId,
): Promise<SchedulingLinkUserSlug> {
  const context = `getSchedulingLinkUserSlug(userSlugId=${String(userSlugId)})`;
  return reclaimHttpClient.get<SchedulingLinkUserSlug>(
    `/scheduling-link/user-slug/${encodeURIComponent(String(userSlugId))}`,
    { context },
  );
}

export async function checkSchedulingLinkUserSlugExists(
  options?: SchedulingLinkRequestOptions,
): Promise<unknown> {
  const context = "checkSchedulingLinkUserSlugExists";
  return reclaimHttpClient.get<unknown>("/scheduling-link/user-slug/exists", {
    context,
    query: options?.query,
  });
}

export async function listSchedulingLinkGroups(): Promise<
  SchedulingLinkGroup[]
> {
  const context = "listSchedulingLinkGroups";
  const data = await reclaimHttpClient.get<
    SchedulingLinkGroup[] | SchedulingLinkGroup
  >("/scheduling-link/group", { context });
  return toArray(data);
}

export async function createSchedulingLinkGroup(
  payload: Record<string, unknown>,
): Promise<SchedulingLinkGroup> {
  const context = "createSchedulingLinkGroup";
  return reclaimHttpClient.post<SchedulingLinkGroup>(
    "/scheduling-link/group",
    cleanUndefined(payload),
    { context },
  );
}

export async function getSchedulingLinkGroupBySlug(
  groupSlugId: SchedulingLinkId,
): Promise<SchedulingLinkGroup> {
  const context = `getSchedulingLinkGroupBySlug(groupSlugId=${String(groupSlugId)})`;
  return reclaimHttpClient.get<SchedulingLinkGroup>(
    `/scheduling-link/group-by-slug/${encodeURIComponent(String(groupSlugId))}`,
    { context },
  );
}

export async function updateSchedulingLinkGroup(
  groupId: SchedulingLinkId,
  payload: Record<string, unknown>,
): Promise<SchedulingLinkGroup> {
  const context = `updateSchedulingLinkGroup(groupId=${String(groupId)})`;
  return reclaimHttpClient.patch<SchedulingLinkGroup>(
    `/scheduling-link/group/${encodeURIComponent(String(groupId))}`,
    cleanUndefined(payload),
    { context },
  );
}

export async function deleteSchedulingLinkGroup(
  groupId: SchedulingLinkId,
): Promise<void> {
  const context = `deleteSchedulingLinkGroup(groupId=${String(groupId)})`;
  await reclaimHttpClient.delete(
    `/scheduling-link/group/${encodeURIComponent(String(groupId))}`,
    { context },
  );
}

export async function getSchedulingLinkMeeting(
  meetingId: SchedulingLinkId,
  options?: SchedulingLinkRequestOptions,
): Promise<unknown> {
  const context = `getSchedulingLinkMeeting(meetingId=${String(meetingId)})`;
  return reclaimHttpClient.get<unknown>(
    `/scheduling-link/meeting/${encodeURIComponent(String(meetingId))}`,
    {
      context,
      query: options?.query,
    },
  );
}

export async function updateSchedulingLinkMeeting(
  meetingId: SchedulingLinkId,
  payload: Record<string, unknown>,
): Promise<unknown> {
  const context = `updateSchedulingLinkMeeting(meetingId=${String(meetingId)})`;
  return reclaimHttpClient.patch<unknown>(
    `/scheduling-link/meeting/${encodeURIComponent(String(meetingId))}`,
    cleanUndefined(payload),
    { context },
  );
}

export async function deleteSchedulingLinkMeeting(
  meetingId: SchedulingLinkId,
): Promise<void> {
  const context = `deleteSchedulingLinkMeeting(meetingId=${String(meetingId)})`;
  await reclaimHttpClient.delete(
    `/scheduling-link/meeting/${encodeURIComponent(String(meetingId))}`,
    { context },
  );
}

export async function refreshSchedulingLinkMeeting(
  meetingId: SchedulingLinkId,
): Promise<unknown> {
  const context = `refreshSchedulingLinkMeeting(meetingId=${String(meetingId)})`;
  return reclaimHttpClient.get<unknown>(
    `/scheduling-link/refresh-meeting/${encodeURIComponent(String(meetingId))}`,
    { context },
  );
}

export async function getParticipantResolution(
  options?: SchedulingLinkRequestOptions,
): Promise<ParticipantResolution[]> {
  const context = "getParticipantResolution";
  const data = await reclaimHttpClient.get<
    ParticipantResolution[] | ParticipantResolution
  >("/participant-resolution", {
    context,
    query: options?.query,
  });
  return toArray(data);
}

export async function getParticipantResolutionForSchedulingLink(
  options?: SchedulingLinkRequestOptions,
): Promise<ParticipantResolution[]> {
  const context = "getParticipantResolutionForSchedulingLink";
  const data = await reclaimHttpClient.get<
    ParticipantResolution[] | ParticipantResolution
  >("/participant-resolution/scheduling-link", {
    context,
    query: options?.query,
  });
  return toArray(data);
}
