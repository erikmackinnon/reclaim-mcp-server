import { registerEventCalendarTools } from "../../tools/eventsCalendars.js";

import type { DomainRegistrar } from "./types.js";

export const eventsCalendarsDomainRegistrar: DomainRegistrar = {
  domain: "events_calendars",
  register(server) {
    registerEventCalendarTools(server);
  },
};
