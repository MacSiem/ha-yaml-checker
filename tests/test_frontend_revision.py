"""The card revision must be read away from Home Assistant's event loop."""

import ast
import asyncio
from concurrent.futures import ThreadPoolExecutor
import hashlib
from pathlib import Path
import tempfile
import threading
import unittest
from unittest.mock import patch


SOURCE = Path(__file__).parents[1] / "custom_components/ha_yaml_checker/frontend.py"


class FrontendRevisionTests(unittest.IsolatedAsyncioTestCase):
    async def test_card_hash_uses_executor(self):
        tree = ast.parse(SOURCE.read_text())
        function = next(node for node in tree.body if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == "versioned_card_url")
        with tempfile.TemporaryDirectory() as directory, ThreadPoolExecutor(max_workers=1) as pool:
            root = Path(directory)
            (root / "www").mkdir()
            card = root / "www/card.js"
            card.write_bytes(b"candidate card")
            namespace = {"Path": Path, "hashlib": hashlib, "__file__": str(root / "frontend.py"),
                         "CARD_FILENAME": "card.js", "CARD_URL": "/yaml/card.js", "VERSION": "test"}
            exec(compile(ast.Module(body=[function], type_ignores=[]), str(SOURCE), "exec"), namespace)
            main_thread = threading.current_thread()
            original = Path.read_bytes

            def guarded_read(path):
                self.assertIsNot(threading.current_thread(), main_thread)
                return original(path)

            class Hass:
                async def async_add_executor_job(self, call, *args):
                    return await asyncio.get_running_loop().run_in_executor(pool, call, *args)

            with patch.object(Path, "read_bytes", guarded_read):
                url = await namespace["versioned_card_url"](Hass())
            self.assertEqual(url, "/yaml/card.js?v=test&h=" + hashlib.sha256(b"candidate card").hexdigest()[:12])


if __name__ == "__main__":
    unittest.main()
