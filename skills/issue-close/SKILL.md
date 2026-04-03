---
name: issue-close
description: Archives an issue that will not become a conductor track — for issues that are wont-fix, deferred, or duplicates. Use when closing an issue without implementation
argument-hint: "<issue-file-path> [--reason wont-fix|deferred|duplicate]"
---

# Issue Close

Archive an issue without creating a track.

**Argument:** `<file-path> [--reason wont-fix|deferred|duplicate]`

## Process

1. **Read** the issue file

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
   - Add `closed: YYYY-MM-DD`
   - If duplicate: add `duplicate-of: <reference>`
   - Add a brief closing note under `## Notes` if user provides one

5. **Move** to `issues/archived/<reason>/`
   - Create the archive subdirectory if it doesn't exist

6. **Confirm** closure with file location
