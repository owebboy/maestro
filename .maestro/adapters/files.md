# Adapter: files (built-in, zero-dependency)

Header: { "supports": ["subtasks","relations","artifacts"], "scoped_labels": false, "transports": ["files"] }

Registry root: `.maestro/items/`. Archived: `.maestro/items/archived/<reason>/`. Prose: `.maestro/work/<id>/`. Inbox: `.maestro/inbox.md`.

## Record format

Files-adapter item record format (`.maestro/items/<id>.md`):

```markdown
---
id: 0042-user-auth
title: User authentication
type: feature          # bug | feature | refactor | chore
priority: P2           # P1 | P2 | P3
status: reviewed       # canonical status (closed set)
weight: light          # light | tracked
created: 2026-06-20
updated: 2026-06-20
artifacts:             # optional; list of {kind, ref}
  - { kind: spec, ref: .maestro/work/0042-user-auth/spec.md }
links:                 # optional; list of {kind, target}
  - { kind: duplicate-of, target: 0017-old-login }
---

# User authentication

## Summary
## Problem Description
## Acceptance Criteria
## Technical Context
### Affected Files
### Related Tests
### Similar Patterns
## Dependencies
## Out of Scope
## Notes

## Tasks            <!-- present only when weight: tracked; the coarse progress mirror -->
- [ ] 1.1 — Scaffold module
- [~] 1.2 — Wire endpoints
- [x] 1.3 — Add migration
```

**Required frontmatter fields:** `id`, `title`, `type`, `priority`, `status`, `weight`, `created`, `updated`.

**`## Tasks` checklist** is the files adapter's `subtasks` store (coarse progress, one line per plan task). `[ ]`=todo, `[~]`=doing, `[x]`=done. The detailed TDD steps stay in `.maestro/work/<id>/plan.md`. Task `ref` = the leading token (`1.1`).

**Light items** never have a `## Tasks` section.

## Identity (LD-4)

id = {4-digit-seq}-{slug}. seq = max existing seq across items/ and items/archived/, + 1.

Files-adapter id = `{seq}-{slug}`, zero-padded 4-digit seq + kebab slug (e.g. `0042-user-auth`), replacing the old `name_YYYYMMDD`. `get_item(ref)` accepts a bare id, a slug, or a `work/<id>` path and normalizes: exact `id` match → unique slug-suffix match → error if ambiguous. Seq = (max existing seq across `items/` and `items/archived/`) + 1.

Loose-ref resolution: exact id → unique slug-suffix → ambiguous = error.

## Status behavior (LD-5)

Status lives in the `status:` frontmatter field. Terminal statuses (`done`, `wont-fix`, `deferred`, `duplicate`) additionally move the file to `.maestro/items/archived/<status>/`. `deferred` is reopenable (move back to `items/`, set a non-terminal status).

## Recipes

- **create_item({title,type,priority,body,weight})**: mint id (LD-4); write items/<id>.md with required frontmatter, status=inbox unless given, weight defaults light, created=updated=today (`date +%Y-%m-%d`); body sections from LD-3 template; return id.

- **get_item(ref)**: resolve ref (LD-4); read items/<id>.md or items/archived/*/<id>.md; parse frontmatter + ## Tasks + artifacts + links into the normalized record.

- **update_item(id,{fields})**: rewrite changed frontmatter fields + body; bump updated.

- **set_status(id, canonical)**: set status: field; bump updated; if terminal (LD-5) move file to items/archived/<status>/ (create that directory if it does not exist); if reopening a deferred item, move back to items/ and set the new status.

- **list_items({filters})**: scan items/ (+ archived/ when a terminal filter is requested); return records matching filters.

- **set_subtasks(id, [task])**: write/replace the ## Tasks checklist; each task -> `- [ ] <ref> — <title>`. This is a full overwrite — existing state on matching refs is discarded; advance individual tasks afterward with `set_subtask_state`.

- **set_subtask_state(id, ref, state)**: flip the matching ## Tasks line: todo=`[ ]`, doing=`[~]`, done=`[x]`.

- **link_artifact(id, kind, ref)**: add {kind,ref} to artifacts: frontmatter (dedupe by kind+ref). (Body-append fallback unused — files supports artifacts natively.)

- **comment(id, text)**: append `> <YYYY-MM-DD> <text>` under ## Notes (date from `date +%Y-%m-%d`).

- **capture_raw(text)**: append `- <text>` under the ## Inbox heading of .maestro/inbox.md (create file from template if missing). The template written on creation is:
  ```
  # Inbox

  Pre-triage scratch. One bullet per raw item; triage converts these into work items.

  ## Inbox
  ```

- **search(query)**: list_items then match query against id/title/Summary (case-insensitive substring); return candidates.

- **relate(id, kind, target)**: add {kind,target} to links: frontmatter; for duplicate-of also set status=duplicate via set_status.

## Degradation

Follows CONTRACT §Degradation; this backend supports: subtasks (the `## Tasks` checklist is a real native store here, so it declares the plain `subtasks` token rather than the forge `subtasks-as-tasklist` fallback token), relations (via `links:` frontmatter), artifacts (via `artifacts:` frontmatter). All ops are implemented natively against local Markdown files — body/frontmatter IS the storage layer, so the CONTRACT fallbacks (body-append for link_artifact, Notes-append for comment, inbox.md for capture_raw, list_items+local-match for search, comment for relate) are satisfied here by the primary implementations above. No transport degradation applies; the files adapter has no remote transport to lose.
