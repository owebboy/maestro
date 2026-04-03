#!/usr/bin/env bash
# Hook: SessionStart — show issue pipeline status
# Install: add to settings.json hooks array for SessionStart event
# Works in both Claude Code and Codex

ISSUES_DIR="${1:-issues}"

# Skip if no issues directory
[[ -d "$ISSUES_DIR" ]] || exit 0

# Count inbox bullets
inbox_count=0
if [[ -f "$ISSUES_DIR/INBOX.md" ]]; then
  inbox_count=$(grep -c '^- ' "$ISSUES_DIR/INBOX.md" 2>/dev/null || echo 0)
fi

# Count open issues by status (from frontmatter)
triaged=0
reviewed=0
for f in "$ISSUES_DIR"/*.md; do
  [[ -f "$f" ]] || continue
  [[ "$(basename "$f")" == "INBOX.md" ]] && continue
  status=$(sed -n '/^---$/,/^---$/{ /^status:/{ s/^status: *//; p; } }' "$f" 2>/dev/null)
  case "$status" in
    triaged)  triaged=$((triaged + 1)) ;;
    reviewed) reviewed=$((reviewed + 1)) ;;
  esac
done

# Only print if there's something to report
total=$((inbox_count + triaged + reviewed))
[[ $total -eq 0 ]] && exit 0

echo "ISSUES:"
[[ $inbox_count -gt 0 ]] && echo "  Inbox: $inbox_count unprocessed → /triage"
[[ $triaged -gt 0 ]]     && echo "  Triaged: $triaged → /issue-review"
[[ $reviewed -gt 0 ]]    && echo "  Reviewed: $reviewed → /issue-advance or /issue-close"
