# Work-item Adapter Overview

Maestro stores and retrieves work items through a pluggable adapter layer. The active adapter
is declared in `.maestro/config.json` as `adapter: <name>`. Skills never reference the adapter
directly — they call abstract operations (`create_item`, `set_status`, etc.) and the adapter
profile resolves them to the right API calls, CLI commands, or file writes.

There are six adapter choices. Two of them (`linear` and `jira`) share one profile file
(`assets/maestro/adapters/linear-jira.md`); the profile branches internally on the adapter name.

## Capability matrix

| Adapter | Transports | Scoped labels | Subtasks | Relations | Native search | captureMode: backend |
|---------|-----------|--------------|----------|-----------|--------------|---------------------|
| `files` | files (local) | — | task-list (`## Tasks`) | yes (frontmatter `links:`) | substring match | n/a (always appends to `inbox.md`) |
| `gitea` | mcp, cli, api | no (plain `status:*`) | task-list in body | yes (comment fallback) | yes (native) | yes |
| `github` | mcp, cli, api | no (plain `status:*`) | task-list in body | yes (comment fallback) | yes (native) | yes |
| `gitlab` | mcp, cli, api | yes (`status::*`) | task-list in body | yes (note fallback) | yes (native) | yes |
| `linear` | mcp, api | — (native states) | native sub-issues | yes (native `createIssueRelation`) | yes (native) | yes |
| `jira` | mcp, cli, api | — (native states) | native sub-tasks | yes (native issue links) | yes (native) | yes |

**Column notes:**

- **Transports** — detection order follows the shared recipe in `assets/maestro/adapters/_shape.md`:
  MCP > CLI > API. `config.transport` pins a choice.
- **Scoped labels** — GitLab enforces label mutual-exclusivity natively with `::` scope; `set_status`
  only needs to add the new label. GitHub/Gitea use plain labels; the adapter removes sibling
  `status:*` labels explicitly before adding the new one.
- **Subtasks** — `subtasks-as-tasklist` means the adapter writes a `## Tasks` markdown checklist
  into the issue body (`- [ ]` / `- [~]` / `- [x]`). Native sub-issues (linear/jira) are real
  child issues; the parent carries a list of child IDs rather than body text.
- **Relations** — all adapters implement `relate`; git-forge adapters and `files` use a comment or
  frontmatter as a fallback (CONTRACT §Degradation rule 2). Linear/Jira have typed native
  relations.
- **captureMode: backend** — when `config.captureMode == "backend"`, `capture_raw` creates a real
  issue in the forge/native backend rather than appending to `.maestro/inbox.md`; the fallback
  (local file) triggers only if the backend is unreachable. For the `files` adapter this mode is
  moot — `capture_raw` always appends to `.maestro/inbox.md` regardless, since there is no remote
  backend to target.

## When to choose each adapter

**`files`** — the default, zero-dependency backend. All work items live as Markdown files in
`.maestro/items/`. Choose it for solo work, offline-first projects, or any project that has no
issue tracker. No authentication or service required.

**`gitea`** — use when your team self-hosts a Gitea instance. Maestro represents status and
metadata as plain `status:*` / `type:*` / `priority:*` labels. Subtasks appear as a task-list
block in the issue body. Supports MCP (with the Gitea MCP server), the `tea` CLI, or direct
REST API access.

**`github`** — use for projects hosted on GitHub or GitHub Enterprise. Same plain-label model
as Gitea but the `gh` CLI has richer scripting support (close reason, search, label management).
GitHub renders `- [ ]` task-lists as a native progress bar, so tracked item progress is visible
in the GitHub UI without any extra tooling.

**`gitlab`** — use for GitLab-hosted projects. The distinguishing feature is scoped label
exclusivity: `status::in-progress` automatically replaces `status::reviewed` when you call
`set_status`, so no extra label-removal step is needed. Supports MCP, the `glab` CLI, or the
GitLab REST API.

**`linear`** — use for teams already running Linear as their planning tool. Linear's native
workflow states are used directly; `/setup` discovers the team's board states and builds a
`config.statusMap` so Maestro's canonical statuses map to the team's column names without any
skill edits. Sub-issues are real Linear child issues. No CLI is available; use MCP or the
Linear GraphQL API.

**`jira`** — use for Atlassian Jira. Like Linear, `/setup` discovers the project's workflow
states and writes a `config.statusMap`. Sub-tasks are real Jira sub-tasks. Supports MCP (via
the Atlassian MCP server), the `jira` CLI (ankitpokhrel/jira-cli), or the Jira REST API.
Priority, type, and status all map to Jira's native fields via `config.fieldMap` overrides.

## Next steps

- **Switching adapter:** edit `.maestro/config.json`, change `adapter:`, then run `/setup`
  to bootstrap labels or discover workflow states for the new backend.
- **Writing a new adapter:** see [`writing-an-adapter.md`](writing-an-adapter.md).
- **Contract reference:** see `assets/maestro/CONTRACT.md` for the full op list, capability
  flags, degradation rules, and normalized record shape.
