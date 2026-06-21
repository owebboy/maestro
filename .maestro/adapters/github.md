# GitHub adapter profile

**Backend:** GitHub (`github.com` or GitHub Enterprise)
**Profile version:** 1.0

## Capabilities

```json
{
  "supports": ["labels", "relations", "subtasks-as-tasklist"],
  "scoped_labels": false,
  "transports": ["mcp", "cli", "api"]
}
```

Note: `subtasks-as-tasklist` is declared (not `subissues`) because the GitHub sub-issues API and `gh` sub-issue commands are not yet generally available. Subtasks are tracked as Markdown task-lists (`- [ ] …`) in the issue body, which GitHub renders as a native progress bar.

## Transport detection

Follow the shared recipe from `_shape.md`. GitHub-specific values:

- **MCP prefix:** `mcp__github__` — check whether tools named `mcp__github__*` are in your available tool set (agent introspection, not a shell command).
- **CLI binary:** `gh` — detect with `command -v gh`, then confirm auth with `gh auth status`.
- **REST base:** `https://api.github.com/repos/<owner>/<repo>` — requires a token in `config.backend.token` or the `GITHUB_TOKEN` env var.

If none of MCP / CLI / API resolves, STOP and tell the user:
- MCP: connect the `github` MCP server and confirm `mcp__github__*` tools appear.
- CLI: run `gh auth login` (interactive) or `gh auth login --with-token <<< "$GITHUB_TOKEN"`.
- API: set `config.backend.token` or export `GITHUB_TOKEN=<pat>`.

Never silently fall back to the files adapter.

## Status mapping

Plain labels — not natively exclusive. `set_status` MUST remove all sibling `status:*` labels before adding the new one.

| Canonical     | GitHub label     | Issue state | Close reason (gh CLI)              |
|---------------|------------------|-------------|------------------------------------|
| `inbox`       | `status:inbox`   | open        | —                                  |
| `triaged`     | `status:triaged` | open        | —                                  |
| `reviewed`    | `status:reviewed`| open        | —                                  |
| `planned`     | `status:planned` | open        | —                                  |
| `in-progress` | `status:in-progress` | open   | —                                  |
| `in-review`   | `status:in-review`   | open   | —                                  |
| `done`        | `done`           | **closed**  | `--reason completed`               |
| `wont-fix`    | `wont-fix`       | **closed**  | `--reason not_planned`             |
| `deferred`    | `deferred`       | **closed**  | `--reason not_planned`             |
| `duplicate`   | `duplicate`      | **closed**  | `--reason not_planned`             |

Terminal transitions:
1. Remove all `status:*` labels.
2. Add the reason label (`done`, `wont-fix`, `deferred`, or `duplicate`).
3. Close the issue with the appropriate `--reason`.

Reopen (restoring a terminal item): `gh issue reopen <id>`, then set the appropriate non-terminal `status:*` label (default `status:triaged`).

## Field mapping

| Maestro field | GitHub representation        |
|---------------|------------------------------|
| `type`        | plain label `type:<value>` (`bug`, `feature`, `refactor`, `chore`) |
| `priority`    | plain label `priority:<value>` (`P1`, `P2`, `P3`) |
| `weight`      | presence of label `maestro:tracked` AND/OR a task-list in the body |

Weight is considered "tracked" when the issue carries the `maestro:tracked` label or the body contains at least one `- [ ]` / `- [x]` task-list entry.

## Operations

Each op shows MCP, CLI, and API renderings in order. Use the transport resolved at session start.

Variable conventions: `<owner>`/`<repo>` come from splitting `config.backend.repo` (format `owner/name`) on `/`; `<number>` is the issue number parsed from the item id; `<token>` is `config.backend.token` or `$GITHUB_TOKEN`.

---

### create_item

Create a new issue in the repository.

**MCP**
```
mcp__github__create_issue(
  owner=<owner>, repo=<repo>,
  title=<title>, body=<body>,
  labels=["type:<type>", "priority:<priority>", "status:inbox"]
)
```

