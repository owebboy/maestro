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

# Check frontmatter exists
if ! head -1 "$file_path" | grep -q '^---$'; then
  echo "WARN: Issue file $file_path is missing YAML frontmatter. Expected: ---/status/type/priority/filed/---"
  exit 0
fi

# Extract frontmatter block
frontmatter=$(sed -n '1,/^---$/{ /^---$/d; p; }' "$file_path" | tail -n +1)
# The above gets content between first --- and second ---
frontmatter=$(awk '/^---$/{n++; next} n==1' "$file_path")

errors=""
echo "$frontmatter" | grep -q '^status:' || errors="${errors}\n  - missing 'status' field"
echo "$frontmatter" | grep -q '^type:'   || errors="${errors}\n  - missing 'type' field"
echo "$frontmatter" | grep -q '^priority:' || errors="${errors}\n  - missing 'priority' field"
echo "$frontmatter" | grep -q '^filed:'  || errors="${errors}\n  - missing 'filed' field"

# Validate status value
if echo "$frontmatter" | grep -q '^status:'; then
  status=$(echo "$frontmatter" | grep '^status:' | sed 's/^status: *//')
  case "$status" in
    triaged|reviewed|tracked|wont-fix|deferred|duplicate) ;;
    *) errors="${errors}\n  - invalid status '$status' (expected: triaged|reviewed|tracked|wont-fix|deferred|duplicate)" ;;
  esac
fi

# Validate priority value
if echo "$frontmatter" | grep -q '^priority:'; then
  priority=$(echo "$frontmatter" | grep '^priority:' | sed 's/^priority: *//')
  case "$priority" in
    P1|P2|P3) ;;
    *) errors="${errors}\n  - invalid priority '$priority' (expected: P1|P2|P3)" ;;
  esac
fi

if [[ -n "$errors" ]]; then
  echo "Issue frontmatter validation errors in $(basename "$file_path"):$errors"
fi
