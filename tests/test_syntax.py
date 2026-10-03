"""Tests for the server parser's data-minimized contract."""

from __future__ import annotations

import importlib.util
from pathlib import Path
import tempfile
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

    def test_file_scan_is_allowlisted_and_redacted(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "configuration.yaml").write_text("automation: !include automations.yaml\n")
            (root / "automations.yaml").write_text("password: PRIVATE-CANARY\na: [broken\n")
            (root / "secrets.yaml").write_text("secret: PRIVATE-CANARY\n")
            result = MODULE.scan_files(root)
            files = {row["file"]: row for row in result["files"]}
            self.assertEqual(files["configuration.yaml"]["status"], "pass")
            self.assertEqual(files["automations.yaml"]["status"], "fail")
            self.assertEqual(files["secrets.yaml"], {"file": "secrets.yaml", "status": "skipped", "reason": "secret_file"})
            self.assertEqual(files["scripts.yaml"]["reason"], "missing")
            self.assertNotIn("PRIVATE-CANARY", repr(result))

    def test_file_scan_does_not_follow_symlink(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "configuration.yaml").symlink_to(root / "secret-outside.yaml")
            result = MODULE.scan_files(root)
            row = next(row for row in result["files"] if row["file"] == "configuration.yaml")
            self.assertEqual(row["status"], "skipped")


if __name__ == "__main__":
    unittest.main()
