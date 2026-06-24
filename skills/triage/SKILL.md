---
name: triage
description: Use when .maestro/inbox.md has unprocessed bullets that need to become structured work items.
argument-hint: ""
---

# Triage

Convert pending captures into structured work items. Sources depend on `captureMode` in `.maestro/config.json`.

## Process

### 0. Determine capture mode

Read `.maestro/config.json`. Take `captureMode` (default: `local` when absent or unset).

- **`local`** — pending captures are bullets in `.maestro/inbox.md` (default behavior).
- **`backend`** — pending captures are draft items already created in the backend with `status: inbox`; ALSO process any local bullets in `.maestro/inbox.md`.

---

### 1. Collect pending captures

**Local bullets (always):**
Read `.maestro/inbox.md` — extract bullets under `## Inbox`.
- If the file does not exist or has no bullets under `## Inbox`, skip to backend captures (or inform user and stop if `captureMode` is `local` and there are no backend captures either).

**Backend captures (only when `captureMode: backend`):**
Call `list_items({status: inbox})`. Each returned item is a pending capture that already exists in the backend — it was created by `capture_raw` and sits at `status: inbox` awaiting promotion. Collect these alongside any local bullets.

If both sources are empty, inform the user and stop.

---

### 2. Dedup — for each pending capture, call `search(<capture text or title>)`
   - If a candidate is a strong match (same problem, same scope), ask before proceeding
   - Offer `relate(existing-id, duplicate-of, match-id)` instead of creating a second item
   - Only flag as duplicate if an **active** item (status not in `done`, `wont-fix`, `deferred`, `duplicate`) already covers the same problem
   - In `backend` mode, exclude the capture's own item from its search results (a `status: inbox` item can otherwise match itself)
   - When overlap is ambiguous, present both candidates and let the user decide

### 3. Classify each capture — infer from description, confirm with user:
   - **Type:** bug | feature | refactor | chore
   - **Priority:** P1 (blocking/critical) | P2 (important) | P3 (nice-to-have)

### 4. Polish descriptions — before creating or promoting items, tighten the Summary and Problem Description:
   - Detect `writing-clearly-and-concisely` using the [detection procedure](../../docs/detecting-optional-skills.md), checking both plugin-prefixed and bare forms
   - If found, invoke it on the draft descriptions (batch all captures in a single invocation)
   - If not available, do a quick inline pass: remove filler words, prefer active voice, keep each description to 1-2 sentences
   - Do not change technical meaning — only improve clarity

### 5. Create or promote each capture

Handling differs by origin:

**Local bullet** (from `.maestro/inbox.md`):
- Call `create_item({title, type, priority, body, weight: light})`
- Then call `set_status(id, triaged)` on the returned id
- The adapter handles id minting, `created` timestamp, and file placement

**Backend capture** (from `list_items({status: inbox})`):
- The item already exists — do NOT call `create_item`
- If classification or body needs updating, call `update_item(id, {type, priority, body})` first
- Then call `set_status(id, triaged)` to promote it out of `inbox`

### 6. Display summary table:

   | ID | Type | Priority | Summary |
   |----|------|----------|---------|
   | 0042-timer-pause | bug | P1 | Timer doesn't pause... |

### 7. Clear processed bullets from `.maestro/inbox.md` after user confirms
   - Leave the `## Inbox` header intact
   - Backend captures do not require inbox.md cleanup (they live in the backend)

## Error Handling

- **Malformed bullets**: If a bullet lacks a clear description (e.g., just a URL or single word), ask the user to clarify before creating an item.
- **.maestro/inbox.md has non-bullet content under ## Inbox**: Ignore non-bullet lines (paragraphs, headers, blank lines) — only process lines starting with `- `.
- **Duplicate detection uncertain**: When overlap is ambiguous, present both items and let the user decide.
- **Item creation failure**: If `create_item` or `set_status` fails, report the error and continue with remaining captures. Do not clear any bullets from inbox until their items are confirmed created.
- **Backend capture promotion failure**: If `set_status` fails for a backend capture, report the error and continue with remaining captures. The item remains at `status: inbox` and will appear again on the next triage run.
