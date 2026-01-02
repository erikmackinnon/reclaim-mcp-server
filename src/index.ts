/**
 * @fileoverview Main entry point for the Reclaim.ai MCP Server.
 * Initializes the server, registers tools and resources, and connects the transport.
 */

import express from "express";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

import { registerTaskResources } from "./resources/tasks.js";
import { registerTaskActionTools } from "./tools/taskActions.js";
import { registerTaskCrudTools } from "./tools/taskCrud.js";
import { fetchAccountTimeZone } from "./reclaim-client.js";
import "dotenv/config"; // Load environment variables from .env file

// --- Server Information ---
// Read version from package.json (more robust than hardcoding)
const require = createRequire(import.meta.url);
let pkg: any;
try {
  // Adjust path if needed, assuming package.json is one level up from src/
  pkg = require("../package.json");
} catch (e) {
  console.error("Could not read package.json, using default server info.", e);
  pkg = {}; // Default to empty object if read fails
}

const publisher =
  typeof pkg.author === "string"
    ? pkg.author
    : (pkg.author?.name as string | undefined);

// Define the structure expected for server info (matches McpServer constructor)
const serverInfo = {
  name: pkg.name || "reclaim-mcp-server",
  version: pkg.version || "0.0.0", // Fallback version
  publisher: publisher || "Unknown Publisher",
  homepage: pkg.homepage || undefined,
  supportUrl: pkg.bugs?.url || undefined,
  description: pkg.description || "MCP Server for Reclaim.ai Tasks",
};

function ensureApiKey(): void {
  if (!process.env.RECLAIM_API_KEY) {
    console.error(
      "FATAL ERROR: RECLAIM_API_KEY environment variable is not set.",
    );
    console.error(
      "Please ensure a .env file exists in the project root and contains your Reclaim.ai API token.",
    );
    console.error("Example: RECLAIM_API_KEY=your_api_token_here");
    process.exit(1); // Exit immediately if token is missing.
  }
}

function createServer(): McpServer {
  const server = new McpServer(serverInfo);
  registerTaskActionTools(server);
  registerTaskCrudTools(server);
  registerTaskResources(server);
  return server;
}

function normalizeHttpPath(pathValue: string): string {
  if (!pathValue.startsWith("/")) {
    return `/${pathValue}`;
  }
  return pathValue;
}

function parseAllowedOrigins(rawOrigins: string | undefined): string[] {
  if (!rawOrigins) {
    return ["http://localhost", "http://127.0.0.1"];
  }
  return rawOrigins
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function isOriginAllowed(
  origin: string | undefined,
  allowedOrigins: string[],
  allowAny: boolean,
): boolean {
  if (!origin) {
    return true;
  }
  if (allowAny || allowedOrigins.includes("*")) {
    return true;
  }

  if (origin === "null") {
    return false;
  }

  return allowedOrigins.some((allowed) => {
    if (origin === allowed) {
      return true;
    }
    if (origin.startsWith(`${allowed}:`)) {
      return true;
    }
    return false;
  });
}

const corsAllowMethods = "POST, GET, DELETE, OPTIONS";
const corsAllowHeaders = [
  "Accept",
  "Content-Type",
  "Last-Event-ID",
  "MCP-Protocol-Version",
  "MCP-Session-Id",
].join(", ");
const corsExposeHeaders = "MCP-Session-Id";

function sendSessionError(
  res: express.Response,
  status: number,
  message: string,
): void {
  res.status(status).json({
    jsonrpc: "2.0",
    error: { code: -32000, message },
    id: null,
  });
}

function sendMissingSession(res: express.Response): void {
  sendSessionError(res, 400, "Missing session");
}

function sendUnknownSession(res: express.Response): void {
  sendSessionError(res, 404, "Unknown session");
}

async function bootstrapDefaultTimeZone(): Promise<void> {
  if (process.env.MCP_DEFAULT_TIMEZONE) {
    return;
  }

  try {
    const tz = await fetchAccountTimeZone();
    if (tz) {
      process.env.MCP_DEFAULT_TIMEZONE = tz;
      console.error(`Default timezone set from Reclaim account: ${tz}`);
    }
  } catch (error) {
    console.error(
      "Could not fetch Reclaim account timezone; falling back to the server machine timezone.",
      error,
    );
  }
}

async function startStdioServer(): Promise<void> {
  const server = createServer();
  void bootstrapDefaultTimeZone();
  console.error(`Server instance created for "${serverInfo.name}".`);
  console.error("Registering MCP features...");
  console.error("All tools and resources registered successfully.");
  console.error("Attempting to connect via StdioServerTransport...");

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    `✅ ${serverInfo.name} is running and connected via stdio. Listening for MCP messages on stdin...`,
  );
}

