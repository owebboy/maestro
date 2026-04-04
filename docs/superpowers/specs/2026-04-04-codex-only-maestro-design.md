# Codex-Only Maestro Design

**Date:** 2026-04-04

**Goal:** Convert Maestro into a Codex-only workflow system on a dedicated branch while preserving the existing workflow surface, skill names, and on-disk artifact formats.

## Summary

This design turns the current dual-harness Maestro repository into a Codex-only product line. The resulting branch keeps the same user-facing workflow:

- `setup`
- `new-track`
- `implement`
- `status`
- `manage`
- `triage`
- `issue-review`
- `issue-advance`
- `issue-close`
- `codebase-review`
- `uat-create`
- `uat-run`
- `session-wrap-up`

It also preserves existing project artifacts and conventions:

- `conductor/`
- `issues/`
- track specs, plans, metadata, and registry formats
- issue frontmatter and issue archive layout
- UAT document layout

The branch explicitly removes Claude-specific packaging, routing, and runtime assumptions.

## Context

The current repository already contains substantial Codex support, but it is framed as a compatibility path alongside Claude-oriented packaging and documentation. The repository still carries:

- Claude marketplace metadata under `.claude-plugin/`
- Claude-specific install guidance in the main docs
- Claude-only or Claude-primary skill references and routing assumptions
- optional-skill detection logic that depends on `.claude/settings.json` and Claude plugin state
- translation utilities such as `agents-md-sync` that exist because the repository currently treats `CLAUDE.md` as primary and `AGENTS.md` as derived

Upstream Superpowers has a stronger Codex story than this repository currently mirrors. Its current workflow is explicitly multi-platform and documents a Codex-native sequence centered on:

1. `brainstorming`
2. `using-git-worktrees`
3. `writing-plans`
4. `subagent-driven-development` or `executing-plans`
5. `test-driven-development`
6. `requesting-code-review`
7. `finishing-a-development-branch`

Maestro should remain the coordinating layer above that system, but in Codex-only terms.

## Goals

- Preserve Maestro's workflow surface and core user experience
- Preserve compatibility with existing Maestro project artifacts
- Make Codex the only supported runtime in this branch
- Remove Claude-specific packaging, docs, hooks guidance, and detection logic
- Keep Superpowers as the optional execution engine for design, planning, and implementation
- Improve internal clarity by deleting compatibility scaffolding that no longer serves a Codex-only product

## Non-Goals

- Redesign the Maestro workflow into a different command model
- Change `conductor/`, `issues/`, or track file formats
- Introduce a new repository layout for downstream users
- Preserve Claude runtime support in dormant or partially supported form
- Rebuild Maestro around a new internal architecture if pruning and Codex-native adaptation are sufficient

## Approach

Use a codex-focused pruning approach:

- keep the repository and its workflow contracts
- remove Claude-only assets and assumptions
- rewrite the surviving material so Codex is the primary and only runtime
- tighten skill guidance, install paths, and fallback logic around Codex behavior

This is preferred over a thin documentation-only conversion because it reduces long-term maintenance burden and prevents the Codex-only branch from carrying dead design weight.

## Architecture

The Codex-only branch treats Maestro as a pure Codex Agent Skills distribution.

### Product Surface

The repository's primary surface becomes:

- `skills/` for workflow behavior
- `bin/setup-project` for project-scoped installation
- Codex-oriented docs for onboarding and operations
- `AGENTS.md`-first guidance for persistent project instructions

### Removed Surface

The branch removes:

- `.claude-plugin/`
- Claude marketplace metadata and install instructions
- Claude hook activation guidance
- dual-harness setup language where Codex and Claude are co-equal targets
- Claude-only utility skills that exist only for cross-runtime translation or auto-routing

### Runtime Model

Maestro continues to own workflow coordination:

- what artifacts exist
- when a workflow phase should happen
- how issue and track state advance

Superpowers remains the optional execution engine:

- brainstorming and design
- planning
- TDD-oriented execution
- subagent orchestration
- verification and branch completion

In this branch, all integration points between Maestro and Superpowers are described in Codex-only terms.

## Component Design

### Retained Skills

These skills remain and preserve their current workflow roles:

- `setup`
- `new-track`
- `implement`
- `status`
- `manage`
- `triage`
- `issue-review`
- `issue-advance`
- `issue-close`
- `codebase-review`
- `uat-create`
- `uat-run`
- `session-wrap-up`

Each retained skill should be revised to:

- describe Codex-native tool usage only
- refer to `.agents/skills/` and `.agents/hooks/` only
- treat `AGENTS.md` as the persistent project instruction document
- describe agent spawning and degraded execution in Codex terms
- remove references to Claude-only frontmatter semantics and plugin behaviors

### Removed Skills

Two existing skills should be deleted rather than ported:

- `workflow-router`
- `agents-md-sync`

`workflow-router` depends on Claude-style automatic routing expectations that are not a stable Codex contract. `agents-md-sync` exists because the current repo treats `CLAUDE.md` as primary and `AGENTS.md` as secondary; a Codex-only branch should invert that and own `AGENTS.md` directly.

### Supporting Documentation

Add or revise a Codex-only operational reference that standardizes:

