# Adapter: gitea

## Capabilities

{ "supports": ["labels","relations","subtasks-as-tasklist"], "scoped_labels": false, "transports": ["mcp","cli","api"] }

## Transport detection

Per `_shape.md` shared recipe. Run once per session before the first op:

1. If `config.transport` is set, use it (skip detection).
2. **MCP:** if my available tools include `mcp__gitea__*`, select `mcp`.
3. **CLI:** else if `command -v tea` succeeds AND `tea login list` returns a non-empty result, select `cli`.
4. **API:** else if a token is available (`config.backend.token` or `$GITEA_TOKEN`), select `api`.
   - REST base: `<config.backend.url>/api/v1/repos/<owner>/<repo>`
5. **None:** STOP and tell the user to set up one of:
   - MCP: install and connect the Gitea MCP server so `mcp__gitea__*` tools are available.
   - CLI: `tea login add` then verify with `tea login list`.
   - API: set `config.backend.token` or `export GITEA_TOKEN=<token>`.
   Never silently fall back to the files adapter.

## Status mapping

Gitea uses plain (non-scoped) labels. `set_status` MUST remove all existing `status:*` labels before adding the new one — plain labels are not natively exclusive.

| Canonical | Gitea label | Issue state |
|---|---|---|
| `inbox` | `status:inbox` | open |
| `triaged` | `status:triaged` | open |
| `reviewed` | `status:reviewed` | open |
| `planned` | `status:planned` | open |
| `in-progress` | `status:in-progress` | open |
| `in-review` | `status:in-review` | open |
| `done` | `done` | **closed** |
| `wont-fix` | `wont-fix` | **closed** |
| `deferred` | `deferred` | **closed** (reopen issue to restore to active status) |
| `duplicate` | `duplicate` | **closed** |

Terminal statuses (`done`, `wont-fix`, `deferred`, `duplicate`): close the issue AND add the reason label. Remove all `status:*` labels.

Non-terminal statuses (`inbox` through `in-review`): keep issue open, remove all existing `status:*` labels, add `status:<canonical>`.

Reopening (e.g. `deferred` → active): reopen the issue (state=open) + remove reason label + add `status:<target>`.

## Field mapping

- **Type:** plain label `type:<x>` where x ∈ {bug, feature, refactor, chore}
- **Priority:** plain label `priority:<x>` where x ∈ {P1, P2, P3}
- **Weight (tracked):** presence of label `maestro:tracked` AND/OR a `## Tasks` task-list block in the issue body. Both are set together when `weight=tracked` is passed.

Gitea has no native milestone-free weight field; the label + body task-list together serve as the tracked indicator.

## Operations

### create_item

Creates a new work item with type, priority, and initial status:inbox.

- **MCP:** `mcp__gitea__issue_write` (action=create, title=title, body=body); then `mcp__gitea__label_write` to add labels `type:<x>`, `priority:<x>`, `status:inbox`; if `weight=tracked` also add `maestro:tracked`. Return the issue number.
- **CLI:**
  ```
  tea issues create --title "<title>" --body "<body>" --labels "type:<x>,priority:<x>,status:inbox"
  ```
  Append `,maestro:tracked` to `--labels` if `weight=tracked`.
- **API:**
  ```
  POST /api/v1/repos/<owner>/<repo>/issues
  { "title": "<title>", "body": "<body>", "labels": [<label_ids for type:x, priority:x, status:inbox>] }
  ```
  Resolve label IDs via GET /labels first. Return `number` from response.

### get_item

Fetches a single issue and maps it to the normalized record.

- **MCP:** `mcp__gitea__issue_read` (number=ref) → extract title, body, labels, state, created_at, updated_at. Derive canonical status: find the `status:*` label for non-terminal; or the reason label (`done`/`wont-fix`/`deferred`/`duplicate`) for closed issues. Weight = `maestro:tracked` label present OR `## Tasks` block in body. Artifacts/links from `## Artifacts` body section.
- **CLI:**
  ```
  tea issues <ref> --output json
  ```
  Parse JSON; apply same field derivation as MCP path.
