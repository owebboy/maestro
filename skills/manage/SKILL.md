---
name: manage
description: Use when archiving, restoring, deleting, renaming, or cleaning up conductor tracks. Tracks only; for closing an issue use issue-close.
argument-hint: "[--archive|--restore|--delete|--rename|--cleanup] [track-id]"
---

# Track Manager

Manage the complete track lifecycle.

## Modes

| Argument | Mode | Description |
|----------|------|-------------|
| `--archive <id>` | Archive | Move completed track to `_archive/` |
| `--archive --bulk` | Bulk Archive | Multi-select completed tracks |
| `--restore <id>` | Restore | Restore archived track to active |
| `--delete <id>` | Delete | Permanently remove (requires typing 'DELETE') |
| `--rename <old> <new>` | Rename | Change track ID, update all references |
| `--cleanup` | Cleanup | Detect and fix orphaned artifacts |
| `--list [filter]` | List | Show all tracks (active/completed/archived) |
| (none) | Interactive | Menu-driven selection |

## Pre-flight

If conductor/ does not exist, inform the user and stop. Verify `conductor/tracks.md` and `conductor/tracks/` exist. Create `conductor/tracks/_archive/` if needed.

## Archive

1. Validate track exists and is complete (warn if in-progress)
2. Ask archive reason: completed / superseded / abandoned / other
3. Confirm with 'YES'
4. Move `conductor/tracks/{id}/` to `conductor/tracks/_archive/{id}/`
5. Update metadata.json with `archived: true`, `archived_at`, `archive_reason`, and `status_at_archive` (the track's current `status` value, captured before archiving so Restore can reinstate it). Get the current timestamp by running `date -u +%Y-%m-%dT%H:%M:%SZ` — do not assume you know it.
6. Update `conductor/tracks.md`: move entry to Archived section
7. Git commit

**Bulk:** multi-select completed tracks, single commit for all.

## Restore

1. Validate track exists in `_archive/`, check no ID conflict with active tracks
2. Confirm with 'YES'
3. Move back to `conductor/tracks/{id}/`
4. Update metadata.json: `archived: false`, and restore `status` to the recorded `status_at_archive` value. If `status_at_archive` is absent (an older archive predating this field), prompt the user to choose the correct status from a choice-list of valid values — `pending` / `in_progress` / `complete` — rather than free text, so the metadata stays schema-valid.
5. Update `conductor/tracks.md`
6. Git commit

## Delete

1. Find track in `tracks/` or `_archive/`
2. Warn if in-progress (offer archive as alternative)
3. Show full warning: this CANNOT be undone
4. Require typing 'DELETE' (not 'yes')
5. Remove directory, update tracks.md
6. Git commit (history preserved)

## Rename

1. Validate old track exists, new ID follows `{shortname}_{YYYYMMDD}` format, no conflict
2. Confirm with 'YES'
3. Rename directory, update metadata.json (`id`, `previous_ids`), plan.md header, tracks.md
4. Git commit

## Cleanup

Scan for and fix:
- **Directory orphans**: tracks/ dirs not in tracks.md — offer to register
- **Registry orphans**: tracks.md entries without directories — offer to remove
- **Incomplete tracks**: missing spec.md/plan.md/metadata.json — offer to create from templates
- **Stale in-progress**: status `[~]` with metadata.json `updated` timestamp >7 days old — offer to archive. Get the current timestamp by running `date -u +%Y-%m-%dT%H:%M:%SZ` — do not assume you know it — then compute staleness against the `updated` field. Note: this uses the `updated` field which is written on task completion, so a track being actively debugged without completing tasks could appear stale. Always ask the user before archiving; never auto-archive.

Present findings, let user choose which to fix, single git commit.

## List

Read-only — shows all tracks and makes no metadata or registry changes. With an optional `[filter]` argument (`active` / `completed` / `archived`), restrict output to that group.

1. Read `conductor/tracks.md` and each track's `metadata.json` (active tracks under `conductor/tracks/`, archived under `conductor/tracks/_archive/`).
2. Group tracks by state:
   - **Active** — `status` `pending` or `in_progress`
   - **Completed** — `status` `complete`, not archived
   - **Archived** — under `_archive/`
3. Render each non-empty group as a table: `| Track ID | Title | Status | Updated |`.
4. End with the summary line: `{N} active, {M} completed, {P} archived`.

## Interactive Mode (no arguments)

```
TRACK MANAGER

1. List all tracks          (same as --list)
2. Archive a completed track (same as --archive)
3. Restore an archived track (same as --restore)
4. Delete a track permanently (same as --delete)
5. Rename a track            (same as --rename)
6. Cleanup orphaned artifacts (same as --cleanup)
7. Exit

Quick stats: {N} active, {M} completed, {P} archived
```
