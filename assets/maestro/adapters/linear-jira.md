# Adapter: linear-jira

> Adapter name: this profile serves config.adapter `linear` OR `jira`. All recipes below
> branch on the active adapter name. config.backend.kind is the same value (linear|jira).

## Capabilities

```jsonc
{ "supports": ["native-states","subissues","relations","priority-field","type-field"],
  "scoped_labels": false, "transports": ["mcp","api"]  /* +cli for jira */ }
```

## Transport detection

Per `_shape.md` shared recipe. Run once per session before the first op. Detection differs by backend:

### Linear transport detection

1. If `config.transport` is set, use it (skip detection).
2. **MCP:** if my available tools include `mcp__linear__*`, select `mcp`.
3. **API:** else if a token is available (`config.backend.token` or `$LINEAR_API_KEY`), select `api`.
   - GraphQL endpoint: `https://api.linear.app/graphql`
   - Header: `Authorization: <token>` (Linear API key)
4. **None:** STOP and tell the user to set up one of:
   - MCP: install and connect the Linear MCP server so `mcp__linear__*` tools are available.
   - API: set `config.backend.token` or `export LINEAR_API_KEY=<token>`.
   Linear has no official CLI — never fall back to CLI or files.

### Jira transport detection

1. If `config.transport` is set, use it (skip detection).
2. **MCP:** if my available tools include `mcp__atlassian__*` or `mcp__jira__*`, select `mcp`.
3. **CLI:** else if `command -v jira` succeeds AND `jira me` returns a non-error result (ankitpokhrel/jira-cli), select `cli`.
4. **API:** else if a token is available (`config.backend.token` or `$JIRA_API_TOKEN`) AND `config.backend.url` is set, select `api`.
   - REST base: `<config.backend.url>/rest/api/3`
   - Auth: Basic `<email>:<token>` (email from `config.backend.email` or `$JIRA_USER_EMAIL`)
5. **None:** STOP and tell the user to set up one of:
   - MCP: install and connect the Atlassian/Jira MCP server so `mcp__atlassian__*` tools are available.
   - CLI: `jira init` then verify with `jira me`.
   - API: set `config.backend.token` + `config.backend.url` + `config.backend.email`, or the corresponding env vars.
   Never silently fall back to the files adapter.

## Status mapping

Unlike the git-forge adapters, Linear and Jira use **native workflow states** — the team's board state names are authoritative. Maestro does not create or manage states; it maps canonical statuses onto existing states.

### Four-tier resolution rule

**Write path (canonical → native, used by `set_status`):**

1. **Tier 1 — statusMap:** if `config.statusMap[<canonical>]` is set, use that native state name exactly. This always wins.
2. **Tier 2 — default table:** else look up the backend-specific default in the table below.
3. **Tier 3 — fuzzy match:** else case-insensitively match `<canonical>` (and common synonyms: `reviewed` ↔ {Selected, Ready}; `in-progress` ↔ {In Progress, Doing}; `done` ↔ {Done, Closed, Complete}) against the team's discovered states (cached at setup).
4. **Tier 4 — ask:** if no match, STOP and ask the user which native state corresponds to `<canonical>`; offer to persist their answer into `config.statusMap` so it never asks again.

**Read path (native → canonical, used by `get_item`/`list_items`):**

1. Invert `config.statusMap` first (native name → canonical).
2. Else invert the default table for this backend.
3. Else fuzzy/synonym match (same synonyms as write path).
4. Else report status as `inbox` and warn that the native state is unmapped; prompt the user to add it to `config.statusMap`.

**Tie-break note (read path):** inverting the default table is ambiguous when multiple canonical statuses map to the same native state (e.g. Linear "Backlog" ← both `triaged` and `deferred`; "Todo" ← `reviewed` and `planned`). Resolve by preferring the **first matching row top-to-bottom** in the default table. A per-team `config.statusMap` is the authoritative disambiguator and always wins over this tie-break.

### Default canonical → native state table (tier-2; per-team overridable via statusMap)

