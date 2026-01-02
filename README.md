[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/reclaim-mcp-server.svg)](https://www.npmjs.com/package/reclaim-mcp-server)

# Reclaim.ai MCP Server 🚀 _(UNOFFICIAL)_

> **⚠️ UNOFFICIAL & UNAFFILIATED** – This project is **not** endorsed, sponsored, or supported by Reclaim.ai. It simply uses Reclaim's public API. Use at your own risk and comply with Reclaim's Terms of Service.

A community‑maintained [**Model Context Protocol**](https://modelcontextprotocol.io/) (MCP) server that lets _any_ MCP‑capable client (Claude Desktop, Continue, Cursor, custom scripts, …) interact with the [Reclaim.ai API](https://reclaim.ai/) through a set of standard **resources** & **tools**.

---

## 🔧 Fork Changes (2026-01-02)

### Upgrades
- Upgraded MCP SDK to the latest protocol-aligned release.
- Added **Streamable HTTP** transport (session or stateless) alongside stdio.
- Added tool metadata/annotations (idempotent/destructive/read-only hints) and structured tool outputs.
- Centralized API key validation to server startup (no module-level `process.exit`).
- Added `minChunkSize` / `maxChunkSize` inputs (15-minute chunks) to lock task chunk sizes to the requested duration.
- Added timezone-aware parsing for local date/time inputs via `timeZone` (tool arg) or `MCP_DEFAULT_TIMEZONE`.

### Breaking Changes
- None to tool names, arguments, or resource URIs in this fork.

### New Environment Variables
- `MCP_TRANSPORT`: `stdio` (default) or `http`
- `MCP_HTTP_HOST`: default `127.0.0.1`
- `MCP_HTTP_PORT`: default `3000`
- `MCP_HTTP_PATH`: default `/mcp`
- `MCP_HTTP_ALLOWED_ORIGINS`: comma-separated allowlist (default: `http://localhost,http://127.0.0.1`)
- `MCP_HTTP_ALLOW_ANY_ORIGIN`: set `true` to allow any Origin
- `MCP_HTTP_STATELESS`: set `true` to disable session storage
- `MCP_DEFAULT_TIMEZONE`: default IANA timezone for interpreting local times (e.g., `America/Los_Angeles`)

## 🧐 Why MCP?

- MCP is the "USB‑C" of LLM integrations – one wire that lets every model talk to every tool.

- Run this server once and _all_ your MCP‑aware apps instantly gain Reclaim super‑powers.

---

## ✨ Key Features

- **Active‑tasks resource** (`tasks://active`)

- **14 task‑operation tools** (list, create, update, complete, timers, …)

- 🛡 Type‑safe (TypeScript + Zod) & solid error‑handling

- 📦 Stdio + Streamable HTTP transport – local + hosted MCP clients

---

## 📚 MCP Capabilities

### Tools (Actions)

| Tool                       | Description                   | Parameters                                                | ✅ Idemp. | ☠️ Destr. |
| -------------------------- | ----------------------------- | --------------------------------------------------------- | --------- | --------- |
| `reclaim_list_tasks`       | List tasks (default = active) | `{ "filter"?: "active"\|"all" }`                          | ✅        | ❌        |
| `reclaim_get_task`         | Fetch a task                  | `{ "taskId": number }`                                    | ✅        | ❌        |
| `reclaim_create_task`      | Create a new task             | `{ /* task properties */ }`                               | ❌        | ❌        |
| `reclaim_update_task`      | Update task properties        | `{ "taskId": number, /* updated properties */ }`          | ✅        | ❌        |
| `reclaim_mark_complete`    | Mark complete                 | `{ "taskId": number }`                                    | ✅        | ❌        |
| `reclaim_mark_incomplete`  | Unarchive / mark incomplete   | `{ "taskId": number }`                                    | ✅        | ❌        |
| `reclaim_delete_task`      | Delete permanently            | `{ "taskId": number }`                                    | ✅        | **✅**    |
| `reclaim_add_time`         | Add schedule minutes          | `{ "taskId": number, "minutes": number }`                 | ❌        | ❌        |
| `reclaim_start_timer`      | Start timer                   | `{ "taskId": number }`                                    | ✅        | ❌        |
| `reclaim_stop_timer`       | Stop timer                    | `{ "taskId": number }`                                    | ✅        | ❌        |
| `reclaim_log_work`         | Log work time                 | `{ "taskId": number, "minutes": number, "end"?: string }` | ❌        | ❌        |
| `reclaim_clear_exceptions` | Clear scheduling exceptions   | `{ "taskId": number }`                                    | ✅        | ❌        |
| `reclaim_prioritize`       | Prioritise in planner         | `{ "taskId": number }`                                    | ✅        | ❌        |

Notes:
- Chunk sizes are expressed in **15-minute chunks**. Example: 60 minutes = 4 chunks.
- You can also pass **minutes** to avoid the conversion:
  - `durationMinutes`, `minDurationMinutes`, `maxDurationMinutes`
  - `lockChunkSizeToDuration: true` to set min/max equal to the requested duration (no splitting)
- Date/time inputs without an explicit offset will be interpreted in `timeZone`/`timezone` (tool argument) or `MCP_DEFAULT_TIMEZONE` if set.

---

## ⚠️ Known Issues

**`COMPLETE` ≠ done.** Reclaim marks a task `COMPLETE` when its _scheduled block_ ends, even if you haven't finished the work. This server does include those tasks as active when the LLM uses the tool to pull active tasks (and reminds the model that `COMPLETE` tasks are still active). However, LLMs (Claude) sometimes ignore `COMPLETE` tasks when asked for "open" or "active" tasks. If that happens, you may need to prompt the LLM explicitly to "include tasks with status COMPLETE".

## 🚀 Quick Start

1. **Prerequisites**
   - Node.js ≥ 18  
   - [Reclaim API key](https://app.reclaim.ai/settings/developer)

2. **Claude Desktop configuration (minimal)**
   ```json
{
  "mcpServers": {
    "reclaim": {
      "command": "npx",
      "args": [
        "reclaim-mcp-server"
      ],
      "env": { "RECLAIM_API_KEY": "xxx" }
    }
  }
}
   ```

**Alternative Configuration:**

   ```json
{
  "mcpServers": {
    "reclaim": {
      "command": "absolute/path/to/node (run `which node` in terminal)",
      "args": [
        "/absolute/path/to/reclaim-mcp-server/dist/index.js"
      ],
      "env": { "RECLAIM_API_KEY": "xxx" }
    }
  }
}
   ```

### Streamable HTTP Transport (New)

Run the server over Streamable HTTP (recommended for hosted or remote MCP clients):

```bash
MCP_TRANSPORT=http \
MCP_HTTP_HOST=127.0.0.1 \
MCP_HTTP_PORT=3000 \
MCP_HTTP_PATH=/mcp \
RECLAIM_API_KEY=your_api_key \
node dist/index.js
```

Session mode is default. To enable **stateless mode**:

```bash
MCP_TRANSPORT=http MCP_HTTP_STATELESS=true RECLAIM_API_KEY=your_api_key node dist/index.js
```


### Alternative: Manual Installation

If you prefer to install from source:

```bash
git clone https://github.com/jj3ny/reclaim-mcp-server.git
cd reclaim-mcp-server
pnpm install && pnpm build

# Run with your API key
RECLAIM_API_KEY=your_api_key node dist/index.js
```

## 🤝 Contributing

Bug reports & PRs welcome! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes (following the code style)
4. Commit using Conventional Commits (`feat:`, `fix:`, etc.)
5. Push to your branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

Please squash your commits before opening a PR.

## 📄 License

MIT – see LICENSE.
