---
name: manage
description: Manages track lifecycle — archives completed tracks, restores archived tracks, deletes tracks permanently, renames track IDs, or cleans up orphaned artifacts. Use for track housekeeping.
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

Verify `conductor/tracks.md` and `conductor/tracks/` exist. Create `conductor/tracks/_archive/` if needed.

## Archive

1. Validate track exists and is complete (warn if in-progress)
2. Ask archive reason: completed / superseded / abandoned / other
3. Confirm with 'YES'
4. Move `conductor/tracks/{id}/` to `conductor/tracks/_archive/{id}/`
5. Update metadata.json with `archived: true`, `archived_at`, `archive_reason`
6. Update `conductor/tracks.md`: move entry to Archived section
7. Git commit

**Bulk:** multi-select completed tracks, single commit for all.

## Restore

1. Validate track exists in `_archive/`, check no ID conflict with active tracks
2. Confirm with 'YES'
3. Move back to `conductor/tracks/{id}/`
4. Update metadata.json: `archived: false`, `status: "completed"`
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
- **Stale in-progress**: status `[~]` with metadata.json `updated` timestamp >7 days old — offer to archive. Note: this uses the `updated` field which is written on task completion, so a track being actively debugged without completing tasks could appear stale. Always ask the user before archiving; never auto-archive.

Present findings, let user choose which to fix, single git commit.

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