- **API:**
  ```
  GET /api/v1/repos/<owner>/<repo>/issues/<ref>
  ```
  Map response fields to normalized record.

Normalized record fields: `{ id, title, body, type, priority, status (canonical), weight, artifacts, relations, created_at, updated_at }`.

### update_item

Edits title and/or body; updates type or priority labels.

- **MCP:** `mcp__gitea__issue_write` (action=edit, number=id) for title/body changes. For type/priority label changes: `mcp__gitea__label_read` to get current labels, remove old `type:*`/`priority:*` via label remove, add new via `mcp__gitea__label_write`.
- **CLI:**
  ```
  tea issues edit <id> --title "<new_title>" --body "<new_body>"
  tea labels add <id> type:<new_type>
  tea labels remove <id> type:<old_type>
  ```
- **API:**
  ```
  PATCH /api/v1/repos/<owner>/<repo>/issues/<id>
  { "title": "<new_title>", "body": "<new_body>" }
  ```
  Then GET current labels, compute add/remove sets, PATCH /issues/<id>/labels.

### set_status

Transitions a work item to a new canonical status. Always removes all existing `status:*` labels before adding the new one.

Steps:
1. Fetch current labels via `mcp__gitea__label_read` / `tea labels list <id>` / `GET /issues/<id>/labels`.
2. Remove all labels matching `status:*` pattern.
3. If the new canonical is **terminal** (`done`, `wont-fix`, `deferred`, `duplicate`):
   - Close the issue (state=closed).
   - Add the reason label (e.g. `done`, `wont-fix`, `deferred`, `duplicate`).
4. If the new canonical is **non-terminal** (`inbox` through `in-review`):
   - Ensure the issue is open (state=open — handles reopen from terminal).
   - Remove any terminal reason labels (`done`, `wont-fix`, `deferred`, `duplicate`) that may be present.
   - Add `status:<canonical>`.

- **MCP:**
  ```
  mcp__gitea__label_read (number=id)           # get current labels
  mcp__gitea__issue_write (action=edit, number=id, labels=[filtered_label_ids])  # remove status:*
  mcp__gitea__label_write (number=id, labels=[new_label_id])                     # add new label
  mcp__gitea__issue_write (action=edit, number=id, state="closed"|"open")        # if terminal or reopening
  ```
- **CLI:**
  ```
  tea issues edit <id> --state closed          # terminal only
  tea labels remove <id> status:<old>          # remove each existing status:* label
  tea labels add <id> <new_label>              # add done / wont-fix / status:in-progress / etc.
  ```
- **API:**
  ```
  GET /api/v1/repos/<owner>/<repo>/issues/<id>/labels   # fetch current
  DELETE /api/v1/repos/<owner>/<repo>/issues/<id>/labels/<label_id>  # remove each status:* label
  POST /api/v1/repos/<owner>/<repo>/issues/<id>/labels  # add new label
  PATCH /api/v1/repos/<owner>/<repo>/issues/<id> { "state": "closed" }  # terminal only
  ```

### list_items

Lists work items, optionally filtered by status, type, priority, or weight.

- **MCP:**
  ```
  mcp__gitea__list_issues (state="open"|"closed"|"all", labels="status:<x>,type:<y>,priority:<z>")
  ```
  Use `search_issues` for keyword + label combined queries. Map each result to a normalized record.
- **CLI:**
  ```
  tea issues list --state all --labels "status:<x>,type:<y>,priority:<z>" --output json
  ```
  Omit label flags not specified in the filter. If `weight=tracked`, include `maestro:tracked` in label filter.
- **API:**
  ```
  GET /api/v1/repos/<owner>/<repo>/issues?state=all&labels=status:<x>,type:<y>,priority:<z>&limit=50&page=1
  ```
  Paginate if response length equals limit. Map each item to normalized record.

