"""YAML Checker integration constants."""

DOMAIN = "ha_yaml_checker"
NAME = "YAML Checker"
VERSION = "5.0.0"

CARD_FILENAME = "ha-yaml-checker.js"
CARD_ELEMENT = "ha-yaml-checker"
STATIC_URL_BASE = f"/{DOMAIN}"
CARD_URL = f"{STATIC_URL_BASE}/{CARD_FILENAME}"

PANEL_URL_PATH = "yaml-checker"
PANEL_TITLE = "YAML Checker"
PANEL_ICON = "mdi:file-code-outline"

CONF_SHOW_PANEL = "show_panel"
DEFAULT_SHOW_PANEL = True