**CLI**
```bash
gh issue create \
  --title "<title>" \
  --body "<body>" \
  --label "type:<type>" \
  --label "priority:<priority>" \
  --label "status:inbox"
# Returns issue URL and number.
```

**API**
```http
POST https://api.github.com/repos/<owner>/<repo>/issues
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "<title>",
  "body": "<body>",
  "labels": ["type:<type>", "priority:<priority>", "status:inbox"]
}
```

---

### get_item

Fetch a single issue by number and return the normalized record.

**MCP**
```
mcp__github__get_issue(owner=<owner>, repo=<repo>, issue_number=<number>)
```

**CLI**
```bash
gh issue view <number> \
  --json number,title,body,labels,state,url,createdAt,updatedAt
```

**API**
```http
GET https://api.github.com/repos/<owner>/<repo>/issues/<number>
Authorization: Bearer <token>
```

Normalize the response to the CONTRACT record: extract `status:*` → `status`, `type:*` → `type`, `priority:*` → `priority`, terminal labels → `status`.

---

### update_item

Update title and/or body of an existing issue.

**MCP**
```
mcp__github__update_issue(
  owner=<owner>, repo=<repo>, issue_number=<number>,
  title=<new_title>,   # omit if unchanged
  body=<new_body>      # omit if unchanged
)
```

**CLI**
```bash
gh issue edit <number> \
  --title "<new_title>" \
  --body "<new_body>"
# Omit --title or --body if not changing that field.
```

**API**
```http
PATCH https://api.github.com/repos/<owner>/<repo>/issues/<number>
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "<new_title>",
  "body": "<new_body>"
}
```

---

### set_status

Transition an issue to a new canonical status. For non-terminal targets: remove all `status:*` labels, add the new `status:<target>`. For terminal targets: remove all `status:*` labels, add the reason label, and close the issue.

**MCP — non-terminal**
```
# 1. Fetch current labels to identify sibling status:* labels.
mcp__github__get_issue(owner=<owner>, repo=<repo>, issue_number=<number>)

# 2. Remove old status:* labels, add new status:<target>.
mcp__github__update_issue(
  owner=<owner>, repo=<repo>, issue_number=<number>,
  labels=<current_labels_minus_status_siblings + ["status:<target>"]>
)
```

**MCP — terminal (done / wont-fix / deferred / duplicate)**
```
# 1. Fetch and strip status:* labels, add reason label.
mcp__github__update_issue(
  owner=<owner>, repo=<repo>, issue_number=<number>,
  labels=<current_labels_minus_status_siblings + ["<reason_label>"]>
)
# 2. Close issue.
mcp__github__close_issue(owner=<owner>, repo=<repo>, issue_number=<number>)
# Note: MCP may not expose --reason; use CLI or API for close-reason precision.
```

**CLI — non-terminal**
```bash
# Get current status labels.
CURRENT=$(gh issue view <number> --json labels --jq '[.labels[].name | select(startswith("status:"))] | @sh')
# Remove each sibling status:* label, add new one.
gh issue edit <number> \
  $(echo $CURRENT | xargs -n1 printf ' --remove-label %s') \
  --add-label "status:<target>"
```

**CLI — terminal**
```bash
# Remove status:* siblings, add reason label, close with reason.
CURRENT=$(gh issue view <number> --json labels --jq '[.labels[].name | select(startswith("status:"))] | @sh')
gh issue edit <number> \
  $(echo $CURRENT | xargs -n1 printf ' --remove-label %s') \
  --add-label "<reason_label>"
# close-reason mapping:
#   done       → --reason completed
#   wont-fix   → --reason not_planned
#   deferred   → --reason not_planned
#   duplicate  → --reason not_planned
gh issue close <number> --reason completed     # or not_planned
```

**CLI — reopen**
```bash
gh issue reopen <number>
gh issue edit <number> --add-label "status:triaged"
```

