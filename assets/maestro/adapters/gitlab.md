# GitLab adapter profile

## Capabilities

```json
{ "supports": ["labels","relations","subtasks-as-tasklist"], "scoped_labels": true, "transports": ["mcp","cli","api"] }
```

## Transport detection

Follow the shared recipe from `_shape.md`. GitLab specifics:

- **MCP prefix:** `mcp__gitlab__` — check if tools like `mcp__gitlab__create_issue` appear in the available tool list (agent tool introspection, not a shell command).
- **CLI binary:** `glab` — check with `command -v glab` then verify auth: `glab auth status`.
- **REST base:** `<config.backend.url>/api/v4/projects/<config.backend.project_id>/issues`
  - Token via `config.backend.token` or `GITLAB_TOKEN` env var.
  - Auth header: `PRIVATE-TOKEN: <token>` (or `Authorization: Bearer <token>`).

Detection order (once per session):
1. If `config.transport` is set, use it.
2. **MCP:** `mcp__gitlab__*` tools present → `mcp`.
3. **CLI:** `command -v glab` succeeds AND `glab auth status` shows authenticated → `cli`.
4. **API:** `config.backend.token` or `GITLAB_TOKEN` is set → `api`.
5. **None:** STOP. Tell the user to set up one of:
   - MCP: install the GitLab MCP server and connect it.
   - CLI: `glab auth login` (follow prompts).
   - API: set `GITLAB_TOKEN=<pat>` and `config.backend.url` + `config.backend.project_id`.

## Status mapping

GitLab uses **scoped labels** (`status::<x>`, double-colon). Scoped labels within the same scope (`status::`) are **natively mutually-exclusive**: `set_status` needs only ADD `status::<new>` — GitLab removes the previous `status::*` label automatically. Do NOT manually remove sibling `status::*` labels; that differs from GitHub/Gitea (plain labels) which require explicit sibling removal.

| Canonical    | GitLab label      | Issue state |
|---|---|---|
| `inbox`      | `status::inbox`      | open   |
| `triaged`    | `status::triaged`    | open   |
| `reviewed`   | `status::reviewed`   | open   |
| `planned`    | `status::planned`    | open   |
| `in-progress`| `status::in-progress`| open   |
| `in-review`  | `status::in-review`  | open   |
| `done`       | `done`               | **closed** |
| `wont-fix`   | `wont-fix`           | **closed** |
| `deferred`   | `deferred`           | **closed** (reopen to restore) |
| `duplicate`  | `duplicate`          | **closed** |

**Terminal transitions (done / wont-fix / deferred / duplicate):** add the reason label, then close the issue (`glab issue close <id>` / `PUT .../issues/<id>` with `state_event=close`). To reopen a deferred item, reopen the issue and add `status::planned` (or appropriate status).

## Field mapping

GitLab uses **scoped labels** for all three classification dimensions. This is the key divergence from GitHub/Gitea:

| Field    | GitLab (scoped, `scoped_labels: true`) | GitHub / Gitea (plain labels) |
|---|---|---|
| type     | `type::<value>`   | `type:<value>`   |
| priority | `priority::<value>` | `priority:<value>` |
| status   | `status::<value>` | `status:<value>` |

The `scoped_labels` flag (set `true` for GitLab, `false` for GitHub/Gitea) drives which label format the adapter emits. Within each scope, GitLab enforces mutual exclusivity natively — only one `type::*`, one `priority::*`, and one `status::*` label can be active at a time.

**Type values:** `type::bug`, `type::feature`, `type::refactor`, `type::chore`
**Priority values:** `priority::P1`, `priority::P2`, `priority::P3`
**Weight (tracked):** presence of `maestro:tracked` label and/or a Markdown task list in the description signals a tracked item.

## Operations

### create_item

Create a new issue with scoped labels for type, priority, and initial status.

**MCP:**
```
mcp__gitlab__create_issue(
  project_id: <config.backend.project_id>,
  title: "<title>",
  description: "<body>",
  labels: "type::<type>,priority::<priority>,status::inbox"
)
```

