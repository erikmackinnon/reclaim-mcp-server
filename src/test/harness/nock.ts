import nock, { type Scope } from "nock";
import { afterEach, beforeEach, expect } from "vitest";

const RECLAIM_API_ORIGIN = "https://api.app.reclaim.ai";
const RECLAIM_API_PREFIX = "/api";

export function reclaimApiPath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${RECLAIM_API_PREFIX}${normalized}`;
}

export function reclaimApiScope(): Scope {
  return nock(RECLAIM_API_ORIGIN).matchHeader("authorization", /^Bearer\s.+$/);
}

export function installNockLifecycle(): void {
  beforeEach(() => {
    nock.disableNetConnect();
    nock.cleanAll();
  });

  afterEach(() => {
    const pending = nock.pendingMocks();
    nock.cleanAll();
    nock.enableNetConnect();
    expect(pending).toEqual([]);
  });
}

export function mockCurrentUser(response: Record<string, unknown> = {}): Scope {
  return reclaimApiScope()
    .get(reclaimApiPath("/users/current"))
    .reply(200, response);
}
