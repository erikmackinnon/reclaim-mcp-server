import { registerOneOnOneTools } from "../../tools/oneOnOnes.js";

import type { DomainRegistrar } from "./types.js";

export const oneOnOneDomainRegistrar: DomainRegistrar = {
  domain: "smart_1_1s",
  register(server) {
    registerOneOnOneTools(server);
  },
};
