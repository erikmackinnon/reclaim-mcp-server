import { registerTeamIntegrationsTools } from "../../tools/teamIntegrations.js";

import type { DomainRegistrar } from "./types.js";

export const teamIntegrationsDomainRegistrar: DomainRegistrar = {
  domain: "team_integrations",
  register(server) {
    registerTeamIntegrationsTools(server);
  },
};