### set_subtasks

Writes or replaces the task-list block in the issue body.

Gitea does not have a native subtask field; subtasks are represented as a `## Tasks` markdown task-list in the issue body. `supports: subtasks-as-tasklist`.

- **MCP:**
  ```
  mcp__gitea__issue_read (number=id)           # fetch current body
  # Replace or append ## Tasks section with:
  # ## Tasks
  # - [ ] <ref1> — <title1>
  # - [ ] <ref2> — <title2>
  mcp__gitea__issue_write (action=edit, number=id, body=<updated_body>)
  ```
- **CLI:**
  ```
  # Fetch body: tea issues <id> --output json | jq -r .body
  # Replace ## Tasks block in body text
  tea issues edit <id> --body "<updated_body>"
  ```
- **API:**
  ```
  GET /api/v1/repos/<owner>/<repo>/issues/<id>    # fetch body
  PATCH /api/v1/repos/<owner>/<repo>/issues/<id> { "body": "<updated_body_with_tasks_section>" }
  ```

### set_subtask_state

Updates the state of a single task-list line within the `## Tasks` body section.

State encoding: todo = `[ ]`, doing = `[~]`, done = `[x]`.

- **MCP:**
  ```
  mcp__gitea__issue_read (number=id)           # fetch body
  # Find the line matching <ref>, replace [ ]/[~]/[x] with the new state marker
  mcp__gitea__issue_write (action=edit, number=id, body=<updated_body>)
  ```
- **CLI:**
  ```
  tea issues <id> --output json | jq -r .body   # get body
  # sed-replace the task line, then:
  tea issues edit <id> --body "<updated_body>"
  ```
- **API:**
  ```
  GET /api/v1/repos/<owner>/<repo>/issues/<id>
  PATCH /api/v1/repos/<owner>/<repo>/issues/<id> { "body": "<updated_body>" }
  ```

### link_artifact

Records an artifact (PR, commit, deployment, etc.) against a work item. Gitea has no native artifact field; artifacts are stored in a `## Artifacts` body section.

- **MCP:**
  ```
  mcp__gitea__issue_read (number=id)           # fetch body
  # Append to ## Artifacts section (create section if absent):
  # - <kind>: <ref>
  mcp__gitea__issue_write (action=edit, number=id, body=<updated_body>)
  ```
- **CLI:**
  ```
  tea issues <id> --output json | jq -r .body
  # append artifact line to ## Artifacts section
  tea issues edit <id> --body "<updated_body>"
  ```
- **API:**
  ```
  GET /api/v1/repos/<owner>/<repo>/issues/<id>
  PATCH /api/v1/repos/<owner>/<repo>/issues/<id> { "body": "<updated_body>" }
  ```

### comment

Posts a comment on an issue.

- **MCP:** `mcp__gitea__issue_write` (action=create_comment, number=id, body=text)
- **CLI:**
  ```
  tea comment create <id> --body "<text>"
  ```
- **API:**
  ```
  POST /api/v1/repos/<owner>/<repo>/issues/<id>/comments
  { "body": "<text>" }
  ```

### capture_raw

Captures raw text as a new inbox item, routing to backend or local file depending on config.

- If `config.captureMode == "backend"`: create a draft issue using the `create_item` path with `title` = first line of text, `body` = full text, `type` = inferred or omitted, `priority` = P3 (default), `status:inbox`. Uses whichever transport is active.
- Else: append a dated entry to `.maestro/inbox.md` (local files fallback — does not use any Gitea transport).

- **MCP (backend mode):** call `create_item` path using `mcp__gitea__issue_write` + `mcp__gitea__label_write` as described above.
- **CLI (backend mode):**
  ```
  tea issues create --title "<first_line>" --body "<full_text>" --labels "status:inbox,priority:P3"
  ```
