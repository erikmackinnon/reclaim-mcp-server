import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { expectNormalizedReclaimError } from "../../../test/harness/assertions.js";
import {
  installNockLifecycle,
  reclaimApiPath,
  reclaimApiScope,
} from "../../../test/harness/nock.js";
import {
  checkSchedulingLinkSlugExists,
  checkSchedulingLinkUserSlugExists,
  createSchedulingLink,
  createSchedulingLinkDerivative,
  createSchedulingLinkGroup,
  createSchedulingLinkUserSlug,
  deleteSchedulingLink,
  deleteSchedulingLinkGroup,
  deleteSchedulingLinkMeeting,
  getParticipantResolution,
  getParticipantResolutionForSchedulingLink,
  getSchedulingLink,
  getSchedulingLinkEffectiveTimePolicy,
  getSchedulingLinkForUserLinkSlug,
  getSchedulingLinkForUserSlug,
  getSchedulingLinkGroupBySlug,
  getSchedulingLinkMeeting,
  getSchedulingLinkUserSlug,
  listRecentSchedulingLinks,
  listSchedulingLinkGroups,
  listSchedulingLinks,
  listSchedulingLinkUserSlugs,
  refreshSchedulingLinkMeeting,
  updateSchedulingLink,
  updateSchedulingLinkGroup,
  updateSchedulingLinkMeeting,
} from "./client.js";

const ORIGINAL_API_KEY = process.env.RECLAIM_API_KEY;

installNockLifecycle();