| Canonical | Linear (default) | Jira (typical, remappable) |
|---|---|---|
| `inbox` | Triage | Backlog |
| `triaged` | Backlog | To Do |
| `reviewed` | Todo | Selected for Development |
| `planned` | Todo | To Do |
| `in-progress` | In Progress | In Progress |
| `in-review` | In Review | In Review |
| `done` | Done | Done |
| `wont-fix` | Canceled | Won't Do |
| `deferred` | Backlog | Backlog |
| `duplicate` | Duplicate | Duplicate |

**Important:** There is NO separate open/close call. Setting any state (including `done`, `wont-fix`, `deferred`, `duplicate`) is a single native state transition. The native state implies open/closed; Maestro does not manage this separately.

### Worked example — remap precedence (tier 1 beats tier 2)

A team calls its "ready for development" column **"Selected for Dev"**. Their `/setup` discovery wrote:

```json
"statusMap": { "reviewed": "Selected for Dev" }
```

Now an unchanged lifecycle skill calls the abstract op `set_status(id, reviewed)`:

1. **Tier 1 — statusMap:** `config.statusMap["reviewed"]` is `"Selected for Dev"` → resolved native state = **"Selected for Dev"**. Resolution stops here.
2. Tier 2 (default table: Linear `Todo` / Jira `Selected for Development`) is **never consulted**, because tier 1 matched.

The agent then transitions the issue to "Selected for Dev" (Linear: look up its `stateId`; Jira: find the transition whose target status is "Selected for Dev"). The skill said `reviewed`; the profile — not the skill — decided that this team's `reviewed` means "Selected for Dev". This is the whole point of P3: **a backend is fitted to any team's workflow by editing `config.statusMap`, with zero lifecycle-skill changes.**

## Field mapping

Native trackers support first-class priority, type, and weight fields — do NOT use labels.

### Priority

Map Maestro `priority` → native priority field:

- **Linear:** `priority` property on the issue. Values: `0=No priority`, `1=Urgent`, `2=High`, `3=Medium`, `4=Low`. Maestro mapping: P1 → Urgent (1), P2 → High (2), P3 → Low (4).
- **Jira:** `priority` field on the issue. Default scheme values: `Highest`, `High`, `Medium`, `Low`, `Lowest`. Maestro mapping: P1 → Highest, P2 → High, P3 → Low. If `config.fieldMap.priority` is set, use those mappings instead.

Read path (native → canonical): invert the map; if no match, default to P3.

### Type

Map Maestro `type` → native issue type:

- **Linear:** `labelIds` with a team-specific label (e.g. `Bug`, `Feature`); OR if the Linear team has issue types enabled, use the `issueType` field. Prefer `config.fieldMap.type` mappings if set.
- **Jira:** `issuetype` field. Typical mapping: `bug` → Bug, `feature` → Story or New Feature, `refactor` → Task, `chore` → Task. Use `config.fieldMap.type` mappings if set to override.

Read path (native → canonical): invert the map; default to `feature` if unmapped.

### Weight

- **Light item:** no sub-issues required. Weight field is not a native concept; derive it from presence of sub-issues.
- **Tracked item:** has at least one sub-issue (Linear child issue / Jira sub-task). When `weight=tracked`, `set_subtasks` is called to create the sub-items.

## Operations

All 12 ops are required. Each subsection shows the per-backend rendering. "MCP" means the MCP tool call; "API" means Linear GraphQL or Jira REST; "CLI" means `jira` CLI (Jira only — Linear has no CLI).

Variable conventions: `<team>` = Linear team KEY from `config.backend.team`; `<project>` = Jira project KEY from `config.backend.project`; `<id>` = native issue ID/key.

### create_item

Create a new work item with title, type, priority, body, and weight.

**Linear:**
- **MCP:** `mcp__linear__create_issue` with `teamId=<team>`, `title=<title>`, `description=<body>`, `priority=<mapped int>`. If `weight=tracked`, note in description that sub-issues will follow. Map type via `config.fieldMap.type` or default labels. Return `id` and `identifier` from response.
- **API:** GraphQL mutation `createIssue(input: { teamId, title, description, priority, labelIds })`. Return `issue.id`.

