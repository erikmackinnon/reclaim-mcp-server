import { registerTimePolicyTools } from "../../tools/timePolicies.js";

import type { DomainRegistrar } from "./types.js";

export const timePoliciesDomainRegistrar: DomainRegistrar = {
  domain: "time_schemes_time_windows_schedule_policies",
  register(server) {
    registerTimePolicyTools(server);
  },
};
