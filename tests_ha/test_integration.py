"""YAML Checker integration inside Home Assistant Core."""

from __future__ import annotations

from homeassistant.components import frontend
from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.ha_yaml_checker.const import CARD_URL, DOMAIN, PANEL_URL_PATH, VERSION


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
    assert urls == [f"{CARD_URL}?v={VERSION}"]
    panel = hass.data[frontend.DATA_PANELS][PANEL_URL_PATH]
    assert panel.require_admin is True


async def test_existing_hacs_card_resource_is_not_duplicated(hass: HomeAssistant) -> None:
    assert await async_setup_component(hass, "lovelace", {})
    resources = hass.data["lovelace"].resources
    await resources.async_load()
    await resources.async_create_item({"res_type": "module", "url": "/hacsfiles/ha-automation-analyzer/ha-automation-analyzer.js"})
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