describe("scheduling links domain client contracts", () => {
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

  it("covers scheduling link list/create/core CRUD routes", async () => {
    reclaimApiScope()
      .get(reclaimApiPath("/scheduling-link"))
      .query({ limit: 10 })
      .reply(200, [{ id: 42, slug: "team-sync" }]);

    reclaimApiScope()
      .post(
        reclaimApiPath("/scheduling-link"),
        (body: Record<string, unknown>) =>
          body.slug === "team-sync" && body.durationMinutes === 30,
      )
      .query({ teamId: 7 })
      .reply(200, { id: 42, slug: "team-sync" });

    reclaimApiScope()
      .get(reclaimApiPath("/scheduling-link/42"))
      .reply(200, { id: 42, slug: "team-sync" });

    reclaimApiScope()
      .patch(reclaimApiPath("/scheduling-link/42"), {
        slug: "team-sync-updated",
      })
      .query({ propagate: true })
      .reply(200, { id: 42, slug: "team-sync-updated" });

    reclaimApiScope()
      .delete(reclaimApiPath("/scheduling-link/42"))
      .query({ hardDelete: false })
      .reply(204);

    const links = await listSchedulingLinks({ query: { limit: 10 } });
    expect(links).toHaveLength(1);
    expect(links[0]?.id).toBe(42);

    const created = await createSchedulingLink(
      { slug: "team-sync", durationMinutes: 30 },
      { query: { teamId: 7 } },
    );
    expect(created.slug).toBe("team-sync");

    const fetched = await getSchedulingLink(42);
    expect(fetched.id).toBe(42);

    const updated = await updateSchedulingLink(
      42,
      { slug: "team-sync-updated" },
      { query: { propagate: true } },
    );
    expect(updated.slug).toBe("team-sync-updated");

    await deleteSchedulingLink(42, { query: { hardDelete: false } });
  });

  it("covers derivative, effective-time-policy, and slug helper routes", async () => {
    reclaimApiScope()
      .post(
        reclaimApiPath("/scheduling-link/derivative"),
        (body: Record<string, unknown>) => body.schedulingLinkId === 42,
      )
      .reply(200, { derived: true });

    reclaimApiScope()
      .post(
        reclaimApiPath("/scheduling-link/effective-time-policy"),
        (body: Record<string, unknown>) => body.schedulingLinkId === 42,
      )
      .reply(200, { timeSchemeId: "ts-123" });

    reclaimApiScope()
      .get(reclaimApiPath("/scheduling-link/for-user-link-slug"))
      .query({ slug: "owner/demo" })
      .reply(200, { schedulingLinkId: 42 });

    reclaimApiScope()
      .get(reclaimApiPath("/scheduling-link/for-user-slug/88"))
      .query({ includeInactive: false })
      .reply(200, { userId: 88, links: [42] });

    reclaimApiScope()
      .get(reclaimApiPath("/scheduling-link/recent"))
      .query({ limit: 5 })
      .reply(200, [{ id: 42 }, { id: 43 }]);

    reclaimApiScope()
      .get(reclaimApiPath("/scheduling-link/slug-exists"))
      .query({ slug: "team-sync" })
      .reply(200, { exists: true });

    const derivative = await createSchedulingLinkDerivative({
      schedulingLinkId: 42,
    });
    expect(derivative).toEqual({ derived: true });

    const policy = await getSchedulingLinkEffectiveTimePolicy({
      schedulingLinkId: 42,
    });
    expect(policy).toEqual({ timeSchemeId: "ts-123" });

    const userLinkSlug = await getSchedulingLinkForUserLinkSlug({
      query: { slug: "owner/demo" },
    });
    expect(userLinkSlug).toEqual({ schedulingLinkId: 42 });

    const userSlug = await getSchedulingLinkForUserSlug(88, {
      query: { includeInactive: false },
    });
    expect(userSlug).toEqual({ userId: 88, links: [42] });

    const recent = await listRecentSchedulingLinks({ query: { limit: 5 } });
    expect(recent).toHaveLength(2);

    const slugExists = await checkSchedulingLinkSlugExists({
      query: { slug: "team-sync" },
    });
    expect(slugExists).toEqual({ exists: true });
  });

  it("covers user slug routes and user-slug existence lookups", async () => {
    reclaimApiScope()
      .get(reclaimApiPath("/scheduling-link/user-slug"))
      .reply(200, [{ id: "alpha-1", slug: "alpha" }]);

    reclaimApiScope()
      .post(
        reclaimApiPath("/scheduling-link/user-slug"),
        (body: Record<string, unknown>) => body.slug === "alpha",
      )
      .reply(200, { id: "alpha-1", slug: "alpha" });

    reclaimApiScope()
      .get(reclaimApiPath("/scheduling-link/user-slug/alpha-1"))
      .reply(200, { id: "alpha-1", slug: "alpha" });

    reclaimApiScope()
      .get(reclaimApiPath("/scheduling-link/user-slug/exists"))
      .query({ slug: "alpha" })
      .reply(200, { exists: true });

    const userSlugs = await listSchedulingLinkUserSlugs();
    expect(userSlugs).toHaveLength(1);

    const createdUserSlug = await createSchedulingLinkUserSlug({
      slug: "alpha",
    });
    expect(createdUserSlug.id).toBe("alpha-1");

    const fetchedUserSlug = await getSchedulingLinkUserSlug("alpha-1");
    expect(fetchedUserSlug.slug).toBe("alpha");

    const userSlugExists = await checkSchedulingLinkUserSlugExists({
      query: { slug: "alpha" },
    });
    expect(userSlugExists).toEqual({ exists: true });
  });

  it("covers group scheduling link routes", async () => {
    reclaimApiScope()
      .get(reclaimApiPath("/scheduling-link/group"))
      .reply(200, [{ id: 22, slug: "eng" }]);

    reclaimApiScope()
      .post(
        reclaimApiPath("/scheduling-link/group"),
        (body: Record<string, unknown>) => body.slug === "eng",
      )
      .reply(200, { id: 22, slug: "eng" });

    reclaimApiScope()
      .get(reclaimApiPath("/scheduling-link/group-by-slug/eng"))
      .reply(200, { id: 22, slug: "eng" });

    reclaimApiScope()
      .patch(reclaimApiPath("/scheduling-link/group/22"), {
        slug: "eng-updated",
      })
      .reply(200, { id: 22, slug: "eng-updated" });

    reclaimApiScope()
      .delete(reclaimApiPath("/scheduling-link/group/22"))
      .reply(204);

    const groups = await listSchedulingLinkGroups();
    expect(groups).toHaveLength(1);

    const createdGroup = await createSchedulingLinkGroup({ slug: "eng" });
    expect(createdGroup.id).toBe(22);

    const groupBySlug = await getSchedulingLinkGroupBySlug("eng");
    expect(groupBySlug.slug).toBe("eng");

    const updatedGroup = await updateSchedulingLinkGroup(22, {
      slug: "eng-updated",
    });
    expect(updatedGroup.slug).toBe("eng-updated");

    await deleteSchedulingLinkGroup(22);
  });

  it("covers meeting and participant-resolution scheduling routes", async () => {
    reclaimApiScope()
      .get(reclaimApiPath("/scheduling-link/meeting/303"))
      .query({ includeAvailability: true })
      .reply(200, { id: 303, status: "active" });

    reclaimApiScope()
      .patch(reclaimApiPath("/scheduling-link/meeting/303"), {
        notes: "updated",
      })
      .reply(200, { id: 303, notes: "updated" });

    reclaimApiScope()
      .delete(reclaimApiPath("/scheduling-link/meeting/303"))
      .reply(204);

    reclaimApiScope()
      .get(reclaimApiPath("/scheduling-link/refresh-meeting/303"))
      .reply(200, { id: 303, refreshed: true });

    reclaimApiScope()
      .get(reclaimApiPath("/participant-resolution"))
      .query({ query: "alex@example.com" })
      .reply(200, [{ participantId: 1 }]);

    reclaimApiScope()
      .get(reclaimApiPath("/participant-resolution/scheduling-link"))
      .query({ schedulingLinkId: 42 })
      .reply(200, [{ participantId: 2 }]);

    const meeting = await getSchedulingLinkMeeting(303, {
      query: { includeAvailability: true },
    });
    expect(meeting).toEqual({ id: 303, status: "active" });

    const updatedMeeting = await updateSchedulingLinkMeeting(303, {
      notes: "updated",
    });
    expect(updatedMeeting).toEqual({ id: 303, notes: "updated" });

    await deleteSchedulingLinkMeeting(303);

    const refreshedMeeting = await refreshSchedulingLinkMeeting(303);
    expect(refreshedMeeting).toEqual({ id: 303, refreshed: true });

    const participantResolution = await getParticipantResolution({
      query: { query: "alex@example.com" },
    });
    expect(participantResolution).toHaveLength(1);

    const participantResolutionByLink =
      await getParticipantResolutionForSchedulingLink({
        query: { schedulingLinkId: 42 },
      });
    expect(participantResolutionByLink).toHaveLength(1);
  });

  it("normalizes axios errors for scheduling link retrieval requests", async () => {
    reclaimApiScope()
      .get(reclaimApiPath("/scheduling-link/missing"))
      .reply(404, { message: "Not Found" });

    try {
      await getSchedulingLink("missing");
      throw new Error("Expected getSchedulingLink to throw");
    } catch (error: unknown) {
      expectNormalizedReclaimError(error, {
        context: "getSchedulingLink(schedulingLinkId=missing)",
        messageFragment: "Not Found",
        status: 404,
        detailMatcher: { message: "Not Found" },
      });
    }
  });
});
