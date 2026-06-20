# Bash Style Guide

Bash powers install tooling (`bin/setup-project`, `bin/hooks/`, `hooks/`).

## Safety

- Start scripts with `set -euo pipefail` unless there is a documented reason not to.
- Quote all expansions: `"$var"`, `"${arr[@]}"`.
- Prefer `[[ ... ]]` over `[ ... ]` for tests.
- Use `mkdir -p` and idempotent operations so installers can be re-run safely.

## Portability

- Target both macOS and Linux (`bin/setup-project` runs on contributor machines and CI).
- Avoid GNU-only flags where a POSIX form exists; if a GNU-ism is required, guard or document it.
- Detect harnesses/paths rather than hardcoding user-specific locations.

## Validation

- Every script must pass `bash -n <script>` (syntax check) — this is the verification gate.
- Keep functions small and named for what they do.

## Style

- 2-space indentation.
- Lowercase function and variable names; `UPPER_CASE` only for environment/exported constants.
- Comment the *why* for non-obvious logic, not the *what*.
