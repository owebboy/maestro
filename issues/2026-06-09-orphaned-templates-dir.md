---
status: triaged
type: chore
priority: P3
filed: 2026-06-09
---

# Issue: templates/ directory is orphaned and drifting from skill-embedded copies

## Summary

No skill, script, or README references templates/, while triage and agents-md-sync embed their own already-diverging copies — yet AGENTS.md:12 calls templates/ "generated markdown templates used by the skills", which is false and will mislead contributors.

## Problem Description

Grep confirms nothing references templates/issue-file.md, issues-setup.md, or AGENTS.md.template. triage/SKILL.md embeds the issue template (lines 87-124) and INBOX starter (lines 19-36); agents-md-sync embeds a different AGENTS.md structure (lines 38-59) that already diverges from AGENTS.md.template (the template adds sync comments, an Issue Pipeline subsection with Codex-only $-syntax, and Codex-Specific Notes the skill never writes). A contributing model editing templates/ expects behavior changes and gets none.

## Acceptance Criteria

- [ ] Either delete templates/ and fix AGENTS.md:12, or make templates/ canonical: skills say "copy templates/X" and setup-project ships the files
- [ ] No remaining drift between template copies and skill-embedded copies

## Technical Context

### Affected Files

- templates/AGENTS.md.template
- templates/issue-file.md
- templates/issues-setup.md
- AGENTS.md:12
- skills/triage/SKILL.md:19-36,87-124
- skills/agents-md-sync/SKILL.md:38-59

### Related Tests

### Similar Patterns

## Dependencies

## Out of Scope

## Notes

Found by the 2026-06-09 cross-LLM review.
