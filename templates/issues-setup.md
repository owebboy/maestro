# Issues Directory Setup

Create this structure in your project root:

```
issues/
├── INBOX.md
└── archived/
    ├── tracked/      # Issues that became conductor tracks
    ├── deferred/     # Valid but not now
    ├── wont-fix/     # Not worth doing
    └── duplicate/    # Already covered elsewhere
```

## INBOX.md starter

```markdown
# Issue Inbox

Add issues as bullet points below. Run `/triage` to process them into individual issue files.

## Format

- <description>
- <description> (type: bug, priority: P1)

Type and priority are optional — `/triage` will infer them.

**Types:** bug | feature | refactor | chore
**Priorities:** P1 (blocking) | P2 (important) | P3 (nice-to-have)

## Inbox

```

## Workflow

```
INBOX.md bullets → /triage → issue files → /issue-review → /issue-advance or /issue-close
```

Status flow: `triaged` → `reviewed` → `tracked` | `wont-fix` | `deferred` | `duplicate`

## Issue File Format

Issue metadata lives in YAML frontmatter for fast scanning:

```yaml
---
status: triaged
type: bug
priority: P1
filed: 2026-04-03
---
```

Additional frontmatter fields added by lifecycle skills:
- `advanced-to: <track-id>` — added by `/issue-advance`
- `closed: YYYY-MM-DD` — added by `/issue-close`
- `duplicate-of: <reference>` — added by `/issue-close` for duplicates
