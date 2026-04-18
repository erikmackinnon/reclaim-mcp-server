import { registerHabitTools } from "../../tools/habits.js";

import type { DomainRegistrar } from "./types.js";

export const habitDomainRegistrar: DomainRegistrar = {
  domain: "habits",
  register(server) {
    registerHabitTools(server);
  },
};
