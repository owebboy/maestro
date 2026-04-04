# Codex-Only Maestro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert this repository into a Codex-only Maestro branch while preserving the existing workflow surface, skill names, and Maestro artifact formats.

**Architecture:** The work is organized as a product-line cleanup rather than a workflow redesign. The implementation removes Claude-only packaging and guidance, rewrites surviving install/runtime paths around Codex conventions, and preserves existing `conductor/`, `issues/`, and track/UAT contracts so existing Maestro-managed projects remain compatible.

**Tech Stack:** Markdown skills/docs, Bash setup scripts, Git-based verification, Codex Agent Skills conventions

---

## File Structure

### Files To Delete

- `.claude-plugin/plugin.json`
- `.claude-plugin/marketplace.json`
- `hooks/hooks.json`
- `skills/workflow-router/SKILL.md`
- `skills/agents-md-sync/SKILL.md`

### Files To Modify

- `README.md`
- `codex/INSTALL.md`
- `bin/setup-project`
- `bin/hooks/session-start-issues.sh`
- `bin/hooks/validate-issue-frontmatter.sh`
- `docs/detecting-optional-skills.md`
- `templates/AGENTS.md.template`
- `skills/codebase-review/SKILL.md`
- `skills/implement/SKILL.md`
- `skills/issue-advance/SKILL.md`
- `skills/issue-close/SKILL.md`
- `skills/new-track/SKILL.md`
- `skills/issue-review/SKILL.md`
- `skills/manage/SKILL.md`
- `skills/session-wrap-up/SKILL.md`
- `skills/setup/SKILL.md`
- `skills/status/SKILL.md`
- `skills/triage/SKILL.md`
- `skills/uat-create/SKILL.md`
- `skills/uat-run/SKILL.md`

### Files To Add

- `docs/codex-runtime-contract.md`

### Files To Review For Residual Claude References

- `LICENSE`
- `bin/hooks/session-start-issues.sh`
- `bin/hooks/validate-issue-frontmatter.sh`
- `templates/issues-setup.md`
- `templates/issue-file.md`
- all `skills/*/SKILL.md`

---

### Task 1: Remove Claude-Only Product Surface

**Files:**
- Delete: `.claude-plugin/plugin.json`
- Delete: `.claude-plugin/marketplace.json`
- Delete: `skills/workflow-router/SKILL.md`
- Delete: `skills/agents-md-sync/SKILL.md`
- Modify: `README.md`

- [ ] **Step 1: Inspect the current Claude-only surface before deleting it**

Run:

```bash
rg -n "\.claude-plugin|workflow-router|agents-md-sync|Claude Code|plugin marketplace" README.md skills .claude-plugin
```

Expected: matches showing the current Claude packaging files and references that will be removed or rewritten.

- [ ] **Step 2: Delete the Claude-only packaging and translation/router skills**

Run:

```bash
rm -f .claude-plugin/plugin.json .claude-plugin/marketplace.json
rm -f skills/workflow-router/SKILL.md skills/agents-md-sync/SKILL.md
```

Expected: the files are removed from the working tree and `git status --short` shows them as deleted.

- [ ] **Step 3: Rewrite the README positioning around Codex-only support**

Modify `README.md` so it:
- describes Maestro as a Codex-only workflow
- removes Claude marketplace install instructions and dual-harness language
- keeps the same workflow concepts and skill names
- points setup/install guidance to `codex/INSTALL.md`
- updates architecture and dependency explanations to refer only to Codex

Key content to preserve:

```md
Maestro provides organization and coordination. Superpowers provides execution.
```

Key content to remove:

```md
### Claude Code plugin (recommended)
### Via project settings
### Project-scoped (manual)
```

- [ ] **Step 4: Verify the root surface no longer exposes Claude-only entry points**

Run:

```bash
rg -n "Claude Code|plugin marketplace|workflow-router|agents-md-sync|\.claude-plugin" README.md skills
```

Expected: no matches in retained product-facing docs except possibly historical mentions that are intentionally removed in later tasks.

- [ ] **Step 5: Commit the product-surface cleanup**

Run:

```bash
git add README.md .claude-plugin skills/workflow-router skills/agents-md-sync
git commit -m "refactor: remove claude-only maestro surface"
```

Expected: one commit capturing surface cleanup and README repositioning.

---

### Task 2: Convert Setup And Runtime Contracts To Codex-Only Paths

**Files:**
- Modify: `bin/setup-project`
- Modify: `codex/INSTALL.md`
- Delete: `hooks/hooks.json`
- Add: `docs/codex-runtime-contract.md`
- Modify: `templates/AGENTS.md.template`

