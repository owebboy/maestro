---
name: new-track
description: Use when starting a new feature, bug fix, refactor, or chore as a new tracked piece of work. For work that already has a reviewed issue file, use issue-advance instead.
argument-hint: "<feature|bug|chore|refactor> <name>"
---

# New Track

Create a track (feature, bug fix, chore, or refactor) with a specification, then use Superpowers brainstorming and planning to produce the implementation plan.

## Progress Checklist

Copy this checklist and track your progress:

```
New Track Progress:
- [ ] Pre-flight: verify project initialized
- [ ] Step 1: Track classification (type)
- [ ] Step 2: Specification gathering (Q&A)
- [ ] Step 3: Track ID & spec generation → user approval
- [ ] Step 4: Design via brainstorming
- [ ] Step 5: Plan via writing-plans
- [ ] Step 6: Track registration
```

## Pre-flight

1. Verify project is initialized:
   - `conductor/product.md`, `conductor/tech-stack.md`, `conductor/workflow.md` must exist
   - If missing: suggest running `/setup` in Claude Code or `$setup` in Codex first
2. Load context: read product.md, tech-stack.md, workflow.md for project understanding

## Step 1: Track Classification

Determine type from argument or ask:
- **Feature** — new functionality
- **Bug** — fix for existing issue
- **Chore** — maintenance, dependencies, config
- **Refactor** — code improvement without behavior change

## Step 2: Specification Gathering

Ask ONE question per turn (max 6, tailored by type):

**Feature:** summary → user story → acceptance criteria → dependencies → out of scope → technical notes (optional)

**Bug:** summary → steps to reproduce → expected vs actual → affected areas → root cause hypothesis (optional)

**Chore/Refactor:** summary → motivation → success criteria → risk assessment

## Step 3: Track ID & Spec Generation

Generate track ID: `{shortname}_{YYYYMMDD}` (e.g., `user-auth_20260403`)
- Derive `{shortname}`: 2-3 lowercase hyphenated words from the track name, max 20 chars (single-word IDs allowed when natural). E.g. "navigation fix" → `nav-fix` → `nav-fix_20260402`.
- Get today's date by running `date +%Y-%m-%d` — do not assume you know it.
- Validate uniqueness against `conductor/tracks.md`

Create `conductor/tracks/{trackId}/spec.md` (get today's date by running `date +%Y-%m-%d` — do not assume you know it):

```markdown
# Specification: {Title}

**Track ID:** {trackId}
**Type:** {type}
**Created:** {date}
**Status:** Draft

## Summary
## Context
## Acceptance Criteria
- [ ] ...
## Dependencies
## Out of Scope
## Technical Notes
```

Show spec to user for review. Wait for approval before proceeding.

## Step 4: Design via Brainstorming

Detect `brainstorming` using the [detection procedure](../../docs/detecting-optional-skills.md) (check, in order: the available-skills list for the prefixed or bare name; `.claude/settings.json` `enabledPlugins`; a `.claude/skills/<name>/` or `.agents/skills/<name>/` directory). Check both plugin-prefixed and bare forms, and use whichever invocation form was found.

If available, invoke the brainstorming skill using the detected form. Pass the approved spec as context AND instruct it to write its design doc to `conductor/tracks/{trackId}/design.md` instead of the default `docs/superpowers/specs/` location. Example invocation context:

> Design a solution for the following specification. Write the design document to `conductor/tracks/{trackId}/design.md`.
>
> {spec content}

If Superpowers writes the design doc elsewhere despite the instruction, move it to `conductor/tracks/{trackId}/design.md` and delete the external file.

If Superpowers is not installed, run an inline design discussion:
1. Propose 2-3 implementation approaches based on the spec
2. Present trade-offs for each
3. Get user approval on approach
4. Write the approved design to `conductor/tracks/{trackId}/design.md`

## Step 5: Plan via Writing Plans

Detect `writing-plans` using the [detection procedure](../../docs/detecting-optional-skills.md) (check, in order: the available-skills list for the prefixed or bare name; `.claude/settings.json` `enabledPlugins`; a `.claude/skills/<name>/` or `.agents/skills/<name>/` directory). Check both plugin-prefixed and bare forms, and use whichever invocation form was found.

If available, invoke the writing-plans skill using the detected form. Instruct it to write the plan to `conductor/tracks/{trackId}/plan.md` instead of the default `docs/superpowers/plans/` location. Example invocation context:

> Create an implementation plan based on the approved design at `conductor/tracks/{trackId}/design.md`. Write the plan to `conductor/tracks/{trackId}/plan.md`.

If Superpowers writes the plan elsewhere despite the instruction, move it to `conductor/tracks/{trackId}/plan.md` and delete the external file. `/implement` reads this path directly — the plan MUST be there.

If Superpowers is not installed, generate a phased plan inline:
- Group tasks into logical phases
- Each task: description, files to modify, test to write, verification step
- Write plan directly to `conductor/tracks/{trackId}/plan.md`

## Step 6: Track Registration

After plan is in `conductor/tracks/{trackId}/plan.md`:

1. Create `conductor/tracks/{trackId}/metadata.json` (get the current timestamp by running `date -u +%Y-%m-%dT%H:%M:%SZ` — do not assume you know it):
   ```json
   {
     "id": "{trackId}",
     "title": "{title}",
     "type": "{type}",
     "status": "pending",
     "created": "ISO_TIMESTAMP",
     "updated": "ISO_TIMESTAMP",
     "phases": { "total": N, "completed": 0 },
     "tasks": { "total": M, "completed": 0 }
   }
   ```
2. Register in `conductor/tracks.md`: add row `| [ ] | {trackId} | {title} | {date} | {date} |` (get today's date by running `date +%Y-%m-%d` — do not assume you know it)
3. Update `conductor/index.md`: add to Active Tracks

## Error Handling

- **Superpowers writes files to wrong location**: Move the file to the correct `conductor/tracks/{trackId}/` path and delete the external copy. Check both `docs/superpowers/specs/` and `docs/superpowers/plans/` as common default locations.
- **Track ID conflict**: Append a numeric suffix (e.g., `user-auth-2_20260403`) and confirm with user.
- **Spec rejected by user**: Return to Step 2 (specification gathering) and re-ask the relevant questions.
- **Brainstorming or planning skill fails**: Fall back to the inline alternative for that step and continue.

## Completion

```
Track created: {trackId}
Location: conductor/tracks/{trackId}/

Files:
  spec.md      — requirements
  plan.md      — implementation plan (from {writing-plans skill, or generated inline if Superpowers absent})
  metadata.json — progress state

Next: Run /implement {trackId} in Claude Code or $implement {trackId} in Codex to start implementation.
```
