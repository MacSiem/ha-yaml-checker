"""Bounded YAML syntax parsing without construction, evaluation, or file I/O."""

from __future__ import annotations

import os
from pathlib import Path
import stat
from typing import Any

import yaml

MAX_BYTES = 65536
MAX_EVENTS = 20000
MAX_FILE_BYTES = 2_000_000
FILE_NAMES = (
    "configuration.yaml", "automations.yaml", "scripts.yaml", "scenes.yaml",
    "groups.yaml", "customize.yaml", "ui-lovelace.yaml",
)


def check_syntax(source: str, *, max_bytes: int = MAX_BYTES, max_events: int = MAX_EVENTS) -> dict[str, Any]:
    """Return parser status and location only; never reflect pasted YAML."""
    if not isinstance(source, str) or len(source.encode("utf-8")) > max_bytes:
        return {"schema": "ha-yaml-syntax-v1", "status": "unsupported", "reason": "too_large"}
    try:
        for count, _event in enumerate(yaml.parse(source), start=1):
            if count > max_events:
                return {"schema": "ha-yaml-syntax-v1", "status": "unsupported", "reason": "too_complex"}
    except yaml.YAMLError as error:
        mark = getattr(error, "problem_mark", None)
        return {
            "schema": "ha-yaml-syntax-v1",
            "status": "invalid",
            "line": mark.line + 1 if mark is not None else None,
            "column": mark.column + 1 if mark is not None else None,
        }
    return {"schema": "ha-yaml-syntax-v1", "status": "valid"}


def scan_files(config_dir: Path) -> dict[str, Any]:
    """Parse allowlisted top-level config files; never return file content or paths."""
    rows = []
    for name in FILE_NAMES:
        path = config_dir / name
        result: dict[str, Any] = {"file": name, "status": "skipped"}
        try:
            fd = os.open(path, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0))
        except FileNotFoundError:
            result["reason"] = "missing"
            rows.append(result)
            continue
        except OSError:
            result["reason"] = "unreadable_or_symlink"
            rows.append(result)
            continue
        try:
            with os.fdopen(fd, "rb") as file:
                info = os.fstat(file.fileno())
                if not stat.S_ISREG(info.st_mode):
                    result["reason"] = "not_regular_file"
                elif info.st_size > MAX_FILE_BYTES:
                    result["reason"] = "too_large"
                else:
                    raw = file.read(MAX_FILE_BYTES + 1)
                    if len(raw) > MAX_FILE_BYTES:
                        result["reason"] = "too_large"
                    else:
                        try:
                            parsed = check_syntax(raw.decode("utf-8-sig"), max_bytes=MAX_FILE_BYTES, max_events=100000)
                        except UnicodeDecodeError:
                            result["reason"] = "invalid_encoding"
                        else:
                            result["status"] = "pass" if parsed["status"] == "valid" else "fail" if parsed["status"] == "invalid" else "skipped"
                            for key in ("line", "column", "reason"):
                                if key in parsed:
                                    result[key] = parsed[key]
        except OSError:
            result = {"file": name, "status": "skipped", "reason": "read_error"}
        rows.append(result)
    rows.append({"file": "secrets.yaml", "status": "skipped", "reason": "secret_file"})
    return {"schema": "ha-yaml-file-scan-v1", "scope": "top_level_syntax_only", "files": rows}
