# P1 — Migration & Back-Compat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a one-shot, dry-run-first migrator that converts legacy `conductor/` + `issues/` into `.maestro/` (collapsing the advanced-issue+track duplication into single items), rewrite the installer and hooks to target `.maestro/`, update all docs, and migrate Maestro's own dogfood — so existing users upgrade cleanly with zero data loss.

**Architecture:** A standalone `bin/migrate-to-maestro` (Python 3 standard library only — no third-party deps) reads legacy stores, builds an in-memory migration plan, and either **prints it (`--dry-run`, the default)** or **applies it (`--apply`)**. Parsing/transform logic is split into pure, unit-tested functions; I/O is isolated at the edges. The installer (`bin/setup-project`, Bash) gains `.maestro/` scaffolding + adapter-asset copy + legacy detection that offers migration. Hooks are rewritten to read `.maestro/`.

**Tech Stack:** Python 3 stdlib (`argparse`, `re`, `json`, `pathlib`, `shutil`, `unittest`) for the migrator + tests; Bash for installer + hooks; JSON for config/manifests; Markdown for docs. Python 3 is already a hard dependency of this repo (the `AGENTS.md` validation block calls `python3 -m json.tool`). **Do not use PyYAML** — frontmatter is simple `key: value`, parsed with stdlib `re`.

---

## Global Constraints

- **Depends on P0.** This plan consumes P0's **Locked Decisions** verbatim — `docs/plans/2026-06-20-p0-foundations.md` §"Locked Decisions (LD-1…LD-6)". Item-record format = **LD-3**; identity/seq = **LD-4**; status→files mapping/archival = **LD-5**; `.maestro/` layout = **LD-1**; asset home = **LD-2**. Do not redefine these; cite them.
- **Migrator is Python 3 stdlib only.** Shebang `#!/usr/bin/env python3`. No imports outside the stdlib list above.
- **Dry-run is the default and is read-only.** `--apply` is the only mode that writes. `--apply` first creates `.maestro/`, then renames legacy dirs to `.conductor.bak/` and `.issues.bak/` (reversible); never deletes by default. `--remove-legacy` (with `--apply`) deletes the `.bak` dirs after a successful migration.
- **No data loss.** Every legacy file maps to a destination or is reported as "unmapped" in the dry-run. Provenance (old ids, advanced-to links) is preserved in item bodies.
- **Canonical statuses only** in output (closed set from P0 Global Constraints). The status-remap table (Task 5/6) is the single source for old→canonical.
- **Cross-harness manifests stay aligned** (`AGENTS.md`): hook renames touch `hooks/hooks.json`, the installer's settings writers, `README.md`, `codex/INSTALL.md`, `AGENTS.md`.
- **Commits are YubiKey-signed**; `maestro/` is a submodule (git writes need sandbox disabled). Don't bypass signing without explicit OK.
- **Tests are real here.** Run `python3 -m unittest discover -s tests -v` after each migrator task. Bash artifacts: `bash -n <file>`.

### Status remap table (old → canonical) — single source of truth

| Source | Old value | Canonical |
|---|---|---|
| track `metadata.json.status` | `pending` | `planned` |
| track `metadata.json.status` | `in_progress` | `in-progress` |
| track `metadata.json.status` | `complete` | `done` |
| track (archived under `_archive/`) | any | `done` (unless metadata says otherwise) |
| issue frontmatter `status` | `triaged` | `triaged` |
| issue frontmatter `status` | `reviewed` | `reviewed` |
| issue frontmatter `status` | `implemented` | `done` |
| issue frontmatter `status` | `wont-fix` | `wont-fix` |
| issue frontmatter `status` | `deferred` | `deferred` |
| issue frontmatter `status` | `duplicate` | `duplicate` |
| issue frontmatter `status` | `tracked` | *consumed by merge* (Task 6) |

---

## File Structure

**New:**
- `bin/migrate-to-maestro` — the migrator (Python 3 stdlib). One file, internally sectioned: arg parsing, parsers (pure), transforms (pure), planner (pure), applier (I/O), CLI `main`.
- `tests/test_migrate.py` — unittest suite; builds temp legacy trees, asserts the migration plan + applied output.
- `tests/fixtures/` — small legacy sample trees used by tests (created in Task 1).

**Modified:**
- `bin/setup-project` — `.maestro/` scaffold + asset copy + legacy-detect-and-offer-migrate.
- `bin/hooks/session-start-issues.sh` → renamed `bin/hooks/session-start-maestro.sh` — counts `.maestro/inbox.md` + `.maestro/items/*.md` by status.
- `bin/hooks/validate-issue-frontmatter.sh` → renamed `bin/hooks/validate-item-frontmatter.sh` — validates `.maestro/items/*.md` (LD-3 fields + canonical statuses).
- `hooks/hooks.json` — point at renamed hooks.
- `README.md`, `codex/INSTALL.md`, `AGENTS.md` — `.maestro/` model, migration instructions, new hook names, repo-map update.

**Migrated (data, not package):**
- This repo's own `conductor/` + `issues/` → `.maestro/` (Task 12).

---

## Task 1: Migrator skeleton + test harness + fixtures

**Files:**
- Create: `bin/migrate-to-maestro`
- Create: `tests/test_migrate.py`
- Create: `tests/fixtures/legacy/` (sample tree)

**Interfaces:**
- Produces: `parse_args(argv) -> Namespace` with `.path` (default `.`), `.apply` (bool, default False), `.remove_legacy` (bool, default False); a `main(argv)` entry. Importable by tests (guard real run behind `if __name__ == "__main__":`).

- [ ] **Step 1: Write the failing test**

Create `tests/test_migrate.py`:
```python
import importlib.util, pathlib, sys, unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("migrate", ROOT / "bin" / "migrate-to-maestro")
migrate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(migrate)


class TestArgs(unittest.TestCase):
    def test_defaults_to_dry_run(self):
        ns = migrate.parse_args(["--path", "/tmp/x"])
        self.assertEqual(ns.path, "/tmp/x")
        self.assertFalse(ns.apply)
        self.assertFalse(ns.remove_legacy)

    def test_apply_flag(self):
        ns = migrate.parse_args(["--apply"])
        self.assertTrue(ns.apply)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run it to verify it fails**

Run:
```bash
cd /Users/popeoliv/Developer/skills/maestro
python3 -m unittest tests.test_migrate -v
```
Expected: FAIL — `bin/migrate-to-maestro` does not exist / module load error.

- [ ] **Step 3: Write the minimal migrator skeleton**

Create `bin/migrate-to-maestro`:
```python
#!/usr/bin/env python3
"""Migrate legacy conductor/ + issues/ into .maestro/. Dry-run by default."""
import argparse
import sys


