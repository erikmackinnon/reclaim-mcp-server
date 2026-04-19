import { registerSmartMeetingTools } from "../../tools/smartMeetings.js";

import type { DomainRegistrar } from "./types.js";

export const smartMeetingDomainRegistrar: DomainRegistrar = {
  domain: "smart_meetings",
  register(server) {
    registerSmartMeetingTools(server);
  },
};
