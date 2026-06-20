#!/usr/bin/env bash
# Hook: PostToolUse (Write/Edit) — validate .maestro/items/ file frontmatter
# Install: add to settings.json hooks array for PostToolUse event
# Claude Code only (Codex PostToolUse doesn't pass file path context)
#
# Reads the modified file path from stdin (JSON with tool_input.file_path).
# Only activates for files matching .maestro/items/**/*.md.

input=$(cat)
file_path=$(echo "$input" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"file_path"[[:space:]]*:[[:space:]]*"//; s/"$//')

# Validate .maestro/config.json when written/edited
if [[ "$file_path" == *.maestro/config.json ]]; then
  [[ -f "$file_path" ]] || exit 0
  config_errors=""
  add_config_error() { config_errors="${config_errors}"$'\n'"  - $1"; }

  # Assert valid JSON
  if ! python3 -m json.tool "$file_path" >/dev/null 2>&1; then
    add_config_error "config.json is not valid JSON"
  else
    # Assert known adapter value
    adapter=$(python3 -c "import json,sys; d=json.load(open(sys.argv[1])); print(d.get('adapter',''))" "$file_path" 2>/dev/null)
    case "$adapter" in
      files|gitea|github|gitlab|linear|jira) ;;
      "") add_config_error "config.json missing 'adapter' field" ;;
      *)  add_config_error "config.json has unknown adapter '$adapter' (expected: files|gitea|github|gitlab|linear|jira)" ;;
    esac
  fi

  if [[ -n "$config_errors" ]]; then
    printf 'config.json validation errors:%s\n' "$config_errors" >&2
    exit 2
  fi
  exit 0
fi

# Only validate .maestro/items/ files (including archived/ subtree)
[[ "$file_path" == *.maestro/items/*.md ]] || exit 0
[[ -f "$file_path" ]] || exit 0

# Check frontmatter exists. PostToolUse feedback only reaches the model via
# exit code 2 + stderr, so warnings go there (stdout/exit-0 is transcript-only).
if ! head -1 "$file_path" | grep -q '^---$'; then
  echo "Item file $file_path is missing YAML frontmatter. Expected fields: id, title, type, priority, status, weight, created, updated (between --- delimiters)." >&2
  exit 2
fi

# Extract frontmatter block (content between first and second ---)
frontmatter=$(awk '/^---$/{n++; next} n==1' "$file_path")

errors=""
add_error() { errors="${errors}"$'\n'"  - $1"; }

# Required fields (LD-3)
echo "$frontmatter" | grep -q '^id:'       || add_error "missing 'id' field"
echo "$frontmatter" | grep -q '^title:'    || add_error "missing 'title' field"
echo "$frontmatter" | grep -q '^type:'     || add_error "missing 'type' field"
echo "$frontmatter" | grep -q '^priority:' || add_error "missing 'priority' field"
echo "$frontmatter" | grep -q '^status:'   || add_error "missing 'status' field"
echo "$frontmatter" | grep -q '^weight:'   || add_error "missing 'weight' field"
echo "$frontmatter" | grep -q '^created:'  || add_error "missing 'created' field"
echo "$frontmatter" | grep -q '^updated:'  || add_error "missing 'updated' field"

# Validate status value (canonical closed set of 10)
if echo "$frontmatter" | grep -q '^status:'; then
  status=$(echo "$frontmatter" | grep '^status:' | sed 's/^status: *//')
  case "$status" in
    inbox|triaged|reviewed|planned|in-progress|in-review|done|wont-fix|deferred|duplicate) ;;
    *) add_error "invalid status '$status' (expected: inbox|triaged|reviewed|planned|in-progress|in-review|done|wont-fix|deferred|duplicate)" ;;
  esac
fi

# Validate type value
if echo "$frontmatter" | grep -q '^type:'; then
  type=$(echo "$frontmatter" | grep '^type:' | sed 's/^type: *//')
  case "$type" in
    bug|feature|refactor|chore) ;;
    *) add_error "invalid type '$type' (expected: bug|feature|refactor|chore)" ;;
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

# Validate weight value
if echo "$frontmatter" | grep -q '^weight:'; then
  weight=$(echo "$frontmatter" | grep '^weight:' | sed 's/^weight: *//')
  case "$weight" in
    light|tracked) ;;
    *) add_error "invalid weight '$weight' (expected: light|tracked)" ;;
  esac
fi

# Surface errors to the model: stderr + exit 2 (PostToolUse feedback contract).
if [[ -n "$errors" ]]; then
  printf 'Item frontmatter validation errors in %s:%s\n' "$(basename "$file_path")" "$errors" >&2
  exit 2
fi

exit 0
