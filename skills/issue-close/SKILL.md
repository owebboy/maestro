---
name: issue-close
description: Use when closing an issue without implementing it — wont-fix, deferred, or duplicate. Issues only; for archiving tracks use manage.
argument-hint: "<issue-file-path> [--reason wont-fix|deferred|duplicate]"
---

# Issue Close

Archive an issue without creating a track.

**Argument:** `<file-path> [--reason wont-fix|deferred|duplicate]`

## Process

1. **Read** the issue file
   - If the issue file does not exist, inform the user and stop.
   - If the issue's `status` is already `implemented`, `wont-fix`, `deferred`, or `duplicate`, the issue is already closed — inform the user and stop.
   - If the issue file has no `status` field, inform the user and stop.

2. **Get reason** if not provided as argument — ask:
   ```
   Why are you closing this issue?
   1. wont-fix — not worth doing
   2. deferred — valid but not now
   3. duplicate — already covered elsewhere
   ```

3. **If duplicate** — ask which issue file or conductor track it duplicates

4. **Update issue file frontmatter:**
   - Update `status` to the reason (wont-fix | deferred | duplicate)
   - Get today's date by running `date +%Y-%m-%d` — do not assume you know it. Add `closed: YYYY-MM-DD`
   - If duplicate: add `duplicate-of: <issue-filename-or-track-id>`
   - Add a brief closing note under `## Notes` if user provides one

5. **Move** to `issues/archived/<reason>/`
   - Create the archive subdirectory if it doesn't exist

6. **Confirm** closure with file location
