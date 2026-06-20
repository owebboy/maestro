import importlib.util, importlib.machinery, pathlib, sys, unittest

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


if __name__ == "__main__":
    unittest.main()