**Jira:**
- **MCP:** `mcp__atlassian__create_issue` (or `mcp__jira__create_issue`) with `project=<project>`, `summary=<title>`, `description=<body>`, `issuetype=<mapped type>`, `priority=<mapped priority>`. Return `key` from response.
- **CLI:** `jira issue create --project <project> --summary "<title>" --body "<body>" --type "<issuetype>" --priority "<priority>"`
- **API:** `POST <url>/rest/api/3/issue` with `{ "fields": { "project": {"key":"<project>"}, "summary":"<title>", "description":{ADF body}, "issuetype":{"name":"<type>"}, "priority":{"name":"<priority>"} } }`

### get_item

Fetch a single work item by ID/key and return the normalized record.

**Linear:**
- **MCP:** `mcp__linear__get_issue` with `id=<id>`. Map response: `state.name` → canonical status (four-tier read path), `priority` → P1/P2/P3, labels → type, `children` → subtasks, `attachments` → artifacts.
- **API:** GraphQL query `issue(id: "<id>") { id, title, url, state { name }, priority, labels { nodes { name } }, children { nodes { id, title, state { name } } }, attachments { nodes { url, title } }, createdAt, updatedAt }`

**Jira:**
- **MCP:** `mcp__atlassian__get_issue` (or `mcp__jira__get_issue`) with `issueKey=<id>`. Map `status.name` → canonical, `priority.name` → P1/P2/P3, `issuetype.name` → type, `subtasks` → subtasks, remote links → artifacts.
- **CLI:** `jira issue view <id> --output json` → parse JSON fields.
- **API:** `GET <url>/rest/api/3/issue/<id>?fields=summary,status,priority,issuetype,description,subtasks,remotelinks,created,updated`

Return the normalized record shape (see CONTRACT.md `## Normalized record`).

### update_item

Update title, type, priority, weight, or body on an existing item.

**Linear:**
- **MCP:** `mcp__linear__update_issue` with `id=<id>` and only the changed fields (title, description, priority, labelIds).
- **API:** GraphQL mutation `updateIssue(id: "<id>", input: { title?, description?, priority?, labelIds? })`.

**Jira:**
- **MCP:** `mcp__atlassian__update_issue` (or `mcp__jira__update_issue`) with `issueKey=<id>` and changed fields.
- **CLI:** `jira issue edit <id> --summary "<title>"` (repeat flags as needed per changed field).
- **API:** `PUT <url>/rest/api/3/issue/<id>` with `{ "fields": { <changed fields> } }`.

### set_status

Transition an item to a new canonical status, resolving the native state via the four-tier rule.

1. Resolve the target native state **name** using the four-tier write path from `## Status mapping`.
2. Apply the state transition:

**Linear:**
- **MCP:** Resolve the native state name (step 1) to a `stateId` via `config.backend.stateCache`. Then call `mcp__linear__update_issue` with `id=<id>`, `stateId=<resolved stateId>`.
- **API:** Resolve the native state name to a `stateId` via `config.backend.stateCache`. Then GraphQL `updateIssue(id: "<id>", input: { stateId: "<stateId>" })`.

**Jira:**
- **MCP:** Resolve the transition ID for the target status — look up the resolved native state name in `config.backend.stateCache` (Jira entries map state name → `{id, transitionId}`) and use its `transitionId`; **on a cache miss**, call `GET <url>/rest/api/3/issue/<id>/transitions` (or MCP equivalent) and select the transition whose target status name equals the resolved native state name. Then call `mcp__atlassian__transition_issue` (or `mcp__jira__transition_issue`) with `issueKey=<id>`, `transitionId=<tid>`.
- **CLI:** `jira issue transition "<native state name>" <id>` (the CLI takes the target state name directly, so no transition-ID lookup is needed).
- **API:** Use the `transitionId` cached for the resolved native state name in `config.backend.stateCache`; **on a cache miss**, `GET <url>/rest/api/3/issue/<id>/transitions` and find the transition whose `to.name` equals the resolved native state name. Then `POST <url>/rest/api/3/issue/<id>/transitions { "transition": {"id":"<tid>"} }`.

