---
name: item-close
description: Use when closing a work item without implementing it — wont-fix, deferred, or duplicate.
argument-hint: "<item-ref> [--reason wont-fix|deferred|duplicate]"
---

# Item Close

Close a work item without implementing it.

**Argument:** `<item-ref> [--reason wont-fix|deferred|duplicate]`

## Process

1. **Fetch item** — `get_item(ref)`
   - If the item does not exist, inform the user and stop.
   - If the item's `status` is already terminal (`done`, `wont-fix`, `deferred`, or `duplicate`), inform the user the item is already closed and stop.

2. **Get reason** if not provided as argument — ask:
   ```
   Why are you closing this item?
   1. wont-fix — not worth doing
   2. deferred — valid but not now
   3. duplicate — already covered elsewhere
   ```

3. **If duplicate** — ask which item it duplicates (accept any loose ref: id, slug, or URL)

4. **Close the item** using abstract ops:
   - `set_status(id, <reason>)` where reason ∈ {wont-fix, deferred, duplicate}
     — the adapter handles the terminal archive move per LD-5; the skill does NOT move files.
   - If duplicate: `relate(id, duplicate-of, <target-ref>)`
   - `comment(id, "<closing note>")` — include the reason and any user-provided note

5. **Confirm** closure to the user (id, title, status set)
