import { registerTaskResources } from "../../resources/tasks.js";
import { registerTaskActionTools } from "../../tools/taskActions.js";
import { registerTaskCrudTools } from "../../tools/taskCrud.js";

import type { DomainRegistrar } from "./types.js";

export const taskDomainRegistrar: DomainRegistrar = {
  domain: "tasks",
  register(server) {
    registerTaskActionTools(server);
    registerTaskCrudTools(server);
    registerTaskResources(server);
  },
};