async function startHttpServer(): Promise<void> {
  const host = process.env.MCP_HTTP_HOST || "127.0.0.1";
  const port = Number(process.env.MCP_HTTP_PORT || 3000);
  const path = normalizeHttpPath(process.env.MCP_HTTP_PATH || "/mcp");
  const stateless = process.env.MCP_HTTP_STATELESS === "true";
  const allowAnyOrigin = process.env.MCP_HTTP_ALLOW_ANY_ORIGIN === "true";
  const allowedOrigins = parseAllowedOrigins(
    process.env.MCP_HTTP_ALLOWED_ORIGINS,
  );

  void bootstrapDefaultTimeZone();

  if (!Number.isFinite(port) || port <= 0) {
    console.error(
      `Invalid MCP_HTTP_PORT value "${process.env.MCP_HTTP_PORT}". Please provide a valid port number.`,
    );
    process.exit(1);
  }

  const app = express();

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (!isOriginAllowed(origin, allowedOrigins, allowAnyOrigin)) {
      res.status(403).json({
        error: "Origin not allowed",
        origin,
      });
      return;
    }

    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    } else if (allowAnyOrigin) {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }

    const requestHeaders = req.headers["access-control-request-headers"];
    res.setHeader(
      "Access-Control-Allow-Headers",
      typeof requestHeaders === "string" && requestHeaders.length > 0
        ? requestHeaders
        : corsAllowHeaders,
    );
    res.setHeader("Access-Control-Allow-Methods", corsAllowMethods);
    res.setHeader("Access-Control-Expose-Headers", corsExposeHeaders);

    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });

  app.use(express.json({ limit: "1mb" }));

  if (stateless) {
    app.post(path, async (req, res) => {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });

      res.on("close", () => transport.close());

      const server = createServer();
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    });

    app.get(path, (_req, res) => {
      res.status(405).send("GET not supported in stateless mode.");
    });

    app.delete(path, (_req, res) => {
      res.status(405).send("DELETE not supported in stateless mode.");
    });
  } else {
    const transports = new Map<string, StreamableHTTPServerTransport>();

    app.post(path, async (req, res) => {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;

      if (sessionId && transports.has(sessionId)) {
        const transport = transports.get(sessionId);
        if (transport) {
          await transport.handleRequest(req, res, req.body);
          return;
        }
      }

      if (!sessionId && isInitializeRequest(req.body)) {
        let transport: StreamableHTTPServerTransport;
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          enableJsonResponse: true,
          onsessioninitialized: (id) => {
            transports.set(id, transport);
            console.error(`MCP HTTP session initialized: ${id}`);
          },
          onsessionclosed: (id) => {
            transports.delete(id);
            console.error(`MCP HTTP session closed: ${id}`);
          },
        });

        transport.onclose = () => {
          if (transport.sessionId) {
            transports.delete(transport.sessionId);
          }
        };

        const server = createServer();
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      }

      if (!sessionId) {
        sendMissingSession(res);
        return;
      }

      sendUnknownSession(res);
    });

    app.get(path, async (req, res) => {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      if (!sessionId) {
        sendMissingSession(res);
        return;
      }
      const transport = transports.get(sessionId);
      if (!transport) {
        sendUnknownSession(res);
        return;
      }
      await transport.handleRequest(req, res);
    });

    app.delete(path, async (req, res) => {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      if (!sessionId) {
        sendMissingSession(res);
        return;
      }
      const transport = transports.get(sessionId);
      if (!transport) {
        sendUnknownSession(res);
        return;
      }
      await transport.handleRequest(req, res);
    });
  }

  const httpServer = app.listen(port, host, () => {
    console.error(
      `✅ ${serverInfo.name} is running over Streamable HTTP at http://${host}:${port}${path}`,
    );
    console.error(
      `Mode: ${stateless ? "stateless" : "session"}. Allowed origins: ${
        allowAnyOrigin ? "*" : allowedOrigins.join(", ")
      }`,
    );
  });

  httpServer.on("error", (error) => {
    console.error("FATAL ERROR: Failed to start HTTP server:", error);
    process.exit(1);
  });
}

/**
 * Initializes and starts the Reclaim MCP Server.
 * - Sets up server info.
 * - Registers all defined tools and resources.
 * - Connects to the specified transport (stdio or Streamable HTTP).
 * - Handles potential startup errors.
 */
async function main(): Promise<void> {
  console.error(`Initializing ${serverInfo.name} v${serverInfo.version}...`);
  ensureApiKey();

  const transportMode = (process.env.MCP_TRANSPORT || "").toLowerCase();
  if (transportMode === "http") {
    await startHttpServer();
    return;
  }

  if (!transportMode && process.env.MCP_HTTP_PORT) {
    await startHttpServer();
    return;
  }

  if (transportMode && transportMode !== "stdio") {
    console.error(
      `Invalid MCP_TRANSPORT value "${process.env.MCP_TRANSPORT}". Use "stdio" or "http".`,
    );
    process.exit(1);
  }

  await startStdioServer();
}

// --- Global Error Handling & Execution ---

// Catch unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Catch uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

// Execute the main function and handle top-level errors.
main().catch((error) => {
  console.error("FATAL ERROR during server startup sequence:", error);
  process.exit(1); // Exit if main function fails critically.
});
