import { createRequire } from "node:module";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerDomainRegistrars } from "./registrars/index.js";

const require = createRequire(import.meta.url);
let pkg: any;
try {
  pkg = require("../../package.json");
} catch (error) {
  console.error(
    "Could not read package.json, using default server info.",
    error,
  );
  pkg = {};
}

const publisher =
  typeof pkg.author === "string"
    ? pkg.author
    : (pkg.author?.name as string | undefined);

export const serverInfo = {
  name: pkg.name || "reclaim-mcp-server",
  version: pkg.version || "0.0.0",
  publisher: publisher || "Unknown Publisher",
  homepage: pkg.homepage || undefined,
  supportUrl: pkg.bugs?.url || undefined,
  description: pkg.description || "MCP Server for Reclaim.ai Tasks",
};

export function createServer(): McpServer {
  const server = new McpServer(serverInfo);
  registerDomainRegistrars(server);
  return server;
}