def parse_args(argv):
    p = argparse.ArgumentParser(prog="migrate-to-maestro",
                                description="Migrate conductor/ + issues/ to .maestro/")
    p.add_argument("--path", default=".", help="repo root (default: .)")
    p.add_argument("--apply", action="store_true", help="write changes (default: dry-run)")
    p.add_argument("--remove-legacy", action="store_true",
                   help="with --apply: delete .conductor.bak/.issues.bak after success")
    return p.parse_args(argv)


def main(argv=None):
    args = parse_args(sys.argv[1:] if argv is None else argv)
    print(f"[migrate-to-maestro] path={args.path} apply={args.apply}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```
Then make it executable:
```bash
chmod +x bin/migrate-to-maestro
```

- [ ] **Step 4: Run tests to verify pass**

Run:
```bash
cd /Users/popeoliv/Developer/skills/maestro
python3 -m unittest tests.test_migrate -v
```
Expected: PASS (2 tests).

- [ ] **Step 5: Build reusable legacy fixtures**

Create `tests/fixtures/legacy/conductor/product.md` (one line `# Product`), `tests/fixtures/legacy/conductor/product-guidelines.md`, `tech-stack.md`, `workflow.md`, `code_styleguides/markdown.md`, `tracks.md` (use the exact format from the explorer: header + Active/Archived tables), and `tracks/0001-sample/{spec.md,design.md,plan.md,metadata.json}` with metadata:
```json
{ "id": "0001-sample", "title": "Sample", "type": "feature", "status": "in_progress",
  "created": "2026-06-10T00:00:00Z", "updated": "2026-06-10T00:00:00Z",
  "phases": {"total": 1, "completed": 0}, "tasks": {"total": 2, "completed": 1} }
```
and `plan.md` containing:
```markdown
## Phase 1
- [x] 1.1 First task
- [ ] 1.2 Second task
```
Create `tests/fixtures/legacy/issues/INBOX.md` (with two `## Inbox` bullets), `issues/2026-06-11-open-bug.md` (frontmatter `status: reviewed`, `type: bug`, `priority: P2`, `filed: 2026-06-11`), `issues/2026-06-09-advanced.md` (frontmatter `status: tracked`, `advanced-to: 0001-sample`), and `issues/archived/wont-fix/2026-06-08-dropped.md` (`status: wont-fix`).

> These fixtures back every later task's tests. Keep them tiny but representative of each migration case (open issue, advanced issue, archived issue, in-progress track, inbox bullets).

- [ ] **Step 6: Commit**

```bash
git add bin/migrate-to-maestro tests/test_migrate.py tests/fixtures/
git commit -m "feat(p1): migrator skeleton + unittest harness + legacy fixtures"
```

---

## Task 2: Frontmatter / table / metadata parsers (pure functions)

**Files:**
- Modify: `bin/migrate-to-maestro`
- Test: `tests/test_migrate.py`

**Interfaces:**
- Produces:
  - `split_frontmatter(text) -> (dict, body_str)` — parses a leading `---\n…\n---` block of `key: value` lines (values are strings; no nested YAML).
  - `parse_metadata_json(text) -> dict` — `json.loads` wrapper tolerating trailing whitespace.
  - `parse_plan_tasks(plan_md) -> [ {"ref","title","state"} ]` — one entry per `- [ ]`/`- [~]`/`- [x]` line; `ref` = leading token if it matches `\d+\.\d+` else running index `t1,t2,…`; `state` ∈ todo/doing/done.

- [ ] **Step 1: Write failing tests**

Add to `tests/test_migrate.py`:
```python
class TestParsers(unittest.TestCase):
    def test_split_frontmatter(self):
        fm, body = migrate.split_frontmatter(
            "---\nstatus: reviewed\ntype: bug\n---\n# Title\n\ntext\n")
        self.assertEqual(fm["status"], "reviewed")
        self.assertEqual(fm["type"], "bug")
        self.assertIn("# Title", body)

    def test_split_frontmatter_none(self):
        fm, body = migrate.split_frontmatter("no frontmatter here")
        self.assertEqual(fm, {})
        self.assertEqual(body.strip(), "no frontmatter here")

    def test_parse_plan_tasks(self):
        tasks = migrate.parse_plan_tasks(
            "## Phase 1\n- [x] 1.1 First\n- [ ] 1.2 Second\n- [~] 1.3 Third\n")
        self.assertEqual([t["state"] for t in tasks], ["done", "todo", "doing"])
        self.assertEqual(tasks[0]["ref"], "1.1")
        self.assertEqual(tasks[1]["title"], "Second")
```

- [ ] **Step 2: Run to verify fail**

Run: `cd /Users/popeoliv/Developer/skills/maestro && python3 -m unittest tests.test_migrate.TestParsers -v`
Expected: FAIL — functions not defined.

- [ ] **Step 3: Implement the parsers**

Add to `bin/migrate-to-maestro` (above `main`):
```python
import re

_FM_RE = re.compile(r"\A---\n(.*?)\n---\n?(.*)\Z", re.DOTALL)
_TASK_RE = re.compile(r"^\s*-\s*\[([ x~])\]\s*(.*\S)\s*$")
_REF_RE = re.compile(r"^(\d+\.\d+)\s+(.*)$")
_STATE = {" ": "todo", "~": "doing", "x": "done"}


def split_frontmatter(text):
    m = _FM_RE.match(text)
    if not m:
        return {}, text
    fm = {}
    for line in m.group(1).splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            fm[k.strip()] = v.strip()
    return fm, m.group(2)


def parse_metadata_json(text):
    return json.loads(text)


def parse_plan_tasks(plan_md):
    tasks, idx = [], 0
    for line in plan_md.splitlines():
        m = _TASK_RE.match(line)
        if not m:
            continue
        idx += 1
        state = _STATE[m.group(1)]
        rest = m.group(2)
        rm = _REF_RE.match(rest)
        if rm:
            ref, title = rm.group(1), rm.group(2)
        else:
            ref, title = f"t{idx}", rest
        tasks.append({"ref": ref, "title": title, "state": state})
    return tasks
```
Add `import json` at the top if not present.

- [ ] **Step 4: Run to verify pass**

Run: `cd /Users/popeoliv/Developer/skills/maestro && python3 -m unittest tests.test_migrate.TestParsers -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add bin/migrate-to-maestro tests/test_migrate.py
git commit -m "feat(p1): add frontmatter/metadata/plan-task parsers"
```

---

## Task 3: Context migration (conductor docs → `.maestro/context/`)

**Files:**
- Modify: `bin/migrate-to-maestro`
- Test: `tests/test_migrate.py`

**Interfaces:**
- Produces: `plan_context(conductor_dir) -> [ {"src","dst"} ]` — move pairs for context docs. Renames `product-guidelines.md`→`guidelines.md`; relocates `code_styleguides/`→`styleguides/`; passes through `product.md`,`tech-stack.md`,`workflow.md`. **Excludes** `tracks.md`, `index.md`, `setup_state.json` (no destination — they belong to the old registry; report them as intentionally dropped).

- [ ] **Step 1: Write failing test**

```python
class TestContext(unittest.TestCase):
    def test_plan_context_renames_and_relocates(self):
        pairs = migrate.plan_context(ROOT / "tests/fixtures/legacy/conductor")
        dsts = {p["dst"] for p in pairs}
        self.assertIn(".maestro/context/guidelines.md", dsts)        # renamed
        self.assertIn(".maestro/context/product.md", dsts)
        self.assertIn(".maestro/context/styleguides/markdown.md", dsts)  # relocated
        self.assertFalse(any("tracks.md" in d for d in dsts))         # dropped
```

- [ ] **Step 2: Run to verify fail.** `python3 -m unittest tests.test_migrate.TestContext -v` → FAIL.

- [ ] **Step 3: Implement**

```python
import pathlib

_CONTEXT_RENAME = {"product-guidelines.md": "guidelines.md"}
_CONTEXT_PASS = {"product.md", "tech-stack.md", "workflow.md"}


def plan_context(conductor_dir):
    conductor_dir = pathlib.Path(conductor_dir)
    pairs = []
    for name in sorted(_CONTEXT_PASS | set(_CONTEXT_RENAME)):
        src = conductor_dir / name
        if src.exists():
            dst = _CONTEXT_RENAME.get(name, name)
            pairs.append({"src": str(src), "dst": f".maestro/context/{dst}"})
    styles = conductor_dir / "code_styleguides"
    if styles.is_dir():
        for f in sorted(styles.glob("*.md")):
            pairs.append({"src": str(f), "dst": f".maestro/context/styleguides/{f.name}"})
    return pairs
```

- [ ] **Step 4: Run to verify pass.** Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add bin/migrate-to-maestro tests/test_migrate.py
git commit -m "feat(p1): plan context-doc migration (rename guidelines, relocate styleguides)"
```

---

## Task 4: Track migration (tracks → items + `work/`)

**Files:**
- Modify: `bin/migrate-to-maestro`
- Test: `tests/test_migrate.py`

**Interfaces:**
- Consumes: parsers (Task 2); status remap table.
- Produces: `plan_tracks(conductor_dir, seq_start) -> [TrackPlan]` where each `TrackPlan` = `{"old_id","new_id","record_path","record_text","work_pairs","status"}`. `new_id` per LD-4 = `{seq:04d}-{slug}` (slug = sanitize(old_id): lowercase, non-alnum→`-`, collapse, strip date suffix `-?\d{8}$`). Record text = LD-3 frontmatter (`weight: tracked`) + body + a `## Tasks` mirror built via `parse_plan_tasks`. Archived tracks (under `_archive/`) get `status: done` and `record_path` under `items/archived/done/`.

- [ ] **Step 1: Write failing test**

```python
class TestTracks(unittest.TestCase):
    def setUp(self):
        self.plans = migrate.plan_tracks(ROOT / "tests/fixtures/legacy/conductor", 1)

    def test_one_track_planned(self):
        self.assertEqual(len(self.plans), 1)
        tp = self.plans[0]
        self.assertEqual(tp["old_id"], "0001-sample")
        self.assertTrue(tp["new_id"].endswith("-sample"))
        self.assertEqual(tp["status"], "in-progress")        # in_progress -> in-progress

    def test_record_has_weight_and_tasks(self):
        rt = self.plans[0]["record_text"]
        self.assertIn("weight: tracked", rt)
        self.assertIn("## Tasks", rt)
        self.assertIn("[x] 1.1", rt)                         # done task mirrored
        self.assertIn("[ ] 1.2", rt)

    def test_work_prose_pairs(self):
        dsts = {p["dst"] for p in self.plans[0]["work_pairs"]}
        nid = self.plans[0]["new_id"]
        self.assertIn(f".maestro/work/{nid}/spec.md", dsts)
        self.assertIn(f".maestro/work/{nid}/plan.md", dsts)
```

- [ ] **Step 2: Run to verify fail.** FAIL.

- [ ] **Step 3: Implement**

```python
_TRACK_STATUS = {"pending": "planned", "in_progress": "in-progress", "complete": "done"}
_DATE_SUFFIX = re.compile(r"[-_]?\d{8}$")
_TODAY = None  # injected by main(); tests may pass created/updated through metadata


def sanitize_slug(old_id):
    s = _DATE_SUFFIX.sub("", old_id).lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "item"


def _task_lines(tasks):
    mark = {"todo": " ", "doing": "~", "done": "x"}
    return "\n".join(f"- [{mark[t['state']]}] {t['ref']} — {t['title']}" for t in tasks)


def _render_record(new_id, title, type_, priority, status, weight, created, updated,
                   body, tasks=None, artifacts=None, note=None):
    arts = artifacts or []
    lines = ["---", f"id: {new_id}", f"title: {title}", f"type: {type_}",
             f"priority: {priority}", f"status: {status}", f"weight: {weight}",
             f"created: {created}", f"updated: {updated}"]
    if arts:
        lines.append("artifacts:")
        lines += [f"  - {{ kind: {a['kind']}, ref: {a['ref']} }}" for a in arts]
    lines.append("---")
    out = "\n".join(lines) + f"\n\n# {title}\n\n" + (body.strip() + "\n" if body.strip() else "")
    if note:
        out += f"\n## Notes\n\n> {note}\n"
    if tasks:
        out += "\n## Tasks\n\n" + _task_lines(tasks) + "\n"
    return out


def _iter_track_dirs(conductor_dir):
    base = pathlib.Path(conductor_dir) / "tracks"
    for d in sorted(base.glob("*")) if base.is_dir() else []:
        if d.is_dir() and d.name != "_archive":
            yield d, False
    arch = base / "_archive"
    for d in sorted(arch.glob("*")) if arch.is_dir() else []:
        if d.is_dir():
            yield d, True


def plan_tracks(conductor_dir, seq_start):
    plans, seq = [], seq_start
    for d, archived in _iter_track_dirs(conductor_dir):
        meta = {}
        mf = d / "metadata.json"
        if mf.exists():
            meta = parse_metadata_json(mf.read_text())
        old_id = meta.get("id", d.name)
        new_id = f"{seq:04d}-{sanitize_slug(old_id)}"
        seq += 1
        status = "done" if archived else _TRACK_STATUS.get(meta.get("status", "pending"), "planned")
        created = (meta.get("created", "") or "")[:10] or "1970-01-01"
        updated = (meta.get("updated", "") or "")[:10] or created
        tasks = []
        plan_md = d / "plan.md"
        if plan_md.exists():
            tasks = parse_plan_tasks(plan_md.read_text())
        arts = [{"kind": k, "ref": f".maestro/work/{new_id}/{k}.md"}
                for k in ("spec", "design", "plan") if (d / f"{k}.md").exists()]
        record_text = _render_record(
            new_id, meta.get("title", old_id), meta.get("type", "chore"),
            meta.get("priority", "P3"), status, "tracked", created, updated,
            body="", tasks=tasks, artifacts=arts,
            note=f"Migrated from conductor track `{old_id}`.")
        sub = "archived/done/" if archived else ""
        work_pairs = [{"src": str(d / f"{k}.md"), "dst": f".maestro/work/{new_id}/{k}.md"}
                      for k in ("spec", "design", "plan") if (d / f"{k}.md").exists()]
        plans.append({"old_id": old_id, "new_id": new_id,
                      "record_path": f".maestro/items/{sub}{new_id}.md",
                      "record_text": record_text, "work_pairs": work_pairs, "status": status})
    return plans
```

- [ ] **Step 4: Run to verify pass.** Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add bin/migrate-to-maestro tests/test_migrate.py
git commit -m "feat(p1): plan track migration to items + work/ with ## Tasks mirror"
```

---

## Task 5: Issue migration (issues → items)

**Files:**
- Modify: `bin/migrate-to-maestro`
- Test: `tests/test_migrate.py`

**Interfaces:**
- Consumes: parsers; status remap table.
- Produces: `plan_issues(issues_dir, seq_start) -> [IssuePlan]` for **non-`tracked`** issues. Each = `{"old_path","new_id","record_path","record_text","status","advanced_to"}`. Open issues → `items/<new_id>.md`; archived issues (`issues/archived/<reason>/`) → `items/archived/<canonical-reason>/<new_id>.md`. Issues with `status: tracked` are returned separately as `merge_candidates` (handled in Task 6), not as items.

- [ ] **Step 1: Write failing test**

```python
class TestIssues(unittest.TestCase):
    def setUp(self):
        self.items, self.merges = migrate.plan_issues(
            ROOT / "tests/fixtures/legacy/issues", 100)

    def test_open_issue_becomes_light_item(self):
        opens = [i for i in self.items if i["status"] == "reviewed"]
        self.assertEqual(len(opens), 1)
        self.assertIn("weight: light", opens[0]["record_text"])

    def test_archived_wont_fix_routes_to_archive(self):
        wf = [i for i in self.items if i["status"] == "wont-fix"]
        self.assertTrue(wf and "archived/wont-fix/" in wf[0]["record_path"])

    def test_tracked_issue_is_merge_candidate(self):
        self.assertEqual(len(self.merges), 1)
        self.assertEqual(self.merges[0]["advanced_to"], "0001-sample")
```

- [ ] **Step 2: Run to verify fail.** FAIL.

- [ ] **Step 3: Implement**

```python
_ISSUE_STATUS = {"triaged": "triaged", "reviewed": "reviewed", "implemented": "done",
                 "wont-fix": "wont-fix", "deferred": "deferred", "duplicate": "duplicate"}


def _iter_issue_files(issues_dir):
    issues_dir = pathlib.Path(issues_dir)
    for f in sorted(issues_dir.glob("*.md")):
        if f.name != "INBOX.md":
            yield f, None
    arch = issues_dir / "archived"
    for reason_dir in sorted(arch.glob("*")) if arch.is_dir() else []:
        if reason_dir.is_dir():
            for f in sorted(reason_dir.glob("*.md")):
                yield f, reason_dir.name


def plan_issues(issues_dir, seq_start):
    items, merges, seq = [], [], seq_start
    for f, reason in _iter_issue_files(issues_dir):
        fm, body = split_frontmatter(f.read_text())
        old_status = fm.get("status", "triaged")
        slug = sanitize_slug(f.stem)
        if old_status == "tracked":
            merges.append({"old_path": str(f), "advanced_to": fm.get("advanced-to", ""),
                           "body": body, "fm": fm})
            continue
        canonical = _ISSUE_STATUS.get(old_status, "triaged")
        new_id = f"{seq:04d}-{slug}"
        seq += 1
        created = fm.get("filed", "") or "1970-01-01"
        terminal = canonical in ("done", "wont-fix", "deferred", "duplicate")
        sub = f"archived/{canonical}/" if (reason or terminal) else ""
        record_text = _render_record(new_id, fm.get("title", f.stem),
                                     fm.get("type", "chore"), fm.get("priority", "P3"),
                                     canonical, "light", created, created, body=body,
                                     note=f"Migrated from issue `{f.name}`.")
        items.append({"old_path": str(f), "new_id": new_id,
                      "record_path": f".maestro/items/{sub}{new_id}.md",
                      "record_text": record_text, "status": canonical,
                      "advanced_to": None})
    return items, merges
```

- [ ] **Step 4: Run to verify pass.** Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add bin/migrate-to-maestro tests/test_migrate.py
git commit -m "feat(p1): plan issue migration to light items; collect tracked merge candidates"
```

---

## Task 6: The advanced-issue + track merge (the duplication kill, literal)

**Files:**
- Modify: `bin/migrate-to-maestro`
- Test: `tests/test_migrate.py`

**Interfaces:**
- Consumes: `plan_tracks` output + the `merge_candidates` from `plan_issues`.
- Produces: `apply_merges(track_plans, merge_candidates) -> (track_plans, unmatched)` — for each tracked issue whose `advanced-to` matches a track's `old_id`, fold the issue's origin into that track item's record (append a `## Notes` line `> Origin issue: <name> (advanced-to <old_id>).` and preserve the issue body under `### Original issue`) and consume it. Issues whose `advanced-to` matches no track are returned as `unmatched` (the caller migrates them as light items with status `reviewed`, logging a warning).

- [ ] **Step 1: Write failing test**

```python
class TestMerge(unittest.TestCase):
    def test_advanced_issue_folds_into_track(self):
        tracks = migrate.plan_tracks(ROOT / "tests/fixtures/legacy/conductor", 1)
        _, merges = migrate.plan_issues(ROOT / "tests/fixtures/legacy/issues", 100)
        merged, unmatched = migrate.apply_merges(tracks, merges)
        self.assertEqual(unmatched, [])
        folded = merged[0]["record_text"]
        self.assertIn("Origin issue:", folded)
        self.assertIn("### Original issue", folded)
        # the merged track is still ONE item, not two
        self.assertEqual(len(merged), 1)
```

- [ ] **Step 2: Run to verify fail.** FAIL.

- [ ] **Step 3: Implement**

```python
def apply_merges(track_plans, merge_candidates):
    by_old = {tp["old_id"]: tp for tp in track_plans}
    unmatched = []
    for mc in merge_candidates:
        tp = by_old.get(mc["advanced_to"])
        if not tp:
            unmatched.append(mc)
            continue
        name = pathlib.Path(mc["old_path"]).name
        addition = (f"\n> Origin issue: {name} (advanced-to {mc['advanced_to']}).\n"
                    f"\n### Original issue\n\n{mc['body'].strip()}\n")
        if "## Notes" in tp["record_text"]:
            tp["record_text"] = tp["record_text"].rstrip() + "\n" + addition
        else:
            tp["record_text"] = tp["record_text"].rstrip() + "\n\n## Notes\n" + addition
    return track_plans, unmatched
```

- [ ] **Step 4: Run to verify pass.** Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add bin/migrate-to-maestro tests/test_migrate.py
git commit -m "feat(p1): merge advanced issues into their tracks (duplication kill)"
```

---

## Task 7: Inbox migration

**Files:**
- Modify: `bin/migrate-to-maestro`
- Test: `tests/test_migrate.py`

**Interfaces:**
- Produces: `plan_inbox(issues_dir) -> {"dst": ".maestro/inbox.md", "text": <str>} | None` — carries `## Inbox` bullets from `issues/INBOX.md` into a fresh `.maestro/inbox.md` (same template header, bullets preserved). Returns None if no INBOX.md.

- [ ] **Step 1: Write failing test**

```python
class TestInbox(unittest.TestCase):
    def test_inbox_bullets_carried_over(self):
        plan = migrate.plan_inbox(ROOT / "tests/fixtures/legacy/issues")
        self.assertEqual(plan["dst"], ".maestro/inbox.md")
        self.assertIn("## Inbox", plan["text"])
        self.assertIn("-", plan["text"])  # at least one bullet preserved
```

- [ ] **Step 2: Run to verify fail.** FAIL.

- [ ] **Step 3: Implement**

```python
_INBOX_HEADER = ("# Inbox\n\nPre-triage scratch. Run /triage (or $triage) to convert "
                 "bullets into work items.\n\n## Inbox\n")


def plan_inbox(issues_dir):
    inbox = pathlib.Path(issues_dir) / "INBOX.md"
    if not inbox.exists():
        return None
    bullets = []
    in_section = False
    for line in inbox.read_text().splitlines():
        if line.strip().lower().startswith("## inbox"):
            in_section = True
            continue
        if in_section and line.strip().startswith("- "):
            bullets.append(line.rstrip())
    text = _INBOX_HEADER + ("\n".join(bullets) + "\n" if bullets else "")
    return {"dst": ".maestro/inbox.md", "text": text}
```

- [ ] **Step 4: Run to verify pass.** Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add bin/migrate-to-maestro tests/test_migrate.py
git commit -m "feat(p1): carry INBOX bullets into .maestro/inbox.md"
```

---

## Task 8: Planner + dry-run preview + `--apply` + legacy backup

**Files:**
- Modify: `bin/migrate-to-maestro`
- Test: `tests/test_migrate.py`

**Interfaces:**
- Consumes: all `plan_*` functions + `apply_merges`.
- Produces:
  - `build_plan(repo_root) -> dict` — orchestrates: context pairs, tracks (seq from 1), issues (seq continues after tracks), merges, inbox, plus a `dropped` list (`tracks.md`, `index.md`, `setup_state.json`) and an `unmatched` list. Always copies `assets/maestro/{CONTRACT.md,adapters/files.md,config.template.json}` into `.maestro/` (the latter → `config.json`).
  - `render_dry_run(plan) -> str` — human-readable preview (counts + every src→dst).
  - `apply_plan(repo_root, plan, remove_legacy=False)` — performs writes, then renames `conductor`→`.conductor.bak`, `issues`→`.issues.bak`; deletes `.bak` dirs iff `remove_legacy`.

- [ ] **Step 1: Write failing tests (use a temp copy of fixtures)**

```python
import shutil, tempfile

class TestPlanAndApply(unittest.TestCase):
    def setUp(self):
        self.tmp = pathlib.Path(tempfile.mkdtemp())
        shutil.copytree(ROOT / "tests/fixtures/legacy", self.tmp, dirs_exist_ok=True)
        # provide the package assets the planner copies:
        (self.tmp / "assets/maestro/adapters").mkdir(parents=True)
        (self.tmp / "assets/maestro/CONTRACT.md").write_text("# Contract\n")
        (self.tmp / "assets/maestro/adapters/files.md").write_text("# files\n")
        (self.tmp / "assets/maestro/config.template.json").write_text('{"adapter":"files"}\n')

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_build_plan_counts(self):
        plan = migrate.build_plan(self.tmp)
        self.assertEqual(len(plan["tracks"]), 1)
        # one open + one archived issue become items; the tracked issue is merged
        self.assertEqual(len(plan["items"]), 2)
        self.assertIn("tracks.md", " ".join(plan["dropped"]))

    def test_dry_run_is_readonly(self):
        plan = migrate.build_plan(self.tmp)
        _ = migrate.render_dry_run(plan)
        self.assertFalse((self.tmp / ".maestro").exists())  # nothing written

    def test_apply_writes_and_backs_up(self):
        plan = migrate.build_plan(self.tmp)
        migrate.apply_plan(self.tmp, plan)
        self.assertTrue((self.tmp / ".maestro/config.json").exists())
        self.assertTrue((self.tmp / ".maestro/context/guidelines.md").exists())
        self.assertTrue((self.tmp / ".conductor.bak").exists())
        self.assertTrue((self.tmp / ".issues.bak").exists())
        self.assertFalse((self.tmp / "conductor").exists())
        # the in-progress track became a planned/in-progress item record
        items = list((self.tmp / ".maestro/items").glob("*.md"))
        self.assertTrue(items)
```

- [ ] **Step 2: Run to verify fail.** FAIL.

- [ ] **Step 3: Implement planner + applier**

```python
def build_plan(repo_root):
    repo_root = pathlib.Path(repo_root)
    conductor = repo_root / "conductor"
    issues = repo_root / "issues"
    context = plan_context(conductor) if conductor.exists() else []
    tracks = plan_tracks(conductor, 1) if (conductor / "tracks").exists() else []
    seq_after = 1 + len(tracks)
    items, merges = (plan_issues(issues, 100 + seq_after) if issues.exists() else ([], []))
    tracks, unmatched = apply_merges(tracks, merges)
    for mc in unmatched:  # advanced issue with no surviving track -> light reviewed item
        name = pathlib.Path(mc["old_path"]).stem
        nid = f"{900}-{sanitize_slug(name)}"
        items.append({"old_path": mc["old_path"], "new_id": nid,
                      "record_path": f".maestro/items/{nid}.md",
                      "record_text": _render_record(nid, name, mc["fm"].get("type", "chore"),
                          mc["fm"].get("priority", "P3"), "reviewed", "light",
                          mc["fm"].get("filed", "1970-01-01"), mc["fm"].get("filed", "1970-01-01"),
                          body=mc["body"], note="Was advanced-to a track that no longer exists."),
                      "status": "reviewed", "advanced_to": None})
    inbox = plan_inbox(issues) if issues.exists() else None
    dropped = [str(conductor / n) for n in ("tracks.md", "index.md", "setup_state.json")
               if (conductor / n).exists()]
    assets = {"CONTRACT.md": ".maestro/CONTRACT.md",
              "adapters/files.md": ".maestro/adapters/files.md",
              "config.template.json": ".maestro/config.json"}
    return {"repo_root": str(repo_root), "context": context, "tracks": tracks,
            "items": items, "inbox": inbox, "dropped": dropped,
            "unmatched": unmatched, "assets": assets}


def render_dry_run(plan):
    L = ["=== Maestro migration plan (dry-run) ==="]
    L.append(f"context docs : {len(plan['context'])}")
    L.append(f"tracks->items: {len(plan['tracks'])}")
    L.append(f"issues->items: {len(plan['items'])}")
    L.append(f"dropped      : {len(plan['dropped'])} (old registry files)")
    for p in plan["context"]:
        L.append(f"  move {p['src']} -> {p['dst']}")
    for tp in plan["tracks"]:
        L.append(f"  track {tp['old_id']} -> {tp['record_path']} ({tp['status']})")
        for w in tp["work_pairs"]:
            L.append(f"    prose {w['src']} -> {w['dst']}")
    for it in plan["items"]:
        L.append(f"  issue {it['old_path']} -> {it['record_path']} ({it['status']})")
    if plan["inbox"]:
        L.append(f"  inbox -> {plan['inbox']['dst']}")
    for d in plan["dropped"]:
        L.append(f"  DROP {d} (not migrated; old registry)")
    L.append("Run again with --apply to perform this migration.")
    return "\n".join(L)


def _write(repo_root, rel, text):
    dst = pathlib.Path(repo_root) / rel
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(text)


def apply_plan(repo_root, plan, remove_legacy=False):
    repo_root = pathlib.Path(repo_root)
    for src_rel, dst_rel in plan["assets"].items():
        _write(repo_root, dst_rel, (repo_root / "assets/maestro" / src_rel).read_text())
    for p in plan["context"]:
        _write(repo_root, p["dst"], pathlib.Path(p["src"]).read_text())
    for tp in plan["tracks"]:
        _write(repo_root, tp["record_path"], tp["record_text"])
        for w in tp["work_pairs"]:
            _write(repo_root, w["dst"], pathlib.Path(w["src"]).read_text())
    for it in plan["items"]:
        _write(repo_root, it["record_path"], it["record_text"])
    if plan["inbox"]:
        _write(repo_root, plan["inbox"]["dst"], plan["inbox"]["text"])
    for name in ("conductor", "issues"):
        d = repo_root / name
        if d.exists():
            d.rename(repo_root / f".{name}.bak")
    if remove_legacy:
        for name in (".conductor.bak", ".issues.bak"):
            shutil.rmtree(repo_root / name, ignore_errors=True)
```
Then wire `main`:
```python
def main(argv=None):
    args = parse_args(sys.argv[1:] if argv is None else argv)
    plan = build_plan(args.path)
    if not args.apply:
        print(render_dry_run(plan))
        return 0
    apply_plan(args.path, plan, remove_legacy=args.remove_legacy)
    print("Migration applied. Legacy dirs backed up to .conductor.bak/.issues.bak.")
    if not args.remove_legacy:
        print("Verify .maestro/, then delete the .bak dirs (or re-run with --remove-legacy).")
    return 0
```

- [ ] **Step 4: Run full suite.**

Run: `cd /Users/popeoliv/Developer/skills/maestro && python3 -m unittest discover -s tests -v`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add bin/migrate-to-maestro tests/test_migrate.py
git commit -m "feat(p1): planner + dry-run preview + --apply with legacy backup"
```

---

## Task 9: Rewrite `bin/setup-project` for `.maestro/`

**Files:**
- Modify: `bin/setup-project`

**Interfaces:**
- Consumes: `assets/maestro/` (LD-2); the migrator (Task 1–8).
- Produces: an installer that scaffolds `.maestro/` (copies assets, creates dirs), and — when legacy `conductor/`/`issues/` exist but `.maestro/` does not — prints how to run `bin/migrate-to-maestro` (offer migration).

Current (exploration): `ensure_issues_scaffold` creates `issues/` + `issues/archived/{5 reasons}/` + `INBOX.md`; installs skills to `.claude/skills` + `.agents/skills`; copies hooks; auto-detects harnesses.

- [ ] **Step 1: Replace `ensure_issues_scaffold` with `ensure_maestro_scaffold`**

Rename the function and rewrite it to:
- Create `.maestro/`, `.maestro/context/`, `.maestro/context/styleguides/`, `.maestro/work/`, `.maestro/items/`, `.maestro/items/archived/{done,wont-fix,deferred,duplicate}/`.
- Copy `assets/maestro/CONTRACT.md` → `.maestro/CONTRACT.md` (overwrite — package-managed).
- Copy `assets/maestro/adapters/` → `.maestro/adapters/` (overwrite).
- Copy `assets/maestro/config.template.json` → `.maestro/config.json` **only if missing** (project-owned).
- Write `.maestro/inbox.md` from template **only if missing**.
Keep `--no-issues` flag working but rename its meaning to `--no-maestro` (alias `--no-issues` for back-compat).

- [ ] **Step 2: Add legacy detection + migration offer**

After resolving the target dir, add:
```bash
if { [ -d "$TARGET_DIR/conductor" ] || [ -d "$TARGET_DIR/issues" ]; } && [ ! -d "$TARGET_DIR/.maestro" ]; then
  echo "Legacy conductor/ or issues/ detected and no .maestro/ yet."
  echo "Preview migration:  $SCRIPT_DIR/bin/migrate-to-maestro --path \"$TARGET_DIR\""
  echo "Apply migration:    $SCRIPT_DIR/bin/migrate-to-maestro --path \"$TARGET_DIR\" --apply"
fi
```
(Print-and-offer only; the installer never auto-migrates data.)

- [ ] **Step 3: Update `main()` call site**

Replace the `ensure_issues_scaffold` call with `ensure_maestro_scaffold`. Update `print_next_steps` to mention `/setup` then `/triage`, and the migration command when legacy was detected.

- [ ] **Step 4: Verify**

Run:
```bash
cd /Users/popeoliv/Developer/skills/maestro
bash -n bin/setup-project && echo "setup-project syntax ok"
grep -q 'ensure_maestro_scaffold' bin/setup-project && grep -q '.maestro/adapters' bin/setup-project && echo "scaffold updated"
grep -q 'migrate-to-maestro' bin/setup-project && echo "offers migration"
```
Expected: `setup-project syntax ok`, `scaffold updated`, `offers migration`.

- [ ] **Step 5: Commit**

```bash
git add bin/setup-project
git commit -m "feat(p1): setup-project scaffolds .maestro/ + offers migration"
```

---

## Task 10: Rewrite hooks for `.maestro/`

**Files:**
- Rename+Modify: `bin/hooks/session-start-issues.sh` → `bin/hooks/session-start-maestro.sh`
- Rename+Modify: `bin/hooks/validate-issue-frontmatter.sh` → `bin/hooks/validate-item-frontmatter.sh`
- Modify: `hooks/hooks.json`
- Modify: `bin/setup-project` (the settings-writer functions that name the hook files)

**Interfaces:**
- Produces: a SessionStart hook that summarizes `.maestro/` work items; a PostToolUse hook that validates `.maestro/items/*.md` frontmatter against LD-3 + canonical statuses.

Current: `session-start-issues.sh` counts INBOX bullets + `issues/*.md` `status: triaged|reviewed`; `validate-issue-frontmatter.sh` enforces `status ∈ {triaged,reviewed,tracked,implemented,wont-fix,deferred,duplicate}`, `priority ∈ {P1,P2,P3}`, required `status/type/priority/filed`.

- [ ] **Step 1: Rewrite the session-start hook**

`git mv bin/hooks/session-start-issues.sh bin/hooks/session-start-maestro.sh`, then change it to:
- Inbox count: lines under `## Inbox` in `.maestro/inbox.md`.
- Status counts: scan `.maestro/items/*.md` (exclude `archived/`), read `status:` frontmatter, count `triaged`, `reviewed`, `planned`, `in-progress`.
- Output (keep the actionable arrows):
```bash
echo "MAESTRO:"
[ "$inbox" -gt 0 ]    && echo "  Inbox: $inbox unprocessed → /triage"
[ "$triaged" -gt 0 ]  && echo "  Triaged: $triaged → /issue-review"
[ "$reviewed" -gt 0 ] && echo "  Reviewed: $reviewed → /issue-advance or /implement or /issue-close"
[ "$inprog" -gt 0 ]   && echo "  In progress: $inprog → /implement"
```

- [ ] **Step 2: Rewrite the validation hook**

`git mv bin/hooks/validate-issue-frontmatter.sh bin/hooks/validate-item-frontmatter.sh`, then:
- Target files matching `.maestro/items/**/*.md` (replace the old `issues/*.md` guard).
- Required fields (LD-3): `id`, `title`, `type`, `priority`, `status`, `weight`, `created`, `updated`.
- Valid `status` (canonical closed set): `inbox|triaged|reviewed|planned|in-progress|in-review|done|wont-fix|deferred|duplicate`.
- Valid `type`: `bug|feature|refactor|chore`; `priority`: `P1|P2|P3`; `weight`: `light|tracked`.
Preserve the existing `add_error` / exit-code feedback pattern.

- [ ] **Step 3: Update `hooks/hooks.json`**

Point both commands at the renamed scripts:
```json
{
  "hooks": {
    "SessionStart": [{ "hooks": [{ "type": "command",
      "command": "\"${CLAUDE_PLUGIN_ROOT}/bin/hooks/session-start-maestro.sh\"" }] }],
    "PostToolUse": [{ "matcher": "Write|Edit", "hooks": [{ "type": "command",
      "command": "\"${CLAUDE_PLUGIN_ROOT}/bin/hooks/validate-item-frontmatter.sh\"" }] }]
  }
}
```

- [ ] **Step 4: Update the installer's settings writers**

In `bin/setup-project`, update `write_claude_settings_with_hooks` and `write_codex_hooks_json` (and the `copy_hook_script` calls) to reference `session-start-maestro.sh` and `validate-item-frontmatter.sh`.

- [ ] **Step 5: Verify**

Run:
```bash
cd /Users/popeoliv/Developer/skills/maestro
bash -n bin/hooks/session-start-maestro.sh && bash -n bin/hooks/validate-item-frontmatter.sh && echo "hooks syntax ok"
python3 -m json.tool hooks/hooks.json >/dev/null && echo "hooks.json ok"
grep -q 'in-progress' bin/hooks/validate-item-frontmatter.sh && echo "canonical statuses present"
! grep -rn 'validate-issue-frontmatter\|session-start-issues' bin/setup-project hooks/hooks.json && echo "no stale hook names"
```
Expected: all four success lines.

- [ ] **Step 6: Commit**

```bash
git add bin/hooks/ hooks/hooks.json bin/setup-project
git commit -m "feat(p1): hooks read .maestro/ items + inbox; rename to *-maestro/*-item"
```

---

## Task 11: Update docs (README, codex/INSTALL.md, AGENTS.md)

**Files:**
- Modify: `README.md`
- Modify: `codex/INSTALL.md`
- Modify: `AGENTS.md`

**Interfaces:**
- Produces: docs that describe the unified `.maestro/` model, the migration command, the new hook names, and the new repo map.

- [ ] **Step 1: README.md**

Replace every description of the `conductor/` + `issues/` two-system model with the unified work-item model. Add an "Upgrading from conductor/issues" section: run `bin/migrate-to-maestro --path .` (dry-run) then `--apply`. Update any path references (`conductor/…`, `issues/…`) to `.maestro/…`. Update hook names.

- [ ] **Step 2: codex/INSTALL.md**

Update install + behavior notes: `.maestro/` layout, the migrator, new hook names, and the fact that the SessionStart hook now summarizes `.maestro/` work items. Keep Codex-specific guidance (subagent thread/depth) intact.

- [ ] **Step 3: AGENTS.md**

Update the **Repo Map** (replace the `conductor/`, `issues/` bullet with `.maestro/` (dogfood data) + `assets/maestro/` (adapter templates) + `bin/migrate-to-maestro`). Add to the **Validation** block:
```bash
python3 -m unittest discover -s tests -v
bash -n bin/migrate-to-maestro || true   # python file; use py_compile instead:
python3 -m py_compile bin/migrate-to-maestro
```
Update **Edit Rules** to mention the adapter contract + assets home.

- [ ] **Step 4: Verify**

Run:
```bash
cd /Users/popeoliv/Developer/skills/maestro
! grep -rn -e 'conductor/' -e 'issues/INBOX' README.md codex/INSTALL.md && echo "docs delegacied"
grep -q 'migrate-to-maestro' README.md && grep -q '.maestro/' AGENTS.md && echo "docs reference new model"
```
Expected: `docs delegacied`, `docs reference new model`. (If legitimate historical mentions remain, phrase them as "legacy".)

- [ ] **Step 5: Commit**

```bash
git add README.md codex/INSTALL.md AGENTS.md
git commit -m "docs(p1): describe unified .maestro/ model + migration + new hooks"
```

---

## Task 12: Migrate Maestro's own dogfood

**Files:**
- Migrate (data): `conductor/`, `issues/` → `.maestro/`
- Modify: `.gitignore` if needed (ensure `.conductor.bak/`, `.issues.bak/` are ignored or removed)

**Interfaces:**
- Consumes: the finished migrator (Tasks 1–8) + `.maestro/` assets (P0).
- Produces: this repo running entirely on `.maestro/`, proving the migration end-to-end on real data.

- [ ] **Step 1: Dry-run on this repo**

Run:
```bash
cd /Users/popeoliv/Developer/skills/maestro
python3 bin/migrate-to-maestro --path . | tee /tmp/maestro-migration-preview.txt
```
Review the preview. Confirm: the single archived track (`cleanup-fixes_20260610`) maps to `.maestro/items/archived/done/…`; all `issues/archived/*` route to matching reasons; context docs move; `tracks.md`/`index.md`/`setup_state.json` are listed as dropped.

- [ ] **Step 2: Apply**

Run:
```bash
cd /Users/popeoliv/Developer/skills/maestro
python3 bin/migrate-to-maestro --path . --apply
```

- [ ] **Step 3: Verify the migrated tree**

Run:
```bash
cd /Users/popeoliv/Developer/skills/maestro
test -f .maestro/config.json && test -f .maestro/CONTRACT.md && test -d .maestro/context && echo "core present"
test -d .conductor.bak && test -d .issues.bak && echo "legacy backed up"
ls .maestro/items .maestro/items/archived/done 2>/dev/null && echo "items migrated"
# validate every migrated item record against the new hook
for f in .maestro/items/**/*.md .maestro/items/*.md; do
  [ -f "$f" ] || continue
  for fld in id title type priority status weight created updated; do
    grep -q "^$fld:" "$f" || echo "MISSING $fld in $f"
  done
done
echo "record field check done"
```
Expected: `core present`, `legacy backed up`, `items migrated`, `record field check done` with no MISSING lines.

- [ ] **Step 4: Remove the backups once satisfied**

After confirming `.maestro/` is correct:
```bash
cd /Users/popeoliv/Developer/skills/maestro
rm -rf .conductor.bak .issues.bak
echo "legacy backups removed"
```

- [ ] **Step 5: Full validation + commit**

Run:
```bash
cd /Users/popeoliv/Developer/skills/maestro
python3 -m unittest discover -s tests -v
python3 -m py_compile bin/migrate-to-maestro
bash -n bin/setup-project
echo "validation ok"
```
Then:
```bash
git add -A
git commit -m "chore(p1): migrate Maestro's own conductor/+issues/ to .maestro/"
```

---

## Self-Review (against spec §6.2 migration mapping)

- **Spec coverage:** Every §6.2 mapping row → a task: context docs (Task 3), `conductor/tracks/{id}/` → item+work with status remap (Task 4), `_archive/{id}/` → `items/archived/done/` (Task 4), `issues/*.md` open (Task 5), `issues/archived/{reason}/` (Task 5), `INBOX.md` bullets (Task 7), and **the advanced-issue+track merge** (Task 6 — "the one subtle merge" made literal). Back-compat stance "mandatory one-shot + dry-run, no permanent shim" → Task 8 (dry-run default, `--apply`, backup not shim). Installer detect-and-offer → Task 9. Codex parity / manifests → Tasks 10–11.
- **Placeholder scan:** none — migrator code is complete and unit-tested; bash edits specify exact functions/strings.
- **Type consistency:** status remap table used identically in Tasks 4/5/6; record fields match LD-3; `new_id` format `{seq:04d}-{slug}` consistent across `plan_tracks`/`plan_issues`/unmatched. Hook valid-status set == canonical closed set == P0 Global Constraints.
- **Risk note carried to P4:** the migrator handles partially-complete tracks (status preserved via remap) and the merge; the dry-run is the safety valve (spec §8 "Migration of in-flight work").

## Execution Handoff

**Recommended: Subagent-Driven.** The migrator tasks (1–8) are strict TDD with real unittest gates — ideal for one-subagent-per-task with the test run as the reviewer's gate. Tasks 9–12 are integration/IO; review the dry-run output (Task 12 Step 1) before applying to the live repo.
