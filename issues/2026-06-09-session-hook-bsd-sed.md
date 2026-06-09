---
status: triaged
type: bug
priority: P1
filed: 2026-06-09
---

# Issue: session-start hook reports zero issue counts on macOS

## Summary

The frontmatter-parsing sed expression in `session-start-issues.sh` fails under BSD sed, so triaged/reviewed counts are silently always zero on macOS.

## Problem Description

Line 30 uses `sed -n '/^---$/,/^---$/{ /^status:/{ s/^status: *//; p; } }'`, which BSD sed rejects ("extra characters at the end of } command" — it requires `;` before the outer closing brace). The script redirects stderr to /dev/null, so `$status` is empty, the case statement never matches, and the hook shows only inbox counts. Verified by running the hook on macOS against a directory containing a `status: triaged` issue file: output was empty. A second defect: the `/^---$/,/^---$/` range re-matches later `---` pairs, so a `status:` line in the issue body can corrupt the value even under GNU sed.

## Acceptance Criteria

- [ ] Status extraction works identically under BSD and GNU sed/awk
- [ ] Matching is confined to the first frontmatter block
- [ ] Hook run on macOS against a triaged issue file prints a non-zero triaged count

## Technical Context

### Affected Files

- bin/hooks/session-start-issues.sh:30

### Related Tests

### Similar Patterns

Suggested fix uses awk, already used elsewhere in the script: `awk '/^---$/{n++; next} n==1 && $1=="status:"{print $2; exit}'`

## Dependencies

## Out of Scope

## Notes

Found by the 2026-06-09 cross-LLM review; confirmed by adversarial verification with an end-to-end run on this machine.