No separate open/close call. Native state change is the only action.

### list_items

List work items filtered by status, type, priority, and/or weight.

**Linear:**
- **MCP:** `mcp__linear__list_issues` (or `mcp__linear__search_issues`) with filter params including `teamId=<team>` and state/label filters. Translate any canonical status filter → native state names via the four-tier **write** path before passing them to the filter.
- **API:** Translate canonical status filter → native state names via the four-tier **write** path. Then: GraphQL query `issues(filter: { team: { id: { eq: "<team>" } }, state: { name: { in: [<native states>] } }, priority: { in: [<priorities>] } }) { nodes { <normalized fields> } }`.

**Jira:**
- **MCP:** Translate any canonical status filter → native state names via the four-tier **write** path. Then: `mcp__atlassian__search_issues` (or `mcp__jira__search_issues`) with JQL: `project = <project> AND status IN ("<native states>") AND priority IN ("<priorities>")`.
- **CLI:** Translate canonical status filter → native state names via the four-tier **write** path. Then: `jira issue list --project <project> --status "<native state>" --priority "<priority>"` (repeat or chain as needed).
- **API:** Translate canonical status filter → native state names via the four-tier **write** path. Then: `GET <url>/rest/api/3/search?jql=project+%3D+<project>+AND+status+IN+(<states>)&fields=summary,status,priority,issuetype,subtasks,created,updated`

Map each result's status back through the four-tier **read** path and return normalized records.

### set_subtasks

Replace the sub-issue list on a tracked item. Idempotent: add missing, remove stale.

**Linear:**
- **MCP:** For each task in `[task]`, if it has no `ref`, call `mcp__linear__create_issue` with `parentId=<id>`, `title=<task.title>`, `teamId=<team>`. If task has `ref`, call `mcp__linear__update_issue` to update title/state. Remove sub-issues not in the new list by calling `mcp__linear__delete_issue` or detaching parent.
- **API:** Same logic via GraphQL `createIssue` / `updateIssue` with `parentId` field.

**Jira:**
- **MCP:** Create missing sub-tasks with `mcp__atlassian__create_issue` using `issuetype=Sub-task`, `parent=<id>`. Update existing. Remove stale by deleting.
- **CLI:** `jira issue create --project <project> --type Sub-task --parent <id> --summary "<title>"` for each new task.
- **API:** `POST <url>/rest/api/3/issue` with `"parent": {"key":"<id>"}` and `"issuetype": {"name":"Sub-task"}`.

### set_subtask_state

Transition a single sub-issue to a new state (todo | doing | done).

Map subtask state to canonical: `todo` → `planned`; `doing` → `in-progress`; `done` → `done`. Then resolve the canonical status to a native state name via the four-tier **write** path and apply `set_status` logic on the sub-issue ref. (Using `planned` for `todo` gives "To Do" on Jira rather than "Selected for Development", which is the appropriate anchor for ready/to-do sub-tasks.)

**Linear:**
- **MCP:** Resolve the mapped canonical status to a `stateId` via the four-tier write path + `config.backend.stateCache`. Then `mcp__linear__update_issue` with `id=<ref>`, `stateId=<resolved stateId>`.
- **API:** Resolve the mapped canonical status to a `stateId` via the four-tier write path + `config.backend.stateCache`. Then GraphQL `updateIssue(id: "<ref>", input: { stateId: "<stateId>" })`.

