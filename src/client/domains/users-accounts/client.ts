import {
  normalizeQueryParams,
  reclaimHttpClient,
  type QueryParams,
} from "../../core/http.js";
import {
  type Account,
  type Credential,
  type DelegatedAccess,
  type UserAccessRecord,
  type UserContact,
  type UserProfile,
} from "../../../types/reclaim.js";

type UsersAccountsRequestOptions = {
  query?: QueryParams;
};

type UsersAccountsId = number | string;

type UnknownRecord = Record<string, unknown>;

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

function normalizeOptionsQuery(
  options?: UsersAccountsRequestOptions,
): QueryParams | undefined {
  return normalizeQueryParams(options?.query);
}

function toPathId(value: UsersAccountsId): string {
  return encodeURIComponent(String(value));
}

export async function getCurrentUser(
  options?: UsersAccountsRequestOptions,
): Promise<UserProfile> {
  const context = "getCurrentUser";
  return reclaimHttpClient.get<UserProfile>("/users/current", {
    context,
    query: normalizeOptionsQuery(options),
  });
}

export async function updateCurrentUser(
  payload: UnknownRecord,
  options?: UsersAccountsRequestOptions,
): Promise<UserProfile> {
  const context = "updateCurrentUser";
  return reclaimHttpClient.patch<UserProfile>(
    "/users/current",
    cleanUndefined(payload),
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );
}

export async function listCurrentUserAccess(
  options?: UsersAccountsRequestOptions,
): Promise<UserAccessRecord[]> {
  const context = "listCurrentUserAccess";
  const data = await reclaimHttpClient.get<
    UserAccessRecord[] | UserAccessRecord
  >("/users/current/access", {
    context,
    query: normalizeOptionsQuery(options),
  });

  return toArray(data);
}

export async function getCurrentUserAccess(
  accessId: UsersAccountsId,
  options?: UsersAccountsRequestOptions,
): Promise<UserAccessRecord> {
  const context = `getCurrentUserAccess(accessId=${String(accessId)})`;
  return reclaimHttpClient.get<UserAccessRecord>(
    `/users/current/access/${toPathId(accessId)}`,
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );
}

export async function listCurrentUserContacts(
  options?: UsersAccountsRequestOptions,
): Promise<UserContact[]> {
  const context = "listCurrentUserContacts";
  const data = await reclaimHttpClient.get<UserContact[] | UserContact>(
    "/users/current/contacts",
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );

  return toArray(data);
}

export async function inviteCurrentUserContact(
  payload: UnknownRecord,
  options?: UsersAccountsRequestOptions,
): Promise<UnknownRecord> {
  const context = "inviteCurrentUserContact";
  return reclaimHttpClient.post<UnknownRecord>(
    "/users/current/contacts/invite",
    cleanUndefined(payload),
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );
}

export async function inviteCurrentUserContactV2(
  payload: UnknownRecord,
  options?: UsersAccountsRequestOptions,
): Promise<UnknownRecord> {
  const context = "inviteCurrentUserContactV2";
  return reclaimHttpClient.post<UnknownRecord>(
    "/users/current/contacts/invite/v2",
    cleanUndefined(payload),
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );
}

export async function listCurrentUserContactsV2(
  options?: UsersAccountsRequestOptions,
): Promise<UserContact[]> {
  const context = "listCurrentUserContactsV2";
  const data = await reclaimHttpClient.get<UserContact[] | UserContact>(
    "/users/current/contacts/v2",
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );

  return toArray(data);
}

export async function listCurrentUserContactsV3(
  options?: UsersAccountsRequestOptions,
): Promise<UserContact[]> {
  const context = "listCurrentUserContactsV3";
  const data = await reclaimHttpClient.get<UserContact[] | UserContact>(
    "/users/current/contacts/v3",
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );

  return toArray(data);
}

export async function getCurrentUserProductUsage(
  options?: UsersAccountsRequestOptions,
): Promise<UnknownRecord> {
  const context = "getCurrentUserProductUsage";
  return reclaimHttpClient.get<UnknownRecord>("/users/current/product-usage", {
    context,
    query: normalizeOptionsQuery(options),
  });
}

export async function getCurrentUserTimePolicies(
  options?: UsersAccountsRequestOptions,
): Promise<UnknownRecord> {
  const context = "getCurrentUserTimePolicies";
  return reclaimHttpClient.get<UnknownRecord>("/users/current/timePolicies", {
    context,
    query: normalizeOptionsQuery(options),
  });
}

