"""Bounded YAML syntax parsing without construction, evaluation, or file I/O."""

from __future__ import annotations

from typing import Any

import yaml

MAX_BYTES = 65536
MAX_EVENTS = 20000


def check_syntax(source: str) -> dict[str, Any]:
    """Return parser status and location only; never reflect pasted YAML."""
    if not isinstance(source, str) or len(source.encode("utf-8")) > MAX_BYTES:
        return {"schema": "ha-yaml-syntax-v1", "status": "unsupported", "reason": "too_large"}
    try:
        for count, _event in enumerate(yaml.parse(source), start=1):
            if count > MAX_EVENTS:
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
