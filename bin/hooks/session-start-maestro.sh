#!/usr/bin/env bash
# Hook: SessionStart — show .maestro/ pipeline status
# Install: add to settings.json hooks array for SessionStart event
# Works in both Claude Code and Codex

MAESTRO_DIR="${1:-.maestro}"

# Skip if no .maestro directory
[[ -d "$MAESTRO_DIR" ]] || exit 0

# Count inbox bullets (lines starting with "- " under the "## Inbox" heading)
inbox=0
if [[ -f "$MAESTRO_DIR/inbox.md" ]]; then
  inbox=$(
    awk '
      /^## Inbox$/ { in_inbox=1; next }
      /^## / && in_inbox { exit }
      in_inbox && /^- / { count++ }
      END { print count + 0 }
    ' "$MAESTRO_DIR/inbox.md" 2>/dev/null
  )
fi

# Count items by status from frontmatter (exclude archived/ subtree)
triaged=0
reviewed=0
planned=0
inprog=0
inreview=0
for f in "$MAESTRO_DIR/items/"*.md; do
  [[ -f "$f" ]] || continue
  status=$(awk '/^---$/{n++; next} n==1 && $1=="status:"{print $2; exit}' "$f" 2>/dev/null)
  case "$status" in
    triaged)     triaged=$((triaged + 1)) ;;
    reviewed)    reviewed=$((reviewed + 1)) ;;
    planned)     planned=$((planned + 1)) ;;
    in-progress) inprog=$((inprog + 1)) ;;
    in-review)   inreview=$((inreview + 1)) ;;
  esac
done

# Only print if there's something to report
total=$((inbox + triaged + reviewed + planned + inprog + inreview))
[[ $total -eq 0 ]] && exit 0

echo "MAESTRO:"
[ "$inbox" -gt 0 ]    && echo "  Inbox: $inbox unprocessed → /triage"
[ "$triaged" -gt 0 ]  && echo "  Triaged: $triaged → /issue-review"
[ "$reviewed" -gt 0 ] && echo "  Reviewed: $reviewed → /issue-advance or /implement or /issue-close"
[ "$planned" -gt 0 ]  && echo "  Planned: $planned → /implement"
[ "$inprog" -gt 0 ]   && echo "  In progress: $inprog → /implement"
[ "$inreview" -gt 0 ] && echo "  In review: $inreview → /uat-create or /uat-run"

exit 0