- [ ] **Step 1: Inspect current install-path and hook assumptions**

Run:

```bash
rg -n "\.claude|--claude|--both|CLAUDE|hooks|agents-md-sync|project_doc_fallback_filenames" bin/setup-project codex/INSTALL.md hooks/hooks.json templates/AGENTS.md.template
```

Expected: matches showing Claude-specific install branches, hook guidance, and AGENTS translation assumptions.

- [ ] **Step 2: Rewrite `bin/setup-project` as a Codex-only installer**

Modify `bin/setup-project` so it:
- supports only Codex installation
- removes `--claude` and `--both`
- installs skills only into `.agents/skills/`
- installs only supported Codex hook assets into `.agents/hooks/`
- stops recommending `/agents-md-sync`
- updates help text and final messaging to mention Codex only
- resolves `--with-superpowers` only from Codex-local Superpowers installs, not Claude plugin caches

Required `--with-superpowers` source rule:

```text
Primary source: $HOME/.codex/superpowers/skills/
Optional fallback: another documented Codex-local checkout path if the repo already standardizes one
Failure mode: print a Codex-only install hint and continue without installing Superpowers rather than probing Claude caches
```

Required command shape after rewrite:

```bash
./bin/setup-project [--with-superpowers] [target-dir]
```

Required final output theme:

```text
maestro setup
  Target: ...
  Codex: true
```

- [ ] **Step 3: Replace mixed detection guidance with a canonical Codex runtime contract**

Create `docs/codex-runtime-contract.md` documenting:
- where Maestro looks for optional skills in Codex
- the canonical detection order for Superpowers-dependent skills
- how multi-agent degradation should work
- what hook support Maestro assumes on Codex
- what `AGENTS.md` means in this branch

Required detection order:

```md
1. Visible session skill inventory
2. Project-scoped `.agents/skills/`
3. Reliable Codex-local installation signal, if documented
4. Inline fallback
```

- [ ] **Step 4: Update installation and AGENTS docs to point at the new contract**

Modify:
- `codex/INSTALL.md` to become the primary installation guide
- `templates/AGENTS.md.template` to remove Claude fallback notes and Codex/Claude comparison framing
- `hooks/hooks.json` to be deleted because it is a Claude-only hook manifest and should not remain in the Codex-only branch

`codex/INSTALL.md` should explicitly state that this branch is Codex-only and that Claude setup is unsupported.

- [ ] **Step 5: Smoke-test the installer in a temporary directory**

Run:

```bash
tmpdir="$(mktemp -d)"
mkdir -p "$tmpdir/project-base" "$tmpdir/project-superpowers-missing"
./bin/setup-project "$tmpdir/project-base"
HOME="$tmpdir/home-missing" ./bin/setup-project --with-superpowers "$tmpdir/project-superpowers-missing"
find "$tmpdir/project-base" -maxdepth 3 -type f | sort
find "$tmpdir/project-base" -maxdepth 3 -type l | sort
find "$tmpdir/project-superpowers-missing" -maxdepth 3 -type f | sort
find "$tmpdir/project-superpowers-missing" -maxdepth 3 -type l | sort
```

Expected:
- `.agents/skills/` exists in both test projects
- supported Maestro skills are linked there
- the base install works without creating `.claude/`
- the `--with-superpowers` run degrades cleanly when no Codex-local Superpowers source exists
- `.agents/hooks/session-start-issues.sh` exists if hooks are still installed
- no `.claude/` directory is created

Optional positive-case verification when a local Codex Superpowers install is available:

```bash
tmpdir="$(mktemp -d)"
mkdir -p "$tmpdir/project-superpowers" "$tmpdir/home/.codex/superpowers"
cp -R "$HOME/.codex/superpowers/skills" "$tmpdir/home/.codex/superpowers/"
HOME="$tmpdir/home" ./bin/setup-project --with-superpowers "$tmpdir/project-superpowers"
find "$tmpdir/project-superpowers" -maxdepth 3 -type l | sort
```

Expected:
- if `$HOME/.codex/superpowers/skills` exists locally, Superpowers skills are linked into `.agents/skills/`
- if no local Codex Superpowers install exists, skip this positive-case subtest and rely on the required graceful-degradation case above

- [ ] **Step 6: Commit the Codex-only setup/runtime contract**

Run:

```bash
git add bin/setup-project codex/INSTALL.md templates/AGENTS.md.template docs/codex-runtime-contract.md
git add -u hooks/hooks.json
git commit -m "refactor: make maestro setup codex-only"
```

