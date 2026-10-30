"""Real source scan_files regressions, synthetic files and independent oracle."""
from pathlib import Path
import importlib.util
import os
import tempfile
import unittest
from unittest import mock
SOURCE=Path(__file__).parents[1]/"custom_components/ha_yaml_checker/syntax.py"
SPEC=importlib.util.spec_from_file_location("scan_read_integrity",SOURCE)
MODULE=importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)

class ScanReadIntegrity(unittest.TestCase):
    def row(self,root):
        response=MODULE.scan_files(root)
        self.assertEqual(response["schema"],"ha-yaml-file-scan-v1")
        self.assertEqual(response["scope"],"top_level_syntax_only")
        self.assertNotIn("PRIVATE-CANARY",repr(response))
        return next(item for item in response["files"] if item["file"]=="configuration.yaml")

    def fault(self,root,kind):
        filename=root/"configuration.yaml"
        fdopen=MODULE.os.fdopen
        class WrappedFile:
            def __init__(self,original): self.original=original
            def __enter__(self): self.original.__enter__();return self
            def __exit__(self,*a): return self.original.__exit__(*a)
            def fileno(self): return self.original.fileno()
            def read(self,n=-1):
                original=self.original.read(n)
                if kind=="short": return original[:len(b"first: ok\n")]
                if kind=="changed":
                    before=filename.stat()
                    replacement=b"first: no\n"
                    assert len(original)==len(replacement)
                    filename.write_bytes(replacement)
                    os.utime(filename,ns=(before.st_atime_ns,before.st_mtime_ns+2_000_000_000))
                return original
        def fdopen_intercept(fd,mode,*a,**kw):
            return WrappedFile(fdopen(fd,mode,*a,**kw))
        with mock.patch.object(MODULE.os,"fdopen",side_effect=fdopen_intercept):
            return self.row(root)

    def test_partial_read_must_be_unknown_not_valid(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            (root/"configuration.yaml").write_bytes(b"first: ok\npassword: PRIVATE-CANARY\nbad: [unfinished\n")
            self.assertEqual(self.fault(root,"short"),{"file":"configuration.yaml","status":"skipped","reason":"read_error"})

    def test_same_size_change_after_read_must_be_unknown(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            (root/"configuration.yaml").write_bytes(b"first: ok\n")
            self.assertEqual(self.fault(root,"changed"),{"file":"configuration.yaml","status":"skipped","reason":"read_error"})

    def test_complete_valid_file_passes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            (root/"configuration.yaml").write_bytes(b"first: ok\n")
            self.assertEqual(self.row(root)["status"],"pass")

    def test_complete_invalid_file_fails_with_no_content(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            (root/"configuration.yaml").write_bytes(b"password: PRIVATE-CANARY\nbad: [unfinished\n")
            self.assertEqual(self.row(root)["status"],"fail")

    def test_empty_regular_file_is_valid_syntax_not_missing(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);(root/"configuration.yaml").write_bytes(b"")
            self.assertEqual(self.row(root)["status"],"pass")

    def test_missing_file_is_skipped(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.assertEqual(self.row(Path(tmp)),{"file":"configuration.yaml","status":"skipped","reason":"missing"})

    def test_symlink_cannot_scan_unowned_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            (root/"other.yaml").write_bytes(b"PRIVATE-CANARY: secret\n")
            (root/"configuration.yaml").symlink_to(root/"other.yaml")
            self.assertEqual(self.row(root)["status"],"skipped")
if __name__=="__main__": unittest.main()