**CLI:**
```bash
glab issue create \
  --title "<title>" \
  --description "<body>" \
  --label "type::<type>,priority::<priority>,status::inbox"
```

**API:**
```http
POST <config.backend.url>/api/v4/projects/<id>/issues
PRIVATE-TOKEN: <token>

{
  "title": "<title>",
  "description": "<body>",
  "labels": "type::<type>,priority::<priority>,status::inbox"
}
```

Returns: normalized record (see CONTRACT).

---

### get_item

Fetch a single issue and return the normalized record. Map active `status::*` scoped label → canonical status; if issue is closed, derive terminal status from `done`/`wont-fix`/`deferred`/`duplicate` label.

**MCP:**
```
mcp__gitlab__get_issue(
  project_id: <config.backend.project_id>,
  issue_iid: <ref>
)
```

**CLI:**
```bash
glab issue view <ref> --output json
# or: glab issue view <ref> -F json
```

**API:**
```http
GET <config.backend.url>/api/v4/projects/<id>/issues/<ref>
PRIVATE-TOKEN: <token>
```

Parse `labels` array: extract `status::*` → canonical status, `type::*` → type, `priority::*` → priority. If `state == "closed"`, resolve terminal status from `done`/`wont-fix`/`deferred`/`duplicate` labels.

---

### update_item

Update title, description, or labels on an existing issue. For label updates, pass the full desired label set (GitLab replaces all labels when using the `labels` param).

**MCP:**
```
mcp__gitlab__update_issue(
  project_id: <config.backend.project_id>,
  issue_iid: <ref>,
  title: "<new title>",           # optional
  description: "<new body>",      # optional
  labels: "<full label set>"      # optional; replaces all labels
)
```

**CLI:**
```bash
glab issue update <ref> \
  --title "<new title>" \
  --description "<new body>"
# For label changes use the API or re-create the label set explicitly:
# glab issue update <ref> --label "type::<x>,priority::<x>,status::<x>,..."
```

**API:**
```http
PUT <config.backend.url>/api/v4/projects/<id>/issues/<ref>
PRIVATE-TOKEN: <token>

{
  "title": "<new title>",
  "description": "<new body>",
  "labels": "<full label set>"
}
```

---

### set_status

Transition an issue to a new canonical status.

**Scoped-label exclusivity:** Because `status::` is a scoped label group, just ADD `status::<new>` — GitLab will remove the previous `status::*` label automatically. Do NOT manually remove sibling `status::*` labels (contrast: GitHub/Gitea require explicit removal of old `status:*`).

**Non-terminal transition** (inbox → triaged → reviewed → planned → in-progress → in-review):

*MCP:*
```
mcp__gitlab__update_issue(
  project_id: <config.backend.project_id>,
  issue_iid: <ref>,
  add_labels: "status::<new>"
)
```

*CLI:*
```bash
glab issue update <ref> --label "status::<new>"
# Append to existing labels; scoped exclusivity removes old status:: automatically.
```

*API:*
```http
PUT <config.backend.url>/api/v4/projects/<id>/issues/<ref>
PRIVATE-TOKEN: <token>

{ "add_labels": "status::<new>" }
```

**Terminal transition** (done / wont-fix / deferred / duplicate): add reason label + close issue.

*MCP:*
```
mcp__gitlab__update_issue(
  project_id: <config.backend.project_id>,
  issue_iid: <ref>,
  add_labels: "<reason>",
  state_event: "close"
)
```

*CLI:*
```bash
glab issue update <ref> --label "<reason>"
glab issue close <ref>
```

*API:*
```http
PUT <config.backend.url>/api/v4/projects/<id>/issues/<ref>
PRIVATE-TOKEN: <token>

{ "add_labels": "<reason>", "state_event": "close" }
```

---

### list_items

List issues by canonical status (filter via scoped label). For terminal statuses, also filter by `state=closed` + reason label.

