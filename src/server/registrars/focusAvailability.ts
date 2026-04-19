import { registerFocusAvailabilityTools } from "../../tools/focusAvailability.js";

import type { DomainRegistrar } from "./types.js";

export const focusAvailabilityDomainRegistrar: DomainRegistrar = {
  domain: "focus_availability",
  register(server) {
    registerFocusAvailabilityTools(server);
  },
};
