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


if __name__ == "__main__":
    unittest.main()