**API — non-terminal**
```http
# Step 1: GET current labels.
GET https://api.github.com/repos/<owner>/<repo>/issues/<number>

# Step 2: PATCH with updated label list (remove status:* siblings, add new).
PATCH https://api.github.com/repos/<owner>/<repo>/issues/<number>
Authorization: Bearer <token>
Content-Type: application/json

{ "labels": ["<non-status-labels...>", "status:<target>"] }
```

**API — terminal**
```http
# Step 1: PATCH to replace status:* siblings with reason label.
PATCH https://api.github.com/repos/<owner>/<repo>/issues/<number>
Authorization: Bearer <token>
Content-Type: application/json

{ "labels": ["<non-status-labels...>", "<reason_label>"], "state": "closed",
  "state_reason": "completed" }
# state_reason: "completed" for done; "not_planned" for wont-fix/deferred/duplicate.
```

---

### list_items

List issues filtered by status label and/or state.

**MCP**
```
mcp__github__list_issues(
  owner=<owner>, repo=<repo>,
  labels=["status:<x>"],
  state="open"   # or "closed" or "all"
)
```

**CLI**
```bash
gh issue list \
  --label "status:<x>" \
  --state all \
  --json number,title,labels,state,url,createdAt,updatedAt
```

For terminal statuses (done/wont-fix/deferred/duplicate), filter by the reason label instead of `status:*`:
```bash
gh issue list \
  --label "<reason_label>" \
  --state closed \
  --json number,title,labels,state,url,createdAt,updatedAt
```

**API**
```http
GET https://api.github.com/repos/<owner>/<repo>/issues?labels=status:<x>&state=all&per_page=100
Authorization: Bearer <token>
```

---

### set_subtasks

Write or replace the task-list in the issue body. GitHub renders `- [ ]` items as a native progress bar.

**MCP**
```
# Fetch current body, replace or append the task-list block.
mcp__github__get_issue(owner=<owner>, repo=<repo>, issue_number=<number>)
# Construct new body with task-list:
# ## Tasks\n- [ ] <task1>\n- [ ] <task2>\n...
mcp__github__update_issue(
  owner=<owner>, repo=<repo>, issue_number=<number>,
  body=<updated_body_with_tasklist>
)
```

**CLI**
```bash
# Fetch current body, splice in (or replace) the task-list section, then update.
BODY=$(gh issue view <number> --json body --jq '.body')
# Construct NEW_BODY with updated ## Tasks section containing:
# - [ ] <task1>
# - [ ] <task2>
gh issue edit <number> --body "$NEW_BODY"
```

**API**
```http
# GET current body, merge task-list, PATCH.
GET https://api.github.com/repos/<owner>/<repo>/issues/<number>

PATCH https://api.github.com/repos/<owner>/<repo>/issues/<number>
Authorization: Bearer <token>
Content-Type: application/json

{ "body": "<updated_body_with_tasklist>" }
```

Task-list block format (place under `## Tasks` heading in body):
```
## Tasks
- [ ] <task 1 description>
- [ ] <task 2 description>
```

---

### set_subtask_state

Set a specific task-list item's state by editing the issue body.

**MCP**
```
mcp__github__get_issue(owner=<owner>, repo=<repo>, issue_number=<number>)
# Toggle the matching "- [ ] <description>" ↔ "- [x] <description>" line.
mcp__github__update_issue(
  owner=<owner>, repo=<repo>, issue_number=<number>,
  body=<updated_body>
)
```

**CLI**
```bash
BODY=$(gh issue view <number> --json body --jq '.body')
# Replace "- [ ] <task_description>" with "- [x] <task_description>" (or reverse).
NEW_BODY=$(echo "$BODY" | sed 's/- \[ \] <task_description>/- [x] <task_description>/')
gh issue edit <number> --body "$NEW_BODY"
```

