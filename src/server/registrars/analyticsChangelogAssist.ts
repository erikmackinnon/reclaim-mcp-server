import { registerAnalyticsChangelogAssistTools } from "../../tools/analyticsChangelogAssist.js";

import type { DomainRegistrar } from "./types.js";

export const analyticsChangelogAssistDomainRegistrar: DomainRegistrar = {
  domain: "analytics_changelog_assist",
  register(server) {
    registerAnalyticsChangelogAssistTools(server);
  },
};
