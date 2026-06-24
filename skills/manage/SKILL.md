---
name: manage
description: Use when archiving, restoring, renaming, deleting, or cleaning up work items. For closing without implementing use item-close.
argument-hint: "[--archive|--restore|--delete|--rename|--cleanup] [item-id]"
---

# Work Item Manager

Manage the complete work item lifecycle by mapping each operation to an abstract op from the Maestro contract. Read `.maestro/config.json` to determine the active adapter, then follow `.maestro/adapters/<adapter>.md` for each op.

## Modes

| Argument | Mode | Description |
|----------|------|-------------|
| `--archive <id>` | Archive | Set item to a terminal status |
| `--restore <id>` | Restore | Return item to an active status |
| `--delete <id>` | Delete | Permanently remove item record |
| `--rename <id> <new-title>` | Rename | Change item title (id is immutable) |
| `--cleanup` | Cleanup | Find and act on stale non-terminal items |
| (none) | Interactive | Menu-driven selection |

## Pre-flight

Read `.maestro/config.json`. If it does not exist, inform the user that Maestro is not set up and stop. All ops go through the active adapter; never access backend files directly.

## Archive

Maps to `set_status`.

1. Call `get_item(id)` to confirm the item exists and show the user its current status.
2. Ask whether the work is **complete** or **deferred** (abandoned/paused without finishing):
   - Complete → `set_status(id, done)`
   - Deferred (archive without completing) → `set_status(id, deferred)`
3. Confirm with 'YES' before calling the op.

Archive sets `done` or `deferred`; both are terminal per LD-5, so the files adapter moves the record to `.maestro/items/archived/<status>/`. No direct file manipulation of legacy paths; the adapter handles storage.

**Bulk:** Accept `--archive --bulk`. Call `list_items({})`, show non-terminal items, let the user multi-select, then apply `set_status` for each.

## Restore

Maps to `set_status`.

1. Call `get_item(id)` to confirm the item exists.
2. Determine the prior active status. If the item record carries an identifiable prior non-terminal status, restore to it; otherwise restore to `reviewed`.
3. Confirm with 'YES'.
4. Call `set_status(id, <prior active status>)` — for the files adapter this moves the record from `.maestro/items/archived/<status>/` back to `.maestro/items/`.

Valid restore targets (non-terminal): `inbox`, `triaged`, `reviewed`, `planned`, `in-progress`, `in-review`.

## Rename

Maps to `update_item`. Id is immutable (LD-4); renaming changes the title only.

1. Call `get_item(id)` to confirm the item exists and show its current title.
2. Record the old title via `comment(id, "Title changed from '<old>' to '<new>'")`.
3. Call `update_item(id, { title: "<new-title>" })`.
4. If the user requests a slug/id change, explain that the id is stable and cannot be changed; only the title is updated.

## Delete

1. Call `get_item(id)` to confirm the item exists. If the item is non-terminal (active work), warn and offer to archive or defer instead.
2. Show a full warning: this CANNOT be undone.
3. Require the user to type 'DELETE' (not 'yes') to confirm.
4. **Files adapter:** Remove the item record (`.maestro/items/<id>.md` or its archived path) and its work directory (`.maestro/work/<id>/`) if it exists.
5. **Non-files backends:** Deletion may be unsupported. If the adapter does not support record removal, say so and offer `set_status(id, wont-fix)` instead.

## Cleanup

Maps to `list_items` + `set_status`.

1. Call `list_items({})` to get all items.
2. Filter to items in a non-terminal status (`inbox`, `triaged`, `reviewed`, `planned`, `in-progress`, `in-review`) whose `updated` timestamp is more than 7 days old.
   - Get the current timestamp by running `date -u +%Y-%m-%dT%H:%M:%SZ` — do not assume you know it.
   - A work item being actively worked on without completed sub-tasks may appear stale; always ask the user before acting.
3. Present the stale items as a table: `| ID | Title | Status | Updated |`.
4. For each item, offer:
   - **Defer** → `set_status(id, deferred)`
   - **Archive as done** → `set_status(id, done)`
   - **Skip** → leave as-is
5. Apply the user's choices, one `set_status` call per item.

## Interactive Mode (no arguments)

```
WORK ITEM MANAGER

1. Archive an item     (same as --archive)
2. Restore an item     (same as --restore)
3. Rename an item      (same as --rename)
4. Delete an item      (same as --delete)
5. Cleanup stale items (same as --cleanup)
6. Exit
```

Show a brief summary of active item counts (items whose status is non-terminal — i.e. not `done`/`wont-fix`/`deferred`/`duplicate`) from `list_items({})` before presenting the menu.
