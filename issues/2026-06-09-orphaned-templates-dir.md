---
status: reviewed
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

- [ ] Either delete templates/ and fix AGENTS.md:12, or make templates/ canonical: skills say "copy templates/X" and setup-project ships the files (resolved 2026-06-09: DELETE templates/ and fix AGENTS.md:12 + conductor/tech-stack.md:26; make-canonical path dropped)
- [ ] No remaining drift between template copies and skill-embedded copies

## Technical Context

### Affected Files

- `templates/AGENTS.md.template:1-54` — orphaned; carries sync comments (lines 3-4), an Issue Pipeline subsection with Codex `$`-syntax (lines 28-38), and Codex-Specific Notes (lines 48-53) that agents-md-sync never emits.
- `templates/issue-file.md:1-37` — orphaned; the live copy of this template lives in triage/SKILL.md (see below). Already maintained separately: it has the date-command note at line 5 that the triage copy lacks.
- `templates/issues-setup.md:1-61` — orphaned; its archive-dir list (lines 9-12: tracked/deferred/wont-fix/duplicate) already drifts from both triage and setup-project (see Notes).
- `AGENTS.md:12` — `- \`templates/\`: generated markdown templates used by the skills.` — false claim; nothing in skills/ or bin/ references templates/.
- `conductor/tech-stack.md:26` — `- \`templates/\` — generated Markdown templates used by skills.` — same false claim (NEW, not in original issue); must be fixed alongside AGENTS.md:12 under either resolution.
- `skills/triage/SKILL.md:19-36` — embedded INBOX.md starter (the live copy of templates/issues-setup.md's INBOX block).
- `skills/triage/SKILL.md:87-124` — embedded issue-file template (the live copy of templates/issue-file.md).
- `skills/agents-md-sync/SKILL.md:38-59` — embedded AGENTS.md structure (the live copy of templates/AGENTS.md.template); diverges as described.
- `bin/setup-project:255-278` — `ensure_issues_scaffold()` creates the issues/ scaffold and writes INBOX.md inline via `write_inbox_file`; does NOT copy any templates/ file. Confirms templates/ is unreferenced by the installer and is where the "make canonical" path would need to ship files.

### Related Tests

No automated test suite (Markdown + Bash repo). Validate by:
- `grep -rn "templates/" .` after the change to confirm no functional reference remains (delete path) or that skills/setup-project now reference templates/X (canonical path).
- If templates/ is deleted: confirm AGENTS.md:12 and conductor/tech-stack.md:26 no longer mention it, then `bash -n bin/setup-project` and the JSON validators in AGENTS.md "Validation" still pass.
- If templates/ is made canonical: run `bin/setup-project` against a throwaway target dir and confirm the shipped templates land correctly; run triage/agents-md-sync in Sonnet to confirm they read templates/ instead of embedding copies.
- Sonnet skill verification on any edited SKILL.md (per repo convention — skills' primary consumer is Sonnet).

### Similar Patterns

- The "single source of truth, no embedded forks" principle is already stated in `AGENTS.md:19` ("Prefer improving shared skills/ content instead of creating Codex-only forks") and `AGENTS.md:9` (keep SKILL.md and openai.yaml aligned) — the same de-duplication logic applies to templates/ vs embedded copies.
- `2026-06-09-detection-doc-portability.md:25` proposes "setup-project ships docs/ alongside skills" — directly parallel to the "make templates/ canonical, setup-project ships them" option here; whichever shipping mechanism is chosen there should be reused.
- Recent commit `7bfc97a` "Fix installed hooks and stop shipping personal artifacts" — precedent for pruning orphaned/personal files rather than keeping them; relevant if the delete path is chosen.
- `bin/setup-project:255-278` `ensure_issues_scaffold()` + `write_inbox_file` — the existing pattern the canonical path would extend to copy templates/X into the target.

## Dependencies

- **Gates `2026-06-09-setup-artifact-templates.md`** (per review hint): if the "make templates/ canonical" path is chosen, setup must ship per-artifact templates, which overlaps that issue's "each generated artifact has a content template" work. The delete-vs-canonical decision below must be resolved first.
- **Coordinate with `2026-06-09-detection-doc-portability.md`**: shares the "setup-project ships supporting files" mechanism. Pick one shipping approach for both.

## Out of Scope

- Resolving the three-way archive-directory drift itself (the `implemented/` mismatch) is a separate correctness bug — note it here but track/fix independently if it predates this cleanup.

## Notes

Found by the 2026-06-09 cross-LLM review.

OPEN DECISION (for the human — do not let implementation decide it): resolve templates/ one of two ways.
- (A) Delete templates/ and remove the false claims at AGENTS.md:12 and conductor/tech-stack.md:26. Lowest effort; matches current reality (skills embed their own copies; setup-project writes inline). Loses the templates as a discoverable reference.
- (B) Make templates/ canonical: skills say "copy templates/X" instead of embedding, and setup-project ships the files. Higher effort and GATES 2026-06-09-setup-artifact-templates (the shipping mechanism would be reused there). Eliminates drift at the source.
This decision gates 2026-06-09-setup-artifact-templates and should be made before that issue advances.

DRIFT EVIDENCE (verified) — three independent definitions of the issues archive subdirs already disagree, which option (B) would unify and option (A) leaves as a separate bug:
- `templates/issues-setup.md:9-12` → tracked / deferred / wont-fix / duplicate
- `skills/triage/SKILL.md:17` → tracked, **implemented**, deferred, wont-fix, duplicate (adds `implemented/`)
- `bin/setup-project:266-269` → tracked / deferred / wont-fix / duplicate (no `implemented/`)
The live archive currently contains `issues/archived/implemented/`, so triage is the de-facto correct list and both other definitions are stale.

**Decision (approved 2026-06-09):** DELETE templates/ (option A). Rationale: nothing in skills/ or bin/ references templates/ (grep-confirmed); the live copies are embedded in triage/SKILL.md and agents-md-sync/SKILL.md; AGENTS.md already bans Codex-only forks. Also fix the false 'generated templates used by skills' claims at AGENTS.md:12 and conductor/tech-stack.md:26. Consequence for setup-artifact-templates: artifact templates live embedded in setup/SKILL.md, not in templates/.