- optional-skill detection
- agent spawning expectations
- hook support assumptions
- fallback behavior when Superpowers is absent
- repository-local versus user-global Codex skill installation expectations

This reference should replace the current Claude-oriented multi-signal detection model where necessary.

## Data Flow

The user-visible workflow remains unchanged.

### Core Flow

1. `setup` creates `conductor/` context
2. `new-track` creates a track and obtains design and planning support
3. `implement` executes an approved plan
4. issue pipeline skills move work from `issues/INBOX.md` into tracks
5. `uat-create`, `uat-run`, and `session-wrap-up` validate and close the loop

### Internal Control Flow

What changes is the runtime decision path.

Every skill that depends on optional capabilities should follow a Codex-only detection sequence:

1. check the current session's visible skill inventory
2. check project-scoped `.agents/skills/`
3. check any reliable Codex-local installation signal that can be documented and tested
4. otherwise fall back to an inline Maestro workflow

The branch must stop depending on:

- `.claude/settings.json`
- Claude plugin marketplace identifiers
- Claude project skill directories
- Claude-only lifecycle assumptions

### Artifact Compatibility

All existing Maestro project artifacts remain stable:

- `conductor/tracks.md`
- `conductor/tracks/<track-id>/spec.md`
- `conductor/tracks/<track-id>/plan.md`
- `conductor/tracks/<track-id>/metadata.json`
- `issues/INBOX.md`
- `issues/*.md`
- `issues/archived/*`
- `conductor/UAT-YYYY-MM-DD.md`

This ensures existing Maestro-managed projects can move to the Codex-only branch without data migration.

## Error Handling

The Codex-only branch should define explicit behavior for missing or partial runtime capabilities.

### Superpowers Missing

If required Superpowers skills are unavailable, Maestro should:

- state that Superpowers was not detected
- use the documented inline fallback for that workflow phase
- never reference Claude installation or detection paths

### Multi-Agent Capability Missing

If Codex parallel or subagent capability is unavailable, skills that normally fan out work should:

- warn clearly that execution will be degraded
- run sequentially when the workflow is still meaningful
- stop only when the workflow genuinely depends on agent isolation or concurrency

### Missing Project Context

If `AGENTS.md`, `conductor/`, or other required context is absent, skills should fail with a direct remediation step such as:

- run `setup`
- create or update `AGENTS.md`
- install project-scoped skills with the Codex setup path

### Unsupported Hooks

Hook behavior should be documented in Codex terms only. Unsupported hook scenarios should be skipped cleanly and not described as partial Claude parity.

## Testing Strategy

Testing for this branch is repository-contract oriented rather than application-feature oriented.

### Required Verification Areas

- `bin/setup-project` installs only Codex-relevant assets
- no retained docs or skills reference removed Claude assets
- retained skills point to valid Codex paths and conventions
- optional-skill detection logic matches the documented Codex-only model
- existing Maestro artifact formats remain unchanged

### Recommended Validation Methods

- smoke-test `bin/setup-project` in a temporary project
- repo-wide searches for stale Claude-specific references
- targeted checks for removed files still referenced from docs or skills
- sample walkthroughs of `setup`, `new-track`, `implement`, and issue-pipeline documentation against the preserved artifact contracts

## Migration Implications

This work happens on a dedicated branch in the same repository.

### Branch Outcome

The branch becomes the Codex-only Maestro line:

- same repository identity
- same workflow concepts
- same artifact contracts
- different runtime target

### Cleanup Principle

The branch should be unapologetically Codex-only. Claude-specific files and packaging should be removed completely, not left behind as inactive stubs.

## Risks

### Risk 1: Stale Claude references remain behind

This is the most likely failure mode. It would leave the branch internally inconsistent and confuse installation, skill behavior, or fallback instructions.

**Mitigation:** run repo-wide cleanup and verification passes focused on documentation, setup scripts, detection logic, and skill text.

### Risk 2: External workflow stays stable but internal assumptions drift

The branch could accidentally preserve names while changing behavior in subtle ways.

**Mitigation:** treat current skill names, workflow order, and artifact formats as compatibility contracts and validate against them explicitly.

### Risk 3: Optional Superpowers integration becomes under-specified

Removing Claude logic without replacing it cleanly in Codex terms would make fallback and integration behavior ambiguous.

**Mitigation:** create one canonical Codex-only capability/detection reference and make all relevant skills use it.

## Implementation Guidance For Planning

The implementation plan should organize work into a small number of focused streams:

1. repository surface cleanup
2. install/setup and hook path conversion
3. skill text and runtime-contract rewrite
4. docs rewrite
5. compatibility verification

That decomposition is cohesive enough for a single plan because all streams serve one product-line transition and share a single compatibility contract.

## Acceptance Criteria

- Maestro can be described and installed as a Codex-only workflow system with no Claude packaging or active Claude guidance left in the branch
- The preserved Maestro skills retain the same workflow roles and names
- `conductor/`, `issues/`, track files, and UAT files remain compatible with existing Maestro-managed projects
- `workflow-router` and `agents-md-sync` are removed from the Codex-only branch
- setup and documentation point only to Codex installation targets and Codex runtime assumptions
- optional Superpowers integration and fallback behavior are specified in Codex-only terms
- the branch includes enough verification to detect stale Claude references and broken workflow contracts