**Jira:**
- **MCP:** Resolve the mapped canonical status to a native state name via the four-tier write path. Use the `transitionId` cached for that state name in `config.backend.stateCache`; **on a cache miss**, fetch available transitions for `<ref>` and select the transition whose target status equals the resolved native state name. Then `mcp__atlassian__transition_issue` with `issueKey=<ref>`, `transitionId=<tid>`.
- **CLI:** Resolve the mapped canonical status to a native state name via the four-tier write path. Then `jira issue transition "<native state name>" <ref>`.
- **API:** Resolve the mapped canonical status to a native state name via the four-tier write path. Use the `transitionId` cached for that state name in `config.backend.stateCache`; **on a cache miss**, `GET <url>/rest/api/3/issue/<ref>/transitions` to find the transition ID whose target matches the native state name. Then `POST <url>/rest/api/3/issue/<ref>/transitions { "transition": {"id":"<tid>"} }`.

### link_artifact

Associate an artifact (spec, plan, branch, PR, etc.) with a work item. Fallback: append a link to the issue body.

**Linear:**
- **MCP:** `mcp__linear__create_attachment` (if available) with `issueId=<id>`, `url=<ref>`, `title=<kind>`. If not available, fall back to body append.
- **API:** GraphQL `createAttachment(input: { issueId: "<id>", url: "<ref>", title: "<kind>" })`. If attachment mutation is unavailable, append `[<kind>](<ref>)` to description via `updateIssue`.

**Jira:**
- **MCP:** `mcp__atlassian__add_remote_link` (or `mcp__jira__add_remote_link`) with `issueKey=<id>`, `url=<ref>`, `title=<kind>`.
- **CLI:** Fallback: edit description to append link (no direct CLI for remote links).
- **API:** `POST <url>/rest/api/3/issue/<id>/remotelink { "object": { "url":"<ref>", "title":"<kind>" } }`. Fallback: body append.

### comment

Post a comment on a work item. Fallback: append to body.

**Linear:**
- **MCP:** `mcp__linear__create_comment` with `issueId=<id>`, `body=<text>`.
- **API:** GraphQL `createComment(input: { issueId: "<id>", body: "<text>" })`.

**Jira:**
- **MCP:** `mcp__atlassian__add_comment` (or `mcp__jira__add_comment`) with `issueKey=<id>`, `body=<text>`.
- **CLI:** `jira issue comment add <id> --body "<text>"`
- **API:** `POST <url>/rest/api/3/issue/<id>/comment { "body": {ADF text node} }`.

### capture_raw

Capture unstructured text as a new inbox item. Fallback: write to local `.maestro/inbox.md`.

**Linear:**
- Resolve the `inbox` canonical status to its native state name via the four-tier write path, then look up the corresponding `stateId` in `config.backend.stateCache`.
- **MCP:** `mcp__linear__create_issue` with `teamId=<team>`, `title` = first line of `<text>` (truncated to 80 chars), `description=<text>`, `stateId=<resolved stateId>`. Return `id`.
- **API:** GraphQL `createIssue(input: { teamId: "<team>", title: "<first line>", description: "<text>", stateId: "<resolved stateId>" })`.

**Jira:**
- Resolve the `inbox` canonical status to its native state name via the four-tier write path. On create, Jira sets the initial status implicitly by the workflow default; create the issue with `issuetype=Task` and immediately transition it (via `set_status` logic) to the resolved native state if it differs from the workflow default.
- **MCP:** `mcp__atlassian__create_issue` with `project=<project>`, `summary=<first line>`, `description=<text>`, `issuetype=Task`. Then apply `set_status` to the new issue to reach the resolved `inbox` native state.
- **CLI:** `jira issue create --project <project> --summary "<first line>" --body "<text>" --type Task` then `jira issue transition "<resolved inbox native state>" <new-id>`.
- **API:** `POST <url>/rest/api/3/issue { "fields": { "project":{"key":"<project>"}, "summary":"<first line>", "description":{ADF}, "issuetype":{"name":"Task"} } }`. Then apply `set_status` transition to reach the resolved `inbox` native state.

Fallback (if transport unavailable): append raw text block to `.maestro/inbox.md` with timestamp.

### search

Search for work items by query string. Fallback: `list_items` + local text match.

**Linear:**
- **MCP:** `mcp__linear__search_issues` with `query=<query>`, `teamId=<team>`.
- **API:** GraphQL `issueSearch(filter: { team: { id: { eq: "<team>" } } }, query: "<query>") { nodes { <normalized fields> } }`.

