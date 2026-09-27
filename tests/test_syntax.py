"""Tests for the server parser's data-minimized contract."""

from __future__ import annotations

import importlib.util
from pathlib import Path
import unittest

PATH = Path(__file__).parents[1] / "custom_components" / "ha_yaml_checker" / "syntax.py"
SPEC = importlib.util.spec_from_file_location("yaml_checker_syntax", PATH)
assert SPEC is not None and SPEC.loader is not None
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class SyntaxTests(unittest.TestCase):
    def test_valid_custom_ha_tag_is_syntax_only(self) -> None:
        self.assertEqual(MODULE.check_syntax("automation: !include automations.yaml\n")["status"], "valid")

    def test_bad_syntax_gives_location_without_source(self) -> None:
        value = "password: SECRET-CANARY\na: [unterminated\n"
        result = MODULE.check_syntax(value)
        self.assertEqual(result["status"], "invalid")
        self.assertIsInstance(result["line"], int)
        self.assertNotIn("SECRET-CANARY", repr(result))

    def test_large_source_is_unsupported(self) -> None:
        self.assertEqual(MODULE.check_syntax("a" * 65537)["reason"], "too_large")


if __name__ == "__main__":
    unittest.main()
