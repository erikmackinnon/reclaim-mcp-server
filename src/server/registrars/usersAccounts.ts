import { registerUsersAccountsTools } from "../../tools/usersAccounts.js";

import type { DomainRegistrar } from "./types.js";

export const usersAccountsDomainRegistrar: DomainRegistrar = {
  domain: "users_accounts",
  register(server) {
    registerUsersAccountsTools(server);
  },
};
