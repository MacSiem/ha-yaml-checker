"""Administrator-only YAML syntax parser, with no persistence or echo."""

from __future__ import annotations

from typing import Any
from pathlib import Path

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

from .const import DOMAIN
from .syntax import check_syntax, scan_files


@callback
def async_register(hass: HomeAssistant) -> None:
    websocket_api.async_register_command(hass, ws_check_syntax)
    websocket_api.async_register_command(hass, ws_scan_files)


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/check_syntax", vol.Required("yaml"): str})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_check_syntax(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Parse pasted YAML in memory; return no content or exception text."""
    connection.send_result(msg["id"], check_syntax(msg["yaml"]))


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/scan_files"})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_scan_files(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Read only the allowlisted top-level files in an executor."""
    result = await hass.async_add_executor_job(scan_files, Path(hass.config.config_dir))
    connection.send_result(msg["id"], result)
