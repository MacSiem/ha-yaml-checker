"""Administrator-only YAML syntax parser, with no persistence or echo."""

from __future__ import annotations

from typing import Any
from pathlib import Path

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant, callback

from .const import DOMAIN
from .syntax import check_syntax, scan_files


def _available(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> bool:
    """Global commands must remain gated by the current loaded integration."""
    if not connection.user.is_admin:
        connection.send_error(msg["id"], "unauthorized", "Administrator access required")
        return False
    if not any(entry.state is ConfigEntryState.LOADED for entry in hass.config_entries.async_entries(DOMAIN)):
        connection.send_error(msg["id"], "unavailable", "YAML Checker is not loaded")
        return False
    return True


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
    if _available(hass, connection, msg):
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
    if not _available(hass, connection, msg):
        return
    result = await hass.async_add_executor_job(scan_files, Path(hass.config.config_dir))
    if _available(hass, connection, msg):
        connection.send_result(msg["id"], result)
