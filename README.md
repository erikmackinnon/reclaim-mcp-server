[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

# Reclaim.ai MCP Server (Unofficial)

An **unofficial** [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that exposes a broad, end-user-safe Reclaim.ai surface via typed MCP tools/resources and one constrained raw fallback tool.

> This project is not endorsed, sponsored, or supported by Reclaim.ai. It uses Reclaim's public API. Use at your own risk and comply with Reclaim's Terms of Service.

This repository is a fork of `jj3ny/reclaim-mcp-server`, originally authored by **John J. Hughes III (@jj3ny)**.

## What’s in this fork

- **MCP SDK upgrade** + modern MCP registrations (`registerTool`, `registerResource`)
- **Expanded surface coverage** across tasks, habits, meetings, one-on-ones, scheduling links, calendars, user/account settings, policies, focus/availability, analytics/changelog/assist, and team/integrations self-service flows
- **Endpoint registry model** that classifies every API signature as `typed`, `raw`, or `excluded`, with safety flags and exclusion metadata
- **Generated capability matrix** (`CAPABILITY-MATRIX.md` / `CAPABILITY-MATRIX.json`) for auditable surface coverage
- **Streamable HTTP transport** (in addition to stdio)
- **Safer task duration inputs**: use minutes (`durationMinutes`, `minDurationMinutes`, `maxDurationMinutes`) instead of raw Reclaim chunk counts
- **“No chunking / exact duration” support** via `lockChunkSizeToDuration`
- **Timezone-safe local timestamps**
  - If you pass a local timestamp without an offset (e.g. `2026-01-05T08:00:00`), it’s interpreted in:
    1. the tool `timeZone` argument, else
    2. `MCP_DEFAULT_TIMEZONE`, else
    3. your **Reclaim account timezone** (fetched from `/users/current`), else
    4. the server machine timezone
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

Coverage snapshot:

- `273` typed tools
- `1` raw fallback tool (`reclaim_call_api`)
- `6` resources
- `511` endpoint signatures in the registry (`273` typed, `108` raw, `130` excluded)

Full, generated coverage:

- [CAPABILITY-MATRIX.md](./CAPABILITY-MATRIX.md)
- [CAPABILITY-MATRIX.json](./CAPABILITY-MATRIX.json)

Typed resources:

- `tasks://active`
- `tasks://defaults`
- `reclaim://users/current`
- `reclaim://habits/daily`
- `reclaim://focus/settings/current`
- `reclaim://team/current`

## Architecture

- `src/server/bootstrap.ts` creates the MCP server and wires domain registrars from `src/server/registrars/*`.
- `src/client/core/http.ts` provides shared request execution, auth checks, query serialization, and API error normalization.
- `src/client/domains/*` contains typed domain clients mapped to customer-visible Reclaim surfaces.
- `src/endpoint-registry.ts` is the canonical API classification source (`typed` / `raw` / `excluded`) with safety flags.
- `src/tools/rawApi.ts` implements `reclaim_call_api` and enforces raw fallback constraints against the registry.

## Naming And Safety Model

- Tool names follow `reclaim_<action_or_operation>` (for example `reclaim_create_task`, `reclaim_list_smart_meetings`).
- Every tool registration uses explicit annotations from `src/server/tool-metadata.ts`:
  - `readOnlyHint`
  - `idempotentHint`
  - `destructiveHint`
- Every endpoint registry entry includes safety flags:
  - `readOnly`
  - `destructive`
  - `bulk`
  - `highRisk`
- Excluded endpoints must include `exclusionCategory` and `exclusionReason`; policy categories are enforced in registry tests.

## Raw Fallback Constraints

`reclaim_call_api` is intentionally restricted. It rejects calls that are not allowlisted raw signatures.

- Path must start with `/`, cannot include host/query/fragment, and cannot contain traversal segments.
- Method must match one of the registry-allowed methods for the matched endpoint.
- Typed and excluded endpoints are blocked.
- Unknown paths are blocked.
- Query accepts only scalar values or scalar arrays, with key/count/size limits.
- Body must be JSON-compatible, with depth/node/size limits, and `GET` requests cannot include a body.
- The result includes endpoint metadata (domain, template, safety flags) and sets a safety notice on destructive operations.

## Normalization Semantics

- Minutes abstraction:
  - `durationMinutes` -> `timeChunksRequired`
  - `minDurationMinutes` -> `minChunkSize`
  - `maxDurationMinutes` -> `maxChunkSize`
  - `lockChunkSizeToDuration: true` forces min/max chunk sizes to match requested duration
- Timezone resolution for local datetimes without offset:
  1. tool `timeZone` / `timezone`
  2. `MCP_DEFAULT_TIMEZONE`
  3. Reclaim account timezone from `/users/current`
  4. server machine timezone
- Date parsing (`parseDeadline`) supports:
  - numeric deadline offsets (days from now)
  - local datetimes with timezone-safe conversion
  - DST gap handling by choosing the next valid local wall-clock time
- Query normalization removes `undefined` values and preserves scalar-array semantics.
- Enum normalization standardizes category/subtype/priority aliases for typed payloads.
- Errors are normalized into `ReclaimError` (`status`, `detail`) and surfaced through consistent MCP tool/resource wrappers.

## Maintainer Workflow

When adding or changing coverage:

1. Update `src/endpoint-registry.ts` for each new endpoint signature and classify it as `typed`, `raw`, or `excluded` with safety metadata.
2. If `typed`, add/update domain client + tool/resource registration.
3. Regenerate matrix artifacts:

```bash
pnpm docs:matrix
```

4. Run validation:

```bash
pnpm test
pnpm typecheck
pnpm build
```

## Known issues (LLM behavior)

- **`status: COMPLETE` does not mean “done”.** Reclaim uses `COMPLETE` to mean a scheduled time block ended (the user may not have finished the work). This server treats those as “active” unless archived/cancelled/deleted, but some models still ignore them when asked for “open” tasks. If that happens, explicitly ask the model to include tasks with `status: COMPLETE`.

## Configuration

| Variable                    | Required | Default                             | Description                                                     |
| --------------------------- | -------- | ----------------------------------- | --------------------------------------------------------------- |
| `RECLAIM_API_KEY`           | yes      | -                                   | Reclaim API token                                               |
| `MCP_TRANSPORT`             | no       | `stdio`                             | `stdio` or `http`                                               |
| `MCP_DEFAULT_TIMEZONE`      | no       | Reclaim timezone / machine TZ       | IANA timezone for local timestamps (e.g. `America/Los_Angeles`) |
| `MCP_HTTP_HOST`             | no       | `127.0.0.1`                         | HTTP bind host                                                  |
| `MCP_HTTP_PORT`             | no       | `3000`                              | HTTP port                                                       |
| `MCP_HTTP_PATH`             | no       | `/mcp`                              | HTTP path                                                       |
| `MCP_HTTP_STATELESS`        | no       | `false`                             | Disable session storage                                         |
| `MCP_HTTP_ALLOWED_ORIGINS`  | no       | `http://localhost,http://127.0.0.1` | CORS allowlist                                                  |
| `MCP_HTTP_ALLOW_ANY_ORIGIN` | no       | `false`                             | Set `true` to allow all Origins                                 |
| `RECLAIM_DEBUG`             | no       | `false`                             | Log request payloads and responses for troubleshooting          |

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
pnpm docs:matrix
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
