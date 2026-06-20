import importlib.util, importlib.machinery, pathlib, sys, unittest, shutil, tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
_LOC = ROOT / "bin" / "migrate-to-maestro"
_loader = importlib.machinery.SourceFileLoader("migrate", str(_LOC))
_spec = importlib.util.spec_from_loader("migrate", _loader)
migrate = importlib.util.module_from_spec(_spec)
_loader.exec_module(migrate)


class TestArgs(unittest.TestCase):
    def test_defaults_to_dry_run(self):
        ns = migrate.parse_args(["--path", "/tmp/x"])
        self.assertEqual(ns.path, "/tmp/x")
        self.assertFalse(ns.apply)
        self.assertFalse(ns.remove_legacy)

    def test_apply_flag(self):
        ns = migrate.parse_args(["--apply"])
        self.assertTrue(ns.apply)


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


class TestContext(unittest.TestCase):
    def test_plan_context_renames_and_relocates(self):
        pairs = migrate.plan_context(ROOT / "tests/fixtures/legacy/conductor")
        dsts = {p["dst"] for p in pairs}
        self.assertIn(".maestro/context/guidelines.md", dsts)        # renamed
        self.assertIn(".maestro/context/product.md", dsts)
        self.assertIn(".maestro/context/styleguides/markdown.md", dsts)  # relocated
        self.assertFalse(any("tracks.md" in d for d in dsts))         # dropped


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


class TestInbox(unittest.TestCase):
    def test_inbox_bullets_carried_over(self):
        plan = migrate.plan_inbox(ROOT / "tests/fixtures/legacy/issues")
        self.assertEqual(plan["dst"], ".maestro/inbox.md")
        self.assertIn("## Inbox", plan["text"])
        self.assertIn("-", plan["text"])  # at least one bullet preserved


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


class TestUnmatchedDeduplicate(unittest.TestCase):
    """Regression tests for C1: two same-slug unmatched advanced issues must get unique ids."""

    def _make_orphan_issue(self, directory, filename, advanced_to="nonexistent-track-xyz"):
        """Write a tracked issue file (status: tracked) that will become unmatched."""
        content = (
            "---\n"
            "status: tracked\n"
            "type: chore\n"
            "priority: P3\n"
            "filed: 2026-06-01\n"
            f"advanced-to: {advanced_to}\n"
            "---\n\n"
            "# Orphan issue\n\nBody text.\n"
        )
        (directory / filename).write_text(content)

    def setUp(self):
        self.tmp = pathlib.Path(tempfile.mkdtemp())
        # Minimal conductor: needs tracks dir (even if empty) so build_plan runs without error
        (self.tmp / "conductor" / "tracks").mkdir(parents=True)
        # issues dir with two files whose stems sanitize to the SAME slug
        # 'feature--cache.md' and 'feature-cache.md' both produce slug 'feature-cache'
        issues_dir = self.tmp / "issues"
        issues_dir.mkdir()
        self._make_orphan_issue(issues_dir, "feature--cache.md")
        self._make_orphan_issue(issues_dir, "feature-cache.md")
        # package assets required by apply_plan
        (self.tmp / "assets" / "maestro" / "adapters").mkdir(parents=True)
        (self.tmp / "assets" / "maestro" / "CONTRACT.md").write_text("# Contract\n")
        (self.tmp / "assets" / "maestro" / "adapters" / "files.md").write_text("# files\n")
        (self.tmp / "assets" / "maestro" / "config.template.json").write_text('{"adapter":"files"}\n')

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_two_same_slug_unmatched_have_distinct_new_ids(self):
        """build_plan must assign distinct new_id values to two unmatched issues with the same slug."""
        plan = migrate.build_plan(self.tmp)
        unmatched_items = [it for it in plan["items"] if it.get("advanced_to") is None
                          and "feature-cache" in it["new_id"]]
        # Both files are unmatched (track nonexistent-track-xyz does not exist)
        self.assertEqual(len(plan["unmatched"]), 2,
                         "Expected 2 unmatched merge candidates")
        # Both should end up as items in the plan
        orphan_items = [it for it in plan["items"] if "feature-cache" in it["new_id"]]
        self.assertEqual(len(orphan_items), 2,
                         "Expected 2 items containing 'feature-cache' in new_id")
        ids = [it["new_id"] for it in orphan_items]
        self.assertEqual(len(set(ids)), 2, f"new_ids must be distinct, got: {ids}")

    def test_two_same_slug_unmatched_have_distinct_record_paths(self):
        """build_plan must produce distinct record_path values for two same-slug unmatched issues."""
        plan = migrate.build_plan(self.tmp)
        orphan_paths = [it["record_path"] for it in plan["items"]
                        if "feature-cache" in it["new_id"]]
        self.assertEqual(len(orphan_paths), 2)
        self.assertEqual(len(set(orphan_paths)), 2,
                         f"record_paths must be distinct, got: {orphan_paths}")

    def test_apply_plan_both_unmatched_records_survive(self):
        """apply_plan must write both unmatched records; neither overwrites the other."""
        plan = migrate.build_plan(self.tmp)
        migrate.apply_plan(self.tmp, plan)
        items_dir = self.tmp / ".maestro" / "items"
        orphan_files = list(items_dir.glob("*feature-cache*.md"))
        self.assertEqual(len(orphan_files), 2,
                         f"Expected 2 orphan record files on disk, found: {orphan_files}")
        # Verify neither was clobbered: the two files must have DIFFERENT content
        # (each preserves its own stem as title: 'feature--cache' vs 'feature-cache')
        texts = [f.read_text() for f in sorted(orphan_files)]
        self.assertNotEqual(texts[0], texts[1],
                            "The two orphan records must have distinct content (not clobbered)")
        # Specifically: each record carries its own distinct id in the frontmatter
        ids_in_files = set()
        for text in texts:
            for line in text.splitlines():
                if line.startswith("id: "):
                    ids_in_files.add(line[4:].strip())
        self.assertEqual(len(ids_in_files), 2,
                         f"Each record must have a distinct id in frontmatter, got: {ids_in_files}")

    def test_collision_guard_raises_on_duplicate_destinations(self):
        """apply_plan must raise ValueError if the plan contains duplicate destinations."""
        plan = migrate.build_plan(self.tmp)
        # Manually inject a duplicate destination to trigger the guard
        if plan["items"]:
            dup = dict(plan["items"][0])
            dup["record_text"] = "---\nid: dup\ntitle: dup\ntype: chore\npriority: P3\nstatus: reviewed\nweight: light\ncreated: 1970-01-01\nupdated: 1970-01-01\n---\n\n# dup\n"
            plan["items"].append(dup)
        with self.assertRaises(ValueError) as ctx:
            migrate.apply_plan(self.tmp, plan)
        self.assertIn("colliding destinations", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
