#!/usr/bin/env bash
# Hook: PostToolUse (Write/Edit) — validate issue file frontmatter
# Install: add to settings.json hooks array for PostToolUse event
# Claude Code only (Codex PostToolUse doesn't pass file path context)
#
# Reads the modified file path from stdin (JSON with tool_input.file_path).
# Only activates for files matching issues/*.md (not INBOX.md).

input=$(cat)
file_path=$(echo "$input" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"file_path"[[:space:]]*:[[:space:]]*"//; s/"$//')

# Only validate issue files
[[ "$file_path" == *issues/*.md ]] || exit 0
[[ "$(basename "$file_path")" == "INBOX.md" ]] && exit 0
[[ -f "$file_path" ]] || exit 0

# Check frontmatter exists. PostToolUse feedback only reaches the model via
# exit code 2 + stderr, so warnings go there (stdout/exit-0 is transcript-only).
if ! head -1 "$file_path" | grep -q '^---$'; then
  echo "Issue file $file_path is missing YAML frontmatter. Expected fields: status, type, priority, filed (between --- delimiters)." >&2
  exit 2
fi

# Extract frontmatter block (content between first and second ---)
frontmatter=$(awk '/^---$/{n++; next} n==1' "$file_path")

errors=""
add_error() { errors="${errors}"$'\n'"  - $1"; }

echo "$frontmatter" | grep -q '^status:'   || add_error "missing 'status' field"
echo "$frontmatter" | grep -q '^type:'     || add_error "missing 'type' field"
echo "$frontmatter" | grep -q '^priority:' || add_error "missing 'priority' field"
echo "$frontmatter" | grep -q '^filed:'    || add_error "missing 'filed' field"

# Validate status value
if echo "$frontmatter" | grep -q '^status:'; then
  status=$(echo "$frontmatter" | grep '^status:' | sed 's/^status: *//')
  case "$status" in
    triaged|reviewed|tracked|implemented|wont-fix|deferred|duplicate) ;;
    *) add_error "invalid status '$status' (expected: triaged|reviewed|tracked|implemented|wont-fix|deferred|duplicate)" ;;
  esac
fi

# Validate priority value
if echo "$frontmatter" | grep -q '^priority:'; then
  priority=$(echo "$frontmatter" | grep '^priority:' | sed 's/^priority: *//')
  case "$priority" in
    P1|P2|P3) ;;
    *) add_error "invalid priority '$priority' (expected: P1|P2|P3)" ;;
  esac
fi

# Surface errors to the model: stderr + exit 2 (PostToolUse feedback contract).
if [[ -n "$errors" ]]; then
  printf 'Issue frontmatter validation errors in %s:%s\n' "$(basename "$file_path")" "$errors" >&2
  exit 2
fi

exit 0
