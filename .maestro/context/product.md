# Product

## Name

Maestro

## Description

A cross-harness development workflow plugin for Claude Code and Codex. Maestro provides an issue pipeline, tracked development with specs and plans, UAT, codebase review, and session wrap-up — using [Superpowers](https://github.com/obra/superpowers) as the execution engine for brainstorming, planning, TDD, and subagent-driven development.

## Problem Statement

AI coding harnesses make it easy to write code but hard to keep multi-step work organized, reviewable, and consistent — especially across more than one harness. Specs drift from implementation, issues get lost, and each tool reinvents its own conventions. Maestro provides a single, structured workflow (issue → track → spec → plan → implement → verify → wrap-up) that behaves the same whether the developer is in Claude Code or Codex.

## Target Users

Developers using Claude Code and/or Codex who want a disciplined, tracked development workflow rather than ad-hoc prompting — including teams that need their AI-assisted process to be portable across harnesses.

## Key Goals

1. **Cross-harness parity** — identical workflow behavior on Claude Code and Codex from a shared skill source.
2. **Structured, tracked development** — specs and plans that stay linked to implementation and verification.
3. **Composition over reinvention** — lean on Superpowers and other plugins for execution rather than duplicating them.