Expected: one commit covering installer conversion and runtime contract docs.

---

### Task 3: Rewrite Skill Guidance Around Codex-Only Execution

**Files:**
- Modify: `docs/detecting-optional-skills.md`
- Modify: `skills/codebase-review/SKILL.md`
- Modify: `skills/implement/SKILL.md`
- Modify: `skills/issue-advance/SKILL.md`
- Modify: `skills/issue-close/SKILL.md`
- Modify: `skills/new-track/SKILL.md`
- Modify: `skills/issue-review/SKILL.md`
- Modify: `skills/manage/SKILL.md`
- Modify: `skills/session-wrap-up/SKILL.md`
- Modify: `skills/setup/SKILL.md`
- Modify: `skills/status/SKILL.md`
- Modify: `skills/triage/SKILL.md`
- Modify: `skills/uat-create/SKILL.md`
- Modify: `skills/uat-run/SKILL.md`

- [ ] **Step 1: Find all remaining Claude-oriented skill references**

Run:

```bash
rg -n "Claude|\.claude|plugin|marketplace|user-invocable|disable-model-invocation|project settings|enabledPlugins|Claude Code" \
  docs/detecting-optional-skills.md \
  skills
```

Expected: a concrete list of skill docs and shared docs that still encode Claude assumptions.

- [ ] **Step 2: Rewrite shared optional-skill detection guidance**

Modify `docs/detecting-optional-skills.md` so it:
- no longer references `.claude/settings.json`
- no longer references Claude plugin IDs
- points to `docs/codex-runtime-contract.md`
- describes only Codex-visible detection signals and inline fallback

Required replacement principle:

```md
Treat a skill as available only when Codex can observe it through the current session or documented Codex-local installation paths.
```

- [ ] **Step 3: Update the retained skills that invoke or detect optional capabilities**

For each listed skill file:
- remove Claude-vs-Codex branching language
- replace detection references with the Codex runtime contract doc
- describe agent spawning only in Codex terms
- preserve existing workflow semantics and artifact formats

Focus points:
- `skills/implement/SKILL.md`: Codex-only execution mode and fallback wording
- `skills/new-track/SKILL.md`: Codex-only Superpowers detection and planning handoff wording
- `skills/issue-close/SKILL.md`: confirm the preserved close/archive workflow has no stale Claude assumptions
- `skills/issue-review/SKILL.md` and `skills/codebase-review/SKILL.md`: Codex agent fan-out and sequential fallback wording
- `skills/setup/SKILL.md` and `skills/status/SKILL.md`: remove Claude-specific examples or assumptions
- `skills/session-wrap-up/SKILL.md`: preserve end-of-session context maintenance, make `AGENTS.md` the primary artifact, and remove `revise-claude-md` / `CLAUDE.md` dependencies while keeping the workflow outcome
- `bin/hooks/session-start-issues.sh` and `bin/hooks/validate-issue-frontmatter.sh`: remove stale Claude-specific wording if the final cleanup scan finds it

- [ ] **Step 4: Run a repo-wide skill sanity search**

Run:

```bash
rg -n "Claude Code|\.claude|enabledPlugins|superpowers-marketplace|claude-plugins-official|user-invocable|agents-md-sync|workflow-router" \
  docs/detecting-optional-skills.md \
  docs/codex-runtime-contract.md \
  codex/INSTALL.md \
  README.md \
  skills
```

Expected: no matches in retained Codex branch docs/skills except intentional historical notes that have been explicitly retained.

- [ ] **Step 5: Commit the Codex-only skill contract rewrite**

Run:

```bash
git add docs/detecting-optional-skills.md skills
git commit -m "refactor: rewrite maestro skills for codex runtime"
```

Expected: one commit covering the skill and detection rewrite.

---

### Task 4: Rewrite Remaining Documentation For The Codex-Only Branch

**Files:**
- Modify: `README.md`
- Modify: `codex/INSTALL.md`
- Modify: `docs/detecting-optional-skills.md`
- Modify: `docs/codex-runtime-contract.md`

- [ ] **Step 1: Review the top-level docs as a connected reader journey**

Run:

```bash
sed -n '1,260p' README.md
printf '\n---\n'
sed -n '1,260p' codex/INSTALL.md
printf '\n---\n'
sed -n '1,260p' docs/detecting-optional-skills.md
printf '\n---\n'
sed -n '1,260p' docs/codex-runtime-contract.md
```

Expected: a full pass across the user-facing docs to catch contradictions after the earlier code and skill edits.

- [ ] **Step 2: Tighten the docs so they present one coherent Codex-only story**