**API**
```http
GET https://api.github.com/repos/<owner>/<repo>/issues/<number>

PATCH https://api.github.com/repos/<owner>/<repo>/issues/<number>
Authorization: Bearer <token>
Content-Type: application/json

{ "body": "<updated_body_with_toggled_task>" }
```

Match the task line by its description text and set its marker for the target state. State encoding: todo = `[ ]`, doing = `[~]`, done = `[x]` (matching the files/gitea adapters; GitHub renders `[~]` as literal text rather than a checkbox, but it round-trips through `get_item`).

---

### link_artifact

Record a relationship between an issue and an external artifact (PR, commit, deploy URL, etc.) by posting a structured comment. GitHub has no native artifact field; a structured comment is the CONTRACT §Degradation fallback ("append link to body" — here realized as a comment rather than body edit, since GitHub comments are the idiomatic body-extension surface).

**MCP**
```
mcp__github__create_issue_comment(
  owner=<owner>, repo=<repo>, issue_number=<number>,
  body="artifact: <kind> <url_or_ref>\n\n<optional_note>"
)
```

**CLI**
```bash
gh issue comment <number> \
  --body "artifact: <kind> <url_or_ref>

<optional_note>"
```

**API**
```http
POST https://api.github.com/repos/<owner>/<repo>/issues/<number>/comments
Authorization: Bearer <token>
Content-Type: application/json

{ "body": "artifact: <kind> <url_or_ref>\n\n<optional_note>" }
```

Artifact kinds: `pr`, `commit`, `deploy`, `doc`, `run`, `other`. Linking a PR by number also cross-references automatically on GitHub.

---

### comment

Post a free-text comment on an issue.

**MCP**
```
mcp__github__create_issue_comment(
  owner=<owner>, repo=<repo>, issue_number=<number>,
  body="<comment_text>"
)
```

**CLI**
```bash
gh issue comment <number> --body "<comment_text>"
```

**API**
```http
POST https://api.github.com/repos/<owner>/<repo>/issues/<number>/comments
Authorization: Bearer <token>
Content-Type: application/json

{ "body": "<comment_text>" }
```

---

### capture_raw

Store raw external data (webhook payload, CI output, external ticket dump) against an issue as a collapsible comment block. If `config.captureMode != "backend"` (or the backend is unreachable), fall back to appending a dated bullet to `.maestro/inbox.md` (CONTRACT §Degradation fallback).

**MCP**
```
mcp__github__create_issue_comment(
  owner=<owner>, repo=<repo>, issue_number=<number>,
  body="<details>\n<summary>raw capture: <source_label></summary>\n\n```\n<raw_data>\n```\n</details>"
)
```

**CLI**
```bash
gh issue comment <number> --body "$(cat <<'EOF'
<details>
<summary>raw capture: <source_label></summary>

\`\`\`
<raw_data>
\`\`\`
</details>
EOF
)"
```

**API**
```http
POST https://api.github.com/repos/<owner>/<repo>/issues/<number>/comments
Authorization: Bearer <token>
Content-Type: application/json

{
  "body": "<details>\n<summary>raw capture: <source_label></summary>\n\n```\n<raw_data>\n```\n</details>"
}
```

---

### search

Search issues by keyword, label, or combined query.

**MCP**
```
mcp__github__search_issues(
  q="<query> repo:<owner>/<repo>",
  per_page=30
)
```

**CLI**
```bash
gh issue list --search "<query>" \
  --state all \
  --json number,title,labels,state,url
```

Search query examples:
- Keyword: `gh issue list --search "login bug"`
- Label filter: `gh issue list --label "priority:P1" --state open`
- Combined: `gh issue list --search "auth" --label "type:bug" --state open`

**API**
```http
GET https://api.github.com/search/issues?q=<query>+repo:<owner>/<repo>&per_page=30
Authorization: Bearer <token>
```

---

### relate

Record a logical relationship between two issues. GitHub does not have native typed relations; Maestro uses a structured comment plus optional duplicate closure.

