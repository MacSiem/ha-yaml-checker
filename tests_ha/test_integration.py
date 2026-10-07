"""YAML Checker integration inside Home Assistant Core."""

from __future__ import annotations

import asyncio
import threading

import pytest

from homeassistant.components import frontend
from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.ha_yaml_checker import frontend as yaml_frontend
from custom_components.ha_yaml_checker import websocket_api as yaml_ws
from custom_components.ha_yaml_checker.const import DOMAIN, PANEL_URL_PATH


async def _setup(hass: HomeAssistant) -> MockConfigEntry:
    assert await async_setup_component(hass, "http", {})
    assert await async_setup_component(hass, "lovelace", {})
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=DOMAIN)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


async def test_setup_registers_card_resource_and_admin_panel(hass: HomeAssistant) -> None:
    await _setup(hass)
    urls = [item["url"] for item in hass.data["lovelace"].resources.async_items()]
    assert urls == [await yaml_frontend.versioned_card_url(hass)]
    panel = hass.data[frontend.DATA_PANELS][PANEL_URL_PATH]
    assert panel.require_admin is True


async def test_card_url_changes_with_bundled_bytes(hass: HomeAssistant, tmp_path, monkeypatch) -> None:
    www = tmp_path / "www"
    www.mkdir()
    card = www / yaml_frontend.CARD_FILENAME
    monkeypatch.setattr(yaml_frontend, "__file__", str(tmp_path / "frontend.py"))
    card.write_bytes(b"first candidate")
    first = await yaml_frontend.versioned_card_url(hass)
    card.write_bytes(b"second candidate")
    second = await yaml_frontend.versioned_card_url(hass)
    assert first != second


async def test_existing_hacs_card_resource_is_not_duplicated(hass: HomeAssistant) -> None:
    assert await async_setup_component(hass, "lovelace", {})
    resources = hass.data["lovelace"].resources
    await resources.async_load()
    await resources.async_create_item({"res_type": "module", "url": "/hacsfiles/ha-yaml-checker/ha-yaml-checker.js"})
    await _setup(hass)
    assert len(list(resources.async_items())) == 1


async def test_syntax_is_admin_only(hass: HomeAssistant, hass_ws_client, hass_read_only_access_token) -> None:
    await _setup(hass)
    client = await hass_ws_client(hass, hass_read_only_access_token)
    await client.send_json({"id": 1, "type": f"{DOMAIN}/check_syntax", "yaml": "x: yes\n"})
    response = await client.receive_json()
    assert response["success"] is False
    assert response["error"]["code"] == "unauthorized"


async def test_syntax_returns_only_status_and_location(hass: HomeAssistant, hass_ws_client) -> None:
    await _setup(hass)
    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": f"{DOMAIN}/check_syntax", "yaml": "password: PRIVATE-CANARY\nx: [unterminated\n"})
    response = await client.receive_json()
    assert response["success"] is True
    result = response["result"]
    assert result["schema"] == "ha-yaml-syntax-v1"
    assert result["status"] == "invalid"
    assert "PRIVATE-CANARY" not in repr(result)


async def test_file_scan_is_admin_only(hass: HomeAssistant, hass_ws_client, hass_read_only_access_token) -> None:
    await _setup(hass)
    client = await hass_ws_client(hass, hass_read_only_access_token)
    await client.send_json({"id": 1, "type": f"{DOMAIN}/scan_files"})
    response = await client.receive_json()
    assert response["success"] is False
    assert response["error"]["code"] == "unauthorized"


@pytest.mark.parametrize("command", ["check_syntax", "scan_files"])
async def test_commands_reject_unloaded_integration(hass, hass_ws_client, command):
    entry = await _setup(hass)
    client = await hass_ws_client(hass)
    assert await hass.config_entries.async_unload(entry.entry_id)
    request = {"id": 1, "type": f"{DOMAIN}/{command}"}
    if command == "check_syntax":
        request["yaml"] = "name: Synthetic QA\n"
    await client.send_json(request)
    response = await client.receive_json()
    assert response["success"] is False
    assert response["error"]["code"] == "unavailable"


@pytest.mark.parametrize("boundary", ["unload", "admin_loss"])
async def test_pending_file_scan_respects_authority_boundary(
    hass, hass_ws_client, hass_admin_user, monkeypatch, boundary
):
    entry = await _setup(hass)
    started, resume = asyncio.Event(), threading.Event()
    loop = asyncio.get_running_loop()

    def delayed_scan(_path):
        loop.call_soon_threadsafe(started.set)
        assert resume.wait(15)
        return {"schema": "ha-yaml-file-scan-v1", "files": [{"file": "Synthetic pending result"}]}

    monkeypatch.setattr(yaml_ws, "scan_files", delayed_scan)
    client = await hass_ws_client(hass)
    original_groups = hass_admin_user.groups
    try:
        await client.send_json({"id": 1, "type": f"{DOMAIN}/scan_files"})
        await asyncio.wait_for(started.wait(), 10)
        if boundary == "unload":
            assert await hass.config_entries.async_unload(entry.entry_id)
        else:
            hass_admin_user.groups = []
            hass_admin_user.invalidate_cache()
        resume.set()
        response = await client.receive_json()
        assert response["success"] is False
        assert response["error"]["code"] == ("unavailable" if boundary == "unload" else "unauthorized")
        assert "Synthetic pending result" not in repr(response)
    finally:
        resume.set()
        hass_admin_user.groups = original_groups
        hass_admin_user.invalidate_cache()


async def test_yaml_module_unload_preserves_foreign_module_and_reload(hass, monkeypatch):
    monkeypatch.setattr(yaml_frontend, "_lovelace_mode", lambda _hass: "yaml")
    entry = await _setup(hass)
    owned = await yaml_frontend.versioned_card_url(hass)
    frontend.add_extra_js_url(hass, "/local/synthetic-foreign-module.js")
    assert owned in hass.data[frontend.DATA_EXTRA_MODULE_URL].urls
    assert await hass.config_entries.async_unload(entry.entry_id)
    assert owned not in hass.data[frontend.DATA_EXTRA_MODULE_URL].urls
    assert "/local/synthetic-foreign-module.js" in hass.data[frontend.DATA_EXTRA_MODULE_URL].urls
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert owned in hass.data[frontend.DATA_EXTRA_MODULE_URL].urls
