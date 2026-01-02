[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/reclaim-mcp-server.svg)](https://www.npmjs.com/package/reclaim-mcp-server)

# Reclaim.ai MCP Server (Unofficial)

Expose Reclaim.ai tasks to any MCP-capable client via **tools** and **resources**.

> Unofficial and unaffiliated: this project is **not** endorsed, sponsored, or supported by Reclaim.ai. It uses Reclaim's public API. Use at your own risk and comply with Reclaim's Terms of Service.

## Fork notice / attribution

This repository is a fork of `jj3ny/reclaim-mcp-server`, originally authored by **John J. Hughes III (@jj3ny)**.
This fork focuses on MCP protocol compatibility, Streamable HTTP transport, and higher-quality tool UX.

## Contents

- [Features](#features)
- [Requirements](#requirements)
- [Install & run](#install--run)
  - [STDIO (default)](#stdio-default)
  - [Streamable HTTP (optional)](#streamable-http-optional)
- [Client setup](#client-setup)
  - [Claude Code](#claude-code)
  - [Codex CLI](#codex-cli)
  - [Claude Desktop](#claude-desktop)
  - [Continue (IDE)](#continue-ide)
- [MCP surface area](#mcp-surface-area)
  - [Resource](#resource)
  - [Tools](#tools)
- [Time + duration semantics](#time--duration-semantics)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Credits](#credits)

## Features

- Task operations as MCP tools (list/get/create/update/complete/delete/timers/log work)
- `tasks://active` MCP resource for “active tasks”
- Supports **STDIO** (local process) and **Streamable HTTP** transports
- Duration ergonomics: pass `durationMinutes` or 15-minute chunks, and optionally “no chunking”
- Timezone-aware parsing for local times (including DST boundaries)

## Requirements

- Node.js >= 18
- A Reclaim API key: Reclaim app → Settings → Developer

## Install & run

This repo is intended to be run from source (so your MCP clients use *this fork*, not the upstream npm package).

```bash
pnpm install --no-frozen-lockfile
pnpm build
```

### STDIO (default)

STDIO is the most common option for local MCP clients.

```bash
RECLAIM_API_KEY=your_api_key \
MCP_TRANSPORT=stdio \
node dist/index.js
```

### Streamable HTTP (optional)

Streamable HTTP is useful when you want to run the server once and point multiple clients at it.

```bash
RECLAIM_API_KEY=your_api_key \
MCP_TRANSPORT=http \
MCP_HTTP_HOST=127.0.0.1 \
MCP_HTTP_PORT=3000 \
MCP_HTTP_PATH=/mcp \
node dist/index.js
```

Optional: stateless mode (no session storage)

```bash
RECLAIM_API_KEY=your_api_key \
MCP_TRANSPORT=http \
MCP_HTTP_STATELESS=true \
node dist/index.js
```

## Client setup

### Claude Code

Claude Code supports adding a local stdio MCP server from the CLI:

```bash
claude mcp add --transport stdio reclaim \
  --env RECLAIM_API_KEY=your_api_key \
  --env MCP_TRANSPORT=stdio \
  -- node /absolute/path/to/reclaim-mcp-server/dist/index.js
```

### Codex CLI

Codex stores MCP configuration in `~/.codex/config.toml` and also supports adding servers via the CLI.

Add this server via CLI:

```bash
codex mcp add reclaim \
  --env RECLAIM_API_KEY=your_api_key \
  --env MCP_TRANSPORT=stdio \
  -- node /absolute/path/to/reclaim-mcp-server/dist/index.js
```

Or configure it in `~/.codex/config.toml`:

```toml
[mcp_servers.reclaim]
command = "node"
args = ["/absolute/path/to/reclaim-mcp-server/dist/index.js"]

[mcp_servers.reclaim.env]
RECLAIM_API_KEY = "your_api_key"
MCP_TRANSPORT = "stdio"
```

### Claude Desktop

Add a stdio server in your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "reclaim": {
      "command": "node",
      "args": ["/absolute/path/to/reclaim-mcp-server/dist/index.js"],
      "env": {
        "RECLAIM_API_KEY": "your_api_key",
        "MCP_TRANSPORT": "stdio"
      }
    }
  }
}
```

## MCP surface area

### Resource

- `tasks://active` – JSON list of active tasks (includes `COMPLETE` tasks; see note below)

### Tools

Tool names are stable and prefixed with `reclaim_`:

- `reclaim_list_tasks`
- `reclaim_get_task`
- `reclaim_create_task`
- `reclaim_update_task`
- `reclaim_mark_complete`
- `reclaim_mark_incomplete`
- `reclaim_delete_task`
- `reclaim_add_time`
- `reclaim_start_timer`
- `reclaim_stop_timer`
- `reclaim_log_work`
- `reclaim_clear_exceptions`
- `reclaim_prioritize`

## Time + duration semantics

### Durations and “no chunking”

Reclaim expresses task duration and chunk sizes in **15-minute chunks**. This is also the default when you create tasks with this MCP.

However, to avoid chunking you can request "no chunking". 

To avoid duration mistakes, you can use **minutes-based inputs**:

- `durationMinutes` (converted to `timeChunksRequired`)
- `minDurationMinutes` / `maxDurationMinutes` (converted to `minChunkSize` / `maxChunkSize`)
- `lockChunkSizeToDuration: true` (sets min/max chunk size equal to the requested duration)

Example: “reclaim add task The Task I Need to Do 8 am jan 5 60 mins no chunk”

```json
{
  "title": "The Task I Need to Do",
  "startTime": "2026-01-05T08:00:00",
  "timeZone": "America/Los_Angeles",
  "durationMinutes": 60,
  "lockChunkSizeToDuration": true
}
```

### Timezones

Users typically specify times in local time, but Reclaim wants UTC. This server supports setting your timezone which automatically converts to UTC. You should be able to just say your local time but if it gives you issues, set the MCP_DEFAULT_TIMEZONE environment variable. How this works:

- **Absolute time**: include an offset (e.g. `2026-01-05T08:00:00-08:00`). This will be honored as-is.
- **Local time**: omit the offset (e.g. `2026-01-05T08:00:00`). This will be interpreted in:
  1) `timeZone`/`timezone` tool argument, else
  2) `MCP_DEFAULT_TIMEZONE`, else
  3) the server machine’s timezone.

## Configuration

### Environment variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `RECLAIM_API_KEY` | yes | - | Reclaim API token |
| `MCP_TRANSPORT` | no | `stdio` | `stdio` or `http` |
| `MCP_HTTP_HOST` | no | `127.0.0.1` | HTTP bind host |
| `MCP_HTTP_PORT` | no | `3000` | HTTP port |
| `MCP_HTTP_PATH` | no | `/mcp` | HTTP path |
| `MCP_HTTP_STATELESS` | no | `false` | Disable session storage |
| `MCP_HTTP_ALLOWED_ORIGINS` | no | `http://localhost,http://127.0.0.1` | CORS allowlist |
| `MCP_HTTP_ALLOW_ANY_ORIGIN` | no | `false` | Set `true` to allow all Origins |
| `MCP_DEFAULT_TIMEZONE` | no | machine TZ | IANA timezone for local timestamps (e.g. `America/Los_Angeles`) |

### API reference

Reclaim’s Swagger spec is available at:

```text
https://api.app.reclaim.ai/swagger/reclaim-api-0.1.yml
```

## Troubleshooting

### “handshaking with MCP server failed” / “initialize response”

This typically means the server exited before responding.

- Ensure `RECLAIM_API_KEY` is set.
- Ensure you’re running STDIO mode for STDIO clients:
  - set `MCP_TRANSPORT=stdio`
  - unset `MCP_HTTP_PORT` in your shell if it’s being inherited by your MCP client

### COMPLETE tasks “disappear”

Reclaim uses `status: COMPLETE` to mean a scheduled block ended, not that the task was marked done by the user.
This server still considers those tasks “active” unless they are archived/cancelled/deleted.

## Development

```bash
pnpm install --no-frozen-lockfile
pnpm build
pnpm test
pnpm typecheck
```

## Credits

- Original project: `jj3ny/reclaim-mcp-server` by John J. Hughes III (@jj3ny)
- MCP protocol: https://modelcontextprotocol.io/