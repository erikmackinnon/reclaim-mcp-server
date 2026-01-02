[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

# Reclaim.ai MCP Server (Unofficial)

An **unofficial** [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that exposes Reclaim.ai tasks to MCP-capable clients via **tools** and an **active tasks** resource.

> This project is not endorsed, sponsored, or supported by Reclaim.ai. It uses Reclaim's public API. Use at your own risk and comply with Reclaim's Terms of Service.

This repository is a fork of `jj3ny/reclaim-mcp-server`, originally authored by **John J. Hughes III (@jj3ny)**.

## What’s in this fork

- **MCP SDK upgrade** + modern MCP registrations (`registerTool`, `registerResource`)
- **Streamable HTTP transport** (in addition to stdio)
- **Safer task duration inputs**: use minutes (`durationMinutes`, `minDurationMinutes`, `maxDurationMinutes`) instead of raw Reclaim chunk counts
- **“No chunking / exact duration” support** via `lockChunkSizeToDuration`
- **Timezone-safe local timestamps**
  - If you pass a local timestamp without an offset (e.g. `2026-01-05T08:00:00`), it’s interpreted in:
    1) the tool `timeZone` argument, else
    2) `MCP_DEFAULT_TIMEZONE`, else
    3) your **Reclaim account timezone** (fetched from `/users/current`), else
    4) the server machine timezone
- HTTP CORS allowlist + session/stateless modes

## Requirements

- Node.js `>= 18`
- A Reclaim API token (`RECLAIM_API_KEY`)

## Install & build (from source)

This fork is intended to be run from source so your MCP client uses **this repo** (running `npx reclaim-mcp-server` will typically pull the upstream npm package).

```bash
pnpm install --no-frozen-lockfile
pnpm build
```

## Run

### 1) STDIO (default; recommended)

```bash
RECLAIM_API_KEY=... \
MCP_TRANSPORT=stdio \
node dist/index.js
```

### 2) Streamable HTTP

```bash
RECLAIM_API_KEY=... \
MCP_TRANSPORT=http \
MCP_HTTP_HOST=127.0.0.1 \
MCP_HTTP_PORT=3000 \
MCP_HTTP_PATH=/mcp \
node dist/index.js
```

Security note: this HTTP transport has **no authentication** by default. Bind to `127.0.0.1` (default) or use network-level controls.

Optional (stateless mode):

```bash
RECLAIM_API_KEY=... \
MCP_TRANSPORT=http \
MCP_HTTP_STATELESS=true \
node dist/index.js
```

## Client setup

### Codex CLI

Add as a **stdio** MCP server:

```bash
codex mcp add reclaim \
  --env RECLAIM_API_KEY=... \
  --env MCP_TRANSPORT=stdio \
  -- node /absolute/path/to/reclaim-mcp-server/dist/index.js
```

Alternative: configure in `~/.codex/config.toml`:

```toml
[mcp_servers.reclaim]
command = "node"
args = ["/absolute/path/to/reclaim-mcp-server/dist/index.js"]
env = { RECLAIM_API_KEY = "YOUR_API_KEY", MCP_TRANSPORT = "stdio", MCP_DEFAULT_TIMEZONE = "America/Los_Angeles" }
```

Add as a **Streamable HTTP** MCP server:

```bash
codex mcp add reclaim --url http://127.0.0.1:3000/mcp
```

### Claude Code

Add as a **stdio** MCP server:

```bash
claude mcp add reclaim \
  --env RECLAIM_API_KEY=... \
  --env MCP_TRANSPORT=stdio \
  -- node /absolute/path/to/reclaim-mcp-server/dist/index.js
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "reclaim": {
      "command": "node",
      "args": ["/absolute/path/to/reclaim-mcp-server/dist/index.js"],
      "env": {
        "RECLAIM_API_KEY": "...",
        "MCP_TRANSPORT": "stdio"
      }
    }
  }
}
```

### Continue / Cursor / other MCP clients

Use either:

