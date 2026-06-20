import importlib.util, importlib.machinery, pathlib, unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
_loader = importlib.machinery.SourceFileLoader("validate", str(ROOT / "bin" / "validate-maestro"))
_spec = importlib.util.spec_from_loader("validate", _loader)
validate = importlib.util.module_from_spec(_spec)
_loader.exec_module(validate)


class TestValidator(unittest.TestCase):
    def test_contract_clean(self):
        self.assertEqual(validate.check_contract(ROOT), [])

    def test_adapters_clean(self):
        self.assertEqual(validate.check_adapters(ROOT), [])

    def test_skills_are_abstract(self):
        self.assertEqual(validate.check_skills_abstract(ROOT), [])

    def test_validate_aggregates(self):
        # validate() returns a list; on a healthy repo it is empty
        self.assertEqual(validate.validate(ROOT), [])


if __name__ == "__main__":
    unittest.main()