**MCP:**
```
mcp__gitlab__list_issues(
  project_id: <config.backend.project_id>,
  labels: "status::<canonical>",
  state: "opened"           # "closed" for terminal
)
```

**CLI:**
```bash
glab issue list --label "status::<canonical>" --output json
# For terminal: glab issue list --label "<reason>" --closed --output json
```

**API:**
```http
GET <config.backend.url>/api/v4/projects/<id>/issues?labels=status::<canonical>&state=opened
PRIVATE-TOKEN: <token>
# Terminal: ?labels=<reason>&state=closed
```

---

### set_subtasks

Write or replace the subtask list as a Markdown task list in the issue description. GitLab renders `- [ ] <subtask>` / `- [x] <subtask>` natively as a task list with progress tracking.

**MCP:**
```
mcp__gitlab__update_issue(
  project_id: <config.backend.project_id>,
  issue_iid: <ref>,
  description: "<existing prose>\n\n## Tasks\n\n- [ ] <subtask1>\n- [ ] <subtask2>"
)
```

**CLI:**
```bash
# Read current description, append/replace task list section, then update:
glab issue update <ref> --description "<updated description with task list>"
```

**API:**
```http
PUT <config.backend.url>/api/v4/projects/<id>/issues/<ref>
PRIVATE-TOKEN: <token>

{ "description": "<existing prose>\n\n## Tasks\n\n- [ ] <subtask1>\n- [ ] <subtask2>" }
```

---

### set_subtask_state

Toggle a specific subtask's checked state in the description's Markdown task list.

**MCP:**
```
# Read current description via get_item, update the matching task-list line,
# then write back:
mcp__gitlab__update_issue(
  project_id: <config.backend.project_id>,
  issue_iid: <ref>,
  description: "<description with '- [x] <subtask>' toggled>"
)
```

**CLI:**
```bash
# Fetch description, replace '- [ ] <subtask>' with '- [x] <subtask>' (or vice versa),
# then update:
glab issue update <ref> --description "<updated description>"
```

**API:**
```http
PUT <config.backend.url>/api/v4/projects/<id>/issues/<ref>
PRIVATE-TOKEN: <token>

{ "description": "<description with toggled task-list line>" }
```

---

### link_artifact

Record an artifact reference (URL, path, build link) as a note on the issue. GitLab has no native artifact field; a structured note is the CONTRACT §Degradation fallback (append link to body — here realized as a note since GitLab notes are the idiomatic body-extension surface).

**MCP:**
```
mcp__gitlab__create_issue_note(
  project_id: <config.backend.project_id>,
  issue_iid: <ref>,
  body: "Artifact: <url_or_path>"
)
```

**CLI:**
```bash
glab issue note <ref> -m "Artifact: <url_or_path>"
```

**API:**
```http
POST <config.backend.url>/api/v4/projects/<id>/issues/<ref>/notes
PRIVATE-TOKEN: <token>

{ "body": "Artifact: <url_or_path>" }
```

---

### comment

Post a free-form note on an issue.

**MCP:**
```
mcp__gitlab__create_issue_note(
  project_id: <config.backend.project_id>,
  issue_iid: <ref>,
  body: "<text>"
)
```

**CLI:**
```bash
glab issue note <ref> -m "<text>"
```

**API:**
```http
POST <config.backend.url>/api/v4/projects/<id>/issues/<ref>/notes
PRIVATE-TOKEN: <token>

{ "body": "<text>" }
```

---

### capture_raw

Store a raw text payload (e.g., tool output, log snippet) as a note on the issue. If `config.captureMode != "backend"` (or the backend is unreachable), fall back to appending a dated bullet to `.maestro/inbox.md` (CONTRACT §Degradation fallback).

**MCP:**
```
mcp__gitlab__create_issue_note(
  project_id: <config.backend.project_id>,
  issue_iid: <ref>,
  body: "```\n<raw text>\n```"
)
```

**CLI:**
```bash
glab issue note <ref> -m "$(printf '```\n%s\n```' "<raw text>")"
```