- **stdio:** run `node /abs/path/to/dist/index.js` with `RECLAIM_API_KEY` set, or
- **HTTP:** point the client at `http://127.0.0.1:3000/mcp`

## MCP surface

### Resource

- `tasks://active` – JSON list of active tasks (includes tasks with `status: COMPLETE`)
- `tasks://defaults` – account-level task defaults (chunk sizes, priority defaults, etc.)

### Tools

- `reclaim_get_task_defaults`
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

## Tool semantics (important)

### Durations and chunking

Reclaim’s API uses **15-minute chunks**.

To avoid confusion, this server supports minutes-based inputs:

- `durationMinutes` → converts to Reclaim `timeChunksRequired`
- `minDurationMinutes` / `maxDurationMinutes` → converts to `minChunkSize` / `maxChunkSize`
- `lockChunkSizeToDuration: true` → sets min/max chunk size to exactly the requested duration

Example: “60 minutes exactly, no chunking”

Natural language request example:

```text
reclaim new task for monday 8am do bigTask for theBoss 60 mins exactly no chunk
```

```json
{
  "title": "bigTask for theBoss",
  "startTime": "2026-01-05T08:00:00",
  "timeZone": "America/Los_Angeles",
  "durationMinutes": 60,
  "lockChunkSizeToDuration": true
}
```

### Timezones

- If you provide an offset (e.g. `2026-01-05T08:00:00-08:00`), it’s sent as that exact moment.
- If you omit the offset (e.g. `2026-01-05T08:00:00`), it’s interpreted in a time zone, then converted to UTC for the Reclaim API.

Time zone selection order for offset-less timestamps:

1) tool argument `timeZone` / `timezone`
2) `MCP_DEFAULT_TIMEZONE`
3) your Reclaim account time zone (fetched from `/users/current`)
4) the server machine time zone

## Known issues (LLM behavior)

- **`status: COMPLETE` does not mean “done”.** Reclaim uses `COMPLETE` to mean a scheduled time block ended (the user may not have finished the work). This server treats those as “active” unless archived/cancelled/deleted, but some models still ignore them when asked for “open” tasks. If that happens, explicitly ask the model to include tasks with `status: COMPLETE`.

## Configuration

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `RECLAIM_API_KEY` | yes | - | Reclaim API token |
| `MCP_TRANSPORT` | no | `stdio` | `stdio` or `http` |
| `MCP_DEFAULT_TIMEZONE` | no | Reclaim timezone / machine TZ | IANA timezone for local timestamps (e.g. `America/Los_Angeles`) |
| `MCP_HTTP_HOST` | no | `127.0.0.1` | HTTP bind host |
| `MCP_HTTP_PORT` | no | `3000` | HTTP port |
| `MCP_HTTP_PATH` | no | `/mcp` | HTTP path |
| `MCP_HTTP_STATELESS` | no | `false` | Disable session storage |
| `MCP_HTTP_ALLOWED_ORIGINS` | no | `http://localhost,http://127.0.0.1` | CORS allowlist |
| `MCP_HTTP_ALLOW_ANY_ORIGIN` | no | `false` | Set `true` to allow all Origins |
| `RECLAIM_DEBUG` | no | `false` | Log request payloads and responses for troubleshooting |

## Troubleshooting

### MCP client fails to start (“handshaking… initialize response”)

This typically means the server exited before it could answer the MCP `initialize` request.

- Ensure `RECLAIM_API_KEY` is set.
- If your client expects **stdio**, make sure you’re not accidentally starting the HTTP transport:
  - set `MCP_TRANSPORT=stdio`
  - remove/unset `MCP_HTTP_PORT` if your MCP client inherits it from your shell environment

## Development

```bash
pnpm install --no-frozen-lockfile
pnpm build
pnpm test
pnpm typecheck
```

## API reference

Reclaim’s Swagger spec:

```text
https://api.app.reclaim.ai/swagger/reclaim-api-0.1.yml
```

## License

MIT (see `LICENSE`).