export async function updateCurrentUserTimePolicies(
  payload: UnknownRecord,
  options?: UsersAccountsRequestOptions,
): Promise<UnknownRecord> {
  const context = "updateCurrentUserTimePolicies";
  return reclaimHttpClient.patch<UnknownRecord>(
    "/users/current/timePolicies",
    cleanUndefined(payload),
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );
}

export async function updateCurrentUserTimezoneSettings(
  payload: UnknownRecord,
  options?: UsersAccountsRequestOptions,
): Promise<UnknownRecord> {
  const context = "updateCurrentUserTimezoneSettings";
  return reclaimHttpClient.put<UnknownRecord>(
    "/users/current/timezone-settings",
    cleanUndefined(payload),
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );
}

export async function updateCurrentUserWeekStartSettings(
  payload: UnknownRecord,
  options?: UsersAccountsRequestOptions,
): Promise<UnknownRecord> {
  const context = "updateCurrentUserWeekStartSettings";
  return reclaimHttpClient.patch<UnknownRecord>(
    "/users/current/week-start-settings",
    cleanUndefined(payload),
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );
}

export async function updateCurrentUserFormat24HourSettings(
  payload: UnknownRecord,
  options?: UsersAccountsRequestOptions,
): Promise<UnknownRecord> {
  const context = "updateCurrentUserFormat24HourSettings";
  return reclaimHttpClient.patch<UnknownRecord>(
    "/users/current/format24hour-settings",
    cleanUndefined(payload),
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );
}

export async function getCurrentUserQuest(
  options?: UsersAccountsRequestOptions,
): Promise<UnknownRecord> {
  const context = "getCurrentUserQuest";
  return reclaimHttpClient.get<UnknownRecord>("/users/current/quest", {
    context,
    query: normalizeOptionsQuery(options),
  });
}

export async function updateCurrentUserQuest(
  payload: UnknownRecord,
  options?: UsersAccountsRequestOptions,
): Promise<UnknownRecord> {
  const context = "updateCurrentUserQuest";
  return reclaimHttpClient.patch<UnknownRecord>(
    "/users/current/quest",
    cleanUndefined(payload),
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );
}

export async function getCurrentUserReferrals(
  options?: UsersAccountsRequestOptions,
): Promise<UnknownRecord> {
  const context = "getCurrentUserReferrals";
  return reclaimHttpClient.get<UnknownRecord>("/users/current/referrals", {
    context,
    query: normalizeOptionsQuery(options),
  });
}

export async function resetCurrentUser(
  payload: UnknownRecord = {},
  options?: UsersAccountsRequestOptions,
): Promise<UnknownRecord> {
  const context = "resetCurrentUser";
  return reclaimHttpClient.post<UnknownRecord>(
    "/users/current/reset",
    cleanUndefined(payload),
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );
}

export async function getCurrentUserRestorableFeatures(
  options?: UsersAccountsRequestOptions,
): Promise<UnknownRecord> {
  const context = "getCurrentUserRestorableFeatures";
  return reclaimHttpClient.get<UnknownRecord>(
    "/users/current/restorable-features",
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );
}

export async function restoreCurrentUserFeatures(
  payload: UnknownRecord = {},
  options?: UsersAccountsRequestOptions,
): Promise<UnknownRecord> {
  const context = "restoreCurrentUserFeatures";
  return reclaimHttpClient.post<UnknownRecord>(
    "/users/current/restore-features",
    cleanUndefined(payload),
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );
}

export async function updateCurrentUserRsvpSettings(
  payload: UnknownRecord,
  options?: UsersAccountsRequestOptions,
): Promise<UnknownRecord> {
  const context = "updateCurrentUserRsvpSettings";
  return reclaimHttpClient.put<UnknownRecord>(
    "/users/current/rsvp-settings",
    cleanUndefined(payload),
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );
}

export async function listAccounts(
  options?: UsersAccountsRequestOptions,
): Promise<Account[]> {
  const context = "listAccounts";
  const data = await reclaimHttpClient.get<Account[] | Account>("/accounts", {
    context,
    query: normalizeOptionsQuery(options),
  });

  return toArray(data);
}

