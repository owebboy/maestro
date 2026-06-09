---
status: triaged
type: refactor
priority: P3
filed: 2026-06-09
---

# Issue: setup defines templates for one of seven artifacts; index.md contract undocumented

## Summary

setup gives a full template for tracks.md but none for the other six artifacts it generates, and the index.md contract that new-track depends on is undocumented — two models produce two different conductor/ layouts.

## Problem Description

SKILL.md:61-71 lists seven generated artifacts (product.md, tech-stack.md, workflow.md, index.md, code_styleguides/, etc.) with content templates for tracks.md only. new-track (step 6) appends to conductor/index.md assuming a structure setup never specifies. Also: question-count statements are inconsistent (lines 22, 32-35) and the resume path has an unhandled edge case (line 126). Related finding in new-track: pre-flight does not verify conductor/tracks.md and index.md exist before steps 3 and 6 mutate them.

## Acceptance Criteria

- [ ] Each generated artifact has a content template or explicit section list
- [ ] The index.md structure is specified and matches what new-track appends
- [ ] new-track pre-flight verifies (or creates) tracks.md and index.md before mutating them

## Technical Context

### Affected Files

- skills/setup/SKILL.md:22,32-35,61-71,126
- skills/new-track/SKILL.md:28-31,55,127-128

### Related Tests

### Similar Patterns

## Dependencies

## Out of Scope

## Notes

Found by the 2026-06-09 cross-LLM review.
