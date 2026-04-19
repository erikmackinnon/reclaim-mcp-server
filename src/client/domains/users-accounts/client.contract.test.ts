import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  installNockLifecycle,
  reclaimApiPath,
  reclaimApiScope,
} from "../../../test/harness/nock.js";
import {
  createDelegatedAccess,
  deleteAccount,
  deleteCredential,
  deleteDelegatedAccess,
  getCredential,
  getCurrentUser,
  getCurrentUserAccess,
  getCurrentUserProductUsage,
  getCurrentUserQuest,
  getCurrentUserReferrals,
  getCurrentUserRestorableFeatures,
  getCurrentUserTimePolicies,
  getDelegatedAccessAllowed,
  getPrimaryCredential,
  inviteCurrentUserContact,
  inviteCurrentUserContactV2,
  listAccountCalendars,
  listAccounts,
  listCredentials,
  listCurrentUserAccess,
  listCurrentUserContacts,
  listCurrentUserContactsV2,
  listCurrentUserContactsV3,
  listDelegatedAccess,
  listPersonalCredentials,
  resetCurrentUser,
  restoreCurrentUserFeatures,
  toggleDelegatedAccess,
  updateCurrentUser,
  updateCurrentUserFormat24HourSettings,
  updateCurrentUserQuest,
  updateCurrentUserRsvpSettings,
  updateCurrentUserTimePolicies,
  updateCurrentUserTimezoneSettings,
  updateCurrentUserWeekStartSettings,
  validateAccount,
} from "./client.js";

const ORIGINAL_API_KEY = process.env.RECLAIM_API_KEY;

installNockLifecycle();