export async function listAccountCalendars(
  options?: UsersAccountsRequestOptions,
): Promise<UnknownRecord[]> {
  const context = "listAccountCalendars";
  const data = await reclaimHttpClient.get<UnknownRecord[] | UnknownRecord>(
    "/accounts/calendars",
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );

  return toArray(data);
}

export async function validateAccount(
  payload: UnknownRecord,
  options?: UsersAccountsRequestOptions,
): Promise<UnknownRecord> {
  const context = "validateAccount";
  return reclaimHttpClient.post<UnknownRecord>(
    "/accounts/validate",
    cleanUndefined(payload),
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );
}

export async function deleteAccount(
  accountId: UsersAccountsId,
  options?: UsersAccountsRequestOptions,
): Promise<void> {
  const context = `deleteAccount(accountId=${String(accountId)})`;
  await reclaimHttpClient.delete(`/accounts/${toPathId(accountId)}`, {
    context,
    query: normalizeOptionsQuery(options),
  });
}

export async function listCredentials(
  options?: UsersAccountsRequestOptions,
): Promise<Credential[]> {
  const context = "listCredentials";
  const data = await reclaimHttpClient.get<Credential[] | Credential>(
    "/credentials",
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );

  return toArray(data);
}

export async function getPrimaryCredential(
  options?: UsersAccountsRequestOptions,
): Promise<Credential> {
  const context = "getPrimaryCredential";
  return reclaimHttpClient.get<Credential>("/credentials/primary", {
    context,
    query: normalizeOptionsQuery(options),
  });
}

export async function listPersonalCredentials(
  options?: UsersAccountsRequestOptions,
): Promise<Credential[]> {
  const context = "listPersonalCredentials";
  const data = await reclaimHttpClient.get<Credential[] | Credential>(
    "/credentials/personal",
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );

  return toArray(data);
}

export async function getCredential(
  credentialId: UsersAccountsId,
  options?: UsersAccountsRequestOptions,
): Promise<Credential> {
  const context = `getCredential(credentialId=${String(credentialId)})`;
  return reclaimHttpClient.get<Credential>(
    `/credentials/${toPathId(credentialId)}`,
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );
}

export async function deleteCredential(
  credentialId: UsersAccountsId,
  options?: UsersAccountsRequestOptions,
): Promise<void> {
  const context = `deleteCredential(credentialId=${String(credentialId)})`;
  await reclaimHttpClient.delete(`/credentials/${toPathId(credentialId)}`, {
    context,
    query: normalizeOptionsQuery(options),
  });
}

export async function listDelegatedAccess(
  options?: UsersAccountsRequestOptions,
): Promise<DelegatedAccess[]> {
  const context = "listDelegatedAccess";
  const data = await reclaimHttpClient.get<DelegatedAccess[] | DelegatedAccess>(
    "/delegated-access",
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );

  return toArray(data);
}

export async function createDelegatedAccess(
  payload: UnknownRecord,
  options?: UsersAccountsRequestOptions,
): Promise<DelegatedAccess> {
  const context = "createDelegatedAccess";
  return reclaimHttpClient.post<DelegatedAccess>(
    "/delegated-access",
    cleanUndefined(payload),
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );
}

export async function getDelegatedAccessAllowed(
  options?: UsersAccountsRequestOptions,
): Promise<UnknownRecord> {
  const context = "getDelegatedAccessAllowed";
  return reclaimHttpClient.get<UnknownRecord>("/delegated-access/allowed", {
    context,
    query: normalizeOptionsQuery(options),
  });
}

export async function toggleDelegatedAccess(
  delegatedAccessId: UsersAccountsId,
  payload: UnknownRecord = {},
  options?: UsersAccountsRequestOptions,
): Promise<DelegatedAccess> {
  const context = `toggleDelegatedAccess(delegatedAccessId=${String(delegatedAccessId)})`;
  return reclaimHttpClient.put<DelegatedAccess>(
    `/delegated-access/toggle/${toPathId(delegatedAccessId)}`,
    cleanUndefined(payload),
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );
}

export async function deleteDelegatedAccess(
  delegatedAccessId: UsersAccountsId,
  options?: UsersAccountsRequestOptions,
): Promise<void> {
  const context = `deleteDelegatedAccess(delegatedAccessId=${String(delegatedAccessId)})`;
  await reclaimHttpClient.delete(
    `/delegated-access/${toPathId(delegatedAccessId)}`,
    {
      context,
      query: normalizeOptionsQuery(options),
    },
  );
}
