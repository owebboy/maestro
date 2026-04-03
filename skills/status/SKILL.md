---
name: status
description: Displays project status including overall progress, active tracks, current focus, and next actions. Use to get oriented at the start of a session or check progress.
argument-hint: "[track-id] [--quick]"
---

# Project Status

Display current status of the project: overall progress, track summary, current focus, and next actions.

## Pre-flight

1. Verify `conductor/product.md` and `conductor/tracks.md` exist
   - If missing: suggest running `/setup` first
2. If no tracks registered: show setup-complete message, suggest `/new-track`

## Data Collection

1. **Project info**: read `conductor/product.md` for name and description
2. **Tracks overview**: parse `conductor/tracks.md` for total/completed/in-progress/pending counts
3. **Per-track detail**: for each track in `conductor/tracks/`:
   - Read plan.md: count tasks by status (`[x]`, `[~]`, `[ ]`), identify current phase
   - Read metadata.json: type, dates, status
   - Read spec.md: check for blockers or dependencies
4. **Blocker detection**: tasks prefixed with `BLOCKED:`, dependencies on incomplete tracks
5. **Issues overview** (if `issues/` exists):
   - Count bullets in `issues/INBOX.md` under `## Inbox`
   - Scan `issues/*.md` files (excluding INBOX.md) — read each file's frontmatter for `status` and `priority`
   - Group counts by status: triaged, reviewed
   - Sort issue lists by priority (P1 first)

## Output: Full Status (no argument)

```
PROJECT STATUS: {Project Name}

PROGRESS
Tracks: {completed}/{total} ({percentage}%)
Tasks:  {completed}/{total} ({percentage}%)

TRACKS
| Status | Track ID | Type | Tasks | Updated |
|--------|----------|------|-------|---------|
| [x] | auth_20260401 | feature | 12/12 (100%) | 2026-04-02 |
| [~] | dashboard_20260402 | feature | 7/15 (47%) | 2026-04-03 |
| [ ] | nav-fix_20260403 | bug | 0/4 (0%) | 2026-04-03 |

CURRENT FOCUS
Active: dashboard_20260402 — Phase 2: Core Components
Current: [~] Task 2.3 — Implement chart rendering
Next: Task 2.4 — Add filter controls

BLOCKERS
(none)

ISSUES
Inbox: {inbox_count} unprocessed
| Priority | Status | File | Summary |
|----------|--------|------|---------|
| P1 | reviewed | 2026-04-03-auth-bug.md | Auth token not refreshing |
| P2 | triaged | 2026-04-03-nav-layout.md | Nav collapses on mobile |

Commands: /implement {trackId} | /new-track | /manage | /triage | /issue-review
```

## Output: Single Track (with track-id)

Show detailed view: spec summary, acceptance criteria checklist, full task tree with phase markers, related git commits, next steps.

## Quick Mode (--quick)

```
{Project Name}: {completed}/{total} tasks ({percentage}%)
Active: {trackId} — Task {X.Y}
```

## Empty States

- No tracks: "No tracks yet. Run /new-track to create one."
- Track not found: list available tracks with suggestion
- No issues directory: omit ISSUES section entirely
- Issues directory exists but no open issues: "ISSUES: None open (inbox empty)"
