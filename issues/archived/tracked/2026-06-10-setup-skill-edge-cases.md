---
status: tracked
type: bug
priority: P3
filed: 2026-06-10
advanced-to: cleanup-fixes_20260610
---

# Issue: setup skill — two unhandled edge cases (question caps, Resume)

## Summary

The `setup` skill has two unresolved edge cases deferred from the setup-artifact-templates work: a self-contradicting question-count rule and an under-specified Resume path.

## Problem Description

First, SKILL.md:22 states "Maximum 5 questions per section," but the section headers declare per-section caps of 5, 3, 5, 4, and 2 (Sections 1–5). Sections 2, 4, and 5 fall below the stated maximum, so the rules read as contradictory. Reconcile them: either state that 5 is a ceiling the per-section caps tighten, or align the numbers.

Second, the Resume path (SKILL.md:159) says to "verify previously created files still exist" but does not say what to do when a file is missing — regenerate it, re-ask the section, or warn. Define the recovery behavior, ideally per artifact in the Section→file mapping.

## Acceptance Criteria

- [ ] The question-count rule is internally consistent (global ceiling vs. per-section caps clarified or aligned)
- [ ] The Resume path specifies what to do when a previously created file is missing

## Technical Context

### Affected Files

- `skills/setup/SKILL.md:22` — global rule "Maximum 5 questions per section"
- `skills/setup/SKILL.md:24,32,37,47,54` — per-section caps: S1 max 5, S2 max 3, S3 max 5, S4 max 4, S5 max 2
- `skills/setup/SKILL.md:159` — Resume path ("verify previously created files still exist")
- `skills/setup/SKILL.md:59–71` — Artifact Generation table mapping each section to the file(s) it creates (product.md, product-guidelines.md, tech-stack.md, workflow.md, code_styleguides/, plus index.md and tracks.md) — this defines what "previously created files" means
- `skills/setup/SKILL.md:76–85` — `setup_state.json` schema (`current_section`, `current_question`) that the Resume path reads

### Related Tests

None. No SKILL.md linter and no `setup_state.json` schema validator exist, so neither edge case would be caught automatically. The only runtime validation hook (`bin/hooks/validate-issue-frontmatter.sh`) covers issue frontmatter, not skill documents.

### Similar Patterns

- Deferred from the setup-artifact-templates work (commit `87716a5`, "Implement Templates batch").
- `issues/archived/implemented/2026-06-09-setup-artifact-templates.md:23–24,74–83` explicitly identified both edge cases and recorded leaving them out of scope per the approved decision. (That archived note cited the Resume line as `SKILL.md:126`; the line has since drifted to `:159`.)

## Dependencies

None.

## Out of Scope

## Notes

Deferred from the setup-artifact-templates work. Pure documentation fix to `skills/setup/SKILL.md` — no code change.