describe("users/accounts domain client contracts", () => {
  beforeEach(() => {
    process.env.RECLAIM_API_KEY = "test-token";
  });

  afterEach(() => {
    if (ORIGINAL_API_KEY === undefined) {
      delete process.env.RECLAIM_API_KEY;
    } else {
      process.env.RECLAIM_API_KEY = ORIGINAL_API_KEY;
    }
  });

  it("covers self-service current-user profile/settings routes", async () => {
    reclaimApiScope()
      .get(reclaimApiPath("/users/current"))
      .query({ expand: "settings" })
      .reply(200, { id: 7, email: "alex@example.com" });

    reclaimApiScope()
      .patch(
        reclaimApiPath("/users/current"),
        (body: Record<string, unknown>) =>
          body.displayName === "Alex" && !("omitMe" in body),
      )
      .query({ source: "mcp" })
      .reply(200, { id: 7, displayName: "Alex" });

    reclaimApiScope()
      .get(reclaimApiPath("/users/current/access"))
      .query({ limit: 2 })
      .reply(200, [{ id: "acc-1" }]);

    reclaimApiScope()
      .get(reclaimApiPath("/users/current/access/acc-1"))
      .query({ includeCredentials: true })
      .reply(200, { id: "acc-1", accountId: 42 });

    reclaimApiScope()
      .get(reclaimApiPath("/users/current/contacts"))
      .query({ q: "alex" })
      .reply(200, [{ id: 1, email: "alex@example.com" }]);

    reclaimApiScope()
      .post(
        reclaimApiPath("/users/current/contacts/invite"),
        (body: Record<string, unknown>) =>
          body.email === "teammate@example.com" && !("unused" in body),
      )
      .query({ sendEmail: true })
      .reply(200, { invited: 1 });

    reclaimApiScope()
      .post(
        reclaimApiPath("/users/current/contacts/invite/v2"),
        (body: Record<string, unknown>) =>
          Array.isArray(body.emails) && (body.emails as string[]).length === 2,
      )
      .query({ suppressNotification: false })
      .reply(200, { invited: 2 });

    reclaimApiScope()
      .get(reclaimApiPath("/users/current/contacts/v2"))
      .query({ limit: 50 })
      .reply(200, [{ id: 2, email: "casey@example.com" }]);

    reclaimApiScope()
      .get(reclaimApiPath("/users/current/contacts/v3"))
      .query({ limit: 100 })
      .reply(200, [{ id: 3, email: "jordan@example.com" }]);

    reclaimApiScope()
      .get(reclaimApiPath("/users/current/product-usage"))
      .query({ window: "30d" })
      .reply(200, { usage: 23 });

    reclaimApiScope()
      .get(reclaimApiPath("/users/current/timePolicies"))
      .query({ includeInherited: true })
      .reply(200, { policy: "default" });

    reclaimApiScope()
      .patch(
        reclaimApiPath("/users/current/timePolicies"),
        (body: Record<string, unknown>) => body.focusTimeMinHours === 2,
      )
      .query({ dryRun: false })
      .reply(200, { updated: true });

    reclaimApiScope()
      .put(
        reclaimApiPath("/users/current/timezone-settings"),
        (body: Record<string, unknown>) =>
          body.timezone === "America/Chicago" && !("empty" in body),
      )
      .query({ propagate: true })
      .reply(200, { timezone: "America/Chicago" });

    reclaimApiScope()
      .patch(reclaimApiPath("/users/current/week-start-settings"), {
        weekStart: "monday",
      })
      .query({})
      .reply(200, { weekStart: "monday" });

    reclaimApiScope()
      .patch(reclaimApiPath("/users/current/format24hour-settings"), {
        format24Hour: true,
      })
      .query({})
      .reply(200, { format24Hour: true });

    reclaimApiScope()
      .get(reclaimApiPath("/users/current/quest"))
      .query({ includeHistory: false })
      .reply(200, { level: 5 });

    reclaimApiScope()
      .patch(reclaimApiPath("/users/current/quest"), {
        acknowledged: true,
      })
      .query({ source: "mcp" })
      .reply(200, { acknowledged: true });

    reclaimApiScope()
      .get(reclaimApiPath("/users/current/referrals"))
      .query({ limit: 10 })
      .reply(200, { count: 3 });

    reclaimApiScope()
      .post(reclaimApiPath("/users/current/reset"), {})
      .query({ dryRun: true })
      .reply(200, { reset: true });

    reclaimApiScope()
      .get(reclaimApiPath("/users/current/restorable-features"))
      .query({ includeDisabled: true })
      .reply(200, { features: ["focus"] });

    reclaimApiScope()
      .post(reclaimApiPath("/users/current/restore-features"), {
        featureIds: ["focus"],
      })
      .query({})
      .reply(200, { restored: 1 });

    reclaimApiScope()
      .put(reclaimApiPath("/users/current/rsvp-settings"), {
        autoDecline: true,
      })
      .query({})
      .reply(200, { autoDecline: true });

    const user = await getCurrentUser({
      query: { expand: "settings", ignored: undefined },
    });
    expect(user.id).toBe(7);

    const updatedUser = await updateCurrentUser(
      {
        displayName: "Alex",
        omitMe: undefined,
      },
      { query: { source: "mcp" } },
    );
    expect(updatedUser.displayName).toBe("Alex");

    const accessList = await listCurrentUserAccess({ query: { limit: 2 } });
    expect(accessList).toHaveLength(1);

    const access = await getCurrentUserAccess("acc-1", {
      query: { includeCredentials: true },
    });
    expect(access.accountId).toBe(42);

    const contacts = await listCurrentUserContacts({ query: { q: "alex" } });
    expect(contacts[0]?.email).toBe("alex@example.com");

    const inviteResult = await inviteCurrentUserContact(
      { email: "teammate@example.com", unused: undefined },
      { query: { sendEmail: true } },
    );
    expect(inviteResult).toEqual({ invited: 1 });

    const inviteV2Result = await inviteCurrentUserContactV2(
      {
        emails: ["one@example.com", "two@example.com"],
      },
      { query: { suppressNotification: false } },
    );
    expect(inviteV2Result).toEqual({ invited: 2 });

    const contactsV2 = await listCurrentUserContactsV2({
      query: { limit: 50 },
    });
    expect(contactsV2[0]?.id).toBe(2);

    const contactsV3 = await listCurrentUserContactsV3({
      query: { limit: 100 },
    });
    expect(contactsV3[0]?.id).toBe(3);

    const usage = await getCurrentUserProductUsage({ query: { window: "30d" } });
    expect(usage).toEqual({ usage: 23 });

    const policies = await getCurrentUserTimePolicies({
      query: { includeInherited: true },
    });
    expect(policies).toEqual({ policy: "default" });

    const updatedPolicies = await updateCurrentUserTimePolicies(
      { focusTimeMinHours: 2 },
      { query: { dryRun: false } },
    );
    expect(updatedPolicies).toEqual({ updated: true });

    const timezoneSettings = await updateCurrentUserTimezoneSettings(
      {
        timezone: "America/Chicago",
        empty: undefined,
      },
      { query: { propagate: true } },
    );
    expect(timezoneSettings).toEqual({ timezone: "America/Chicago" });

    const weekStart = await updateCurrentUserWeekStartSettings({
      weekStart: "monday",
    });
    expect(weekStart).toEqual({ weekStart: "monday" });

    const format24 = await updateCurrentUserFormat24HourSettings({
      format24Hour: true,
    });
    expect(format24).toEqual({ format24Hour: true });

    const quest = await getCurrentUserQuest({ query: { includeHistory: false } });
    expect(quest).toEqual({ level: 5 });

    const updatedQuest = await updateCurrentUserQuest(
      { acknowledged: true },
      { query: { source: "mcp" } },
    );
    expect(updatedQuest).toEqual({ acknowledged: true });

    const referrals = await getCurrentUserReferrals({ query: { limit: 10 } });
    expect(referrals).toEqual({ count: 3 });

    const reset = await resetCurrentUser({}, { query: { dryRun: true } });
    expect(reset).toEqual({ reset: true });

    const restorableFeatures = await getCurrentUserRestorableFeatures({
      query: { includeDisabled: true },
    });
    expect(restorableFeatures).toEqual({ features: ["focus"] });

    const restoredFeatures = await restoreCurrentUserFeatures({
      featureIds: ["focus"],
    });
    expect(restoredFeatures).toEqual({ restored: 1 });

    const rsvp = await updateCurrentUserRsvpSettings({ autoDecline: true });
    expect(rsvp).toEqual({ autoDecline: true });
  });

  it("covers account, credential, and delegated-access routes", async () => {
    reclaimApiScope()
      .get(reclaimApiPath("/accounts"))
      .query({ includeDisconnected: false })
      .reply(200, [{ id: 42, provider: "google" }]);

    reclaimApiScope()
      .get(reclaimApiPath("/accounts/calendars"))
      .query({ includeHidden: true })
      .reply(200, { id: "cal-1" });

    reclaimApiScope()
      .post(
        reclaimApiPath("/accounts/validate"),
        (body: Record<string, unknown>) =>
          body.provider === "google" && !("omitMe" in body),
      )
      .query({ dryRun: true })
      .reply(200, { valid: true });

    reclaimApiScope()
      .delete(reclaimApiPath("/accounts/42"))
      .query({ force: false })
      .reply(204);

    reclaimApiScope()
      .get(reclaimApiPath("/credentials"))
      .query({ includeExpired: false })
      .reply(200, [{ id: 9 }]);

    reclaimApiScope()
      .get(reclaimApiPath("/credentials/primary"))
      .query({ includeMeta: true })
      .reply(200, { id: "primary-1" });

    reclaimApiScope()
      .get(reclaimApiPath("/credentials/personal"))
      .query({})
      .reply(200, { id: "personal-1" });

    reclaimApiScope()
      .get(reclaimApiPath("/credentials/9"))
      .query({ includeSecrets: false })
      .reply(200, { id: 9, provider: "google" });

    reclaimApiScope()
      .delete(reclaimApiPath("/credentials/9"))
      .query({ hardDelete: false })
      .reply(204);

    reclaimApiScope()
      .get(reclaimApiPath("/delegated-access"))
      .query({ includeInactive: true })
      .reply(200, { id: 11, email: "assistant@example.com" });

    reclaimApiScope()
      .post(
        reclaimApiPath("/delegated-access"),
        (body: Record<string, unknown>) =>
          body.email === "assistant@example.com" && body.role === "editor",
      )
      .query({ notify: true })
      .reply(200, { id: 11, email: "assistant@example.com" });

    reclaimApiScope()
      .get(reclaimApiPath("/delegated-access/allowed"))
      .query({ accountId: 42 })
      .reply(200, { allowed: true });

    reclaimApiScope()
      .put(
        reclaimApiPath("/delegated-access/toggle/11"),
        (body: Record<string, unknown>) => body.enabled === false,
      )
      .query({ notify: true })
      .reply(200, { id: 11, enabled: false });

    reclaimApiScope()
      .delete(reclaimApiPath("/delegated-access/11"))
      .query({ softDelete: true })
      .reply(204);

    const accounts = await listAccounts({ query: { includeDisconnected: false } });
    expect(accounts[0]?.id).toBe(42);

    const accountCalendars = await listAccountCalendars({
      query: { includeHidden: true },
    });
    expect(accountCalendars).toHaveLength(1);

    const accountValidation = await validateAccount(
      {
        provider: "google",
        omitMe: undefined,
      },
      { query: { dryRun: true } },
    );
    expect(accountValidation).toEqual({ valid: true });

    await deleteAccount(42, { query: { force: false } });

    const credentials = await listCredentials({
      query: { includeExpired: false },
    });
    expect(credentials[0]?.id).toBe(9);

    const primaryCredential = await getPrimaryCredential({
      query: { includeMeta: true },
    });
    expect(primaryCredential.id).toBe("primary-1");

    const personalCredentials = await listPersonalCredentials();
    expect(personalCredentials).toHaveLength(1);

    const credential = await getCredential(9, {
      query: { includeSecrets: false },
    });
    expect(credential.provider).toBe("google");

    await deleteCredential(9, { query: { hardDelete: false } });

    const delegated = await listDelegatedAccess({
      query: { includeInactive: true },
    });
    expect(delegated).toHaveLength(1);

    const createdDelegated = await createDelegatedAccess(
      {
        email: "assistant@example.com",
        role: "editor",
      },
      { query: { notify: true } },
    );
    expect(createdDelegated.id).toBe(11);

    const delegatedAllowed = await getDelegatedAccessAllowed({
      query: { accountId: 42 },
    });
    expect(delegatedAllowed).toEqual({ allowed: true });

    const toggledDelegated = await toggleDelegatedAccess(
      11,
      {
        enabled: false,
      },
      { query: { notify: true } },
    );
    expect(toggledDelegated.enabled).toBe(false);

    await deleteDelegatedAccess(11, { query: { softDelete: true } });
  });
});