- **API (backend mode):**
  ```
  POST /api/v1/repos/<owner>/<repo>/issues
  { "title": "<first_line>", "body": "<full_text>", "labels": [<status:inbox id>, <priority:P3 id>] }
  ```

### search

Searches issues by keyword, optionally combined with label filters.

- **MCP:** `mcp__gitea__search_issues` (q=query, labels=label_filter, state="all")
- **CLI:**
  ```
  tea issues list --keyword "<query>" --state all --output json
  ```
- **API:**
  ```
  GET /api/v1/repos/<owner>/<repo>/issues?q=<query>&state=all&type=issues
  ```

### relate

Records a relation between two work items. Gitea supports optional issue dependencies via the API; for all relation kinds, a comment is always posted as a reliable fallback.

- For `duplicate`: post a comment AND call `set_status(id, "duplicate")` to close the issue.
- For `blocks` / `blocked-by` / `related`: post a comment `"<kind> #<target>"`. Additionally, if Gitea's dependency feature is available in config (`config.backend.gitea_dependencies: true`), call the dependency API.

- **MCP:**
  ```
  mcp__gitea__issue_write (action=create_comment, number=id, body="<kind> #<target>")
  # if duplicate: also call set_status(id, "duplicate")
  # if dependencies enabled: mcp__gitea__issue_write (action=add_dependency, number=id, target=target)
  ```
- **CLI:**
  ```
  tea comment create <id> --body "<kind> #<target>"
  # if duplicate:
  tea issues edit <id> --state closed
  tea labels add <id> duplicate
  ```
- **API:**
  ```
  POST /api/v1/repos/<owner>/<repo>/issues/<id>/comments { "body": "<kind> #<target>" }
  # if duplicate:
  PATCH /api/v1/repos/<owner>/<repo>/issues/<id> { "state": "closed" }
  POST /api/v1/repos/<owner>/<repo>/issues/<id>/labels { "labels": [<duplicate_label_id>] }
  ```

## Label bootstrap

Run once during setup (or on demand). Idempotent: list existing labels first; create only those missing.

Required labels:

| Label | Color (suggested) | Group |
|---|---|---|
| `status:inbox` | `#e6e6e6` | status |
| `status:triaged` | `#cce5ff` | status |
| `status:reviewed` | `#b3d9ff` | status |
| `status:planned` | `#80bfff` | status |
| `status:in-progress` | `#ffcc00` | status |
| `status:in-review` | `#ff9900` | status |
| `done` | `#00cc44` | terminal |
| `wont-fix` | `#cc0000` | terminal |
| `deferred` | `#9966cc` | terminal |
| `duplicate` | `#aaaaaa` | terminal |
| `type:bug` | `#d93f0b` | type |
| `type:feature` | `#0075ca` | type |
| `type:refactor` | `#e4e669` | type |
| `type:chore` | `#cccccc` | type |
| `priority:P1` | `#b60205` | priority |
| `priority:P2` | `#e99695` | priority |
| `priority:P3` | `#f9d0c4` | priority |
| `maestro:tracked` | `#5319e7` | maestro |

Bootstrap procedure (all three transports follow the same logic — check then create):

- **MCP:**
  ```
  mcp__gitea__label_read (list all labels)
  # For each required label not in the list:
  mcp__gitea__label_write (action=create, name=<label>, color=<color>)
  ```
- **CLI:**
  ```
  tea labels list --output json   # parse existing names
  # For each missing label:
  tea labels create --name "<label>" --color "<color>"
  ```
- **API:**
  ```
  GET /api/v1/repos/<owner>/<repo>/labels        # list existing; collect names
  # For each required label not in existing names:
  POST /api/v1/repos/<owner>/<repo>/labels { "name": "<label>", "color": "<color>" }
  ```

Never error if a label already exists. On conflict (label exists with different color), skip — do not overwrite user customizations.
