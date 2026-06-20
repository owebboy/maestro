# Adapter profile shape (forge adapters)

Every forge adapter profile MUST contain these sections, in order:

1. `## Capabilities` — header object: { "supports":[...], "scoped_labels":bool, "transports":["mcp","cli","api"] }
2. `## Transport detection` — references the shared recipe below; lists this backend's MCP tool prefix, CLI binary, and REST base.
3. `## Status mapping` — the canonical→native table (must match CONTRACT + the P2 plan table).
4. `## Field mapping` — type/priority/weight → labels or native fields.
5. `## Operations` — one subsection per op (all 12), each showing the MCP, CLI, and API rendering.
6. `## Label bootstrap` — idempotent creation of status:*/type:*/priority:* (and maestro:tracked).

**Native-tracker variant:** profiles for backends with native workflow states (e.g. `linear-jira.md`, serving `linear`/`jira`) follow sections 1–5 but substitute a `## State setup` section for section 6's `## Label bootstrap` — there are no labels to create; instead `/setup` discovers the team's native states and writes a `config.statusMap`. Such profiles also branch their per-op renderings on the active adapter name.

## Shared transport-detection recipe (MCP > CLI > API)

Run once per session, before the first op:
1. If `config.transport` is set, use it (skip detection).
2. **MCP:** if my available tools include `mcp__<prefix>__*` for this backend, select `mcp`.
3. **CLI:** else if `command -v <cli>` succeeds AND the CLI reports an authenticated session
   (gitea: `tea login list` non-empty; github: `gh auth status`; gitlab: `glab auth status`), select `cli`.
4. **API:** else if a token is available (`config.backend.token` or the backend's env var), select `api`.
5. **None:** if nothing resolves, STOP and tell the user exactly which of MCP/CLI/API to set up,
   with the one-line command to authenticate each. Never silently fall back to the files adapter.

Resolved transport is reused for the whole session.
