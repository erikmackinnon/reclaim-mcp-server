import { registerCuratedResources } from "../../resources/curated.js";
import { registerRawApiTool } from "../../tools/rawApi.js";

import type { DomainRegistrar } from "./types.js";

export const curatedFallbackRegistrar: DomainRegistrar = {
  domain: "curated_fallback",
  register(server) {
    registerRawApiTool(server);
    registerCuratedResources(server);
  },
};
