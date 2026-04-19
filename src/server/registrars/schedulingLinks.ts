import { registerSchedulingLinkTools } from "../../tools/schedulingLinks.js";

import type { DomainRegistrar } from "./types.js";

export const schedulingLinkDomainRegistrar: DomainRegistrar = {
  domain: "scheduling_links",
  register(server) {
    registerSchedulingLinkTools(server);
  },
};