**API:**
```http
POST <config.backend.url>/api/v4/projects/<id>/issues/<ref>/notes
PRIVATE-TOKEN: <token>

{ "body": "```\n<raw text>\n```" }
```

---

### search

Search issues by keyword across title and description.

**MCP:**
```
mcp__gitlab__list_issues(
  project_id: <config.backend.project_id>,
  search: "<query>"
)
```

**CLI:**
```bash
glab issue list --search "<query>" --output json
```

**API:**
```http
GET <config.backend.url>/api/v4/projects/<id>/issues?search=<query>
PRIVATE-TOKEN: <token>
```

---

### relate

Mark an issue as a duplicate of another: add a cross-reference comment, apply the `duplicate` label, and close the issue.

**MCP:**
```
mcp__gitlab__create_issue_note(
  project_id: <config.backend.project_id>,
  issue_iid: <ref>,
  body: "Duplicate of #<target>"
)
mcp__gitlab__update_issue(
  project_id: <config.backend.project_id>,
  issue_iid: <ref>,
  add_labels: "duplicate",
  state_event: "close"
)
```

**CLI:**
```bash
glab issue note <ref> -m "Duplicate of #<target>"
glab issue update <ref> --label "duplicate"
glab issue close <ref>
```

**API:**
```http
POST <config.backend.url>/api/v4/projects/<id>/issues/<ref>/notes
PRIVATE-TOKEN: <token>
{ "body": "Duplicate of #<target>" }

PUT <config.backend.url>/api/v4/projects/<id>/issues/<ref>
PRIVATE-TOKEN: <token>
{ "add_labels": "duplicate", "state_event": "close" }
```

## Label bootstrap

Run once (e.g., during `/setup`) to ensure all required labels exist. **Idempotent:** list existing labels first; only create missing ones; re-running must not error.

```bash
# List existing labels (JSON array)
EXISTING=$(glab label list --output json 2>/dev/null | python3 -c "import sys,json; print('\n'.join(l['name'] for l in json.load(sys.stdin)))" 2>/dev/null || echo "")

ensure_label() {
  local name="$1" color="$2"
  echo "$EXISTING" | grep -qF "$name" || glab label create --name "$name" --color "$color"
}

# Status scoped labels (non-terminal — open issues)
ensure_label "status::inbox"       "#0075ca"
ensure_label "status::triaged"     "#e4e669"
ensure_label "status::reviewed"    "#a2eeef"
ensure_label "status::planned"     "#d876e3"
ensure_label "status::in-progress" "#f9d0c4"
ensure_label "status::in-review"   "#fef2c0"

# Terminal reason labels (closed issues — NOT scoped; one-of-a-kind)
ensure_label "done"       "#0e8a16"
ensure_label "wont-fix"   "#b60205"
ensure_label "deferred"   "#e99695"
ensure_label "duplicate"  "#cfd3d7"

# Type scoped labels
ensure_label "type::bug"      "#d73a4a"
ensure_label "type::feature"  "#0075ca"
ensure_label "type::refactor" "#e4e669"
ensure_label "type::chore"    "#cfd3d7"

# Priority scoped labels
ensure_label "priority::P1" "#b60205"
ensure_label "priority::P2" "#e99695"
ensure_label "priority::P3" "#fef2c0"

# Tracking sentinel label (unscoped)
ensure_label "maestro:tracked" "#0e8a16"
```

> **Note:** Terminal labels (`done`, `wont-fix`, `deferred`, `duplicate`) and `maestro:tracked` are **not** scoped — they are singleton labels without a `::` namespace, so GitLab does not enforce mutual exclusivity on them. Only `status::*`, `type::*`, and `priority::*` are scoped.

## Degradation

Follows CONTRACT §Degradation; this backend supports: labels (scoped), relations, subtasks-as-tasklist. Fallbacks apply for: link_artifact (no native artifact field → structured note, as above); comment is native (notes); capture_raw falls back to local .maestro/inbox.md when captureMode≠backend (see capture_raw above); search is native; relate uses a note + label close (GitLab has no typed native relations — see relate recipe above).
