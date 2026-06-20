---
name: triage
description: Use when .maestro/inbox.md has unprocessed bullets that need to become structured work items.
argument-hint: ""
---

# Triage

Convert `.maestro/inbox.md` bullets into structured work items.

## Process

1. **Read** `.maestro/inbox.md` — extract bullets under `## Inbox`
   - If the file does not exist or has no bullets, inform user and stop

2. **Dedup** — for each bullet, call `search(<bullet text>)`
   - If a candidate is a strong match (same problem, same scope), ask before creating
   - Offer `relate(new, duplicate-of, existing)` instead of creating a second item
   - Only flag as duplicate if an **active** item (status not in `done`, `wont-fix`, `deferred`, `duplicate`) already covers the same problem
   - When overlap is ambiguous, present both candidates and let the user decide

3. **Classify** each bullet — infer from description, confirm with user:
   - **Type:** bug | feature | refactor | chore
   - **Priority:** P1 (blocking/critical) | P2 (important) | P3 (nice-to-have)

4. **Polish descriptions** — before creating items, tighten the Summary and Problem Description for each bullet:
   - Detect `writing-clearly-and-concisely` using the [multi-signal procedure](../../docs/detecting-optional-skills.md) (check, in order: the available-skills list for the prefixed or bare name; `.claude/settings.json` `enabledPlugins`; a `.claude/skills/<name>/` or `.agents/skills/<name>/` directory)
   - If found, invoke it on the draft descriptions (batch all bullets in a single invocation)
   - If not available, do a quick inline pass: remove filler words, prefer active voice, keep each description to 1-2 sentences
   - Do not change technical meaning — only improve clarity

5. **Create item** for each bullet:
   - Call `create_item({title, type, priority, body, weight: light})`
   - Then call `set_status(id, triaged)` on the returned id
   - The adapter handles id minting, `created` timestamp, and file placement

6. **Display summary table:**

   | ID | Type | Priority | Summary |
   |----|------|----------|---------|
   | 0042-timer-pause | bug | P1 | Timer doesn't pause... |

7. **Clear processed bullets** from `.maestro/inbox.md` after user confirms
   - Leave the `## Inbox` header intact

## Error Handling

- **Malformed bullets**: If a bullet lacks a clear description (e.g., just a URL or single word), ask the user to clarify before creating an item.
- **.maestro/inbox.md has non-bullet content under ## Inbox**: Ignore non-bullet lines (paragraphs, headers, blank lines) — only process lines starting with `- `.
- **Duplicate detection uncertain**: When overlap is ambiguous, present both items and let the user decide.
- **Item creation failure**: If `create_item` or `set_status` fails, report the error and continue with remaining bullets. Do not clear any bullets from inbox until their items are confirmed created.