**MCP**
```
# Post relation comment on the source issue.
mcp__github__create_issue_comment(
  owner=<owner>, repo=<repo>, issue_number=<source>,
  body="relates-to: #<target> (<relation_type>)"
)
# For duplicate: also set_status source → duplicate (closes it).
```

**CLI**
```bash
# Post relation comment.
gh issue comment <source> --body "relates-to: #<target> (<relation_type>)"

# For duplicate: close source as duplicate of target.
gh issue comment <source> --body "Duplicate of #<target>"
gh issue edit <source> --add-label "duplicate" \
  $(gh issue view <source> --json labels --jq '[.labels[].name | select(startswith("status:"))] | @sh' | xargs -n1 printf ' --remove-label %s')
gh issue close <source> --reason not_planned
```

**API**
```http
# Post comment.
POST https://api.github.com/repos/<owner>/<repo>/issues/<source>/comments
Authorization: Bearer <token>
Content-Type: application/json

{ "body": "relates-to: #<target> (<relation_type>)" }

# For duplicate: PATCH state + labels, then close.
PATCH https://api.github.com/repos/<owner>/<repo>/issues/<source>
Authorization: Bearer <token>
Content-Type: application/json

{
  "labels": ["<non-status-labels...>", "duplicate"],
  "state": "closed",
  "state_reason": "not_planned"
}
```

Relation types: `blocks`, `blocked-by`, `relates-to`, `duplicate` (use `duplicate` to trigger closure).

## Label bootstrap

Run once per repository (idempotent — lists existing labels first, creates only missing ones).

```bash
# Fetch existing label names.
EXISTING=$(gh label list --limit 200 --json name --jq '[.[].name]')

create_label_if_missing() {
  local name="$1" color="$2" desc="$3"
  if ! echo "$EXISTING" | grep -q "\"$name\""; then
    gh label create "$name" --color "$color" --description "$desc" 2>/dev/null || true
  fi
}

# Status labels (open — plain, not scoped)
create_label_if_missing "status:inbox"       "ededed" "Maestro: not yet triaged"
create_label_if_missing "status:triaged"     "0075ca" "Maestro: triaged"
create_label_if_missing "status:reviewed"    "e4e669" "Maestro: reviewed"
create_label_if_missing "status:planned"     "bfd4f2" "Maestro: planned"
create_label_if_missing "status:in-progress" "fbca04" "Maestro: in progress"
create_label_if_missing "status:in-review"   "d93f0b" "Maestro: in review"

# Terminal / close-reason labels
create_label_if_missing "done"      "0e8a16" "Maestro: completed"
create_label_if_missing "wont-fix"  "b60205" "Maestro: will not fix"
create_label_if_missing "deferred"  "c5def5" "Maestro: deferred"
create_label_if_missing "duplicate" "cfd3d7" "Maestro: duplicate"

# Type labels
create_label_if_missing "type:bug"      "d73a4a" "Bug report"
create_label_if_missing "type:feature"  "a2eeef" "New feature"
create_label_if_missing "type:refactor" "e4e669" "Code refactor"
create_label_if_missing "type:chore"    "ededed" "Chore / maintenance"

# Priority labels
create_label_if_missing "priority:P1" "b60205" "Priority: critical"
create_label_if_missing "priority:P2" "fbca04" "Priority: high"
create_label_if_missing "priority:P3" "0075ca" "Priority: normal"

# Tracking label
create_label_if_missing "maestro:tracked" "5319e7" "Maestro: work item tracked"
```

Re-running this script is safe: `gh label list` captures the current state before each run; labels that already exist are skipped.

## Degradation

Follows CONTRACT §Degradation; this backend supports: labels, relations, subtasks-as-tasklist. Fallbacks apply for: link_artifact (no native artifact field → structured comment, as above); comment is native; capture_raw falls back to local .maestro/inbox.md when captureMode≠backend (see capture_raw above); search is native; relate uses a structured comment (GitHub has no native typed relations, as noted in the relate recipe above).
