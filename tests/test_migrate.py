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


if __name__ == "__main__":
    unittest.main()