**Jira:**
- **MCP:** `mcp__atlassian__search_issues` with JQL: `project = <project> AND text ~ "<query>" ORDER BY updated DESC`.
- **CLI:** `jira issue list --project <project> --query "<query>"`
- **API:** `GET <url>/rest/api/3/search?jql=project+%3D+<project>+AND+text+~+"<query>"&fields=summary,status,priority,issuetype`

Return candidate list (id, title, url, status). Fallback: `list_items` then local substring/fuzzy match on title + body.

### relate

Create a relation between two work items (e.g. duplicate-of, blocks, related-to). Fallback: a `comment` noting the relation.

**Linear:**
- **MCP:** `mcp__linear__create_issue_relation` with `issueId=<id>`, `relatedIssueId=<target>`, `type=<kind>` (Linear relation types: `blocks`, `blocked_by`, `related`, `duplicate`). Map `kind` to Linear type.
- **API:** GraphQL `createIssueRelation(input: { issueId: "<id>", relatedIssueId: "<target>", type: "<type>" })`.

**Jira:**
- **MCP:** `mcp__atlassian__create_issue_link` (or `mcp__jira__create_issue_link`) with `inwardIssue=<id>`, `outwardIssue=<target>`, `type=<link type name>` (e.g. `Duplicate`, `Blocks`, `Relates`).
- **CLI:** `jira issue link <id> <target> "<link type>"`
- **API:** `POST <url>/rest/api/3/issueLink { "type":{"name":"<link type>"}, "inwardIssue":{"key":"<id>"}, "outwardIssue":{"key":"<target>"} }`.

Fallback: call `comment(id, "relates to <target> (<kind>)")`.

## State setup

This section is the native-tracker analogue of the forge `## Label bootstrap`. It documents what `/setup` must discover and persist when configuring a Linear or Jira backend.

### What to discover

On first connection (or when `maestro setup` runs for this backend), the agent must:

1. **Enumerate workflow states:** fetch all native states for the configured team/project.
   - **Linear:** GraphQL `workflowStates(filter: { team: { key: { eq: "<team>" } } }) { nodes { id name type } }` — or via MCP if available.
   - **Jira:** `GET <url>/rest/api/3/project/<project>/statuses` or JQL `project = <project>` to extract distinct status values — or via MCP.

2. **Build the statusMap skeleton:** present the default tier-2 canonical→native table to the user, alongside the team's actual native states. For each canonical status, confirm the mapping or let the user override it. Write confirmed overrides into `config.statusMap`.

3. **Cache state IDs:** for Linear, persist the `stateId` → `name` mapping somewhere accessible (e.g. `config.backend.stateCache`) so `set_status` lookups are fast and do not require a network call per transition. For Jira, cache transition IDs per issue-type similarly.

4. **Enumerate priorities:** fetch native priority values and build `config.fieldMap.priority` if the defaults do not match.

5. **Enumerate issue types:** fetch native issue types and build `config.fieldMap.type` if the defaults do not match.

6. **Verify transport:** run the transport detection recipe above, confirm connectivity, and write `config.transport` if the user wants to pin it.

### What `/setup` writes

After discovery, `/setup` updates `.maestro/config.json` with:
- `adapter: "linear"` or `adapter: "jira"`
- Linear: `backend.team` (team KEY, e.g. "ENG"), `backend.token`
- Jira: `backend.url`, `backend.project` (project KEY), `backend.email`, `backend.token`
- `backend.stateCache` — Linear: `name → { id, type }` map (keyed by native state name, as written by `/setup` E.5); Jira: `name → { id, transitionId }` per state. `set_status`/`set_subtask_state` look up by native state name.
- `statusMap` (only entries that differ from tier-2 defaults, or all if the team provided them)
- `fieldMap.priority` and `fieldMap.type` (only if non-default)

No lifecycle skill needs to change when switching between `linear` and `jira`. All branching is in this profile.