Ensure the docs consistently communicate:
- Codex is the only supported runtime on this branch
- Maestro keeps the same workflow surface
- Superpowers remains optional but recommended
- existing Maestro project artifacts remain compatible
- hooks and multi-agent features are described only in Codex terms

- [ ] **Step 3: Remove residual historical framing that confuses the branch identity**

Run:

```bash
rg -n "compatibility|dual-harness|both harnesses|Claude|Cursor|Copilot|Gemini" \
  README.md \
  codex/INSTALL.md \
  docs/detecting-optional-skills.md \
  docs/codex-runtime-contract.md
```

Expected: only intentional upstream or contextual mentions remain, if any.

- [ ] **Step 4: Commit the documentation rewrite**

Run:

```bash
git add README.md codex/INSTALL.md docs
git commit -m "docs: present maestro as codex-only"
```

Expected: one docs-focused commit aligning the branch narrative.

---

### Task 5: Run Compatibility And Cleanup Verification

**Files:**
- Review: entire repository

- [ ] **Step 1: Verify deleted files are gone and retained workflow files remain**

Run:

```bash
test ! -e .claude-plugin/plugin.json
test ! -e .claude-plugin/marketplace.json
test ! -e hooks/hooks.json
test ! -e skills/workflow-router/SKILL.md
test ! -e skills/agents-md-sync/SKILL.md
test -e skills/setup/SKILL.md
test -e skills/implement/SKILL.md
test -e skills/triage/SKILL.md
```

Expected: the delete checks succeed and retained skill checks succeed.

- [ ] **Step 2: Run a repo-wide stale-reference search**

Run:

```bash
rg -n "\bClaude\b|CLAUDE\.md|CLAUDE\.local\.md|\.claude/|\.claude-plugin|enabledPlugins|claude-plugins-official|superpowers-marketplace|agents-md-sync|workflow-router|project_doc_fallback_filenames" \
  . \
  --glob '!docs/superpowers/specs/**' \
  --glob '!docs/superpowers/plans/**' \
  --glob '!.git/**'
```

Expected: either no matches or only deliberate references that are still accurate for this Codex-only branch outside the excluded planning/spec records. Any stray matches must be fixed before completion.

- [ ] **Step 3: Verify the preserved Maestro artifact contract is still documented**

Run:

```bash
rg -n "conductor/|issues/|tracks\.md|metadata\.json|UAT-" README.md codex/INSTALL.md docs skills
```

Expected: matches showing that the preserved artifact contract is still described after the rewrite.

- [ ] **Step 4: Review the final diff for scope creep**

Run:

```bash
git status --short
git diff --stat
```

Expected: only the Codex-only migration files are changed. No unrelated project behavior should be introduced.

- [ ] **Step 5: Walk the preserved workflow end-to-end as a reader**

Run:

```bash
sed -n '1,220p' README.md
printf '\n---\n'
sed -n '1,220p' skills/setup/SKILL.md
printf '\n---\n'
sed -n '1,260p' skills/new-track/SKILL.md
printf '\n---\n'
sed -n '1,260p' skills/implement/SKILL.md
printf '\n---\n'
sed -n '1,260p' skills/triage/SKILL.md
printf '\n---\n'
sed -n '1,260p' skills/issue-review/SKILL.md
printf '\n---\n'
sed -n '1,220p' skills/issue-advance/SKILL.md
printf '\n---\n'
sed -n '1,220p' skills/issue-close/SKILL.md
```

Expected: the documented `setup` → `new-track` → `implement` path and the issue pipeline read as one coherent Codex-only workflow with no semantic drift.

- [ ] **Step 6: Perform a final implementation sanity pass**

Run:

```bash
git log --oneline -n 5
```

Expected: the recent commits map cleanly to the planned migration streams and provide rollback-friendly checkpoints.

- [ ] **Step 7: Commit any final cleanup required by verification**

Run:

```bash
git add -A
git commit -m "chore: finalize codex-only maestro cleanup"
```

Expected: a final cleanup commit only if verification uncovered residual issues that required edits.

- [ ] **Step 8: Re-run the stale-reference verification after cleanup**

Run:

```bash
rg -n "\bClaude\b|CLAUDE\.md|CLAUDE\.local\.md|\.claude/|\.claude-plugin|enabledPlugins|claude-plugins-official|superpowers-marketplace|agents-md-sync|workflow-router|project_doc_fallback_filenames" \
  . \
  --glob '!docs/superpowers/specs/**' \
  --glob '!docs/superpowers/plans/**' \
  --glob '!.git/**'
```

Expected: no unexpected matches remain outside the excluded planning/spec records.
